/**
 * OpenAML: tiers, sample addresses, and the unsigned lookup the page uses to
 * explain a verdict.
 *
 * The lookup reads the same index files, at the same pinned commit, that the
 * policy's oracle reads (policy/openaml/policy.js). It runs after the signed
 * verdict and only explains it: which OpenAML tier the address is in. The
 * attestation is the verdict; this is not.
 */

export const INDEX_REPO = "alazk/newton-openaml-demo";
/** Must equal INDEX_COMMIT in policy/openaml/policy.js. Checked by scripts/check-consistency.mjs. */
export const INDEX_COMMIT = "dbed7bd97c74062a2fe0a2458a26ee35693a2787";
export const OPENAML_COMMIT = "07b2c3e9ca9849eb29ab2ee2c679c3bc4945cc35";
export const OPENAML_REPO_URL = "https://github.com/finos-labs/dtcch-2025-OpenAML";

export type Tier = "sanctioned" | "blocked" | "fraud" | "flagged";
export const TIERS: Tier[] = ["sanctioned", "blocked", "fraud", "flagged"];

/** Which client each tier belongs to. Mirrors the params in scripts/deploy-clients.mjs. */
export const BLOCK_TIERS: Tier[] = ["sanctioned", "blocked", "fraud"];
export const REVIEW_TIERS: Tier[] = ["flagged"];

export const TIER_INFO: Record<Tier, { name: string; meaning: string }> = {
  sanctioned: { name: "Sanctioned", meaning: "on a government sanctions list" },
  blocked: { name: "Blocked", meaning: "frozen by Tether or Circle" },
  fraud: { name: "Fraud", meaning: "linked to an exploit or hack" },
  flagged: { name: "Flagged", meaning: "reported for a scam or phishing" },
};

export const TIER_COUNTS: Record<Tier, number> = {
  sanctioned: 182,
  blocked: 581,
  fraud: 576,
  flagged: 363_271,
};
export const TOTAL_ADDRESSES = 364_503;

/**
 * Real OpenAML addresses, each in exactly one tier and recorded on Ethereum,
 * so a pick demonstrates one rule at a time. Checked against the index by
 * scripts/check-consistency.mjs.
 */
export const SAMPLES: Record<Tier, string[]> = {
  sanctioned: [
    "0x0128e4fccf5ef86b030b28f0a8a029a3c5397a94",
    "0x1a4b46696b2bb4794eb3d4c26f1c55f9170fa4c5",
    "0x3c98d617db017f51c6a73a13e80e1fe14cd1d8eb",
    "0x4f47bc496083c727c5fbe3ce9cdf2b0f6496270c",
    "0x6be0ae71e6c41f2f9d0d1a3b8d0f75e6f6a0b46e",
    "0x86772b1409b61c639eaac9ba0acfbb6e238e5f83",
    "0xa14d5da3c6bf2d9304fe6d4bc6942395b4de048b",
    "0xba11d00c5f74255f56a5e366f4f77f5a186d7f55",
  ],
  blocked: [
    "0x242d65529f330751baf13120a0cf5face08ca9ca",
    "0x461270bd08dfa98edec980345fd56d578a2d8f49",
    "0x661be0562b31e9e8ddc2a7c93803005a1c71d749",
    "0x84c03c2c14e73e90bf8cea11d625271b3a92dfac",
    "0xa0786e9009587362250e33c749db29714c7b201c",
    "0xb8a886423d63063b67638ca29f849d8df611ef00",
    "0xdde54bcc6b0a01f9d6481720f3dcc731d6062d64",
  ],
  fraud: [
    "0x00768bc9f9a2347579ad331e80e9b80c76f4c891",
    "0x22a99dd23530b2e587af6e251d950ae7a1d92900",
    "0x378966338f04e4264aa521841c59406138e86fe9",
    "0x57a72ce4fd69ebedefc1a938b690fbf11a7dff80",
    "0x723a7084028421994d4a7829108d63ab44658315",
    "0x9bc22f7e0234029eaf2c570588d829f07123fdd6",
    "0xb8343bcc0256aa2d11022f12941c40c9822b6afb",
    "0xd5140c82d5b4edce7c27e602df6fea4738b91838",
  ],
  flagged: [
    "0x1f10a11e0dee64bcba13e5801c86b62e1700f794",
    "0x3f592763eee7eb81b21a181d8687b8ab1ec977dc",
    "0x60171e107907547c143c335f5eb505674978dd5c",
    "0x80d453e2bd5274bd711accdbb3dbb8d759cfe199",
    "0xa0d5611ddf5bab1b53ed44bc8ef632d0cc25a9fe",
    "0xc0ae89414ab95ec0eae82c43e37968d5a489f490",
    "0xe059643563d0e2139f86e25bb9e20498d6ff179f",
  ],
};

export type Listing = { address: string; tiers: Tier[]; chains: Partial<Record<Tier, string[]>> };

const HOSTS = [
  (p: string) => `https://raw.githubusercontent.com/${INDEX_REPO}/${INDEX_COMMIT}/index/shards/${p}.json`,
  (p: string) => `https://cdn.jsdelivr.net/gh/${INDEX_REPO}@${INDEX_COMMIT}/index/shards/${p}.json`,
];

/**
 * Look one or two addresses up in the index. Returns null when the index
 * could not be read, which the page shows as "no explanation", never as
 * "not listed".
 */
export async function lookup(addresses: string[]): Promise<Listing[] | null> {
  const lower = addresses.map((a) => a.toLowerCase());
  const prefixes = [...new Set(lower.map((a) => a.slice(2, 5)))];
  const shards: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const p of prefixes) {
    let entries: Record<string, Record<string, unknown>> | null = null;
    for (const host of HOSTS) {
      try {
        const res = await fetch(host(p), { signal: AbortSignal.timeout(6_000), cache: "force-cache" });
        if (!res.ok) continue;
        const s = await res.json();
        if (s?.v === 1 && s.prefix === p && s.source === `finos-labs/dtcch-2025-OpenAML@${OPENAML_COMMIT}` && s.entries) {
          entries = s.entries;
          break;
        }
      } catch {
        /* next host */
      }
    }
    if (!entries) return null;
    shards[p] = entries;
  }
  return addresses.map((address, i) => {
    const e = shards[lower[i].slice(2, 5)][lower[i]] ?? {};
    const tiers = TIERS.filter((t) => Array.isArray(e[t]));
    const chains: Partial<Record<Tier, string[]>> = {};
    for (const t of tiers) chains[t] = (e[t] as unknown[]).filter((c): c is string => typeof c === "string");
    return { address, tiers, chains };
  });
}
