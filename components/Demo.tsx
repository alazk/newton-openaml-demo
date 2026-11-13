"use client";

/**
 * Newton OpenAML Demo. One screen that changes state: the form beside the
 * globe, the running explainer, then the verdict beside the rule.
 *
 * Rules carried over from the sanctions demo, each one paid for there:
 *   1. Never render a verdict the response did not contain. Unreadable is
 *      "No decision", never "Allowed".
 *   2. The signed verdict decides; the OpenAML lookup only explains. If they
 *      disagree, say so instead of letting the reader reconcile it.
 *   3. A denial because data could not be read is not an accusation. It is
 *      grey, headed "Screening unavailable" (lib/outcome.ts decides when).
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import CheckFlow, { RUN_LOOP_MS, STEP_STARTS } from "@/components/CheckFlow";
import DataGlobe, { globeLegend } from "@/components/DataGlobe";
import { C, H, MOTION, R, SP, T, BORDER } from "@/lib/ds";
import { DEFAULT_BLOCK, TIERS, SAMPLES, TIER_COUNTS, TIER_INFO, TOTAL_ADDRESSES, type Tier } from "@/lib/openaml";
import type { CheckResponse } from "@/app/api/check/route";

const SANS = "var(--sans)";
const MONO = "var(--mono)";
const label = (): React.CSSProperties => ({ fontFamily: SANS, ...T.label });
const small = (): React.CSSProperties => ({ fontFamily: SANS, ...T.valueSm });
const fmt = (n: number) => n.toLocaleString("en-US");

type Pick = Tier | "clean" | null;
type Done = Extract<CheckResponse, { ok: true }>;
type Run = { status: "idle" } | { status: "running" } | { status: "done"; result: Done } | { status: "error"; message: string };

/** How long the running screen stays after the first check of a visit. */
const REPEAT_MS = 1600 * MOTION;
/** The globe's sweep before the screen changes. */
const KICK_MS = 520 * MOTION;

const isAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Change screen with a view transition where the browser has one, so the
 * wallet address travels from the field to the diagram to the verdict.
 * Elsewhere, and under reduced motion, the screen simply changes.
 */
function swap(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(() => flushSync(update));
  else update();
}

export default function Demo() {
  const [to, setTo] = useState("");
  const [pick, setPick] = useState<Pick>(null);
  // Which OpenAML lists block a transfer. The visitor's rule.
  const [deny, setDeny] = useState<Tier[]>(DEFAULT_BLOCK);
  const [focused, setFocused] = useState(false);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [starting, setStarting] = useState(false);
  // Bumped to make the globe sweep once: on a pick and when a check starts.
  const [kick, setKick] = useState(0);
  const seenExplainer = useRef(false);
  const appRef = useRef<HTMLElement>(null);

  const valid = isAddress(to);
  const busy = starting || run.status === "running";
  const ready = valid && !busy && deny.length > 0;
  const view = run.status === "done" ? "done" : run.status === "running" ? "running" : "home";

  // Each screen starts at the top, and the verdict takes focus for screen readers.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    if (view === "done") appRef.current?.focus({ preventScroll: true });
  }, [view]);

  function onTo(v: string) {
    setTo(v);
    setPick(null);
  }

  function onPick(p: Exclude<Pick, null>) {
    setTo(p === "clean" ? randomAddress() : sampleFor(p, to));
    setPick(p);
    setKick((k) => k + 1);
  }

  const toggle = (t: Tier) => setDeny((d) => (d.includes(t) ? d.filter((x) => x !== t) : TIERS.filter((x) => x === t || d.includes(x))));

  async function check(address = to) {
    if (!isAddress(address) || busy || deny.length === 0) return;
    const reduce = reducedMotion();
    // From the form: the globe sweeps once, then the screen changes.
    if (view === "home" && !reduce) {
      setStarting(true);
      setKick((k) => k + 1);
      await wait(KICK_MS);
    }
    swap(() => {
      setStarting(false);
      setRun({ status: "running" });
    });
    // The first check of a visit stays for one full pass of the diagram, so
    // there is time to read the explainer. Later checks only wait for the answer.
    const hold = reduce ? 0 : seenExplainer.current ? REPEAT_MS : RUN_LOOP_MS;
    seenExplainer.current = true;
    const shown = wait(hold);
    let next: Run;
    try {
      const [res] = await Promise.all([
        fetch("/api/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: address, deny }),
        }),
        shown,
      ]);
      const json = (await res.json().catch(() => null)) as CheckResponse | null;
      if (!json) next = { status: "error", message: "The check did not return a readable answer." };
      else if (!json.ok) next = { status: "error", message: json.error };
      else next = { status: "done", result: json };
    } catch {
      next = { status: "error", message: "Could not reach this site's server. Check your connection and try again." };
    }
    swap(() => setRun(next));
  }

  function reset() {
    swap(() => setRun({ status: "idle" }));
  }

  const outcome = run.status === "done" ? run.result.outcome : undefined;

  return (
    <div className="oa-page">
      <Nav onHome={reset} />
      <main
        id="main"
        ref={appRef}
        tabIndex={-1}
        className="oa-wrap oa-app"
        data-view={view}
        data-outcome={outcome}
        role={view === "home" ? undefined : "status"}
        aria-live={view === "home" ? undefined : "polite"}
        aria-atomic={view === "home" ? undefined : true}
      >
        <div className="oa-app-glow" aria-hidden key={run.status === "done" ? run.result.decidedAt : view} />
        <Fit>
        {run.status === "done" ? (
          <Decision result={run.result} deny={deny} onToggle={toggle} onAgain={() => check(run.result.to)} onReset={reset} />
        ) : run.status === "running" ? (
          <Running to={to} />
        ) : (
          <Home
            to={to}
            focused={focused}
            setFocused={setFocused}
            onTo={onTo}
            pick={pick}
            onPick={onPick}
            deny={deny}
            onToggle={toggle}
            ready={ready}
            busy={busy}
            valid={valid}
            error={run.status === "error" ? run.message : null}
            onCheck={() => check()}
            kick={kick}
          />
        )}
        </Fit>
      </main>
    </div>
  );
}

/**
 * One screen, never a scrollbar. The screen is laid out at full size and, only
 * when it is taller than the space under the nav, scaled down until it fits.
 * Laying it out wider by the same factor first keeps it filling the width, so
 * text reflows instead of leaving side gutters. Layouts are designed to fit
 * at common sizes; this is the guarantee for the rest.
 */
function Fit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
  useIso(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    let s = 1;
    let busy = false;
    const apply = () => {
      if (busy) return;
      busy = true;
      const avail = o.clientHeight;
      // A few passes: a smaller scale lays the screen out wider, which makes it shorter.
      for (let n = 0; n < 4; n++) {
        i.style.width = `${100 / s}%`;
        const h = i.offsetHeight;
        const next = h > avail ? Math.max(0.5, Math.floor((avail / h) * 1000) / 1000) : 1;
        if (Math.abs(next - s) < 0.002) break;
        s = next;
      }
      i.style.width = `${100 / s}%`;
      // If the last pass still overflows, one more step down always fits:
      // a smaller scale only ever makes the laid-out screen shorter.
      if (i.offsetHeight * s > avail + 0.5) {
        s = Math.max(0.5, Math.floor((avail / i.offsetHeight) * 1000) / 1000);
        i.style.width = `${100 / s}%`;
      }
      const h = i.offsetHeight * s;
      i.style.transform = `translateY(${Math.max(0, (avail - h) / 2)}px) scale(${s})`;
      busy = false;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="oa-fit">
      <div ref={inner} className="oa-fit-in">
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.4, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted }}>
      {children}
    </span>
  );
}

/* ── Nav: compact, floating, glass ──────────────────────── */

function Nav({ onHome }: { onHome: () => void }) {
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

/* ── Home: the form beside the globe ────────────────────── */

function Home(props: {
  to: string;
  focused: boolean;
  setFocused: (v: boolean) => void;
  onTo: (v: string) => void;
  pick: Pick;
  onPick: (p: Exclude<Pick, null>) => void;
  deny: Tier[];
  onToggle: (t: Tier) => void;
  ready: boolean;
  busy: boolean;
  valid: boolean;
  error: string | null;
  onCheck: () => void;
  kick: number;
}) {
  const { to, focused, setFocused, onTo, pick, onPick, deny, onToggle, ready, busy, valid, error, onCheck, kick } = props;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Under the rule: what gets through. Under the recipient: what was picked, or what is wrong.
  const passes =
    deny.length === 0
      ? "Choose at least one list to block."
      : deny.length === TIERS.length
        ? "A wallet on none of these lists is allowed."
        : `Allowed: wallets on no list, or only on ${joinTiers(TIERS.filter((t) => !deny.includes(t)))}.`;
  const hint = error
    ? error
    : to && !valid
      ? "That is not a valid address."
      : pick === "clean"
        ? "A freshly generated address with no history."
        : pick
          ? `A real address OpenAML lists as ${TIER_INFO[pick].name}: ${TIER_INFO[pick].meaning}.`
          : "";
  const hintBad = Boolean(error) || (Boolean(to) && !valid);

  return (
    <section className={`oa-home ${on ? "oa-on" : ""}`} aria-labelledby="hero-title">
      <div>
        <h1 id="hero-title" className="oa-h1 oa-in" style={{ ["--d" as string]: "0.05s" }}>
          Check a wallet before you pay it.
        </h1>
        <p className="oa-lead oa-in" style={{ ["--d" as string]: "0.22s", fontFamily: SANS }}>
          OpenAML labels {fmt(TOTAL_ADDRESSES)} wallets. Newton Protocol checks the transfer against the lists you choose,
          and a quorum of operators signs the answer before anything moves.
        </p>

        <div className="oa-form oa-card" style={{ ["--d" as string]: "0.3s" }}>
          {/* 1. The rule comes first: decide what to stop before choosing who to pay. */}
          <div className="oa-form-row">
            <span id="rule-title" className="oa-form-step">
              <b aria-hidden>1</b>Block the transfer if either wallet is on
            </span>
            <div className="oa-tiers" role="group" aria-labelledby="rule-title">
              {TIERS.map((t) => (
                <TierSwitch key={t} tier={t} on={deny.includes(t)} disabled={busy} onToggle={() => onToggle(t)} compact />
              ))}
            </div>
            <p className="oa-form-note" style={{ color: deny.length ? C.muted : C.error }}>
              {passes}
            </p>
          </div>

          {/* 2. Then the recipient. */}
          <div className="oa-form-row">
            <label htmlFor="recipient" className="oa-form-step">
              <b aria-hidden>2</b>Recipient wallet
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
              aria-invalid={Boolean(to) && !valid}
              aria-describedby="form-hint"
              disabled={busy}
              className="pe-input oa-wallet"
              style={{
                height: H.field,
                width: "100%",
                padding: `0 ${SP.x2}px`,
                borderRadius: R.sm,
                border: `${BORDER}px solid ${to && !valid ? C.error : C.control}`,
                fontFamily: MONO,
                ...T.mono,
                color: C.ink,
              }}
            />
            <span style={{ ...small(), color: C.muted, marginTop: SP.half }}>Or try a real one from OpenAML</span>
            <Pickers pick={pick} onPick={onPick} disabled={busy} />
            {/* Empty until there is something to say, so it takes no room. */}
            <p id="form-hint" role={error ? "alert" : undefined} className="oa-form-note" style={{ color: hintBad ? C.error : C.muted }} hidden={!hint}>
              {hint}
            </p>
          </div>

          <button
            type="button"
            onClick={onCheck}
            disabled={!ready}
            className={`pe-reset ${ready || busy ? "pe-dark" : ""} ${busy ? "pe-sweep" : ""}`}
            style={{
              height: H.action,
              width: "100%",
              borderRadius: R.pill,
              ...T.label,
              fontFamily: SANS,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // While checking it stays lit: a greyed button would read as "not ready".
              background: busy ? C.ink : ready ? undefined : C.field,
              color: busy ? C.surface : ready ? undefined : C.control,
              cursor: ready ? "pointer" : busy ? "progress" : "not-allowed",
            }}
          >
            {busy ? "Sending to Newton Protocol…" : "Check this wallet"}
          </button>
        </div>
      </div>

      <figure className="oa-card oa-home-globe" style={{ ["--d" as string]: "0.25s", margin: 0, position: "relative" }}>
        <DataGlobe deny={deny} focus={pick} kick={kick} />
        <figcaption style={{ position: "relative", ...small(), color: C.muted2, marginTop: SP.x1, maxWidth: "62ch", marginInline: "auto", textAlign: "center" }}>
          {globeLegend()}
        </figcaption>
      </figure>
    </section>
  );
}

/* ── Running: what is happening, beside the diagram ─────── */

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
    if (reducedMotion()) {
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
    <section className="oa-run">
      <div>
        <div className="oa-head">Checking the wallet</div>
        <div className="oa-rise" style={{ ["--d" as string]: "0.08s", marginTop: SP.x2 }}>
          <span className="oa-wallet oa-wallet-pill">{middle(to)}</span>
        </div>
        <ol className="oa-steps oa-rise" style={{ ["--d" as string]: "0.14s" }}>
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
    </section>
  );
}

/* ── Rule switches (verdict screen) and sample picks ────── */

/**
 * One list in the rule: on means block, off means allow. Compact puts the
 * meaning on the same line as the name, for the form, where height is short.
 */
function TierSwitch({ tier, on, disabled, onToggle, hit, compact }: { tier: Tier; on: boolean; disabled: boolean; onToggle: () => void; hit?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${TIER_INFO[tier].name}, ${TIER_INFO[tier].meaning}: ${on ? "blocked" : "allowed"}`}
      disabled={disabled}
      onClick={onToggle}
      className={`pe-reset oa-tier ${on ? "is-on" : ""} ${hit ? "is-hit" : ""} ${compact ? "is-compact" : ""}`}
    >
      <span style={{ minWidth: 0, textAlign: "left" }}>
        <span style={{ fontFamily: SANS, ...T.label, color: C.ink }}>
          {TIER_INFO[tier].name}
          <span style={{ color: C.muted, fontWeight: 400 }}> · {fmt(TIER_COUNTS[tier])}</span>
        </span>
        <span className="oa-tier-meaning" style={{ ...small(), color: C.muted }}>
          {TIER_INFO[tier].meaning}
        </span>
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

function Decision({
  result,
  deny,
  onToggle,
  onAgain,
  onReset,
}: {
  result: Done;
  deny: Tier[];
  onToggle: (t: Tier) => void;
  onAgain: () => void;
  onReset: () => void;
}) {
  const { reason, note } = explain(result);
  const listing = result.lookup?.to;
  const url = result.verdict.explorerUrl;
  // The lists that caused a block light up once as the verdict lands.
  const hits = result.outcome === "blocked" ? TIERS.filter((t) => result.deny.includes(t) && [...(result.lookup?.to.tiers ?? []), ...(result.lookup?.from.tiers ?? [])].includes(t)) : [];
  const changed = deny.length > 0 && deny.join("+") !== result.deny.join("+");

  return (
    <section className="oa-verdict">
      <div className="oa-verdict-main">
        <div className="oa-rise" style={{ ["--d" as string]: "0s" }}>
          <Eyebrow>Signed verdict</Eyebrow>
        </div>
        <div className="oa-head oa-verdict-word" style={{ color: TONE[result.outcome], textShadow: GLOW[result.outcome] }}>
          {HEADLINE[result.outcome]}
        </div>

        <div className="oa-rise" style={{ ["--d" as string]: "0.14s", ...T.valueLg, fontFamily: SANS, fontSize: 18, color: C.ink, marginTop: SP.x2, maxWidth: "46ch" }}>
          {reason}
        </div>

        {listing && listing.tiers.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: SP.x1, marginTop: SP.x2 }}>
            <span className="oa-rise" style={{ ["--d" as string]: "0.24s", ...small(), color: C.muted }}>
              Listed by OpenAML
            </span>
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

        {note && (
          <div className="oa-rise" style={{ ["--d" as string]: "0.38s", ...small(), color: C.body, marginTop: SP.x2, maxWidth: "54ch" }}>
            {note}
          </div>
        )}

        <div className="oa-rise" style={{ ["--d" as string]: "0.46s", marginTop: SP.x3 }}>
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="oa-explorer" style={{ marginTop: 0 }}>
              <img src="/newton-symbol-bone.svg" alt="" />
              View attestation on the Newton Explorer
              <span aria-hidden>↗</span>
            </a>
          ) : (
            <span style={{ ...small(), color: C.muted }}>No attestation was returned for this check.</span>
          )}
        </div>

        <div className="pe-parties oa-rise" style={{ ["--d" as string]: "0.56s", display: "flex", alignItems: "flex-start", gap: SP.x3, flexWrap: "wrap", marginTop: SP.x3 }}>
          <Party address={result.to} />
          <div style={{ display: "flex", flexDirection: "column", gap: SP.half }}>
            <span style={{ ...small(), color: C.muted, minHeight: H.chip - 12, display: "flex", alignItems: "center" }}>Decided</span>
            <span style={{ ...small(), minHeight: H.chip, display: "flex", alignItems: "center" }}>
              {new Date(result.decidedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium" })}
            </span>
          </div>
        </div>
      </div>

      {/* The rule, live: flip a switch and run the same wallet again. */}
      <aside className="oa-verdict-rule oa-card-in" style={{ ["--d" as string]: "0.3s" }} aria-label="Your rule">
        <div style={{ ...label(), color: C.ink }}>Your rule</div>
        {/* Phones: the rule in one line. Changing it happens on the first screen. */}
        <div className="oa-narrow-only" style={{ ...small(), color: C.muted, marginTop: 2 }}>
          Block {joinTiers(result.deny)}.
        </div>
        <div className="oa-wide-only" style={{ ...small(), color: C.muted, marginTop: 2 }}>Block the transfer if either wallet is on</div>
        <div className="oa-tiers oa-wide-only" role="group" aria-label="Lists that block a transfer">
          {TIERS.map((t) => (
            <TierSwitch key={t} tier={t} on={deny.includes(t)} disabled={false} onToggle={() => onToggle(t)} hit={hits.includes(t)} />
          ))}
        </div>
        <div className="oa-wide-only" style={{ ...small(), color: deny.length ? C.muted : C.error, marginTop: SP.x1_5, minHeight: 34 }}>
          {deny.length === 0
            ? "Choose at least one list to block."
            : changed
              ? "The rule changed. Run the same wallet again to see what it does."
              : "Flip a switch to test another rule on this wallet."}
        </div>
        <button
          type="button"
          onClick={onAgain}
          disabled={!changed}
          className={`pe-reset oa-wide-only ${changed ? "pe-dark" : ""}`}
          style={{
            marginTop: SP.x1,
            height: H.action,
            width: "100%",
            borderRadius: R.pill,
            ...T.label,
            fontFamily: SANS,
            background: changed ? undefined : C.field,
            color: changed ? undefined : C.control,
            cursor: changed ? "pointer" : "not-allowed",
          }}
        >
          Run again with this rule
        </button>
        <button
          type="button"
          onClick={onReset}
          className="pe-reset pe-outline"
          style={{ marginTop: SP.x1, height: H.control, width: "100%", borderRadius: R.pill, border: `${BORDER}px solid ${C.hairline}`, ...label(), color: C.ink }}
        >
          Check another wallet
        </button>
      </aside>
    </section>
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
          className="oa-wallet"
          style={{ fontFamily: MONO, ...T.mono, wordBreak: "break-all" }}
        >
          {address}
        </a>
      </div>
    </div>
  );
}
