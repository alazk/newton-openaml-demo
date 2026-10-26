---
name: newton-demo-motion
description: Turn a Newton demo screen, Figma frame or screenshot into a looping animation (MP4 for X, GIFs) or animate demo library cards. Use for any request to animate a demo or make a GIF or video of it.
---

# Newton demo motion

Adapted from `design-to-motion` in [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills) (MIT), set up for the Newton Protocol demos (sanctions, Lazarus Scan, Pool Guard, OpenAML and the ones after them).

A showcase animation is not a redesign. The viewer must see **the exact design**, and must see that **it is alive**:

**exact frame, then empty state, then a smooth load, then every visual acts out its story, then a clean repeat.**

Part A rebuilds the design so the finished frame matches the source. Part B is the motion system. Part C records and exports. Work through A before B, and never encode before the checks in A7 and B9 pass. When a rule here conflicts with a framework default, this file wins. When the user's explicit request conflicts with a rule, the user wins.

Visual values (colours, type, spacing, radii) come from the `newton-demo-design` skill when it is available. Never invent them here.

**Not for** interaction motion inside a shipping demo (hover, press, the verdict wash itself). That belongs to the demo's own CSS.

## Newton rules that override everything below

1. **Everything in frame is real or labelled.** These exports go on X and the demo library, where people read them as evidence. Every verdict, address, count, list name and attestation shown must come from a real check: record a real gateway response (keep its task id) and replay it, use the demo's own sample addresses, and take counts from the source data. Never invent a verdict, a number or a match. If a frame needs a response that has not happened yet, say so and get one, or label the frame as a mockup.
2. **A verdict only ever shows what the policy would return** for that address with that client. A clean address never animates into a denial for drama.
3. **Name the network.** Signing happens on Ethereum Sepolia; the masthead badge stays in frame.
4. **Write "Newton Protocol" or "the Newton testnet", never "Newton's".** Any caption or added text follows the user's copy rules: no em dashes, plain words.
5. **Fail-closed states are the system working.** A "No decision" or "Screening unavailable" story must not be staged to look like an accusation or a fault.

## Two contexts

Decide the context first. It changes what moves, how motion starts and ends, and what you deliver.

| | **Showcase** | **Website** |
|---|---|---|
| Typical request | "Make a video of the OpenAML demo for X", a Figma link and nothing else | Building or editing the demo library or a case study page |
| What gets animated | The whole frame | Only sections with a visual part (table below) |
| Start | Page load, from the empty state | When the section scrolls into view, once |
| After the intro | Stories run, then the frame dissolves and the cycle repeats (B5) | Stories run while visible. No dissolve, no cycle |
| Text | Exact: live text when the source is the demo page itself, exported layers when the source is Figma | Live HTML in the site's font, for SEO and accessibility |
| Deliverables | The page plus MP4 for X, website GIF, 800×500 GIF (Part C) | The animated sections in the site's code. Exports only when asked |

Inside a site's codebase, assume website. With only a demo or design and no site, assume showcase. If it is still unclear, ask once.

### Website: which sections get motion

| Section | Apply |
|---|---|
| Demo library cards (text plus a screen or visual) | Card intro on scroll (B2, `card`), then a story loop on the card's visual (B4). This is the main use |
| Product or demo screenshot in a case study | The loading intro on scroll. Then **ask** whether the user also wants stories. Do not add them unasked |
| Partner logo rows | A marquee or a gentle light up |
| Text only sections (headlines, quotes, FAQ, CTA, footer) | Not this skill. Use the page's normal reveal |

- Trigger with `IntersectionObserver` at about 30% visible. Play the intro once. Never use a scroll listener.
- Pause stories off screen and resume on return.
- Stagger in reading order inside the section, never across the page.
- Use the site's components and tokens.
- `prefers-reduced-motion: reduce` shows each section in its final state with no stories.

---

# PART A: Fidelity

## A1. Intake

Gather these before building. Ask only for what is missing, in one batch.

- **Context.** Showcase or website.
- **Source.** See A2.
- **Layout.** Decide from the structure (A5): app frame (joined surfaces) or separate cards. Most demo consoles are separate cards: the masthead and the stage are two rounded cards with a gap.
- **The check to show.** Which address, which outcome, and the real response it comes from (Newton rule 1).
- **Visuals.** Which parts act out a story after load (B4). Assume every field, verdict, rule row, chart, path, map and status dot.
- **Deliverables.** Showcase: all three exports. Website: the sections in code.
- **Camera.** No zoom and no pan (B7).

If the user cannot answer, make a reasonable assumption, state it in one line, and continue. On the first piece of a session, show the live page before recording, so the direction can be corrected cheaply.

## A2. Source of truth

In order of preference:

1. **The live demo page.** The demo's HTML is the design, so fidelity is exact by construction. Add a `?capture` mode (A6) to a local copy of the demo, or build a showcase page that renders the demo's own components with a recorded real response. Fonts, kerning and tokens are already right; do not rebuild anything.
2. **A Figma frame.** Use the REST API with a personal access token.
   - Read the token from an environment variable or the OS keychain. Never print it, paste it into chat, or commit it.
   - `GET /v1/files/:key/nodes?ids=:node&geometry=paths` gives the tree, bounds, fills, effects and radii.
   - `GET /v1/images/:key?ids=:node&format=png&scale=2` renders the **reference frame** the finished still must match (A7).
   - Every layer position is `absolute bounds − frame origin`.
   - The image CDN sometimes resets connections. Retry every download and check each PNG's size.
3. **A flat screenshot.** The image is the reference. Rebuild what you can isolate, and tell the user plainly which parts cannot be separated before you animate them. Never animate a screenshot as one block. If the screen is from a demo whose code exists, prefer source 1.

## A3. Layer export (Figma sources)

Export every element that will move as its own PNG at **3x** through `/v1/images`, 20 to 25 ids per call.

| Case | Placement |
|---|---|
| PNG size equals `absoluteRenderBounds` (text always does) | Place at the render bounds |
| PNG larger than the render bounds, even overhang | `x = bbox.x − (pngW − bbox.w) / 2`; use `renderBounds.y` when the top was not clipped |
| Uneven overhang (arrowheads, one square cap) | Use the bounds of `strokeGeometry` or `fillGeometry` from `geometry=paths` |
| Rotated vectors with a large layer blur | `use_absolute_bounds=true`, place at the bounding box |
| Zero height or zero width strokes | Export without `use_absolute_bounds` (it returns null) |
| Arcs, donuts, partial ellipses | `use_absolute_bounds=true` |
| Patterns larger than their surface | `use_absolute_bounds=true`, then crop to the surface |
| Instance children (`I12:34;56:78`) | Often null. Export the parent instance |
| Lines that should draw on | Figma outlines strokes, so write the centerline yourself and use it as a mask over the PNG (below) |

Rules that keep the frame exact:

- **In a Figma showcase, text stays an exported layer.** Never retype it. (With source 1 it is already live and exact.)
- **Keep Figma's z order.**
- **Frame strokes draw above children.** Render a card's stroke as an overlay above its clipped content.
- **Containers whose children move on their own** are rebuilt in CSS from the node data (fills, radii, inside strokes, effects); export each child separately.
- **Shadows.** A Figma drop shadow with blur `R` is a CSS `box-shadow` blur `R` on one element, or `filter: drop-shadow()` blur about `R / 2` on a group. A shadow on a group of joined surfaces is the shadow of the union: put the surfaces in one static container with `drop-shadow()`.
- Skip hidden layers and layers buried under opaque shapes.

**Drawing a line on.** Read corner points and arc radii from `strokeGeometry`; the centerline sits halfway across the stroke.

```html
<svg class="ly" viewBox="0 0 1440 990" style="left:0;top:0;width:1440px;height:990px">
  <mask id="draw1">
    <path d="M193 832 V700 A45 45 0 0 1 238 655 H380" fill="none" stroke="#fff" stroke-width="8"
          pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
  </mask>
  <image href="data:image/png;base64,..." x="192" y="653" width="190" height="181" mask="url(#draw1)"/>
</svg>
```

Animate `stroke-dashoffset` from 1 to 0 on the JS clock. For pulses travelling along it (hop paths, operator pulses), read positions with `getPointAtLength` on the same path.

## A4. Background

The demos sit on flat surfaces: white `#FFFFFF` or bone `#FBFCFE`. When a design sits on a photo or texture instead, the background is part of the design:

- It never moves, blurs, scales, fades or recolours, in any phase or variant.
- Export the original image fill (`GET /v1/files/:key/images`) and apply its transform as CSS. Verify the background region above 45 dB PSNR.
- A `backdrop-filter` surface is a sibling above the background, never inside an ancestor with `filter` or opacity below 1. Headless Chrome needs `transform: translateZ(0)` and a `z-index` on it.
- If you cannot reproduce it, say so before building. Never swap in a flat colour silently.

## A5. Layout: app frame or separate cards

**App frame (joined surfaces).** A screen built from surfaces joined into one unit (a sidebar and a body). The surfaces exist in the empty state, opaque and still; only their contents load. Keep the source's stacking where they meet.

**Separate cards.** Cards with gaps between them, which is how the demo consoles are built (masthead card, stage card, policy card). The cards themselves rise in (`card` kind, B2), staggered in reading order, contents following. The empty state is the background alone.

**Both:** each container clips its own contents to its exact shape, including per corner radii. Nothing overflows onto a neighbour.

```html
<div class="clip" style="left:113px;top:138px;width:305px;height:907px;border-radius:16px">
  <div class="cin" style="left:-113px;top:-138px"><!-- units in stage coordinates --></div>
</div>
```

```css
.clip { position: absolute; overflow: hidden; isolation: isolate; }
.cin  { position: absolute; width: var(--stage-w); height: var(--stage-h); }
```

## A6. Page architecture (showcase)

- One self contained HTML file (or a `?capture` mode on a local copy of the demo): a fixed size stage at the frame's exact size, scaled to fit the viewport. Images inline as base64, deduplicated. Wait for decode on `<img>` elements and for `document.fonts.ready`.
- **Modes:** `?still` renders the exact final frame with no motion (also used for reduced motion). `?loop` repeats the cycle like the exports. `?capture` turns off `requestAnimationFrame` and exposes `window.__start()`, `window.__tick(dt)` and the loop time `window.__lt` (C1).
- **Network is off in capture.** The page replays the recorded real response from a fixture. It never calls the gateway during recording.
- **Units.** Every animated element is wrapped in a full stage layer `.u` carrying its delay `--d`. The intro is CSS transitions keyed on `.stage.in`. Percentages in `clip-path` or `transform-origin` on a unit refer to the stage, so use pixel values.
- **Static layers stay composited** (`transform: translateZ(0)`) so their edges do not flicker when transitions start.
- **One JS clock** drives everything time based, from loop time, never wall clock. In `?capture` it advances only through `__tick`.

## A7. Verify the still

Render `?still` at 2x and compare it with the reference before any motion work. With source 1 the reference is a screenshot of the real demo in the same state.

- PSNR overall and per container after a light blur (`gblur sigma≈1.2`). Aim above 35 dB overall, above 30 dB per container. Retest text heavy containers at `sigma≈2.5` if low.
- Look at a blurred, amplified difference image for structural errors.
- Do not chase sub pixel offsets. Fix structure, not antialiasing.

---

# PART B: Motion system

Every timing, distance and curve comes from **Make it yours** at the end. Never invent values.

## B1. Start empty

The first frame of every load and every export is the empty state. App frame: background plus static surfaces. Separate cards: the background alone.

## B2. Loading choreography

Elements rise from below and resolve from blur to sharp, staggered.

| Kind | Use for | From |
|---|---|---|
| `card` | Separate cards as a whole, with their shadow | `translateY(24px)`, `scale(0.985)`, `blur(6px)`, opacity 0 |
| `up` | Text, headers, values, rows | `translateY(10px)`, `blur(4px)`, opacity 0 |
| `down` | Mastheads, top bars | `translateY(-8px)`, `blur(4px)` |
| `left` | List rows, labels | `translateX(-10px)`, `blur(4px)` |
| `pop` | Icons, pills, badges, status dots, buttons | `scale(0.82–0.88)` from its own center, `blur(4px)` |
| `photo` | Images | skeleton shimmer, then `blur(14px) saturate(0.6)` to sharp |
| `wipe` | Bars, fills, verdict washes | Left to right `clip-path` in pixels on the stage unit: right inset from `stageW − x` to `stageW − (x + w)`, top and bottom fixed at `y` and `stageH − (y + h)` |
| `line` / `grow` | Rules, ticks, hop rails | `scaleX(0)` / `scaleY(0)` from the start edge |
| `donut` | Rings, coverage discs | conic mask sweeping clockwise from 12 o'clock |
| `tray` / `rise` | Sheets, panels | slide up 40px inside the container, clipped by it |
| `fade` | Layers under another layer | opacity only |

- **Order.** Containers 80 to 90ms apart in reading order (masthead, then policy card, then transfer card); each card about 0.15s before its contents. Inside a container: header, labels, values, visuals. Items in a group 30 to 80ms apart.
- **Never `scale(0)` an object.** Only lines and bars grow from zero.
- **Covered layers arrive last and leave first.**
- **Skeletons match the real shape** and sit 1px inside it.
- Total intro about 2 to 2.5 seconds.

## B3. Bars fill like progress

Data bars, meters and highlights fill with a left to right `clip-path` wipe on `--io`, 0.7 to 1.1s. Never add loading lines or any shape that is not in the design.

## B4. Story loops (the main act)

After the intro, every visual acts out what it does, on a loop. A frame that loads and then sits there is not finished. **Write the story first**: one sentence per visual before building.

**Newton demo stories:**

| Visual | Story |
|---|---|
| A whole demo check (the default showcase) | A sample pick fills the recipient, the field shows the address, the Check button presses, the running state sweeps across it, then the verdict panel takes the stage: the wash floods left to right, the headline is uncovered behind it, reason, chips and rule rows rise in reading order, the attestation link lands last |
| Recipient field | The address types in glyph by glyph (exported layer) or appears from a sample pick, then truncates to `0x1234…5678` on blur, as the demo does |
| Running check | The sweep band crosses the dark button; the Sepolia dot pulses |
| Verdict panel | Wash, headline, reason, chips, rule rows, parties, in that order. Ends exactly on the real verdict |
| Rule rows (block / review) | Allow and Deny pills pop one after another, the attestation link underlines |
| Hop path, exposure route | Pulses travel from the wallet toward the listed address, each hop lights as a pulse passes |
| Coverage map, disc | The reach ring sweeps clockwise again, nodes light in turn |
| Register or sheet (Pool Guard) | A highlight steps down the rows, the matching row lights, a pulse carries the verdict to the hook |
| Counts ("364,503 addresses") | Count up to the exact real figure, landing on the design text |

**General stories:**

| Visual | Story |
|---|---|
| Stack of items | A new item lands on top with a blur, the others step back one slot, the last leaves |
| Line or area chart | A scrubber glides across, dots ride the curve, the tooltip value counts |
| Bar chart, grid | Bars breathe like a live feed and settle back to the design heights |
| Table, list | A soft highlight steps down the rows, or a cursor inspects them one by one |
| Flow, connectors | Pulses travel along connectors in the flow direction; nodes light as a pulse passes; dashed lines march |
| Prompt, form | The input deletes and retypes, then the result appears with a blur |
| Logo row | A marquee moving exactly one full set per loop |

**Rules for stories**

- **Start and end on the exact design.** At rest the frame equals `?still`.
- **Use the design's own elements.** Helpers a story needs (a cursor, extra pulses) match the design's style and are hidden in `?still`.
- **Text changes only when it is the point:** typing, counters, tooltip values.
  - **Typing** reveals glyph by glyph, one glyph every 45 to 70ms, with a caret that blinks once a second while idle. For an exported text layer, find glyph boundaries from the empty alpha columns of the PNG.
  - **Counters** use live text in the design's font and land on the exact real figure.
- **Obvious, not busy.** A clear action every one to two seconds per card. If a viewer cannot tell it is animated within two seconds, make more movement.
- **Readable at 800×500.** Anything under about 4px there (a pulse dot, a thin rail) gets enlarged within the design's style, a halo, or a bigger story.
- **Offset the cards** so attention travels in reading order. One story per card, 3 to 8 seconds; a short one may repeat within a cycle. Every run ends at rest before the dissolve.
- Stories are eased keyframe tracks on the JS clock:

```js
// [[time, value], ...] eased per segment; values may be numbers or arrays
function track(keys, t, ease = easeInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = ease(Math.min(1, (t - t0) / (t1 - t0 || 1)));
      return Array.isArray(v0) ? v0.map((v, j) => v + (v1[j] - v) * k) : v0 + (v1 - v0) * k;
    }
  }
  return keys[keys.length - 1][1];
}
```

**Accents** sit on top of stories, never instead of them:

| Accent | Use for | Values |
|---|---|---|
| Pulse ring | Status dots (the Sepolia badge), live indicators | 1.8–2.2s period, ring scale 1 to 2.6, opacity 0.55 to 0 |
| Gentle bob | Floating objects | ±2.6px, 2.8s sine |
| Sheen sweep | Dark buttons, bars | Band 38% of the width, peak 34% white, 1.5s pass every 3.4s. Invisible on light grey; use a refill story there |
| Skeleton glimmer | Placeholders | 2.4s shimmer |

Stories and accents start when the intro lands (about 2.4s). Accents and helpers fade in over 0.6s.

## B5. The loop cycle (showcase)

| Phase | Default timing |
|---|---|
| Build in | 0 to 2.4s |
| Stories | 2.4 to 11.0s |
| Dissolve | 11.0 to 11.6s (opacity 0.5s) |
| Empty beat | 11.6 to 12.0s |

- The story phase holds at least one full story of every card. A full demo check usually needs a longer cycle (about 14 to 16s): lengthen it rather than cutting the verdict short. Hold the verdict at rest for at least 2.5s so it can be read.
- Dissolve back to the empty state. App frame: only contents dissolve. Separate cards: the cards dissolve too. The background never does.
- **Reset everything**, including every JS driven value (masks, typed text, pulses, the replayed response state), so the end of a cycle equals its start.

## B6. Easing and duration

| Token | Curve | Use |
|---|---|---|
| `--e` | `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-newton`) | Transforms on entrance (1.05s) |
| `--e2` | `cubic-bezier(0.33, 1, 0.68, 1)` | Opacity and blur (0.7–0.8s) |
| `--io` | `cubic-bezier(0.65, 0, 0.35, 1)` | Wipes, fills, sweeps |
| linear | `linear` | Constant motion only (shimmer, marquee) |

Showcase timing is slower than the demo's own 300ms interactions on purpose. The verdict wash keeps the demo's own timing (0.66s clip on `--ease-newton`, headline uncovered 0.16s behind it) so the video matches the product.

## B7. Camera

No zoom and no pan unless asked. When asked: only the frame scales, moves use `--io`, and it returns to rest before the dissolve.

## B8. Performance and accessibility

- Animate `transform`, `opacity`, `filter` and `clip-path` only.
- Animated blur 14px or less.
- `prefers-reduced-motion: reduce` renders the still frame.

## B9. Motion checks

Run on the recorded frames before encoding.

- **Overflow check.** Render a mask of every container's exact shape (radii included, plus shadow area) on black, grow it 2px, and compare only black pixels. App frame: every pixel outside the surfaces is identical to the empty first frame in every frame. Separate cards: during the story phase, every pixel outside the cards is identical to `?still`.
- **Seam check.** The first frame of the export window equals the frame one cycle later.
- **Empty beat check.** Every empty beat frame equals the frame before `__start`.
- **Rest check.** The last frame before the dissolve equals `?still`.
- **Truth check.** The verdict, address, counts and attestation id in the rest frame match the recorded real response (Newton rule 1).
- **Contact sheet.** Tile frames at key moments (empty, mid intro, landed, several story points, mid dissolve, end) and look for overflow, ghosting, pops and timid stories.

---

# PART C: Recording and export

## C1. Deterministic capture

Never screen record in real time. Step a fake clock and screenshot every frame (Playwright):

```js
await page.clock.install({ time: 0 });
await page.goto(url + '?capture', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.clock.pauseAt(10000);
const loopTime = [];
for (let i = 0; i < frames; i++) {
  // 1. whole milliseconds that average exactly 1000/60 (17, 17, 16, ...)
  const dt = Math.round((i + 1) * 1000 / 60) - Math.round(i * 1000 / 60);
  await page.clock.runFor(dt);
  loopTime.push(await page.evaluate(([i, PRE, dt]) => {
    if (i === PRE) window.__start();          // 2. start inside the same evaluate as the seek
    if (i >= PRE) window.__tick(dt / 1000);   // 3. the page clock advances here, never through rAF
    const now = performance.now();
    for (const a of document.getAnimations()) {
      a.__m ??= window.__mark;
      a.pause(); a.currentTime = Math.max(0, now - a.__m);
    }
    return i >= PRE ? window.__lt : 0;
  }, [i, PRE, dt]));
  await page.screenshot({ path: `${out}/${String(i).padStart(5, '0')}.png` });
}
```

On the page, in `?capture`:

- `__start()` adds the `in` class. Every change of the stage's state classes sets `window.__mark = performance.now()`, so each transition is seeked from when it was created.
- `__tick(dt)` advances loop time, runs the cycle phases, draws every story and accent, and sets `window.__lt`.
- Endless loops (shimmer, marquee, pulses) run on the JS clock, not infinite CSS keyframes. This includes the demo's own `.pe-pulse` and `.pe-sweep`: drive them from the clock in capture mode.

`PRE` is about 15 frames before the start. Viewport is the frame size; `deviceScaleFactor = min(1920 / W, 1200 / H)`. The export window starts at frame `PRE − 1` and spans `cycle × 60` frames; record 10 more for the seam check.

## C2. Formats

| File | Spec |
|---|---|
| `<demo>-x.mp4` | H.264, `yuv420p`, 60fps, CRF 14–15, `+faststart`, max 1920×1200, even dimensions. `-preset veryfast` by default, `slow` when the user asks for best quality |
| `<demo>-loop.gif` | 960px wide, 15–20fps, about 2 to 3MB, for case study pages |
| `<demo>-800x500.gif` | Always delivered; sized for demo library cards. Crop to the content with about 40px margin at exactly 1.6:1 when the frame has wide empty borders; otherwise fit and pad with the page background (`#FFFFFF`, or `#FBFCFE` for bone pages). 20fps, 12fps if heavy |

```bash
ffmpeg -start_number $A -framerate 60 -i frames/%05d.png -frames:v $N \
  -vf "crop=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset veryfast -crf 15 \
  -pix_fmt yuv420p -movflags +faststart demo-x.mp4

ffmpeg -start_number $A -framerate 60 -i frames/%05d.png -filter_complex \
  "trim=end_frame=$N,fps=20,scale=960:-2:flags=lanczos,split[a][b];\
   [a]palettegen=max_colors=192:stats_mode=diff[p];\
   [b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" -loop 0 demo-loop.gif
```

For the 800×500 GIF, add `scale=800:500:force_original_aspect_ratio=decrease,pad=800:500:(ow-iw)/2:(oh-ih)/2:color=<page bg>` before `split`. If a GIF is too heavy, lower the frame rate or colours before the size.

---

# Output format

Before building, state in a few lines:

1. **Context:** showcase or website (and for a website, what each section gets)
2. **Source:** live demo page, Figma, or screenshot, and the real check being shown (address, outcome, task id)
3. **Layout:** app frame or separate cards, and the clip shapes
4. **Choreography:** load order and the kind per element group
5. **Stories:** one sentence per visual, plus accents
6. **Cycle:** total length and phases

After building, report:

- Still fidelity (overall and worst container PSNR)
- Overflow, seam, rest and truth check results
- The three files with size, dimensions, frame rate and duration
- Anything not reproduced exactly, named plainly

---

# Make it yours

| Value | Default |
|---|---|
| Rise distance | 10px (`up`), 8px (`down`), 10px (`left`) |
| Entrance blur | 4px, photos 14px |
| Pop start scale | 0.82–0.88 |
| Transform | 1.05s on `cubic-bezier(0.22, 1, 0.36, 1)` |
| Opacity and blur | 0.7–0.8s on `cubic-bezier(0.33, 1, 0.68, 1)` |
| Wipe | 0.7s, slow bars 1.1s, on `cubic-bezier(0.65, 0, 0.35, 1)` |
| Verdict wash | 0.66s clip on `--ease-newton`, headline 0.6s with 0.16s delay |
| Card rise | 24px, `scale(0.985)`, `blur(6px)`, 0.9s transform, 0.6s opacity |
| Container stagger | 80–90ms |
| Item stagger | 30–80ms (the demos use 60ms) |
| Typing | one glyph every 45–70ms, caret blink 1s |
| Story start | 2.4s |
| Verdict hold | at least 2.5s at rest |
| Cycle | 12s, about 14–16s for a full demo check |
| Page background | `#FFFFFF`, bone `#FBFCFE` |
| MP4 | 60fps, CRF 15, max 1920×1200 |
| Website GIF | 960px wide, 20fps |
| Card GIF | 800×500, 20fps |

---

# Quick checklist

**Truth**
- [ ] The check shown is a real recorded response; task id noted
- [ ] Verdict, address, counts and list names match it; nothing invented
- [ ] Sepolia badge in frame; "Newton Protocol", never "Newton's"

**Fidelity**
- [ ] Source chosen (live page first); reference frame rendered
- [ ] Z order kept, strokes above children, group shadow on the union
- [ ] Still matches the reference

**Motion**
- [ ] Starts on the empty state; rise plus blur intro in reading order
- [ ] Every visual acts out a story and ends on the exact design
- [ ] Verdict wash matches the demo's own timing; verdict held 2.5s or more
- [ ] Stories visible at 800×500, offset between cards
- [ ] No zoom or pan unless asked
- [ ] Overflow, seam, empty beat, rest and truth checks pass

**Export**
- [ ] Deterministic capture, network off, real response replayed
- [ ] `<demo>-x.mp4`, `<demo>-loop.gif`, `<demo>-800x500.gif` delivered
- [ ] No token printed or committed

---

# Credits

Adapted from `design-to-motion` in [ai-design-skills](https://github.com/elayadesign/ai-design-skills) by Elaya, MIT licensed, which itself adapts general motion rules from [emilkowalski/skills](https://github.com/emilkowalski/skills), [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) and [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles), all MIT licensed.
