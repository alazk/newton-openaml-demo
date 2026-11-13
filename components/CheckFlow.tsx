"use client";

/**
 * What happens on a check, as one looping diagram:
 *
 *   transfer ──▶ Newton Protocol operators ──▶ OpenAML data (pinned commit)
 *                              │◀─────────────┘
 *                              └──▶ verdict, signed on Sepolia
 *
 * Every box is true of the deployed system: the operators run the policy,
 * the oracle reads OpenAML's index at one pinned commit, and the quorum signs
 * the result on Ethereum Sepolia. The loop shows the order of events, not
 * live progress, so it never claims a step has finished.
 *
 * Pulses use SVG <animateMotion> (supported everywhere, no JS clock).
 * Reduced motion pauses the SVG, leaving the static diagram.
 */

import { useEffect, useId, useRef } from "react";

// Dark theme: boxes are near-black glass, a lit box outlines in white, the
// pulses are white with a glow.
const INK = "#F4F4F5";
const HAIR = "#2A2A2D";
const MUTED = "#A1A1A6";
const BOX = "#0E0E10";
const SANS = "var(--sans)";
const MONO = "var(--mono)";

type Box = { x: number; y: number; w: number; h: number };
type Layout = {
  vb: [number, number];
  transfer: Box;
  ops: Box;
  data: Box;
  verdict: Box;
  p1: string;
  p2: string;
  p3: string;
};

const WIDE: Layout = {
  vb: [600, 300],
  transfer: { x: 8, y: 110, w: 152, h: 80 },
  ops: { x: 224, y: 90, w: 152, h: 120 },
  data: { x: 440, y: 20, w: 152, h: 80 },
  verdict: { x: 440, y: 200, w: 152, h: 80 },
  p1: "M160 150 H224",
  p2: "M376 125 C410 125 406 60 440 60",
  p3: "M376 175 C410 175 406 240 440 240",
};

const TALL: Layout = {
  vb: [320, 430],
  transfer: { x: 84, y: 8, w: 152, h: 76 },
  ops: { x: 84, y: 144, w: 152, h: 116 },
  data: { x: 4, y: 340, w: 148, h: 80 },
  verdict: { x: 168, y: 340, w: 148, h: 80 },
  p1: "M160 84 V144",
  p2: "M128 260 C128 300 78 300 78 340",
  p3: "M192 260 C192 300 242 300 242 340",
};

/** One pass of the diagram while a check runs. Slow enough to follow. */
export const RUN_LOOP_MS = 7000;

/** Where each step of the explainer starts, as a fraction of one loop. */
export const STEP_STARTS = [0, 0.2, 0.4, 0.66];

/** Fractions of one loop. */
const T = {
  p1: [0.02, 0.2],
  dots: 0.2,
  p2: [0.26, 0.42],
  data: [0.4, 0.62],
  back: [0.46, 0.62],
  p3: [0.66, 0.82],
  verdict: [0.8, 0.97],
};

function Node({ b, caption, main, mono, lit, dur }: { b: Box; caption: string; main: string; mono?: boolean; lit?: [number, number]; dur: string }) {
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={14} fill={BOX} stroke={HAIR} strokeWidth={1.5}>
        {lit && (
          <animate
            attributeName="stroke"
            dur={dur}
            repeatCount="indefinite"
            values={`${HAIR};${HAIR};${INK};${INK};${HAIR};${HAIR}`}
            keyTimes={`0;${lit[0]};${lit[0] + 0.03};${lit[1]};${lit[1] + 0.02};1`}
          />
        )}
      </rect>
      <text x={b.x + 16} y={b.y + 30} fontSize={12} fill={MUTED} style={{ fontFamily: SANS }}>
        {caption}
      </text>
      <text x={b.x + 16} y={b.y + 54} fontSize={mono ? 13 : 15} fontWeight={mono ? 400 : 500} fill={INK} style={{ fontFamily: mono ? MONO : SANS }}>
        {main}
      </text>
    </g>
  );
}

function Pulse({ path, span, dur, reverse, glow }: { path: string; span: number[]; dur: string; reverse?: boolean; glow: string }) {
  const [a, b] = span;
  return (
    <circle r={5} fill={INK} opacity={0} filter={`url(#${glow})`}>
      <animateMotion
        dur={dur}
        repeatCount="indefinite"
        path={path}
        calcMode="spline"
        keyPoints={reverse ? "1;1;0;0" : "0;0;1;1"}
        keyTimes={`0;${a};${b};1`}
        keySplines="0 0 1 1;0.65 0 0.35 1;0 0 1 1"
      />
      <animate attributeName="opacity" dur={dur} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes={`0;${a};${a + 0.01};${b};${b + 0.02};1`} />
    </circle>
  );
}

function Diagram({ L, address, dur, className }: { L: Layout; address: string; dur: string; className: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const glow = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => (mq.matches ? svg.pauseAnimations() : svg.unpauseAnimations());
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { ops } = L;
  const dots = [0, 1, 2, 3].map((i) => ({ cx: ops.x + ops.w / 2 - 30 + i * 20, cy: ops.y + ops.h - 26 }));

  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${L.vb[0]} ${L.vb[1]}`}
      width="100%"
      role="img"
      aria-label="A transfer goes to Newton Protocol operators, who read OpenAML's data and sign a verdict on Ethereum Sepolia."
      style={{ display: undefined, overflow: "visible" }}
    >
      <defs>
        <filter id={glow} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {[L.p1, L.p2, L.p3].map((d) => (
        <g key={d}>
          <path d={d} fill="none" stroke={HAIR} strokeWidth={1.5} />
          <path d={d} fill="none" stroke={MUTED} strokeOpacity={0.35} strokeWidth={1.5} className="oa-march" />
        </g>
      ))}

      <Node b={L.transfer} caption="Transfer to" main={address} mono dur={dur} lit={[T.p1[0], T.p1[1] + 0.04]} />
      <Node b={L.data} caption="OpenAML data" main="commit 07b2c3e" mono dur={dur} lit={T.data as [number, number]} />
      <Node b={L.verdict} caption="Signed on Sepolia" main="Verdict" dur={dur} lit={T.verdict as [number, number]} />

      <g>
        <rect x={ops.x} y={ops.y} width={ops.w} height={ops.h} rx={14} fill={BOX} stroke={HAIR} strokeWidth={1.5}>
          <animate
            attributeName="stroke"
            dur={dur}
            repeatCount="indefinite"
            values={`${HAIR};${HAIR};${INK};${INK};${HAIR};${HAIR}`}
            keyTimes={`0;${T.dots};${T.dots + 0.03};${T.p3[1]};${T.p3[1] + 0.02};1`}
          />
        </rect>
        <text x={ops.x + 16} y={ops.y + 30} fontSize={12} fill={MUTED} style={{ fontFamily: SANS }}>
          Newton Protocol
        </text>
        <text x={ops.x + 16} y={ops.y + 54} fontSize={15} fontWeight={500} fill={INK} style={{ fontFamily: SANS }}>
          Operators
        </text>
        {dots.map((d, i) => {
          const s = T.dots + i * 0.04;
          return (
            <circle key={i} cx={d.cx} cy={d.cy} r={6} fill={HAIR}>
              <animate
                attributeName="fill"
                dur={dur}
                repeatCount="indefinite"
                values={`${HAIR};${HAIR};${INK};${INK};${HAIR};${HAIR}`}
                keyTimes={`0;${s};${s + 0.03};${T.p3[1]};${T.p3[1] + 0.04};1`}
              />
            </circle>
          );
        })}
      </g>

      <Pulse path={L.p1} span={T.p1} dur={dur} glow={glow} />
      <Pulse path={L.p2} span={T.p2} dur={dur} glow={glow} />
      <Pulse path={L.p2} span={T.back} dur={dur} reverse glow={glow} />
      <Pulse path={L.p3} span={T.p3} dur={dur} glow={glow} />
    </svg>
  );
}

/** Wide layout on tablets and up, a stacked one on phones (CSS picks). */
export default function CheckFlow({ address, speed = "idle" }: { address: string; speed?: "idle" | "running" }) {
  const dur = speed === "running" ? `${RUN_LOOP_MS / 1000}s` : "5.2s";
  return (
    <>
      <Diagram L={WIDE} address={address} dur={dur} className="oa-flow-wide" />
      <Diagram L={TALL} address={address} dur={dur} className="oa-flow-tall" />
    </>
  );
}
