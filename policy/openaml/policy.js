// OpenAML address lists → Newton data oracle.
//
// For the payee and payer of the intent, returns which OpenAML tiers each
// address is in: sanctioned, blocked, fraud, flagged (or none). The Rego
// decides which tiers deny; this file only reports.
//
// Where the data comes from: index/shards/<abc>.json in this repo, at ONE
// fixed commit (INDEX_COMMIT). That index is a format-only copy of OpenAML's
// Data/ folder at OpenAML commit 07b2c3e (see index/README.md). Pinning a
// commit means every operator reads the same bytes, and a later push to the
// repo cannot change what a deployed policy answers.
//
// Two independent hosts must serve the shard and agree byte for byte. One
// host being down, slow or wrong cannot clear a listed address on its own.
//
// Built by `newton-cli policy build`, which disables WASI stdio, clocks and
// http. HTTP goes through the Newton host import. Never throws: any failure
// returns { ok: false, error } and the Rego fails closed.

import { fetch as httpFetch } from "newton:provider/http@0.2.0";

const INDEX_REPO = "alazk/newton-openaml-demo";
const INDEX_COMMIT = "dbed7bd97c74062a2fe0a2458a26ee35693a2787";
const OPENAML_SOURCE = "finos-labs/dtcch-2025-OpenAML@07b2c3e9ca9849eb29ab2ee2c679c3bc4945cc35";

// Fixed on purpose: whoever submits the task must not pick where data comes from.
const HOSTS = [
  (p) => `https://raw.githubusercontent.com/${INDEX_REPO}/${INDEX_COMMIT}/index/shards/${p}.json`,
  (p) => `https://cdn.jsdelivr.net/gh/${INDEX_REPO}@${INDEX_COMMIT}/index/shards/${p}.json`,
  (p) => `https://rawcdn.githack.com/${INDEX_REPO}/${INDEX_COMMIT}/index/shards/${p}.json`,
];
const NEEDED = 2;
const TIERS = ["sanctioned", "blocked", "fraud", "flagged"];

const isAddress = (a) => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);

function get(url) {
  let res;
  try {
    res = httpFetch({ url, method: "GET", headers: [["accept", "application/json"]], body: undefined });
  } catch (e) {
    throw new Error(`http: ${e && e.payload ? e.payload : String(e)}`);
  }
  // Depending on the bindings, a WIT result arrives unwrapped or as {tag, val}.
  if (res && res.tag === "err") throw new Error(`http: ${res.val}`);
  if (res && res.tag === "ok") res = res.val;
  if (!res || res.status !== 200) throw new Error(`status ${res ? res.status : "none"}`);
  return new TextDecoder().decode(new Uint8Array(res.body));
}

/** One shard, from two hosts that agree. Throws if that can't be had. */
function shard(prefix) {
  const bodies = [];
  const errors = [];
  for (const host of HOSTS) {
    if (bodies.length >= NEEDED) break;
    try {
      bodies.push(get(host(prefix)));
    } catch (e) {
      errors.push(`${host(prefix)}: ${e && e.message ? e.message : String(e)}`);
    }
  }
  if (bodies.length < NEEDED) throw new Error(`shard ${prefix}: fewer than ${NEEDED} hosts answered (${errors.join("; ")})`);
  if (bodies.some((b) => b !== bodies[0])) throw new Error(`shard ${prefix}: hosts disagree`);

  const s = JSON.parse(bodies[0]);
  if (!s || s.v !== 1 || s.prefix !== prefix || s.source !== OPENAML_SOURCE || typeof s.entries !== "object" || s.entries === null) {
    throw new Error(`shard ${prefix}: unexpected content`);
  }
  return s.entries;
}

/** { address, tiers: [...], chains: { tier: [chain] } } for one address. */
function lookup(address, shards) {
  const a = address.toLowerCase();
  const entry = shards[a.slice(2, 5)][a];
  const tiers = [];
  const chains = {};
  if (entry && typeof entry === "object") {
    for (const t of TIERS) {
      if (Array.isArray(entry[t])) {
        tiers.push(t);
        chains[t] = entry[t].filter((c) => typeof c === "string");
      }
    }
  }
  return { address, tiers, chains };
}

function fail(error) {
  return JSON.stringify({ ok: false, error });
}

export function run(wasm_args) {
  let args;
  try {
    args = JSON.parse(wasm_args || "{}");
  } catch {
    return fail("wasm_args is not JSON");
  }
  if (!args || typeof args !== "object") return fail("wasm_args is not an object");

  const to = args.to;
  const from = args.from;
  if (!isAddress(to)) return fail("wasm_args.to is not an address");
  if (from !== undefined && !isAddress(from)) return fail("wasm_args.from is not an address");

  const prefixes = [...new Set([to, from].filter(Boolean).map((a) => a.toLowerCase().slice(2, 5)))];
  const shards = {};
  try {
    for (const p of prefixes) shards[p] = shard(p);
  } catch (e) {
    return fail(e && e.message ? e.message : String(e));
  }

  return JSON.stringify({
    ok: true,
    version: 1,
    source: "openaml",
    openaml: OPENAML_SOURCE,
    index: `${INDEX_REPO}@${INDEX_COMMIT}`,
    to: lookup(to, shards),
    from: from !== undefined ? lookup(from, shards) : null,
  });
}
