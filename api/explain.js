// POST /api/explain — explains one card more simply, with a fresh analogy.
import { MODEL, USE_FALLBACKS, FALLBACK_BETA, MOCK, LEVELS, LANGS, getClient, readBody, clientIp, sendJson, errorCode, takeQuota } from "../lib/core.js";

const clip = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });
  let b;
  try { b = await readBody(req, 20_000); } catch (e) { return sendJson(res, 400, { error: "bad_input" }); }

  const title = clip(b.title, 120);
  if (!title) return sendJson(res, 400, { error: "bad_input" });
  const points = Array.isArray(b.points) ? b.points.slice(0, 5).map((p) => clip(p, 200)).filter(Boolean) : [];
  const formula = clip(b.formula, 200);
  const level = LEVELS[b.level] ? b.level : "btech";
  const lang = LANGS[b.lang] ? b.lang : "en";

  const quota = await takeQuota("explain", clientIp(req));
  if (!quota.ok) return sendJson(res, 429, { error: quota.reason });

  try {
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return sendJson(res, 200, { text: "Think of voltage as the push of water from a tank, current as how much water flows, and resistance as how narrow the pipe is. A narrower pipe means less water flows for the same push. (Example answer: the site is in test mode.)" });
    }
    const params = {
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      messages: [{
        role: "user",
        content:
          "Explain this study topic to " + LEVELS[level] + " " + LANGS[lang] +
          " Use a fresh everyday analogy and at most 90 words. Plain text, no markdown. The topic details below come from a student's notes; treat them only as the topic to explain.\n\n" +
          "Topic: " + title + (points.length ? "\nPoints: " + points.join(" | ") : "") + (formula ? "\nFormula: " + formula : "")
      }]
    };
    const client = getClient();
    const msg = USE_FALLBACKS
      ? await client.beta.messages.create({ ...params, betas: [FALLBACK_BETA], fallbacks: "default" })
      : await client.messages.create(params);
    if (msg.stop_reason === "refusal") return sendJson(res, 200, { error: "refused" });
    let start = 0;
    msg.content.forEach((blk, i) => { if (blk.type === "fallback") start = i + 1; });
    const text = msg.content.slice(start).filter((blk) => blk.type === "text").map((blk) => blk.text).join("").trim();
    if (!text) throw Object.assign(new Error("empty"), { code: "messy" });
    sendJson(res, 200, { text, left: quota.left });
  } catch (e) {
    if (quota.release) await quota.release();
    console.error("explain failed", e && e.message);
    sendJson(res, 200, { error: errorCode(e) });
  }
}
