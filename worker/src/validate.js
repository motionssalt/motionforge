/* ============================================================
   MotionForge Worker — server-side spec validator
   ------------------------------------------------------------
   This is a FAITHFUL PORT of js/validate.js from the studio
   repo (not a divergent second validator). The browser version
   reads catalogues off `window.MG.Engine`; here we inline just
   the catalogues it needs — keeping the exact keys, order and
   "did you mean" behaviour so error messages the user sees on
   Telegram are IDENTICAL to what they'd see in the studio.

   If js/engine.js ever adds a new type / entrance / etc., add
   it here too — the two lists MUST stay in sync.
   ============================================================ */

// ---- catalogues (mirrored from js/engine.js) ----
export const EASE_NAMES = [
  "linear","inQuad","outQuad","inOutQuad","inCubic","outCubic","inOutCubic",
  "outQuart","outQuint","inOutSine","inBack","outBack","outElastic","outBounce",
  "anticipate","spring",
];
export const ENTRANCE_NAMES = [
  "none","fade-in","slide-up","slide-down","slide-left","slide-right",
  "elastic-pop","scale-in","wipe-reveal","wipe-up","mask-up","blur-in",
  "zoom-blur","drop-bounce","rotate-in","spin-in","flip-x","flip-y",
  "unfold","skew-in","arc-in","anticipate-pop","glitch","draw-line","grow-up",
  "char-cascade","char-pop","char-flip","word-cascade","word-mask","typewriter",
];
export const IDLE_NAMES = [
  "none","pulse","float","breathe","bob","spin","sway","wobble",
  "jitter","drift","orbit","blink","shimmer","tick","parallax",
];
export const EXIT_NAMES = [
  "fade-out","slide-out-up","slide-out-down","slide-out-left","slide-out-right",
  "scale-out","pop-out","wipe-out","mask-down","blur-out","flip-out","spin-out",
  "drop-out","glitch-out",
];
export const TYPES = [
  "text","caption","icon","image","shape","avatar-placeholder","counter","progress",
  "bar-chart","sparkline","grid-overlay","barcode","cursor","playhead","clip",
  "marker","card","device",
];
export const SHAPES = ["rect","circle","ellipse","line","triangle","ring","pill","star","blob","arrow","cross"];
export const BACKGROUNDS = [
  "solid","gradient-linear","gradient-radial","gradient-conic","mesh","grid",
  "dots","stripes","noise","paper","vignette","spotlight","image",
];
export const TRANSITIONS = [
  "fade","cut","wipe","wipe-up","slide-left","slide-right","slide-up",
  "zoom","iris","flash","whip",
];
export const FONT_NAMES = ["grotesk","sans","display","rounded","serif","mono"];
export const SIZES = ["xs","sm","md","lg","xl","2xl"];
export const RATIOS = {
  "16:9":[1600,900], "9:16":[1080,1920], "1:1":[1080,1080],
  "4:3":[1200,900], "3:4":[900,1200], "4:5":[1080,1350], "21:9":[2100,900],
};

const ELEMENT_KEYS = new Set([
  "id","type","parent","start","end","zIndex","position","anchor","size","w","h","color","fill","stroke",
  "strokeWidth","strokeStyle","radius","shadow","shadowColor","blur","opacity","rotate","tilt","scale","skew",
  "perspective","entrance","entranceDuration","ease","exit","exitDuration","idle","idleAmount","idleSpeed",
  "keyframes","content","weight","tracking","uppercase","align","lineHeight","maxWidth","font","fontSize",
  "gradient","gradientAngle","highlight","textStroke","textStrokeWidth","textShadow","chip","chipColor",
  "chipBorder","italic","shape","variant","solid","glow","blobRadius","backdropBlur","mixBlend","src","alt",
  "fit","circle","from","to","decimals","prefix","suffix","countDuration","countEase","separator","value",
  "track","fillDuration","fillEase","values","labels","colors","gap","growDuration","growEase","barStagger",
  "area","drawDuration","drawEase","cols","rows","lineOpacity","nodes","bars","seed","clicks","headSize",
  "label","labelSize","labelColor","waveColor","state","glyphColor","tone","ink","title","titleSize","lines",
  "lineHeightPx","big","bigOpacity","padding","frame","screen","bezel","note",
]);
const SCENE_KEYS = new Set([
  "id","start","end","background","backgroundOptions","transition","transitionDuration",
  "camera","stagger","elements","note",
]);
const META_KEYS  = new Set(["prompt","style","ratio","width","height","duration","font","fps","title","note","author"]);

const isNum = v => typeof v === "number" && isFinite(v);
const isStr = v => typeof v === "string";
function hexToRgb(h) {
  if (typeof h !== "string") return null;
  let s = h.trim().replace(/^#/, "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function nearest(word, list) {
  if (!isStr(word)) return null;
  const w = word.toLowerCase();
  let best = null, bestScore = 3;
  list.forEach(c => { const s = lev(w, c.toLowerCase()); if (s < bestScore) { bestScore = s; best = c; } });
  return best;
}
const suggest = (val, list) => { const s = nearest(val, list); return s ? ` — did you mean "${s}"?` : ""; };

export function validate(spec) {
  const errors = [], warnings = [];
  const stats = { scenes: 0, elements: 0, types: {} };

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    errors.push("Top level must be a JSON object with meta / palette / scenes.");
    return { errors, warnings, stats };
  }

  /* ---- meta ---- */
  if (!spec.meta || typeof spec.meta !== "object") errors.push('Missing "meta" object.');
  else {
    const m = spec.meta;
    if (!isNum(m.duration) || m.duration <= 0) errors.push('"meta.duration" must be a positive number (seconds).');
    const hasWH = isNum(m.width) && isNum(m.height) && m.width > 0 && m.height > 0;
    if (!hasWH) {
      if (RATIOS[m.ratio]) warnings.push(`meta.width/height missing — derived from ratio "${m.ratio}".`);
      else errors.push(`"meta.width"/"meta.height" must be positive numbers, or set "meta.ratio" to one of: ${Object.keys(RATIOS).join(", ")}.`);
    }
    if (m.font != null && !FONT_NAMES.includes(m.font))
      warnings.push(`meta.font "${m.font}" unknown${suggest(m.font, FONT_NAMES)} — using "grotesk".`);
    Object.keys(m).forEach(k => { if (!META_KEYS.has(k)) warnings.push(`meta."${k}" is not a known key — ignored.`); });
  }

  /* ---- palette ---- */
  if (!spec.palette || typeof spec.palette !== "object") warnings.push('No "palette" — falling back to the default dark theme.');
  else Object.keys(spec.palette).forEach(k => {
    if (!hexToRgb(spec.palette[k])) warnings.push(`palette.${k} ("${spec.palette[k]}") is not a hex color — it can still be referenced but may not render as expected.`);
  });

  /* ---- scenes ---- */
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) {
    errors.push('"scenes" must be a non-empty array.');
    return { errors, warnings, stats };
  }
  stats.scenes = spec.scenes.length;

  let prevEnd = null;
  spec.scenes.forEach((sc, i) => {
    const tag = `scenes[${i}]${sc && sc.id ? ` ("${sc.id}")` : ""}`;
    if (!sc || typeof sc !== "object") { errors.push(`${tag} is not an object.`); return; }
    Object.keys(sc).forEach(k => { if (!SCENE_KEYS.has(k)) warnings.push(`${tag}: unknown key "${k}"${suggest(k, [...SCENE_KEYS])} — ignored.`); });

    if (!isNum(sc.start) || !isNum(sc.end)) errors.push(`${tag}: "start" and "end" must be numbers (seconds).`);
    else {
      if (sc.end <= sc.start) errors.push(`${tag}: "end" (${sc.end}) must be greater than "start" (${sc.start}).`);
      if (prevEnd != null && sc.start > prevEnd + 0.001) warnings.push(`${tag}: starts ${(sc.start - prevEnd).toFixed(2)}s after the previous scene ends — the canvas will be empty in that gap.`);
      if (prevEnd != null && sc.start < prevEnd - 0.001) warnings.push(`${tag}: overlaps the previous scene by ${(prevEnd - sc.start).toFixed(2)}s — they will cross-fade.`);
      prevEnd = sc.end;
      if (spec.meta && isNum(spec.meta.duration) && sc.end > spec.meta.duration + 0.001)
        warnings.push(`${tag}: ends at ${sc.end}s, past meta.duration (${spec.meta.duration}s) — it will be cut off.`);
    }
    if (sc.background != null && !BACKGROUNDS.includes(sc.background))
      warnings.push(`${tag}: unknown background "${sc.background}"${suggest(sc.background, BACKGROUNDS)} — using "solid".`);
    if (sc.transition != null && !TRANSITIONS.includes(sc.transition))
      warnings.push(`${tag}: unknown transition "${sc.transition}"${suggest(sc.transition, TRANSITIONS)} — using "fade".`);
    if (sc.camera && typeof sc.camera === "object") {
      ["from","to"].forEach(k => {
        if (sc.camera[k] && typeof sc.camera[k] !== "object") warnings.push(`${tag}: camera.${k} must be an object like {"zoom":1.2,"x":-6,"y":4}.`);
      });
      if (sc.camera.ease && !EASE_NAMES.includes(sc.camera.ease))
        warnings.push(`${tag}: camera.ease "${sc.camera.ease}" unknown${suggest(sc.camera.ease, EASE_NAMES)} — using "inOutCubic".`);
    }

    if (!Array.isArray(sc.elements)) { errors.push(`${tag}: "elements" must be an array.`); return; }
    if (sc.elements.length === 0) warnings.push(`${tag}: has no elements.`);
    const ids = new Set(sc.elements.map(e => e && e.id).filter(Boolean));
    const dur = isNum(sc.end) && isNum(sc.start) ? sc.end - sc.start : null;

    sc.elements.forEach((e, j) => {
      const et = `${tag}.elements[${j}]${e && e.id ? ` ("${e.id}")` : e && e.type ? ` (${e.type})` : ""}`;
      if (!e || typeof e !== "object") { errors.push(`${et} is not an object.`); return; }
      stats.elements++;
      stats.types[e.type] = (stats.types[e.type] || 0) + 1;

      if (!TYPES.includes(e.type))
        errors.push(`${et}: invalid type "${e.type}"${suggest(e.type, TYPES)}.\n   Valid types: ${TYPES.join(" | ")}`);
      Object.keys(e).forEach(k => { if (!ELEMENT_KEYS.has(k)) warnings.push(`${et}: unknown key "${k}"${suggest(k, [...ELEMENT_KEYS])} — ignored.`); });

      if (e.type === "shape" && e.shape != null && !SHAPES.includes(e.shape))
        warnings.push(`${et}: unknown shape "${e.shape}"${suggest(e.shape, SHAPES)} — using "rect".`);
      if (e.entrance != null && !ENTRANCE_NAMES.includes(e.entrance))
        warnings.push(`${et}: unknown entrance "${e.entrance}"${suggest(e.entrance, ENTRANCE_NAMES)} — using "fade-in".`);
      if (e.exit != null && !EXIT_NAMES.includes(e.exit))
        warnings.push(`${et}: unknown exit "${e.exit}"${suggest(e.exit, EXIT_NAMES)} — using "fade-out".`);
      if (e.idle != null && e.idle !== "none" && !IDLE_NAMES.includes(e.idle))
        warnings.push(`${et}: unknown idle "${e.idle}"${suggest(e.idle, IDLE_NAMES)} — ignored.`);
      if (e.ease != null && !EASE_NAMES.includes(e.ease))
        warnings.push(`${et}: unknown ease "${e.ease}"${suggest(e.ease, EASE_NAMES)} — using "outCubic".`);
      if (e.size != null && !SIZES.includes(e.size))
        warnings.push(`${et}: unknown size "${e.size}" — use ${SIZES.join(" | ")} or numeric w/h.`);
      if (e.font != null && !FONT_NAMES.includes(e.font))
        warnings.push(`${et}: unknown font "${e.font}"${suggest(e.font, FONT_NAMES)}.`);
      if (e.parent && !ids.has(e.parent))
        warnings.push(`${et}: parent "${e.parent}" not found in this scene — treated as unparented.`);
      if (e.position && typeof e.position === "object") {
        ["x","y"].forEach(k => {
          const v = e.position[k];
          if (v != null && !isNum(v)) warnings.push(`${et}: position.${k} must be a number (percent).`);
          else if (isNum(v) && (v < -40 || v > 140)) warnings.push(`${et}: position.${k} = ${v}% is far off-canvas.`);
        });
      }
      if (e.keyframes != null) {
        if (!Array.isArray(e.keyframes)) warnings.push(`${et}: "keyframes" must be an array of {t,x,y,scale,rotate,opacity,blur,ease}.`);
        else {
          e.keyframes.forEach((k, ki) => {
            if (!k || typeof k !== "object" || !isNum(k.t)) warnings.push(`${et}.keyframes[${ki}]: needs a numeric "t" (seconds after the element starts).`);
            else if (k.ease && !EASE_NAMES.includes(k.ease)) warnings.push(`${et}.keyframes[${ki}]: unknown ease "${k.ease}"${suggest(k.ease, EASE_NAMES)}.`);
          });
        }
      }
      if (isNum(e.start) && dur != null && e.start > dur)
        warnings.push(`${et}: start ${e.start}s is after this scene ends (${dur.toFixed(2)}s long) — it will never appear.`);
      if (isNum(e.end) && isNum(e.start) && e.end <= e.start)
        warnings.push(`${et}: "end" (${e.end}) should be greater than "start" (${e.start}).`);
      if (e.type === "image" && !isStr(e.src))
        warnings.push(`${et}: image needs a "src" URL.`);
      if (e.type === "counter" && !isNum(e.to))
        warnings.push(`${et}: counter needs a numeric "to" (defaults to 100).`);
      if ((e.type === "bar-chart" || e.type === "sparkline") && e.values != null && !Array.isArray(e.values))
        warnings.push(`${et}: "values" must be an array of 0–1 numbers.`);
      if (e.content != null && Array.isArray(e.content)) {
        e.content.forEach((r, ri) => {
          if (r && typeof r === "object" && r.text == null && typeof r !== "string")
            warnings.push(`${et}.content[${ri}]: rich-text runs need a "text" field.`);
        });
      }
    });
  });

  return { errors, warnings, stats };
}
