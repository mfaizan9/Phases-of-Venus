# Conversion Notes — Phases of Venus

## Behavior model (one paragraph)

The simulation is a top-down "God's-eye" view of the inner solar system: the Sun
at the centre, with Venus and Earth on circular orbits (radii 252 and
0.723 × 252 stage-px — Venus's real 0.723 AU semi-major-axis ratio). The user
drags Venus and/or Earth around their orbits (or presses **start animation** to
let them revolve at their true relative angular rates — Venus 1.626× Earth). For
the current geometry the sim continuously computes, and draws, **what Venus looks
like through a telescope**: its phase (a crescent-to-gibbous disk, code-drawn) and
its apparent angular size (the disk is scaled so that the "1 arcminute" reference
bar is meaningful — Venus grows as it nears Earth and shrinks as it recedes). It
also reports the **elongation** (angle from the Sun, in degrees East/West) and the
**earth–venus distance** (in AU). Everything derives from two numbers: Venus's and
Earth's orbital angles.

## Source

No pre-decompiled folder was supplied — only `venusPhases005.swf` /
`venusPhases005.fla`. The SWF was decompiled with the locally-installed JPEXS
FFDec into `../decompiled/` (scripts, shapes, sprites, texts, fonts,
symbolClass) and the first frame exported to SVG to recover exact stage
coordinates. Ground truth for behavior is
`../decompiled/scripts/Venusian Phases Demonstrator.as` plus the two drag
handlers (`DefineSprite_4` = earthMC, `DefineSprite_6` = venusMC).

## AS1 → HTML5 mapping

| ActionScript (source) | HTML5 port (`simulation.js`) |
|---|---|
| `VenusianPhasesDemonstratorClass` + `Object.registerClass` | plain state object + module functions |
| `earthOrbitalRadius = |earthMC|` = 252; `venusOrbitalRadius = 0.723*r` | `EARTH_ORBIT_R = 252`, `VENUS_ORBIT_R = 0.723*252` (verbatim) |
| `animationRate = 10`; rates `10.220506756884017`, `6.283185307179586` | `ANIMATION_RATE`, `VENUS_RATE`, `EARTH_RATE` (verbatim) |
| `onEnterFrame` = `animateOnEnterFrame`; `getTimer()` | `requestAnimationFrame(frame)`; `performance.now()` |
| `dt = (now-timeLast)/(1000*animationRate)`; angle updates | ported verbatim in `frame()` |
| `setVenusAngle` / `setEarthAngle` / `drawPhasePicture` | `computeGeometry()` (numbers) + `drawPhaseDisk()` (curveTo loops, verbatim) |
| `drawPhasePicture` two `beginFill` + `curveTo` tessellations | `drawPhaseDisk()` — same `n=4`, `r=100`, `kr`, `ks`, `f`, `curveTo→quadraticCurveTo`, colors `3158064`/`16777215` |
| `_rotation = 270 + angle*57.2957…` | `ctx.rotate((270 + angle*DEG)*π/180)` on the marker image |
| `Number.prototype.toFixed` polyfill | `asToFixed()` — ported verbatim so formatting is byte-identical |
| `onPress`/`onMouseMove`/`onRelease` drag with `offsetAngle` | Pointer Events (`beginDrag`/`moveDrag`/`endDrag`) with identical `offsetAngle` math |
| `pause()` / `resume()` around drags | ported verbatim (drag pauses, release resumes if it was animating) |
| `toggleAnimation`, button `setLabel("start/stop animation")` | native `<button id="animBtn">` toggling the same labels |
| `FPushButton` / `FUIComponent` framework | **not** ported — observable behavior reproduced with a native button |

## Reused assets vs. code-drawn

Exported **vector shapes are reused as-is** (copied to `assets/`, drawn with
`drawImage`, never re-vectorized):

* `orbits.svg` (shape 1) — the two orbit circles
* `sun.svg` (shape 9) — the yellow Sun disk
* `earth.svg` (shape 2) — the two-tone Earth marker (blue lit / grey dark)
* `venus.svg` (shape 5) — the two-tone Venus marker (white lit / grey dark)
* `hover-ring.svg` (shape 3) — the roll-over / focus highlight ring
* `scalebar.svg` (shape 15) — the "1 arcminute" reference bar (200 px)

**Code-drawn on canvas** (there is no exported file for it — the AS builds it at
runtime): only the **phase disk** (`drawPhasePicture`), ported line-for-line.

The object labels *Sun / Venus / Earth* were `DefineText` glyph outlines; they are
rendered as canvas text (verbatim words) that scales with the canvas, and the
same information is exposed to assistive tech through the diagram description and
the slider handles' `aria-valuetext`. The three subset Verdana fonts in the
export were **not** embedded (they are glyph-subsets, unusable for live text); a
safe `Verdana, Geneva, DejaVu Sans, sans-serif` stack is used instead.

## The contents.json edit (important)

This sim's entry already existed in the shared `contents.json`
(key **`venusphases`**, title "Phases of Venus", v2.0), so **no new entry was
added**. However, the file as shipped is **not valid JSON** and would make the
masthead's `response.json()` throw for *every* sim on the page. Two classes of
pre-existing defect were corrected in the **copied** `html5/foundation/contents.json`,
as purely syntactic, content-preserving fixes:

1. **Unescaped quotes** inside two Help strings — `href="../ptolemaic"`
   (the `venusphases` entry) and `href="../venusphases"` (the `ptolemaic` entry)
   — escaped to `href=\"…\"`.
2. **Literal control characters** inside string values (four raw newlines and one
   tab, in other sims' entries) — escaped to `\n` / `\t`.

No wording, keys, ordering, or meaning were changed; the file now parses
strictly and the intended links work. The `.js`/`.css` foundation files are
byte-for-byte unchanged. **Recommendation:** the upstream shared
`contents.json` should be corrected the same way (it is currently invalid JSON).

## MathJax

The foundation references MathJax but no MathJax library was bundled with it, and
external CDNs are disallowed. MathJax **3.2.2** (`tex-chtml` component + CHTML
fonts + context menu) is therefore **vendored locally** under
`foundation/mathjax/`. All math (the degree symbol in the elongation readout, the
"AU" and "arcminute" units) is typeset by MathJax; the context menu is left
enabled.

## Divergences from the original (priority order: behavior > accessibility/template > screenshot)

* **Layout is the KL-UNL shell, not the Flash pixel layout.** The single 870×600
  Flash stage is split into the foundation's two-column `.app-layout`: the
  telescope/phase view + readouts + controls on the left (25rem), the orbital
  diagram on the right (1fr). This **horizontally mirrors** the original
  (diagram was on the left in Flash) — forced by the foundation's fixed
  `25rem 1fr` grid, which we do not edit. Panel grouping and reading order are
  preserved; the diagram gets the wide column so it stays near original size.
* **Two canvases instead of one stage.** The phase view + scale bar are drawn in
  their own small canvas so they can live in the readout panel and reflow
  independently on phones. The phase-disk size calibration (1 arcminute = 200 px,
  disk radius ≤ 100 px) is identical to the original because the drawing math is
  self-contained.
* **Keyboard control added** for the two draggable planets (arrows / Page / Home /
  End). Adjusting a planet by keyboard stops the animation (the mouse path
  pauses-then-resumes; keyboard has no natural "release", so it simply stops).
* **Colors/fonts** follow the KL-UNL palette and a safe font stack rather than the
  Flash originals. The physically-meaningful phase (white lit / dark side) and the
  planet marker colors are preserved.

## Self-verification

* Initial state reproduces the original screenshot exactly: **elongation 43.5° E**,
  **earth–venus distance 0.50 AU**.
* Spot-checked geometry: inferior conjunction → 0.28 AU, new phase, largest disk;
  superior conjunction → 1.72 AU, full phase, smallest disk; greatest elongation
  ≈ 46°. All physically correct and consistent with the AS formulas.
* No console errors when served over HTTP; masthead, Help, and About load.
