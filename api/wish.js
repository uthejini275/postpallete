// /api/wish
//   POST  → saves a new birthday surprise, returns its link and order code
//   GET ?id=…  → returns a saved surprise (watermarked on the page until it's paid)
import crypto from "node:crypto";
import { readBody, clientIp, sendJson } from "../lib/core.js";
import { storeReady, getJSON, setJSON, pushToList, countToday } from "../lib/store.js";

const KEEP_SECONDS = 60 * 60 * 24 * 400; // pages stay online for about 13 months
const THEMES = new Set(["lilac", "pink", "mint", "night"]);
const MAX_PHOTOS = 6;
const MAX_PHOTO_CHARS = 450_000;
const PER_PERSON_PER_DAY = Number(process.env.FREE_SURPRISES_PER_DAY) || 10;

const clip = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n) : "");

function randomId(len, alphabet) {
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}
const newId = () => randomId(10, "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789");
const newCode = () => "PP-" + randomId(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");

function clean(b) {
  const to = clip(b.to, 30);
  if (!to) throw new Error("need_name");
  const ageNum = parseInt(b.age, 10);
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, MAX_PHOTOS).map((p) => {
    const src = p && typeof p.src === "string" ? p.src : "";
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src) || src.length > MAX_PHOTO_CHARS) throw new Error("bad_photo");
    return { src, caption: clip(p.caption, 60) };
  });
  const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
  const dob = isDate(b.dob) && Date.parse(b.dob) < Date.now() && Number(b.dob.slice(0, 4)) > 1900 ? b.dob : null;
  const unlockDate = isDate(b.unlockDate) && Date.parse(b.unlockDate) < Date.now() + 400 * 864e5 ? b.unlockDate : null;
  const hasQuiz = typeof b.answerHash === "string" && /^[a-f0-9]{64}$/.test(b.answerHash) && clip(b.question, 80);
  return {
    to,
    from: clip(b.from, 30),
    age: Number.isFinite(ageNum) && ageNum > 0 && ageNum < 120 ? ageNum : null,
    dob,
    message: clip(b.message, 700),
    theme: THEMES.has(b.theme) ? b.theme : "lilac",
    music: b.music !== false,
    photos,
    scratchLast: b.scratchLast === true && photos.length > 0,
    unlockDate,
    // The answer itself is never sent: only a fingerprint (hash) to check against, and its first letter for a hint.
    question: hasQuiz ? clip(b.question, 80) : "",
    answerHash: hasQuiz ? b.answerHash : "",
    answerHint: hasQuiz ? clip(b.answerHint, 2) : ""
  };
}

// "Recharge Him" Men's Day pages: a name, up to 6 reasons and a short note. No photos.
function cleanRecharge(b) {
  const to = clip(b.to, 30);
  if (!to) throw new Error("need_name");
  const reasons = (Array.isArray(b.reasons) ? b.reasons : [])
    .filter((r) => Array.isArray(r) && clip(r[1], 120))
    .slice(0, 6)
    .map((r) => [clip(r[0], 8) || "💙", clip(r[1], 120)]);
  if (reasons.length < 3) throw new Error("need_reasons");
  const note = clip(b.note, 400);
  if (!note) throw new Error("need_note");
  return { kind: "recharge", to, from: clip(b.from, 40), reasons, note, photos: [] };
}

export default async function handler(req, res) {
  if (!storeReady()) return sendJson(res, 503, { error: "server_setup" });

  if (req.method === "GET") {
    const id = new URL(req.url, "http://x").searchParams.get("id") || "";
    if (!/^[A-Za-z0-9]{6,20}$/.test(id)) return sendJson(res, 404, { error: "not_found" });
    const page = await getJSON("wish:" + id);
    if (!page) return sendJson(res, 404, { error: "not_found" });
    // Nothing is shown until the surprise is paid for.
    if (!page.paid) return sendJson(res, 200, { pending: true, theme: page.theme });
    const { code, orderId, paymentId, utr, utrAt, paidVia, paidAt, ...pub } = page;
    return sendJson(res, 200, pub);
  }

  if (req.method !== "POST") return sendJson(res, 405, { error: "Use GET or POST" });

  let data;
  try {
    const body = await readBody(req, 4_000_000);
    data = body && body.kind === "recharge" ? cleanRecharge(body) : clean(body);
  } catch (e) {
    return sendJson(res, 400, { error: e.message === "too_big" ? "too_big" : e.message || "bad_input" });
  }

  try {
    const n = await countToday("pp:wishmade:" + clientIp(req));
    if (n > PER_PERSON_PER_DAY) return sendJson(res, 429, { error: "daily_limit" });

    const id = newId();
    const code = newCode();
    const createdAt = new Date().toISOString();
    await setJSON("wish:" + id, { id, code, createdAt, paid: false, ...data }, KEEP_SECONDS);
    await setJSON("wishcode:" + code, id, KEEP_SECONDS);
    const kind = data.kind === "recharge" ? "recharge" : "birthday";
    await setJSON("wishmeta:" + id, { id, code, kind, to: data.to, from: data.from, photos: data.photos.length, createdAt, paid: false, status: "awaiting_payment" }, KEEP_SECONDS);
    await pushToList("wishlist", id);
    return sendJson(res, 200, { id, code, path: (kind === "recharge" ? "/r/" : "/b/") + id });
  } catch (e) {
    console.error("save surprise failed", e.message);
    return sendJson(res, 500, { error: "busy" });
  }
}
