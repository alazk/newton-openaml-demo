/**
 * Deploy one OpenAML client per set of tiers a visitor can choose to block
 * (15 sets: every non-empty mix of sanctioned, blocked, fraud, flagged), and
 * seed each one's policy set with the OpenAML policy and that set as params.
 * Verifies each client before recording it. Dry run unless you pass --execute.
 *
 *   node scripts/compile-client.mjs
 *   NEWTON_POLICY=0x… node scripts/deploy-clients.mjs            # dry run
 *   NEWTON_POLICY=0x… node scripts/deploy-clients.mjs --execute  # sends
 *
 * Env: NEWTON_POLICY (required), OWNER_PRIVATE_KEY (required with --execute;
 *      must be the wallet behind NEWTON_API_KEY), SEPOLIA_RPC_URL,
 *      NEWTON_POLICY_FACTORY, NEWTON_TASK_MANAGER, CLIENT_EXPIRE_AFTER
 * Flags: --execute, --only=<key>[,<key>]   e.g. --only=sanctioned+fraud
 *
 * Idempotent: clients already recorded in policy/out/clients.sepolia.json with
 * the right policy and params are skipped. The site reads that file to find
 * the client for a chosen set, so commit it after a deploy.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, getAddress, stringToHex, keccak256, encodeAbiParameters, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ARTIFACT = process.env.CLIENT_ARTIFACT || "policy/out/OpenAMLDemoClient.json";
const RECORD = process.env.DEPLOYMENTS_FILE || "policy/out/clients.sepolia.json";
const POLICY_SET_DOMAIN = "0x671cdd5663cea1dd5f0b42278ce65570194bc54e20449731d2ae86713689de91";

const RPC = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const FACTORY = getAddress(process.env.NEWTON_POLICY_FACTORY || "0x8dd5984f8f626a2fd1c61872217d1f8269a831da");
const TASK_MANAGER = getAddress(process.env.NEWTON_TASK_MANAGER || "0xecb741F4875770f9A5F060cb30F6c9eb5966eD13");
const EXPIRE_AFTER = Number(process.env.CLIENT_EXPIRE_AFTER || 300);
const EXECUTE = process.argv.includes("--execute");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.slice(7).split(",").map((s) => s.trim()) : null;

const TIERS = ["sanctioned", "blocked", "fraud", "flagged"];
// Every non-empty subset, keyed "sanctioned+blocked+fraud" (TIERS order).
const CLIENTS = [];
for (let mask = 1; mask < 1 << TIERS.length; mask++) {
  const tiers = TIERS.filter((_, i) => mask & (1 << i));
  CLIENTS.push({ key: tiers.join("+"), params: { deny_tiers: tiers } });
}
// The page's default set first, so a partial run still leaves the demo usable.
CLIENTS.sort((a, b) => (b.key === "sanctioned+blocked+fraud") - (a.key === "sanctioned+blocked+fraud"));

const policyAbi = [
  { type: "function", name: "version", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "factory", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "getEntrypoint", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
];
const factoryAbi = [{ type: "function", name: "isPolicy", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" }];

if (!existsSync(ARTIFACT)) {
  console.log(`Missing ${ARTIFACT}. Run: node scripts/compile-client.mjs`);
  process.exit(1);
}
const { abi, bytecode } = JSON.parse(readFileSync(ARTIFACT, "utf8"));

if (!isAddress(process.env.NEWTON_POLICY ?? "")) {
  console.log("NEWTON_POLICY must be the OpenAML policy address from `newton-cli policy deploy`.");
  process.exit(1);
}
const POLICY = getAddress(process.env.NEWTON_POLICY);

const pc = createPublicClient({ chain: sepolia, transport: http(RPC) });
const read = (address, abi_, functionName, args = []) => pc.readContract({ address, abi: abi_, functionName, args }).catch(() => undefined);

console.log(`mode         ${EXECUTE ? "EXECUTE, this sends transactions" : "dry run, no transactions"}`);
console.log(`policy       ${POLICY}\nfactory      ${FACTORY}\ntaskManager  ${TASK_MANAGER}\nexpireAfter  ${EXPIRE_AFTER}\n`);

const code = await pc.getCode({ address: POLICY }).catch(() => null);
if (!code || code === "0x") {
  console.log("No contract at NEWTON_POLICY.");
  process.exit(1);
}
const [version, policyFactory, entrypoint, recognised] = await Promise.all([
  read(POLICY, policyAbi, "version"),
  read(POLICY, policyAbi, "factory"),
  read(POLICY, policyAbi, "getEntrypoint"),
  read(FACTORY, factoryAbi, "isPolicy", [POLICY]),
]);
const policyOk = policyFactory && getAddress(policyFactory) === FACTORY && recognised === true && entrypoint === "newton_openaml.allow";
console.log(`policy version     ${version ?? "unreadable"}`);
console.log(`policy factory     ${policyFactory ?? "unreadable"}${policyFactory && getAddress(policyFactory) === FACTORY ? "   matches" : "   DOES NOT MATCH"}`);
console.log(`policy entrypoint  ${entrypoint ?? "unreadable"}${entrypoint === "newton_openaml.allow" ? "" : "   EXPECTED newton_openaml.allow"}`);
console.log(`factory.isPolicy   ${recognised}`);
if (!policyOk) {
  console.log("\nThat is not the OpenAML policy on the current factory. Stopping.");
  process.exit(1);
}

let record = {};
if (existsSync(RECORD)) {
  try {
    record = JSON.parse(readFileSync(RECORD, "utf8"));
  } catch {}
}

const wanted = ONLY ? CLIENTS.filter((c) => ONLY.includes(c.key)) : CLIENTS;
if (ONLY && wanted.length !== ONLY.length) {
  console.log(`Unknown key in --only. Valid: ${CLIENTS.map((c) => c.key).join(", ")}`);
  process.exit(1);
}

const paramsFor = (c) => stringToHex(JSON.stringify(c.params));
const expectedPolicyId = (client, revision, spec) =>
  keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" }, { type: "uint256" }, { type: "address" }, { type: "uint64" },
        { type: "tuple[]", components: [{ name: "policy", type: "address" }, { name: "config", type: "tuple", components: [{ name: "policyParams", type: "bytes" }, { name: "expireAfter", type: "uint32" }] }] },
      ],
      [POLICY_SET_DOMAIN, BigInt(sepolia.id), getAddress(client), BigInt(revision), spec],
    ),
  );

console.log("\n=== plan ===");
const todo = [];
for (const c of wanted) {
  const have = record[c.key]?.address;
  let healthy = false;
  if (have && isAddress(have)) {
    const set = await read(have, abi, "getPolicies");
    healthy = Array.isArray(set) && set.length === 1 && getAddress(set[0].policy) === POLICY && set[0].config.policyParams === paramsFor(c);
  }
  console.log(`  ${c.key.padEnd(32)} ${have ?? "(none)"}   ${have ? (healthy ? "already correct, skipping" : "present but wrong, will redeploy") : "to deploy"}`);
  if (!healthy) todo.push(c);
}

if (!todo.length) {
  console.log("\nAll clients are deployed and correct.");
  process.exit(0);
}
if (!EXECUTE) {
  console.log(`\n${todo.length} client(s) would be deployed, each a deploy plus a setPolicies call.`);
  console.log("Re-run with --execute.");
  process.exit(0);
}

const key = process.env.OWNER_PRIVATE_KEY;
if (!key) {
  console.log("\nOWNER_PRIVATE_KEY is needed to execute. Read it with: read -rs OWNER_PRIVATE_KEY && export OWNER_PRIVATE_KEY");
  process.exit(1);
}
const account = privateKeyToAccount(key.startsWith("0x") ? key : "0x" + key);
if (process.env.EXPECTED_OWNER && getAddress(process.env.EXPECTED_OWNER) !== account.address) {
  console.log(`\nThe key is ${account.address}, not EXPECTED_OWNER ${process.env.EXPECTED_OWNER}. The gateway only runs tasks for clients owned by the wallet behind the API key. Stopping.`);
  process.exit(1);
}
const balance = await pc.getBalance({ address: account.address });
console.log(`\ndeployer ${account.address}\nbalance  ${Number(balance) / 1e18} ETH`);
if (balance === 0n) {
  console.log("No Sepolia ETH.");
  process.exit(1);
}
const wc = createWalletClient({ account, chain: sepolia, transport: http(RPC) });

for (const c of todo) {
  console.log(`\n=== ${c.key} ===`);
  const deployHash = await wc.deployContract({ abi, bytecode, args: [TASK_MANAGER, account.address] });
  console.log(`  deploy tx      ${deployHash}`);
  const dr = await pc.waitForTransactionReceipt({ hash: deployHash });
  if (dr.status !== "success" || !dr.contractAddress) {
    console.log("  deploy failed");
    process.exit(1);
  }
  const client = getAddress(dr.contractAddress);
  console.log(`  client         ${client}`);

  // Public RPCs can lag a fresh deploy; wait until the code is visible.
  for (let i = 0; i < 10 && (await pc.getCode({ address: client }).catch(() => "0x")) === "0x"; i++) await new Promise((r) => setTimeout(r, 2000));

  const spec = [{ policy: POLICY, config: { policyParams: paramsFor(c), expireAfter: EXPIRE_AFTER } }];
  const setHash = await wc.writeContract({ address: client, abi, functionName: "setPolicies", args: [spec] });
  console.log(`  setPolicies tx ${setHash}`);
  const sr = await pc.waitForTransactionReceipt({ hash: setHash });
  if (sr.status !== "success") {
    console.log("  setPolicies failed");
    process.exit(1);
  }

  const [iface, onchainId, revision, set] = await Promise.all([
    read(client, abi, "supportsInterface", ["0xf67e14d6"]),
    read(client, abi, "getPolicyId"),
    read(client, abi, "policyRevision"),
    read(client, abi, "getPolicies"),
  ]);
  const expected = expectedPolicyId(client, revision ?? 1n, spec);
  const ok = iface === true && onchainId === expected && Array.isArray(set) && set.length === 1 && getAddress(set[0].policy) === POLICY;
  console.log(`  interface      ${iface}\n  policyId       ${onchainId}\n  expected       ${expected}\n  verified       ${ok ? "yes" : "NO"}`);
  if (!ok) {
    console.log("  Stopping: this client did not verify. Nothing recorded for it.");
    process.exit(1);
  }

  record[c.key] = { address: client, params: c.params, policy: POLICY, expireAfter: EXPIRE_AFTER, policyId: onchainId, owner: account.address, deployedAt: new Date().toISOString() };
  mkdirSync("policy/out", { recursive: true });
  writeFileSync(RECORD, JSON.stringify(record, null, 2) + "\n");
}

console.log(`\nRecorded in ${RECORD}. Commit it: the site reads the client addresses from this file.`);
