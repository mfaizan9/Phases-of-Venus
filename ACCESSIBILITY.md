# Accessibility Notes — Phases of Venus

Target: WCAG 2.1 AA (AAA where reasonable). **Human screen-reader QA on real
NVDA (Windows) and VoiceOver (macOS/iOS) is still required** — the notes below
describe what was built for AT, not a substitute for testing with users.

## Structure & landmarks

* `<html lang="en">`; one `<h1>` (rendered by `<kl-unl-masthead>` — no competing
  h1). Panels use `<h2>` headings in order; `<main>` wraps the layout; each panel
  is a `<section>` labelled by its heading.
* Masthead (title + **Reset / Help / About** + their dialog) is the foundation
  component; we do not build our own. Reset is wired via the bubbling
  `sim-reset` event and restores the exact initial state (Venus 0.5 rad, Earth 0,
  animation stopped).

## Text alternatives for the canvases (1.1.1)

* Both canvases are `role="img"` with an `aria-describedby` description.
* The **live region** (`aria-live="polite"`) narrates state changes *on commit*
  (drag release, animation start/stop, reset) — never per animation tick — e.g.
  *"Elongation 43.5 degrees east, earth to Venus distance 0.50 astronomical
  units. Venus appears a crescent, about 35 percent illuminated."*
* An illuminated-fraction + phase-shape description is computed every render so an
  audio-only user knows *what the diagram shows*, not just the control values.

## Units are always spoken (explicit supervisor requirement)

Every numeric value is announced **with its quantity name and unit**, never a bare
number:

* Elongation readout → `.sr-only` companion *"43.5 degrees east"* (the visible
  `43.5° E` is MathJax, `aria-hidden` so speech uses the worded form).
* Distance readout → *"0.50 astronomical units"* (visible `0.50 AU` is MathJax).
* Planet handles (`role="slider"`) → `aria-valuetext` such as *"Venus at orbital
  angle 29 degrees. Elongation 43.5 degrees east, earth to Venus distance 0.50
  astronomical units. Venus appears a crescent, about 35 percent illuminated."*

Units are spelled as full words ("degrees", "astronomical units", "arcminute")
so they are not skipped or mis-read.

## Math (MathJax)

All math symbols go through MathJax (LaTeX → CHTML): the degree symbol in the
elongation readout, `AU`, and the `1 arcminute` scale label. Right-clicking any of
these opens the MathJax **"Show Math As → TeX / MathML"** context menu (it is left
enabled and not trapped). Each equation is paired with a worded screen-reader
string via the foundation's `klunlShowEquation(eqn, msg)` helper. No math is a
raster image or ASCII, and no math is baked into the canvas.

## Keyboard (2.1.1 / 2.1.2 / 2.4.7)

* Everything is operable by keyboard in a logical order; the foundation supplies
  the visible `:focus-visible` ring (rounded for the circular planet handles).
* **Both draggable planets** are (i) reachable by **Tab** (focusable
  `role="slider"` handles overlaid on them) and (ii) focused by **click/tap**
  (`.focus()` on pointerdown), after which the arrow keys move them:
  * Left/Down = −1°, Right/Up = +1°, PageUp/PageDown = ±15°, Home = 0°, End = 359°.
  * New position is announced with units via `aria-valuetext`.
* No keyboard traps; **Tab** always moves away normally (movement keys are
  `preventDefault`-ed, Tab is not). The masthead dialog manages its own focus.
* Pointer and keyboard update the **same** state object.

## Color & contrast (1.4.1 / 1.4.3 / 1.4.11)

* UI text/chrome uses the KL-UNL palette variables (dark charcoal on white,
  ≥ 4.5:1). The two canvases keep the original black telescope/diagram field with
  white/coloured content for the physically-meaningful phase and planets.
* **State is never encoded by color alone**: phase is stated as text/percent, the
  elongation direction is labelled *E*/*W* with a spoken *east*/*west*, and each
  planet is labelled by name.

## Motion (2.2.2 / 2.3.3)

* The orbital animation is **always user-initiated** and stoppable with the same
  **start/stop animation** button, so there is no motion the user cannot stop
  (this button is the required Pause control; Reset is the masthead's).
* Nothing flashes; the motion is smooth (no > 3/sec flashing).
* `prefers-reduced-motion` is honoured for CSS transitions; because motion is only
  ever user-triggered and instantly stoppable, the continuous orbit view is left
  available rather than removed (removing it would remove the core feature).

## Zoom / reflow (1.4.4 / 1.4.10)

* Body copy is ≥ 1.125rem and sized in rem/em, so it tracks the browser font
  setting. The layout reflows without clipping at 200% zoom and down to phone
  portrait (single column, no horizontal scroll — verified at 375 px).
* Canvases keep their original internal coordinate system and scale via CSS with
  a fixed aspect ratio; pointer coordinates are mapped back through the scale so
  drag/offset math stays exact at any display size.

## Touch (2.5.x)

* Pointer Events give one code path for mouse and touch; `touch-action: none` on
  the diagram canvas and handles prevents drag from scrolling the page.
* Planet handles are ≥ 44 px (2.75rem); the animation button uses the foundation's
  44 px minimum. No hover-only affordances (the hover ring is a redundant cue;
  focus shows it too).

## Known limitations / notes

* The *Sun / Venus / Earth* object labels are canvas-drawn (they scale with page
  zoom but do not reflow). Their information is also available to AT via the
  diagram description and the handles' `aria-valuetext`, so no information is
  lost for audio-only users.
* When two planets nearly overlap (conjunction), their 44 px pointer handles
  overlap and a mouse grabs whichever is on top; both remain independently
  operable by keyboard.
* Human NVDA + VoiceOver testing remains to be done.
