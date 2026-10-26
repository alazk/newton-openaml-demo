---
name: newton-demo-design
description: Visual and copy rules for building or restyling any Newton demo, the demo library, or a case study page: tokens, layout, verdict states, copy and ship checklist.
---

# Newton demo design

The system the Newton Protocol demos share (sanctions, Lazarus Scan, Pool Guard, OpenAML). It comes from the Newton Explorer token contract used in Lazarus Scan (`design/tokens.css`) and the sanctions demo's `DESIGN-SYSTEM.md`, plus a few rules borrowed from `landing-page-design` in [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT).

The demos are educational. Their job is to make one Newton Protocol decision legible: what was checked, against what data, who signed it, and what happens next. Each demo opens like a polished landing page (glass nav, gradient hero, an animated diagram, a tagline that lights up as you scroll) and then hands over to the working console. Conversion patterns (free trials, pricing, risk reversal, testimonial walls) do not apply. The reference build is the OpenAML demo (`components/Demo.tsx`, `components/CheckFlow.tsx`).

When a rule here conflicts with a framework default or another design skill, this file wins. When the user's explicit request conflicts with a rule, the user wins. When restyling an existing demo, read its own tokens file first; if it differs from this one, ask which wins before changing it.

## 1. Three rules the system exists to serve

1. **Never render a verdict the response did not contain.** An unreadable answer is "No decision", never "Allowed". One demo once showed green for every task because undefined fell through to the happy branch.
2. **The signed verdict decides; anything else only explains.** Lookups done after the verdict (which list matched, which tier) are labelled as unsigned. If they disagree with the verdict, the page says so instead of letting the reader reconcile it.
3. **Colour carries meaning, so it cannot also carry interaction.** Outcome tones are outcomes. Interaction is ink.

## 2. Colour

Flat colours only. No background gradients. The one gradient is on the hero headline text: left to right `#0E0E0F` to `#6B6B6C`, clipped to the text.

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
| frame outline | `1px solid` ink at 14% | Cards and the stage |

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
| hero | `clamp(2.75rem, 1.5rem + 4.2vw, 4.5rem)` (44–72) | 500 | 1.02 | -0.035em | Hero headline only, gradient text |
| tagline | `clamp(2rem, 1.1rem + 2.8vw, 3.25rem)` (32–52) | 500 | 1.14 | -0.025em | The tagline reveal section |
| display | `clamp(1.5rem, 1.2rem + 1.5vw, 1.75rem)` (24–28) | 500 | 1.15 | -0.015em | Verdict and running-state headline |
| title | `clamp(1.125rem, 1rem + 0.6vw, 1.25rem)` (18–20) | 500 | 1.2 | -0.01em | Page title |
| heading | 18px | 500 | 1.25 | -0.01em | Card heading |
| lead | 16px | 400 | 1.45 | 0 | Verdict reason, intro body |
| body | 14px | 400 | 1.45 | 0 | Default body |
| ui | 14px | 500 | 1.4 | 0 | Buttons, labels, row titles |
| caption | 12px | 400 | 1.4 | 0 | Metadata, hints |
| eyebrow | 12px | 500 | 1.4 | 0.08em uppercase | Section labels, nav lockup |
| data | 14px mono | 400 | 1.45 | 0 | Addresses, hashes |

- Labels are sentence case at 14px. Uppercase tracking only in the nav lockup and eyebrows.
- A timestamp is set in sans, not mono, so it does not compete with addresses.
- `text-wrap: balance` on headings, `text-wrap: pretty` on body, so no single word sits alone on a last line.
- Cap measure: 44ch for the verdict reason, 64ch for detail text.

## 4. Space, size, radius

**Space** (nothing in between): 4, 8, 12, 16, 20 (page padding), 24 (card padding), 32, 40, 48 (between major sections), then 64 and 80 for floors.

**Sizes:** touch target 44px, control 40px, small control 32px, large control 48px, address field 48px, icons 16 or 18px.

**Radius:** 12px controls (inputs, segments), 16px surfaces (cards, stage), 999px pill (nav, buttons, chips, badges).

- **Nested radius:** when a shape sits inside another with a gap under 32px, inner radius = outer radius minus the gap (only if the result is above 2).
- Borders are 1px, all the way round or not at all. Never on one side of a card.

**Horizontal inset:** `clamp(24px, 4vw, 48px)` inside every stage panel (console, running, verdict), so their contents share one left line and one right line.

## 5. Layout

**Page, top to bottom:** floating nav, hero, tagline, the check section, footer. Sections sit in a 1440px column with `clamp(16px, 4vw, 48px)` side padding.

**Floating glass nav:** fixed 16px from the top, centred with auto margins and `width: max-content` (never `left: 50%` plus a transform, which halves the width it can lay out in and pushes the logo out on phones). Pill shape, white at 72% over `backdrop-filter: blur(16px) saturate(1.4)`, 1px ink-at-10% border, soft shadow. Contents: Newton logo (`public/newton-logo.svg`, 18px, back to top), black pill lockup with the demo name, pulsing dot plus "Sepolia" (caution colour and the age when data is stale), and a small primary "Check a wallet" button that scrolls to the check (hidden on phones).

**Hero:** two columns from 1024px. Left: eyebrow ("A Newton Protocol demo"), gradient headline (max 680px, balanced), one lead paragraph (18px, 560px) naming the data, its size and who signs, one primary button that scrolls to the check, then the real tier or list counts as tone-coloured chips. Right: a bone card with an eyebrow ("What happens on every check") and the animated check diagram, captioned underneath. Top padding clears the nav (120px desktop, 104px below 1024).

**Tagline reveal:** its own section between the hero and the check, at least two lines, a benefit statement in plain words. Words start at 22% opacity and light up one at a time in reading order as the paragraph scrolls through the viewport (progress from its top at 85% of the viewport to its bottom at 55%), on a `requestAnimationFrame`-throttled scroll listener. The full sentence is the `aria-label`; the word spans are `aria-hidden`.

**Check section:** eyebrow "Try it", heading "Check a transfer", then the stage card.

**Stage:** one bordered card (16px radius) that changes state: the console at rest, the running state while operators check, the verdict at the end. It never swaps to a new screen or drops in like a modal. On desktop its height is `clamp(600px, calc(100dvh - 190px), 820px)`, so after "Check a wallet" scrolls to it the whole card fits under the nav and a verdict never scrolls. On phones (or below 700px tall) it becomes part of the page; when its state changes and its top is under the nav, scroll it back into view (`scroll-margin-top: 88px`).

**Running state:** display headline "Checking the transfer", one paragraph saying what is happening (who checks, against what, that the rules run at once and are signed on Sepolia), then the check diagram at running speed. Never a percentage or a step counter: the diagram shows the order of events, not live progress.

**Check diagram:** boxes for the transfer (short address), Newton Protocol operators (four dots), the data source with its version or commit, and the verdict signed on Sepolia, joined by hairlines with marching dashes. Pulses travel transfer to operators, out to the data and back, then to the verdict; boxes outline in ink as a pulse reaches them; operator dots light in turn. SVG `animateMotion` (no JS clock), 5.2s loop in the hero, 3.2s while checking. A wide layout from 640px and a stacked one below. Every box must be true of the deployed policy.

**Footer:** one line of caption type above a hairline: the network, the data source with commit and licence, and the repo.

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

**Breakpoints:** 640 / 768 / 1024 (Tailwind). Below 1024 the hero and console stack. Below 640 the stage becomes part of the page, the nav drops its button, the diagram switches to its stacked layout, segments wrap into rows, parties stack, buttons go full width.

## 6. Components

- **Primary button:** pill, ink fill, white `ui` text, 44px tall (48px and 16px text in the hero, 36px in the nav). Disabled is the sunken fill with disabled text, never a grey slab. While a check runs it stays dark with a light sweep band, and says what is happening ("Operators are checking the transfer…").
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

Curve `--ease-newton: cubic-bezier(0.22, 1, 0.36, 1)` for transforms, `cubic-bezier(0.33, 1, 0.68, 1)` for opacity and blur. Interaction 300ms. Never a browser default curve. Everything enters by rising from below and resolving from blur to sharp, staggered in reading order (the `newton-demo-motion` choreography, live on the page).

| Kind | From | Duration |
|---|---|---|
| `up` (text, rows, buttons) | `translateY(10px)`, `blur(4px)`, opacity 0 | 1.05s transform, 0.75s opacity and blur |
| `card` (cards, the stage, the hero diagram) | `translateY(24px)`, `scale(0.985)`, `blur(6px)`, opacity 0 | same |
| `head` (verdict and running headlines) | `translateY(14px)`, `blur(10px)`, opacity 0 | 1s |
| `pop` (chips) | `scale(0.86)`, `blur(4px)`, opacity 0 | 0.7s |
| `left` (verdict rule rows) | `translateX(-10px)`, `blur(4px)`, opacity 0 | 0.8s |

| Where | Sequence |
|---|---|
| Hero, on load | eyebrow 0.05s, headline 0.13s, lead 0.22s, button 0.31s, diagram card 0.3s, chips 0.4s |
| Check section, once 25% visible (`IntersectionObserver`) | heading, stage card 0.1s, policy card 0.24s, transfer card 0.33s |
| Verdict, on mount | headline, reason 0.12s, "Listed by" 0.24s, chips from 0.32s every 0.08s, note 0.38s, rule rows 0.46s and 0.54s, actions 0.64s, parties 0.72s |
| Running, on mount | headline, paragraph 0.12s, diagram 0.2s |

Status dot pulses (opacity 1 to 0.3, 1.8s); the primary button carries a light sweep band while busy.

Animate only `transform`, `opacity`, `filter` and `clip-path`; animated blur stays at 10px or less. `prefers-reduced-motion: reduce` shows every element in its final state from the first frame, lights every tagline word, pauses the diagram (`svg.pauseAnimations()`), and uses instant scrolling. For videos and GIFs of a demo, use the `newton-demo-motion` skill.

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
- [ ] Phone check at 390×844 and desktop at 1440×900: nothing clipped, headings aligned, nav logo visible on phones, verdict readable without scrolling on desktop
- [ ] Frames captured mid-animation (hero entering, tagline half lit, running, verdict landing) and with reduced motion
- [ ] Every verdict state rendered and looked at: allowed, each deny reason, review if the demo has it, no decision, error

## 12. Quick check before handing over

- [ ] Only the tokens above; no new colours, sizes or radii
- [ ] Deny is brand red `#9F3619` on `#F8EAE4`; fail-closed is grey
- [ ] Glass nav, gradient hero, tagline reveal, blur-in entrances and the check diagram present; the diagram matches the deployed policy
- [ ] Inter plus JetBrains Mono, weights 400 and 500, no italics
- [ ] Verdict panel order kept; address whole; timestamp present
- [ ] Unreadable responses show "No decision"
- [ ] Copy: Newton Protocol, no "Newton's", no em dashes, plain words

## Credits

The hero, glass nav, tagline reveal, states, ship checklist, nested radius and one-sided border rules adapt `landing-page-design` from [ai-design-skills](https://github.com/elayadesign/ai-design-skills) by Elaya, MIT licensed.
