---
name: newton-demo-design
description: Visual and copy rules for building or restyling any Newton demo, the demo library, or a case study page: tokens, layout, verdict states, copy and ship checklist.
---

# Newton demo design

The system the Newton Protocol demos share (sanctions, Lazarus Scan, Pool Guard, OpenAML). It comes from the Newton Explorer token contract used in Lazarus Scan (`design/tokens.css`) and the sanctions demo's `DESIGN-SYSTEM.md`, plus a few rules borrowed from `landing-page-design` in [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT).

The demos are educational. Their job is to make one Newton Protocol decision legible: what was checked, against what data, who signed it, and what happens next. They are not landing pages, so conversion patterns (free trials, risk reversal, testimonial walls, scroll-reveal taglines, gradient headlines) do not apply.

When a rule here conflicts with a framework default or another design skill, this file wins. When the user's explicit request conflicts with a rule, the user wins. When restyling an existing demo, read its own tokens file first; if it differs from this one, ask which wins before changing it.

## 1. Three rules the system exists to serve

1. **Never render a verdict the response did not contain.** An unreadable answer is "No decision", never "Allowed". One demo once showed green for every task because undefined fell through to the happy branch.
2. **The signed verdict decides; anything else only explains.** Lookups done after the verdict (which list matched, which tier) are labelled as unsigned. If they disagree with the verdict, the page says so instead of letting the reader reconcile it.
3. **Colour carries meaning, so it cannot also carry interaction.** Outcome tones are outcomes. Interaction is ink.

## 2. Colour

Flat colours only. No background gradients.

**Neutrals**

| Token | Hex | Use |
|---|---|---|
| ink | `#0E0E0F` | Text, primary buttons, focus ring |
| ink hover | `#393939` | Hover of ink fills |
| secondary | `#6B6B6C` | Body copy, labels |
| tertiary | `#737374` | Hints, metadata (clears 4.5:1 on bone) |
| disabled | `#9A9A9B` | Disabled text, input borders at rest |
| hairline | `#E3E3E4` | Dividers, outline buttons |
| sunken | `#F5F5F6` | Field fills, segmented control track, hover |
| surface | `#FFFFFF` | Cards, inputs |
| bone | `#FBFCFE` | Page background where a demo uses one |
| frame outline | `1px solid` ink at 14% | Masthead and cards |

**Outcome tones** (text on wash; the edge colour is for borders and dots)

| Outcome | Text | Wash | Edge |
|---|---|---|---|
| Pass, allowed, clear | `#095A41` | `#E6F2EE` | `#0B6E4F` |
| **Deny, blocked, not authorized (brand red)** | `#9F3619` | `#F8EAE4` | `#9F3619` |
| Caution, review, stale data | `#8A5E14` | `#FCF4E5` | `#8A5E14` |
| Neutral, no decision, unavailable | `#6B6B6C` | `#F5F5F6` | `#6B6B6C` |

- The brand red is the only deny colour. Never orange for "no".
- Input errors use the deny text colour.
- **A fail-closed denial is grey, not red.** When the policy denies because it could not screen, painting it red beside "Blocked" accuses the counterparty. Use the neutral tone and say the system refused to guess.
- Headline text on a wash is the tone's text colour or ink, never white.

## 3. Type

Suisse Intl is the licensed brand face; **Inter** stands in until it is licensed for web. **JetBrains Mono** for addresses, hashes, task ids and numbers. Self host both (no Google Fonts at build time). Weights 400 and 500 only. No italics. One family plus the mono.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| display | `clamp(1.5rem, 1.2rem + 1.5vw, 1.75rem)` (24–28) | 500 | 1.15 | -0.015em | Verdict headline only |
| title | `clamp(1.125rem, 1rem + 0.6vw, 1.25rem)` (18–20) | 500 | 1.2 | -0.01em | Page title |
| heading | 18px | 500 | 1.25 | -0.01em | Card heading |
| lead | 16px | 400 | 1.45 | 0 | Verdict reason, intro body |
| body | 14px | 400 | 1.45 | 0 | Default body |
| ui | 14px | 500 | 1.4 | 0 | Buttons, labels, row titles |
| caption | 12px | 400 | 1.4 | 0 | Metadata, hints |
| eyebrow | 12px | 500 | 1.4 | 0.08em uppercase | Section labels, masthead lockup |
| data | 14px mono | 400 | 1.45 | 0 | Addresses, hashes |

- Labels are sentence case at 14px. Uppercase tracking only in the masthead lockup and eyebrows.
- A timestamp is set in sans, not mono, so it does not compete with addresses.
- `text-wrap: balance` on headings, `text-wrap: pretty` on body, so no single word sits alone on a last line.
- Cap measure: 44ch for the verdict reason, 64ch for detail text.

## 4. Space, size, radius

**Space** (nothing in between): 4, 8, 12, 16, 20 (page padding), 24 (card padding), 32, 40, 48 (between major sections), then 64 and 80 for floors.

**Sizes:** touch target 44px, control 40px, small control 32px, large control 48px, address field 48px, icons 16 or 18px.

**Radius:** 12px controls (inputs, segments), 16px surfaces (cards, masthead, stage), 999px pill (buttons, chips, badges).

- **Nested radius:** when a shape sits inside another with a gap under 32px, inner radius = outer radius minus the gap (only if the result is above 2).
- Borders are 1px, all the way round or not at all. Never on one side of a card.

**Horizontal inset:** `clamp(24px, 4vw, 48px)`, used by the masthead and every stage panel, so everything sits on one left line and one right line.

## 5. Layout

**Shell:** max 1440px, centred, padding 16 / 20 / 24 at phone / 640 / 1024, gap 12 / 16 / 24. Desktop is a console (`height: 100dvh`, no page scroll); below 700px tall or 640px wide it becomes a document and scrolls. Clipping a verdict is worse than scrolling to it.

**Masthead (a card):** Newton logo (`public/newton-logo.svg`, 18px tall, goes home on click), then a black pill lockup with the demo name in uppercase eyebrow type. On the right a status pill: pulsing dot plus "Sepolia". The status pill turns caution colour when data is stale and says how old.

**Stage:** one element that changes state. At rest it holds the console; while checking, the console with a running button; at the end, the verdict. It never swaps to a new screen or drops in like a modal.

**Console:** two columns from 1024px, one below. Left: the active policy card (name, one plain paragraph on what it checks and who enforces it, the rules, the data source with version or commit and licence). Right: the transfer (labelled field, sample picks as a segmented control, a hint line, the primary action). Headings on both columns share one fixed-height row so they line up.

**Verdict panel (max 36–40rem, centred):**

```
headline (outcome tone)
reason (lead, 44ch)
[what matched: chips, only for real matches]
[signed verdicts and attestation links]
──── rule ────  [stale notice] · New check
party (full address, Copy) · Decided (timestamp)
```

Nothing sits above the headline. Detail never rearranges the verdict. The address is shown whole, never truncated, because people screenshot this panel as the record.

**Breakpoints:** 640 / 768 / 1024 (Tailwind). Below 640 the shell becomes a document, segments wrap into rows, parties stack, buttons go full width.

## 6. Components

- **Primary button:** pill, ink fill, white `ui` text, 44px tall. Disabled is the sunken fill with disabled text, never a grey slab. While a check runs it stays dark with a light sweep band, and says what is happening ("Operators are checking the transfer…").
- **Outline button:** pill, 1px hairline, ink text, hover to sunken fill.
- **Field:** visible label above (not just a placeholder), white fill, 1px disabled-grey border, 12px radius, mono text. Truncated to `0x1234…5678` at rest, whole on focus. Error: deny-colour border and an inline message.
- **Segmented picks (radio group):** sunken track with 4px padding; selected option is a white raised pill with `0 1px 2px` ink at 14%. Arrow keys move, only the selected option is tabbable.
- **Tag (a fact):** soft wash, no border, caption type. **Button (an action):** bordered or filled. They must never look the same.
- **Icons:** Phosphor. Never Material.

## 7. States

Every interactive element ships with all of these:

- **Hover:** background shift (sunken) or ink to ink hover.
- **Active:** a slightly darker press fill.
- **Focus:** `2px solid` ink ring, 2px offset, on every interactive element. Neutral, never a tone colour.
- **Loading:** the sweep band or a skeleton shaped like the real content. No spinners on the main action.
- **Empty:** nothing prefilled. A demo that arrives with an address in the box invites pressing the button without reading.
- **Error:** inline, specific, says what failed and what to do. Never `alert()`. Gateway and server details go to the server log, never to the visitor.
- **Stale input:** if the visitor edits the field after a verdict, dim the verdict and say "Recipient changed · run again".

## 8. Motion

Curve `--ease-newton: cubic-bezier(0.22, 1, 0.36, 1)`. Interaction 300ms, emphasis 600ms, stagger 60ms. Never a browser default curve.

| Effect | Spec |
|---|---|
| Verdict wash | `clip-path: inset(0 100% 0 0)` to `inset(0)`, 0.66s. Clipped, never scaled |
| Headline reveal | Same clip, 0.6s, 0.16s behind the wash |
| Sequence | Reason, chips, rows, parties rise 6px and fade in reading order, 0.34s to 0.7s delays |
| Console rise | 6px rise and fade, 0.34s |
| Sweep | Light band across a loading surface, 2.6s loop |
| Pulse | Status dot opacity 1 to 0.3 to 1, 1.8s |

Animate only `transform`, `opacity` and `clip-path`. `prefers-reduced-motion: reduce` turns all of it off and clears `clip-path` explicitly, or a cancelled clip leaves the element hidden. For videos and GIFs of a demo, use the `newton-demo-motion` skill.

## 9. Copy

- **"Newton Protocol" or "the Newton testnet". Never "Newton's".** Name Newton prominently; the demo exists to show what it does.
- Split the check from the enforcement: a policy is a rule plus data that anyone can author; Newton Protocol operators run it and sign the result. A data limitation is the policy's, not Newton's.
- Plain words, short sentences, sentence case. No em dashes. No hyphens joining words where a rewrite works. No jargon the visitor has to look up.
- Name the data source with its version or commit and licence, in the policy card.
- Only report matches that happened. No "no match on X" rows filling a gap with defaults.
- A timestamp on every verdict. "Was this clean" is not answerable; only "was it clean then".
- Fail-closed states are framed as the system working: "The policy treats that as a denial rather than guessing."
- Say where signing happens: Ethereum Sepolia.
- No numerals on panels ("01", "02") unless order is enforced.

## 10. Demo library and case study pages

These are the closest the demos get to marketing, and still not landing pages.

- One primary action per demo card: open the demo. Case study pages link to the demo and its attestations.
- Each card: demo name, one sentence on what it checks, the data source, a status (Live, or WIP as for Pool Guard), and a still or an 800×500 loop from `newton-demo-motion`.
- Only list published demos.
- Case studies go on the newt.foundation blog; the library links to them.

## 11. Ship checklist

- [ ] `<title>`, meta description, `og:image` and Twitter card (the demos use a `next/og` image with the demo's one message and one picture)
- [ ] Favicon
- [ ] A plain branded 404 with a way back
- [ ] Skip to content link; semantic `<main>`, `<nav>`, `<section>`
- [ ] Alt text on meaningful images; the logo is `alt="Newton"`
- [ ] No dead links; every external link opens the real attestation, explorer or source
- [ ] `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, no `X-Powered-By`
- [ ] Rate limits on any route that submits a paid task; fixed visitor-facing error text
- [ ] Phone check at 390×844 and desktop at 1440×900: nothing clipped, headings aligned, verdict readable without scrolling on desktop
- [ ] Every verdict state rendered and looked at: allowed, each deny reason, review if the demo has it, no decision, error

## 12. Quick check before handing over

- [ ] Only the tokens above; no new colours, sizes or radii
- [ ] Deny is brand red `#9F3619` on `#F8EAE4`; fail-closed is grey
- [ ] Inter plus JetBrains Mono, weights 400 and 500, no italics
- [ ] Verdict panel order kept; address whole; timestamp present
- [ ] Unreadable responses show "No decision"
- [ ] Copy: Newton Protocol, no "Newton's", no em dashes, plain words

## Credits

The states, ship checklist, nested radius and one-sided border rules adapt `landing-page-design` from [ai-design-skills](https://github.com/elayadesign/ai-design-skills) by Elaya, MIT licensed.
