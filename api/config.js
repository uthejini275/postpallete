// GET /api/config — public shop settings the pages need (price and how to pay).
import { sendJson } from "../lib/core.js";
import { razorpayReady, BIRTHDAY_PRICE, RECHARGE_PRICE } from "./pay.js";

export default function handler(req, res) {
  sendJson(res, 200, {
    birthdayPrice: BIRTHDAY_PRICE(),
    rechargePrice: RECHARGE_PRICE(),
    upiId: process.env.UPI_ID || "",
    upiName: process.env.UPI_NAME || "Post Pallete Studio",
    instagram: process.env.INSTAGRAM_HANDLE || "postpallete_.stdio",
    razorpay: razorpayReady()
  });
}
