#!/usr/bin/env node
/* ============================================================
   MotionForge — headless renderer
   ------------------------------------------------------------
   Drives the EXISTING vanilla-JS engine in render/../js/*.js
   inside headless Chrome. For each frame index i in
   [0, ceil(duration * fps)]:
     1. call E.draw(comp, i/fps) inside the page (deterministic
        seek — the whole point of the draw(comp,t) contract)
     2. page.screenshot() into a numbered PNG
   Then ffmpeg stitches the sequence into an MP4.

   NO real-time playback, NO page.video(), NO framework rewrite.
   ============================================================ */
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");

/* ---------- args ---------- */
function arg(name, def) {
  const p = process.argv.findIndex(a => a === "--" + name);
  if (p >= 0 && process.argv[p + 1]) return process.argv[p + 1];
  return def;
}
const SPEC_PATH = arg("spec",  null);
const OUT_PATH  = arg("out",   "output.mp4");
const FPS_OVR   = parseFloat(arg("fps", "0")) || null;
const CRF       = arg("crf", "20");
const KEEP      = process.argv.includes("--keep-frames");

if (!SPEC_PATH || !fs.existsSync(SPEC_PATH)) {
  console.error("usage: node capture.js --spec spec.json --out output.mp4 [--fps 30] [--crf 20]");
  process.exit(2);
}

const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
const fps  = FPS_OVR || (spec.meta && +spec.meta.fps) || 30;

/* ---------- work dir ---------- */
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "motionforge-"));
const framesDir = path.join(workDir, "frames");
fs.mkdirSync(framesDir);
console.log("[capture] work dir:", workDir);

(async () => {
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
    ],
  });

  try {
    const page = await browser.newPage();

    // silence engine logs, but forward errors so we can debug
    page.on("pageerror",  e => console.error("[page error]", e.message));
    page.on("console",    m => { if (m.type() === "error") console.error("[page]", m.text()); });

    // 1) inject the spec BEFORE the harness scripts touch anything
    //    (this is what avoids the "blank frames because spec loaded
    //    after engine" trap the README calls out).
    await page.evaluateOnNewDocument((s) => { window.__SPEC__ = s; }, spec);

    // 2) load the harness (file://). The harness pulls in engine.js
    //    + validate.js via <script src=...> exactly like index.html does.
    const harnessURL = "file://" + path.resolve(__dirname, "harness.html");
    await page.goto(harnessURL, { waitUntil: "networkidle0" });

    // 3) wait for webfonts + engine bridge
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
      // small extra tick to let font metrics settle
      await new Promise(r => setTimeout(r, 150));
    });
    await page.waitForFunction("window.__forgeReady === true && window.MG && window.MG.Engine", { timeout: 15000 });

    // 4) build once
    const info = await page.evaluate(() => window.__forgeBuild());
    const W = info.W, H = info.H, duration = info.duration;
    console.log(`[capture] ${W}x${H} @ ${fps}fps, duration=${duration}s`);
    if (info.warnings && info.warnings.length) {
      console.log("[capture] validate warnings:", info.warnings.length);
    }

    // 5) resize viewport to match spec, at deviceScaleFactor 1
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

    // small idle after viewport change so % positions settle
    await page.evaluate(() => new Promise(r => setTimeout(r, 60)));

    const stageHandle = await page.$("#stage");
    if (!stageHandle) throw new Error("harness missing #stage");

    // 6) frame loop — deterministic seek + screenshot
    const totalFrames = Math.max(1, Math.ceil(duration * fps));
    console.log(`[capture] rendering ${totalFrames} frames`);
    const t0 = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      const t = i / fps;
      await page.evaluate((tm) => window.__forgeDraw(tm), t);
      const file = path.join(framesDir, "frame_" + String(i).padStart(5, "0") + ".png");
      await stageHandle.screenshot({ path: file, omitBackground: false });
      if ((i + 1) % 30 === 0 || i === totalFrames - 1) {
        const pct = (((i + 1) / totalFrames) * 100).toFixed(1);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[capture] frame ${i + 1}/${totalFrames} (${pct}%) t=${elapsed}s`);
      }
    }
    await stageHandle.dispose();
    await browser.close();

    // 7) ffmpeg encode
    console.log("[capture] encoding with ffmpeg...");
    await runFfmpeg([
      "-y",
      "-framerate", String(fps),
      "-i", path.join(framesDir, "frame_%05d.png"),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-crf", String(CRF),
      "-preset", "veryfast",
      "-movflags", "+faststart",
      OUT_PATH,
    ]);
    console.log("[capture] done ->", OUT_PATH);
  } finally {
    if (!KEEP) {
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
    } else {
      console.log("[capture] kept frames at:", framesDir);
    }
  }
})().catch(err => {
  console.error("[capture] FAILED:", err && err.stack || err);
  process.exit(1);
});

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
    proc.on("error", reject);
    proc.on("exit", code => code === 0 ? resolve() : reject(new Error("ffmpeg exit " + code)));
  });
}
