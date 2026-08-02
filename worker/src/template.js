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

/** Style categories are grouped from the actual preset library
 *  (js/presets.js), not invented. Users pick one; the AI is
 *  free within the whole preset vocabulary regardless. */
export const STYLES = [
  { key: "editorial",    label: "Editorial / typographic",    hint: "Big serif+grotesk type, char-cascade titles, generous negative space, single accent color." },
  { key: "ui-compare",   label: "UI / SaaS compare",          hint: "Dashed option cards, checkmark/cross markers, a cursor that clicks the winning option." },
  { key: "data-story",   label: "Data story",                 hint: "Counter, bar-chart or sparkline, a caption chip and a title — numbers grow in with outBack." },
  { key: "kinetic-quote",label: "Kinetic quote",              hint: "Word-cascade + word-mask over a bold gradient background; camera slowly zooms." },
  { key: "neon-device",  label: "Neon device demo",           hint: "A device frame containing a UI clip, glow shadows, elastic-pop labels, glitch entrance on the hero word." },
  { key: "retro-poster", label: "Retro poster",               hint: "Paper background, uppercase display font, stripes + big number, mask-up + wipe-reveal reveals." },
  { key: "3d-deck",      label: "3D card deck",               hint: "Three tilted cards flipping in with flip-x / flip-y, a caption chip, subtle drift idles." },
  { key: "talking-head", label: "Talking head lower-third",   hint: "Avatar-placeholder, name text, caption chip, subtle float idle; a sparkline audio waveform." },
  { key: "mixed",        label: "Mixed 3-act",                hint: "Three sequential scenes: hook → data → CTA. Each scene 3–5 elements, cross-fade transitions." },
];

const CREATIVE_BRIEF = (durationSec, ratio, styleHint) => `
You are filling in a Motion JSON Studio spec that a headless renderer
will turn into an MP4. Fill in the "scenes" array (and refine palette
if you want) to match the user's request. Rules:

- Split the total duration (${durationSec}s, ${ratio}) into 1–4 scenes
  that fully cover [0, ${durationSec}]. Adjacent scenes should touch
  (scene[i].end === scene[i+1].start) unless you deliberately want a
  crossfade (overlap slightly) or a hard cut (transition:"cut").
- Every scene must have 3–8 elements. Layer them with real staggering
  — set explicit "start" values or rely on scene.stagger. Never leave
  a scene visually empty for more than ~0.4s.
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
 * Build a starter spec for the given ratio/duration/style.
 * The spec is deliberately minimal (one scene, one placeholder text)
 * so it validates as-is, and so an AI filling it in has a clean slate.
 */
export function buildTemplate({ ratio, duration, style }) {
  const R = RATIOS[ratio] ? ratio : "16:9";
  const [W, H] = RATIOS[R];
  const dur = Number.isFinite(+duration) && +duration > 0 ? +duration : 8;
  const styleDef = STYLES.find(s => s.key === style) || STYLES[0];

  const brief = CREATIVE_BRIEF(dur, R, `${styleDef.label} — ${styleDef.hint}`);

  return {
    meta: {
      prompt: brief,
      style: styleDef.key,
      title: "",
      ratio: R,
      width: W,
      height: H,
      duration: dur,
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
        end: dur,
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
