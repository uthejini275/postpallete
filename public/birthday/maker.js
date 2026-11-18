// Birthday surprise maker: form → live preview → save → pay to unlock.
(function () {
  const $ = (id) => document.getElementById(id);
  const MAX_PHOTOS = 6;
  const MINE_KEY = "pp-my-surprises-v1";
  const THEMES = [["lilac", "Lilac dream", "#e9defc"], ["pink", "Pink bloom", "#ffd6e7"], ["mint", "Mint fresh", "#d6f3e6"], ["night", "Night sky", "#3b2f6b"]];

  const state = { theme: "lilac", photos: [] };
  let config = { birthdayPrice: 29, upiId: "", upiName: "Post Pallete Studio", instagram: "postpallete_.stdio" };

  fetch("/api/config").then((r) => r.json()).then((c) => { config = { ...config, ...c }; }).catch(() => {});

  // ---------- themes ----------
  function renderThemes() {
    const box = $("themes"); box.innerHTML = "";
    THEMES.forEach(([k, label, col]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "theme"; b.textContent = label; b.style.background = col;
      if (k === "night") b.style.color = "#fff";
      b.setAttribute("aria-pressed", String(state.theme === k));
      b.addEventListener("click", () => { state.theme = k; renderThemes(); sendPreview(); });
      box.appendChild(b);
    });
  }

  // ---------- photos ----------
  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
      img.src = url;
    });
  }
  function shrink(img, maxSide, quality) {
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  }
  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    for (const f of list) {
      if (state.photos.length >= MAX_PHOTOS) { setStatus("You can add up to " + MAX_PHOTOS + " photos."); break; }
      try {
        const img = await loadImage(f);
        let src = shrink(img, 900, 0.78);
        if (src.length > 440000) src = shrink(img, 720, 0.65);
        state.photos.push({ src, caption: "" });
      } catch (e) { setStatus("One photo couldn't be opened. Try a JPG or PNG."); }
    }
    renderPhotos(); sendPreview();
  }
  function renderPhotos() {
    const box = $("photos"); box.innerHTML = "";
    state.photos.forEach((p, i) => {
      const card = document.createElement("div"); card.className = "ph";
      const img = document.createElement("img"); img.src = p.src; img.alt = "Photo " + (i + 1);
      const cap = document.createElement("input"); cap.type = "text"; cap.maxLength = 60; cap.placeholder = "Caption (optional)"; cap.value = p.caption;
      cap.id = "cap-" + i; cap.setAttribute("aria-label", "Caption for photo " + (i + 1));
      cap.addEventListener("input", () => { p.caption = cap.value; sendPreview(); });
      const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "Remove photo " + (i + 1));
      x.addEventListener("click", () => { state.photos.splice(i, 1); renderPhotos(); sendPreview(); });
      card.append(img, cap, x); box.appendChild(card);
    });
    if (state.photos.length < MAX_PHOTOS) {
      const add = document.createElement("button"); add.type = "button"; add.className = "add-ph";
      add.textContent = state.photos.length ? "+ Add more photos" : "+ Add photos";
      add.addEventListener("click", () => $("photo-input").click());
      box.appendChild(add);
    }
  }
  $("photo-input").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });

  // ---------- extra surprises ----------
  // Same answer rules as the surprise page: capitals, spaces and outer punctuation don't matter.
  const normalize = (s) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\s​]+/g, " ").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  state.answerHash = ""; state.answerHint = "";
  $("answer").addEventListener("input", async () => {
    const a = normalize($("answer").value);
    state.answerHint = a ? [...a][0].toUpperCase() : "";
    try { state.answerHash = a ? await sha256(a) : ""; } catch (e) { state.answerHash = ""; }
    sendPreview();
  });
  $("question").addEventListener("input", () => sendPreview());

  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function nextBirthday(dobStr) {
    const [, m, d] = dobStr.split("-").map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let nb = new Date(today.getFullYear(), m - 1, d);
    if (nb < today) nb = new Date(today.getFullYear() + 1, m - 1, d);
    return nb;
  }
  let ageAuto = true;
  $("age").addEventListener("input", () => { ageAuto = !$("age").value; });
  $("dob").addEventListener("change", () => {
    const v = $("dob").value;
    if (v && new Date(v) < new Date()) {
      const nb = nextBirthday(v);
      if (ageAuto) $("age").value = nb.getFullYear() - Number(v.slice(0, 4));
      if (!$("unlock").value) $("unlock").value = iso(nb);
    }
    sendPreview();
  });
  $("lock").addEventListener("change", () => {
    $("unlock-wrap").hidden = !$("lock").checked;
    if ($("lock").checked && !$("unlock").value && $("dob").value) $("unlock").value = iso(nextBirthday($("dob").value));
    sendPreview();
  });
  $("unlock").addEventListener("change", () => sendPreview());
  $("scratch").addEventListener("change", () => sendPreview());

  // ---------- live preview ----------
  function currentData() {
    const age = parseInt($("age").value, 10);
    const dob = $("dob").value;
    const hasQuiz = $("question").value.trim() && state.answerHash;
    return {
      to: $("to").value.trim(), from: $("from").value.trim(), age: age > 0 && age < 120 ? age : null,
      dob: dob && new Date(dob) < new Date() ? dob : null,
      message: $("message").value.trim(), theme: state.theme, music: $("music").checked,
      photos: state.photos.map((p) => ({ src: p.src, caption: p.caption.trim() })),
      scratchLast: $("scratch").checked,
      unlockDate: $("lock").checked && $("unlock").value ? $("unlock").value : null,
      question: hasQuiz ? $("question").value.trim() : "",
      answerHash: hasQuiz ? state.answerHash : "",
      answerHint: hasQuiz ? state.answerHint : ""
    };
  }
  let previewTimer = 0, previewReady = false;
  function sendPreview(gotoScene) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      if (!previewReady) return;
      const d = currentData();
      if (!d.to) d.to = "Ananya";
      $("preview").contentWindow.postMessage({ type: "pp-preview", data: d }, location.origin);
      if (gotoScene) $("preview").contentWindow.postMessage({ type: "pp-preview", goto: gotoScene }, location.origin);
    }, gotoScene ? 0 : 250);
  }
  addEventListener("message", (e) => {
    if (e.origin === location.origin && e.data && e.data.type === "pp-preview-ready") { previewReady = true; sendPreview(); }
  });
  ["to", "from", "age", "message"].forEach((id) => $(id).addEventListener("input", () => {
    if (id === "message") $("msg-count").textContent = $("message").value.length + " / 700";
    sendPreview();
  }));
  $("music").addEventListener("change", () => sendPreview());

  const SCENES = [["lock", "🔒 Lock"], ["quiz", "🤨 Question"], ["intro", "👀 Start"], ["title", "🎉 Wish"], ["numbers", "📊 Numbers"], ["photo", "📸 Photos"], ["scratch", "🤫 Scratch"], ["letter", "💌 Letter"], ["cake", "🎂 Cake"]];
  SCENES.forEach(([id, label]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = label;
    b.addEventListener("click", () => sendPreview(id));
    $("jump").appendChild(b);
  });

  // ---------- saving ----------
  function setStatus(t, err) { const s = $("status"); s.textContent = t; s.classList.toggle("err", !!err); }

  function errorText(code) {
    if (code === "need_name") return "Please add the birthday person's name.";
    if (code === "daily_limit") return "You've made a lot of surprises today. Please try again tomorrow.";
    if (code === "too_big") return "The photos are too big. Try removing one or two.";
    if (code === "bad_photo") return "One of the photos couldn't be used. Try removing it and adding it again.";
    if (code === "server_setup") return "The site isn't set up correctly yet. Please DM @" + config.instagram + ".";
    if (code === "offline") return "Couldn't reach the server. Check your internet and try again.";
    if (code === "pay_busy") return "Payments aren't working right now. Please try again in a minute.";
    if (code === "bad_utr") return "Please paste the transaction ID from your payment screen.";
    return "Something went wrong. Please try again.";
  }

  // ---------- pay, then create ----------
  // 1. save the surprise (it stays hidden), 2. take payment, 3. the link starts working.
  let draft = null; // { id, code, url, to, sig }

  function setButton() { $("create").textContent = "Pay ₹" + config.birthdayPrice + " & create my link"; }
  setButton();
  fetch("/api/config").then((r) => r.json()).then(() => setButton()).catch(() => {});
  setTimeout(setButton, 1500);

  async function post(url, body) {
    let r;
    try { r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
    catch (e) { throw { code: "offline" }; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw { code: j.error || (r.status === 413 ? "too_big" : "busy") };
    return j;
  }

  $("create").addEventListener("click", async () => {
    const d = currentData();
    if (!d.to) { setStatus("Please add the birthday person's name.", true); $("to").focus(); return; }
    if (!d.message && !d.photos.length) { setStatus("Add a letter or at least one photo to make it special.", true); return; }
    if ($("lock").checked && !d.unlockDate) { setStatus("Pick their birthday date for the midnight lock.", true); $("unlock").focus(); return; }
    if (!!$("question").value.trim() !== !!$("answer").value.trim()) { setStatus("Add both the secret question and its answer, or leave both empty.", true); return; }
    $("create").disabled = true;
    try {
      const sig = JSON.stringify(d);
      if (!draft || draft.sig !== sig) {
        setStatus("Saving your surprise…");
        const j = await post("/api/wish", d);
        draft = { id: j.id, code: j.code, url: location.origin + j.path, to: d.to, sig };
        saveMine({ id: draft.id, code: draft.code, to: d.to, url: draft.url, at: Date.now(), status: "unpaid" });
      }
      setStatus("");
      if (config.razorpay) {
        try { await payOnline(); }
        catch (e) {
          // Razorpay not working (e.g. keys not accepted yet)? Don't leave the customer stuck: fall back to the UPI QR.
          if (e && (e.code === "pay_busy" || e.code === "no_razorpay") && config.upiId) { setStatus(""); showManualPay(); }
          else throw e;
        }
      } else showManualPay();
    } catch (e) {
      setStatus(errorText(e && e.code), true);
    } finally { $("create").disabled = false; }
  });

  // Automatic payment with Razorpay (UPI, cards, wallets). The link unlocks right after paying.
  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = res; s.onerror = () => rej({ code: "offline" }); document.head.appendChild(s);
    });
  }
  async function payOnline() {
    setStatus("Opening payment…");
    await loadRazorpay();
    const o = await post("/api/pay", { id: draft.id, action: "order" });
    setStatus("");
    const rzp = new window.Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: "INR",
      name: "Post Pallete Studio", description: "Birthday surprise for " + draft.to,
      theme: { color: "#8b5cf6" },
      handler: async (resp) => {
        setStatus("Confirming your payment…");
        try {
          await post("/api/pay", { id: draft.id, action: "verify", ...resp });
          markMine(draft.id, "paid"); showReady(draft); setStatus("");
        } catch (e) {
          setStatus("We couldn't confirm the payment yet. If money was taken, DM @" + config.instagram + " your order code " + draft.code + " and we'll sort it out.", true);
        }
      },
      modal: { ondismiss: () => setStatus("Payment wasn't finished. Tap the button again whenever you're ready.") }
    });
    rzp.on("payment.failed", () => setStatus("The payment didn't go through. Please try again.", true));
    rzp.open();
  }

  // Manual UPI: they pay by QR, tap "I've paid", and you approve it on your owner page.
  function upiLink(code) {
    return "upi://pay?pa=" + encodeURIComponent(config.upiId) + "&pn=" + encodeURIComponent(config.upiName) +
      "&am=" + encodeURIComponent(config.birthdayPrice) + "&cu=INR&tn=" + encodeURIComponent("Surprise " + code);
  }

  function copyBtn(text, label) {
    const b = document.createElement("button"); b.type = "button"; b.className = "btn small"; b.textContent = label || "Copy";
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(text); b.textContent = "Copied!"; }
      catch (e) { b.textContent = "Select and copy"; }
      setTimeout(() => (b.textContent = label || "Copy"), 1800);
    });
    return b;
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function showManualPay() {
    const box = $("done"); box.innerHTML = ""; box.hidden = false;
    box.appendChild(el("h2", null, "Almost there! Pay ₹" + config.birthdayPrice + " to create your link 💜"));
    const pay = el("div", "pay");
    if (config.upiId && window.qrcode) {
      try {
        const qr = qrcode(0, "M"); qr.addData(upiLink(draft.code)); qr.make();
        const q = el("div", "qr"); const img = document.createElement("img"); img.alt = "UPI QR code to pay"; img.src = qr.createDataURL(6, 2); q.appendChild(img);
        pay.appendChild(q);
      } catch (e) { /* no QR */ }
    }
    const info = el("div", "stack-v");
    info.appendChild(el("div", "price", "₹" + config.birthdayPrice));
    const ol = el("ol", "steps");
    if (config.upiId) {
      ol.appendChild(el("li", null, /Android|iPhone|iPad/i.test(navigator.userAgent)
        ? "Tap the button below to pay with your UPI app, or scan the QR from another phone."
        : "Scan the QR with any UPI app (GPay, PhonePe, Paytm). ₹" + config.birthdayPrice + " is filled in for you."));
    } else {
      const li1 = el("li"); li1.append("DM ");
      const ig = el("a", null, "@" + config.instagram); ig.href = "https://www.instagram.com/" + config.instagram + "/"; ig.target = "_blank"; ig.rel = "noopener";
      li1.append(ig, " for the payment details, with your order code ", el("span", "code", draft.code));
      ol.appendChild(li1);
    }
    ol.appendChild(el("li", null, "After paying, come back here and tap \"I've paid\"."));
    info.appendChild(ol);
    if (config.upiId && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      const a = el("a", "btn primary", "Pay ₹" + config.birthdayPrice + " with a UPI app"); a.href = upiLink(draft.code); a.style.textDecoration = "none"; a.style.alignSelf = "flex-start";
      info.appendChild(a);
    }
    const send = el("button", "btn primary", "I've paid, create my link"); send.type = "button";
    const msg = el("p", "status"); msg.setAttribute("role", "status");
    send.addEventListener("click", async () => {
      send.disabled = true; msg.textContent = "Sending…"; msg.classList.remove("err");
      try { await post("/api/pay", { id: draft.id, action: "claim" }); markMine(draft.id, "checking"); showWaiting(draft); }
      catch (e) { msg.textContent = errorText(e && e.code); msg.classList.add("err"); }
      finally { send.disabled = false; }
    });
    info.append(send, msg);
    pay.appendChild(info);
    box.appendChild(pay);
    box.appendChild(el("p", "note", "Your order code is " + draft.code + ". Keep it in case you need help."));
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function linkRow(url) {
    const lb = el("div", "linkbox");
    const open = el("a", "btn small", "Open"); open.href = url; open.target = "_blank"; open.rel = "noopener"; open.style.textDecoration = "none";
    lb.append(el("code", null, url), copyBtn(url, "Copy link"), open);
    return lb;
  }

  function showWaiting(dr) {
    const box = $("done"); box.innerHTML = ""; box.hidden = false;
    box.appendChild(el("h2", null, "Thank you! We're checking your payment ✅"));
    box.appendChild(el("p", null, "Here's your link. It will start working as soon as we confirm the payment, usually within a few hours. Until then it shows \"still being wrapped\"."));
    box.appendChild(linkRow(dr.url));
    box.appendChild(el("p", "note", "Order code: " + dr.code + ". The link is also saved on this phone below, under \"Surprises you made\"."));
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showReady(dr) {
    const box = $("done"); box.innerHTML = ""; box.hidden = false;
    box.appendChild(el("h2", null, "Paid! Your surprise for " + dr.to + " is ready 🎉"));
    box.appendChild(el("p", null, "Send this link to " + dr.to + ". Tip: send it at midnight! 🌙"));
    box.appendChild(linkRow(dr.url));
    const wa = el("a", "btn primary", "Send on WhatsApp"); wa.style.textDecoration = "none"; wa.style.alignSelf = "flex-start";
    wa.href = "https://wa.me/?text=" + encodeURIComponent("🎁 I made something special for you! Open it: " + dr.url); wa.target = "_blank"; wa.rel = "noopener";
    box.appendChild(wa);
    box.appendChild(el("p", "note", "Order code: " + dr.code));
    confettiBurst();
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function confettiBurst() { try { $("preview").contentWindow.postMessage({ type: "pp-preview", goto: "cake" }, location.origin); } catch (e) {} }
  function markMine(id, status) { const l = loadMine().map((x) => (x.id === id ? { ...x, status } : x)); try { localStorage.setItem(MINE_KEY, JSON.stringify(l)); } catch (e) {} renderMine(); }

  // ---------- "surprises you made" on this phone ----------
  function loadMine() { try { const v = JSON.parse(localStorage.getItem(MINE_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveMine(item) { const l = [item, ...loadMine().filter((x) => x.id !== item.id)].slice(0, 20); try { localStorage.setItem(MINE_KEY, JSON.stringify(l)); } catch (e) {} renderMine(); }
  function renderMine() {
    const l = loadMine(); $("mine").hidden = !l.length;
    const box = $("mine-list"); box.innerHTML = "";
    l.forEach((m) => {
      const row = el("div", "linkbox");
      const a = el("a", null, "For " + m.to); a.href = m.url; a.target = "_blank"; a.rel = "noopener";
      const st = m.status === "paid" ? "✅ Ready" : m.status === "checking" ? "⏳ Checking payment" : "Not paid";
      row.append(a, el("span", "code", m.code), el("span", "note", st), copyBtn(m.url, "Copy link"));
      box.appendChild(row);
    });
  }

  renderThemes(); renderPhotos(); renderMine();
})();
