/* Gift data lives in the link itself (after the #), so no database is needed
   and the message never reaches the server: browsers don't send the # part. */
window.GiftData = (function () {
  const LIMITS = { to: 30, from: 40, reason: 120, note: 400, reasons: 6 };

  function clean(s, max) { return String(s == null ? "" : s).replace(/[\u0000-\u0009\u000B-\u001F]/g, "").slice(0, max); }

  function normalise(g) {
    if (!g || typeof g !== "object") return null;
    const reasons = (Array.isArray(g.reasons) ? g.reasons : [])
      .filter(r => Array.isArray(r) && String(r[1] || "").trim())
      .slice(0, LIMITS.reasons)
      .map(r => [clean(r[0], 8) || "💙", clean(r[1], LIMITS.reason)]);
    const to = clean(g.to, LIMITS.to).trim();
    if (!to || reasons.length < 1) return null;
    return { to, from: clean(g.from, LIMITS.from).trim() || "Someone who loves you", reasons, note: clean(g.note, LIMITS.note) };
  }

  function encode(g) {
    const bytes = new TextEncoder().encode(JSON.stringify(normalise(g)));
    let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decode(str) {
    try {
      if (!str) return null;
      const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return normalise(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) { return null; }
  }

  return { encode, decode, normalise, LIMITS };
})();
