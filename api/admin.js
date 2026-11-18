// POST /api/admin — for the shop owner only (needs ADMIN_KEY).
// actions: "list" (recent orders), "paid" / "unpaid" (by order code or id), "delete".
import crypto from "node:crypto";
import { readBody, sendJson } from "../lib/core.js";
import { storeReady, getJSON, setJSON, del, readList, removeFromList } from "../lib/store.js";

const KEEP_SECONDS = 60 * 60 * 24 * 400;

function keyOk(given) {
  const real = (process.env.ADMIN_KEY || "").trim();
  if (real.length < 8 || typeof given !== "string") return false;
  given = given.trim(); // phone keyboards often add a space at the end
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

async function findId(ref) {
  const r = String(ref || "").trim();
  if (/^PP-[A-Z0-9]{5}$/i.test(r)) return await getJSON("wishcode:" + r.toUpperCase());
  const m = r.match(/([A-Za-z0-9]{10})\/?$/);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });
  if (!process.env.ADMIN_KEY) return sendJson(res, 503, { error: "no_admin_key" });
  if (!storeReady()) return sendJson(res, 503, { error: "server_setup" });

  let b;
  try { b = await readBody(req, 10_000); } catch (e) { return sendJson(res, 400, { error: "bad_input" }); }
  if (!keyOk(b.key)) { await new Promise((r) => setTimeout(r, 800)); return sendJson(res, 401, { error: "wrong_key" }); }

  try {
    if (b.action === "list") {
      const ids = await readList("wishlist", 100);
      const metas = [];
      for (const id of ids) { const m = await getJSON("wishmeta:" + id); if (m) metas.push(m); }
      return sendJson(res, 200, { orders: metas });
    }

    const id = await findId(b.ref);
    const page = id && (await getJSON("wish:" + id));
    if (!page) return sendJson(res, 404, { error: "not_found" });

    if (b.action === "paid" || b.action === "unpaid") {
      page.paid = b.action === "paid";
      await setJSON("wish:" + id, page, KEEP_SECONDS);
      const meta = (await getJSON("wishmeta:" + id)) || {};
      await setJSON("wishmeta:" + id, { ...meta, paid: page.paid, status: page.paid ? "paid" : (meta.utr ? "checking" : "awaiting_payment"), ...(page.paid && !meta.paidVia ? { paidVia: "manual" } : {}) }, KEEP_SECONDS);
      return sendJson(res, 200, { ok: true, id, code: page.code, paid: page.paid });
    }
    if (b.action === "delete") {
      await del("wish:" + id, "wishmeta:" + id, "wishcode:" + page.code);
      await removeFromList("wishlist", id);
      return sendJson(res, 200, { ok: true, deleted: id });
    }
    return sendJson(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error("admin failed", e.message);
    return sendJson(res, 500, { error: "busy" });
  }
}
