/**
 * Compile policy/OpenAMLDemoClient.sol and check it implements the Newton 0.7
 * client interface exactly: the XOR of the seven interface selectors must be
 * 0xf67e14d6, the id the deployed NewtonPolicy and registry check.
 *
 *   node scripts/compile-client.mjs
 *
 * Writes policy/out/OpenAMLDemoClient.json (abi + bytecode). Exits non-zero
 * if compilation fails or the interface id is wrong.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import solc from "solc";
import { toFunctionSelector } from "viem";

const NAME = "OpenAMLDemoClient";
const SRC = `policy/${NAME}.sol`;
const INTERFACE_ID = "0xf67e14d6";
const INTERFACE_FNS = [
  "getNewtonPolicyTaskManager", "getOwner", "getPolicies",
  "getPolicyId", "getPolicySetSnapshot", "policyRevision", "setPolicies",
];

const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity",
  sources: { [`${NAME}.sol`]: { content: readFileSync(SRC, "utf8") } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
})));

const diags = out.errors || [];
const errors = diags.filter((e) => e.severity === "error");
if (errors.length) {
  for (const e of errors) console.log(e.formattedMessage);
  process.exit(1);
}
for (const w of diags) console.log("  warn: " + String(w.formattedMessage || "").split("\n")[0]);

const c = out.contracts[`${NAME}.sol`][NAME];
mkdirSync("policy/out", { recursive: true });
writeFileSync(`policy/out/${NAME}.json`, JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 1));
console.log(`solc ${solc.version()}`);
console.log(`runtime bytecode  ${c.evm.deployedBytecode.object.length / 2} bytes`);

const typeOf = (i) => (i.type.startsWith("tuple") ? "(" + i.components.map(typeOf).join(",") + ")" + i.type.slice(5) : i.type);
const sigOf = (e) => e.name + "(" + e.inputs.map(typeOf).join(",") + ")";
const fns = c.abi.filter((e) => e.type === "function");
const members = fns.filter((e) => INTERFACE_FNS.includes(e.name));
let acc = 0;
for (const e of members) acc ^= parseInt(toFunctionSelector("function " + sigOf(e)).slice(2), 16);
const id = "0x" + (acc >>> 0).toString(16).padStart(8, "0");

for (const e of fns) console.log("  " + toFunctionSelector("function " + sigOf(e)) + "  " + sigOf(e));
const ok = id === INTERFACE_ID && members.length === INTERFACE_FNS.length;
console.log(`\ninterface id      ${id}  ${ok ? "correct" : `WRONG, expected ${INTERFACE_ID}`}`);
console.log(`artifact          policy/out/${NAME}.json`);
process.exit(ok ? 0 : 1);
