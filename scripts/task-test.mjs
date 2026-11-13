/**
 * Submit one real check and print the outcome, the same way the page does.
 *
 *   NEWTON_API_KEY=… node scripts/task-test.mjs <to> [tiers] [from]
 *
 * tiers is the set to block, e.g. sanctioned+blocked+fraud (the default) or
 * flagged. The client for that set comes from policy/out/clients.sepolia.json.
 * With no sender, a random one is used so only the recipient can cause a denial.
 * EXPECT=ALLOWED|BLOCKED makes a mismatch exit non-zero.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const [to, tiersArg, fromArg] = process.argv.slice(2);
const KEY = process.env.NEWTON_API_KEY;
const ORDER = ["sanctioned", "blocked", "fraud", "flagged"];
const key = ORDER.filter((t) => (tiersArg || "sanctioned+blocked+fraud").split("+").includes(t)).join("+");
const rec = existsSync("policy/out/clients.sepolia.json") ? JSON.parse(readFileSync("policy/out/clients.sepolia.json", "utf8")) : {};
const CLIENT = rec[key]?.address;
const isAddr = (a) => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
if (!isAddr(to) || (fromArg && !isAddr(fromArg)) || !KEY || !isAddr(CLIENT)) {
  console.error(`usage: NEWTON_API_KEY=… node scripts/task-test.mjs <to> [tiers] [from]   (no client recorded for "${key}"?)`);
  process.exit(1);
}
const from = fromArg || "0x" + randomBytes(20).toString("hex");
const hex = (o) => "0x" + Buffer.from(JSON.stringify(o), "utf8").toString("hex");

async function task(client) {
  const t0 = Date.now();
  const res = await fetch("https://gateway.testnet.newton.xyz/rpc", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: randomUUID(),
      method: "newt_createTask",
      params: {
        chain_id: 11155111,
        policy_client: client,
        intent: { from, to, value: "0x0", data: "0x", chain_id: "0xaa36a7", function_signature: "0x" },
        wasm_args: [hex({ to, from })],
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const json = await res.json().catch(() => null);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (!json || json.error) return { verdict: null, secs, note: JSON.stringify(json?.error ?? res.status).slice(0, 300) };
  const found = [];
  (function walk(x, d = 0) {
    if (!x || typeof x !== "object" || d > 8) return;
    for (const [k, v] of Object.entries(x)) {
      if (k === "allowed" && typeof v === "boolean") found.push(v);
      else if (v && typeof v === "object") walk(v, d + 1);
    }
  })(json.result);
  const taskId = json.result?.task_id ?? json.result?.taskId ?? json.result?.task?.task_id ?? "";
  const err = json.result?.error ?? json.result?.operator_errors?.[0]?.message;
  const verdict = err || !found.length || !found.every((b) => b === found[0]) ? null : found[0];
  return { verdict, secs, note: err ? String(err).slice(0, 300) : "", url: taskId ? `https://explorer.newton.xyz/testnet/task/${taskId}` : "" };
}

const r = await task(CLIENT);
const outcome = r.verdict === null ? "NO DECISION" : r.verdict ? "ALLOWED" : "BLOCKED";
console.log(`${to}  block ${key}  →  ${outcome}  (${r.secs}s)  ${r.url ?? ""}${r.note ? "  " + r.note : ""}`);

// EXPECT=ALLOWED|BLOCKED makes a mismatch a failure, so a
// deploy script never has to rely on someone reading this output.
if (process.env.EXPECT && process.env.EXPECT !== outcome) {
  console.log(`  MISMATCH: expected ${process.env.EXPECT}`);
  process.exit(1);
}
