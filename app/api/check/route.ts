import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { wasmArgsFor } from "@/lib/policy-set";
import { extractAllow, extractTaskId } from "@/lib/verdict";
import { BLOCK_TIERS, REVIEW_TIERS, lookup, type Listing } from "@/lib/openaml";
import { decide, extractDenies, failedClosed, type Outcome, type Side } from "@/lib/outcome";

/**
 * One check: the same transfer submitted as a real, quorum-signed Newton task
 * to both clients, in parallel.
 *
 *   block client   denies Sanctioned, Blocked and Fraud
 *   review client  denies Flagged
 *
 * Outcome, from the two signed verdicts (lib/outcome.ts):
 *   block denies on a match              → blocked
 *   block allows, review denies on a match → review
 *   either denies because it could not screen → unavailable
 *   both allow                           → allowed
 *   either unreadable (and no block deny) → none
 *
 * After that, an unsigned lookup in the OpenAML index says which tier the
 * addresses are in, so the page can explain the verdict. It never changes it.
 *
 * Same hardening as the sanctions demo's /api/evaluate: two fixed clients
 * from env and nothing from the request, validated input, a small body, and
 * fixed error text with details only in the server log.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const GATEWAY = process.env.NEWTON_GATEWAY_URL ?? "https://gateway.testnet.newton.xyz/rpc";
const CHAIN_ID = 11155111;
const MAX_BODY_BYTES = 1_024;

const isAddress = (a: unknown): a is string => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);

type Submitted = Omit<Side, "failClosed">;
export type CheckResponse =
  | {
      ok: true;
      outcome: Outcome;
      to: string;
      from: string;
      block: Side;
      review: Side;
      lookup: { to: Listing; from: Listing } | null;
      decidedAt: string;
    }
  | { ok: false; error: string };

function fail(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error } satisfies CheckResponse, { status, headers });
}

function hexEncodeJson(obj: unknown): string {
  return "0x" + Buffer.from(JSON.stringify(obj), "utf8").toString("hex");
}

async function submit(apiKey: string, client: string, to: string, from: string): Promise<Submitted> {
  const entry = hexEncodeJson({ to, from });
  const wasmArgs = (await wasmArgsFor(client, entry)) ?? [entry];
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "newt_createTask",
        params: {
          chain_id: CHAIN_ID,
          policy_client: client,
          intent: { from, to, value: "0x0", data: "0x", chain_id: "0x" + CHAIN_ID.toString(16), function_signature: "0x" },
          wasm_args: wasmArgs,
        },
      }),
      signal: AbortSignal.timeout(55_000),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[check] non-JSON gateway response:", client, res.status, text.slice(0, 500));
      return { allowed: null, taskId: null, explorerUrl: null, denies: null, error: "The Newton gateway returned an unexpected response." };
    }
    if (json.error) {
      console.error("[check] gateway error:", client, JSON.stringify(json.error).slice(0, 2000));
      return { allowed: null, taskId: null, explorerUrl: null, denies: null, error: "The Newton gateway could not run this check." };
    }
    const taskId = extractTaskId(json.result);
    const allowed = extractAllow(json.result);
    return {
      allowed: allowed ?? null,
      taskId,
      explorerUrl: taskId ? `https://explorer.newton.xyz/testnet/task/${taskId}` : null,
      denies: extractDenies(json.result),
      error: allowed === undefined ? "The operators' answer could not be read." : null,
    };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    console.error("[check] request failed:", client, err);
    return { allowed: null, taskId: null, explorerUrl: null, denies: null, error: timeout ? "The Newton gateway did not answer in time." : "Could not reach the Newton gateway." };
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req), 6, "check");
  if (!limited.ok) {
    return fail(`Too many checks. Try again in ${limited.retryAfter}s.`, 429, { "retry-after": String(limited.retryAfter) });
  }

  const apiKey = process.env.NEWTON_API_KEY;
  const blockClient = process.env.POLICY_CLIENT_BLOCK;
  const reviewClient = process.env.POLICY_CLIENT_REVIEW;
  if (!apiKey || !isAddress(blockClient) || !isAddress(reviewClient)) {
    console.error("[check] misconfigured:", { hasKey: Boolean(apiKey), block: blockClient ?? null, review: reviewClient ?? null });
    return fail("Screening is not configured on this deployment.", 500);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return fail("Request too large.", 413);
  let body: { to?: unknown; from?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  if (!isAddress(body.to)) return fail("Recipient must be a 20-byte 0x address.", 400);
  if (body.from !== undefined && !isAddress(body.from)) return fail("Sender must be a 20-byte 0x address.", 400);

  const to = body.to;
  // A fresh random sender unless one is given, so only the recipient can cause a denial.
  const from = (body.from as string | undefined) ?? "0x" + Buffer.from(crypto.getRandomValues(new Uint8Array(20))).toString("hex");

  const [b, r, listing] = await Promise.all([
    submit(apiKey, blockClient, to, from),
    submit(apiKey, reviewClient, to, from),
    lookup([to, from]).catch(() => null),
  ]);

  const pair = listing ? { to: listing[0], from: listing[1] } : null;
  const block: Side = { ...b, failClosed: failedClosed(b.allowed, b.denies, BLOCK_TIERS, pair) };
  const review: Side = { ...r, failClosed: failedClosed(r.allowed, r.denies, REVIEW_TIERS, pair) };
  const outcome = decide(block, review);

  return NextResponse.json({
    ok: true,
    outcome,
    to,
    from,
    block,
    review,
    lookup: pair,
    decidedAt: new Date().toISOString(),
  } satisfies CheckResponse);
}
