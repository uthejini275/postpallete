// POST /api/cards — turns PDF text (or scanned page images) into a study deck.
// Streams newline-delimited JSON events back: start → progress… → done | error.
import {
  MODEL, EFFORT, USE_FALLBACKS, FALLBACK_BETA, MOCK, LEVELS, LANGS,
  CARD_SYSTEM, DECK_SCHEMA, cardUserText, getClient, readBody, clientIp, sendJson, errorCode, takeQuota
} from "../lib/core.js";
import { MOCK_DECK } from "../lib/mock.js";

const MAX_TEXT = 90_000;
const MAX_IMAGES = 8;
const MAX_IMAGE_B64 = 1_500_000;

function fail(code) { const e = new Error(code); e.code = code; return e; }

function validate(body) {
  const level = LEVELS[body.level] ? body.level : "btech";
  const lang = LANGS[body.lang] ? body.lang : "en";
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 60) : "";
  const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_IMAGES) : [];
  for (const img of images) {
    if (typeof img !== "string" || img.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(img)) throw fail("bad_input");
  }
  if (!images.length && text.replace(/\s+/g, "").length < 200) throw fail("too_little_text");
  return { level, lang, subject, text, images };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });

  let input;
  try {
    input = validate(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { error: e.message === "too_big" ? "too_big" : e.code || "bad_input" });
  }

  const quota = await takeQuota("deck", clientIp(req));
  if (!quota.ok) return sendJson(res, 429, { error: quota.reason });

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no"
  });
  const send = (obj) => { if (!res.writableEnded) res.write(JSON.stringify(obj) + "\n"); };
  send({ t: "start", left: quota.left });

  let stream = null;
  let finished = false;
  res.on("close", () => { if (!finished && stream) stream.abort(); }); // visitor left: stop paying for it

  try {
    let deck;
    if (MOCK) {
      for (let i = 1; i <= 6; i++) { await new Promise((r) => setTimeout(r, 400)); send({ t: "progress", chars: i * 900 }); }
      deck = MOCK_DECK;
    } else {
      const content = [];
      for (const data of input.images) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
      content.push({ type: "text", text: cardUserText({ ...input, scanned: input.images.length > 0 }) });

      const params = {
        model: MODEL,
        max_tokens: 32000,
        system: [{ type: "text", text: CARD_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content }],
        output_config: { effort: EFFORT, format: { type: "json_schema", schema: DECK_SCHEMA } }
      };
      const client = getClient();
      stream = USE_FALLBACKS
        ? client.beta.messages.stream({ ...params, betas: [FALLBACK_BETA], fallbacks: "default" })
        : client.messages.stream(params);

      let chars = 0, lastSent = 0;
      stream.on("text", (delta) => {
        chars += delta.length;
        if (chars - lastSent >= 500) { lastSent = chars; send({ t: "progress", chars }); }
      });
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") throw fail("refused");
      if (msg.stop_reason === "max_tokens") throw fail("too_long");

      // If a fallback model took over, only the text after the last switch point is the answer.
      let start = 0;
      msg.content.forEach((b, i) => { if (b.type === "fallback") start = i + 1; });
      const text = msg.content.slice(start).filter((b) => b.type === "text").map((b) => b.text).join("");
      deck = JSON.parse(text);
      console.log("deck ok", { model: msg.model, in: msg.usage.input_tokens, out: msg.usage.output_tokens, cached: msg.usage.cache_read_input_tokens });
    }
    send({ t: "done", deck, left: quota.left });
  } catch (e) {
    if (quota.release) await quota.release(); // failed decks don't count against the free limit
    const code = errorCode(e);
    console.error("deck failed", code, e && e.message);
    send({ t: "error", code });
  } finally {
    finished = true;
    res.end();
  }
}
