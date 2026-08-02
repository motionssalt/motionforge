/* ============================================================
   MotionForge — Telegram bot conversation logic
   ------------------------------------------------------------
   Stateless-ish: each user's flow position lives in a small row
   in D1 (table: sessions). Messages are dispatched based on that
   position. Nothing here talks to GitHub or renders — it only
   handles the chat conversation up to "spec ready, queue it".

   The flow is deliberately minimal: pick an aspect ratio, then
   the bot hands over the template. There is NO style picker and
   NO density picker — those choices belong to the authoring AI
   the user takes the template to, not to this bot.
   ============================================================ */

import { validate } from "./validate.js";
import { buildTemplate } from "./template.js";

const TG_API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

async function tg(env, method, body) {
  const r = await fetch(TG_API(env.TELEGRAM_BOT_TOKEN, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    console.log("tg", method, "failed", r.status, txt);
  }
  return r;
}

const RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

async function getSession(env, chatId) {
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE chat_id = ?")
    .bind(String(chatId)).first();
  return row || null;
}
async function setSession(env, chatId, patch) {
  const now = Math.floor(Date.now() / 1000);
  const existing = await getSession(env, chatId);
  const merged = Object.assign({
    chat_id: String(chatId), step: "idle", ratio: null,
    created_at: now,
  }, existing || {}, patch, { updated_at: now });
  await env.DB.prepare(
    `INSERT INTO sessions
       (chat_id, step, ratio, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET
       step=excluded.step, ratio=excluded.ratio,
       updated_at=excluded.updated_at`
  ).bind(
    merged.chat_id, merged.step, merged.ratio,
    merged.created_at, merged.updated_at
  ).run();
  return merged;
}
async function clearSession(env, chatId) {
  await env.DB.prepare("DELETE FROM sessions WHERE chat_id = ?").bind(String(chatId)).run();
}

/* ---------- keyboards ---------- */
const kbRatio = () => ({
  inline_keyboard: [
    RATIOS.slice(0, 3).map(r => ({ text: r, callback_data: "ratio:" + r })),
    RATIOS.slice(3).map(r => ({ text: r, callback_data: "ratio:" + r })),
  ],
});

async function proceedToTemplate(env, chatId, ratio) {
  await setSession(env, chatId, { step: "await_spec", ratio });
  const tmpl = buildTemplate({ ratio });
  const json = JSON.stringify(tmpl, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  fd.append("caption",
    `Ratio: *${ratio}* ✓\n\nTake this template + the creative brief inside \`meta.prompt\` ` +
    `to any AI (ChatGPT/Claude/Gemini). Ask it to fill in the *scenes* array. ` +
    `The AI is free to pick the visual style, the number of scenes, and the duration — ` +
    `the brief already tells it exactly what the validator expects.\n\n` +
    `Send the completed JSON back here as a \`.json\` file attachment. ` +
    `You can also attach a voiceover or reference audio in your prompt to that AI ` +
    `— MotionForge itself doesn't need audio, it just renders the JSON.`);
  fd.append("parse_mode", "Markdown");
  fd.append("document", blob, "motionforge-template.json");
  await fetch(TG_API(env.TELEGRAM_BOT_TOKEN, "sendDocument"), { method: "POST", body: fd });
}

/* ---------- main webhook handler ---------- */
export async function handleTelegramUpdate(env, update, deps) {
  // Callback-query press on an inline keyboard
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message?.chat?.id;
    const data = String(cq.data || "");
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
    if (!chatId) return;

    if (data.startsWith("ratio:")) {
      const r = data.slice(6);
      if (!RATIOS.includes(r)) return;
      return proceedToTemplate(env, chatId, r);
    }
    return;
  }

  const msg = update.message || update.edited_message;
  if (!msg) return;
  const chatId = msg.chat?.id;
  const userId = msg.from?.id;
  if (!chatId) return;

  const text = (msg.text || msg.caption || "").trim();

  /* --- commands --- */
  if (text === "/start" || text === "/new" || text === "/help") {
    await setSession(env, chatId, {
      step: "await_ratio",
      ratio: null,
    });
    const help = text === "/help"
      ? "MotionForge — turn a Motion JSON Studio spec into an MP4 via Telegram.\n\n" +
        "Flow:\n1. /new → pick an aspect ratio\n" +
        "2. Get a JSON template with a full creative brief inside\n" +
        "3. Fill it in (with any AI). The AI picks style, scene count, and duration.\n" +
        "4. Send it back as a .json file → I render + return the MP4\n\n" +
        "Commands: /new /status /cancel /help\n"
      : "👋 MotionForge. I turn a Motion JSON Studio spec into an MP4.\n\nPick an aspect ratio:";
    return tg(env, "sendMessage", {
      chat_id: chatId, text: help, reply_markup: kbRatio(),
    });
  }
  if (text === "/cancel") {
    await clearSession(env, chatId);
    return tg(env, "sendMessage", { chat_id: chatId, text: "Cancelled. /new to start over." });
  }
  if (text === "/status") {
    const row = await env.DB.prepare(
      "SELECT id, status, error_message FROM jobs WHERE telegram_chat_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(String(chatId)).first();
    if (!row) return tg(env, "sendMessage", { chat_id: chatId, text: "No jobs yet. /new to make one." });
    let line = `Last job: \`${row.id}\` — *${row.status}*`;
    if (row.error_message) line += `\n\nError: ${row.error_message}`;
    return tg(env, "sendMessage", { chat_id: chatId, text: line, parse_mode: "Markdown" });
  }

  /* --- incoming spec (as .json document only) --- */
  const sess = await getSession(env, chatId);
  let specText = null;

  if (msg.document) {
    const doc = msg.document;
    if (doc.file_size && doc.file_size > 1_000_000) {
      return tg(env, "sendMessage", { chat_id: chatId, text: "That JSON is over 1 MB — too big. Trim it and resend." });
    }
    try {
      const fr = await fetch(TG_API(env.TELEGRAM_BOT_TOKEN, "getFile") + "?file_id=" + doc.file_id);
      const j = await fr.json();
      if (!j.ok) throw new Error(j.description || "getFile failed");
      const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${j.result.file_path}`;
      const r = await fetch(fileUrl);
      if (!r.ok) throw new Error("could not fetch file");
      specText = await r.text();
    } catch (err) {
      return tg(env, "sendMessage", { chat_id: chatId, text: "Could not download that file: " + (err.message || err) });
    }
  }

  if (specText) {
    return handleSpecSubmission(env, chatId, userId, specText, deps);
  }

  // Fallback message based on session step
  if (!sess || sess.step === "idle") {
    return tg(env, "sendMessage", { chat_id: chatId, text: "Send /new to start a new video." });
  }
  if (sess.step === "await_ratio")
    return tg(env, "sendMessage", { chat_id: chatId, text: "Pick a ratio:", reply_markup: kbRatio() });
  if (sess.step === "await_spec")
    return tg(env, "sendMessage", {
      chat_id: chatId,
      text: "Please send the completed spec as a `.json` file attachment — pasted JSON text is no longer accepted.",
      parse_mode: "Markdown",
    });
}

/* ---------- validate + queue a job ---------- */
async function handleSpecSubmission(env, chatId, userId, specText, deps) {
  let spec;
  try {
    spec = JSON.parse(specText);
  } catch (e) {
    return tg(env, "sendMessage", {
      chat_id: chatId,
      text: "❌ Not valid JSON: " + (e.message || e) + "\n\nFix and resend.",
    });
  }

  const v = validate(spec);
  if (v.errors.length) {
    const list = v.errors.slice(0, 12).map((m, i) => `${i + 1}. ${m}`).join("\n");
    const more = v.errors.length > 12 ? `\n… and ${v.errors.length - 12} more.` : "";
    return tg(env, "sendMessage", {
      chat_id: chatId,
      text: "❌ Spec has *validation errors*:\n\n" + list + more,
      parse_mode: "Markdown",
    });
  }

  const jobId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO jobs
     (id, telegram_user_id, telegram_chat_id, status, ratio, duration, style, spec_json, created_at, updated_at)
     VALUES (?, ?, ?, 'validating', ?, ?, ?, ?, ?, ?)`
  ).bind(
    jobId, String(userId || ""), String(chatId),
    spec.meta?.ratio || null,
    (typeof spec.meta?.duration === "number") ? spec.meta.duration : null,
    spec.meta?.style || null,
    specText, now, now,
  ).run();

  let queued = false, dispatchErr = null;
  try {
    await deps.dispatchRender(env, { jobId, specText, chatId });
    queued = true;
  } catch (e) {
    dispatchErr = e.message || String(e);
  }

  await env.DB.prepare(
    `UPDATE jobs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?`
  ).bind(queued ? "rendering" : "failed", dispatchErr, Math.floor(Date.now() / 1000), jobId).run();

  await clearSession(env, chatId);

  if (!queued) {
    return tg(env, "sendMessage", {
      chat_id: chatId,
      text: "❌ Spec validated but I could not queue the render:\n" + dispatchErr,
    });
  }

  const warnBlock = v.warnings.length
    ? `\n\n⚠️ *${v.warnings.length} warning${v.warnings.length === 1 ? "" : "s"}* (non-blocking):\n` +
      v.warnings.slice(0, 5).map(w => "• " + w).join("\n") +
      (v.warnings.length > 5 ? `\n… +${v.warnings.length - 5} more` : "")
    : "";

  return tg(env, "sendMessage", {
    chat_id: chatId,
    text:
      `✅ Spec validated. Queued for render.\n\n` +
      `Job: \`${jobId}\`\n` +
      `Scenes: ${v.stats.scenes}, elements: ${v.stats.elements}` +
      warnBlock +
      `\n\nThe MP4 will arrive here when the render finishes (usually 1–3 min for short clips).`,
    parse_mode: "Markdown",
  });
}

export { tg };
