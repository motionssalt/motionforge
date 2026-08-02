/* ============================================================
   Motion JSON Studio — preset library
   MG.PRESETS = [{ name, group, ref, blurb, spec }]
   ============================================================ */
(function (global) {
"use strict";

const P = [];
const add = (group, name, blurb, spec, ref) => P.push({ group, name, blurb, spec, ref: ref || null });

/* ------------------------------------------------------------------
   STARTER
------------------------------------------------------------------ */
add("Starter", "Blank canvas", "Two elements, one scene — the smallest valid spec.", {
  meta: { prompt: "Minimal starting point — edit me.", style: "starter", ratio: "16:9", width: 1600, height: 900, duration: 5, font: "grotesk" },
  palette: { bg: "#0b0e17", primary: "#ffffff", accent: "#5eead4" },
  scenes: [
    { id: "one", start: 0, end: 5, background: "gradient-radial", elements: [
      { type: "text", content: "Hello, motion.", start: 0.2, entrance: "char-cascade", position: { x: 50, y: 46 }, size: "xl", color: "primary" },
      { type: "shape", shape: "line", start: 0.9, entrance: "draw-line", idle: "pulse", position: { x: 50, y: 60 }, size: "lg", color: "accent" }
    ]}
  ]
});

/* ------------------------------------------------------------------
   REFERENCE-INSPIRED (the four uploaded frames)
------------------------------------------------------------------ */
add("Reference remakes", "Checklist compare", "Dashed option cards, ✕/✓ markers and a clicking cursor.", {
  meta: { prompt: "Light UI compare: two dashed option cards, the wrong one gets struck out, a cursor clicks the right one.",
          style: "ui-compare", ratio: "9:16", width: 1080, height: 1920, duration: 10, font: "rounded" },
  palette: { bg: "#f1f1f1", primary: "#3a3a3a", accent: "#111111", muted: "#9a9a9a", ink: "#2b2b2b" },
  scenes: [
    { id: "compare", start: 0, end: 6.4, background: "gradient-linear",
      backgroundOptions: { color: "#f4f4f4", color2: "#c9c9c9", angle: 180, opacity: 0.55 },
      camera: { from: { zoom: 1.04 }, to: { zoom: 1.0 }, ease: "outQuint" },
      elements: [
        { id: "mark-x", type: "marker", state: "cross", w: 96, strokeWidth: 5, color: "ink", start: 0.9,
          entrance: "elastic-pop", position: { x: 50, y: 20 }, zIndex: 4 },
        { id: "box1", type: "shape", shape: "rect", fill: "none", stroke: "ink", strokeStyle: "dashed",
          strokeWidth: 3, radius: 0, w: 760, h: 240, start: 0.15, entrance: "wipe-reveal",
          position: { x: 50, y: 34 }, zIndex: 2 },
        { type: "text", content: "the most", parent: "box1", start: 0.45, entrance: "fade-in",
          position: { x: 50, y: 33 }, fontSize: 74, weight: 400, color: "muted", font: "rounded" },
        { type: "text", content: "Gifted", parent: "box1", start: 0.7, entrance: "char-pop",
          position: { x: 50, y: 70 }, fontSize: 92, weight: 800, color: "ink", font: "rounded" },
        { type: "shape", shape: "line", parent: "box1", solid: true, fill: "ink", w: 330, h: 8, start: 4.3,
          entrance: "draw-line", position: { x: 50, y: 70 }, zIndex: 6 },

        { id: "mark-v", type: "marker", state: "check", w: 96, strokeWidth: 5, color: "ink", start: 3.85,
          entrance: "elastic-pop", idle: "pulse", idleAmount: 0.5, position: { x: 50, y: 48 }, zIndex: 4 },
        { id: "box2", type: "shape", shape: "rect", fill: "none", stroke: "ink", strokeStyle: "dashed",
          strokeWidth: 3, radius: 0, w: 760, h: 240, start: 1.2, entrance: "wipe-reveal",
          position: { x: 50, y: 62 }, zIndex: 2,
          keyframes: [ { t: 2.4, scale: 1 }, { t: 2.62, scale: 0.965, ease: "outQuad" }, { t: 2.95, scale: 1, ease: "outBack" } ] },
        { type: "text", content: "the most", parent: "box2", start: 1.5, entrance: "fade-in",
          position: { x: 50, y: 33 }, fontSize: 74, weight: 400, color: "muted", font: "rounded" },
        { type: "text", content: "Recognized", parent: "box2", start: 1.7, entrance: "char-pop",
          position: { x: 50, y: 70 }, fontSize: 92, weight: 800, color: "ink", font: "rounded" },

        { id: "cur", type: "cursor", w: 92, color: "ink", stroke: "#ffffff", start: 1.9,
          entrance: "fade-in", position: { x: 78, y: 78 }, zIndex: 9, clicks: [1.4],
          keyframes: [ { t: 0, x: 120, y: 150 }, { t: 1.25, x: -20, y: -6, ease: "inOutCubic" },
                       { t: 1.45, x: -20, y: -6 }, { t: 3.2, x: -20, y: -6 },
                       { t: 4.4, x: 150, y: 190, ease: "inOutQuad" } ] }
      ]},
    { id: "payoff", start: 6.4, end: 10, background: "gradient-linear", transition: "wipe-up",
      backgroundOptions: { color: "#111111", color2: "#3a3a3a", angle: 200, opacity: 0.6 },
      elements: [
        { type: "text", content: "Don't be the most gifted.", start: 0.15, entrance: "word-cascade",
          position: { x: 50, y: 40 }, fontSize: 64, weight: 500, color: "#8d8d8d", maxWidth: 820, font: "rounded" },
        { type: "text", content: "Be the most\nRecognized.", start: 0.7, entrance: "mask-up", idle: "float", idleAmount: 0.4,
          position: { x: 50, y: 56 }, fontSize: 104, weight: 800, color: "#ffffff", maxWidth: 900, lineHeight: 1.05, font: "rounded" },
        { type: "shape", shape: "line", start: 1.5, entrance: "draw-line", position: { x: 50, y: 72 }, size: "lg", color: "#ffffff" },
        { type: "caption", content: "cursor · markers · dashed cards", start: 1.8, entrance: "slide-up",
          position: { x: 50, y: 82 }, size: "sm", color: "#e9e9e9", chipColor: "rgba(255,255,255,.08)" }
      ]}
  ]
}, "images/ref-checklist.png");

add("Reference remakes", "Audio timeline", "Editor timeline with SFX clips, sweeping playhead and a pop label.", {
  meta: { prompt: "White editor UI: audio clips sit on tracks, a blue playhead sweeps across and a sound name pops in.",
          style: "editor-ui", ratio: "9:16", width: 1080, height: 1920, duration: 10.5, font: "sans" },
  palette: { bg: "#ffffff", primary: "#111318", accent: "#1877f2", surface: "#3b4046", muted: "#c9ced6" },
  scenes: [
    { id: "timeline", start: 0, end: 7, background: "gradient-linear",
      backgroundOptions: { color: "#ffffff", color2: "#c2c2c2", angle: 180, opacity: 0.5 },
      camera: { from: { zoom: 1.05, y: 1 }, to: { zoom: 1, y: 0 }, ease: "outQuint" },
      elements: [
        { type: "text", content: [ { text: "Comment " }, { text: "\u201CSFX\u201D", color: "accent" }, { text: " to get it for free" } ],
          start: 0.1, entrance: "word-cascade", position: { x: 50, y: 14 }, fontSize: 54, weight: 800, color: "primary", maxWidth: 900 },

        { type: "shape", shape: "line", solid: true, fill: "muted", w: 1100, h: 3, start: 0.5, entrance: "draw-line",
          position: { x: 50, y: 34 }, rotate: -3, zIndex: 1 },
        { type: "shape", shape: "line", solid: true, fill: "muted", w: 1100, h: 3, start: 0.6, entrance: "draw-line",
          position: { x: 50, y: 45 }, rotate: -2, zIndex: 1 },
        { type: "shape", shape: "line", solid: true, fill: "muted", w: 1100, h: 3, start: 0.7, entrance: "draw-line",
          position: { x: 50, y: 57 }, rotate: 2, zIndex: 1 },

        { type: "clip", label: "SFX", w: 300, h: 88, seed: "a", start: 1.0, entrance: "slide-left", idle: "drift", idleAmount: 0.35,
          fill: "surface", position: { x: 8, y: 44 }, rotate: -3, zIndex: 3 },
        { type: "clip", label: "SFX", w: 340, h: 88, seed: "b", start: 1.2, entrance: "slide-right", idle: "drift", idleAmount: 0.45,
          fill: "surface", position: { x: 55, y: 40 }, rotate: -2, zIndex: 3 },
        { type: "clip", label: "SFX", w: 320, h: 88, seed: "c", start: 1.4, entrance: "slide-left", idle: "drift", idleAmount: 0.4,
          fill: "surface", position: { x: 22, y: 52 }, rotate: 1, zIndex: 3 },
        { type: "clip", label: "SFX", w: 330, h: 88, seed: "d", start: 1.6, entrance: "slide-right", idle: "drift", idleAmount: 0.3,
          fill: "surface", position: { x: 88, y: 51 }, rotate: 3, zIndex: 3 },

        { id: "head", type: "playhead", h: 620, strokeWidth: 8, headSize: 42, color: "accent", start: 1.9,
          entrance: "slide-down", position: { x: 46, y: 45 }, zIndex: 6,
          keyframes: [ { t: 0, x: -150 }, { t: 2.6, x: 130, ease: "inOutSine" }, { t: 4.2, x: 230, ease: "inOutSine" } ] },

        { type: "caption", content: "Deep pop", start: 3.4, entrance: "elastic-pop", idle: "float", idleAmount: 0.5,
          position: { x: 50, y: 72 }, fontSize: 46, weight: 800, color: "#ffffff",
          chipColor: "#2c3138", chipBorder: "rgba(0,0,0,0)", radius: 18, zIndex: 7 },
        { type: "icon", content: "waveform", start: 3.9, entrance: "fade-in", idle: "pulse",
          position: { x: 50, y: 80 }, size: "sm", color: "surface", zIndex: 7 }
      ]},
    { id: "cta", start: 7, end: 10.5, background: "solid", transition: "zoom",
      backgroundOptions: { color: "#111318" },
      elements: [
        { type: "text", content: "400+ SFX", start: 0.15, entrance: "char-pop",
          position: { x: 50, y: 42 }, fontSize: 130, weight: 800, color: "#ffffff" },
        { type: "counter", from: 0, to: 412, suffix: " downloads today", start: 0.9, entrance: "fade-in",
          countDuration: 1.6, position: { x: 50, y: 54 }, fontSize: 40, weight: 600, color: "accent" },
        { type: "caption", content: "comment “SFX” 👇", start: 1.4, entrance: "slide-up", idle: "bob",
          position: { x: 50, y: 68 }, size: "md", color: "#ffffff", chipColor: "#1877f2", chipBorder: "rgba(0,0,0,0)" }
      ]}
  ]
}, "images/ref-timeline.png");

add("Reference remakes", "3D deck showcase", "Tilted slide cards drifting in a perspective stack.", {
  meta: { prompt: "Portfolio reel: pitch-deck slides scattered in 3D, drifting with parallax while the camera pulls back.",
          style: "3d-deck", ratio: "9:16", width: 1080, height: 1920, duration: 11, font: "grotesk" },
  palette: { bg: "#d9d9d9", primary: "#111111", accent: "#ff3b21", ink: "#f5f5f5", muted: "#8b8b8b" },
  scenes: [
    { id: "stack", start: 0, end: 7.4, background: "gradient-linear",
      backgroundOptions: { color: "#e6e6e6", color2: "#b9b9b9", angle: 160, opacity: 0.7 },
      camera: { from: { zoom: 1.18, y: 4, rotate: 1.5 }, to: { zoom: 0.96, y: -3, rotate: -1 }, ease: "inOutCubic" },
      elements: [
        { type: "card", tone: "accent", fill: "accent", ink: "#ffffff", label: "Metrics", big: "4", lines: 0,
          w: 780, h: 430, radius: 26, start: 0.0, entrance: "arc-in", idle: "parallax", idleAmount: 1.1,
          position: { x: 52, y: 12 }, rotate: -7, tilt: { x: 8, y: -14 }, perspective: 1400, zIndex: 5 },
        { type: "card", tone: "dark", label: "2.4 Process", title: "Discover\nDirection\nDesign", lines: 0,
          w: 820, h: 400, radius: 26, start: 0.35, entrance: "arc-in", idle: "parallax", idleAmount: 0.9, idleSpeed: 0.8,
          position: { x: 50, y: 32 }, rotate: -4, tilt: { x: 6, y: -10 }, perspective: 1400, zIndex: 4 },
        { type: "card", tone: "light", label: "2.2", title: "Opportunity", lines: 4,
          w: 760, h: 380, radius: 24, start: 0.7, entrance: "arc-in", idle: "parallax", idleAmount: 0.8, idleSpeed: 0.9,
          position: { x: 50, y: 52 }, rotate: 1.5, tilt: { x: 4, y: 8 }, perspective: 1400, zIndex: 3 },
        { type: "card", tone: "dark", label: "4.1 Metrics", title: "2.1M   55K   12", lines: 3, titleSize: 54,
          w: 800, h: 400, radius: 26, start: 1.05, entrance: "arc-in", idle: "parallax", idleAmount: 0.85, idleSpeed: 0.75,
          position: { x: 50, y: 72 }, rotate: -3, tilt: { x: -5, y: -8 }, perspective: 1400, zIndex: 2 },
        { type: "card", tone: "accent", fill: "accent", ink: "#ffffff", label: "Noteform", big: "N", lines: 0,
          w: 780, h: 400, radius: 26, start: 1.4, entrance: "arc-in", idle: "parallax", idleAmount: 1, idleSpeed: 0.7,
          position: { x: 50, y: 92 }, rotate: -8, tilt: { x: -8, y: 10 }, perspective: 1400, zIndex: 1 },
        { type: "caption", content: "Noteform — Pitch Deck", start: 2.2, entrance: "fade-in", idle: "float",
          position: { x: 50, y: 95 }, size: "sm", color: "#1a1a1a", chipColor: "rgba(255,255,255,.6)", zIndex: 8 }
      ]},
    { id: "title", start: 7.4, end: 11, background: "solid", transition: "iris",
      backgroundOptions: { color: "#111111" },
      elements: [
        { type: "shape", shape: "rect", fill: "accent", w: 1100, h: 220, start: 0, entrance: "wipe-reveal",
          position: { x: 50, y: 44 }, rotate: -3, zIndex: 1 },
        { type: "text", content: "DECKS THAT\nMOVE", start: 0.3, entrance: "char-cascade", uppercase: true,
          position: { x: 50, y: 44 }, fontSize: 118, weight: 900, color: "#ffffff", lineHeight: 0.98, tracking: -3, zIndex: 2 },
        { type: "caption", content: "design · motion · story", start: 1.1, entrance: "slide-up",
          position: { x: 50, y: 64 }, size: "sm", color: "#f1f1f1", chipColor: "rgba(255,255,255,.08)", zIndex: 2 }
      ]}
  ]
}, "images/ref-deck3d.png");

add("Reference remakes", "Editorial collage", "Cream paper, dashed grid, barcode and red highlight type.", {
  meta: { prompt: "Print-style collage: cream paper, technical grid, barcode, bold statement type with red keywords.",
          style: "editorial", ratio: "9:16", width: 1080, height: 1920, duration: 10, font: "sans" },
  palette: { bg: "#f2efe6", primary: "#141414", accent: "#e8151d", muted: "#8e8a7e", ink: "#141414" },
  scenes: [
    { id: "collage", start: 0, end: 6.4, background: "paper",
      backgroundOptions: { color: "#f2efe6", opacity: 0.06 },
      camera: { from: { zoom: 1.08, x: 2 }, to: { zoom: 1, x: -1 }, ease: "outQuint" },
      elements: [
        { type: "barcode", w: 260, h: 96, bars: 38, seed: "vidz", color: "primary", start: 0.1,
          entrance: "wipe-reveal", position: { x: 74, y: 8 }, zIndex: 4 },
        { type: "grid-overlay", w: 620, h: 500, cols: 4, rows: 4, color: "muted", lineOpacity: 0.5,
          strokeStyle: "dashed", start: 0.35, entrance: "fade-in", idle: "drift", idleAmount: 0.3,
          position: { x: 56, y: 46 }, zIndex: 1 },
        { type: "icon", content: "bulb", fontSize: 620, start: 0.0, entrance: "blur-in", idle: "float", idleAmount: 0.6,
          position: { x: 8, y: 52 }, rotate: -12, zIndex: 2 },
        { type: "text", content: "You've got the", start: 0.7, entrance: "mask-up",
          position: { x: 50, y: 38 }, fontSize: 86, weight: 700, color: "primary", tracking: -2, zIndex: 5 },
        { type: "text", content: [ { text: "ideas", color: "accent", weight: 900 }, { text: " and", color: "primary" } ],
          start: 1.05, entrance: "mask-up", position: { x: 48, y: 47 }, fontSize: 96, weight: 800, tracking: -2, zIndex: 5 },
        { type: "text", content: "content", start: 1.45, entrance: "char-pop",
          position: { x: 46, y: 57 }, fontSize: 130, weight: 900, color: "accent", tracking: -4, zIndex: 5 },
        { type: "icon", content: "butterfly", fontSize: 120, start: 2.1, entrance: "arc-in", idle: "drift", idleAmount: 1.2,
          position: { x: 74, y: 52 }, rotate: 8, zIndex: 6 },
        { type: "caption", content: "HD · 4K · DO NOT THROW AWAY", start: 2.6, entrance: "fade-in", uppercase: true,
          position: { x: 50, y: 90 }, fontSize: 26, tracking: 18, color: "muted", chip: false, zIndex: 5 }
      ]},
    { id: "turn", start: 6.4, end: 10, background: "solid", transition: "whip",
      backgroundOptions: { color: "#141414" },
      elements: [
        { type: "text", content: "We turn them into", start: 0.15, entrance: "word-cascade",
          position: { x: 50, y: 42 }, fontSize: 58, weight: 500, color: "#cfcbc0" },
        { type: "text", content: "MOTION", start: 0.6, entrance: "zoom-blur", idle: "breathe",
          position: { x: 50, y: 53 }, fontSize: 168, weight: 900, gradient: ["#ffffff", "#e8151d"], tracking: -4 },
        { type: "barcode", w: 220, h: 70, bars: 30, seed: "end", color: "#ffffff", start: 1.4,
          entrance: "wipe-reveal", position: { x: 50, y: 70 } }
      ]}
  ]
}, "images/ref-collage.png");

/* ------------------------------------------------------------------
   CREATIVE
------------------------------------------------------------------ */
add("Creative", "Data story", "Counters, bars, sparkline and progress on a mesh gradient.", {
  meta: { prompt: "Metrics reel: animated counters, a growing bar chart, a drawing sparkline and a progress bar.",
          style: "data", ratio: "16:9", width: 1600, height: 900, duration: 12, font: "grotesk" },
  palette: { bg: "#070b16", primary: "#eef2ff", accent: "#7c5cff", secondary: "#22d3ee", ok: "#34d399" },
  scenes: [
    { id: "numbers", start: 0, end: 5.6, background: "mesh",
      backgroundOptions: { color: "#070b16", color2: "#7c5cff", color3: "#22d3ee" },
      camera: { from: { zoom: 1.06 }, to: { zoom: 1 }, ease: "outQuint" },
      elements: [
        { type: "caption", content: "Q3 in review", start: 0, entrance: "slide-down",
          position: { x: 50, y: 14 }, size: "sm", color: "primary" },
        { type: "counter", from: 0, to: 128400, prefix: "$", start: 0.4, entrance: "blur-in", countDuration: 2.0,
          position: { x: 25, y: 42 }, fontSize: 86, color: "accent" },
        { type: "caption", content: "revenue", start: 0.9, entrance: "fade-in", chip: false,
          position: { x: 25, y: 55 }, size: "sm", color: "primary" },
        { type: "counter", from: 0, to: 98.6, decimals: 1, suffix: "%", start: 0.7, entrance: "blur-in", countDuration: 2.0,
          position: { x: 50, y: 42 }, fontSize: 86, color: "secondary" },
        { type: "caption", content: "uptime", start: 1.2, entrance: "fade-in", chip: false,
          position: { x: 50, y: 55 }, size: "sm", color: "primary" },
        { type: "counter", from: 0, to: 42, suffix: "k", start: 1.0, entrance: "blur-in", countDuration: 2.0,
          position: { x: 75, y: 42 }, fontSize: 86, color: "ok" },
        { type: "caption", content: "new users", start: 1.5, entrance: "fade-in", chip: false,
          position: { x: 75, y: 55 }, size: "sm", color: "primary" },
        { type: "progress", value: 0.82, w: 900, h: 18, fill: "accent", start: 2.2, entrance: "fade-in",
          fillDuration: 1.6, position: { x: 50, y: 72 } },
        { type: "caption", content: "82% of annual target", start: 2.6, entrance: "slide-up", chip: false,
          position: { x: 50, y: 80 }, size: "sm", color: "primary" }
      ]},
    { id: "charts", start: 5.6, end: 12, background: "grid", transition: "slide-left",
      backgroundOptions: { color: "#070b16", lineColor: "#7c5cff", opacity: 0.16, size: 60 },
      elements: [
        { id: "panel", type: "shape", shape: "rect", variant: "panel", w: 1300, h: 620, radius: 28, start: 0,
          entrance: "slide-up", position: { x: 50, y: 52 }, zIndex: 1 },
        { type: "text", content: "Growth compounds", parent: "panel", start: 0.3, entrance: "mask-up",
          position: { x: 30, y: 16 }, fontSize: 52, color: "primary" },
        { type: "bar-chart", values: [0.25, 0.4, 0.35, 0.6, 0.75, 0.95], colors: ["accent", "accent", "accent", "secondary", "secondary", "ok"],
          w: 520, h: 300, parent: "panel", start: 0.7, entrance: "fade-in", growDuration: 0.9, barStagger: 0.12,
          position: { x: 28, y: 58 } },
        { type: "sparkline", values: [0.2, 0.32, 0.28, 0.5, 0.44, 0.68, 0.62, 0.9], w: 520, h: 260,
          color: "secondary", parent: "panel", start: 1.1, entrance: "fade-in", drawDuration: 1.4,
          position: { x: 72, y: 55 } },
        { type: "caption", content: "6 quarters, 3.4× ARR", parent: "panel", start: 2.0, entrance: "slide-up",
          position: { x: 50, y: 90 }, size: "sm", color: "primary" },
        { type: "icon", content: "chart", start: 2.4, entrance: "elastic-pop", idle: "float",
          position: { x: 88, y: 16 }, size: "md", zIndex: 3 }
      ]}
  ]
});

add("Creative", "Kinetic quote", "Serif type, per-letter cascade and a gradient payoff line.", {
  meta: { prompt: "Editorial quote: letters cascade in over a soft spotlight, then a gradient payoff line.",
          style: "quote", ratio: "1:1", width: 1080, height: 1080, duration: 9, font: "serif" },
  palette: { bg: "#0d0b12", primary: "#f7f3ee", accent: "#e0b15c", muted: "#8b8378" },
  scenes: [
    { id: "quote", start: 0, end: 5.2, background: "spotlight",
      backgroundOptions: { color: "#0d0b12", color2: "#e0b15c", x: 50, y: 40, size: 62 },
      camera: { from: { zoom: 1.1, y: 2 }, to: { zoom: 1, y: 0 }, ease: "outQuint" },
      elements: [
        { type: "icon", content: "quote", start: 0, entrance: "elastic-pop", idle: "float",
          position: { x: 22, y: 24 }, size: "lg", color: "accent" },
        { type: "text", content: "Design is\nhow it works.", start: 0.3, entrance: "char-cascade",
          position: { x: 50, y: 48 }, fontSize: 108, weight: 500, italic: true, color: "primary", lineHeight: 1.12, maxWidth: 900 },
        { type: "shape", shape: "line", start: 1.9, entrance: "draw-line", position: { x: 50, y: 70 }, size: "md", color: "accent" },
        { type: "caption", content: "Steve Jobs", start: 2.2, entrance: "fade-in", chip: false, uppercase: true,
          position: { x: 50, y: 78 }, size: "sm", tracking: 22, color: "muted" }
      ]},
    { id: "brand", start: 5.2, end: 9, background: "gradient-conic", transition: "iris",
      backgroundOptions: { color: "#0d0b12", color2: "#e0b15c", angle: 200, opacity: 0.3 },
      elements: [
        { type: "text", content: "MAISON", start: 0.2, entrance: "word-mask", uppercase: true,
          position: { x: 50, y: 46 }, fontSize: 128, weight: 400, tracking: 12,
          gradient: ["#f7f3ee", "#e0b15c"], gradientAngle: 120 },
        { type: "caption", content: "studio for considered brands", start: 1.0, entrance: "slide-up", chip: false,
          position: { x: 50, y: 62 }, size: "sm", color: "muted", tracking: 8 }
      ]}
  ]
});

add("Creative", "Neon device demo", "Phone frame, glitch title, scanning grid and neon glow.", {
  meta: { prompt: "App promo: neon grid, glitchy title, phone device frame with UI cards sliding inside.",
          style: "app-promo", ratio: "9:16", width: 1080, height: 1920, duration: 11, font: "grotesk" },
  palette: { bg: "#05060d", primary: "#e9ecff", accent: "#00f0ff", secondary: "#ff2e88", surface: "#0f1220" },
  scenes: [
    { id: "hook", start: 0, end: 3.6, background: "grid",
      backgroundOptions: { color: "#05060d", lineColor: "#00f0ff", opacity: 0.18, size: 80 },
      elements: [
        { type: "shape", shape: "circle", variant: "glow", size: "xl", start: 0, entrance: "scale-in", idle: "breathe",
          position: { x: 50, y: 44 }, color: "secondary", zIndex: 1 },
        { type: "text", content: "SHIP", start: 0.2, entrance: "glitch", position: { x: 50, y: 38 },
          fontSize: 190, weight: 900, color: "primary", textStroke: "accent", textStrokeWidth: 3, zIndex: 2 },
        { type: "text", content: "FASTER", start: 0.55, entrance: "glitch", position: { x: 50, y: 52 },
          fontSize: 150, weight: 900, gradient: ["#00f0ff", "#ff2e88"], zIndex: 2 },
        { type: "caption", content: "v2.0 is live", start: 1.2, entrance: "slide-up", idle: "blink", idleAmount: 0.6,
          position: { x: 50, y: 68 }, size: "sm", color: "accent", zIndex: 2 }
      ]},
    { id: "device", start: 3.6, end: 8.2, background: "spotlight", transition: "zoom",
      backgroundOptions: { color: "#05060d", color2: "#00f0ff", y: 46, size: 55 },
      camera: { from: { zoom: 1.12, y: 3 }, to: { zoom: 1, y: 0 }, ease: "outQuint" },
      elements: [
        { id: "phone", type: "device", w: 560, screen: "surface", frame: "#0a0c14", start: 0,
          entrance: "rotate-in", idle: "float", idleAmount: 0.5, position: { x: 50, y: 50 }, zIndex: 2 },
        { type: "shape", shape: "rect", parent: "phone", w: 440, h: 120, radius: 18, fill: "#171b2e",
          start: 0.5, entrance: "slide-up", position: { x: 50, y: 22 } },
        { type: "shape", shape: "rect", parent: "phone", w: 440, h: 120, radius: 18, fill: "#171b2e",
          start: 0.7, entrance: "slide-up", position: { x: 50, y: 38 } },
        { type: "shape", shape: "rect", parent: "phone", w: 440, h: 220, radius: 18, fill: "#171b2e",
          start: 0.9, entrance: "slide-up", position: { x: 50, y: 60 } },
        { type: "progress", parent: "phone", value: 0.9, w: 380, h: 14, fill: "accent", track: "#232842",
          start: 1.5, entrance: "fade-in", position: { x: 50, y: 78 } },
        { type: "text", parent: "phone", content: "98%", start: 1.8, entrance: "elastic-pop",
          position: { x: 50, y: 88 }, fontSize: 52, color: "accent" },
        { type: "icon", content: "rocket", start: 1.6, entrance: "arc-in", idle: "float",
          position: { x: 80, y: 26 }, size: "lg", zIndex: 4 }
      ]},
    { id: "cta", start: 8.2, end: 11, background: "gradient-linear", transition: "flash",
      backgroundOptions: { color: "#05060d", color2: "#ff2e88", angle: 160, opacity: 0.35 },
      elements: [
        { type: "text", content: "Download now", start: 0.1, entrance: "char-flip",
          position: { x: 50, y: 46 }, fontSize: 86, color: "primary" },
        { type: "shape", shape: "pill", w: 520, h: 130, fill: "accent", start: 0.7, entrance: "elastic-pop",
          idle: "pulse", position: { x: 50, y: 62 }, zIndex: 1, shadow: "glow", shadowColor: "accent" },
        { type: "text", content: "Get the app", start: 0.95, entrance: "fade-in",
          position: { x: 50, y: 62 }, fontSize: 46, color: "#05060d", zIndex: 2 }
      ]}
  ]
});

add("Creative", "Retro poster", "Halftone dots, hard shadows and stacked display type.", {
  meta: { prompt: "Retro print poster: dotted paper, hard-shadow shapes, stacked display type that snaps in.",
          style: "retro", ratio: "4:5", width: 1080, height: 1350, duration: 9, font: "display" },
  palette: { bg: "#f5e9d0", primary: "#1c1a17", accent: "#e2543a", secondary: "#2f6f6b", muted: "#a89880" },
  scenes: [
    { id: "poster", start: 0, end: 5.4, background: "dots",
      backgroundOptions: { color: "#f5e9d0", lineColor: "#1c1a17", opacity: 0.14, size: 46 },
      elements: [
        { type: "shape", shape: "circle", w: 520, fill: "accent", start: 0, entrance: "scale-in",
          idle: "sway", position: { x: 62, y: 30 }, shadow: "hard", shadowColor: "primary", zIndex: 1 },
        { type: "shape", shape: "rect", w: 420, h: 420, fill: "secondary", radius: 0, start: 0.25,
          entrance: "drop-bounce", position: { x: 30, y: 44 }, rotate: -6,
          shadow: "hard", shadowColor: "primary", zIndex: 2 },
        { type: "text", content: "SUPER", start: 0.7, entrance: "char-pop", uppercase: true,
          position: { x: 50, y: 40 }, fontSize: 150, color: "primary", tracking: -2, zIndex: 3 },
        { type: "text", content: "SONIC", start: 1.0, entrance: "char-pop", uppercase: true,
          position: { x: 50, y: 54 }, fontSize: 150, color: "#f5e9d0", textStroke: "primary", textStrokeWidth: 4, zIndex: 3 },
        { type: "text", content: "FESTIVAL", start: 1.3, entrance: "char-pop", uppercase: true,
          position: { x: 50, y: 68 }, fontSize: 88, color: "accent", tracking: 6, zIndex: 3 },
        { type: "shape", shape: "star", w: 130, fill: "primary", start: 1.8, entrance: "spin-in", idle: "spin",
          idleSpeed: 0.4, position: { x: 16, y: 18 }, zIndex: 4 },
        { type: "caption", content: "sat 12 · harbour park", start: 2.1, entrance: "slide-up", chip: false,
          uppercase: true, tracking: 14, position: { x: 50, y: 84 }, size: "sm", color: "primary", zIndex: 4 }
      ]},
    { id: "tickets", start: 5.4, end: 9, background: "stripes", transition: "wipe",
      backgroundOptions: { color: "#e2543a", lineColor: "#1c1a17", opacity: 0.18, angle: 45, size: 90 },
      elements: [
        { type: "shape", shape: "rect", w: 800, h: 380, fill: "#f5e9d0", radius: 18, start: 0,
          entrance: "elastic-pop", position: { x: 50, y: 48 }, shadow: "hard", shadowColor: "primary", zIndex: 1 },
        { type: "text", content: "TICKETS", start: 0.3, entrance: "mask-up", uppercase: true,
          position: { x: 50, y: 42 }, fontSize: 100, color: "primary", zIndex: 2 },
        { type: "barcode", w: 420, h: 90, bars: 40, color: "primary", start: 0.7, entrance: "wipe-reveal",
          position: { x: 50, y: 58 }, zIndex: 2 }
      ]}
  ]
});

/* ------------------------------------------------------------------
   CLASSIC (upgraded originals)
------------------------------------------------------------------ */
add("Classic", "UI / SaaS", "Dashboard card reveal with staggered stats.", {
  meta: { prompt: "Dashboard card reveal: panel slides up, title + stats stagger in, accent pulse.",
          style: "ui", ratio: "16:9", width: 1600, height: 900, duration: 9, font: "grotesk" },
  palette: { bg: "#0b1020", primary: "#e8ecff", accent: "#22d3ee" },
  scenes: [
    { id: "dash", start: 0, end: 5.4, background: "gradient-linear",
      camera: { from: { zoom: 1.05 }, to: { zoom: 1 }, ease: "outQuint" }, elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "pulse",
        position: { x: 80, y: 22 }, size: "md", color: "accent", zIndex: 1 },
      { id: "card", type: "shape", shape: "rect", variant: "panel", start: 0.25, entrance: "slide-up",
        position: { x: 50, y: 52 }, size: "lg", zIndex: 2 },
      { type: "text", content: "Weekly Report", parent: "card", entrance: "mask-up",
        position: { x: 50, y: 18 }, size: "md", color: "primary" },
      { type: "shape", shape: "line", parent: "card", entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 34 }, size: "md", color: "accent" },
      { type: "counter", from: 0, to: 128, prefix: "+", suffix: "%", parent: "card", start: 1.0,
        entrance: "elastic-pop", countDuration: 1.3, position: { x: 27, y: 58 }, fontSize: 70, color: "accent" },
      { type: "caption", content: "conversions", parent: "card", start: 1.25, entrance: "fade-in",
        position: { x: 27, y: 82 }, size: "sm", color: "primary" },
      { type: "counter", from: 0, to: 42, suffix: "k", parent: "card", start: 1.45,
        entrance: "elastic-pop", countDuration: 1.3, position: { x: 72, y: 58 }, fontSize: 70, color: "primary" },
      { type: "caption", content: "sessions", parent: "card", start: 1.7, entrance: "fade-in",
        position: { x: 72, y: 82 }, size: "sm", color: "primary" },
      { type: "icon", content: "bolt", start: 2.0, entrance: "elastic-pop", idle: "float",
        position: { x: 13, y: 20 }, size: "sm", color: "accent", zIndex: 3 }
    ]},
    { id: "outro", start: 5.4, end: 9, background: "gradient-radial", transition: "zoom", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 46 }, size: "xl", color: "accent", zIndex: 1 },
      { type: "text", content: "Analytics that move.", start: 0.25, entrance: "word-cascade",
        position: { x: 50, y: 44 }, size: "lg", color: "primary", zIndex: 2 },
      { type: "shape", shape: "line", start: 0.6, entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 58 }, size: "lg", color: "accent", zIndex: 2 },
      { type: "caption", content: "ui / saas preset", start: 1.0, entrance: "slide-up", idle: "float",
        position: { x: 50, y: 74 }, size: "sm", color: "primary", zIndex: 2 }
    ]}
  ]
});

add("Classic", "Talking head", "Avatar, subtitle cycling and a CTA card.", {
  meta: { prompt: "Vertical explainer: avatar placeholder top, captions cycle like subtitles, waveform pulses.",
          style: "talking-head", ratio: "9:16", width: 1080, height: 1920, duration: 9.5, font: "sans" },
  palette: { bg: "#101418", primary: "#f5f7fa", accent: "#34d399" },
  scenes: [
    { id: "talk", start: 0, end: 6.6, background: "gradient-radial", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 24 }, size: "lg", color: "accent", zIndex: 1 },
      { id: "avi", type: "avatar-placeholder", start: 0.2, entrance: "elastic-pop",
        position: { x: 50, y: 24 }, size: "md", color: "accent", zIndex: 2 },
      { type: "icon", content: "waveform", parent: "avi", entrance: "fade-in", idle: "pulse",
        position: { x: 50, y: 128 }, size: "sm", color: "accent" },
      { type: "caption", content: "@host — recording", start: 0.9, entrance: "fade-in",
        position: { x: 50, y: 42 }, size: "sm", color: "primary", zIndex: 3 },
      { type: "caption", content: "Captions carry the story…", start: 1.3, end: 3.3, entrance: "slide-up",
        exit: "fade-out", position: { x: 50, y: 66 }, size: "md", color: "primary", zIndex: 4 },
      { type: "caption", content: "…the avatar just marks who is speaking.", start: 3.4, end: 5.4,
        entrance: "slide-up", exit: "fade-out", position: { x: 50, y: 66 }, size: "md", color: "primary", zIndex: 4 },
      { type: "caption", content: "Focus stays on the words.", start: 5.5, entrance: "slide-up",
        position: { x: 50, y: 66 }, size: "md", color: "accent", zIndex: 4 }
    ]},
    { id: "cta", start: 6.6, end: 9.5, background: "solid", transition: "slide-up", elements: [
      { type: "avatar-placeholder", start: 0, entrance: "fade-in", idle: "float",
        position: { x: 50, y: 18 }, size: "sm", color: "accent", zIndex: 2 },
      { type: "text", content: "Your script here", start: 0.3, entrance: "elastic-pop",
        position: { x: 50, y: 44 }, size: "lg", color: "primary", zIndex: 2 },
      { type: "shape", shape: "line", start: 0.7, entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 52 }, size: "md", color: "accent", zIndex: 2 },
      { type: "caption", content: "talking-head preset", start: 1.0, entrance: "slide-up", idle: "float",
        position: { x: 50, y: 64 }, size: "sm", color: "primary", zIndex: 2 }
    ]}
  ]
});

add("Classic", "Typographic", "Kinetic type hook with an elastic payoff.", {
  meta: { prompt: "Kinetic type hook: words pop in with elastic overshoot over a glow, wipe to a closing line.",
          style: "typographic", ratio: "16:9", width: 1600, height: 900, duration: 9, font: "display" },
  palette: { bg: "#180a24", primary: "#ffffff", accent: "#f0abfc" },
  scenes: [
    { id: "hook", start: 0, end: 5.2, background: "vignette", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 50 }, size: "xl", color: "accent", zIndex: 1 },
      { type: "text", content: "MAKE", start: 0.3, entrance: "elastic-pop", position: { x: 32, y: 38 }, size: "xl", color: "primary", zIndex: 2 },
      { type: "text", content: "IT", start: 0.65, entrance: "elastic-pop", position: { x: 58, y: 38 }, size: "xl", color: "accent", zIndex: 2 },
      { type: "text", content: "MOVE", start: 1.0, entrance: "elastic-pop", idle: "pulse", position: { x: 46, y: 60 }, size: "xl", color: "primary", zIndex: 2 },
      { type: "shape", shape: "line", start: 1.5, entrance: "draw-line", idle: "pulse", position: { x: 50, y: 76 }, size: "lg", color: "accent", zIndex: 2 },
      { type: "caption", content: "kinetic type", start: 1.9, entrance: "fade-in", idle: "float", position: { x: 50, y: 88 }, size: "sm", color: "primary", zIndex: 2 }
    ]},
    { id: "close", start: 5.2, end: 9, background: "gradient-linear", transition: "wipe", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 48 }, size: "lg", color: "accent", zIndex: 1 },
      { type: "text", content: "Words are the animation.", start: 0.25, entrance: "word-mask",
        position: { x: 50, y: 46 }, size: "lg", color: "primary", zIndex: 2 },
      { type: "shape", shape: "line", start: 0.7, entrance: "draw-line", position: { x: 50, y: 58 }, size: "md", color: "accent", zIndex: 2 },
      { type: "caption", content: "typographic preset", start: 1.0, entrance: "slide-up", idle: "float",
        position: { x: 50, y: 72 }, size: "sm", color: "primary", zIndex: 2 }
    ]}
  ]
});

add("Classic", "Product / brand", "Glow build, product frame and logo wipe.", {
  meta: { prompt: "Brand card reveal: glow builds first, product frame slides up over it, logo wipes in and settles.",
          style: "product", ratio: "1:1", width: 1080, height: 1080, duration: 9, font: "grotesk" },
  palette: { bg: "#0c0f14", primary: "#f8fafc", accent: "#f59e0b" },
  scenes: [
    { id: "reveal", start: 0, end: 5.6, background: "gradient-radial",
      camera: { from: { zoom: 1.08 }, to: { zoom: 1 }, ease: "outQuint" }, elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 50 }, size: "xl", color: "accent", zIndex: 1 },
      { id: "frame", type: "shape", shape: "rect", variant: "panel", start: 0.55, entrance: "slide-up",
        position: { x: 50, y: 50 }, size: "lg", zIndex: 2 },
      { type: "shape", shape: "line", parent: "frame", entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 26 }, size: "sm", color: "accent" },
      { type: "text", content: "NOVA", parent: "frame", start: 1.2, entrance: "char-cascade",
        position: { x: 50, y: 48 }, size: "lg", color: "primary" },
      { type: "caption", content: "studio", parent: "frame", start: 1.6, entrance: "fade-in",
        position: { x: 50, y: 72 }, size: "sm", color: "accent" },
      { type: "icon", content: "spark", start: 2.1, entrance: "elastic-pop", idle: "float",
        position: { x: 79, y: 26 }, size: "sm", color: "accent", zIndex: 3 }
    ]},
    { id: "tag", start: 5.6, end: 9, background: "solid", transition: "iris", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 46 }, size: "lg", color: "accent", zIndex: 1 },
      { type: "text", content: "Built to be seen.", start: 0.25, entrance: "mask-up",
        position: { x: 50, y: 44 }, size: "lg", color: "primary", zIndex: 2 },
      { type: "shape", shape: "line", start: 0.7, entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 56 }, size: "md", color: "accent", zIndex: 2 },
      { type: "caption", content: "product / brand preset", start: 1.0, entrance: "slide-up", idle: "float",
        position: { x: 50, y: 70 }, size: "sm", color: "primary", zIndex: 2 }
    ]}
  ]
});

add("Classic", "Mixed 3-act", "Hook → stats → brand closer on one timeline.", {
  meta: { prompt: "Three-act sequence: typographic hook → UI stat reveal → product/brand closer.",
          style: "mixed", ratio: "16:9", width: 1600, height: 900, duration: 10, font: "grotesk" },
  palette: { bg: "#0a1220", primary: "#f1f5f9", accent: "#818cf8" },
  scenes: [
    { id: "act1-hook", start: 0, end: 3.4, background: "vignette", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 48 }, size: "xl", color: "accent", zIndex: 1 },
      { type: "text", content: "SHOW,", start: 0.25, entrance: "char-pop", position: { x: 38, y: 40 }, size: "xl", color: "primary", zIndex: 2 },
      { type: "text", content: "don't tell.", start: 0.6, entrance: "elastic-pop", position: { x: 58, y: 60 }, size: "lg", color: "accent", zIndex: 2 },
      { type: "shape", shape: "line", start: 1.1, entrance: "draw-line", idle: "pulse", position: { x: 50, y: 78 }, size: "lg", color: "accent", zIndex: 2 }
    ]},
    { id: "act2-stats", start: 3.4, end: 6.8, background: "gradient-linear", transition: "slide-left", elements: [
      { id: "panel", type: "shape", shape: "rect", variant: "panel", start: 0.1, entrance: "slide-up",
        position: { x: 50, y: 52 }, size: "lg", zIndex: 2 },
      { type: "text", content: "It converts", parent: "panel", entrance: "mask-up", position: { x: 50, y: 20 }, size: "md", color: "primary" },
      { type: "counter", from: 0, to: 3.2, decimals: 1, suffix: "×", parent: "panel", start: 0.8,
        entrance: "elastic-pop", position: { x: 30, y: 58 }, fontSize: 70, color: "accent" },
      { type: "caption", content: "engagement", parent: "panel", start: 1.05, entrance: "fade-in", position: { x: 30, y: 82 }, size: "sm", color: "primary" },
      { type: "counter", from: 0, to: -41, suffix: "%", parent: "panel", start: 1.25,
        entrance: "elastic-pop", position: { x: 70, y: 58 }, fontSize: 70, color: "primary" },
      { type: "caption", content: "drop-off", parent: "panel", start: 1.5, entrance: "fade-in", position: { x: 70, y: 82 }, size: "sm", color: "primary" },
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "pulse",
        position: { x: 84, y: 18 }, size: "md", color: "accent", zIndex: 1 }
    ]},
    { id: "act3-brand", start: 6.8, end: 10, background: "gradient-radial", transition: "wipe", elements: [
      { type: "shape", shape: "circle", variant: "glow", start: 0, entrance: "scale-in", idle: "breathe",
        position: { x: 50, y: 50 }, size: "xl", color: "accent", zIndex: 1 },
      { id: "brandframe", type: "shape", shape: "rect", variant: "panel", start: 0.4, entrance: "scale-in",
        position: { x: 50, y: 50 }, size: "md", zIndex: 2 },
      { type: "text", content: "MOTIF", parent: "brandframe", start: 0.9, entrance: "char-cascade",
        position: { x: 50, y: 42 }, size: "md", color: "primary" },
      { type: "shape", shape: "line", parent: "brandframe", start: 1.25, entrance: "draw-line", idle: "pulse",
        position: { x: 50, y: 66 }, size: "sm", color: "accent" },
      { type: "caption", content: "mixed preset — 3 styles, 1 timeline", start: 1.6, entrance: "slide-up", idle: "float",
        position: { x: 50, y: 82 }, size: "sm", color: "primary", zIndex: 3 }
    ]}
  ]
});

/* ------------------------------------------------------------------
   SNIPPETS — pasteable element blocks
------------------------------------------------------------------ */
const SNIPPETS = [
  { name: "Rich text run", code: {
      type: "text", content: [ { text: "You've got the " }, { text: "ideas", color: "accent", weight: 900 } ],
      start: 0.2, entrance: "mask-up", position: { x: 50, y: 45 }, fontSize: 90, color: "primary" } },
  { name: "Animated counter", code: {
      type: "counter", from: 0, to: 128400, prefix: "$", countDuration: 1.8, start: 0.3,
      entrance: "blur-in", position: { x: 50, y: 45 }, fontSize: 90, color: "accent" } },
  { name: "Keyframed move", code: {
      type: "icon", content: "rocket", start: 0.2, entrance: "fade-in", position: { x: 20, y: 70 }, size: "lg",
      keyframes: [ { t: 0, x: 0, y: 0 }, { t: 1.2, x: 420, y: -260, rotate: 25, ease: "inOutCubic" },
                   { t: 2.0, x: 620, y: -420, scale: 0.4, opacity: 0, ease: "inQuad" } ] } },
  { name: "Dashed option card", code: {
      id: "opt", type: "shape", shape: "rect", fill: "none", stroke: "primary", strokeStyle: "dashed",
      strokeWidth: 3, radius: 0, w: 760, h: 240, start: 0.2, entrance: "wipe-reveal", position: { x: 50, y: 50 } } },
  { name: "Clicking cursor", code: {
      type: "cursor", w: 90, color: "primary", start: 0.5, entrance: "fade-in", position: { x: 70, y: 70 },
      clicks: [1.2], keyframes: [ { t: 0, x: 140, y: 160 }, { t: 1.1, x: 0, y: 0, ease: "inOutCubic" } ] } },
  { name: "Bar chart", code: {
      type: "bar-chart", values: [0.3, 0.55, 0.45, 0.8, 0.95], colors: ["accent", "accent", "accent", "secondary", "primary"],
      w: 520, h: 300, start: 0.4, entrance: "fade-in", growDuration: 0.9, barStagger: 0.12, position: { x: 50, y: 55 } } },
  { name: "3D tilted card", code: {
      type: "card", tone: "dark", label: "2.4 Process", title: "Discover\nDirection", lines: 2, w: 780, h: 400,
      start: 0.2, entrance: "arc-in", idle: "parallax", position: { x: 50, y: 45 }, rotate: -5,
      tilt: { x: 8, y: -12 }, perspective: 1400 } },
  { name: "Camera push-in", code: { camera: { from: { zoom: 1.15, y: 4 }, to: { zoom: 1, y: 0 }, ease: "outQuint" } } },
  { name: "Sequential caption", code: {
      type: "caption", content: "This line leaves before the next arrives.", start: 1.0, end: 3.0,
      entrance: "slide-up", exit: "mask-down", position: { x: 50, y: 70 }, size: "md", color: "primary" } },
];

global.MG = Object.assign(global.MG || {}, { PRESETS: P, SNIPPETS });
})(window);
