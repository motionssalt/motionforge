/* ============================================================
   Motion JSON Studio — rendering engine (v2)
   Deterministic, time-driven: draw(comp, t) fully defines a frame,
   so scrubbing, looping and stepping all "just work".
   ============================================================ */
(function (global) {
"use strict";

/* ---------------- math + easing ---------------- */
const clamp01 = p => (p < 0 ? 0 : p > 1 ? 1 : p);
const lerp = (a, b, f) => a + (b - a) * f;
const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);

const EASE = {
  linear:     p => p,
  inQuad:     p => p * p,
  outQuad:    p => 1 - (1 - p) * (1 - p),
  inOutQuad:  p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  inCubic:    p => p * p * p,
  outCubic:   p => 1 - Math.pow(1 - p, 3),
  inOutCubic: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outQuart:   p => 1 - Math.pow(1 - p, 4),
  outQuint:   p => 1 - Math.pow(1 - p, 5),
  inOutSine:  p => -(Math.cos(Math.PI * p) - 1) / 2,
  inBack:     p => { const c1 = 1.70158, c3 = c1 + 1; return c3 * p * p * p - c1 * p * p; },
  outBack:    p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  outElastic: p => (p === 0 || p === 1) ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - .75) * ((2 * Math.PI) / 3)) + 1,
  outBounce:  p => { const n1 = 7.5625, d1 = 2.75;
                     if (p < 1 / d1) return n1 * p * p;
                     if (p < 2 / d1) return n1 * (p -= 1.5 / d1) * p + .75;
                     if (p < 2.5 / d1) return n1 * (p -= 2.25 / d1) * p + .9375;
                     return n1 * (p -= 2.625 / d1) * p + .984375; },
  anticipate: p => (p < .28 ? -0.22 * Math.sin((p / .28) * Math.PI)
                            : 1 - Math.pow(1 - (p - .28) / .72, 3)),
  spring:     p => (p >= 1 ? 1 : 1 - Math.cos(p * Math.PI * 2.6) * Math.exp(-p * 4.6) * (1 - p)),
};
const easeFn = n => EASE[n] || EASE.outCubic;
const outCubic = EASE.outCubic, inCubic = EASE.inCubic, outBack = EASE.outBack, outElastic = EASE.outElastic;
const cosFade = p => .5 + .5 * Math.cos(Math.PI * p);

/* ---------------- entrances ----------------
   fn(p) -> { o, dx, dy, s, rot, rx, ry, blur, clip }
   split entrances also expose cfn(cp, i, n) applied per character/word.
------------------------------------------------ */
const SPREAD = 0.62;                                   // portion of the entrance spent staggering
const charProg = (p, i, n) => clamp01((p - (n > 1 ? (i / (n - 1)) * SPREAD : 0)) / (1 - SPREAD));

const ENTRANCES = {
  "none":         { d: 0.001, fn: () => ({}) },
  "fade-in":      { d: 0.45, fn: p => ({ o: outCubic(p) }) },
  "slide-up":     { d: 0.50, fn: p => ({ o: Math.min(p * 2.4, 1), dy:  (1 - outCubic(p)) * 60 }) },
  "slide-down":   { d: 0.50, fn: p => ({ o: Math.min(p * 2.4, 1), dy: -(1 - outCubic(p)) * 60 }) },
  "slide-left":   { d: 0.50, fn: p => ({ o: Math.min(p * 2.4, 1), dx:  (1 - outCubic(p)) * 70 }) },
  "slide-right":  { d: 0.50, fn: p => ({ o: Math.min(p * 2.4, 1), dx: -(1 - outCubic(p)) * 70 }) },
  "elastic-pop":  { d: 0.70, fn: p => ({ o: Math.min(p * 5, 1), s: Math.max(.001, outElastic(p)) }) },
  "scale-in":     { d: 0.45, fn: p => ({ o: Math.min(p * 2.2, 1), s: .6 + .4 * outBack(p) }) },
  "wipe-reveal":  { d: 0.50, fn: p => ({ clip: `inset(-15% ${(1 - outCubic(p)) * 105}% -15% -15%)` }) },
  "wipe-up":      { d: 0.55, fn: p => ({ clip: `inset(${(1 - outCubic(p)) * 105}% -15% -15% -15%)` }) },
  "mask-up":      { d: 0.62, fn: p => ({ clip: `inset(-20% -8% ${(1 - EASE.outQuint(p)) * 108}% -8%)`,
                                         dy: (1 - EASE.outQuint(p)) * 22 }) },
  "blur-in":      { d: 0.60, fn: p => ({ o: outCubic(p), blur: (1 - outCubic(p)) * 14, s: .96 + .04 * outCubic(p) }) },
  "zoom-blur":    { d: 0.65, fn: p => ({ o: Math.min(p * 2, 1), s: 1.35 - .35 * EASE.outQuart(p), blur: (1 - EASE.outQuart(p)) * 20 }) },
  "drop-bounce":  { d: 0.85, fn: p => ({ o: Math.min(p * 6, 1), dy: -(1 - EASE.outBounce(p)) * 180 }) },
  "rotate-in":    { d: 0.70, fn: p => ({ o: Math.min(p * 2.2, 1), rot: -18 * (1 - outBack(p)), s: .8 + .2 * outBack(p) }) },
  "spin-in":      { d: 0.80, fn: p => ({ o: Math.min(p * 3, 1), rot: 360 * (1 - EASE.outQuart(p)), s: .3 + .7 * EASE.outQuart(p) }) },
  "flip-x":       { d: 0.70, fn: p => ({ o: Math.min(p * 3, 1), rx: 82 * (1 - outBack(p)) }) },
  "flip-y":       { d: 0.70, fn: p => ({ o: Math.min(p * 3, 1), ry: -82 * (1 - outBack(p)) }) },
  "unfold":       { d: 0.80, fn: p => ({ o: Math.min(p * 3, 1), ry: -70 * (1 - EASE.outQuint(p)), dx: -30 * (1 - EASE.outQuint(p)) }) },
  "skew-in":      { d: 0.55, fn: p => ({ o: Math.min(p * 2.4, 1), dx: -(1 - EASE.outQuart(p)) * 90, skew: 16 * (1 - EASE.outQuart(p)) }) },
  "arc-in":       { d: 0.85, fn: p => ({ o: Math.min(p * 2.4, 1),
                                         dx: -(1 - EASE.outCubic(p)) * 120,
                                         dy: -Math.sin(EASE.outCubic(p) * Math.PI) * 70,
                                         rot: -20 * (1 - EASE.outCubic(p)) }) },
  "anticipate-pop": { d: 0.75, fn: p => { const e = EASE.anticipate(p); return { o: Math.min(p * 5, 1), s: .55 + .45 * e }; } },
  "glitch":       { d: 0.60, fn: p => { const j = (1 - p) * 26;
                                        return { o: p < .12 ? 0 : (p > .8 ? 1 : (Math.sin(p * 60) > -.3 ? 1 : .15)),
                                                 dx: Math.sin(p * 44) * j, s: 1 + Math.sin(p * 33) * .02 * (1 - p) }; } },
  "draw-line":    { d: 0.60, fn: p => ({ clip: `inset(-30% ${(1 - EASE.outQuart(p)) * 100}% -30% 0%)` }) },
  "grow-up":      { d: 0.60, fn: p => ({ sy: EASE.outQuart(p), o: Math.min(p * 4, 1) }) },
  /* --- per character / word --- */
  "char-cascade": { d: 0.95, split: "chars",
                    cfn: cp => ({ o: outCubic(cp), dy: (1 - EASE.outQuint(cp)) * 46 }) },
  "char-pop":     { d: 1.05, split: "chars",
                    cfn: cp => ({ o: Math.min(cp * 4, 1), s: Math.max(.001, outBack(cp)) }) },
  "char-flip":    { d: 1.10, split: "chars",
                    cfn: cp => ({ o: Math.min(cp * 3, 1), rx: 90 * (1 - outBack(cp)) }) },
  "word-cascade": { d: 0.95, split: "words",
                    cfn: cp => ({ o: outCubic(cp), dy: (1 - EASE.outQuint(cp)) * 40, blur: (1 - cp) * 6 }) },
  "word-mask":    { d: 1.00, split: "words",
                    cfn: cp => ({ clipY: 1 - EASE.outQuint(cp), dy: (1 - EASE.outQuint(cp)) * 18 }) },
  "typewriter":   { d: 1.60, split: "type", cfn: () => ({}) },
};

/* ---------------- idles: (t, amp, speed) -> props ---------------- */
const IDLES = {
  none: null,
  pulse:   (t, a, k) => ({ s: 1 + .06 * a * Math.sin(t * 2 * Math.PI * k / 1.3) }),
  float:   (t, a, k) => ({ dy: 8 * a * Math.sin(t * 2 * Math.PI * k / 2.6) }),
  breathe: (t, a, k) => { const w = .5 + .5 * Math.sin(t * 2 * Math.PI * k / 3.2);
                          return { s: 1 + .045 * a * w, o: 1 - .10 * a * (1 - w) }; },
  bob:     (t, a, k) => ({ dy: -Math.abs(Math.sin(t * Math.PI * k / 1.1)) * 14 * a }),
  spin:    (t, a, k) => ({ rot: t * 60 * k * a }),
  sway:    (t, a, k) => ({ rot: 5 * a * Math.sin(t * 2 * Math.PI * k / 3.0) }),
  wobble:  (t, a, k) => ({ rot: 3.5 * a * Math.sin(t * 2 * Math.PI * k / 1.1),
                           s: 1 + .02 * a * Math.sin(t * 2 * Math.PI * k / .9) }),
  jitter:  (t, a, k) => ({ dx: a * (Math.sin(t * 37 * k) + Math.sin(t * 61 * k)) * 1.6,
                           dy: a * (Math.cos(t * 43 * k) + Math.sin(t * 71 * k)) * 1.6 }),
  drift:   (t, a, k) => ({ dx: 16 * a * Math.sin(t * 2 * Math.PI * k / 7),
                           dy: 11 * a * Math.cos(t * 2 * Math.PI * k / 5.5) }),
  orbit:   (t, a, k) => ({ dx: 22 * a * Math.cos(t * 2 * Math.PI * k / 4),
                           dy: 22 * a * Math.sin(t * 2 * Math.PI * k / 4) }),
  blink:   (t, a, k) => ({ o: (Math.sin(t * 2 * Math.PI * k / .9) > -.2) ? 1 : 1 - .85 * a }),
  shimmer: (t, a, k) => ({ o: 1 - .28 * a * (.5 + .5 * Math.sin(t * 2 * Math.PI * k / 1.7)) }),
  tick:    (t, a, k) => ({ rot: (Math.floor(t * k * 2) % 2 ? 1 : -1) * 2.5 * a }),
  parallax:(t, a, k) => ({ dx: 10 * a * Math.sin(t * 2 * Math.PI * k / 6),
                           dy: 6 * a * Math.sin(t * 2 * Math.PI * k / 4.2 + 1),
                           rot: 1.6 * a * Math.sin(t * 2 * Math.PI * k / 5) }),
};

/* ---------------- exits ---------------- */
const EXITS = {
  "fade-out":        { d: .40, fn: p => ({ o: cosFade(p) }) },
  "slide-out-up":    { d: .45, fn: p => ({ o: cosFade(p), dy: -inCubic(p) * 70 }) },
  "slide-out-down":  { d: .45, fn: p => ({ o: cosFade(p), dy:  inCubic(p) * 70 }) },
  "slide-out-left":  { d: .45, fn: p => ({ o: cosFade(p), dx: -inCubic(p) * 90 }) },
  "slide-out-right": { d: .45, fn: p => ({ o: cosFade(p), dx:  inCubic(p) * 90 }) },
  "scale-out":       { d: .40, fn: p => ({ o: cosFade(p), s: 1 - .4 * inCubic(p) }) },
  "pop-out":         { d: .45, fn: p => ({ o: cosFade(p), s: 1 + .35 * EASE.outQuad(p) }) },
  "wipe-out":        { d: .45, fn: p => ({ clip: `inset(-15% -15% -15% ${inCubic(p) * 105}%)` }) },
  "mask-down":       { d: .50, fn: p => ({ clip: `inset(-20% -8% ${EASE.inOutCubic(p) * 108}% -8%)` }) },
  "blur-out":        { d: .50, fn: p => ({ o: cosFade(p), blur: inCubic(p) * 16, s: 1 + .06 * p }) },
  "flip-out":        { d: .50, fn: p => ({ o: cosFade(p), rx: -inCubic(p) * 80 }) },
  "spin-out":        { d: .55, fn: p => ({ o: cosFade(p), rot: inCubic(p) * 240, s: 1 - .7 * inCubic(p) }) },
  "drop-out":        { d: .55, fn: p => ({ o: 1 - EASE.inQuad(p) * .9, dy: inCubic(p) * 220, rot: inCubic(p) * 22 }) },
  "glitch-out":      { d: .45, fn: p => ({ o: (Math.sin(p * 50) > -.2 ? 1 : .1) * cosFade(p), dx: Math.sin(p * 40) * p * 24 }) },
};

/* ---------------- catalogues ---------------- */
const ICONS = {
  star:"★", bolt:"⚡", heart:"♥", check:"✓", cross:"✕", play:"▶", pause:"❚❚", spark:"✦",
  waveform:"▂▄▇▅▂", dot:"●", arrow:"➜", "arrow-left":"⬅", up:"▲", down:"▼", plus:"✚",
  quote:"❝", music:"♪", note:"♫", bulb:"💡", fire:"🔥", rocket:"🚀", butterfly:"🦋",
  eye:"👁", target:"🎯", camera:"📸", mic:"🎙", clock:"⏱", lock:"🔒", gift:"🎁",
  trophy:"🏆", crown:"👑", chart:"📈", pin:"📌", megaphone:"📣", sparkles:"✨",
  hand:"👉", brain:"🧠", coin:"🪙", cursor:"➤", infinity:"∞", percent:"%",
};
const RATIOS = { "16:9":[1600,900], "9:16":[1080,1920], "1:1":[1080,1080], "4:3":[1200,900], "3:4":[900,1200], "4:5":[1080,1350], "21:9":[2100,900] };

const TYPES = ["text","caption","icon","image","shape","avatar-placeholder","counter","progress",
               "bar-chart","sparkline","grid-overlay","barcode","cursor","playhead","clip",
               "marker","card","device"];
const SHAPES = ["rect","circle","ellipse","line","triangle","ring","pill","star","blob","arrow","cross"];
const BACKGROUNDS = ["solid","gradient-linear","gradient-radial","gradient-conic","mesh","grid",
                     "dots","stripes","noise","paper","vignette","spotlight","image"];
const TRANSITIONS = ["fade","cut","wipe","wipe-up","slide-left","slide-right","slide-up","zoom","iris","flash","whip"];
const FONTS = {
  grotesk: '"Space Grotesk", system-ui, sans-serif',
  sans:    'Inter, system-ui, -apple-system, sans-serif',
  display: '"Archivo Black", Impact, system-ui, sans-serif',
  rounded: '"Baloo 2", "Nunito", system-ui, sans-serif',
  serif:   '"Playfair Display", Georgia, serif',
  mono:    '"JetBrains Mono", ui-monospace, Menlo, monospace',
};
const SIZES = ["xs","sm","md","lg","xl","2xl"];

const FONT_S  = { xs:20, sm:30, md:46, lg:70, xl:104, "2xl":150 };
const CAP_S   = { xs:18, sm:24, md:32, lg:42, xl:54,  "2xl":72 };
const ICON_S  = { xs:26, sm:40, md:64, lg:96, xl:140, "2xl":200 };
const RECT_S  = { xs:[80,52], sm:[130,84], md:[260,160], lg:[520,320], xl:[740,460], "2xl":[920,560] };
const CIRC_S  = { xs:44, sm:70, md:150, lg:280, xl:460, "2xl":620 };
const LINE_S  = { xs:[70,4], sm:[120,6], md:[240,7], lg:[420,8], xl:[640,10], "2xl":[880,12] };
const AVA_S   = { xs:70, sm:110, md:180, lg:260, xl:360, "2xl":460 };
const SCENE_T = 0.38;   // default transition length (s)

/* ---------------- colors ---------------- */
function hexToRgb(h) {
  if (typeof h !== "string") return null;
  let s = h.trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}
function mix(a, b, f) {
  const A = hexToRgb(a) || [0,0,0], B = hexToRgb(b) || [255,255,255];
  const m = A.map((v,i) => Math.round(v + (B[i]-v)*f));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
function rgba(h, al) { const c = hexToRgb(h) || [255,255,255]; return `rgba(${c[0]},${c[1]},${c[2]},${al})`; }
function luma(h) { const c = hexToRgb(h) || [0,0,0]; return (.2126*c[0] + .7152*c[1] + .0722*c[2]) / 255; }
/** resolve a color token: palette key | #hex | rgb()/hsl() | fallback */
function colorOf(pal, v, fb) {
  if (typeof v === "string") {
    if (pal && typeof pal[v] === "string" && hexToRgb(pal[v])) return pal[v];
    if (hexToRgb(v)) return "#" + v.trim().replace(/^#/, "");
    if (/^(rgb|hsl)a?\(/i.test(v.trim())) return v.trim();
    if (v === "none" || v === "transparent") return "transparent";
  }
  return fb;
}

/* ---------------- small builders ---------------- */
const U = v => `calc(var(--u) * ${v})`;
function el(tag, cls) { const n = document.createElement(tag); if (cls) n.className = cls; return n; }
function seeded(str) { let h = 2166136261; const s = String(str || "seed");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }

const SHADOWS = {
  none: () => "none",
  soft: c => `0 ${U(14)} ${U(46)} ${rgba(c, .28)}`,
  lift: c => `0 ${U(26)} ${U(70)} ${rgba(c, .40)}`,
  hard: c => `${U(10)} ${U(10)} 0 ${rgba(c, .95)}`,
  glow: c => `0 0 ${U(46)} ${rgba(c, .55)}`,
  ring: c => `0 0 0 ${U(3)} ${rgba(c, .85)}`,
};

/* ============================================================
   BUILD
   ============================================================ */
function build(spec, stage) {
  stage.innerHTML = "";
  const meta = spec.meta || {};
  const pal = normalizePalette(spec.palette);
  let W = num(meta.width, 0), H = num(meta.height, 0);
  if (!(W > 0 && H > 0)) { const r = RATIOS[meta.ratio] || RATIOS["16:9"]; W = r[0]; H = r[1]; }

  stage.style.setProperty("--ar", (W / H).toString());
  stage.style.background = pal.bg;
  stage.style.fontFamily = FONTS[meta.font] || FONTS.grotesk;
  stage.dataset.light = luma(pal.bg) > .55 ? "1" : "0";

  const flash = el("div", "stage-flash");
  const scenes = (spec.scenes || []).map((sc, i, arr) => buildScene(sc, i, arr.length, pal, meta, stage));
  stage.appendChild(flash);

  return { duration: num(meta.duration, 6), scenes, pal, meta, W, H, flash,
           light: luma(pal.bg) > .55 };
}

function normalizePalette(p) {
  const pal = Object.assign({ bg:"#0b0e17", primary:"#ffffff", accent:"#5eead4",
                              secondary:"#94a3b8", ink:"#0b0e17", surface:"#151a23" }, p || {});
  ["bg","primary","accent"].forEach(k => {
    if (!hexToRgb(pal[k])) pal[k] = k === "bg" ? "#0b0e17" : k === "primary" ? "#ffffff" : "#5eead4";
  });
  return pal;
}

function buildScene(sc, idx, total, pal, meta, stage) {
  sc = sc || {};
  const node = el("div", "scene");
  const cam  = el("div", "cam");
  node.appendChild(cam);
  sceneBackground(cam, sc, pal);
  stage.appendChild(node);

  const dur = num(sc.end, 1) - num(sc.start, 0);
  const list = (Array.isArray(sc.elements) ? sc.elements : []).filter(e => e && typeof e === "object" && TYPES.includes(e.type));

  const byId = {};
  list.forEach(e => { if (e.id) byId[e.id] = e; });

  /* start times: explicit > parent+offset > auto stagger */
  let autoIdx = 0;
  const memo = new Map(), sib = new Map();
  const stagger = num(sc.stagger, 0.18);
  function resolveStart(e, depth) {
    if (memo.has(e)) return memo.get(e);
    let s;
    if (typeof e.start === "number" && isFinite(e.start)) s = e.start;
    else if (e.parent && byId[e.parent] && byId[e.parent] !== e && depth < 12) {
      const n = sib.get(e.parent) || 0; sib.set(e.parent, n + 1);
      s = resolveStart(byId[e.parent], depth + 1) + 0.1 + n * 0.15;
    } else s = (autoIdx++) * stagger;
    memo.set(e, s); return s;
  }

  const records = list.map(e => buildRecord(e, resolveStart(e, 0), dur, pal, meta));

  /* nest children in parents so they inherit motion */
  const recById = {};
  records.forEach(r => { if (r.el.id) recById[r.el.id] = r; });
  records.forEach(r => {
    let host = cam;
    const p = r.el.parent && recById[r.el.parent];
    if (p && p !== r) {
      let cur = p, ok = true, seen = new Set([r]);
      while (cur) { if (seen.has(cur)) { ok = false; break; } seen.add(cur); cur = cur.el.parent ? recById[cur.el.parent] : null; }
      if (ok) host = p.inner || p.node;
    }
    host.appendChild(r.node);
  });

  const camSpec = sc.camera && typeof sc.camera === "object" ? sc.camera : null;
  return {
    id: sc.id || "", node, cam, start: num(sc.start, 0), end: num(sc.end, 1), dur, records,
    transition: TRANSITIONS.includes(sc.transition) ? sc.transition : "fade",
    transD: Math.max(.05, num(sc.transitionDuration, SCENE_T)),
    camera: camSpec ? {
      from: camSpec.from || {}, to: camSpec.to || {}, ease: easeFn(camSpec.ease || "inOutCubic"),
    } : null,
    isFirst: idx === 0, isLast: idx === total - 1,
  };
}

/* -------- scene background -------- */
function sceneBackground(cam, sc, pal) {
  const o = sc.backgroundOptions || {};
  const bg = BACKGROUNDS.includes(sc.background) ? sc.background : "solid";
  const base = colorOf(pal, o.color, pal.bg);
  const c2   = colorOf(pal, o.color2, pal.accent);
  const ang  = num(o.angle, 135);
  const strength = num(o.opacity, bg === "grid" || bg === "dots" || bg === "stripes" ? .12 : .22);
  const cell = num(o.size, 70);
  const layer = el("div", "bg-layer");
  layer.style.background = base;

  if (bg === "gradient-linear")
    layer.style.background = `linear-gradient(${ang}deg, ${mix(base, pal.primary, .18)} 0%, ${base} 52%, ${mix(base, c2, strength)} 100%)`;
  else if (bg === "gradient-radial")
    layer.style.background = `radial-gradient(circle at ${num(o.x,50)}% ${num(o.y,38)}%, ${mix(base, c2, strength)} 0%, ${base} 68%)`;
  else if (bg === "gradient-conic")
    layer.style.background = `conic-gradient(from ${ang}deg at ${num(o.x,50)}% ${num(o.y,50)}%, ${mix(base,c2,strength)}, ${base}, ${mix(base,pal.primary,.16)}, ${mix(base,c2,strength)})`;
  else if (bg === "mesh")
    layer.style.background =
      `radial-gradient(closest-side at 18% 22%, ${rgba(c2, .35)}, transparent),` +
      `radial-gradient(closest-side at 82% 18%, ${rgba(colorOf(pal, o.color3, pal.primary), .22)}, transparent),` +
      `radial-gradient(closest-side at 62% 88%, ${rgba(c2, .25)}, transparent), ${base}`;
  else if (bg === "grid") {
    const ln = rgba(colorOf(pal, o.lineColor, pal.primary), strength);
    layer.style.background =
      `repeating-linear-gradient(0deg, ${ln} 0 1px, transparent 1px ${U(cell)}),` +
      `repeating-linear-gradient(90deg, ${ln} 0 1px, transparent 1px ${U(cell)}), ${base}`;
  } else if (bg === "dots") {
    const ln = rgba(colorOf(pal, o.lineColor, pal.primary), strength + .1);
    layer.style.background = `radial-gradient(${ln} ${U(3)}, transparent ${U(3.5)}), ${base}`;
    layer.style.backgroundSize = `${U(cell)} ${U(cell)}`;
  } else if (bg === "stripes") {
    const ln = rgba(colorOf(pal, o.lineColor, pal.primary), strength);
    layer.style.background = `repeating-linear-gradient(${ang}deg, ${ln} 0 ${U(cell/6)}, transparent ${U(cell/6)} ${U(cell/2)}), ${base}`;
  } else if (bg === "noise") {
    layer.style.background = base;
    layer.appendChild(noiseLayer(strength));
  } else if (bg === "paper") {
    layer.style.background = `linear-gradient(180deg, ${mix(base, "#ffffff", .5)} 0%, ${base} 45%, ${mix(base, "#000000", .06)} 100%)`;
    layer.appendChild(noiseLayer(.05));
  } else if (bg === "vignette") {
    layer.style.background = `radial-gradient(circle at 50% 45%, ${mix(base, pal.primary, .10)} 0%, ${base} 55%, ${mix(base, "#000000", .55)} 120%)`;
  } else if (bg === "spotlight") {
    layer.style.background = `radial-gradient(ellipse ${num(o.size,60)}% ${num(o.size,45)}% at ${num(o.x,50)}% ${num(o.y,42)}%, ${mix(base, c2, .38)} 0%, ${base} 70%)`;
  } else if (bg === "image" && typeof o.src === "string") {
    layer.style.background = `${base} center/cover no-repeat url("${o.src}")`;
    if (num(o.dim, 0) > 0) {
      const d = el("div"); d.style.cssText = `position:absolute;inset:0;background:${rgba(base, num(o.dim, .4))};`;
      layer.appendChild(d);
    }
  }
  cam.appendChild(layer);
}
function noiseLayer(op) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"/></filter><rect width="120" height="120" filter="url(#n)" opacity="1"/></svg>`;
  const d = el("div", "noise");
  d.style.backgroundImage = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  d.style.opacity = String(op);
  return d;
}

/* ============================================================
   ELEMENT RECORDS
   ============================================================ */
function buildRecord(e, start, sceneDur, pal, meta) {
  const entName = ENTRANCES[e.entrance] ? e.entrance : (e.entrance ? "fade-in" : "fade-in");
  const entDef = ENTRANCES[entName];
  const ent = { d: Math.max(.001, num(e.entranceDuration, entDef.d)), fn: entDef.fn || (() => ({})),
                split: entDef.split || null, cfn: entDef.cfn || null, ease: e.ease ? easeFn(e.ease) : null };
  const exitDef = e.exit ? (EXITS[e.exit] || EXITS["fade-out"]) : null;
  const exit = exitDef ? { d: Math.max(.001, num(e.exitDuration, exitDef.d)), fn: exitDef.fn } : null;
  const idle = (e.idle && e.idle !== "none" && IDLES[e.idle]) ? IDLES[e.idle] : null;

  const hasEnd = typeof e.end === "number" && isFinite(e.end);
  const end = hasEnd ? Math.min(e.end, sceneDur + 5) : sceneDur + 5;

  const built = buildNode(e, pal, meta, ent.split);
  const kfs = Array.isArray(e.keyframes)
    ? e.keyframes.filter(k => k && typeof k === "object" && isFinite(k.t))
        .map(k => ({ t: num(k.t, 0), x: k.x, y: k.y, scale: k.scale, rotate: k.rotate,
                     opacity: k.opacity, blur: k.blur, ease: easeFn(k.ease || "inOutCubic") }))
        .sort((a, b) => a.t - b.t)
    : null;

  return Object.assign({
    el: e, start: Math.max(0, start), end, hasEnd, ent, exit, idle,
    idleAmt: num(e.idleAmount, 1), idleSpd: num(e.idleSpeed, 1),
    kfs, base: {
      rot: num(e.rotate, 0), s: num(e.scale, 1), o: num(e.opacity, 1),
      rx: num(e.tilt && e.tilt.x, 0), ry: num(e.tilt && e.tilt.y, 0), skew: num(e.skew, 0),
    },
  }, built);
}

/* ---- node factory: returns { node, inner?, chars?, dyn? } ---- */
function buildNode(e, pal, meta, split) {
  const n = el("div", "el el-" + e.type);
  const pos = e.position || {};
  n.style.left = num(pos.x, 50) + "%";
  n.style.top  = num(pos.y, 50) + "%";
  if (typeof e.zIndex === "number") n.style.zIndex = String(e.zIndex);
  n.style.visibility = "hidden";

  const size = SIZES.includes(e.size) ? e.size : "md";
  const fg = colorOf(pal, e.color, pal.primary);
  const out = { node: n, inner: null, chars: null, dyn: null };
  const shadow = e.shadow && SHADOWS[e.shadow] ? SHADOWS[e.shadow] : null;
  const shadowColor = colorOf(pal, e.shadowColor, e.shadow === "glow" ? fg : "#000000");
  if (shadow) n.style.boxShadow = shadow(shadowColor);

  switch (e.type) {
    case "text":
    case "caption": {
      const table = e.type === "caption" ? CAP_S : FONT_S;
      styleText(n, e, pal, table[size], fg, meta);
      if (e.type === "caption") {
        const chip = e.chip !== false;
        if (chip) {
          n.style.background = colorOf(pal, e.chipColor, luma(pal.bg) > .55 ? rgba("#000000", .06) : rgba("#ffffff", .08));
          n.style.border = `1px solid ${colorOf(pal, e.chipBorder, luma(pal.bg) > .55 ? rgba("#000000", .14) : rgba("#ffffff", .14))}`;
          n.style.borderRadius = typeof e.radius === "number" ? U(e.radius) : "999px";
          n.style.padding = ".42em 1em";
        }
        n.style.maxWidth = U(num(e.maxWidth, 880));
        n.style.whiteSpace = "pre-wrap";
      }
      out.chars = fillText(n, e, split, pal, fg);
      break;
    }
    case "icon": {
      n.textContent = ICONS[String(e.content || "").toLowerCase()] || e.content || "✦";
      n.style.fontSize = U(num(e.fontSize, ICON_S[size]));
      n.style.color = fg;
      if (e.glow !== false && !/[\u{1F300}-\u{1FAFF}]/u.test(n.textContent))
        n.style.textShadow = `0 0 ${U(18)} ${rgba(fg, .5)}`;
      break;
    }
    case "image": {
      const w = num(e.w, RECT_S[size][0]);
      const img = el("img");
      img.src = e.src || "";
      img.alt = e.alt || "";
      img.style.width = U(w);
      if (num(e.h, 0) > 0) { img.style.height = U(e.h); img.style.objectFit = e.fit || "cover"; }
      img.style.borderRadius = e.radius === "pill" ? "999px" : U(num(e.radius, 0));
      img.style.display = "block";
      if (e.circle) { img.style.borderRadius = "50%"; img.style.height = U(w); img.style.objectFit = "cover"; }
      n.appendChild(img);
      break;
    }
    case "shape":  buildShape(n, e, pal, size, fg); break;
    case "avatar-placeholder": {
      const d = num(e.w, AVA_S[size]);
      n.classList.add("avatar");
      n.style.width = U(d); n.style.height = U(d);
      n.style.background = mix(pal.bg, "#ffffff", luma(pal.bg) > .55 ? .0 : .09);
      n.style.border = `${U(3)} solid ${rgba(fg, .85)}`;
      if (!shadow) n.style.boxShadow = `0 0 ${U(30)} ${rgba(fg, .22)}`;
      const head = el("div", "av-head"), body = el("div", "av-body");
      head.style.background = rgba(fg, .5); body.style.background = rgba(fg, .5);
      n.appendChild(head); n.appendChild(body);
      break;
    }
    case "counter": {
      styleText(n, e, pal, FONT_S[size], fg, meta);
      n.textContent = "0";
      out.dyn = { kind: "counter", from: num(e.from, 0), to: num(e.to, 100),
                  dec: Math.max(0, Math.min(4, num(e.decimals, 0))),
                  prefix: e.prefix || "", suffix: e.suffix || "",
                  dur: Math.max(.1, num(e.countDuration, 1.4)), ease: easeFn(e.countEase || "outQuart"),
                  sep: e.separator !== false };
      break;
    }
    case "progress": {
      const w = num(e.w, RECT_S[size][0]), h = num(e.h, Math.max(8, Math.round(w * .045)));
      n.style.width = U(w); n.style.height = U(h);
      n.style.borderRadius = U(h);
      n.style.background = colorOf(pal, e.track, rgba(fg, .16));
      n.style.overflow = "hidden";
      const fill = el("div");
      fill.style.cssText = `height:100%;width:0%;border-radius:inherit;background:${colorOf(pal, e.fill, fg)};`;
      n.appendChild(fill);
      out.dyn = { kind: "progress", node: fill, value: clamp01(num(e.value, .7)),
                  dur: Math.max(.1, num(e.fillDuration, 1.1)), ease: easeFn(e.fillEase || "outQuart") };
      break;
    }
    case "bar-chart": {
      const vals = (Array.isArray(e.values) ? e.values : [.4,.7,.5,.9,.65]).map(v => clamp01(num(v, .5)));
      const w = num(e.w, RECT_S[size][0]), h = num(e.h, Math.round(w * .55));
      const gap = num(e.gap, w * .04);
      n.style.width = U(w); n.style.height = U(h);
      n.style.display = "flex"; n.style.alignItems = "flex-end"; n.style.gap = U(gap);
      const bars = vals.map((v, i) => {
        const b = el("div");
        const c = Array.isArray(e.colors) ? colorOf(pal, e.colors[i % e.colors.length], fg) : fg;
        b.style.cssText = `flex:1;height:0%;border-radius:${U(num(e.radius, 8))} ${U(num(e.radius, 8))} ${U(2)} ${U(2)};background:${c};`;
        n.appendChild(b); return b;
      });
      out.dyn = { kind: "bars", nodes: bars, values: vals,
                  dur: Math.max(.1, num(e.growDuration, .8)), stagger: num(e.barStagger, .09),
                  ease: easeFn(e.growEase || "outBack") };
      break;
    }
    case "sparkline": {
      const vals = (Array.isArray(e.values) ? e.values : [.2,.5,.35,.7,.55,.9]).map(v => clamp01(num(v, .5)));
      const w = num(e.w, RECT_S[size][0]), h = num(e.h, Math.round(w * .4));
      n.style.width = U(w); n.style.height = U(h);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 100 100`); svg.setAttribute("preserveAspectRatio", "none");
      svg.style.cssText = "width:100%;height:100%;overflow:visible;";
      const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${100 - v * 92 - 4}`).join(" ");
      if (e.area !== false) {
        const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        area.setAttribute("points", `0,100 ${pts} 100,100`);
        area.setAttribute("fill", rgba(fg, .16));
        svg.appendChild(area);
      }
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", pts);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", fg);
      line.setAttribute("stroke-width", String(num(e.strokeWidth, 3)));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(line);
      n.appendChild(svg);
      out.dyn = { kind: "spark", node: n, dur: Math.max(.1, num(e.drawDuration, 1.0)), ease: easeFn(e.drawEase || "outQuart") };
      break;
    }
    case "grid-overlay": {
      const w = num(e.w, 700), h = num(e.h, 420);
      const cols = Math.max(1, Math.round(num(e.cols, 4))), rows = Math.max(1, Math.round(num(e.rows, 4)));
      n.style.width = U(w); n.style.height = U(h);
      const c = rgba(fg, num(e.lineOpacity, .35));
      const style = e.strokeStyle === "dashed" ? "dashed" : e.strokeStyle === "dotted" ? "dotted" : "solid";
      n.style.background =
        `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px ${U(w / cols)}),` +
        `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px ${U(h / rows)})`;
      n.style.border = `1px ${style} ${c}`;
      if (e.nodes !== false) {
        for (let r = 0; r <= rows; r++) for (let cI = 0; cI <= cols; cI++) {
          const d = el("div");
          d.style.cssText = `position:absolute;width:${U(5)};height:${U(5)};border-radius:50%;background:${rgba(fg,.55)};`
            + `left:calc(${(cI / cols) * 100}% - ${U(2.5)});top:calc(${(r / rows) * 100}% - ${U(2.5)});`;
          n.appendChild(d);
        }
      }
      break;
    }
    case "barcode": {
      const w = num(e.w, 260), h = num(e.h, 90);
      const rnd = seeded(e.seed || e.content || "barcode");
      n.style.width = U(w); n.style.height = U(h);
      n.style.display = "flex"; n.style.alignItems = "stretch"; n.style.gap = U(num(e.gap, 3));
      const count = Math.max(6, Math.round(num(e.bars, 34)));
      for (let i = 0; i < count; i++) {
        const b = el("div");
        b.style.cssText = `flex:${(rnd() * 2.2 + .5).toFixed(2)};background:${rnd() > .28 ? fg : "transparent"};`;
        n.appendChild(b);
      }
      break;
    }
    case "cursor": {
      const s = num(e.w, 60);
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.style.cssText = `width:${U(s)};height:${U(s)};display:block;filter:drop-shadow(0 ${U(4)} ${U(8)} rgba(0,0,0,.35));`;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M4 2 L20 12.4 L12.6 13.2 L16.2 21 L13 22.4 L9.4 14.6 L4 19.6 Z");
      path.setAttribute("fill", fg);
      path.setAttribute("stroke", colorOf(pal, e.stroke, luma(fg) > .5 ? "#111111" : "#ffffff"));
      path.setAttribute("stroke-width", String(num(e.strokeWidth, 1)));
      svg.appendChild(path);
      n.appendChild(svg);
      n.style.transformOrigin = "top left";
      const ring = el("div", "click-ring");
      ring.style.cssText = `position:absolute;left:0;top:0;width:${U(s * .9)};height:${U(s * .9)};margin-left:${U(-s * .45)};`
        + `margin-top:${U(-s * .45)};border-radius:50%;border:${U(3)} solid ${fg};opacity:0;`;
      n.appendChild(ring);
      out.dyn = { kind: "cursor", ring, clicks: (Array.isArray(e.clicks) ? e.clicks : []).map(v => num(v, 0)) };
      break;
    }
    case "playhead": {
      const h = num(e.h, 420), wid = num(e.strokeWidth, 6);
      n.style.width = U(wid); n.style.height = U(h);
      n.style.background = fg;
      const head = el("div");
      head.style.cssText = `position:absolute;left:50%;top:${U(-num(e.headSize, 34) * .82)};transform:translateX(-50%);`
        + `width:0;height:0;border-left:${U(num(e.headSize, 34) * .7)} solid transparent;`
        + `border-right:${U(num(e.headSize, 34) * .7)} solid transparent;border-top:${U(num(e.headSize, 34) * .85)} solid ${fg};`;
      n.appendChild(head);
      break;
    }
    case "clip": {
      const w = num(e.w, 300), h = num(e.h, 82);
      n.style.width = U(w); n.style.height = U(h);
      n.style.borderRadius = U(num(e.radius, 14));
      n.style.background = colorOf(pal, e.fill, "#3a3f45");
      n.style.display = "flex"; n.style.alignItems = "center"; n.style.gap = U(12);
      n.style.padding = `0 ${U(16)}`;
      if (!shadow) n.style.boxShadow = `0 ${U(10)} ${U(26)} rgba(0,0,0,.35)`;
      if (e.label) {
        const lb = el("div");
        lb.textContent = e.label;
        lb.style.cssText = `font-size:${U(num(e.labelSize, 26))};font-weight:700;color:${colorOf(pal, e.labelColor, "#ffffff")};white-space:nowrap;`;
        n.appendChild(lb);
      }
      const wave = el("div");
      wave.style.cssText = `flex:1;display:flex;align-items:center;gap:${U(4)};height:60%;`;
      const rnd = seeded(e.seed || e.label || "wave");
      const bars = Math.max(6, Math.round(num(e.bars, 16)));
      for (let i = 0; i < bars; i++) {
        const b = el("div");
        const hh = 18 + rnd() * 82;
        b.style.cssText = `flex:1;height:${hh}%;border-radius:${U(3)};background:${colorOf(pal, e.waveColor, rgba("#ffffff", .55))};`;
        wave.appendChild(b);
      }
      n.appendChild(wave);
      break;
    }
    case "marker": {
      const d = num(e.w, CIRC_S[size === "md" ? "sm" : size] || 70);
      const state = ["check","cross","dot","number","none"].includes(e.state) ? e.state : "check";
      n.style.width = U(d); n.style.height = U(d);
      n.style.borderRadius = "50%";
      n.style.border = `${U(num(e.strokeWidth, 4))} solid ${fg}`;
      n.style.background = colorOf(pal, e.fill, "transparent");
      n.style.display = "flex"; n.style.alignItems = "center"; n.style.justifyContent = "center";
      const g = el("div");
      g.textContent = state === "check" ? "✓" : state === "cross" ? "✕" : state === "dot" ? "●"
                    : state === "number" ? String(e.content ?? "1") : "";
      g.style.cssText = `font-size:${U(d * (state === "number" ? .5 : .52))};line-height:1;font-weight:800;color:${colorOf(pal, e.glyphColor, fg)};`;
      n.appendChild(g);
      break;
    }
    case "card": {
      const [dw, dh] = RECT_S[size];
      const w = num(e.w, dw), h = num(e.h, dh);
      const tone = e.tone === "light" ? "light" : e.tone === "accent" ? "accent" : "dark";
      const bgc = colorOf(pal, e.fill, tone === "light" ? "#f4f4f5" : tone === "accent" ? pal.accent : "#141414");
      const ink = colorOf(pal, e.ink, luma(bgc) > .55 ? "#111114" : "#f6f6f7");
      n.style.width = U(w); n.style.height = U(h);
      n.style.background = bgc;
      n.style.borderRadius = U(num(e.radius, 22));
      n.style.overflow = "hidden";
      n.style.padding = U(num(e.padding, 26));
      if (!shadow) n.style.boxShadow = `0 ${U(26)} ${U(60)} rgba(0,0,0,.42)`;
      if (e.label) {
        const lb = el("div");
        lb.textContent = e.label;
        lb.style.cssText = `font-size:${U(num(e.labelSize, 18))};letter-spacing:.14em;text-transform:uppercase;`
          + `font-weight:700;color:${rgba(ink, .7)};margin-bottom:${U(14)};`;
        n.appendChild(lb);
      }
      if (e.title) {
        const ti = el("div");
        ti.textContent = e.title;
        ti.style.cssText = `font-size:${U(num(e.titleSize, Math.round(h * .17)))};font-weight:800;line-height:1.02;`
          + `color:${ink};letter-spacing:-.02em;${e.uppercase === false ? "" : "text-transform:uppercase;"}`;
        n.appendChild(ti);
      }
      const lines = Math.max(0, Math.round(num(e.lines, 3)));
      if (lines) {
        const wrap = el("div");
        wrap.style.cssText = `margin-top:${U(18)};display:flex;flex-direction:column;gap:${U(10)};`;
        const rnd = seeded(e.id || e.title || "card");
        for (let i = 0; i < lines; i++) {
          const l = el("div");
          l.style.cssText = `height:${U(num(e.lineHeightPx, 8))};border-radius:999px;background:${rgba(ink, .22)};width:${(45 + rnd() * 52).toFixed(0)}%;`;
          wrap.appendChild(l);
        }
        n.appendChild(wrap);
      }
      if (e.big) {
        const b = el("div");
        b.textContent = e.big;
        b.style.cssText = `position:absolute;right:${U(18)};bottom:${U(-h * .12)};font-size:${U(h * .78)};`
          + `font-weight:900;line-height:.8;color:${rgba(ink, num(e.bigOpacity, .9))};letter-spacing:-.05em;`;
        n.appendChild(b);
      }
      out.inner = n;
      break;
    }
    case "device": {
      const w = num(e.w, 300), h = num(e.h, Math.round(w * 2.05));
      n.style.width = U(w); n.style.height = U(h);
      n.style.borderRadius = U(num(e.radius, w * .13));
      n.style.background = colorOf(pal, e.frame, "#0d0f12");
      n.style.padding = U(num(e.bezel, w * .035));
      if (!shadow) n.style.boxShadow = `0 ${U(30)} ${U(70)} rgba(0,0,0,.5)`;
      const screen = el("div");
      screen.style.cssText = `position:relative;width:100%;height:100%;overflow:hidden;`
        + `border-radius:${U(num(e.radius, w * .13) * .82)};background:${colorOf(pal, e.screen, pal.bg)};`;
      n.appendChild(screen);
      const notch = el("div");
      notch.style.cssText = `position:absolute;left:50%;top:${U(w * .05)};transform:translateX(-50%);width:${U(w * .3)};`
        + `height:${U(w * .06)};border-radius:999px;background:${colorOf(pal, e.frame, "#0d0f12")};z-index:5;`;
      screen.appendChild(notch);
      out.inner = screen;
      break;
    }
  }
  if (e.blur != null && num(e.blur, 0) > 0) n.dataset.baseBlur = String(num(e.blur, 0));
  if (e.mixBlend) n.style.mixBlendMode = e.mixBlend;
  if (!out.inner) out.inner = n;
  out.anchor = e.anchor || (e.type === "cursor" ? "top-left" : "center");
  if (out.anchor === "top-left") n.style.transformOrigin = "top left";
  return out;
}

/* ---- shapes ---- */
function buildShape(n, e, pal, size, fg) {
  const shape = SHAPES.includes(e.shape) ? e.shape : "rect";
  const strokeC = e.stroke ? colorOf(pal, e.stroke, fg) : null;
  const sw = num(e.strokeWidth, 4);
  const style = ["dashed","dotted","solid"].includes(e.strokeStyle) ? e.strokeStyle : "solid";
  const fill = e.fill !== undefined ? colorOf(pal, e.fill, "transparent") : null;
  const glow = e.variant === "glow";

  const applyBox = (w, h) => { n.style.width = U(w); n.style.height = U(h); };
  const paint = (defaultFill) => {
    if (glow) return;
    n.style.background = fill !== null ? fill : defaultFill;
    if (strokeC) n.style.border = `${U(sw)} ${style} ${strokeC}`;
  };

  if (shape === "circle" || shape === "ring") {
    const d = num(e.w, CIRC_S[size]);
    applyBox(d, num(e.h, d));
    n.style.borderRadius = "50%";
    if (glow) n.style.background = `radial-gradient(circle, ${rgba(fg,.75)} 0%, ${rgba(fg,.28)} 40%, transparent 70%)`;
    else if (shape === "ring") { n.style.background = fill !== null ? fill : "transparent"; n.style.border = `${U(sw)} ${style} ${strokeC || fg}`; }
    else paint(fg);
  } else if (shape === "ellipse") {
    const w = num(e.w, RECT_S[size][0]);
    applyBox(w, num(e.h, Math.round(w * .55)));
    n.style.borderRadius = "50%";
    if (glow) n.style.background = `radial-gradient(ellipse, ${rgba(fg,.7)} 0%, ${rgba(fg,.25)} 42%, transparent 72%)`;
    else paint(fg);
  } else if (shape === "line") {
    const [dw, dh] = LINE_S[size];
    const w = num(e.w, dw), h = num(e.h, dh);
    applyBox(w, h);
    n.style.borderRadius = U(h);
    n.style.background = e.solid === true || fill !== null
      ? (fill !== null ? fill : fg)
      : `linear-gradient(90deg, transparent, ${fg} 18%, ${fg} 82%, transparent)`;
    if (e.glow !== false && !e.solid) n.style.boxShadow = `0 0 ${U(14)} ${rgba(fg, .45)}`;
  } else if (shape === "pill" || shape === "rect") {
    const [dw, dh] = RECT_S[size];
    applyBox(num(e.w, dw), num(e.h, dh));
    n.style.borderRadius = shape === "pill" ? "999px" : (e.radius === "pill" ? "999px" : U(num(e.radius, 20)));
    if (e.variant === "panel") {
      n.style.background = `linear-gradient(160deg, ${mix(pal.bg, "#ffffff", .10)}, ${mix(pal.bg, "#ffffff", .045)})`;
      n.style.border = `1px solid ${mix(pal.bg, "#ffffff", .22)}`;
      if (!e.shadow) n.style.boxShadow = `0 ${U(12)} ${U(46)} rgba(0,0,0,.45)`;
      if (strokeC) n.style.border = `${U(sw)} ${style} ${strokeC}`;
    } else paint(rgba(fg, .92));
  } else if (shape === "triangle" || shape === "star" || shape === "arrow" || shape === "cross") {
    const d = num(e.w, CIRC_S[size]);
    applyBox(d, num(e.h, shape === "arrow" ? Math.round(d * .62) : d));
    n.style.background = fill !== null ? fill : fg;
    n.style.clipPath =
      shape === "triangle" ? "polygon(50% 0%, 100% 100%, 0% 100%)"
      : shape === "star" ? "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"
      : shape === "cross" ? "polygon(38% 0,62% 0,62% 38%,100% 38%,100% 62%,62% 62%,62% 100%,38% 100%,38% 62%,0 62%,0 38%,38% 38%)"
      : "polygon(0 30%,58% 30%,58% 0,100% 50%,58% 100%,58% 70%,0 70%)";
  } else if (shape === "blob") {
    const d = num(e.w, CIRC_S[size]);
    applyBox(d, num(e.h, Math.round(d * .92)));
    n.style.borderRadius = e.blobRadius || "42% 58% 63% 37% / 43% 38% 62% 57%";
    if (glow) n.style.background = `radial-gradient(circle at 40% 35%, ${rgba(fg,.8)} 0%, ${rgba(fg,.22)} 55%, transparent 75%)`;
    else paint(fg);
  }
  if (e.backdropBlur) n.style.backdropFilter = `blur(${U(num(e.backdropBlur, 8))})`;
}

/* ---- text styling + content ---- */
function styleText(n, e, pal, defSize, fg, meta) {
  n.style.fontSize = U(num(e.fontSize, defSize));
  n.style.color = fg;
  n.style.fontWeight = String(num(e.weight, e.type === "caption" ? 600 : 800));
  n.style.fontFamily = FONTS[e.font] || FONTS[meta && meta.font] || "";
  n.style.lineHeight = String(num(e.lineHeight, 1.08));
  if (e.tracking != null) n.style.letterSpacing = num(e.tracking, 0) / 100 + "em";
  if (e.uppercase) n.style.textTransform = "uppercase";
  if (e.italic) n.style.fontStyle = "italic";
  if (e.align) { n.style.textAlign = e.align; }
  if (num(e.maxWidth, 0) > 0) { n.style.maxWidth = U(e.maxWidth); n.style.whiteSpace = "pre-wrap"; if (!e.align) n.style.textAlign = "center"; }
  if (Array.isArray(e.gradient) && e.gradient.length >= 2) {
    const g = e.gradient.map(c => colorOf(pal, c, fg)).join(", ");
    n.style.backgroundImage = `linear-gradient(${num(e.gradientAngle, 100)}deg, ${g})`;
    n.style.webkitBackgroundClip = "text";
    n.style.backgroundClip = "text";
    n.style.color = "transparent";
  }
  if (e.textStroke) n.style.webkitTextStroke = `${U(num(e.textStrokeWidth, 2))} ${colorOf(pal, e.textStroke, fg)}`;
  if (e.textShadow === false) n.style.textShadow = "none";
  else if (typeof e.textShadow === "string") n.style.textShadow = `0 ${U(4)} ${U(18)} ${colorOf(pal, e.textShadow, "#000000")}`;
  else if (luma(pal.bg) > .55) n.style.textShadow = "none";
}

function fillText(n, e, split, pal, fg) {
  const runs = Array.isArray(e.content) ? e.content
             : [{ text: e.content == null ? "" : String(e.content) }];
  const chars = [];
  runs.forEach(raw => {
    const run = typeof raw === "string" ? { text: raw } : (raw || {});
    const text = run.text == null ? "" : String(run.text);
    const span = el("span", "run");
    if (run.color) span.style.color = colorOf(pal, run.color, fg);
    if (run.highlightColor) span.style.background = colorOf(pal, run.highlightColor, "transparent");
    if (run.weight) span.style.fontWeight = String(run.weight);
    if (run.italic) span.style.fontStyle = "italic";
    if (run.uppercase) span.style.textTransform = "uppercase";
    if (run.underline) span.style.textDecoration = "underline";
    if (run.size) span.style.fontSize = run.size + "em";
    if (run.font) span.style.fontFamily = FONTS[run.font] || run.font;
    if (run.highlight) { span.style.background = run.highlight; span.style.padding = "0 .18em"; span.style.borderRadius = ".12em"; }
    if (run.tracking != null) span.style.letterSpacing = run.tracking / 100 + "em";

    const pieces = text.split("\n");
    pieces.forEach((piece, pi) => {
      if (pi > 0) span.appendChild(el("br"));
      if (split === "chars" || split === "type") {
        for (const ch of piece) {
          const c = el("span", "ch");
          c.textContent = ch === " " ? "\u00A0" : ch;
          span.appendChild(c); chars.push(c);
        }
      } else if (split === "words") {
        piece.split(/(\s+)/).forEach(w => {
          if (!w) return;
          if (/^\s+$/.test(w)) { span.appendChild(document.createTextNode("\u00A0")); return; }
          const c = el("span", "ch wd");
          c.textContent = w;
          span.appendChild(c); chars.push(c);
        });
      } else span.appendChild(document.createTextNode(piece));
    });
    n.appendChild(span);
  });
  return chars.length ? chars : null;
}

/* recolor palette-token runs after build (needs palette) */
function applyRunColors(node, pal, fallback) {
  node.querySelectorAll(".run").forEach(s => {
    const tok = s.dataset.color;
    if (tok) s.style.color = colorOf(pal, tok, fallback);
  });
}

/* ============================================================
   DRAW
   ============================================================ */
function draw(comp, time) {
  if (!comp) return;
  let flash = 0;
  for (const sc of comp.scenes) {
    const tail = sc.isLast ? 0.0001 : sc.transD;
    const vis = time >= sc.start - 0.0001 && time <= sc.end + tail;
    if (!vis) { if (sc.node.style.display !== "none") sc.node.style.display = "none"; continue; }
    sc.node.style.display = "block";

    let op = 1, clip = "none", tx = 0, ty = 0, sscale = 1, sblur = 0;
    if (!sc.isFirst && sc.transition !== "cut") {
      const p = clamp01((time - sc.start) / sc.transD);
      const e = outCubic(p);
      switch (sc.transition) {
        case "wipe":        clip = `inset(0 0 0 ${(1 - e) * 100}%)`; break;
        case "wipe-up":     clip = `inset(${(1 - e) * 100}% 0 0 0)`; break;
        case "slide-left":  tx = (1 - e) * 100; break;
        case "slide-right": tx = -(1 - e) * 100; break;
        case "slide-up":    ty = (1 - e) * 100; break;
        case "zoom":        sscale = .82 + .18 * e; op *= Math.min(p * 2, 1); break;
        case "iris":        clip = `circle(${(e * 78 + 2)}% at 50% 50%)`; break;
        case "flash":       op *= Math.min(p * 3, 1); flash = Math.max(flash, 1 - Math.abs(p - .12) * 4); break;
        case "whip":        tx = (1 - e) * 60; sblur = (1 - e) * 16; op *= Math.min(p * 2.2, 1); break;
        default:            op *= e;
      }
    }
    if (!sc.isLast && time > sc.end) op *= 1 - clamp01((time - sc.end) / sc.transD);

    sc.node.style.opacity = String(op);
    sc.node.style.clipPath = clip;
    sc.node.style.transform = (tx || ty || sscale !== 1)
      ? `translate(${tx}%, ${ty}%) scale(${sscale})` : "";
    sc.node.style.filter = sblur ? `blur(${sblur.toFixed(2)}px)` : "";

    /* camera */
    if (sc.camera) {
      const cp = sc.camera.ease(clamp01((time - sc.start) / Math.max(.001, sc.dur)));
      const f = sc.camera.from, t2 = sc.camera.to;
      const z = lerp(num(f.zoom, 1), num(t2.zoom, 1), cp);
      const cx = lerp(num(f.x, 0), num(t2.x, 0), cp);
      const cy = lerp(num(f.y, 0), num(t2.y, 0), cp);
      const cr = lerp(num(f.rotate, 0), num(t2.rotate, 0), cp);
      sc.cam.style.transform = `scale(${z.toFixed(4)}) translate(${cx.toFixed(3)}%, ${cy.toFixed(3)}%) rotate(${cr.toFixed(3)}deg)`;
    }

    const ts = time - sc.start;
    for (const r of sc.records) updateElement(r, ts);
  }
  if (comp.flash) comp.flash.style.opacity = flash > 0 ? clamp01(flash).toFixed(3) : "0";
}

function sampleKeyframes(kfs, lt) {
  if (!kfs || !kfs.length) return null;
  if (lt <= kfs[0].t) return kfs[0];
  const last = kfs[kfs.length - 1];
  if (lt >= last.t) return last;
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (lt >= a.t && lt <= b.t) {
      const f = b.ease(clamp01((lt - a.t) / Math.max(.0001, b.t - a.t)));
      const pick = (k) => (b[k] != null || a[k] != null)
        ? lerp(num(a[k], num(b[k], 0)), num(b[k], num(a[k], 0)), f) : null;
      return { x: pick("x"), y: pick("y"), scale: pick("scale"), rotate: pick("rotate"),
               opacity: pick("opacity"), blur: pick("blur") };
    }
  }
  return last;
}

function updateElement(r, ts) {
  const st = r.node.style;
  if (ts < r.start - 0.0001) { st.visibility = "hidden"; return; }
  if (r.hasEnd && ts >= r.end && !r.exit) { st.visibility = "hidden"; return; }

  const lt = ts - r.start;                        // element-local time
  let o = r.base.o, dx = 0, dy = 0, s = r.base.s, rot = r.base.rot,
      rx = r.base.rx, ry = r.base.ry, skew = r.base.skew, clip = "none",
      blur = num(Number(r.node.dataset.baseBlur), 0), sy = 1;

  /* entrance */
  const ep = clamp01(lt / r.ent.d);
  const epE = r.ent.ease ? r.ent.ease(ep) : ep;
  if (!r.ent.split) {
    const e = r.ent.fn(epE);
    if (e.o != null) o *= e.o;
    if (e.dx) dx += e.dx;
    if (e.dy) dy += e.dy;
    if (e.s != null) s *= e.s;
    if (e.sy != null) sy *= e.sy;
    if (e.rot) rot += e.rot;
    if (e.rx) rx += e.rx;
    if (e.ry) ry += e.ry;
    if (e.skew) skew += e.skew;
    if (e.blur) blur += e.blur;
    if (e.clip) clip = e.clip;
  } else if (r.chars) {
    const n = r.chars.length;
    if (r.ent.split === "type") {
      const shown = Math.floor(epE * n + .0001);
      for (let i = 0; i < n; i++) r.chars[i].style.opacity = i < shown ? "1" : "0";
    } else {
      for (let i = 0; i < n; i++) {
        const cp = charProg(epE, i, n);
        const cv = r.ent.cfn(cp, i, n);
        const c = r.chars[i].style;
        c.opacity = cv.o != null ? String(cv.o) : "1";
        const parts = [];
        if (cv.dy) parts.push(`translateY(calc(var(--u) * ${cv.dy.toFixed(2)}))`);
        if (cv.dx) parts.push(`translateX(calc(var(--u) * ${cv.dx.toFixed(2)}))`);
        if (cv.rx) parts.push(`perspective(600px) rotateX(${cv.rx.toFixed(2)}deg)`);
        if (cv.s != null) parts.push(`scale(${Math.max(.001, cv.s).toFixed(3)})`);
        c.transform = parts.join(" ");
        c.filter = cv.blur ? `blur(${cv.blur.toFixed(2)}px)` : "";
        c.clipPath = cv.clipY != null ? `inset(${(cv.clipY * 115).toFixed(1)}% -12% -18% -12%)` : "";
      }
    }
  }

  /* exit */
  let exiting = false;
  if (r.exit) {
    const xs = r.end - r.exit.d;
    if (ts >= xs) {
      exiting = true;
      const xp = clamp01((ts - xs) / r.exit.d);
      if (xp >= 1) { st.visibility = "hidden"; return; }
      const x = r.exit.fn(xp);
      if (x.o != null) o *= x.o;
      if (x.dx) dx += x.dx;
      if (x.dy) dy += x.dy;
      if (x.s != null) s *= x.s;
      if (x.rot) rot += x.rot;
      if (x.rx) rx += x.rx;
      if (x.blur) blur += x.blur;
      if (x.clip) clip = x.clip;
    }
  }

  /* idle */
  if (r.idle && ep >= 1 && !exiting) {
    const it = lt - r.ent.d;
    const amp = Math.min(it / .6, 1) * r.idleAmt;
    const iv = r.idle(it, amp, r.idleSpd);
    if (iv.o != null) o *= iv.o;
    if (iv.dx) dx += iv.dx;
    if (iv.dy) dy += iv.dy;
    if (iv.s != null) s *= iv.s;
    if (iv.rot) rot += iv.rot;
  }

  /* keyframes (element-local seconds, additive on offsets, multiplicative on scale/opacity) */
  if (r.kfs) {
    const k = sampleKeyframes(r.kfs, lt);
    if (k) {
      if (k.x != null) dx += k.x;
      if (k.y != null) dy += k.y;
      if (k.scale != null) s *= k.scale;
      if (k.rotate != null) rot += k.rotate;
      if (k.opacity != null) o *= k.opacity;
      if (k.blur != null) blur += k.blur;
    }
  }

  /* dynamic sub-renderers */
  if (r.dyn) updateDynamic(r, lt);

  st.visibility = "visible";
  st.opacity = String(Math.max(0, Math.min(1, o)));
  st.clipPath = clip;
  st.filter = blur > .01 ? `blur(calc(var(--u) * ${blur.toFixed(2)}))` : "";
  const tf = [
    r.anchor === "top-left" ? "" : "translate(-50%,-50%)",
    (dx || dy) ? `translate(calc(var(--u) * ${dx.toFixed(2)}), calc(var(--u) * ${dy.toFixed(2)}))` : "",
    (rx || ry) ? `perspective(${num(r.el.perspective, 1200)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)` : "",
    rot ? `rotate(${rot.toFixed(2)}deg)` : "",
    skew ? `skewX(${skew.toFixed(2)}deg)` : "",
    (s !== 1 || sy !== 1) ? `scale(${s.toFixed(4)}, ${(s * sy).toFixed(4)})` : "",
  ].filter(Boolean).join(" ");
  st.transform = tf;
}

function updateDynamic(r, lt) {
  const d = r.dyn;
  if (d.kind === "counter") {
    const p = d.ease(clamp01(lt / d.dur));
    const v = lerp(d.from, d.to, p);
    let sVal = v.toFixed(d.dec);
    if (d.sep) sVal = sVal.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    r.node.textContent = d.prefix + sVal + d.suffix;
  } else if (d.kind === "progress") {
    const p = d.ease(clamp01(lt / d.dur));
    d.node.style.width = (p * d.value * 100).toFixed(2) + "%";
  } else if (d.kind === "bars") {
    d.nodes.forEach((b, i) => {
      const p = d.ease(clamp01((lt - i * d.stagger) / d.dur));
      b.style.height = Math.max(0, p * d.values[i] * 100).toFixed(2) + "%";
    });
  } else if (d.kind === "spark") {
    const p = d.ease(clamp01(lt / d.dur));
    r.node.style.clipPath = `inset(-20% ${((1 - p) * 100).toFixed(2)}% -20% -2%)`;
  } else if (d.kind === "cursor") {
    let ring = 0;
    for (const c of d.clicks) {
      const q = (lt - c) / .45;
      if (q >= 0 && q <= 1) ring = Math.max(ring, 1 - q);
    }
    d.ring.style.opacity = ring ? (ring * .9).toFixed(2) : "0";
    d.ring.style.transform = ring ? `scale(${(1 + (1 - ring) * 1.5).toFixed(2)})` : "scale(1)";
  }
}

/* ---------------- export ---------------- */
global.MG = Object.assign(global.MG || {}, {
  Engine: {
    build, draw, applyRunColors,
    EASE, ENTRANCES, IDLES, EXITS, ICONS, RATIOS, TYPES, SHAPES,
    BACKGROUNDS, TRANSITIONS, FONTS, SIZES,
    hexToRgb, colorOf, mix, rgba, luma, clamp01,
  },
});
})(window);
