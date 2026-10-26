/**
 * Checks that the pieces which must agree, do:
 *
 *   - the oracle and the site pin the same index commit and OpenAML commit
 *   - index/ in the working tree is unchanged since that commit (the oracle
 *     reads the commit, so edits here would never reach it)
 *   - every sample address is in its tier, and only that tier
 *   - the counts on the page match the index manifest
 *
 *   node scripts/check-consistency.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "pass" : "FAIL"}  ${msg}`);
  if (!cond) failed++;
};

const oracle = readFileSync("policy/openaml/policy.js", "utf8");
const site = readFileSync("lib/openaml.ts", "utf8");
const grab = (src, name) => src.match(new RegExp(`${name} = "([^"]+)"`))?.[1];

const commit = grab(oracle, "INDEX_COMMIT");
ok(commit && commit === grab(site, "INDEX_COMMIT"), `oracle and site pin the same index commit (${commit})`);
ok(grab(oracle, "INDEX_REPO") === grab(site, "INDEX_REPO"), "oracle and site name the same index repo");
const openaml = grab(site, "OPENAML_COMMIT");
ok(oracle.includes(`dtcch-2025-OpenAML@${openaml}`), `oracle expects OpenAML commit ${openaml}`);

let exists = true;
try {
  execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`]);
} catch {
  exists = false;
}
ok(exists, "the pinned index commit is in this repo's history");
if (exists) {
  const diff = execFileSync("git", ["diff", "--stat", commit, "--", "index"]).toString().trim();
  ok(diff === "", "index/ is unchanged since the pinned commit");
}

const manifest = JSON.parse(readFileSync("index/manifest.json", "utf8"));
ok(manifest.source.commit === openaml, "manifest was built from the same OpenAML commit");
const counts = Object.fromEntries([...site.matchAll(/^\s+(sanctioned|blocked|fraud|flagged): ([\d_]+),$/gm)].map((m) => [m[1], Number(m[2].replace(/_/g, ""))]));
for (const t of ["sanctioned", "blocked", "fraud", "flagged"]) ok(counts[t] === manifest.addresses_per_tier[t], `${t} count on the page matches the manifest (${manifest.addresses_per_tier[t]})`);
const total = Number(site.match(/TOTAL_ADDRESSES = ([\d_]+)/)[1].replace(/_/g, ""));
ok(total === manifest.addresses, `total on the page matches the manifest (${manifest.addresses})`);

const samples = site.slice(site.indexOf("export const SAMPLES"), site.indexOf("export type Listing"));
for (const t of ["sanctioned", "blocked", "fraud", "flagged"]) {
  const block = samples.slice(samples.indexOf(`  ${t}: [`));
  const addrs = [...block.slice(0, block.indexOf("],")).matchAll(/"(0x[0-9a-f]{40})"/g)].map((m) => m[1]);
  const wrong = addrs.filter((a) => {
    const e = JSON.parse(readFileSync(`index/shards/${a.slice(2, 5)}.json`, "utf8")).entries[a];
    return !e || Object.keys(e).length !== 1 || !e[t];
  });
  ok(addrs.length > 0 && wrong.length === 0, `${addrs.length} ${t} samples are in ${t} only${wrong.length ? ": " + wrong.join(", ") : ""}`);
}

console.log(failed ? `\n${failed} failed` : "\nall consistent");
process.exit(failed ? 1 : 0);
