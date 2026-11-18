// POST /api/pay — paying for a birthday surprise.
//   { id, action: "order" }   → starts a Razorpay payment (only when Razorpay is set up)
//   { id, action: "verify", razorpay_order_id, razorpay_payment_id, razorpay_signature }
//                             → checks the payment really happened, then unlocks the link
//   { id, action: "utr", utr } → manual UPI: saves the customer's UPI transaction ID for you to check
import crypto from "node:crypto";
import { readBody, sendJson } from "../lib/core.js";
import { storeReady, getJSON, setJSON } from "../lib/store.js";

const KEEP_SECONDS = 60 * 60 * 24 * 400;
export const BIRTHDAY_PRICE = () => Number(process.env.BIRTHDAY_PRICE) || 29;
export const RECHARGE_PRICE = () => Number(process.env.RECHARGE_PRICE) || 50;
const PRICE = (page) => (page && page.kind === "recharge" ? RECHARGE_PRICE() : BIRTHDAY_PRICE());
// Trim: pasted keys often carry a stray space or line break, which makes Razorpay say "Authentication failed".
const RZP_ID = () => (process.env.RAZORPAY_KEY_ID || "").trim();
const RZP_SECRET = () => (process.env.RAZORPAY_KEY_SECRET || "").trim();
// Test keys (rzp_test_) take fake cards, so on the live site they would hand out free links.
// They only count when RAZORPAY_ALLOW_TEST=1 (for trying things out locally).
export function razorpayReady() {
  const id = RZP_ID();
  return !!(id && RZP_SECRET() && (id.startsWith("rzp_live_") || process.env.RAZORPAY_ALLOW_TEST === "1"));
}

async function updateMeta(id, patch) {
  const meta = (await getJSON("wishmeta:" + id)) || {};
  await setJSON("wishmeta:" + id, { ...meta, ...patch }, KEEP_SECONDS);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST" });
  if (!storeReady()) return sendJson(res, 503, { error: "server_setup" });

  let b;
  try { b = await readBody(req, 10_000); } catch (e) { return sendJson(res, 400, { error: "bad_input" }); }
  const id = typeof b.id === "string" && /^[A-Za-z0-9]{6,20}$/.test(b.id) ? b.id : "";
  const page = id && (await getJSON("wish:" + id));
  if (!page) return sendJson(res, 404, { error: "not_found" });
  if (page.paid) return sendJson(res, 200, { ok: true, paid: true });

  try {
    if (b.action === "order") {
      if (!razorpayReady()) return sendJson(res, 400, { error: "no_razorpay" });
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(RZP_ID() + ":" + RZP_SECRET()).toString("base64") },
        body: JSON.stringify({ amount: PRICE(page) * 100, currency: "INR", receipt: page.code, notes: { surprise: id, for: page.to, kind: page.kind || "birthday" } })
      });
      const order = await r.json();
      if (!r.ok || !order.id) { console.error("razorpay order failed", r.status, order && order.error); return sendJson(res, 502, { error: "pay_busy" }); }
      page.orderId = order.id;
      await setJSON("wish:" + id, page, KEEP_SECONDS);
      return sendJson(res, 200, { keyId: RZP_ID(), orderId: order.id, amount: order.amount, code: page.code });
    }

    if (b.action === "verify") {
      if (!razorpayReady() || !page.orderId || b.razorpay_order_id !== page.orderId) return sendJson(res, 400, { error: "not_verified" });
      const expected = crypto.createHmac("sha256", RZP_SECRET()).update(page.orderId + "|" + b.razorpay_payment_id).digest("hex");
      if (!safeEqual(expected, b.razorpay_signature || "")) return sendJson(res, 400, { error: "not_verified" });
      page.paid = true; page.paidVia = "razorpay"; page.paymentId = String(b.razorpay_payment_id).slice(0, 40); page.paidAt = new Date().toISOString();
      await setJSON("wish:" + id, page, KEEP_SECONDS);
      await updateMeta(id, { paid: true, status: "paid", paidVia: "razorpay", paymentId: page.paymentId });
      return sendJson(res, 200, { ok: true, paid: true });
    }

    if (b.action === "claim") {
      // Manual UPI: the customer says they've paid. You match it in your UPI app by amount and the
      // order code, which is in the payment note ("Surprise PP-XXXXX").
      page.claimAt = new Date().toISOString();
      await setJSON("wish:" + id, page, KEEP_SECONDS);
      await updateMeta(id, { status: "checking", claimAt: page.claimAt });
      return sendJson(res, 200, { ok: true, paid: false, status: "checking" });
    }

    if (b.action === "utr") {
      const utr = String(b.utr || "").replace(/\s+/g, "");
      if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) return sendJson(res, 400, { error: "bad_utr" });
      page.utr = utr; page.utrAt = new Date().toISOString();
      await setJSON("wish:" + id, page, KEEP_SECONDS);
      await updateMeta(id, { status: "checking", utr });
      return sendJson(res, 200, { ok: true, paid: false, status: "checking" });
    }

    return sendJson(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error("pay failed", e.message);
    return sendJson(res, 500, { error: "busy" });
  }
}
