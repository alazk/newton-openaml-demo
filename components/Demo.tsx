"use client";

/**
 * Newton OpenAML Demo.
 *
 * Same structure and tokens as the sanctions demo (alazk/newton-sanctions-demo):
 * a masthead and one stage that holds the console, then the verdict.
 *
 * Rules carried over, each one paid for there:
 *   1. Never render a verdict the response did not contain. Unreadable is
 *      "No decision", never "Allowed".
 *   2. The signed verdicts decide; the OpenAML lookup only explains. If they
 *      disagree, say so instead of letting the reader reconcile it.
 *   3. A denial because data could not be read is not an accusation.
 */

import { useEffect, useRef, useState } from "react";
import { C, H, R, SP, T, BORDER, INSET_X } from "@/lib/ds";
import {
  BLOCK_TIERS,
  OPENAML_COMMIT,
  OPENAML_REPO_URL,
  REVIEW_TIERS,
  SAMPLES,
  TIER_COUNTS,
  TIER_INFO,
  TOTAL_ADDRESSES,
  type Listing,
  type Tier,
} from "@/lib/openaml";
import type { CheckResponse } from "@/app/api/check/route";

const SANS = "var(--sans)";
const MONO = "var(--mono)";
const label = (): React.CSSProperties => ({ fontFamily: SANS, ...T.label });
const small = (): React.CSSProperties => ({ fontFamily: SANS, ...T.valueSm });
const fmt = (n: number) => n.toLocaleString("en-US");

type Pick = Tier | "clean" | null;
type Done = Extract<CheckResponse, { ok: true }>;
type Run = { status: "idle" } | { status: "running" } | { status: "done"; result: Done; stale?: boolean } | { status: "error"; message: string };

const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

function randomAddress(): string {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return "0x" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function sampleFor(tier: Tier, current: string): string {
  const pool = SAMPLES[tier].filter((a) => a.toLowerCase() !== current.toLowerCase());
  return pool[Math.floor(Math.random() * pool.length)];
}

function middle(a: string): string {
  return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-8)}` : a;
}

export default function Demo() {
  const [to, setTo] = useState("");
  const [pick, setPick] = useState<Pick>(null);
  const [focused, setFocused] = useState(false);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const stageRef = useRef<HTMLDivElement>(null);

  const valid = isAddress(to);
  const busy = run.status === "running";
  const ready = valid && !busy;

  useEffect(() => {
    if (run.status === "done") stageRef.current?.focus();
  }, [run.status]);

  function onTo(v: string) {
    setTo(v);
    setPick(null);
    if (run.status === "done") setRun({ ...run, stale: true });
  }

  function onPick(p: Exclude<Pick, null>) {
    setTo(p === "clean" ? randomAddress() : sampleFor(p, to));
    setPick(p);
  }

  async function check() {
    if (!ready) return;
    setRun({ status: "running" });
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const json = (await res.json().catch(() => null)) as CheckResponse | null;
      if (!json) return setRun({ status: "error", message: "The check did not return a readable answer." });
      if (!json.ok) return setRun({ status: "error", message: json.error });
      setRun({ status: "done", result: json });
    } catch {
      setRun({ status: "error", message: "Could not reach this site's server. Check your connection and try again." });
    }
  }

  function reset() {
    setRun({ status: "idle" });
  }

  return (
    <div className="pe-shell" style={{ background: C.surface }}>
      <Masthead onHome={reset} />
      <div
        ref={stageRef}
        className="pe-stage"
        tabIndex={-1}
        role={run.status === "idle" ? undefined : "status"}
        aria-live={run.status === "idle" ? undefined : "polite"}
        aria-atomic={run.status === "idle" ? undefined : true}
        style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", outline: "none", display: "flex", flexDirection: "column" }}
      >
        {run.status === "done" ? (
          <Decision result={run.result} stale={Boolean(run.stale)} onReset={reset} />
        ) : (
          <Console
            to={to}
            focused={focused}
            setFocused={setFocused}
            onTo={onTo}
            pick={pick}
            onPick={onPick}
            ready={ready}
            busy={busy}
            valid={valid}
            error={run.status === "error" ? run.message : null}
            onCheck={check}
          />
        )}
      </div>
    </div>
  );
}

/* ── Masthead ───────────────────────────────────────────── */

function Masthead({ onHome }: { onHome: () => void }) {
  return (
    <div
      className="pe-mast"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: SP.x3,
        padding: `${SP.x1_5}px ${INSET_X}`,
        background: C.surface,
        border: `1px solid color-mix(in srgb, ${C.ink} 14%, transparent)`,
        borderRadius: R.xl,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: SP.x2 }}>
        <button type="button" onClick={onHome} className="pe-reset" aria-label="Start a new check" title="Start a new check" style={{ display: "block", lineHeight: 0 }}>
          <img src="/newton-logo.svg" alt="Newton" style={{ height: 18, display: "block" }} />
        </button>
        <span
          style={{
            background: C.ink,
            color: C.surface,
            fontFamily: SANS,
            ...T.monoSm,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: R.pill,
            padding: `${SP.x1}px ${SP.x2}px`,
          }}
        >
          OpenAML
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          height: H.chip,
          border: `${BORDER}px solid ${C.hairline}`,
          borderRadius: R.pill,
          padding: `0 ${SP.x2}px`,
          background: C.surface,
        }}
      >
        <span className="pe-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.pass, display: "block" }} />
        <span style={{ ...label(), color: C.ink }}>Sepolia</span>
      </div>
    </div>
  );
}

/* ── Console ────────────────────────────────────────────── */

function Console(props: {
  to: string;
  focused: boolean;
  setFocused: (v: boolean) => void;
  onTo: (v: string) => void;
  pick: Pick;
  onPick: (p: Exclude<Pick, null>) => void;
  ready: boolean;
  busy: boolean;
  valid: boolean;
  error: string | null;
  onCheck: () => void;
}) {
  const { to, focused, setFocused, onTo, pick, onPick, ready, busy, valid, error, onCheck } = props;
  const hint = busy ? "" : error ? error : to && !valid ? "Not a valid address" : !valid ? "Enter a recipient" : "";

  return (
    <div className="pe-rise" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: "center", padding: `${SP.x3}px ${INSET_X}` }}>
      <div className="pe-console" style={{ width: "100%" }}>
        {/* Left: what is enforced, and from what data. */}
        <div style={{ display: "flex", flexDirection: "column", gap: SP.x2 }}>
          <div style={{ display: "flex", alignItems: "center", height: 20 }}>
            <Head>Active policy</Head>
          </div>
          <div
            style={{
              flex: 1,
              background: C.surface,
              border: `1px solid color-mix(in srgb, ${C.ink} 14%, transparent)`,
              borderRadius: R.lg,
              padding: SP.x3,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontFamily: SANS, ...T.h3 }}>OpenAML Address Screening</span>
            <div style={{ ...T.value, fontFamily: SANS, color: C.body, marginTop: SP.x2, maxWidth: "48ch" }}>
              Checks the transfer against {fmt(TOTAL_ADDRESSES)} addresses labeled by OpenAML, an open
              source AML project at FINOS. Newton Protocol operators run the check and sign the result
              before the transfer executes.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: SP.x1, marginTop: SP.x3 }}>
              <RuleRow action="Block" tone="flag" tiers={BLOCK_TIERS} />
              <RuleRow action="Hold for review" tone="caution" tiers={REVIEW_TIERS} />
            </div>

            <div style={{ marginTop: "auto", paddingTop: SP.x3, ...small(), color: C.muted }}>
              Data:{" "}
              <a href={`${OPENAML_REPO_URL}/tree/${OPENAML_COMMIT}/Data`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                OpenAML lists, commit {OPENAML_COMMIT.slice(0, 7)}
              </a>
              . Apache 2.0.
            </div>
          </div>
        </div>

        {/* Right: the transfer. */}
        <div style={{ display: "flex", flexDirection: "column", gap: SP.x2 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, height: 20 }}>
            <Head>Transfer</Head>
            <span role={error ? "alert" : undefined} style={{ ...small(), color: error ? C.error : C.muted, textAlign: "right" }}>
              {hint}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: SP.x1 }}>
            <label htmlFor="recipient" style={{ ...label(), color: C.muted }}>
              Recipient
            </label>
            <input
              id="recipient"
              value={focused ? to : to ? middle(to) : ""}
              onChange={(e) => onTo(e.target.value.trim())}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && ready && onCheck()}
              spellCheck={false}
              autoComplete="off"
              placeholder="0x…"
              aria-invalid={Boolean(to) && !isAddress(to)}
              disabled={busy}
              className="pe-input"
              style={{
                height: H.field,
                width: "100%",
                padding: `0 ${SP.x2}px`,
                borderRadius: R.sm,
                border: `${BORDER}px solid ${to && !isAddress(to) ? C.error : C.control}`,
                fontFamily: MONO,
                ...T.mono,
                color: C.ink,
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: SP.x1 }}>
            <span style={{ ...small(), color: to ? C.muted2 : C.body }}>Fill the recipient with</span>
            <Pickers pick={pick} onPick={onPick} disabled={busy} />
          </div>

          <div style={{ ...small(), color: C.muted, minHeight: 20 }}>
            {pick && pick !== "clean"
              ? `A real address OpenAML lists as ${TIER_INFO[pick].name}: ${TIER_INFO[pick].meaning}.`
              : pick === "clean"
                ? "A freshly generated address with no history."
                : "The sender is a fresh random address, so only the recipient can cause a denial."}
          </div>

          <button
            type="button"
            onClick={onCheck}
            disabled={!ready}
            className={`pe-reset ${ready || busy ? "pe-dark" : ""} ${busy ? "pe-sweep" : ""}`}
            style={{
              marginTop: "auto",
              height: H.action,
              width: "100%",
              borderRadius: R.pill,
              ...T.label,
              fontFamily: SANS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // While checking it stays dark: .pe-dark:disabled would grey it out
              // and read as "not ready" at the moment work is happening.
              background: busy ? C.ink : ready ? undefined : C.field,
              color: busy ? C.surface : ready ? undefined : C.control,
              cursor: ready ? "pointer" : busy ? "progress" : "not-allowed",
            }}
          >
            {busy ? "Operators are checking the transfer…" : "Check this transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RuleRow({ action, tone, tiers }: { action: string; tone: "flag" | "caution"; tiers: Tier[] }) {
  const color = tone === "flag" ? C.flagText : C.caution;
  const wash = tone === "flag" ? C.flagWash : C.cautionWash;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", alignItems: "baseline", gap: SP.x1_5 }}>
      <span style={{ ...small(), fontWeight: 500, color, background: wash, borderRadius: R.pill, padding: `${SP.half}px ${SP.x1_5}px`, whiteSpace: "nowrap", justifySelf: "start" }}>
        {action}
      </span>
      <span style={{ ...T.value, fontFamily: SANS, color: C.ink }}>
        {tiers.map((t, i) => (
          <span key={t}>
            {i > 0 && (i === tiers.length - 1 ? " and " : ", ")}
            {TIER_INFO[t].name}
            <span style={{ color: C.muted }}> ({fmt(TIER_COUNTS[t])})</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function Pickers({ pick, onPick, disabled }: { pick: Pick; onPick: (p: Exclude<Pick, null>) => void; disabled: boolean }) {
  const opts: { value: Exclude<Pick, null>; text: string }[] = [
    { value: "clean", text: "Clean" },
    { value: "sanctioned", text: "Sanctioned" },
    { value: "blocked", text: "Blocked" },
    { value: "fraud", text: "Fraud" },
    { value: "flagged", text: "Flagged" },
  ];
  function onKeyDown(e: React.KeyboardEvent) {
    const i = opts.findIndex((o) => o.value === pick);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onPick(opts[(Math.max(i, 0) + 1) % opts.length].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onPick(opts[(Math.max(i, 0) - 1 + opts.length) % opts.length].value);
    }
  }
  return (
    <div
      role="radiogroup"
      aria-label="Fill the recipient with"
      onKeyDown={onKeyDown}
      className="oa-pickers"
      style={{
        display: "grid",
        gap: SP.half,
        padding: SP.half,
        background: C.field,
        borderRadius: R.md,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      {opts.map((o, i) => {
        const checked = pick === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (pick === null && i === 0) ? 0 : -1}
            onClick={() => onPick(o.value)}
            className="pe-reset"
            style={{
              height: H.chip,
              padding: `0 ${SP.x1_5}px`,
              borderRadius: R.md,
              background: checked ? C.surface : "transparent",
              boxShadow: checked ? "0 1px 2px color-mix(in srgb, #0E0E0F 14%, transparent)" : "none",
              ...T.label,
              fontFamily: SANS,
              color: checked ? C.ink : C.muted,
              textAlign: "center",
              transition: "background 300ms var(--ease-newton), color 300ms var(--ease-newton)",
            }}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <div style={{ ...label(), color: C.ink }}>{children}</div>;
}

/* ── Decision ───────────────────────────────────────────── */

const HEADLINE: Record<Done["outcome"], string> = {
  allowed: "Allowed",
  review: "Held for review",
  blocked: "Blocked",
  none: "No decision",
};

const TONE: Record<Done["outcome"], string> = {
  allowed: C.passText,
  review: C.caution,
  blocked: C.flagText,
  none: C.muted,
};

/** Must match the text /api/check sets when a verdict can't be parsed. */
const READ_ERROR = "The operators' answer could not be read.";

function joinTiers(tiers: Tier[]): string {
  const names = tiers.map((t) => TIER_INFO[t].name);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function explain(r: Done): { reason: string; note: string | null } {
  const listing = r.lookup?.to;
  const blockHits = listing?.tiers.filter((t) => BLOCK_TIERS.includes(t)) ?? [];
  const reviewHits = listing?.tiers.filter((t) => REVIEW_TIERS.includes(t)) ?? [];
  const unknown = "The most likely cause is that the operators could not read OpenAML's data, which the policy treats as a denial rather than a guess. The signed verdict stands.";

  switch (r.outcome) {
    case "blocked":
      if (blockHits.length) {
        return {
          reason: `OpenAML lists the recipient as ${joinTiers(blockHits)}: ${TIER_INFO[blockHits[0]].meaning}. The block rule denied the transfer, so it does not execute.`,
          note: null,
        };
      }
      return {
        reason: "The block rule denied the transfer, so it does not execute.",
        note: r.lookup ? `A fresh lookup does not find this recipient in a blocking tier. ${unknown}` : null,
      };
    case "review":
      if (reviewHits.length) {
        return {
          reason: `OpenAML lists the recipient as Flagged: ${TIER_INFO.flagged.meaning}. The transfer waits until a person approves it.`,
          note: "Flagged is a community report with no source attached, so it holds the transfer rather than blocking it.",
        };
      }
      return {
        reason: "The review rule held the transfer until a person approves it.",
        note: r.lookup ? `A fresh lookup does not find this recipient in OpenAML's Flagged list. ${unknown}` : null,
      };
    case "allowed":
      return {
        reason: "The recipient is in none of the OpenAML tiers the policy acts on. Both rules allowed the transfer.",
        note: null,
      };
    case "none": {
      const why = [r.block.error, r.review.error].find((e) => e && e !== READ_ERROR) ?? null;
      return {
        reason: "Newton Protocol did not return a readable verdict, so nothing was decided. This does not mean the recipient is clear.",
        note: why,
      };
    }
  }
}

function Decision({ result, stale, onReset }: { result: Done; stale: boolean; onReset: () => void }) {
  const { reason, note } = explain(result);
  const listing: Listing | undefined = result.lookup?.to;

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        width: "100%",
        maxWidth: "40rem",
        marginInline: "auto",
        padding: `clamp(20px, 4vh, 48px) ${SP.x2}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div className="pe-reveal" style={{ fontFamily: SANS, ...T.h1, color: TONE[result.outcome] }}>
        {HEADLINE[result.outcome]}
      </div>

      <div className="pe-seq" style={{ display: "contents" }}>
        <div style={{ ...T.valueLg, fontFamily: SANS, color: C.ink, marginTop: SP.x2, maxWidth: "48ch" }}>{reason}</div>

        {listing && listing.tiers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SP.x1, marginTop: SP.x2 }}>
            <span style={{ ...small(), color: C.muted }}>Listed by OpenAML</span>
            {listing.tiers.map((t, i) => (
              <span
                key={t}
                className="pe-chip"
                style={{
                  ...small(),
                  borderRadius: R.pill,
                  padding: `${SP.half}px ${SP.x1_5}px`,
                  background: BLOCK_TIERS.includes(t) ? C.flagWash : C.cautionWash,
                  color: BLOCK_TIERS.includes(t) ? C.flagText : C.caution,
                  animationDelay: `${0.5 + i * 0.12}s`,
                }}
              >
                {TIER_INFO[t].name} · {(listing.chains[t] ?? []).join(", ")}
              </span>
            ))}
          </div>
        )}

        {note && <div style={{ ...small(), color: C.body, marginTop: SP.x2, maxWidth: "54ch" }}>{note}</div>}
      </div>

      {/* The two signed verdicts behind the outcome, each with its attestation. */}
      <div style={{ display: "flex", flexDirection: "column", gap: SP.x1, marginTop: SP.x4 }}>
        <VerdictRow name="Block rule" side={result.block} />
        <VerdictRow name="Review rule" side={result.review} />
      </div>

      <div className="pe-actions" style={{ display: "flex", alignItems: "center", gap: SP.x3, margin: `${SP.x3}px 0` }}>
        {stale && <span style={{ ...small(), color: C.body, flexShrink: 0 }}>Recipient changed · run again</span>}
        <div className="pe-actions-line" style={{ flex: 1, height: 1, background: C.hairline }} />
        <button
          type="button"
          onClick={onReset}
          className="pe-reset pe-outline pe-action-btn"
          style={{ height: H.control, padding: `0 ${SP.page}px`, borderRadius: R.pill, border: `${BORDER}px solid ${C.hairline}`, ...label(), color: C.ink, flexShrink: 0 }}
        >
          New check
        </button>
      </div>

      <div className="pe-parties" style={{ display: "flex", alignItems: "flex-start", gap: SP.x3, flexWrap: "wrap" }}>
        <Party address={result.to} />
        <div style={{ display: "flex", flexDirection: "column", gap: SP.half }}>
          <span style={{ ...small(), color: C.muted, minHeight: H.chip - 12, display: "flex", alignItems: "center" }}>Decided</span>
          <span style={{ ...small(), minHeight: H.chip, display: "flex", alignItems: "center" }}>
            {new Date(result.decidedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}
          </span>
        </div>
      </div>
    </div>
  );
}

function VerdictRow({ name, side }: { name: string; side: Done["block"] }) {
  const text = side.allowed === true ? "Allow" : side.allowed === false ? "Deny" : "No answer";
  const color = side.allowed === true ? C.passText : side.allowed === false ? C.flagText : C.muted;
  const wash = side.allowed === true ? C.passWash : side.allowed === false ? C.flagWash : C.field;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: SP.x1_5,
        padding: `${SP.x1}px ${SP.x1_5}px`,
        border: `${BORDER}px solid ${C.hairline}`,
        borderRadius: R.md,
      }}
    >
      <span style={{ ...label(), color: C.ink, minWidth: 96 }}>{name}</span>
      <span style={{ ...small(), fontWeight: 500, color, background: wash, borderRadius: R.pill, padding: `${SP.half}px ${SP.x1_5}px` }}>{text}</span>
      <span style={{ flex: 1 }} />
      {side.explorerUrl ? (
        <a href={side.explorerUrl} target="_blank" rel="noreferrer" style={{ ...small(), color: C.ink, textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
          Attestation ↗
        </a>
      ) : (
        <span style={{ ...small(), color: C.muted }}>No attestation</span>
      )}
    </div>
  );
}

function Party({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard needs a secure context */
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.half, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minHeight: H.chip - 12 }}>
        <span style={{ ...small(), color: C.muted }}>Recipient</span>
        <button
          type="button"
          onClick={copy}
          className="pe-reset pe-outline"
          style={{ height: 28, padding: `0 ${SP.x1_5}px`, borderRadius: R.pill, border: `${BORDER}px solid ${C.hairline}`, ...small(), color: C.ink }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", minHeight: H.chip }}>
        <a
          href={`https://etherscan.io/address/${address}`}
          target="_blank"
          rel="noreferrer"
          title="Open on Etherscan"
          style={{ fontFamily: MONO, ...T.mono, wordBreak: "break-all" }}
        >
          {address}
        </a>
      </div>
    </div>
  );
}
