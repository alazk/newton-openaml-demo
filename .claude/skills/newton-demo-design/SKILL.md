---
name: newton-demo-design
description: Visual and copy rules for building or restyling any Newton demo, the demo library, or a case study page: tokens, layout, verdict states, copy and ship checklist.
---

# Newton demo design

The system the Newton Protocol demos share (sanctions, Lazarus Scan, Pool Guard, OpenAML). It comes from the Newton Explorer token contract used in Lazarus Scan (`design/tokens.css`) and the sanctions demo's `DESIGN-SYSTEM.md`, plus a few rules borrowed from `landing-page-design` in [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT).

The demos are educational. Their job is to make one Newton Protocol decision legible: what was checked, against what data, who signed it, and what happens next. Each demo is dark and cinematic: near-black with film grain and a brand-red glow, a glass nav, a gradient hero beside a 3D visual of the real data, a tagline that lights up as you scroll, then the working console on a glass panel. Conversion patterns (free trials, pricing, risk reversal, testimonial walls) do not apply. The reference build is the OpenAML demo (`components/Demo.tsx`, `components/DataGlobe.tsx`, `components/CheckFlow.tsx`, the dark layer at the end of `app/globals.css`).

When a rule here conflicts with a framework default or another design skill, this file wins. When the user's explicit request conflicts with a rule, the user wins. When restyling an existing demo, read its own tokens file first; if it differs from this one, ask which wins before changing it.

## 1. Three rules the system exists to serve

1. **Never render a verdict the response did not contain.** An unreadable answer is "No decision", never "Allowed". One demo once showed green for every task because undefined fell through to the happy branch.
2. **The signed verdict decides; anything else only explains.** Lookups done after the verdict (which list matched, which tier) are labelled as unsigned. If they disagree with the verdict, the page says so instead of letting the reader reconcile it.
3. **Colour carries meaning, so it cannot also carry interaction.** Outcome tones are outcomes. Interaction is ink.

## 2. Colour

Dark theme. Near-black surfaces from the landing-page-design palette, off-white text. Backgrounds stay flat; colour light comes only from the soft glows in section 5. The one gradient on text is the hero headline, left to right `#FFFFFF` to `#9B9B9B`.

**Neutrals**

| Token | Value | Use |
|---|---|---|
| page | `#000000` | Page background |
| ink | `#F4F4F5` | Text, primary button fill, focus ring |
| ink hover | `#D4D4D8` | Hover of the white button |
| secondary | `#A1A1A6` | Body copy, labels (7.6:1) |
| tertiary | `#86868B` | Hints, metadata, captions (5.4:1) |
| disabled | `#5A5A5E` | Disabled text |
| control | `#3A3A3D` | Input borders at rest |
| hairline | `#262628` | Dividers, outline buttons |
| field | `#1A1A1C` | Segmented track, hover fills |
| raised | `#2A2A2D` | Selected segment |
| input | `#050506` | Field fill |
| glass | white at 3.5%, edge white at 9%, `backdrop-filter: blur(20px) saturate(1.2)`, inset top highlight white at 6% | Stage, cards, chips, nav |

**Outcome tones.** The wash is the light-theme colour at about 30% over black; the text is a lighter tint of the same hue so it reads on black (all clear 4.5:1 on their wash).

| Outcome | Text | Wash | Glow and edge |
|---|---|---|---|
| Pass, allowed, clear | `#62D6A8` | `rgba(11,110,79,0.28)` | `#2FBF85` |
| **Deny, blocked, not authorized (brand red)** | `#F2896B` | `rgba(159,54,25,0.30)`, the brand red `#9F3619` | `#E0552E` |
| Caution, review, stale data | `#E3B45A` | `rgba(138,94,20,0.30)` | `#E3B45A` |
| Neutral, no decision, unavailable | `#A1A1A6` | `#1A1A1C` | none |

- The brand red `#9F3619` is the base of every deny wash and every glow. Its 13° hue carries through the text tint `#F2896B` and the glow `#E0552E`. Never orange for "no".
- Input errors use the deny text colour.
- **A fail-closed denial is grey, not red.** When the policy denies because it could not screen, painting it red beside "Blocked" accuses the counterparty. Use the neutral tone, no glow, and say the system refused to guess.
- Verdict headlines glow softly in their tone (`text-shadow: 0 0 32px` at 35 to 55%); neutral states do not glow.

## 3. Type

Suisse Intl is the licensed brand face; **Inter** stands in until it is licensed for web. **JetBrains Mono** for addresses, hashes, task ids and numbers. Self host both (no Google Fonts at build time). Weights 400 and 500 only. No italics. One family plus the mono.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| hero | `clamp(3rem, 1.4rem + 5vw, 5.25rem)` (48–84) | 500 | 1.02 | -0.035em | Hero headline only, white to grey gradient text |
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

**Atmosphere:** film grain over the whole page (a fixed SVG `feTurbulence` overlay at 7% opacity, `pointer-events: none`), and soft brand-red glows behind the hero visual and the check (a radial gradient of `#9F3619` from 55% to transparent, blurred 60px, behind content and never over text). The stage carries a thin red light along its top edge (a 1px gradient line, transparent to `#E0552E` to transparent).

**Floating glass nav:** fixed 16px from the top, centred with auto margins and `width: max-content` (never `left: 50%` plus a transform, which halves the width it can lay out in and pushes the logo out on phones). Pill shape, dark glass (`rgba(14,14,16,0.6)` over `backdrop-filter: blur(16px) saturate(1.4)`), white-at-10% border, deep shadow. Contents: the white Newton logo (`public/newton-logo-white.svg`, 18px, back to top; the black `newton-logo.svg` disappears on dark), white pill lockup with the demo name in black, pulsing dot plus "Sepolia" (caution colour and the age when data is stale), and a small primary "Check a wallet" button that scrolls to the check (hidden on phones).

**Hero:** two columns from 1024px. Left: eyebrow ("A Newton Protocol demo"), gradient headline (max 680px, balanced), one lead paragraph (18px, 560px) naming the data, its size and who signs, one primary button that scrolls to the check, then a quiet proof line naming the network and the data licence. Right: the data globe over a red glow, captioned underneath; the real counts sit on the globe's floating chips. Top padding clears the nav (120px desktop, 104px below 1024).

**Data globe (the hero's 3D visual):** the demo's real dataset as a slowly turning sphere of 2,600 points on a canvas with its own projection (no 3D library). Every dot stands for the same number of records, and colours follow the real counts: the common tier dim gold, the rare blocking tiers glowing brand red, so the picture is the true shape of the data. A red scan ring sweeps the globe and the red dots flare as it passes. The globe leans toward the pointer and the glass tier chips floating around it (name and real count each) move with it in 3D (`perspective`, `translateZ`) and bob gently. The caption states the scale ("about 140 addresses each") and the counts. Pauses off screen and in background tabs; reduced motion draws one still frame. For a demo without a list dataset, pick the visual that is equally literal about its data.

**Tagline reveal:** its own section between the hero and the check, at least two lines, a benefit statement in plain words. Words start at 22% opacity and light up one at a time in reading order as the paragraph scrolls through the viewport (progress from its top at 85% of the viewport to its bottom at 55%), on a `requestAnimationFrame`-throttled scroll listener. The full sentence is the `aria-label`; the word spans are `aria-hidden`.

**Check section:** eyebrow "Try it", heading "Check a transfer", then the stage card.

**Stage:** one glass card (16px radius) that changes state: the console at rest, the running state while operators check, the verdict at the end. It never swaps to a new screen or drops in like a modal. On desktop its height is `clamp(600px, calc(100dvh - 190px), 820px)`, so after "Check a wallet" scrolls to it the whole card fits under the nav and a verdict never scrolls. On phones (or below 700px tall) it becomes part of the page; when its state changes and its top is under the nav, scroll it back into view (`scroll-margin-top: 88px`).

**Running state:** display headline "Checking the transfer", one paragraph saying what is happening (who checks, against what, that the rules run at once and are signed on Sepolia), then the check diagram at running speed. Never a percentage or a step counter: the diagram shows the order of events, not live progress.

**Check diagram:** near-black boxes (`#0E0E10`, `#2A2A2D` outline) for the transfer (short address), Newton Protocol operators (four dots), the data source with its version or commit, and the verdict signed on Sepolia, joined by hairlines with marching dashes. Pulses travel transfer to operators, out to the data and back, then to the verdict; boxes outline in white as a pulse reaches them; operator dots light in turn; pulses are white with a soft glow. SVG `animateMotion` (no JS clock), 5.2s loop in the hero, 3.2s while checking. A wide layout from 640px and a stacked one below. Every box must be true of the deployed policy.

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

- **Primary button:** white pill, black `ui` text, 44px tall (48px and 16px text in the hero, 36px in the nav). Disabled is the field fill with disabled text. While a check runs the stage switches to the running state rather than spinning the button.
- **Outline button:** pill, 1px hairline, ink text, hover to sunken fill.
- **Field:** visible label above (not just a placeholder), `#050506` fill, 1px `#3A3A3D` border, 12px radius, mono text. Truncated to `0x1234…5678` at rest, whole on focus. Error: deny-colour border and an inline message.
- **Segmented picks (radio group):** `#1A1A1C` track with 4px padding; selected option is a `#2A2A2D` raised pill with an inset top highlight. Arrow keys move, only the selected option is tabbable.
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
| `card` (cards, the stage, the hero globe) | `translateY(24px)`, `scale(0.985)`, `blur(6px)`, opacity 0 | same |
| `head` (verdict and running headlines) | `translateY(14px)`, `blur(10px)`, opacity 0 | 1s |
| `pop` (chips) | `scale(0.86)`, `blur(4px)`, opacity 0 | 0.7s |
| `left` (verdict rule rows) | `translateX(-10px)`, `blur(4px)`, opacity 0 | 0.8s |

| Where | Sequence |
|---|---|
| Hero, on load | eyebrow 0.05s, headline 0.13s, lead 0.22s, globe 0.25s, button 0.31s, proof line 0.4s |
| Check section, once 25% visible (`IntersectionObserver`) | heading, stage card 0.1s, policy card 0.24s, transfer card 0.33s |
| Verdict, on mount | headline, reason 0.12s, "Listed by" 0.24s, chips from 0.32s every 0.08s, note 0.38s, rule rows 0.46s and 0.54s, actions 0.64s, parties 0.72s |
| Running, on mount | headline, paragraph 0.12s, diagram 0.2s |

Status dot pulses (opacity 1 to 0.3, 1.8s). The globe and the check diagram are the only continuous motion.

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
- [ ] Dark theme: black page, grain, red glows, glass panels, white logo
- [ ] Deny washes and glows built on brand red `#9F3619`, deny text `#F2896B`; fail-closed is grey with no glow
- [ ] Glass nav, gradient hero, data globe, tagline reveal, blur-in entrances and the check diagram present; globe counts and diagram boxes match the real data and the deployed policy
- [ ] Inter plus JetBrains Mono, weights 400 and 500, no italics
- [ ] Verdict panel order kept; address whole; timestamp present
- [ ] Unreadable responses show "No decision"
- [ ] Copy: Newton Protocol, no "Newton's", no em dashes, plain words

## Credits

The hero, glass nav, tagline reveal, states, ship checklist, nested radius and one-sided border rules adapt `landing-page-design` from [ai-design-skills](https://github.com/elayadesign/ai-design-skills) by Elaya, MIT licensed.
