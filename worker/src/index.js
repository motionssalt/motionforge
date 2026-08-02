/* ============================================================
   MotionForge — Cloudflare Worker entry
   ------------------------------------------------------------
   Endpoints:
     POST /telegram/webhook        Telegram webhook (secret in path or header)
     POST /api/template            {ratio, duration, style} -> empty spec
     POST /api/submit              Accept a spec, validate, dispatch render
     POST /api/webhook/render-complete   GitHub Actions status callback
     GET  /api/status/:jobId       Job lookup
     GET  /                        Health

   Secrets (wrangler secret put ...):
     TELEGRAM_BOT_TOKEN
     TELEGRAM_WEBHOOK_SECRET       shared with Telegram (setWebhook secret_token)
     RENDER_WEBHOOK_SECRET         shared with GH Actions render-complete
     GH_DISPATCH_TOKEN             PAT with `repo` (or `workflow`) scope
     GH_OWNER, GH_REPO             the repo hosting render.yml

   Binding (wrangler.toml):
     DB   d1 database "motionforge"
   ============================================================ */

import { validate } from "./validate.js";
import { buildTemplate } from "./template.js";
import { handleTelegramUpdate, tg } from "./telegram.js";

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json" },
});
const text = (s, status = 200) => new Response(s, {
  status, headers: { "content-type": "text/plain; charset=utf-8" },
});

async function dispatchRender(env, { jobId, specText, chatId }) {
  if (!env.GH_DISPATCH_TOKEN || !env.GH_OWNER || !env.GH_REPO) {
    throw new Error("GH_DISPATCH_TOKEN / GH_OWNER / GH_REPO not configured");
  }
  // GitHub Actions workflow inputs are limited to 65535 chars per value
  // and 10 inputs total. Spec typically <30KB.
  if (specText.length > 60000) {
    throw new Error("spec too large for workflow_dispatch input (60KB limit)");
  }
  const url = `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/actions/workflows/render.yml/dispatches`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.GH_DISPATCH_TOKEN,
      "accept": "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "MotionForge-Worker",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({
      ref: env.GH_REF || "main",
      inputs: {
        job_id: jobId,
        spec_json: specText,
        telegram_chat_id: String(chatId),
      },
    }),
  });
  if (r.status !== 204) {
    const b = await r.text().catch(() => "");
    throw new Error(`GitHub dispatch failed (${r.status}): ${b.slice(0, 200)}`);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    try {
      if (p === "/" || p === "/health") return text("motionforge worker ok");

      if (p === "/telegram/webhook" && request.method === "POST") {
        const sig = request.headers.get("x-telegram-bot-api-secret-token");
        if (!env.TELEGRAM_WEBHOOK_SECRET || sig !== env.TELEGRAM_WEBHOOK_SECRET) {
          return text("forbidden", 403);
        }
        const update = await request.json().catch(() => null);
        if (!update) return text("bad json", 400);
        // Fire-and-forget so Telegram gets 200 fast; retry logic
        // is Telegram's job if we crash mid-way.
        ctx.waitUntil(handleTelegramUpdate(env, update, { dispatchRender }).catch(err => {
          console.log("telegram handler error", err && err.stack || err);
        }));
        return text("ok");
      }

      if (p === "/api/template" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const spec = buildTemplate({
          ratio: body.ratio, duration: body.duration, style: body.style,
        });
        return json(spec);
      }

      if (p === "/api/submit" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !body.spec) return json({ error: "missing 'spec'" }, 400);
        const specObj = typeof body.spec === "string" ? JSON.parse(body.spec) : body.spec;
        const v = validate(specObj);
        if (v.errors.length) return json({ ok: false, errors: v.errors, warnings: v.warnings }, 422);

        const jobId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const chatId = String(body.telegram_chat_id || "");
        const userId = String(body.telegram_user_id || "");
        const specText = typeof body.spec === "string" ? body.spec : JSON.stringify(specObj);
        await env.DB.prepare(
          `INSERT INTO jobs (id, telegram_user_id, telegram_chat_id, status, ratio, duration, style, spec_json, created_at, updated_at)
           VALUES (?, ?, ?, 'validating', ?, ?, ?, ?, ?, ?)`
        ).bind(
          jobId, userId, chatId,
          specObj.meta?.ratio || null,
          (typeof specObj.meta?.duration === "number") ? specObj.meta.duration : null,
          specObj.meta?.style || null,
          specText, now, now,
        ).run();

        try {
          await dispatchRender(env, { jobId, specText, chatId });
          await env.DB.prepare("UPDATE jobs SET status='rendering', updated_at=? WHERE id=?")
            .bind(Math.floor(Date.now() / 1000), jobId).run();
          return json({ ok: true, jobId, warnings: v.warnings, stats: v.stats });
        } catch (err) {
          await env.DB.prepare("UPDATE jobs SET status='failed', error_message=?, updated_at=? WHERE id=?")
            .bind(String(err.message || err), Math.floor(Date.now() / 1000), jobId).run();
          return json({ ok: false, jobId, error: String(err.message || err) }, 500);
        }
      }

      if (p === "/api/webhook/render-complete" && request.method === "POST") {
        const sig = request.headers.get("x-render-webhook-secret");
        if (!env.RENDER_WEBHOOK_SECRET || sig !== env.RENDER_WEBHOOK_SECRET) {
          return text("forbidden", 403);
        }
        const body = await request.json().catch(() => null);
        if (!body || !body.job_id) return json({ error: "missing job_id" }, 400);
        const now = Math.floor(Date.now() / 1000);
        const status = body.status === "success" ? "done" : "failed";
        await env.DB.prepare("UPDATE jobs SET status=?, error_message=?, updated_at=? WHERE id=?")
          .bind(status, body.error || null, now, body.job_id).run();

        // If the Actions job could not deliver the MP4 to Telegram (e.g.
        // send failed), it can pass a chat_id and error and we surface it here.
        if (status === "failed" && body.telegram_chat_id && env.TELEGRAM_BOT_TOKEN) {
          ctx.waitUntil(tg(env, "sendMessage", {
            chat_id: body.telegram_chat_id,
            text: "❌ Render failed:\n" + (body.error || "unknown error") + "\n\nJob: `" + body.job_id + "`",
            parse_mode: "Markdown",
          }));
        }
        return json({ ok: true });
      }

      if (p.startsWith("/api/status/") && request.method === "GET") {
        const jobId = p.slice("/api/status/".length);
        const row = await env.DB.prepare(
          "SELECT id, status, ratio, duration, style, error_message, created_at, updated_at FROM jobs WHERE id = ?"
        ).bind(jobId).first();
        if (!row) return json({ error: "not found" }, 404);
        return json(row);
      }

      return text("not found", 404);
    } catch (err) {
      console.log("worker error", err && err.stack || err);
      return json({ error: String(err.message || err) }, 500);
    }
  },
};
