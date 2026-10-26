/**
 * Build the OpenAML lookup index from OpenAML's own files.
 *
 *   node index/build.mjs <path-to-OpenAML-checkout>
 *
 * Input: the three CSVs in OpenAML's Data/ folder
 * (github.com/finos-labs/dtcch-2025-OpenAML), at whatever commit the checkout
 * is on. Each row is `chain,address,label`, no header.
 *
 * Output: index/shards/<abc>.json, one file per first three hex characters of
 * the address (4,096 files), plus index/manifest.json. The policy's oracle
 * fetches only the one or two shards it needs, so a check reads a few KB
 * instead of OpenAML's 12 MB.
 *
 * This is a mechanical copy, not a second dataset. No label is added, removed
 * or reinterpreted, apart from mapping OpenAML's label names to four tier
 * names. Anyone can rerun this against the same OpenAML commit and get
 * byte-identical files, which is how the index can be checked.
 *
 * Every shard is written, including empty ones, so a missing file always
 * means an error (the oracle then fails closed) and never "not listed".
 */

import { createReadStream, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: node index/build.mjs <path-to-OpenAML-checkout>");
  process.exit(1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "shards");
const PREFIX_LEN = 3;

// OpenAML's file → the tier names the policy uses.
const FILES = [
  { file: "Data/address_sanctioned.csv.gz", labels: { Sanctioned: "sanctioned", Blocked: "blocked" } },
  { file: "Data/address_fraud.csv.gz", labels: { Fraud: "fraud" } },
  // Two rows are spelled "FlaggedGnosis" and "FlaggedPolygon"; they are Flagged.
  { file: "Data/address_flagged.csv.gz", labels: { Flagged: "flagged" }, prefixMatch: "Flagged" },
];
const TIER_ORDER = ["sanctioned", "blocked", "fraud", "flagged"];

const commit = execFileSync("git", ["-C", SRC, "rev-parse", "HEAD"]).toString().trim();
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** address → tier → Set(chain) */
const index = new Map();
const sources = [];
const rowsPerTier = Object.fromEntries(TIER_ORDER.map((t) => [t, 0]));
const rejected = [];

for (const { file, labels, prefixMatch } of FILES) {
  const path = join(SRC, file);
  sources.push({ file, sha256: sha256(readFileSync(path)) });
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  let line = 0;
  for await (const raw of rl) {
    line++;
    const row = raw.trim();
    if (!row) continue;
    const [chain, address, label] = row.split(",").map((s) => s.trim());
    let tier = labels[label];
    if (!tier && prefixMatch && label?.startsWith(prefixMatch)) tier = labels[prefixMatch];
    if (!tier || !/^0x[0-9a-fA-F]{40}$/.test(address ?? "") || !chain) {
      rejected.push(`${file}:${line}: ${row.slice(0, 120)}`);
      continue;
    }
    const a = address.toLowerCase();
    let tiers = index.get(a);
    if (!tiers) index.set(a, (tiers = new Map()));
    let chains = tiers.get(tier);
    if (!chains) tiers.set(tier, (chains = new Set()));
    chains.add(chain);
    rowsPerTier[tier]++;
  }
}

if (rejected.length) {
  console.error(`${rejected.length} rows did not parse:\n` + rejected.slice(0, 20).join("\n"));
  process.exit(1);
}

// Refuse to write an index this small: an empty index clears every address.
if (index.size < 100_000) {
  console.error(`only ${index.size} addresses parsed; refusing to write`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const shards = new Map();
for (let i = 0; i < 16 ** PREFIX_LEN; i++) shards.set(i.toString(16).padStart(PREFIX_LEN, "0"), []);
for (const a of [...index.keys()].sort()) shards.get(a.slice(2, 2 + PREFIX_LEN)).push(a);

const addressesPerTier = Object.fromEntries(TIER_ORDER.map((t) => [t, 0]));
let largest = 0;
for (const [prefix, addrs] of shards) {
  const entries = {};
  for (const a of addrs) {
    const tiers = index.get(a);
    const e = {};
    for (const t of TIER_ORDER) {
      if (!tiers.has(t)) continue;
      e[t] = [...tiers.get(t)].sort();
      addressesPerTier[t]++;
    }
    entries[a] = e;
  }
  const body = JSON.stringify({ v: 1, source: `finos-labs/dtcch-2025-OpenAML@${commit}`, prefix, entries }) + "\n";
  largest = Math.max(largest, body.length);
  writeFileSync(join(OUT, `${prefix}.json`), body);
}

const manifest = {
  v: 1,
  source: {
    repo: "https://github.com/finos-labs/dtcch-2025-OpenAML",
    commit,
    license: "Apache-2.0",
    files: sources,
  },
  shard: { prefix_length: PREFIX_LEN, count: shards.size, path: "index/shards/<prefix>.json", largest_bytes: largest },
  addresses: index.size,
  addresses_per_tier: addressesPerTier,
  rows_per_tier: rowsPerTier,
  tiers: {
    sanctioned: "OpenAML Sanctioned: OFAC and SEC listed",
    blocked: "OpenAML Blocked: frozen by Tether or Circle",
    fraud: "OpenAML Fraud: linked to exploits and hacks",
    flagged: "OpenAML Flagged: reported scams and phishing",
  },
};
writeFileSync(join(HERE, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ commit, addresses: index.size, addressesPerTier, largest }, null, 1));
