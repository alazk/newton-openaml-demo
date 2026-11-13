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
import CheckFlow, { RUN_LOOP_MS, STEP_STARTS } from "@/components/CheckFlow";
import DataGlobe, { globeLegend } from "@/components/DataGlobe";
import { C, H, R, SP, T, BORDER, INSET_X } from "@/lib/ds";
import {
  DEFAULT_BLOCK,
  OPENAML_COMMIT,
  OPENAML_REPO_URL,
  TIERS,
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
  // Which OpenAML lists block a transfer. The visitor's rule.
  const [deny, setDeny] = useState<Tier[]>(DEFAULT_BLOCK);
  const [focused, setFocused] = useState(false);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const stageRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const checkOn = useReveal(checkRef);

  const valid = isAddress(to);
  const busy = run.status === "running";
  const ready = valid && !busy && deny.length > 0;

  /**
   * Put the check (heading and card) in the middle of the space under the
   * nav. If it is taller than that space, line its top up under the nav.
   */
  function centerCheck() {
    const el = frameRef.current;
    if (!el) return;
    const NAV = 76;
    const r = el.getBoundingClientRect();
    const space = window.innerHeight - NAV;
    const offset = r.height <= space - 16 ? NAV + (space - r.height) / 2 : NAV + 12;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - offset), behavior: reduce ? "auto" : "smooth" });
  }

  // Every change of screen (form, running, verdict) is centred again, so the
  // visitor never has to scroll to find it.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (run.status === "done") stageRef.current?.focus({ preventScroll: true });
    const id = requestAnimationFrame(centerCheck);
    return () => cancelAnimationFrame(id);
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
    // Stay on the running screen for one full pass of the diagram, so there is
    // time to read what is happening. Skipped under reduced motion.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shown = new Promise((r) => setTimeout(r, reduce ? 0 : RUN_LOOP_MS));
    try {
      const [res] = await Promise.all([
        fetch("/api/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to, deny }),
        }),
        shown,
      ]);
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
    centerCheck();
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
          <div ref={frameRef}>
          <div className="oa-in" style={{ position: "relative", zIndex: 1, marginBottom: SP.x3 }}>
            <Eyebrow>Try it</Eyebrow>
            <h2 id="check-title" style={{ margin: `${SP.x1}px 0 0`, fontFamily: SANS, ...T.h2, color: C.ink }}>
              Check a wallet
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
                deny={deny}
                onDeny={(t) => setDeny((d) => (d.includes(t) ? d.filter((x) => x !== t) : TIERS.filter((x) => x === t || d.includes(x))))}
                ready={ready}
                busy={busy}
                valid={valid}
                error={run.status === "error" ? run.message : null}
                onCheck={check}
              />
            )}
          </div>
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
      <button type="button" onClick={onHome} className="pe-reset oa-cobrand" aria-label="Newton Protocol and FINOS OpenAML. Back to the top">
        <img src="/newton-logo-white.svg" alt="" className="oa-logo-newton" />
        <span className="oa-cobrand-rule" aria-hidden />
        <span className="oa-finos-row">
          <img src="/finos-icon-white.svg" alt="" className="oa-finos-icon" />
          <img src="/finos-wordmark-white.svg" alt="" className="oa-finos-word" />
          <span className="oa-openaml">OpenAML</span>
        </span>
      </button>
      <span style={{ display: "flex", alignItems: "center", gap: SP.x1 }} title="Verdicts are signed on Ethereum Sepolia">
        <span className="pe-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.pass, display: "block" }} />
        <span style={{ ...label(), color: C.muted }}>Sepolia</span>
      </span>
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
          <Eyebrow>Newton Protocol × FINOS OpenAML</Eyebrow>
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

const RUN_STEPS = [
  { title: "The transfer is sent", body: "This page sends the sender and the recipient to Newton Protocol as a task." },
  { title: "Operators run the policy", body: "Newton Protocol operators run the OpenAML policy on that transfer." },
  { title: "They read OpenAML's lists", body: "The policy looks both addresses up in a fixed copy of the lists, from two hosts that must agree." },
  { title: "A quorum signs the answer", body: "A quorum of operators signs the verdict on Ethereum Sepolia." },
];

function Running({ to }: { to: string }) {
  // Which step the diagram is on. Follows the diagram's own loop; under
  // reduced motion the diagram is still, so every step shows the same.
  const [active, setActive] = useState<number | null>(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(null);
      return;
    }
    const t0 = performance.now();
    const id = setInterval(() => {
      const f = ((performance.now() - t0) % RUN_LOOP_MS) / RUN_LOOP_MS;
      let i = 0;
      STEP_STARTS.forEach((s, n) => {
        if (f >= s) i = n;
      });
      setActive(i);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="oa-run">
      <div>
        <div className="oa-head" style={{ fontFamily: SANS, ...T.h1, color: C.ink }}>
          Checking the wallet
        </div>
        <ol className="oa-steps oa-rise" style={{ ["--d" as string]: "0.12s" }}>
          {RUN_STEPS.map((s, i) => (
            <li key={s.title} className={active === null || active === i ? "is-on" : ""}>
              <span className="oa-step-n" aria-hidden>
                {i + 1}
              </span>
              <span>
                <span className="oa-step-t" style={{ fontFamily: SANS }}>
                  {s.title}
                </span>
                <span className="oa-step-b" style={{ fontFamily: SANS }}>
                  {s.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="oa-card-in oa-run-flow" style={{ ["--d" as string]: "0.2s" }}>
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
        <span className="oa-cobrand-rule" aria-hidden />
        <a href={OPENAML_REPO_URL} target="_blank" rel="noreferrer" aria-label="FINOS OpenAML on GitHub" className="oa-finos-row">
          <img src="/finos-icon-white.svg" alt="" className="oa-finos-icon" />
          <img src="/finos-wordmark-white.svg" alt="" className="oa-finos-word" />
          <span className="oa-openaml">OpenAML</span>
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
  deny: Tier[];
  onDeny: (t: Tier) => void;
  ready: boolean;
  busy: boolean;
  valid: boolean;
  error: string | null;
  onCheck: () => void;
}) {
  const { to, focused, setFocused, onTo, pick, onPick, deny, onDeny, ready, busy, valid, error, onCheck } = props;
  const hint = busy ? "" : error ? error : to && !valid ? "Not a valid address" : !valid ? "Enter a recipient" : deny.length === 0 ? "Choose a list to block" : "";

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: "center", padding: `${SP.x4}px ${INSET_X}` }}>
      <div className="pe-console" style={{ width: "100%" }}>
        {/* Left: what is enforced, and from what data. */}
        <div className="oa-card" style={{ ["--d" as string]: "0.24s", display: "flex", flexDirection: "column", gap: SP.x2 }}>
          <div style={{ display: "flex", alignItems: "center", height: 20 }}>
            <Head>Your rule</Head>
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
            <span style={{ fontFamily: SANS, ...T.h3 }}>Block a transfer if either wallet is on</span>

            <div role="group" aria-label="Lists that block a transfer" style={{ display: "flex", flexDirection: "column", gap: SP.x1, marginTop: SP.x2 }}>
              {TIERS.map((t) => (
                <TierSwitch key={t} tier={t} on={deny.includes(t)} disabled={busy} onToggle={() => onDeny(t)} />
              ))}
            </div>

            <div style={{ ...small(), color: deny.length ? C.body : C.error, marginTop: SP.x2 }}>
              {deny.length === 0
                ? "Choose at least one list to block."
                : deny.length === TIERS.length
                  ? "A wallet on none of these lists is allowed."
                  : `Allowed: wallets on no list, or only on ${joinTiers(TIERS.filter((t) => !deny.includes(t)))}.`}
            </div>

            <div style={{ marginTop: "auto", paddingTop: SP.x2, ...small(), color: C.muted }}>
              {fmt(TOTAL_ADDRESSES)} addresses from{" "}
              <a href={`${OPENAML_REPO_URL}/tree/${OPENAML_COMMIT}/Data`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                OpenAML, commit {OPENAML_COMMIT.slice(0, 7)}
              </a>
              . Newton Protocol operators run the check and sign the verdict. Screens the sender and the recipient of a
              native ETH transfer.
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
            {busy ? "Operators are checking the wallet…" : "Check this wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TierSwitch({ tier, on, disabled, onToggle }: { tier: Tier; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${TIER_INFO[tier].name}: ${on ? "blocked" : "allowed"}`}
      disabled={disabled}
      onClick={onToggle}
      className={`pe-reset oa-tier ${on ? "is-on" : ""}`}
    >
      <span style={{ minWidth: 0, textAlign: "left" }}>
        <span style={{ fontFamily: SANS, ...T.label, color: C.ink }}>
          {TIER_INFO[tier].name}
          <span style={{ color: C.muted, fontWeight: 400 }}> · {fmt(TIER_COUNTS[tier])}</span>
        </span>
        <span style={{ display: "block", ...small(), color: C.muted }}>{TIER_INFO[tier].meaning}</span>
      </span>
      <span className="oa-tier-state" aria-hidden>
        {on ? "Block" : "Allow"}
      </span>
      <span className="oa-tier-track" aria-hidden>
        <span className="oa-tier-knob" />
      </span>
    </button>
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
  blocked: "Blocked",
  unavailable: "Screening unavailable",
  none: "No decision",
};

const TONE: Record<Done["outcome"], string> = {
  allowed: C.passText,
  blocked: C.flagText,
  unavailable: C.neutralText,
  none: C.neutralText,
};

/** A soft glow in the outcome's tone; none for states that decided nothing. */
const GLOW: Record<Done["outcome"], string> = {
  allowed: "0 0 28px rgba(98, 214, 168, 0.35)",
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
  const mine = (tiers: Tier[] | undefined) => (tiers ?? []).filter((t) => r.deny.includes(t));
  const toHits = mine(r.lookup?.to.tiers);
  const fromHits = mine(r.lookup?.from.tiers);
  const others = (r.lookup?.to.tiers ?? []).filter((t) => !r.deny.includes(t));
  const noLookup = "Which OpenAML list matched could not be looked up just now. The signed verdict stands.";
  // Only reachable when the signed deny reasons name a match the lookup cannot find.
  const disagree = "A fresh lookup of the same OpenAML data finds neither address on a list your rule blocks, which disagrees with the signed verdict. The signed verdict stands.";

  switch (r.outcome) {
    case "blocked":
      if (toHits.length) {
        return { reason: `OpenAML lists the recipient as ${joinTiers(toHits)}: ${TIER_INFO[toHits[0]].meaning}. Your rule blocks that, so the transfer does not execute.`, note: null };
      }
      if (fromHits.length) {
        return { reason: `OpenAML lists the sender as ${joinTiers(fromHits)}. Your rule blocks that, so the transfer does not execute.`, note: null };
      }
      return { reason: "The policy denied the transfer, so it does not execute.", note: r.lookup ? disagree : noLookup };
    case "allowed":
      if (others.length) {
        return {
          reason: `OpenAML lists the recipient as ${joinTiers(others)}, which your rule allows. The transfer can go ahead.`,
          note: `Turn on ${joinTiers(others)} in your rule and the same wallet is blocked.`,
        };
      }
      return { reason: "The recipient is on none of the lists your rule blocks. The transfer can go ahead.", note: null };
    case "unavailable":
      return {
        reason:
          "The operators could not read OpenAML's data for this check, so the policy refused the transfer rather than guess. It does not execute. This says nothing about the recipient.",
        note: "This is the policy working as intended: data it cannot read is treated the same as a match, never as a pass.",
      };
    case "none":
      return {
        reason: "Newton Protocol did not return a readable verdict, so nothing was decided. This does not mean the recipient is clear.",
        note: r.verdict.error && r.verdict.error !== READ_ERROR ? r.verdict.error : null,
      };
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
                  background: result.deny.includes(t) ? C.flagWash : C.neutralWash,
                  color: result.deny.includes(t) ? C.flagText : C.neutralText,
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

      {/* The one signed verdict, with its attestation and the rule it was checked against. */}
      <div style={{ marginTop: SP.x4 }}>
        <VerdictRow result={result} delay={0.46} />
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

function VerdictRow({ result, delay }: { result: Done; delay: number }) {
  const o = result.outcome;
  // A denial that came from failing to screen is grey, not red (lib/outcome.ts).
  const text = { allowed: "Allowed", blocked: "Blocked", unavailable: "Not screened", none: "No answer" }[o];
  const color = o === "allowed" ? C.passText : o === "blocked" ? C.flagText : C.neutralText;
  const wash = o === "allowed" ? C.passWash : o === "blocked" ? C.flagWash : C.neutralWash;
  const url = result.verdict.explorerUrl;
  return (
    <div
      className="oa-left"
      style={{
        ["--d" as string]: `${delay}s`,
        padding: `${SP.x1_5}px ${SP.x2}px`,
        border: `${BORDER}px solid ${C.hairline}`,
        borderRadius: R.md,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: SP.x1_5, rowGap: SP.half }}>
        <span style={{ ...label(), color: C.ink }}>Signed verdict</span>
        <span style={{ ...small(), fontWeight: 500, color, background: wash, borderRadius: R.pill, padding: `${SP.half}px ${SP.x1_5}px`, whiteSpace: "nowrap" }}>{text}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={{ ...small(), marginLeft: "auto", color: C.ink, textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
            Attestation ↗
          </a>
        ) : (
          <span style={{ ...small(), marginLeft: "auto", color: C.muted }}>No attestation</span>
        )}
      </div>
      <div style={{ ...small(), color: C.muted, marginTop: SP.x1 }}>Your rule: block {joinTiers(result.deny)}.</div>
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
