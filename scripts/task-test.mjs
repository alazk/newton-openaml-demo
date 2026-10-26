/**
 * Submit one real check to both clients and print the outcome, the same way
 * the page does.
 *
 *   read -rs "NEWTON_API_KEY?Key: " && export NEWTON_API_KEY
 *   node scripts/task-test.mjs <to> [from]
 *
 * Client addresses come from policy/out/clients.sepolia.json, or
 * POLICY_CLIENT_BLOCK / POLICY_CLIENT_REVIEW. With no sender, a random one is
 * used so only the recipient can cause a denial.
 *
 * Run all five fixtures after any deploy and check each lands where it should:
 *   clean       0x1111111111111111111111111111111111111111   Allowed
 *   sanctioned  0x7F367cC41522cE07553e823bf3be79A889DEbe1B   Blocked
 *   blocked     0x1723eb6c8fb98d2678ed186c48db11bbd12a80eb   Blocked
 *   fraud       0x47666fab8bd0ac7003bce3f5c3585383f09486e2   Blocked
 *   flagged     0x1265bc855fd628aff6fed3fe4857a1b3b3597cfe   Held for review
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const [to, fromArg] = process.argv.slice(2);
const KEY = process.env.NEWTON_API_KEY;
const rec = existsSync("policy/out/clients.sepolia.json") ? JSON.parse(readFileSync("policy/out/clients.sepolia.json", "utf8")) : {};
const CLIENTS = { block: process.env.POLICY_CLIENT_BLOCK || rec.block?.address, review: process.env.POLICY_CLIENT_REVIEW || rec.review?.address };
const isAddr = (a) => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
if (!isAddr(to) || (fromArg && !isAddr(fromArg)) || !KEY || !isAddr(CLIENTS.block) || !isAddr(CLIENTS.review)) {
  console.error("usage: NEWTON_API_KEY=… node scripts/task-test.mjs <to> [from]   (clients from policy/out/clients.sepolia.json)");
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

const [block, review] = await Promise.all([task(CLIENTS.block), task(CLIENTS.review)]);
const show = (name, r) => `  ${name.padEnd(7)} ${r.verdict === null ? "NO DECISION" : r.verdict ? "allow" : "deny"}  (${r.secs}s)  ${r.url}${r.note ? "  " + r.note : ""}`;
const outcome =
  block.verdict === false ? "BLOCKED" : block.verdict === null || review.verdict === null ? "NO DECISION" : review.verdict === false ? "HELD FOR REVIEW" : "ALLOWED";
console.log(`${to}  ${outcome}\n${show("block", block)}\n${show("review", review)}`);
