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
 *   3. A denial because data could not be read is not an accusation. It is
 *      grey, headed "Screening unavailable" (lib/outcome.ts decides when).
 */

import { useEffect, useRef, useState } from "react";
import CheckFlow from "@/components/CheckFlow";
import DataGlobe, { globeLegend } from "@/components/DataGlobe";
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
  const checkRef = useRef<HTMLElement>(null);
  const checkOn = useReveal(checkRef);

  const valid = isAddress(to);
  const busy = run.status === "running";
  const ready = valid && !busy;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (run.status === "done") stage.focus({ preventScroll: true });
    // On a phone the stage is part of the page: when it changes state, bring
    // the section back below the floating nav. Scroll to the section, not the
    // stage, so its heading is not left showing through the glass nav.
    if ((run.status === "running" || run.status === "done") && stage.getBoundingClientRect().top < 80) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("check")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
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

  function goToCheck() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("check")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  return (
    <div className="oa-page">
      <Nav
        onHome={() => {
          reset();
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        }}
        onCheck={goToCheck}
      />
      <main id="main">
        <Hero onCheck={goToCheck} />
        <Tagline />

        <section
          id="check"
          ref={checkRef}
          aria-labelledby="check-title"
          className={`oa-wrap ${checkOn ? "oa-on" : ""}`}
          style={{ position: "relative", paddingTop: SP.x6, paddingBottom: SP.x8, scrollMarginTop: 88 }}
        >
          <div className="oa-glow" aria-hidden style={{ width: "70%", height: "60%", left: "15%", top: "30%", opacity: 0.55 }} />
          <div className="oa-in" style={{ position: "relative", zIndex: 1, marginBottom: SP.x3 }}>
            <Eyebrow>Try it</Eyebrow>
            <h2 id="check-title" style={{ margin: `${SP.x1}px 0 0`, fontFamily: SANS, ...T.h2, color: C.ink }}>
              Check a transfer
            </h2>
          </div>

          <div
            ref={stageRef}
            className="oa-stage oa-card pe-stage"
            style={{ ["--d" as string]: "0.1s" }}
            tabIndex={-1}
            role={run.status === "idle" ? undefined : "status"}
            aria-live={run.status === "idle" ? undefined : "polite"}
            aria-atomic={run.status === "idle" ? undefined : true}
          >
            {run.status === "done" ? (
              <Decision result={run.result} stale={Boolean(run.stale)} onReset={reset} />
            ) : busy ? (
              <Running to={to} />
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
        </section>
      </main>
      <Footer />
    </div>
  );
}

/** Adds the entrance once, when about a quarter of the element is in view. */
function useReveal(ref: React.RefObject<Element | null>, threshold = 0.25): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    if (!("IntersectionObserver" in window)) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, on, threshold]);
  return on;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.4, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
      {children}
    </span>
  );
}

/* ── Nav: compact, floating, glass ──────────────────────── */

function Nav({ onHome, onCheck }: { onHome: () => void; onCheck: () => void }) {
  return (
    <header className="oa-nav">
      <button type="button" onClick={onHome} className="pe-reset oa-cobrand" aria-label="Newton Protocol and FINOS. Back to the top">
        <img src="/newton-logo-white.svg" alt="" className="oa-logo-newton" />
        <span className="oa-cobrand-x" aria-hidden>×</span>
        <img src="/finos-logo-white.svg" alt="" className="oa-logo-finos" />
      </button>
      <span style={{ display: "flex", alignItems: "center", gap: SP.x1, paddingInline: SP.half }} title="Verdicts are signed on Ethereum Sepolia">
        <span className="pe-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.pass, display: "block" }} />
        <span style={{ ...label(), color: C.ink }}>Sepolia</span>
      </span>
      <button
        type="button"
        onClick={onCheck}
        className="pe-reset pe-dark oa-nav-cta"
        style={{ height: 36, padding: `0 ${SP.x2}px`, borderRadius: R.pill, ...label(), display: "inline-flex", alignItems: "center" }}
      >
        Check a wallet
      </button>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function Hero({ onCheck }: { onCheck: () => void }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className={`oa-wrap oa-hero ${on ? "oa-on" : ""}`} aria-labelledby="hero-title">
      <div>
        <div className="oa-in" style={{ ["--d" as string]: "0.05s" }}>
          <Eyebrow>Newton Protocol × FINOS</Eyebrow>
        </div>
        <h1 id="hero-title" className="oa-h1 oa-in" style={{ ["--d" as string]: "0.13s", marginTop: SP.x2, fontFamily: SANS }}>
          Check a wallet before you pay it.
        </h1>
        <p className="oa-lead oa-in" style={{ ["--d" as string]: "0.22s", fontFamily: SANS }}>
          This demo screens a transfer against {fmt(TOTAL_ADDRESSES)} addresses labeled by OpenAML, an open source AML
          project in FINOS Labs. Newton Protocol operators run the check and sign the result on Ethereum Sepolia before the
          transfer executes.
        </p>
        <div className="oa-in" style={{ ["--d" as string]: "0.31s", marginTop: SP.x4 }}>
          <button
            type="button"
            onClick={onCheck}
            className="pe-reset pe-dark"
            style={{ height: H.field, padding: `0 ${SP.x3}px`, borderRadius: R.pill, fontFamily: SANS, fontSize: 16, fontWeight: 500, display: "inline-flex", alignItems: "center" }}
          >
            Check a wallet
          </button>
        </div>
        <p className="oa-in" style={{ ["--d" as string]: "0.4s", margin: `${SP.x4}px 0 0`, ...small(), color: C.muted2 }}>
          Signed on Ethereum Sepolia · Data from OpenAML (FINOS Labs, Apache 2.0)
        </p>
      </div>

      <figure className="oa-card" style={{ ["--d" as string]: "0.25s", margin: 0, position: "relative" }}>
        <div className="oa-glow" aria-hidden style={{ width: "90%", aspectRatio: "1", left: "5%", top: "5%" }} />
        <DataGlobe />
        <figcaption style={{ position: "relative", ...small(), color: C.muted2, marginTop: SP.x1, maxWidth: "62ch", marginInline: "auto", textAlign: "center" }}>
          {globeLegend()}
        </figcaption>
      </figure>
    </section>
  );
}

/* ── Tagline: words light up as they cross a line ───────── */

const TAGLINE =
  "OpenAML labels the wallets. Newton Protocol checks each transfer against those labels, and a quorum of operators signs the answer before anything moves.";

function Tagline() {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>(".oa-word"));
    let frame = 0;
    // Progress runs from 0 when the paragraph's top reaches 85% of the
    // viewport to 1 when its bottom reaches 55%. Words light in reading
    // order as it grows, one at a time, never a whole line at once.
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.85;
      const end = vh * 0.55 - r.height;
      const progress = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      const lit = Math.round(progress * words.length);
      words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="oa-wrap" style={{ paddingBlock: "clamp(64px, 12vh, 140px)" }}>
      <p ref={ref} className="oa-tagline" style={{ fontFamily: SANS }} aria-label={TAGLINE}>
        {TAGLINE.split(" ").map((w, i) => (
          <span key={i} aria-hidden>
            <span className="oa-word">{w}</span>{" "}
          </span>
        ))}
      </p>
    </section>
  );
}

/* ── Running: the diagram plays while operators check ───── */

function Running({ to }: { to: string }) {
  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 880,
        marginInline: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: SP.x5,
        padding: `${SP.x5}px ${INSET_X}`,
      }}
    >
      <div>
        <div className="oa-head" style={{ fontFamily: SANS, ...T.h1, color: C.ink }}>
          Checking the transfer
        </div>
        <p className="oa-rise" style={{ ["--d" as string]: "0.12s", margin: `${SP.x2}px 0 0`, fontFamily: SANS, ...T.valueLg, color: C.body, maxWidth: "56ch" }}>
          Newton Protocol operators are checking this recipient against OpenAML&apos;s lists. The block rule and the review
          rule run at the same time, and each result is signed on Ethereum Sepolia.
        </p>
      </div>
      <div className="oa-card-in" style={{ ["--d" as string]: "0.2s" }}>
        <CheckFlow address={`${to.slice(0, 6)}…${to.slice(-4)}`} speed="running" />
      </div>
    </div>
  );
}

/* ── Footer ─────────────────────────────────────────────── */

function Footer() {
  const link: React.CSSProperties = { textDecoration: "underline", textUnderlineOffset: 3 };
  return (
    <footer className="oa-wrap oa-footer" style={{ paddingBlock: SP.x4, borderTop: `1px solid ${C.hairline}` }}>
      <div className="oa-cobrand oa-cobrand-lg">
        <img src="/newton-logo-white.svg" alt="Newton Protocol" className="oa-logo-newton" />
        <span className="oa-cobrand-x" aria-hidden>×</span>
        <a href="https://www.finos.org" target="_blank" rel="noreferrer" aria-label="FINOS, the Fintech Open Source Foundation">
          <img src="/finos-logo-white.svg" alt="" className="oa-logo-finos" />
        </a>
      </div>
      <p style={{ margin: 0, ...small(), color: C.muted, lineHeight: 1.7 }}>
        A Newton Protocol demo on Ethereum Sepolia. Data:{" "}
        <a href={`${OPENAML_REPO_URL}/tree/${OPENAML_COMMIT}/Data`} target="_blank" rel="noreferrer" style={link}>
          OpenAML lists
        </a>{" "}
        (FINOS Labs, Apache 2.0), commit {OPENAML_COMMIT.slice(0, 7)}. Policy and site:{" "}
        <a href="https://github.com/alazk/newton-openaml-demo" target="_blank" rel="noreferrer" style={link}>
          github.com/alazk/newton-openaml-demo
        </a>
        .
      </p>
    </footer>
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
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: "center", padding: `${SP.x4}px ${INSET_X}` }}>
      <div className="pe-console" style={{ width: "100%" }}>
        {/* Left: what is enforced, and from what data. */}
        <div className="oa-card" style={{ ["--d" as string]: "0.24s", display: "flex", flexDirection: "column", gap: SP.x2 }}>
          <div style={{ display: "flex", alignItems: "center", height: 20 }}>
            <Head>Active policy</Head>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.025)",
              border: `1px solid color-mix(in srgb, ${C.ink} 10%, transparent)`,
              borderRadius: R.lg,
              padding: SP.x3,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ fontFamily: SANS, ...T.h3 }}>OpenAML Address Screening</span>
            <div style={{ ...T.value, fontFamily: SANS, color: C.body, marginTop: SP.x2, maxWidth: "48ch" }}>
              Checks the transfer against {fmt(TOTAL_ADDRESSES)} addresses labeled by OpenAML, an open
              source AML project in FINOS Labs. Newton Protocol operators run the check and sign the result
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
        <div className="oa-card" style={{ ["--d" as string]: "0.33s", display: "flex", flexDirection: "column", gap: SP.x2 }}>
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
              background: checked ? C.raised : "transparent",
              boxShadow: checked ? "0 1px 0 rgba(255,255,255,0.06) inset, 0 2px 8px rgba(0,0,0,0.5)" : "none",
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
  unavailable: "Screening unavailable",
  none: "No decision",
};

const TONE: Record<Done["outcome"], string> = {
  allowed: C.passText,
  review: C.caution,
  blocked: C.flagText,
  unavailable: C.neutralText,
  none: C.neutralText,
};

/** A soft glow in the outcome's tone; none for states that decided nothing. */
const GLOW: Record<Done["outcome"], string> = {
  allowed: "0 0 28px rgba(98, 214, 168, 0.35)",
  review: "0 0 28px rgba(227, 180, 90, 0.35)",
  blocked: "0 0 32px rgba(224, 85, 46, 0.55)",
  unavailable: "none",
  none: "none",
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
  const fromTiers = r.lookup?.from.tiers ?? [];
  const noLookup = "Which OpenAML tier matched could not be looked up just now. The signed verdict stands.";
  // Only reachable when the signed deny reasons name a match the lookup cannot find.
  const disagree = "A fresh lookup of the same OpenAML data finds neither address in this tier, which disagrees with the signed verdict. The signed verdict stands.";

  switch (r.outcome) {
    case "blocked":
      if (blockHits.length) {
        return {
          reason: `OpenAML lists the recipient as ${joinTiers(blockHits)}: ${TIER_INFO[blockHits[0]].meaning}. The block rule denied the transfer, so it does not execute.`,
          note: null,
        };
      }
      if (fromTiers.some((t) => BLOCK_TIERS.includes(t))) {
        return { reason: `OpenAML lists the sender as ${joinTiers(fromTiers.filter((t) => BLOCK_TIERS.includes(t)))}. The block rule denied the transfer, so it does not execute.`, note: null };
      }
      return { reason: "The block rule denied the transfer, so it does not execute.", note: r.lookup ? disagree : noLookup };
    case "review":
      if (reviewHits.length) {
        return {
          reason: `OpenAML lists the recipient as Flagged: ${TIER_INFO.flagged.meaning}. The transfer waits until a person approves it.`,
          note: "Flagged is a community report with no source attached, so it holds the transfer rather than blocking it.",
        };
      }
      if (fromTiers.includes("flagged")) {
        return { reason: "OpenAML lists the sender as Flagged. The transfer waits until a person approves it.", note: null };
      }
      return { reason: "The review rule held the transfer until a person approves it.", note: r.lookup ? disagree : noLookup };
    case "allowed":
      return {
        reason: "The recipient is in none of the OpenAML tiers the policy acts on. Both rules allowed the transfer.",
        note: null,
      };
    case "unavailable":
      return {
        reason:
          "The operators could not read OpenAML's data for this check, so the policy refused the transfer rather than guess. It does not execute. This says nothing about the recipient.",
        note: "This is the policy working as intended: data it cannot read is treated the same as a match, never as a pass.",
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
      <div className="oa-head" style={{ fontFamily: SANS, ...T.h1, color: TONE[result.outcome], textShadow: GLOW[result.outcome] }}>
        {HEADLINE[result.outcome]}
      </div>

      <>
        <div className="oa-rise" style={{ ["--d" as string]: "0.12s", ...T.valueLg, fontFamily: SANS, color: C.ink, marginTop: SP.x2, maxWidth: "48ch" }}>{reason}</div>

        {listing && listing.tiers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SP.x1, marginTop: SP.x2 }}>
            <span className="oa-rise" style={{ ["--d" as string]: "0.24s", ...small(), color: C.muted }}>Listed by OpenAML</span>
            {listing.tiers.map((t, i) => (
              <span
                key={t}
                className="oa-pop"
                style={{
                  ...small(),
                  borderRadius: R.pill,
                  padding: `${SP.half}px ${SP.x1_5}px`,
                  background: BLOCK_TIERS.includes(t) ? C.flagWash : C.cautionWash,
                  color: BLOCK_TIERS.includes(t) ? C.flagText : C.caution,
                  ["--d" as string]: `${0.32 + i * 0.08}s`,
                }}
              >
                {TIER_INFO[t].name} · {(listing.chains[t] ?? []).join(", ")}
              </span>
            ))}
          </div>
        )}

        {note && <div className="oa-rise" style={{ ["--d" as string]: "0.38s", ...small(), color: C.body, marginTop: SP.x2, maxWidth: "54ch" }}>{note}</div>}
      </>

      {/* The two signed verdicts behind the outcome, each with its attestation. */}
      <div style={{ display: "flex", flexDirection: "column", gap: SP.x1, marginTop: SP.x4 }}>
        <VerdictRow name="Block rule" side={result.block} delay={0.46} />
        <VerdictRow name="Review rule" side={result.review} delay={0.54} />
      </div>

      <div className="pe-actions oa-rise" style={{ ["--d" as string]: "0.64s", display: "flex", alignItems: "center", gap: SP.x3, margin: `${SP.x3}px 0` }}>
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

      <div className="pe-parties oa-rise" style={{ ["--d" as string]: "0.72s", display: "flex", alignItems: "flex-start", gap: SP.x3, flexWrap: "wrap" }}>
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

function VerdictRow({ name, side, delay }: { name: string; side: Done["block"]; delay: number }) {
  // A denial that came from failing to screen is grey, not red (lib/outcome.ts).
  const denied = side.allowed === false && !side.failClosed;
  const text = side.allowed === true ? "Allow" : side.allowed === false ? (side.failClosed ? "Not screened" : "Deny") : "No answer";
  const color = side.allowed === true ? C.passText : denied ? C.flagText : C.neutralText;
  const wash = side.allowed === true ? C.passWash : denied ? C.flagWash : C.neutralWash;
  return (
    <div
      className="oa-left"
      style={{
        ["--d" as string]: `${delay}s`,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: SP.x1_5,
        rowGap: SP.half,
        padding: `${SP.x1}px ${SP.x1_5}px`,
        border: `${BORDER}px solid ${C.hairline}`,
        borderRadius: R.md,
      }}
    >
      <span style={{ ...label(), color: C.ink, minWidth: 88 }}>{name}</span>
      <span style={{ ...small(), fontWeight: 500, color, background: wash, borderRadius: R.pill, padding: `${SP.half}px ${SP.x1_5}px`, whiteSpace: "nowrap" }}>{text}</span>
      {side.explorerUrl ? (
        <a href={side.explorerUrl} target="_blank" rel="noreferrer" style={{ ...small(), marginLeft: "auto", color: C.ink, textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
          Attestation ↗
        </a>
      ) : (
        <span style={{ ...small(), marginLeft: "auto", color: C.muted }}>No attestation</span>
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
