# MotionForge

Telegram bot that turns a **Motion JSON Studio** spec into a rendered MP4.

This repo *wraps* the existing browser-side motion engine (`js/engine.js`, `js/validate.js`, `js/presets.js`) — it does **not** re-implement it. The engine's `E.draw(comp, t)` contract is deterministic (any frame is fully defined by an absolute time in seconds), so headless video capture is just seek + screenshot per frame + `ffmpeg`.

```
Telegram ⇄ Cloudflare Worker (validate, dispatch)
                ↓
         Cloudflare D1  (job + session state)
                ↓
   GitHub Actions render.yml (workflow_dispatch)
                ↓
   Puppeteer + headless Chrome loads render/harness.html,
   which pulls in js/engine.js exactly like index.html does.
   For each frame:  E.draw(comp, i / fps)  →  page.screenshot()
                ↓
   ffmpeg -i frame_%05d.png ... output.mp4
                ↓
   Actions curls sendVideo → chat.  Then pings the Worker
   /api/webhook/render-complete with success/fail.
```

No R2, no S3, no external storage. The MP4 exists only on the ephemeral runner and lands directly in the user's Telegram chat.

---

## Repo layout

```
.
├── js/                       # UNCHANGED, from Motion JSON Studio
│   ├── engine.js             #   the deterministic draw(comp,t) engine
│   ├── validate.js           #   spec validator (also mirrored server-side)
│   └── presets.js
├── render/
│   ├── harness.html          # minimal HTML that Puppeteer loads via file://
│   ├── capture.js            # seek + screenshot + ffmpeg driver
│   └── package.json          # puppeteer
├── worker/
│   ├── src/
│   │   ├── index.js          # Cloudflare Worker entry (routing)
│   │   ├── telegram.js       # bot conversation flow
│   │   ├── validate.js       # faithful port of js/validate.js
│   │   └── template.js       # template + creative brief generator
│   ├── wrangler.toml
│   └── package.json
├── migrations/
│   ├── 0001_init.sql                     # jobs + sessions tables
│   ├── 0002_sessions_density.sql         # sessions: duration → density + style_category
│   └── 0003_sessions_drop_density.sql    # sessions: drop density + style — ratio only
└── .github/workflows/
    ├── bootstrap.yml         # one-time D1 create (workflow_dispatch)
    ├── deploy.yml            # push-to-main → migrate + deploy
    └── render.yml            # workflow_dispatch → render + Telegram
```

---

## One-time setup (nothing needs `wrangler` on your laptop)

You need three credentials + two random secrets. Enter them once as repo secrets and never touch them again.

### 1. Cloudflare token + account id

* Dashboard → **My Profile → API Tokens → Create Token → Custom token**
* Permissions:
  * Account · **Workers Scripts** · Edit
  * Account · **D1** · Edit
* Account resources: your account only.
* Save the token, and grab your **Account ID** from the Workers overview page.

### 2. Telegram bot

* Talk to [@BotFather](https://t.me/BotFather) → `/newbot` → get a token.
* Note the token — you'll set the webhook after deploy.

### 3. GitHub PAT (for the Worker to trigger `render.yml`)

* GitHub → Settings → Developer settings → **Fine-grained tokens**.
* Repository access: this repo only.
* Permissions: **Actions: Read and write**, **Contents: Read**.

### 4. Two random secrets

```bash
openssl rand -hex 32   # -> TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32   # -> RENDER_WEBHOOK_SECRET
```

### 5. Add all secrets to GitHub

Settings → Secrets and variables → **Actions → Secrets**:

| name                      | value                                       |
| ------------------------- | ------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`    | token from step 1                           |
| `CLOUDFLARE_ACCOUNT_ID`   | account id from step 1                      |
| `TELEGRAM_BOT_TOKEN`      | from BotFather                              |
| `TELEGRAM_WEBHOOK_SECRET` | random hex from step 4                      |
| `RENDER_WEBHOOK_SECRET`   | random hex from step 4                      |
| `GH_DISPATCH_TOKEN`       | fine-grained PAT from step 3                |

Then Settings → Secrets and variables → **Actions → Variables**:

| name         | value                                                        |
| ------------ | ------------------------------------------------------------ |
| `WORKER_URL` | *filled in after first deploy*, e.g. `https://motionforge.YOUR-SUBDOMAIN.workers.dev` |

### 6. Bootstrap D1 (once)

* GitHub → Actions tab → **bootstrap-d1** → *Run workflow*.
* When it finishes, open the job summary. It prints a `database_id`.
* Edit `worker/wrangler.toml` — set:
  * `database_id = "..."` (from the summary),
  * `GH_OWNER = "your-github-username"`,
  * `GH_REPO  = "motionforge"` (or whatever you named this repo).
* Commit + push. That push triggers `deploy.yml`, which applies migrations and deploys the Worker.

### 7. Fill the same secrets into Cloudflare (for the Worker)

The Worker needs them at runtime. Two options — pick one:

**a) Via the Cloudflare dashboard (no CLI):**

Workers & Pages → `motionforge` → *Settings → Variables → Environment variables* → **Encrypt**:

* `TELEGRAM_BOT_TOKEN`
* `TELEGRAM_WEBHOOK_SECRET`
* `RENDER_WEBHOOK_SECRET`
* `GH_DISPATCH_TOKEN`

**b) Via a wrangler command inside Actions** (`gh workflow run` or a small helper workflow) — not required.

### 8. Grab the Worker URL, save it as `WORKER_URL`

After `deploy.yml` succeeds the log prints the deployed URL (or check Workers dashboard). Set it as the `WORKER_URL` GitHub **variable** (step 5). `render.yml` uses it to POST the completion callback.

### 9. Register the Telegram webhook

Replace `<BOT_TOKEN>`, `<WORKER_URL>`, `<TELEGRAM_WEBHOOK_SECRET>` and run:

```bash
curl -sS "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{
    "url": "<WORKER_URL>/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message","edited_message","callback_query"]
  }'
```

Verify with:

```bash
curl -sS "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Done.

---

## What happens automatically on push

* Push to `main` touching `worker/**` or `migrations/**` → `deploy.yml` runs, applies D1 migrations and deploys the Worker.
* Push to any other path → nothing.
* Rendering is only ever triggered by the Worker via `workflow_dispatch`.

You never run `wrangler` yourself.

---

## End-to-end test

1. In Telegram, open your bot → `/start`.
2. Pick a ratio (`16:9`). **That's the only choice.** No style picker, no density picker — the authoring AI decides visual style, scene count, element density, and duration itself, based on the user's own prompt and any attached audio.
3. The bot immediately sends you `motionforge-template.json`. Open it — `meta.prompt` is a large, self-documenting creative brief that:
     * enumerates the full preset vocabulary (types, entrances, idles, exits, shapes, backgrounds, transitions, fonts, sizes, eases, ratios);
     * lists exactly what fields the server-side validator requires per element type, pulled directly from `worker/src/validate.js`;
     * lists the common validator mistakes (typoed preset names, out-of-range positions, gap/overlap warnings, missing type-specific fields) in the validator's own wording;
     * explains how `color: "primary"` / `"accent"` / etc. resolve against the `palette` object vs. raw hex;
     * inlines one **fully worked example scene** (adapted from the `Checklist compare` preset) showing correct field usage, staggered starts, parent-child grouping, and a camera move.
   `meta.duration` in the template is `null` on purpose — the authoring AI fills it in from any attached audio or its own pacing judgement.
4. Paste the whole JSON (and any voiceover/reference material) into ChatGPT / Claude / Gemini with a prompt like: *"Fill in the scenes array of this Motion JSON Studio spec — content is X. Set meta.duration to match the attached audio."*
5. Save the AI's JSON to a file and send it back to the bot **as a `.json` file attachment**. Pasted JSON text is not accepted — file uploads only.
6. Bot replies **"✅ Spec validated. Queued for render."**
7. In 1–3 minutes the MP4 arrives in the same chat.

If validation fails, the bot returns the exact error messages from `worker/src/validate.js` — same wording (including *"did you mean…"* suggestions) as `js/validate.js` uses in the studio. Fix and resend.

---

## Troubleshooting

**"Puppeteer/Chrome install failed" on the Actions runner.**
`render.yml` explicitly installs the shared libs Chromium needs (`libnss3`, `libatk*`, etc.). If a new base image changes those, add the missing one to the *Extra Chrome dependencies* step. `npx puppeteer browsers install chrome` in the same step is the manual fallback if postinstall didn't grab Chrome.

**"ffmpeg: command not found".**
`render.yml` installs `ffmpeg` from apt at the top of the job. If you changed the workflow, make sure that step still runs before *Render MP4*.

**Blank / black frames in the output MP4.**
Almost always means the spec was injected *after* `engine.js` ran, so the engine built with `window.__SPEC__ === undefined`. `render/capture.js` uses `page.evaluateOnNewDocument(...)` to install `__SPEC__` *before* the harness page's own scripts execute — do not move that call. If you edit the harness, keep `engine.js` and `validate.js` loaded from `<script src>` tags at the bottom of `<body>`, exactly like `index.html` does.

**Screenshots wrong size / crop.**
The harness sets `#stage` to the spec's exact `meta.width × meta.height`, and the render script calls `page.setViewport({ width: W, height: H })` to match. If you scale beyond that, resize in ffmpeg (`-vf scale=...`) rather than in the harness — the engine's `--u` CSS var is derived from stage width and must stay in sync.

**GitHub `workflow_dispatch` refused with 422 / "workflow_dispatch not enabled".**
The `render.yml` workflow must live on the default branch (usually `main`) for `workflow_dispatch` to be visible via the API. If you rename the branch, update `GH_REF` in `worker/wrangler.toml` too.

**Spec too big.**
GitHub caps `workflow_dispatch` inputs at 65 535 chars per value. The Worker rejects specs over 60 000 chars before dispatch. If you need bigger, split into multiple scenes with shared palettes, or add a small storage hop (out of scope for this build).

**Telegram file upload rejected.**
Bot uploads cap at 50 MB. Short specs at 30 fps stay far under. If yours doesn't, drop fps to 24 (`meta.fps: 24`) or shorten `meta.duration`.

**How to stop everything.**
Delete the D1 database in the Cloudflare dashboard, delete the Worker, revoke the GitHub PAT and Cloudflare token, revoke the Telegram bot with `/deletebot` in BotFather.

---

## Notes on the port

* `worker/src/validate.js` is a faithful port of `js/validate.js`, with catalogue names inlined instead of read from `window.MG.Engine`. If you ever add a new entrance / type / shape to `js/engine.js`, add it to `worker/src/validate.js` in the same commit so error messages stay in sync.
* `render/harness.html` deliberately loads `js/engine.js` from the repo directly — the engine is the single source of truth for rendering.
* Nothing about the studio UI (`index.html`, `js/app.js`) is required for the pipeline; you can keep it around for authoring/preview or drop it — either way, the bot works.
