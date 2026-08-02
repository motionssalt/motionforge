/* ============================================================
   Motion JSON Studio — spec validation
   Returns { errors:[], warnings:[], stats:{} }
   Warnings never block rendering; errors do.
   ============================================================ */
(function (global) {
"use strict";
const E = () => global.MG.Engine;

const isNum = v => typeof v === "number" && isFinite(v);
const isStr = v => typeof v === "string";

/* "did you mean" helper */
function nearest(word, list) {
  if (!isStr(word)) return null;
  const w = word.toLowerCase();
  let best = null, bestScore = 3;
  list.forEach(c => {
    const s = lev(w, c.toLowerCase());
    if (s < bestScore) { bestScore = s; best = c; }
  });
  return best;
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
const suggest = (val, list) => { const s = nearest(val, list); return s ? ` — did you mean "${s}"?` : ""; };

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
const SCENE_KEYS = new Set(["id","start","end","background","backgroundOptions","transition","transitionDuration","camera","stagger","elements","note"]);
const META_KEYS  = new Set(["prompt","style","ratio","width","height","duration","font","fps","title","note","author"]);

function validate(spec) {
  const errors = [], warnings = [];
  const En = E();
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
      if (En.RATIOS[m.ratio]) warnings.push(`meta.width/height missing — derived from ratio "${m.ratio}".`);
      else errors.push(`"meta.width"/"meta.height" must be positive numbers, or set "meta.ratio" to one of: ${Object.keys(En.RATIOS).join(", ")}.`);
    }
    if (m.font != null && !En.FONTS[m.font])
      warnings.push(`meta.font "${m.font}" unknown${suggest(m.font, Object.keys(En.FONTS))} — using "grotesk".`);
    Object.keys(m).forEach(k => { if (!META_KEYS.has(k)) warnings.push(`meta."${k}" is not a known key — ignored.`); });
  }

  /* ---- palette ---- */
  if (!spec.palette || typeof spec.palette !== "object") warnings.push('No "palette" — falling back to the default dark theme.');
  else Object.keys(spec.palette).forEach(k => {
    if (!En.hexToRgb(spec.palette[k])) warnings.push(`palette.${k} ("${spec.palette[k]}") is not a hex color — it can still be referenced but may not render as expected.`);
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
    if (sc.background != null && !E().BACKGROUNDS.includes(sc.background))
      warnings.push(`${tag}: unknown background "${sc.background}"${suggest(sc.background, En.BACKGROUNDS)} — using "solid".`);
    if (sc.transition != null && !En.TRANSITIONS.includes(sc.transition))
      warnings.push(`${tag}: unknown transition "${sc.transition}"${suggest(sc.transition, En.TRANSITIONS)} — using "fade".`);
    if (sc.camera && typeof sc.camera === "object") {
      ["from","to"].forEach(k => {
        if (sc.camera[k] && typeof sc.camera[k] !== "object") warnings.push(`${tag}: camera.${k} must be an object like {"zoom":1.2,"x":-6,"y":4}.`);
      });
      if (sc.camera.ease && !En.EASE[sc.camera.ease])
        warnings.push(`${tag}: camera.ease "${sc.camera.ease}" unknown${suggest(sc.camera.ease, Object.keys(En.EASE))} — using "inOutCubic".`);
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

      if (!En.TYPES.includes(e.type))
        errors.push(`${et}: invalid type "${e.type}"${suggest(e.type, En.TYPES)}.\n   Valid types: ${En.TYPES.join(" | ")}`);
      Object.keys(e).forEach(k => { if (!ELEMENT_KEYS.has(k)) warnings.push(`${et}: unknown key "${k}"${suggest(k, [...ELEMENT_KEYS])} — ignored.`); });

      if (e.type === "shape" && e.shape != null && !En.SHAPES.includes(e.shape))
        warnings.push(`${et}: unknown shape "${e.shape}"${suggest(e.shape, En.SHAPES)} — using "rect".`);
      if (e.entrance != null && !En.ENTRANCES[e.entrance])
        warnings.push(`${et}: unknown entrance "${e.entrance}"${suggest(e.entrance, Object.keys(En.ENTRANCES))} — using "fade-in".`);
      if (e.exit != null && !En.EXITS[e.exit])
        warnings.push(`${et}: unknown exit "${e.exit}"${suggest(e.exit, Object.keys(En.EXITS))} — using "fade-out".`);
      if (e.idle != null && e.idle !== "none" && !En.IDLES[e.idle])
        warnings.push(`${et}: unknown idle "${e.idle}"${suggest(e.idle, Object.keys(En.IDLES))} — ignored.`);
      if (e.ease != null && !En.EASE[e.ease])
        warnings.push(`${et}: unknown ease "${e.ease}"${suggest(e.ease, Object.keys(En.EASE))} — using "outCubic".`);
      if (e.size != null && !En.SIZES.includes(e.size))
        warnings.push(`${et}: unknown size "${e.size}" — use ${En.SIZES.join(" | ")} or numeric w/h.`);
      if (e.font != null && !En.FONTS[e.font])
        warnings.push(`${et}: unknown font "${e.font}"${suggest(e.font, Object.keys(En.FONTS))}.`);
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
            else if (k.ease && !En.EASE[k.ease]) warnings.push(`${et}.keyframes[${ki}]: unknown ease "${k.ease}"${suggest(k.ease, Object.keys(En.EASE))}.`);
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

global.MG = Object.assign(global.MG || {}, { validate });
})(window);
