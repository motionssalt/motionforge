/* ============================================================
   MotionForge — JSON template + creative brief generator
   ------------------------------------------------------------
   Returns an empty-but-valid spec skeleton matching the shape
   used across js/presets.js (Motion JSON Studio's own preset
   library — see e.g. "Blank canvas", "Checklist compare",
   "Data story" for reference specs of this exact shape).

   The meta.prompt field carries a creative brief telling the
   authoring AI to layer multiple staggered elements per scene,
   use the preset vocabulary confidently, and choose composition
   / timing / preset / palette on its own within that vocabulary.
   ============================================================ */

import {
  ENTRANCE_NAMES, IDLE_NAMES, EXIT_NAMES, TYPES, SHAPES,
  BACKGROUNDS, TRANSITIONS, FONT_NAMES, SIZES, RATIOS,
} from "./validate.js";

/** Style flavors are grouped from the actual preset library
 *  (js/presets.js), not invented. Users pick one of 3 major
 *  categories, then (if the category has multiple flavors) a
 *  specific flavor; the AI is free within the whole preset
 *  vocabulary regardless. */
export const STYLES = [
  { key: "ui-compare",   category: "saas-ui",      label: "UI / SaaS compare",          hint: "Dashed option cards, checkmark/cross markers, a cursor that clicks the winning option." },
  { key: "data-story",   category: "saas-ui",      label: "Data story",                 hint: "Counter, bar-chart or sparkline, a caption chip and a title — numbers grow in with outBack." },
  { key: "3d-deck",      category: "saas-ui",      label: "3D card deck",               hint: "Three tilted cards flipping in with flip-x / flip-y, a caption chip, subtle drift idles." },
  { key: "talking-head", category: "talking-head", label: "Talking head lower-third",   hint: "Avatar-placeholder, name text, caption chip, subtle float idle; a sparkline audio waveform." },
  { key: "editorial",    category: "typography",   label: "Editorial / typographic",    hint: "Big serif+grotesk type, char-cascade titles, generous negative space, single accent color." },
  { key: "kinetic-quote",category: "typography",   label: "Kinetic quote",              hint: "Word-cascade + word-mask over a bold gradient background; camera slowly zooms." },
  { key: "neon-device",  category: "typography",   label: "Neon device demo",           hint: "A device frame containing a UI clip, glow shadows, elastic-pop labels, glitch entrance on the hero word." },
  { key: "retro-poster", category: "typography",   label: "Retro poster",               hint: "Paper background, uppercase display font, stripes + big number, mask-up + wipe-reveal reveals." },
];

/** Major categories shown as the first-level style picker.
 *  Order here is the order rendered as inline-keyboard buttons. */
export const STYLE_CATEGORIES = [
  { key: "saas-ui",      label: "SaaS / UI" },
  { key: "talking-head", label: "Talking Head" },
  { key: "typography",   label: "Typography" },
];

/** Flavors belonging to a category, preserving STYLES order. */
export function flavorsFor(categoryKey) {
  return STYLES.filter(s => s.category === categoryKey);
}

/** Density tiers — a scene/element-count guidance the user picks
 *  instead of a hard duration. The authoring AI decides the actual
 *  duration itself (or takes it from an attached audio track). */
export const DENSITIES = [
  { key: "compact",  label: "Compact",  scenes: "1–2", elements: "3–5",
    hint: "Short and focused — 1–2 scenes, 3–5 elements per scene." },
  { key: "standard", label: "Standard", scenes: "2–3", elements: "4–6",
    hint: "Balanced pacing — 2–3 scenes, 4–6 elements per scene." },
  { key: "rich",     label: "Rich",     scenes: "3–5", elements: "5–8",
    hint: "Dense and layered — 3–5 scenes, 5–8 elements per scene." },
];

const CREATIVE_BRIEF = (ratio, styleHint, density) => `
You are filling in a Motion JSON Studio spec that a headless renderer
will turn into an MP4. Fill in the "scenes" array (and refine palette
if you want) to match the user's request. Rules:

- Determine total duration yourself based on the attached audio length
  (if any) or your own judgment of appropriate pacing for this content
  — set meta.duration accordingly in your output. If no audio is
  provided, default to roughly 8–15 seconds unless the content clearly
  calls for more.
- Canvas ratio is ${ratio}. Split the total duration into ${density.scenes}
  scenes that fully cover [0, meta.duration]. Adjacent scenes should
  touch (scene[i].end === scene[i+1].start) unless you deliberately
  want a crossfade (overlap slightly) or a hard cut (transition:"cut").
- Every scene must have ${density.elements} elements. Layer them with
  real staggering — set explicit "start" values or rely on
  scene.stagger. Never leave a scene visually empty for more than ~0.4s.
- You are free to structure the piece as a multi-act sequence
  (e.g. hook → data → CTA) whenever the content benefits from it,
  regardless of the chosen style flavor.
- Use the preset vocabulary CONFIDENTLY. Types: ${TYPES.join(", ")}.
  Entrances: ${ENTRANCE_NAMES.join(", ")}.
  Idles: ${IDLE_NAMES.join(", ")}.
  Exits: ${EXIT_NAMES.join(", ")}.
  Shapes: ${SHAPES.join(", ")}.
  Backgrounds: ${BACKGROUNDS.join(", ")}.
  Transitions: ${TRANSITIONS.join(", ")}.
  Fonts: ${FONT_NAMES.join(", ")}.
  Sizes: ${SIZES.join(", ")} (or explicit numeric w/h).
- Positions are in percent (0..100) with origin top-left; the canvas
  design width is 1000 units. Keep important content within x∈[10,90],
  y∈[10,90] so nothing is cut off.
- Colors: reference palette keys ("primary", "accent", ...) OR raw hex.
- Style direction from the user: ${styleHint}
- Judgement is yours — pick specific presets, timings, colors,
  hierarchy, camera moves. Do NOT ask the user follow-up questions;
  produce a complete, renderable spec.
- Return ONLY the JSON. No prose, no code fences.
`.trim();

/**
 * Build a starter spec for the given ratio/style/density.
 * The spec is deliberately minimal (one scene, one placeholder text)
 * so it validates as-is, and so an AI filling it in has a clean slate.
 *
 * meta.duration is intentionally null in the *template* — the
 * authoring AI is expected to fill in a real number (from the audio
 * length or its own pacing judgement) before sending the spec back
 * for the render job. The server-side validator accepts null here
 * but requires a positive number on the returned spec.
 */
export function buildTemplate({ ratio, style, density }) {
  const R = RATIOS[ratio] ? ratio : "16:9";
  const [W, H] = RATIOS[R];
  const styleDef = STYLES.find(s => s.key === style) || STYLES[0];
  const densityDef = DENSITIES.find(d => d.key === density) || DENSITIES[1];

  const brief = CREATIVE_BRIEF(R, `${styleDef.label} — ${styleDef.hint}`, densityDef);

  return {
    meta: {
      prompt: brief,
      style: styleDef.key,
      title: "",
      ratio: R,
      width: W,
      height: H,
      duration: null,
      fps: 30,
      font: "grotesk",
    },
    palette: {
      bg: "#0b0e17",
      primary: "#ffffff",
      accent: "#5eead4",
      secondary: "#94a3b8",
      ink: "#0b0e17",
      surface: "#151a23",
    },
    scenes: [
      {
        id: "scene-1",
        start: 0,
        end: 8,
        background: "gradient-radial",
        transition: "fade",
        elements: [
          {
            type: "text",
            content: "REPLACE ME",
            position: { x: 50, y: 46 },
            size: "xl",
            color: "primary",
            entrance: "char-cascade",
            start: 0.2,
          },
        ],
      },
    ],
  };
}
