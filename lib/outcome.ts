/**
 * From the signed verdict to the outcome, and when a denial was the policy
 * failing closed rather than a match.
 *
 * Kept free of runtime imports so scripts/test-outcome.mjs can run it with
 * plain Node (--experimental-strip-types).
 *
 * Why "failed closed" matters: the policy denies when it could not read
 * OpenAML's data (screening_unavailable, payee_not_screened, …). Painting that
 * red under "Blocked" tells someone their counterparty is listed when the truth
 * is that nobody could check. The page shows it grey as "Screening unavailable".
 */
import type { Listing, Tier } from "./openaml";

export type Side = {
  allowed: boolean | null;
  taskId: string | null;
  explorerUrl: string | null;
  error: string | null;
  /** Deny reasons from the signed response, when the gateway returns them. */
  denies: string[] | null;
  /** Denied, and the denial was not caused by a listed address. */
  failClosed: boolean;
};

export type Outcome = "allowed" | "blocked" | "unavailable" | "none";

const TIER_REASON = /^(payee|payer)_(sanctioned|blocked|fraud|flagged)$/;

/**
 * Was this side's denial a failure to screen?
 *
 * 1. If the signed response carries deny reasons, they decide: no tier reason
 *    means it failed closed.
 * 2. Otherwise, if the unsigned lookup worked, use it. It reads the same
 *    pinned index the oracle reads, so if neither address is in a tier this
 *    client denies, the denial cannot have come from a match.
 * 3. Otherwise we cannot tell, and say nothing: false.
 */
export function failedClosed(
  allowed: boolean | null,
  denies: string[] | null,
  tiers: Tier[],
  lookup: { to: Listing; from: Listing } | null,
): boolean {
  if (allowed !== false) return false;
  if (denies && denies.length) return !denies.some((d) => TIER_REASON.test(d));
  if (lookup) return ![lookup.to, lookup.from].some((l) => l.tiers.some((t) => tiers.includes(t)));
  return false;
}

/**
 * The outcome, from the signed verdict only (failClosed already applied):
 *   denied by a match        → blocked
 *   denied failing closed    → unavailable
 *   unreadable               → none
 *   allowed                  → allowed
 */
export function decide(verdict: Side): Outcome {
  if (verdict.allowed === false) return verdict.failClosed ? "unavailable" : "blocked";
  if (verdict.allowed === null) return "none";
  return "allowed";
}

/** Deny reasons, wherever the response carries them. Null when it has none. */
export function extractDenies(result: unknown): string[] | null {
  const found: string[] = [];
  (function walk(node: unknown, depth: number) {
    if (!node || typeof node !== "object" || depth > 8) return;
    if (Array.isArray(node)) {
      for (const n of node) walk(n, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "deny" && Array.isArray(v) && v.every((x) => typeof x === "string")) found.push(...(v as string[]));
      else if (v && typeof v === "object") walk(v, depth + 1);
    }
  })(result, 0);
  return found.length ? [...new Set(found)] : null;
}
