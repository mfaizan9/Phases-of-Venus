/* ============================================================================
   Phases of Venus  --  HTML5 port of venusPhases005.swf (AS1)
   Behaviour is a faithful port of the decompiled ActionScript
   ("Venusian Phases Demonstrator.as" + the earthMC/venusMC drag handlers).
   Presentation follows the KL-UNL foundation + WCAG 2.1 AA.

   Ground-truth constants and formulas are copied VERBATIM from the source and
   commented with their AS origin.
   ========================================================================== */
'use strict';

/* ---- Constants (verbatim from the AS source) ------------------------------ */
const TWO_PI      = 6.283185307179586;                 // AS literal
const PI          = 3.141592653589793;                 // AS literal
const DEG         = 57.29577951308232;                 // radians -> degrees (AS literal)
const VENUS_RATE  = 10.220506756884017;                // AS: venus angular rate
const EARTH_RATE  = 6.283185307179586;                 // AS: earth angular rate
const ANIMATION_RATE = 10;                             // AS: this.animationRate = 10

// Orbital radii: constructor computes r = |earthMC initial pos| = 252 (stage px),
// then this.venusOrbitalRadius = 0.723 * r.  Physics depends only on the 0.723
// ratio; 252 sets the on-screen scale and matches the original stage.
const EARTH_ORBIT_R = 252;
const VENUS_ORBIT_R = 0.723 * 252;                     // AS: 0.723 * r

// Phase-disk fill colours (AS: beginFill(3158064) dark, beginFill(16777215) white)
const PHASE_DARK  = '#302F30';                          // 3158064 = 0x302F30
const PHASE_LIGHT = '#FFFFFF';                          // 16777215 = 0xFFFFFF

// Object-label colours taken from the exported text/shape assets.
const LABEL_WHITE = '#FFFFFF';
const LABEL_EARTH = '#66CCFF';                          // earth marker blue (#66ccff)

/* ---- Orbit-canvas geometry (logical px; Sun at centre) -------------------- */
const ORBIT_SIZE  = 560;
const SUN_CX      = 280;
const SUN_CY      = 280;

/* ---- Phase-canvas geometry (logical px) ----------------------------------- */
const PHASE_W     = 240;
const PHASE_H     = 250;
const PHASE_CX    = 120;
const PHASE_CY    = 150;

/* ---- State (single source of truth) --------------------------------------- */
const INITIAL = { venusAngle: 0.5, earthAngle: 0 };    // AS: setVenusAngle(0.5); setEarthAngle(0)
const state = {
  venusAngle: INITIAL.venusAngle,   // radians
  earthAngle: INITIAL.earthAngle,   // radians
  animating: false,
  animatingAtPause: false,
  timeLast: 0,
  dragging: null,                   // 'venus' | 'earth' | null
  dragOffset: 0,
  hovered: null,                    // 'venus' | 'earth' | null
  focused: null                     // 'venus' | 'earth' | null
};

/* ---- DOM handles ---------------------------------------------------------- */
let orbitCanvas, orbitCtx, phaseCanvas, phaseCtx;
let venusHandle, earthHandle, animBtn, liveRegion, orbitStage;
let rafId = null;

/* ---- Exported vector assets, reused as-is (drawn with drawImage) ----------- */
const ASSETS = {
  orbits:  'assets/orbits.svg',
  sun:     'assets/sun.svg',
  earth:   'assets/earth.svg',
  venus:   'assets/venus.svg',
  ring:    'assets/hover-ring.svg',
  scalebar:'assets/scalebar.svg'
};
const img = {};
let assetsPending = 0;

/* ==========================================================================
   toFixed  --  ported VERBATIM from the AS Number.prototype.toFixed polyfill
   so on-screen number formatting matches the original exactly.
   ========================================================================== */
function asToFixed(x, fractionDigits) {
  let f = fractionDigits | 0;                 // int(fractionDigits)
  if (f < 0 || f > 20) { return 'Range Error'; }
  if (isNaN(x)) { return 'NaN'; }
  let s = '';
  if (x < 0) { s = '-'; x = -x; }
  let m = '';
  if (x < 1e21) {
    let n = Math.round(x * Math.pow(10, f));
    if (n === 0) { m = '0'; } else { m = n.toString(); }
    if (f > 0) {
      let k = m.length;
      if (k <= f) {
        let z = '';
        for (let i = 0; i < f + 1 - k; i++) { z += '0'; }
        m = z + m; k = f + 1;
      }
      const a = m.substr(0, k - f);
      const b = m.substr(k - f);
      m = a + '.' + b;
    }
  } else { m = x.toString(); }
  return s + m;
}

/* ==========================================================================
   computeGeometry  --  the number-crunching half of AS drawPhasePicture().
   Returns everything the drawing + readouts + narration need.
   ========================================================================== */
function computeGeometry() {
  const cos = Math.cos;
  // AS reads the angles back from the clip positions via atan2; using the raw
  // stored angles is equivalent because positions are set from these angles.
  const venusAngle = state.venusAngle;
  const earthAngle = state.earthAngle;

  // theta = 6.283... * (((earthAngle - venusAngle)/6.283... % 1 + 1) % 1)
  const theta = TWO_PI * ((((earthAngle - venusAngle) / TWO_PI) % 1 + 1) % 1);
  const ct = cos(theta);
  const re = EARTH_ORBIT_R;
  const rv = VENUS_ORBIT_R;
  const d = Math.sqrt(re * re + rv * rv - 2 * re * rv * ct);

  let ca0 = (rv - re * ct) / d;
  if (ca0 > 1) { ca0 = 1; } else if (ca0 < -1) { ca0 = -1; }
  const a0 = Math.acos(ca0);

  let a, e;
  if (theta < PI) {
    a = TWO_PI - a0;
    e = (a - theta - PI) * DEG;
  } else {
    a = a0;
    e = (-(theta - a - PI)) * DEG;
  }

  const distNum = asToFixed(d / re, 2);            // AS: (d/re).toFixed(2) + " AU"
  let elonNum, side;
  if (e < 0) { elonNum = asToFixed(Math.abs(e), 1); side = 'E'; }   // "° E"
  else       { elonNum = asToFixed(e, 1);           side = 'W'; }   // "° W"

  const f = (a < PI) ? -1 : 1;                     // AS phase flip
  const scale = (re - rv) / d;                     // AS: _xscale = 100*(re-rv)/d

  // Illuminated fraction + a plain-language phase description (for narration).
  const k = (1 + cos(a)) / 2;
  const pct = Math.round(k * 100);
  let phaseDesc;
  if (pct <= 1) { phaseDesc = 'new, with almost none of its disk illuminated'; }
  else if (pct >= 99) { phaseDesc = 'full, with its whole disk illuminated'; }
  else {
    const shape = pct > 55 ? 'gibbous' : (pct < 45 ? 'a crescent' : 'at half phase');
    phaseDesc = shape + ', about ' + pct + ' percent illuminated';
  }

  return { theta, d, re, rv, a, e, f, scale, distNum, elonNum, side, phaseDesc };
}

/* ==========================================================================
   Drawing
   ========================================================================== */
function haveImg(key) {
  const i = img[key];
  return i && i.complete && i.naturalWidth > 0;
}

function drawOrbitCanvas(g) {
  const ctx = orbitCtx;
  ctx.clearRect(0, 0, ORBIT_SIZE, ORBIT_SIZE);

  // Orbits (exported SVG, 505x505, centred on Sun) reused as-is.
  if (haveImg('orbits')) {
    ctx.drawImage(img.orbits, SUN_CX - 252.5, SUN_CY - 252.5, 505, 505);
  }
  // Sun (exported SVG, 28x28, centred).
  if (haveImg('sun')) {
    ctx.drawImage(img.sun, SUN_CX - 14, SUN_CY - 14, 28, 28);
  }

  const vp = planetPos('venus');
  const ep = planetPos('earth');

  // Hover / focus rings (exported SVG) under the markers.
  drawHighlightRing('venus', vp);
  drawHighlightRing('earth', ep);

  // Planet markers (exported two-tone SVGs) rotated so the lit half faces the Sun.
  drawMarker('venus', vp, state.venusAngle, 20);
  drawMarker('earth', ep, state.earthAngle, 21);

  // Object labels (kept legible; also exposed to AT via the diagram description
  // and the slider handles). Verbatim words from the source: Sun / Venus / Earth.
  ctx.textBaseline = 'middle';
  ctx.font = '600 15px Verdana, Geneva, "DejaVu Sans", sans-serif';

  ctx.fillStyle = LABEL_WHITE;
  ctx.textAlign = 'center';
  ctx.fillText('Sun', SUN_CX, SUN_CY + 28);

  drawPlanetLabel('Venus', vp, LABEL_WHITE);
  drawPlanetLabel('Earth', ep, LABEL_EARTH);
}

// Draw a planet's label beside it, flipping to the inner side when placing it
// to the right would run off the canvas edge (keeps it from clipping).
function drawPlanetLabel(text, pos, color) {
  const ctx = orbitCtx;
  const gap = 13;
  ctx.fillStyle = color;
  const w = ctx.measureText(text).width;
  if (pos.x + gap + w <= ORBIT_SIZE - 2) {
    ctx.textAlign = 'left';
    ctx.fillText(text, pos.x + gap, pos.y + 4);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(text, pos.x - gap, pos.y + 4);
  }
}

function drawMarker(which, pos, angleRad, size) {
  const key = which;
  const ctx = orbitCtx;
  if (!haveImg(key)) { return; }
  ctx.save();
  ctx.translate(pos.x, pos.y);
  // AS: _rotation = 270 + angle * DEG  (degrees, clockwise, screen-y-down)
  ctx.rotate((270 + angleRad * DEG) * PI / 180);
  ctx.drawImage(img[key], -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawHighlightRing(which, pos) {
  if (state.hovered !== which && state.focused !== which) { return; }
  if (!haveImg('ring')) { return; }
  orbitCtx.drawImage(img.ring, pos.x - 11.5, pos.y - 11.5, 23, 23);
}

function planetPos(which) {
  const R = (which === 'venus') ? VENUS_ORBIT_R : EARTH_ORBIT_R;
  const a = (which === 'venus') ? state.venusAngle : state.earthAngle;
  return { x: SUN_CX + R * Math.cos(a), y: SUN_CY + R * Math.sin(a) };
}

function drawPhaseCanvas(g) {
  const ctx = phaseCtx;
  ctx.clearRect(0, 0, PHASE_W, PHASE_H);

  // Scale bar (exported SVG "1 arcminute", 200 px long) reused as-is, centred.
  if (haveImg('scalebar')) {
    // SVG content line sits at internal (1.5..201.5, 8.5); place it at y=25.
    ctx.drawImage(img.scalebar, (PHASE_W - 203) / 2, 25 - 8.5, 203, 17);
  }

  // Phase disk -- code-drawn geometry ported from AS drawPhasePicture().
  drawPhaseDisk(ctx, PHASE_CX, PHASE_CY, g.a, g.scale, g.f);
}

// Verbatim port of the two curveTo tessellation loops in AS drawPhasePicture().
function drawPhaseDisk(ctx, cx, cy, a, scale, f) {
  const sin = Math.sin, cos = Math.cos;
  const n = 4;
  const r = 100;
  const sTerm = r * cos(a);                 // AS local var 's' = r*cos(a)
  const step = PI / n;
  const halfStep = step / 2;
  const kr = r / cos(halfStep);
  const ks = sTerm / cos(halfStep);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);                  // AS: mc._xscale = mc._yscale = 100*(re-rv)/d

  // Dark fill (3158064)
  ctx.beginPath();
  ctx.moveTo(0, -r);
  for (let i = 1; i <= n; i++) {
    const angle = i * step;
    const ax = r * sin(angle), ay = -r * cos(angle);
    const cA = angle - halfStep;
    ctx.quadraticCurveTo(f * (kr * sin(cA)), -kr * cos(cA), f * ax, ay);
  }
  for (let i = n - 1; i >= 0; i--) {
    const angle = i * step;
    const ax = sTerm * sin(angle), ay = -r * cos(angle);
    const cA = angle + halfStep;
    ctx.quadraticCurveTo(f * (ks * sin(cA)), -kr * cos(cA), f * ax, ay);
  }
  ctx.closePath();
  ctx.fillStyle = PHASE_DARK;
  ctx.fill();

  // Light fill (16777215)
  ctx.beginPath();
  ctx.moveTo(0, -r);
  for (let i = 1; i <= n; i++) {
    const angle = i * step;
    const ax = -r * sin(angle), ay = -r * cos(angle);
    const cA = angle - halfStep;
    ctx.quadraticCurveTo(f * (-kr * sin(cA)), -kr * cos(cA), f * ax, ay);
  }
  for (let i = n - 1; i >= 0; i--) {
    const angle = i * step;
    const ax = sTerm * sin(angle), ay = -r * cos(angle);
    const cA = angle + halfStep;
    ctx.quadraticCurveTo(f * (ks * sin(cA)), -kr * cos(cA), f * ax, ay);
  }
  ctx.closePath();
  ctx.fillStyle = PHASE_LIGHT;
  ctx.fill();

  ctx.restore();
}

/* ==========================================================================
   Readouts (MathJax via the foundation's klunlShowEquation) + handle ARIA
   ========================================================================== */
let lastElon = null, lastDist = null;

function updateReadouts(g) {
  const elonLatex = g.elonNum + '^{\\circ}\\,\\text{' + g.side + '}';
  const elonSpoken = g.elonNum + ' degrees ' + (g.side === 'E' ? 'east' : 'west');
  if (elonLatex !== lastElon) {
    lastElon = elonLatex;
    klunlShowEquation(['elongationEqn', '\\(' + elonLatex + '\\)'],
                      ['elongationSR', elonSpoken]);
  }
  const distLatex = g.distNum + '\\,\\text{AU}';
  const distSpoken = g.distNum + ' astronomical units';
  if (distLatex !== lastDist) {
    lastDist = distLatex;
    klunlShowEquation(['distanceEqn', '\\(' + distLatex + '\\)'],
                      ['distanceSR', distSpoken]);
  }
}

function normDeg(rad) {
  return ((rad * DEG) % 360 + 360) % 360;
}

function updateHandleAria(g) {
  const vDeg = Math.round(normDeg(state.venusAngle)) % 360;
  const eDeg = Math.round(normDeg(state.earthAngle)) % 360;
  const geo = 'Elongation ' + g.elonNum + ' degrees ' + (g.side === 'E' ? 'east' : 'west') +
              ', earth to Venus distance ' + g.distNum + ' astronomical units. Venus appears ' +
              g.phaseDesc + '.';
  venusHandle.setAttribute('aria-valuenow', String(vDeg));
  venusHandle.setAttribute('aria-valuetext', 'Venus at orbital angle ' + vDeg + ' degrees. ' + geo);
  earthHandle.setAttribute('aria-valuenow', String(eDeg));
  earthHandle.setAttribute('aria-valuetext', 'Earth at orbital angle ' + eDeg + ' degrees. ' + geo);
}

function positionHandles() {
  const vp = planetPos('venus');
  const ep = planetPos('earth');
  venusHandle.style.left = (vp.x / ORBIT_SIZE * 100) + '%';
  venusHandle.style.top  = (vp.y / ORBIT_SIZE * 100) + '%';
  earthHandle.style.left = (ep.x / ORBIT_SIZE * 100) + '%';
  earthHandle.style.top  = (ep.y / ORBIT_SIZE * 100) + '%';
}

/* ==========================================================================
   render()  --  redraw everything from state
   ========================================================================== */
function render(opts) {
  const g = computeGeometry();
  drawOrbitCanvas(g);
  drawPhaseCanvas(g);
  positionHandles();
  updateReadouts(g);
  updateHandleAria(g);
  if (opts && opts.announce) { announce(g, opts.announce); }
  return g;
}

// Cheap redraw for hover/focus ring changes (no readout churn).
function redrawOrbitOnly() {
  drawOrbitCanvas(computeGeometry());
}

/* ==========================================================================
   Live-region narration (on commit, not per tick)
   ========================================================================== */
function announce(g, kind) {
  const geo = 'Elongation ' + g.elonNum + ' degrees ' + (g.side === 'E' ? 'east' : 'west') +
              ', earth to Venus distance ' + g.distNum + ' astronomical units. Venus appears ' +
              g.phaseDesc + '.';
  let msg;
  if (kind === 'reset')             { msg = 'Simulation reset. ' + geo; }
  else if (kind === 'animate-start'){ msg = 'Animation started. Venus and Earth are orbiting the Sun.'; }
  else if (kind === 'animate-stop') { msg = 'Animation stopped. ' + geo; }
  else                              { msg = geo; }   // drag release
  liveRegion.textContent = msg;
}

/* ==========================================================================
   Animation  --  onEnterFrame -> requestAnimationFrame; getTimer -> now (ms)
   ========================================================================== */
function frame(now) {
  if (!state.animating) { rafId = null; return; }
  // AS: dt = (timeNow - timeLast) / (1000 * animationRate)
  const dt = (now - state.timeLast) / (1000 * ANIMATION_RATE);
  state.venusAngle = -dt * VENUS_RATE + state.venusAngle;   // AS venus update
  state.earthAngle = -dt * EARTH_RATE + state.earthAngle;   // AS earth update
  state.timeLast = now;
  render();
  rafId = requestAnimationFrame(frame);
}

function startAnimation() {
  state.animating = true;
  animBtn.textContent = 'stop animation';               // AS: setLabel("stop animation")
  animBtn.setAttribute('aria-pressed', 'true');
  state.timeLast = performance.now();                    // AS: timeLast = getTimer()
  if (rafId === null) { rafId = requestAnimationFrame(frame); }
}

function stopAnimation() {
  state.animating = false;
  animBtn.textContent = 'start animation';              // AS: setLabel("start animation")
  animBtn.setAttribute('aria-pressed', 'false');
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function toggleAnimation() {                              // AS: p.toggleAnimation
  if (state.animating) { stopAnimation(); render({ announce: 'animate-stop' }); }
  else { startAnimation(); render({ announce: 'animate-start' }); }
}

// AS pause()/resume() used around dragging.
function pause() {
  state.animatingAtPause = state.animating;
  state.animating = false;
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
function resume() {
  if (state.animatingAtPause) { startAnimation(); } else { stopAnimation(); }
}

/* ==========================================================================
   Pointer drag  --  ported offset maths (offsetAngle + follow)
   ========================================================================== */
function pointerToDemo(e) {
  const rect = orbitCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * ORBIT_SIZE - SUN_CX;
  const y = (e.clientY - rect.top) / rect.height * ORBIT_SIZE - SUN_CY;
  return { x, y };
}

function beginDrag(which, e) {
  e.preventDefault();
  const handle = (which === 'venus') ? venusHandle : earthHandle;
  try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  handle.focus();                                        // click-to-focus (keyboard after click)
  pause();                                               // AS onPress: this._parent.pause()
  state.dragging = which;
  const m = pointerToDemo(e);
  const planetAngle = (which === 'venus') ? state.venusAngle : state.earthAngle;
  // AS: offsetAngle = atan2(mouseY,mouseX) - atan2(planetY,planetX)
  state.dragOffset = Math.atan2(m.y, m.x) -
                     Math.atan2(Math.sin(planetAngle), Math.cos(planetAngle));
}

function moveDrag(e) {
  if (!state.dragging) { return; }
  e.preventDefault();
  const m = pointerToDemo(e);
  // AS onMouseMoveFunc: setAngle(atan2(mouseY,mouseX) - offsetAngle)
  const ang = Math.atan2(m.y, m.x) - state.dragOffset;
  if (state.dragging === 'venus') { state.venusAngle = ang; } else { state.earthAngle = ang; }
  render();
}

function endDrag(which, e) {
  if (state.dragging !== which) { return; }
  const handle = (which === 'venus') ? venusHandle : earthHandle;
  try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
  state.dragging = null;
  resume();                                              // AS onRelease: resume()
  render({ announce: 'drag-release' });
}

/* ==========================================================================
   Keyboard control of the planet handles (full arrow / Page / Home / End)
   ========================================================================== */
const STEP_FINE   = 1 * PI / 180;    // 1 degree
const STEP_COARSE = 15 * PI / 180;   // 15 degrees

function handleKey(which, e) {
  let delta = 0, absolute = null;
  switch (e.key) {
    case 'ArrowRight': case 'ArrowUp':   delta = +STEP_FINE; break;
    case 'ArrowLeft':  case 'ArrowDown': delta = -STEP_FINE; break;
    case 'PageUp':     delta = +STEP_COARSE; break;
    case 'PageDown':   delta = -STEP_COARSE; break;
    case 'Home':       absolute = 0; break;
    case 'End':        absolute = 359 * PI / 180; break;
    default: return;   // let Tab and everything else pass through
  }
  e.preventDefault();
  if (state.animating) { stopAnimation(); }   // adjusting a planet stops the animation
  if (which === 'venus') {
    state.venusAngle = (absolute !== null) ? absolute : state.venusAngle + delta;
  } else {
    state.earthAngle = (absolute !== null) ? absolute : state.earthAngle + delta;
  }
  render();   // aria-valuetext (with units) is updated here; the slider self-announces
}

/* ==========================================================================
   Reset (via the masthead's bubbling "sim-reset" event)
   ========================================================================== */
function resetSim() {
  stopAnimation();
  state.animatingAtPause = false;
  state.dragging = null;
  state.venusAngle = INITIAL.venusAngle;    // AS initial: setVenusAngle(0.5)
  state.earthAngle = INITIAL.earthAngle;    // AS initial: setEarthAngle(0)
  render({ announce: 'reset' });
}

/* ==========================================================================
   Setup
   ========================================================================== */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width, h = canvas.height;   // logical size from the attribute
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

function loadAssets(done) {
  const keys = Object.keys(ASSETS);
  assetsPending = keys.length;
  keys.forEach((key) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => {
      assetsPending--;
      render();                 // redraw as each asset arrives
      if (assetsPending === 0 && done) { done(); }
    };
    im.src = ASSETS[key];
    img[key] = im;
  });
}

function whenMathJaxReady(cb) {
  if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
    MathJax.startup.promise.then(cb);
  } else {
    setTimeout(() => whenMathJaxReady(cb), 50);
  }
}

// Redefine the foundation hook to initialise our equations (rule 8).
window.klunlInitEqn = function () {
  klunlShowEquation(['arcminuteLabel', '\\(1\\,\\text{arcminute}\\)']);
  lastElon = lastDist = null;                 // force the readouts to (re)typeset
  updateReadouts(computeGeometry());
};

function init() {
  orbitCanvas = document.getElementById('orbitCanvas');
  phaseCanvas = document.getElementById('phaseCanvas');
  orbitStage  = document.getElementById('orbitStage');
  venusHandle = document.getElementById('venusHandle');
  earthHandle = document.getElementById('earthHandle');
  animBtn     = document.getElementById('animBtn');
  liveRegion  = document.getElementById('liveRegion');

  orbitCtx = setupCanvas(orbitCanvas);
  phaseCtx = setupCanvas(phaseCanvas);

  // Animation button (AS FPushButton -> clickHandler "toggleAnimation")
  animBtn.setAttribute('aria-pressed', 'false');
  animBtn.addEventListener('click', toggleAnimation);

  // Pointer drag on each handle.
  [['venus', venusHandle], ['earth', earthHandle]].forEach(([which, h]) => {
    h.addEventListener('pointerdown', (e) => beginDrag(which, e));
    h.addEventListener('pointermove', moveDrag);
    h.addEventListener('pointerup',   (e) => endDrag(which, e));
    h.addEventListener('pointercancel', (e) => endDrag(which, e));
    h.addEventListener('keydown', (e) => handleKey(which, e));
    // Hover ring (mouse only; touch/keyboard handled by focus).
    h.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'touch') { state.hovered = which; redrawOrbitOnly(); }
    });
    h.addEventListener('pointerleave', () => {
      if (state.hovered === which) { state.hovered = null; redrawOrbitOnly(); }
    });
    h.addEventListener('focus', () => { state.focused = which; redrawOrbitOnly(); });
    h.addEventListener('blur',  () => { if (state.focused === which) { state.focused = null; redrawOrbitOnly(); } });
  });

  // Reset comes from the masthead component (bubbling, composed event).
  document.addEventListener('sim-reset', resetSim);

  // First paint.
  render();
  loadAssets();
  whenMathJaxReady(() => { window.klunlInitEqn(); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
