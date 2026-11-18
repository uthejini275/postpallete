// Birthday surprise player, told like an Instagram story.
//   /b/<id>     → a saved surprise (small "Preview" tag at the top until it's paid)
//   ?preview=1  → live preview inside the maker page
//   otherwise   → a sample surprise
(function () {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const isPreview = params.get("preview") === "1";
  const pathId = (location.pathname.match(/^\/b\/([A-Za-z0-9]{6,20})\/?$/) || [])[1];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  let data = null;
  let slides = [];
  let at = 0;
  let started = false;

  // ---------- answer check (same rules as the maker) ----------
  const normalize = (s) => String(s || "").normalize("NFKC").toLowerCase().replace(/[\s​]+/g, " ").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  async function sha256(s) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---------- sample ----------
  function samplePhoto(c1, c2, emoji) {
    const c = document.createElement("canvas"); c.width = 720; c.height = 960;
    const g = c.getContext("2d"); const gr = g.createLinearGradient(0, 0, 720, 960);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 720, 960);
    g.font = "260px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 360, 480);
    return c.toDataURL("image/jpeg", 0.8);
  }
  function sampleData() {
    return {
      sample: true, paid: false, to: "Ananya", from: "Priya", age: 20, dob: "2006-11-20", theme: "lilac", music: true,
      message: "Happy birthday to my favourite person! 💜\nThank you for every late-night study call, every silly reel and every time you made me laugh when exams were scary.\nStay this cute forever!",
      photos: [
        { src: samplePhoto("#e3d4fb", "#ffd0e3", "📸"), caption: "Our first trip together!" },
        { src: samplePhoto("#c9efdc", "#cfe6ff", "🍦"), caption: "Ice cream after exams" },
        { src: samplePhoto("#ffe0c7", "#fff1a6", "🤫"), caption: "You thought I deleted this 😂" }
      ],
      scratchLast: true, question: "", unlockDate: null
    };
  }

  // ---------- music: a soft music-box "Happy Birthday" ----------
  let audio = null, musicOn = true, loopTimer = 0;
  const TUNE = [["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2], ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2], ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3]];
  const FREQ = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  function playTune() {
    if (!audio || !musicOn) return;
    const beat = 0.42; let t = audio.currentTime + 0.1;
    const master = audio.createGain(); master.gain.value = 0.16; master.connect(audio.destination);
    for (const [n, d] of TUNE) {
      [1, 2].forEach((mult, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = i ? "sine" : "triangle"; o.frequency.value = FREQ[n] * mult;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(i ? 0.25 : 1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + d * beat + 0.6);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + d * beat + 0.7);
      });
      t += d * beat;
    }
    clearTimeout(loopTimer); loopTimer = setTimeout(playTune, (t - audio.currentTime + 2.5) * 1000);
  }
  function startMusic() {
    if (started || !data || !data.music || isPreview) return;
    started = true;
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      $("music").hidden = false; playTune();
    } catch (e) { /* no audio */ }
  }
  $("music").addEventListener("click", (e) => {
    e.stopPropagation();
    musicOn = !musicOn; $("music").classList.toggle("off", !musicOn);
    $("music").setAttribute("aria-label", musicOn ? "Turn music off" : "Turn music on");
    if (audio) { if (musicOn) { audio.resume(); playTune(); } else { clearTimeout(loopTimer); audio.suspend(); } }
  });

  // ---------- effects: confetti + fireworks on one canvas ----------
  const cv = $("fx"), cx = cv.getContext("2d");
  let parts = [], raf = 0, fireworksUntil = 0;
  const dpr = () => Math.min(2, devicePixelRatio || 1);
  function sizeFx() { cv.width = innerWidth * dpr(); cv.height = innerHeight * dpr(); }
  sizeFx(); addEventListener("resize", sizeFx);
  function palette() {
    const cs = getComputedStyle(document.body);
    return ["--accent", "--accent2", "--gold", "--blob1", "--blob2"].map((v) => cs.getPropertyValue(v).trim()).concat(["#ffffff"]);
  }
  function confetti(n, x, y) {
    if (reduced) return;
    const cols = palette();
    for (let i = 0; i < n; i++) parts.push({ k: "c", x: x ?? innerWidth / 2, y: y ?? innerHeight * .4, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 3,
      r: Math.random() * 6 + 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length], life: 0 });
    loop();
  }
  function rocket() {
    const cols = palette();
    parts.push({ k: "r", x: innerWidth * (.15 + Math.random() * .7), y: innerHeight + 10, vx: (Math.random() - .5) * 2, vy: -(innerHeight / 55) - Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)], life: 0 });
  }
  function explode(p) {
    for (let i = 0; i < 70; i++) {
      const a = (Math.PI * 2 * i) / 70, s = 2 + Math.random() * 4.5;
      parts.push({ k: "s", x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: p.c, life: 0, max: 50 + Math.random() * 30 });
    }
  }
  function fireworks(ms) { if (reduced) { confetti(0); return; } fireworksUntil = performance.now() + ms; loop(); }
  function loop() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    const d = dpr();
    cx.clearRect(0, 0, cv.width, cv.height);
    if (now < fireworksUntil && Math.random() < .07) rocket();
    const next = [];
    for (const p of parts) {
      p.life++;
      if (p.k === "c") {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        cx.save(); cx.translate(p.x * d, p.y * d); cx.rotate(p.rot); cx.fillStyle = p.c; cx.fillRect(-p.r * d / 2, -p.r * d / 4, p.r * d, p.r * d / 2); cx.restore();
        if (p.life < 260 && p.y < innerHeight + 40) next.push(p);
      } else if (p.k === "r") {
        p.vy += .18; p.x += p.vx; p.y += p.vy;
        cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x * d, p.y * d, 2.5 * d, 0, 7); cx.fill();
        if (p.vy >= -1) explode(p); else next.push(p);
      } else {
        p.vy += .06; p.vx *= .98; p.vy *= .98; p.x += p.vx; p.y += p.vy;
        cx.globalAlpha = Math.max(0, 1 - p.life / p.max); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x * d, p.y * d, 2.2 * d, 0, 7); cx.fill(); cx.globalAlpha = 1;
        if (p.life < p.max) next.push(p);
      }
    }
    parts = next;
    raf = parts.length || now < fireworksUntil ? requestAnimationFrame(tick) : 0;
  }

  // ---------- gates ----------
  let lockTimer = 0;
  function unlockTarget() {
    if (!data.unlockDate) return null;
    const [y, m, dd] = data.unlockDate.split("-").map(Number);
    return new Date(y, m - 1, dd, 0, 0, 0);
  }
  function showLock(forPreview) {
    const target = unlockTarget() || new Date(Date.now() + 3 * 3600e3);
    hideAll(); $("lock").hidden = false;
    $("lock-h").textContent = "This opens at midnight, " + (data.to || "you") + " 🌙";
    $("lock-sub").textContent = "Come back at 12:00 AM on " + target.toLocaleDateString("en-IN", { day: "numeric", month: "long" }) + ".";
    $("lock-open").hidden = true;
    clearInterval(lockTimer);
    const draw = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (s === 0 && !forPreview) {
        clearInterval(lockTimer);
        $("clock").textContent = "00:00:00"; $("lock-h").textContent = "It's your birthday! 🎉";
        $("lock-sub").textContent = "The wait is over."; $("lock-open").hidden = false; confetti(160);
        return;
      }
      const days = Math.floor(s / 86400); s %= 86400;
      const pad = (n) => String(n).padStart(2, "0");
      $("clock").textContent = (days ? days + "d " : "") + pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    };
    draw(); lockTimer = setInterval(draw, 1000);
  }
  $("lock-open").addEventListener("click", () => { startMusic(); afterLock(); });

  let wrong = 0;
  function showQuiz() {
    hideAll(); $("quiz").hidden = false; wrong = 0;
    $("quiz-h").textContent = "Prove you're really " + (data.to || "them") + " 😏";
    $("quiz-q").textContent = data.question || "";
    $("quiz-msg").textContent = ""; $("quiz-emoji").textContent = "🤨"; $("quiz-in").value = "";
  }
  $("quiz-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const guess = normalize($("quiz-in").value);
    if (!guess) return;
    let ok = true;
    try { ok = (await sha256(guess)) === data.answerHash; } catch (err) { ok = true; /* can't check on this browser: let them in */ }
    if (ok) {
      $("quiz-emoji").textContent = "🥳"; $("quiz-msg").textContent = "Yes! It's really you 💜"; confetti(120);
      startMusic(); setTimeout(startStory, 900);
      return;
    }
    wrong++;
    const form = $("quiz-form"); form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
    const name = data.to || "you";
    const lines = [["🙈", "Nope! Try again 🙈"], ["😤", "Hmm… are you really " + name + "? 🤨"], ["🤭", data.answerHint ? "Hint: it starts with “" + data.answerHint + "”" : "One more try! 🤞"]];
    const [emo, msg] = lines[Math.min(wrong - 1, 2)];
    $("quiz-emoji").textContent = emo; $("quiz-msg").textContent = msg;
  });

  function hideAll() { $("lock").hidden = true; $("quiz").hidden = true; $("story").hidden = true; clearInterval(lockTimer); }
  function afterLock() { if (data.answerHash && !isPreview) showQuiz(); else startStory(); }

  // ---------- story ----------
  function buildSlides() {
    document.querySelectorAll(".s-photo").forEach((n) => n.remove());
    const all = [...document.querySelectorAll("#slides > .slide")];
    const byKey = (k) => all.find((s) => s.dataset.key === k);
    const photos = data.photos || [];
    const scratch = data.scratchLast && photos.length ? photos[photos.length - 1] : null;
    const normal = scratch ? photos.slice(0, -1) : photos;

    const list = [byKey("intro"), byKey("title")];
    if (data.dob) list.push(byKey("numbers"));
    const letter = byKey("letter");
    normal.forEach((p, i) => {
      const s = el("section", "slide s-photo"); s.dataset.key = "photo";
      const bg = el("div", "blurbg"); bg.style.backgroundImage = 'url("' + p.src + '")';
      const img = el("img", "ph"); img.src = p.src; img.alt = p.caption || "Memory " + (i + 1);
      s.append(bg, img, el("span", "count", "Memory " + (i + 1) + " of " + normal.length));
      if (p.caption) s.appendChild(el("p", "tag", p.caption));
      letter.parentNode.insertBefore(s, byKey("scratch"));
      list.push(s);
    });
    if (scratch) list.push(byKey("scratch"));
    if (data.message) list.push(letter);
    list.push(byKey("cake"));
    slides = list;

    const bars = $("bars"); bars.innerHTML = "";
    slides.forEach(() => { const b = el("span"); b.appendChild(el("i")); bars.appendChild(b); });
  }

  function show(i) {
    const prev = at;
    at = Math.max(0, Math.min(i, slides.length - 1));
    document.querySelectorAll("#slides > .slide").forEach((s) => { s.classList.remove("on", "left"); });
    slides.forEach((s, k) => { if (k < at) s.classList.add("left"); });
    const cur = slides[at];
    cur.classList.add("on");
    [...$("bars").children].forEach((b, k) => { b.className = k < at ? "done" : k === at ? "now" : ""; });
    const key = cur.dataset.key;
    $("story").classList.toggle("hold", cur.dataset.hold === "1" && !(key === "scratch" && scratchDone));
    if (key === "title") { setTimeout(() => confetti(150), 900); }
    if (key === "numbers") countUp();
    if (key === "scratch") setupScratch();
    if (key === "letter") typeLetter();
    if (key === "cake" && prev !== at) resetCake();
  }
  function next() { if (!$("story").classList.contains("hold")) show(at + 1); }
  function prev() { show(at - 1); }

  $("slides").addEventListener("click", (e) => {
    if (e.target.closest("button, a, input, canvas, .paper, .cake, .scratch-card")) return;
    startMusic();
    const x = e.clientX / innerWidth;
    if (x < 0.28) prev(); else next();
  });
  $("prev").hidden = true; $("next").hidden = true;
  addEventListener("keydown", (e) => {
    if ($("story").hidden || (e.target.closest && e.target.closest("input"))) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") prev();
  });

  function startStory() {
    hideAll(); $("story").hidden = false;
    scratchDone = false;
    show(0);
  }

  // numbers
  function countUp() {
    if (!data.dob) return;
    const born = new Date(data.dob + "T00:00:00");
    const days = Math.max(0, Math.floor((Date.now() - born) / 864e5));
    const vals = { days, hours: days * 24 + new Date().getHours(), beats: days * 24 * 60 * 80, moons: Math.floor(days / 29.53) };
    document.querySelectorAll("[data-count]").forEach((b) => {
      const target = vals[b.dataset.count]; const t0 = performance.now(); const dur = reduced ? 1 : 1600;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur); const v = Math.round(target * (1 - Math.pow(1 - k, 3)));
        b.textContent = v.toLocaleString("en-IN");
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    $("born").textContent = "You were born on a " + born.toLocaleDateString("en-IN", { weekday: "long" }) + " ✨";
  }

  // scratch card
  let scratchDone = false, scratchReady = false;
  function setupScratch() {
    const photos = data.photos || [];
    const p = photos[photos.length - 1];
    $("scratch-img").src = p.src;
    $("scratch-cap").textContent = scratchDone ? p.caption || "" : "";
    $("scratch-card").classList.toggle("done", scratchDone);
    if (scratchDone) return;
    const c = $("scratch-cv"); const r = c.getBoundingClientRect(); const d = dpr();
    c.width = Math.max(10, r.width * d); c.height = Math.max(10, r.height * d);
    const g = c.getContext("2d");
    g.globalCompositeOperation = "source-over";
    const gr = g.createLinearGradient(0, 0, c.width, c.height);
    gr.addColorStop(0, "#d9d3e8"); gr.addColorStop(.5, "#f7f3ff"); gr.addColorStop(1, "#c3b8dc");
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(255,255,255," + (Math.random() * .8) + ")"; g.fillRect(Math.random() * c.width, Math.random() * c.height, 3 * d, 3 * d); }
    g.fillStyle = "#6b5b8c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "800 " + 26 * d + "px Nunito, sans-serif"; g.fillText("Scratch me ✨", c.width / 2, c.height / 2);
    g.font = "700 " + 14 * d + "px Nunito, sans-serif"; g.fillText("use your finger", c.width / 2, c.height / 2 + 30 * d);
    scratchReady = true;
  }
  (function scratchInput() {
    const c = $("scratch-cv"); let down = false, last = null, moves = 0;
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
    const scratch = (p) => {
      const g = c.getContext("2d"); g.globalCompositeOperation = "destination-out"; g.lineCap = "round"; g.lineWidth = 46 * dpr();
      g.beginPath(); g.moveTo((last || p).x, (last || p).y); g.lineTo(p.x, p.y); g.stroke(); last = p;
      if (++moves % 12 === 0) checkCleared();
    };
    c.addEventListener("pointerdown", (e) => { if (!scratchReady || scratchDone) return; down = true; last = null; c.setPointerCapture(e.pointerId); scratch(pos(e)); });
    c.addEventListener("pointermove", (e) => { if (down) scratch(pos(e)); });
    const up = () => { down = false; last = null; checkCleared(); };
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    function checkCleared() {
      if (scratchDone) return;
      const g = c.getContext("2d"); const img = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < img.length; i += 4 * 40) { total++; if (img[i] < 40) clear++; }
      if (total && clear / total > 0.45) {
        scratchDone = true; $("scratch-card").classList.add("done");
        const photos = data.photos || []; $("scratch-cap").textContent = (photos[photos.length - 1] || {}).caption || "";
        const r = c.getBoundingClientRect(); confetti(120, r.left + r.width / 2, r.top + r.height / 2);
        $("story").classList.remove("hold");
      }
    }
  })();

  // letter
  let typing = 0;
  function typeLetter() {
    clearInterval(typing);
    const full = data.message || ""; const t = $("l-msg");
    if (reduced || isPreview) { t.textContent = full; return; }
    let i = 0; t.textContent = "";
    typing = setInterval(() => { i += 2; t.textContent = full.slice(0, i); if (i >= full.length) clearInterval(typing); }, 26);
  }

  // cake
  let mic = null, micLoop = 0;
  function candles() { return [...$("candles").children]; }
  function resetCake() {
    stopMic();
    candles().forEach((c) => c.classList.remove("out"));
    $("cake").classList.remove("blowing");
    $("finale").hidden = true; $("cake-actions").hidden = false;
    $("c-top").textContent = "Close your eyes. Make a wish…";
    $("mic-msg").textContent = "or tap the candles";
    $("mic-btn").hidden = isPreview || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
  function blowOne() {
    const lit = candles().filter((c) => !c.classList.contains("out"));
    if (!lit.length) return true;
    lit[Math.floor(Math.random() * lit.length)].classList.add("out");
    return lit.length === 1;
  }
  function allOut() {
    stopMic(); $("cake").classList.remove("blowing");
    $("cake-actions").hidden = true; $("c-top").textContent = "Yaaay! 🎉";
    $("finale-h").textContent = "Happy Birthday, " + (data.to || "you") + "! 🎂";
    const msg = (data.from ? "Hey " + data.from + "! " : "") + "Thank you so much for my birthday surprise 😭💜 I loved it!";
    $("reply").href = "https://wa.me/?text=" + encodeURIComponent(msg);
    $("finale").hidden = false;
    confetti(200); fireworks(6000);
  }
  function tapBlow() {
    if ($("finale").hidden === false) return;
    let n = 0;
    const iv = setInterval(() => { const last = blowOne(); if (last || ++n > 12) { clearInterval(iv); if (candles().every((c) => c.classList.contains("out"))) allOut(); } }, 110);
  }
  $("cake").addEventListener("click", tapBlow);
  $("cake").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapBlow(); } });

  $("mic-btn").addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser(); an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      mic = { stream, ac };
      $("mic-btn").hidden = true; $("mic-msg").textContent = "Now blow on your phone! 🌬️";
      const buf = new Uint8Array(an.fftSize);
      let blowMs = 0, lastT = performance.now(), quietSince = performance.now();
      const check = (t) => {
        const dt = t - lastT; lastT = t;
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.09) {
          $("cake").classList.add("blowing"); blowMs += dt; quietSince = t;
          if (blowMs > 140) { blowMs = 0; if (blowOne()) { allOut(); return; } }
        } else {
          $("cake").classList.remove("blowing");
          if (t - quietSince > 9000) { $("mic-msg").textContent = "Blow harder! 😄 Or just tap the candles"; quietSince = t; }
        }
        micLoop = requestAnimationFrame(check);
      };
      micLoop = requestAnimationFrame(check);
    } catch (e) {
      $("mic-btn").hidden = true; $("mic-msg").textContent = "The mic didn't work, so tap the candles instead 👆";
    }
  });
  function stopMic() {
    cancelAnimationFrame(micLoop);
    if (mic) { mic.stream.getTracks().forEach((t) => t.stop()); mic.ac.close(); mic = null; }
  }
  $("replay").addEventListener("click", () => { fireworksUntil = 0; scratchDone = false; show(0); });

  // ---------- fill everything from data ----------
  function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }

  function render(d, keepPlace) {
    const prevKey = slides[at] && slides[at].dataset.key;
    data = d;
    document.body.className = "t-" + (["lilac", "pink", "mint", "night"].includes(d.theme) ? d.theme : "lilac");
    const name = d.to || "you";
    $("intro-h").textContent = "Psst… " + name + " 👋";

    const k = $("kinetic"); k.innerHTML = ""; let delay = 0;
    ["Happy", "Birthday"].forEach((w) => {
      const line = el("span", "w");
      [...w].forEach((ch) => { const s = el("span", "ch", ch); s.style.animationDelay = (delay += 0.06) + "s"; line.appendChild(s); });
      k.appendChild(line);
    });
    $("big-name").textContent = name;
    if (d.age) { $("burst").hidden = false; $("burst-n").textContent = d.age; $("burst-s").textContent = ordinal(d.age); } else $("burst").hidden = true;

    $("l-dear").textContent = "Dear " + name + ",";
    $("l-msg").textContent = d.message || "";
    $("l-sign").textContent = d.from ? "With love, " + d.from : "With love 💜";

    const n = d.age ? Math.max(1, Math.min(d.age, 7)) : 5;
    $("candles").innerHTML = "";
    for (let i = 0; i < n; i++) $("candles").appendChild(el("span", "candle"));

    $("ribbon").hidden = !(isPreview || d.sample);
    $("ribbon").textContent = d.sample ? "Sample · make your own" : "Preview";

    buildSlides();
    if (keepPlace) {
      const i = slides.findIndex((s) => s.dataset.key === prevKey);
      if (!$("story").hidden) { show(i >= 0 ? i : 0); return; }
      return;
    }
    const target = unlockTarget();
    if (!isPreview && target && Date.now() < target.getTime()) showLock(false);
    else afterLock();
  }

  // ---------- start ----------
  if (isPreview) {
    $("made").hidden = true;
    let first = true;
    addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "pp-preview") return;
      if (e.data.goto) {
        if (e.data.goto === "lock") { showLock(true); return; }
        if (e.data.goto === "quiz") { showQuiz(); return; }
        if ($("story").hidden) { hideAll(); $("story").hidden = false; }
        const i = slides.findIndex((s) => s.dataset.key === e.data.goto);
        show(i >= 0 ? i : 0);
        return;
      }
      render(e.data.data, !first);
      first = false;
    });
    parent.postMessage({ type: "pp-preview-ready" }, location.origin);
  } else if (pathId) {
    $("loading").hidden = false;
    fetch("/api/wish?id=" + encodeURIComponent(pathId))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (d.pending) {
          document.body.className = "t-" + (d.theme || "lilac");
          $("loading").innerHTML = "";
          const box = el("div", "pending");
          box.append(el("div", "lock-ico", "🎁"), el("h1", "gate-h", "This surprise is still being wrapped…"),
            el("p", "gate-sub", "It opens as soon as it's ready. Please check this link again a little later 💜"));
          $("loading").appendChild(box);
          return;
        }
        $("loading").hidden = true; render(d, false);
      })
      .catch(() => { $("loading").innerHTML = ""; $("loading").appendChild(el("p", null, "This surprise link isn't working. Please check the link, or ask the person who sent it.")); });
  } else {
    render(sampleData(), false);
  }
})();
