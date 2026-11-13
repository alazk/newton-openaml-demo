// Rehearse scripts/deploy-clients.mjs on ganache (chainId 11155111) with stub
// policy and factory, then check the client's policyId against the SDK.
//
//   npm i --no-save ganache @newton-xyz/sdk@1.2.2
//   node scripts/rehearse-deploy.mjs
//
// Nothing touches a real chain. Run it after any change to the client or the
// deploy script.
import ganache from "ganache";
import solc from "solc";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createPublicClient, createWalletClient, http, stringToHex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sdkPolicy = require(process.cwd() + "/node_modules/@newton-xyz/sdk/dist/cjs/modules/policy/index.js");

const REPO = process.cwd();
const KEY = "0x" + "11".repeat(32);
const server = ganache.server({ chain: { chainId: 11155111, networkId: 11155111, hardfork: "shanghai" }, wallet: { accounts: [{ secretKey: KEY, balance: "0x" + (10n ** 21n).toString(16) }] }, logging: { quiet: true } });
await new Promise((r) => server.listen(8545, r));
const RPC = "http://127.0.0.1:8545";

const STUBS = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
struct PolicyConfig { bytes policyParams; uint32 expireAfter; }
contract StubFactory { mapping(address=>bool) public isPolicy; function add(address p) external { isPolicy[p] = true; } }
contract StubPolicy {
  address public factory; uint256 public calls;
  constructor(address f) { factory = f; }
  function version() external pure returns (string memory) { return "0.7.2"; }
  function getEntrypoint() external pure returns (string memory) { return "newton_openaml.allow"; }
  function setPolicy(PolicyConfig calldata) external returns (bytes32) { calls++; return bytes32(calls); }
}`;
function compile(name, content, contracts) {
  const out = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: { [name]: { content } }, settings: { evmVersion: "shanghai", optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } })));
  const errs = (out.errors || []).filter((e) => e.severity === "error");
  if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
  return Object.fromEntries(contracts.map((c) => [c, { abi: out.contracts[name][c].abi, bytecode: "0x" + out.contracts[name][c].evm.bytecode.object }]));
}
const stubs = compile("Stubs.sol", STUBS, ["StubFactory", "StubPolicy"]);
// The client compiled for shanghai: ganache predates Cancun (no MCOPY).
const client = compile("OpenAMLDemoClient.sol", readFileSync(`${REPO}/policy/OpenAMLDemoClient.sol`, "utf8"), ["OpenAMLDemoClient"]).OpenAMLDemoClient;
const OUT = REPO + "/.rehearsal";
mkdirSync(OUT, { recursive: true });
writeFileSync(OUT + "/client.shanghai.json", JSON.stringify(client));

const account = privateKeyToAccount(KEY);
const pc = createPublicClient({ chain: sepolia, transport: http(RPC) });
const wc = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
async function deploy(a, args) {
  const h = await wc.deployContract({ abi: a.abi, bytecode: a.bytecode, args });
  return (await pc.waitForTransactionReceipt({ hash: h })).contractAddress;
}
const factory = await deploy(stubs.StubFactory, []);
const policy = await deploy(stubs.StubPolicy, [factory]);
await pc.waitForTransactionReceipt({ hash: await wc.writeContract({ address: factory, abi: stubs.StubFactory.abi, functionName: "add", args: [policy] }) });

const record = OUT + "/clients.json";
rmSync(record, { force: true });
const env = { ...process.env, SEPOLIA_RPC_URL: RPC, NEWTON_POLICY: policy, NEWTON_POLICY_FACTORY: factory, CLIENT_ARTIFACT: OUT + "/client.shanghai.json", DEPLOYMENTS_FILE: record, OWNER_PRIVATE_KEY: KEY, EXPECTED_OWNER: account.address };
function run(args, extraEnv = {}) {
  return new Promise((resolve) => {
    const p = spawn("node", ["scripts/deploy-clients.mjs", ...args], { cwd: REPO, env: { ...env, ...extraEnv } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ code, out }));
  });
}

const dry = await run([]);
console.log("── dry run ──\n" + dry.out);
const exec = await run(["--execute"]);
console.log("── execute ──\n" + exec.out);
const again = await run(["--execute"]);
console.log("── re-run (idempotent) ──\n" + again.out.split("\n").filter((l) => /plan|already|All clients/.test(l)).join("\n"));
const wrongOwner = await run(["--execute", "--only=flagged"], { EXPECTED_OWNER: "0x000000000000000000000000000000000000dEaD", DEPLOYMENTS_FILE: OUT + "/empty.json" });
console.log("── owner guard ──\n" + wrongOwner.out.split("\n").slice(-2).join("\n") + `exit ${wrongOwner.code}`);

// Independent read-back, and the SDK's own policyId derivation.
const rec = JSON.parse(readFileSync(record, "utf8"));
let ok = exec.code === 0 && again.code === 0 && wrongOwner.code !== 0;
for (const key of Object.keys(rec)) {
  const addr = rec[key].address;
  const [policyId, revision, policies] = await pc.readContract({ address: addr, abi: client.abi, functionName: "getPolicySetSnapshot" });
  const sdkId = sdkPolicy.policyReadFunctions.precomputePolicyId({ chainId: 11155111, client: addr, revision, policies });
  const params = Buffer.from(policies[0].config.policyParams.slice(2), "hex").toString();
  const owner = await pc.readContract({ address: addr, abi: client.abi, functionName: "getOwner" });
  const tm = await pc.readContract({ address: addr, abi: client.abi, functionName: "getNewtonPolicyTaskManager" });
  const good = JSON.parse(params).deny_tiers.join("+") === key && policyId === sdkId && owner === account.address && tm.toLowerCase() === "0xecb741f4875770f9a5f060cb30f6c9eb5966ed13";
  ok &&= good;
  console.log(`${key.padEnd(32)} ${addr} policyId ${policyId === sdkId ? "= SDK" : "≠ SDK"}  params ${params}  owner ok ${owner === account.address}  taskManager ok ${tm.toLowerCase() === "0xecb741f4875770f9a5f060cb30f6c9eb5966ed13"}`);
}
const calls = await pc.readContract({ address: policy, abi: stubs.StubPolicy.abi, functionName: "calls" });
console.log(`setPolicy registered on the policy ${calls} times (expect 15)`);
ok &&= calls === 15n && Object.keys(rec).length === 15;
console.log(ok ? "\nREHEARSAL PASSED" : "\nREHEARSAL FAILED");
await server.close();
process.exit(ok ? 0 : 1);
