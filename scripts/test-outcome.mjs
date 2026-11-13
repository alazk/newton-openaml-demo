/**
 * Tests for lib/outcome.ts: which outcome the signed verdict produces, and
 * when a denial is shown grey ("Screening unavailable") instead of red.
 *
 *   node --experimental-strip-types scripts/test-outcome.mjs
 */
import { decide, failedClosed, extractDenies } from "../lib/outcome.ts";

const BLOCK = ["sanctioned", "blocked", "fraud"];
const REVIEW = ["flagged"];
const L = (tiers) => ({ address: "0x0", tiers, chains: {} });
const pair = (to, from = []) => ({ to: L(to), from: L(from) });
const side = (allowed, failClosed = false) => ({ allowed, failClosed, taskId: null, explorerUrl: null, error: null, denies: null });

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(58)} ${JSON.stringify(got)}`);
};

// failedClosed
eq("allowed is never fail-closed", failedClosed(true, null, BLOCK, pair([])), false);
eq("unreadable is never fail-closed", failedClosed(null, null, BLOCK, null), false);
eq("deny reasons with a tier: a match", failedClosed(false, ["payee_fraud"], BLOCK, null), false);
eq("deny reasons without a tier: failed closed", failedClosed(false, ["screening_unavailable", "payee_not_screened"], BLOCK, null), true);
eq("bad params: failed closed", failedClosed(false, ["bad_params"], BLOCK, pair(["fraud"])), true);
eq("signed reasons win over the lookup", failedClosed(false, ["screening_unavailable"], BLOCK, pair(["fraud"])), true);
eq("no reasons, lookup finds a blocking tier: a match", failedClosed(false, null, BLOCK, pair(["fraud"])), false);
eq("no reasons, lookup finds the sender: a match", failedClosed(false, null, BLOCK, pair([], ["sanctioned"])), false);
eq("no reasons, lookup finds nothing: failed closed", failedClosed(false, null, BLOCK, pair([])), true);
eq("no reasons, only Flagged, not in the chosen set: failed closed", failedClosed(false, null, BLOCK, pair(["flagged"])), true);
eq("Flagged chosen, Flagged recipient: a match", failedClosed(false, null, REVIEW, pair(["flagged"])), false);
eq("Flagged chosen, Fraud only: failed closed", failedClosed(false, null, REVIEW, pair(["fraud"])), true);
eq("no reasons, no lookup: cannot tell, stays red", failedClosed(false, null, BLOCK, null), false);
eq("empty reasons list counts as none", failedClosed(false, [], BLOCK, null), false);

// decide
eq("allowed", decide(side(true)), "allowed");
eq("denied on a match", decide(side(false)), "blocked");
eq("denied failing closed", decide(side(false, true)), "unavailable");
eq("unreadable", decide(side(null)), "none");

// extractDenies
eq("finds deny nested anywhere", extractDenies({ task_response: { evaluation_result: { deny: ["payee_fraud"] } } }), ["payee_fraud"]);
eq("merges and dedupes across operators", extractDenies({ ops: [{ deny: ["a", "b"] }, { deny: ["b"] }] }), ["a", "b"]);
eq("ignores non-string deny", extractDenies({ deny: [1, 2] }), null);
eq("none present", extractDenies({ allowed: false }), null);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
