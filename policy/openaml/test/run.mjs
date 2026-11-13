/**
 * Local test of the whole policy: oracle (policy.js) + Rego, against the real
 * index in this repo, with the hosts mocked so failures can be forced.
 *
 *   REGORUS=/path/to/regorus node policy/openaml/test/run.mjs
 *
 * Regorus is the Rego engine Newton operators run. Build it with
 *   cargo install regorus --example regorus --root ./regorus-bin
 *
 * Every case checks both outcomes it should: listed addresses deny, clean ones
 * allow, and every kind of data failure denies (fails closed).
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const POLICY_DIR = join(HERE, "..");
const REPO = join(POLICY_DIR, "..", "..");
const REGORUS = process.env.REGORUS || "regorus";

// ---- the oracle, with the Newton http import swapped for a mock ----------

let mode = "ok";
const calls = [];
globalThis.__mockFetch = (req) => {
  calls.push(req.url);
  const m = req.url.match(/\/index\/shards\/([0-9a-f]{3})\.json$/);
  const host = new URL(req.url).host;
  if (mode === "all-down") throw { payload: "connection refused" };
  if (mode === "one-down" && host === "raw.githubusercontent.com") throw { payload: "connection refused" };
  if (mode === "two-down" && host !== "rawcdn.githack.com") return { status: 503, headers: [], body: [] };
  if (mode === "404") return { status: 404, headers: [], body: [] };
  let text = readFileSync(join(REPO, "index", "shards", `${m[1]}.json`), "utf8");
  if (mode === "disagree" && host === "cdn.jsdelivr.net") text = text.replace(/"fraud":\[[^\]]*\],?/g, "");
  if (mode === "tampered") text = text.replace("finos-labs/dtcch-2025-OpenAML@", "someone-else/fork@");
  if (mode === "tagged") return { tag: "ok", val: { status: 200, headers: [], body: [...new TextEncoder().encode(text)] } };
  return { status: 200, headers: [], body: [...new TextEncoder().encode(text)] };
};

const src = readFileSync(join(POLICY_DIR, "policy.js"), "utf8").replace(
  /import \{ fetch as httpFetch \} from "newton:provider\/http@0\.2\.0";/,
  "const httpFetch = (r) => globalThis.__mockFetch(r);",
);
if (!src.includes("globalThis.__mockFetch")) throw new Error("could not mock the http import");
const { run } = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

// ---- Rego ------------------------------------------------------------------

const work = mkdtempSync(join(tmpdir(), "openaml-rego-"));
function rego(wasmOut, params, input) {
  const data = join(work, "data.json");
  const inp = join(work, "input.json");
  writeFileSync(data, JSON.stringify({ wasm: JSON.parse(wasmOut), ...(params === undefined ? {} : { params }) }));
  writeFileSync(inp, JSON.stringify(input));
  const q = (expr) =>
    JSON.parse(
      execFileSync(REGORUS, ["eval", "-d", join(POLICY_DIR, "policy.rego"), "-d", data, "-i", inp, expr]).toString(),
    ).result[0].expressions[0].value;
  return { allow: q("data.newton_openaml.allow"), deny: q("data.newton_openaml.deny") };
}

// ---- cases -------------------------------------------------------------------

const SENDER = "0x0710868cba0a72453e9f1a955cf917d3a7a6951a";
const A = {
  clean: "0x1111111111111111111111111111111111111111",
  sanctioned: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
  blocked: "0x1723eb6c8fb98d2678ed186c48db11bbd12a80eb",
  fraud: "0x47666fab8bd0ac7003bce3f5c3585383f09486e2",
  flagged: "0x1265bc855fd628aff6fed3fe4857a1b3b3597cfe",
  sanctionedAndFraud: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
};
const BLOCK = { deny_tiers: ["sanctioned", "blocked", "fraud"] };
const REVIEW = { deny_tiers: ["flagged"] };

const cases = [
  // [name, mode, to, from, params, expectAllow, expectDenyIncludes]
  ["clean / block", "ok", A.clean, SENDER, BLOCK, true, []],
  ["clean / review", "ok", A.clean, SENDER, REVIEW, true, []],
  ["sanctioned / block", "ok", A.sanctioned, SENDER, BLOCK, false, ["payee_sanctioned"]],
  ["sanctioned / review", "ok", A.sanctioned, SENDER, REVIEW, true, []],
  ["blocked / block", "ok", A.blocked, SENDER, BLOCK, false, ["payee_blocked"]],
  ["fraud / block", "ok", A.fraud, SENDER, BLOCK, false, ["payee_fraud"]],
  ["fraud / review", "ok", A.fraud, SENDER, REVIEW, true, []],
  ["flagged / block", "ok", A.flagged, SENDER, BLOCK, true, []],
  ["flagged / review", "ok", A.flagged, SENDER, REVIEW, false, ["payee_flagged"]],
  ["two tiers / block", "ok", A.sanctionedAndFraud, SENDER, BLOCK, false, ["payee_sanctioned", "payee_fraud"]],
  ["zero address not blocked", "ok", "0x0000000000000000000000000000000000000000", SENDER, BLOCK, true, []],
  ["precompile 0x…01 not blocked", "ok", "0x0000000000000000000000000000000000000001", SENDER, BLOCK, true, []],
  ["vanity 0x0000…4946 still sanctioned", "ok", "0x0000000000004946c0e9f43f4dee607b0ef1fa1c", SENDER, BLOCK, false, ["payee_sanctioned"]],
  ["listed sender / block", "ok", A.clean, A.fraud, BLOCK, false, ["payer_fraud"]],
  ["flagged sender / review", "ok", A.clean, A.flagged, REVIEW, false, ["payer_flagged"]],
  ["mixed-case input binds", "ok", A.sanctioned.toUpperCase().replace("0X", "0x"), SENDER, BLOCK, false, ["payee_sanctioned"]],
  ["wit result wrapper", "tagged", A.fraud, SENDER, BLOCK, false, ["payee_fraud"]],
  ["one host down still screens", "one-down", A.fraud, SENDER, BLOCK, false, ["payee_fraud"]],
  ["one host down, clean allows", "one-down", A.clean, SENDER, BLOCK, true, []],
  ["two hosts down fails closed", "two-down", A.clean, SENDER, BLOCK, false, ["screening_unavailable"]],
  ["all hosts down fails closed", "all-down", A.clean, SENDER, REVIEW, false, ["screening_unavailable"]],
  ["404 fails closed", "404", A.clean, SENDER, BLOCK, false, ["screening_unavailable"]],
  ["hosts disagree fails closed", "disagree", A.fraud, SENDER, BLOCK, false, ["screening_unavailable"]],
  ["wrong source fails closed", "tampered", A.clean, SENDER, BLOCK, false, ["screening_unavailable"]],
  ["no params fails closed", "ok", A.clean, SENDER, undefined, false, ["bad_params"]],
  ["empty params fails closed", "ok", A.clean, SENDER, { deny_tiers: [] }, false, ["bad_params"]],
  ["unknown tier fails closed", "ok", A.clean, SENDER, { deny_tiers: ["fraud", "hack"] }, false, ["bad_params"]],
  ["string params fails closed", "ok", A.clean, SENDER, { deny_tiers: "fraud" }, false, ["bad_params"]],
];

let failed = 0;
for (const [name, m, to, from, params, wantAllow, wantDeny] of cases) {
  mode = m;
  const out = run(JSON.stringify({ to, from }));
  const v = rego(out, params, { to, from });
  const ok = v.allow === wantAllow && wantDeny.every((d) => v.deny.includes(d));
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(32)} allow=${v.allow}  deny=${JSON.stringify(v.deny)}`);
}

// The oracle is fed attacker-controlled wasm_args; it must answer, not throw.
mode = "ok";
const wasmCases = [
  ["submitter swaps the payee", JSON.stringify({ to: A.clean, from: SENDER }), { to: A.fraud, from: SENDER }, BLOCK],
  ["null wasm_args", "null", { to: A.clean, from: SENDER }, BLOCK],
  ["garbage wasm_args", "{not json", { to: A.clean, from: SENDER }, BLOCK],
  ["no payer screened for a sender", JSON.stringify({ to: A.clean }), { to: A.clean, from: A.fraud }, BLOCK],
  ["null sender on the intent", JSON.stringify({ to: A.clean }), { to: A.clean, from: null }, BLOCK],
  ["numeric sender on the intent", JSON.stringify({ to: A.clean }), { to: A.clean, from: 7 }, BLOCK],
];
for (const [name, args, input, params] of wasmCases) {
  let out;
  try {
    out = run(args);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name.padEnd(32)} oracle threw: ${e.message}`);
    continue;
  }
  const v = rego(out, params, input);
  const ok = v.allow === false;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(32)} allow=${v.allow}  deny=${JSON.stringify(v.deny)}`);
}

// The submitter cannot choose where data comes from: extra fields are ignored.
calls.length = 0;
{
  const out = run(JSON.stringify({ to: A.fraud, from: SENDER, hosts: ["https://evil.example/"], index_commit: "0".repeat(40), index_repo: "evil/fork" }));
  const v = rego(out, BLOCK, { to: A.fraud, from: SENDER });
  const fixed = calls.every((u) => ["raw.githubusercontent.com", "cdn.jsdelivr.net", "rawcdn.githack.com"].includes(new URL(u).host) && u.includes("/alazk/newton-openaml-demo") && !u.includes("0".repeat(40)));
  const ok = v.allow === false && v.deny.includes("payee_fraud") && fixed;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${"injected hosts are ignored".padEnd(32)} allow=${v.allow}  deny=${JSON.stringify(v.deny)}`);
}

// Intent with no sender at all still screens the payee.
{
  const out = run(JSON.stringify({ to: A.clean }));
  const v = rego(out, BLOCK, { to: A.clean });
  const v2 = rego(run(JSON.stringify({ to: A.fraud })), BLOCK, { to: A.fraud });
  const ok = v.allow === true && v2.allow === false && v2.deny.includes("payee_fraud");
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${"no sender: payee still screened".padEnd(32)} allow=${v.allow}/${v2.allow}`);
}

// Two addresses in the same shard should fetch it once per host, not twice.
mode = "ok";
calls.length = 0;
run(JSON.stringify({ to: "0xabc0000000000000000000000000000000000001", from: "0xabc0000000000000000000000000000000000002" }));
const once = calls.length === 2;
if (!once) failed++;
console.log(`${once ? "pass" : "FAIL"}  ${"same shard fetched once".padEnd(32)} requests=${calls.length}`);

console.log(failed ? `\n${failed} failed` : `\nall ${cases.length + wasmCases.length + 3} passed`);
process.exit(failed ? 1 : 0);
