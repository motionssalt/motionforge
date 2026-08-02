/* ============================================================
   MotionForge — JSON template + creative brief generator
   ------------------------------------------------------------
   Returns an empty-but-valid spec skeleton matching the shape
   used across js/presets.js (Motion JSON Studio's own preset
   library — see e.g. "Blank canvas", "Checklist compare",
   "Data story" for reference specs of this exact shape).

   The meta.prompt field carries a HIGHLY DESCRIPTIVE creative
   brief telling the authoring AI: exactly what the validator
   requires per element type, a fully-worked example scene
   pulled from the real preset library, common validator
   mistakes to avoid, and the full preset vocabulary. Style
   category and scene/element density are NOT constrained by
   the bot — the authoring AI decides both freely based on the
   user's own prompt and any attached audio.
   ============================================================ */

import {
  ENTRANCE_NAMES, IDLE_NAMES, EXIT_NAMES, TYPES, SHAPES,
  BACKGROUNDS, TRANSITIONS, FONT_NAMES, SIZES, RATIOS, EASE_NAMES,
} from "./validate.js";

/* ------------------------------------------------------------
   A REAL, fully-valid worked example scene, adapted verbatim
   from the "Checklist compare" preset in js/presets.js. It
   demonstrates: layered elements with staggered start times,
   parent-child grouping, palette-key colors, position in %,
   an explicit transition on the scene, entrance vocabulary,
   idle animation, keyframes, and both `size` shorthand and
   explicit `w/h`. Inlining this single example prevents far
   more validator warnings than any flat vocabulary list.
   ------------------------------------------------------------ */
const WORKED_EXAMPLE = {
  id: "compare",
  start: 0,
  end: 6.4,
  background: "gradient-linear",
  backgroundOptions: { color: "#f4f4f4", color2: "#c9c9c9", angle: 180, opacity: 0.55 },
  transition: "fade",
  camera: { from: { zoom: 1.04 }, to: { zoom: 1.0 }, ease: "outQuint" },
  elements: [
    {
      id: "box1",
      type: "shape",
      shape: "rect",
      fill: "none",
      stroke: "ink",
      strokeStyle: "dashed",
      strokeWidth: 3,
      radius: 0,
      w: 760,
      h: 240,
      start: 0.15,
      entrance: "wipe-reveal",
      position: { x: 50, y: 34 },
      zIndex: 2
    },
    {
      type: "text",
      content: "the most",
      parent: "box1",
      start: 0.45,
      entrance: "fade-in",
      position: { x: 50, y: 33 },
      fontSize: 74,
      weight: 400,
      color: "muted",
      font: "rounded"
    },
    {
      type: "text",
      content: "Gifted",
      parent: "box1",
      start: 0.7,
      entrance: "char-pop",
      position: { x: 50, y: 70 },
      fontSize: 92,
      weight: 800,
      color: "ink",
      font: "rounded"
    },
    {
      id: "mark-v",
      type: "marker",
      state: "check",
      w: 96,
      strokeWidth: 5,
      color: "ink",
      start: 3.85,
      entrance: "elastic-pop",
      idle: "pulse",
      idleAmount: 0.5,
      position: { x: 50, y: 48 },
      zIndex: 4
    }
  ]
};

const CREATIVE_BRIEF = (ratio) => `
You are filling in a Motion JSON Studio spec that a headless renderer
will turn into an MP4. Fill in the "scenes" array (and refine palette,
meta.style, meta.title if you want) to match the user's request.
Return ONLY the completed JSON. No prose, no code fences.

## HIGH-LEVEL RULES

- Canvas ratio is ${ratio}. Do NOT change meta.ratio / meta.width /
  meta.height.
- Determine total duration YOURSELF based on the attached audio length
  (if any) or your own judgment of appropriate pacing for the content.
  Set meta.duration to a positive number of seconds. In the template
  it is null on purpose — the validator accepts null in the *template*
  but requires a positive number on your returned spec.
- Decide the number of scenes and the number of elements per scene
  YOURSELF based on the content. There is NO lower or upper bound.
  A single-line kinetic quote might be one scene with 3 elements; a
  data-driven explainer might be five scenes with 8+ elements each.
  Judge by the properties below, not by a count.
- meta.style is a free-form label you fill in (e.g. "kinetic-quote",
  "product-explainer", "editorial") — it does not have to come from a
  fixed list and does not have to be set at all.
- Choose the visual direction (SaaS/UI, talking head, editorial
  typography, poster, device demo, data story, kinetic quote, or
  something else entirely) purely from what the user tells you and
  from any audio/reference material they attach. Nothing in this
  brief tells you which category to pick.
- Judgement is yours — pick specific presets, timings, colors,
  hierarchy, and camera moves. Do NOT ask the user follow-up
  questions; produce a complete, renderable spec.

## PROPERTIES OF A GOOD SPEC (judge by these, not by counts)

- Scenes fully cover [0, meta.duration]. Adjacent scenes should touch
  (scene[i].end === scene[i+1].start) unless you deliberately want a
  crossfade (overlap slightly) or a hard cut (transition: "cut").
- No dead air: never leave the canvas visually empty for more than
  ~0.4s within a scene. Layer multiple elements with staggered "start"
  values so something is always entering, holding, or exiting.
- Elements are layered and staggered — do not put every element at
  the same start time. Use explicit "start" values (or rely on
  scene.stagger) to create rhythm.
- Elements exit or are covered by the next scene rather than freezing.
  If an element should leave before the scene ends, set "exit" and
  optionally "end".
- Typography and shapes have hierarchy: one dominant element, one or
  two supporting elements, and small captions/markers on top.

## REQUIRED vs OPTIONAL FIELDS (from worker/src/validate.js)

The server-side validator (\`validate.js\`) is a faithful port of the
studio's own validator. Fields it treats as REQUIRED are the ones it
reports as errors when missing; the rest are optional and have engine
defaults.

Top-level:
  REQUIRED:  meta (object), scenes (non-empty array).
  OPTIONAL:  palette (object of hex colors — falls back to the default
             dark theme if omitted).

meta:
  REQUIRED:  width & height (positive numbers) OR ratio set to one of
             ${Object.keys(RATIOS).join(", ")}.
  REQUIRED on your returned spec: duration (positive number, seconds).
             null is only accepted on an unfilled template.
  OPTIONAL:  prompt, style, ratio (if you gave width/height), font
             (one of ${FONT_NAMES.join(", ")}; defaults to "grotesk"),
             fps (defaults to 30), title, note, author.

scene (each element of the scenes array):
  REQUIRED:  start (number, seconds), end (number, seconds, > start),
             elements (array).
  OPTIONAL:  id, background (one of the BACKGROUNDS list below;
             defaults to "solid"), backgroundOptions (object),
             transition (one of the TRANSITIONS list below; defaults
             to "fade"), transitionDuration, camera { from, to, ease },
             stagger, note.

element (each item in scene.elements):
  REQUIRED FOR ALL TYPES: type (must be one of ${TYPES.join(", ")}).
  Strongly recommended for every element: position { x, y } in
             percent (0..100), a start value (seconds within the
             scene), and an entrance (one of the ENTRANCES list).
             Without these, the element renders at (0,0) at t=0 with
             no entrance animation.
  OPTIONAL for all types: id, parent (id of another element in the
             same scene — that element becomes the coordinate origin),
             end, zIndex, size (${SIZES.join(" | ")}) OR explicit
             numeric w/h, color, opacity, rotate, scale, entrance
             (one of ENTRANCES), entranceDuration, ease (one of
             ${EASE_NAMES.join(", ")}), exit (one of EXITS),
             exitDuration, idle (one of IDLES), idleAmount, idleSpeed,
             keyframes (array of { t, x?, y?, scale?, rotate?,
             opacity?, blur?, ease? } — t is seconds after the
             element's start).

  Type-specific required/optional fields the validator checks:
    text | caption: needs "content" (a string, OR an array of
                    rich-text runs where each run has a "text" field).
                    Optional: font, fontSize, weight, tracking,
                    uppercase, align, lineHeight, maxWidth, italic,
                    highlight, textStroke, textShadow, chip, chipColor,
                    chipBorder, gradient, gradientAngle.
    shape:          "shape" must be one of ${SHAPES.join(", ")}.
                    Optional: fill, stroke, strokeStyle, strokeWidth,
                    radius, blobRadius.
    image:          "src" (URL string) is expected — the validator
                    warns if missing. Optional: alt, fit, circle.
    counter:        "to" (number) is expected — validator warns if
                    missing. Optional: from, decimals, prefix, suffix,
                    countDuration, countEase, separator.
    progress:       Optional: value (0..1), track, fillDuration,
                    fillEase.
    bar-chart | sparkline:
                    "values" (if given) must be an ARRAY of numbers
                    in ~0..1. Optional: labels, colors, gap,
                    growDuration, growEase, barStagger, area,
                    drawDuration, drawEase.
    marker:         Optional: state ("check" | "cross"), color,
                    strokeWidth.
    cursor:         Optional: clicks (array of times in seconds),
                    stroke, headSize, keyframes for the sweep path.
    playhead:       Optional: h, strokeWidth, headSize, keyframes.
    clip:           Optional: label, seed, fill.
    card | device:  Optional: frame, screen, bezel, padding.
    grid-overlay:   Optional: cols, rows, lineOpacity.
    icon:           "content" names the icon (e.g. "waveform").
    avatar-placeholder: Optional: tone, ink.

## COMMON MISTAKES THE VALIDATOR CATCHES

Phrase your output so you avoid these — the wording below is what the
user will see if you trip the check:

1. "invalid type '<x>'" — the element's "type" must be exactly one of
   ${TYPES.join(" | ")}. The validator suggests the nearest match with
   *did you mean "<y>"?*, so typos like "txt", "captions", "counterr"
   will be flagged. Use the exact strings.
2. "unknown entrance / exit / idle / ease / background / transition
   / shape / font '<x>' — did you mean '<y>'?" — every one of these
   fields is checked against a closed list. Do not invent names like
   "fade-up", "slow-fade", "zoom-fade" — pick from the actual lists
   below. "idle: 'none'" is allowed and means no idle animation.
3. "unknown key '<k>' — ignored." — element and scene keys are
   whitelisted. Do not add ad-hoc properties like "animation",
   "duration" (on an element — use "end" or "keyframes"), "color2"
   (goes inside backgroundOptions, not on the element), "text" (use
   "content"). If you need something not on the whitelist, encode it
   through keyframes.
4. "position.x = <v>% is far off-canvas." — position is in PERCENT
   (0..100), with 0,0 at top-left. Keep important content within
   x∈[10,90] and y∈[10,90]. Values outside [-40, 140] are flagged.
   Do NOT use pixel coordinates in position (use w/h for pixel sizes).
5. "'end' (<v>) must be greater than 'start' (<u>)." — this fires on
   scenes AND on elements. Make sure every scene's end > start, and
   any element with an explicit "end" also satisfies end > start.
6. "starts <n>s after the previous scene ends — the canvas will be
   empty in that gap." / "overlaps the previous scene by <n>s — they
   will cross-fade." — decide intentionally: touch (end === next
   start) for a clean cut/wipe, overlap for a crossfade, gap only
   if you actually want empty canvas.
7. "ends at <n>s, past meta.duration (<d>s) — it will be cut off." —
   keep every scene.end ≤ meta.duration.
8. "start <n>s is after this scene ends (<d>s long) — it will never
   appear." — an element's start is RELATIVE to its scene's start.
   Keep it in [0, scene.end - scene.start].
9. "parent '<id>' not found in this scene — treated as unparented." —
   the "parent" value must be another element's "id" in the SAME
   scene. Parents cannot cross scenes.
10. "counter needs a numeric 'to'." / "image needs a 'src' URL." /
    "'values' must be an array of 0–1 numbers." — type-specific
    fields; see the table above.
11. "palette.<k> ('<v>') is not a hex color" — palette entries must
    be #RRGGBB or #RGB hex. Named CSS colors will warn.
12. "meta.'<k>' is not a known key — ignored." — meta only accepts
    ${["prompt","style","ratio","width","height","duration","font","fps","title","note","author"].join(", ")}.

## COLOR RESOLUTION (palette keys vs raw hex)

The "color", "fill", and "stroke" fields on any element accept EITHER:

  (a) A palette key — a string that matches a top-level key of the
      "palette" object (e.g. "primary", "accent", "muted", "ink",
      "surface", "bg", or any custom key you add to palette). At
      render time this is resolved to the hex value stored under
      that key in palette. This is the preferred form — it keeps
      the color scheme consistent and re-themable.

  (b) A raw hex string like "#ffffff", "#5eead4", "#0b0e17", or a
      3-digit shorthand like "#fff". Use this when you need a
      one-off color that shouldn't be part of the palette.

  Do NOT use CSS names ("white", "red", "rgb(...)", "hsl(...)") — the
  palette validator only recognises hex, and non-hex palette entries
  are flagged with a warning. Raw hex on an element is fine.

  Tip: define your full color scheme in "palette" (add any custom
  keys you want, they're not restricted), then reference those keys
  everywhere in your scenes. Only fall back to raw hex for genuinely
  one-off values.

## FULL PRESET VOCABULARY

Types:       ${TYPES.join(", ")}
Entrances:   ${ENTRANCE_NAMES.join(", ")}
Idles:       ${IDLE_NAMES.join(", ")}
Exits:       ${EXIT_NAMES.join(", ")}
Shapes:      ${SHAPES.join(", ")}
Backgrounds: ${BACKGROUNDS.join(", ")}
Transitions: ${TRANSITIONS.join(", ")}
Fonts:       ${FONT_NAMES.join(", ")}
Sizes:       ${SIZES.join(", ")}  (or explicit numeric w/h in design units)
Eases:       ${EASE_NAMES.join(", ")}
Ratios:      ${Object.keys(RATIOS).join(", ")}

## WORKED EXAMPLE — one fully-valid scene

This is a real, complete scene object (adapted from the "Checklist
compare" preset in the studio's own preset library). It illustrates:
staggered "start" times, a parent-child group (text elements
parented to "box1"), palette-key colors ("ink", "muted"), position
in percent, explicit numeric w/h alongside "size" shorthand, a
scene-level transition and camera move, and an entrance + idle
combination on the marker. Use it as a template for shape and
structure — you do not have to keep any of its content.

${JSON.stringify(WORKED_EXAMPLE, null, 2)}

Notes on the example:
- "position": { x: 50, y: 34 } → 50% across, 34% down.
- "parent": "box1" → the text elements are positioned relative to
  the box's coordinate frame, so moving the box moves the text.
- "color": "ink" and "color": "muted" → palette keys, resolved from
  the palette object. Add matching keys to palette when you use
  them.
- Element "start" is seconds after the scene's own start.
- The marker uses BOTH an entrance ("elastic-pop") AND an idle
  ("pulse") — entrances play once, idles loop.
- "zIndex" controls stacking within the scene; higher = on top.

Now fill in the "scenes" array for the user's request.
`.trim();

/**
 * Build a starter spec for the given ratio.
 * The spec is deliberately minimal (one scene, one placeholder text)
 * so it validates as-is, and so an AI filling it in has a clean slate.
 *
 * There is no style choice and no density choice — those decisions
 * belong to the authoring AI, driven by the user's own prompt and
 * any attached audio, not by the bot's UI.
 *
 * meta.duration is intentionally null in the *template* — the
 * authoring AI is expected to fill in a real number (from the audio
 * length or its own pacing judgement) before sending the spec back
 * for the render job. The server-side validator accepts null here
 * but requires a positive number on the returned spec.
 *
 * meta.style is left as an empty string and is expected to be
 * filled in freely by the authoring AI (or left blank).
 */
export function buildTemplate({ ratio } = {}) {
  const R = RATIOS[ratio] ? ratio : "16:9";
  const [W, H] = RATIOS[R];

  const brief = CREATIVE_BRIEF(R);

  return {
    meta: {
      prompt: brief,
      style: "",
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
