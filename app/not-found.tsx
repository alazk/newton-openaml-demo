import Link from "next/link";
import { C, R, SP, T, INSET_X } from "@/lib/ds";

/** A plain branded 404 with one way back. */
export default function NotFound() {
  return (
    <div className="pe-shell" style={{ background: C.surface }}>
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: SP.x2,
          padding: `${SP.x1_5}px ${INSET_X}`,
          border: `1px solid color-mix(in srgb, ${C.ink} 14%, transparent)`,
          borderRadius: R.xl,
          minHeight: 64,
        }}
      >
        <Link href="/" aria-label="Newton OpenAML Demo home" style={{ display: "block", lineHeight: 0 }}>
          <img src="/newton-logo.svg" alt="Newton" style={{ height: 18, display: "block" }} />
        </Link>
      </header>
      <main
        id="main"
        style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${SP.x6}px ${INSET_X}` }}
      >
        <h1 style={{ margin: 0, fontFamily: "var(--sans)", ...T.h1 }}>Page not found</h1>
        <p style={{ margin: `${SP.x2}px 0 0`, fontFamily: "var(--sans)", ...T.valueLg, color: C.body, maxWidth: "44ch" }}>
          There is nothing at this address. The demo is on the home page.
        </p>
        <Link
          href="/"
          className="pe-reset pe-dark"
          style={{
            marginTop: SP.x4,
            alignSelf: "flex-start",
            height: 44,
            padding: `0 ${SP.page}px`,
            borderRadius: R.pill,
            display: "inline-flex",
            alignItems: "center",
            fontFamily: "var(--sans)",
            ...T.label,
          }}
        >
          Go to the demo
        </Link>
      </main>
    </div>
  );
}
