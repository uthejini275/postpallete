(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = "pp-smart-cards-v1";
  const MAX_CHARS = 90000;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  const str = (v) => (v == null ? "" : String(v)).trim();

  // ---------- example deck ----------
  const EXAMPLE = {
    id: "example", example: true, title: "Ohm's Law and Electric Circuits", subject: "Basic Electrical Engineering",
    level: "btech", source: "Example deck", exam: "",
    summary: "Current in a conductor is proportional to the voltage across it, as long as temperature stays the same. Resistance depends on the material, length and area of the conductor. Resistors in series add up directly, while in parallel their reciprocals add. Electrical power tells how fast energy is used, and heating follows Joule's law.",
    topics: [
      { title: "Ohm's Law", importance: "must", points: ["Current is directly proportional to potential difference at constant temperature.", "The constant of proportionality is resistance R.", "A V–I graph for an ohmic conductor is a straight line through the origin."], formula: "V = I × R", example: "A 10 Ω resistor with 2 A through it has V = 20 V.", trick: "VIR: Very Important Rule" },
      { title: "Resistance and resistivity", importance: "must", points: ["R increases with length and decreases with cross-section area.", "Resistivity ρ depends only on the material and temperature.", "Unit of resistivity is Ω·m."], formula: "R = ρ L / A", example: "Doubling a wire's length doubles its resistance.", trick: "Long and thin = more resistance" },
      { title: "Resistors in series", importance: "must", points: ["Same current flows through every resistor.", "Voltage divides in the ratio of resistances.", "Total resistance is larger than the largest one."], formula: "R = R1 + R2 + R3", example: "2 Ω + 3 Ω + 5 Ω in series = 10 Ω.", trick: "" },
      { title: "Resistors in parallel", importance: "must", points: ["Same voltage across every branch.", "Current divides, with more through the smaller resistor.", "Total resistance is smaller than the smallest one."], formula: "1/R = 1/R1 + 1/R2 + 1/R3", example: "Two 6 Ω resistors in parallel = 3 Ω.", trick: "Parallel = Pathways, so current gets more room" },
      { title: "Electrical power", importance: "good", points: ["Power is the rate of using electrical energy.", "1 kWh = 3.6 × 10⁶ J, the 'unit' on your electricity bill."], formula: "P = V I = I² R = V² / R", example: "A 230 V bulb drawing 0.5 A uses 115 W.", trick: "" },
      { title: "Joule's law of heating", importance: "good", points: ["Heat produced is proportional to I², R and time.", "Used in heaters, irons and fuses."], formula: "H = I² R t", example: "", trick: "Fuse wire: low melting point, high resistance" }
    ],
    flashcards: [
      { q: "State Ohm's law.", a: "At constant temperature, the current through a conductor is directly proportional to the potential difference across it (V = IR)." },
      { q: "What is the SI unit of resistivity?", a: "Ohm-metre (Ω·m)." },
      { q: "Equivalent resistance of two 4 Ω resistors in parallel?", a: "2 Ω." },
      { q: "In a series circuit, what stays the same through every resistor?", a: "The current." },
      { q: "In a parallel circuit, what stays the same across every branch?", a: "The voltage." },
      { q: "Write three formulas for electrical power.", a: "P = VI, P = I²R, P = V²/R." },
      { q: "How many joules are in 1 kWh?", a: "3.6 × 10⁶ J." },
      { q: "Why are household appliances connected in parallel?", a: "Each gets the full supply voltage and can be switched on or off independently." }
    ],
    quiz: [
      { q: "If the length of a wire is doubled and its area halved, its resistance becomes:", options: ["Same", "2 times", "4 times", "Half"], answer: 2, why: "R = ρL/A, so 2L ÷ (A/2) gives 4 times." },
      { q: "Three 3 Ω resistors in parallel give:", options: ["9 Ω", "1 Ω", "3 Ω", "6 Ω"], answer: 1, why: "1/R = 1/3 + 1/3 + 1/3 = 1, so R = 1 Ω." },
      { q: "A V–I graph of an ohmic conductor is:", options: ["A curve", "A straight line through the origin", "Parallel to the V axis", "A circle"], answer: 1, why: "V is directly proportional to I." },
      { q: "Which formula gives heat produced in a resistor?", options: ["H = IRt", "H = I²Rt", "H = V/Rt", "H = IR²t"], answer: 1, why: "Joule's law: H = I²Rt." },
      { q: "Power of a device that takes 2 A at 220 V:", options: ["110 W", "222 W", "440 W", "880 W"], answer: 2, why: "P = VI = 220 × 2 = 440 W." }
    ],
    examTips: ["Always write the formula before substituting values.", "Draw the circuit diagram neatly, since it often carries marks.", "Check units: Ω, A, V, W, J.", "Series vs parallel comparisons are frequently asked as short answers."]
  };

  // ---------- storage ----------
  function loadLib() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveLib() { try { localStorage.setItem(KEY, JSON.stringify(library.slice(0, 12))); } catch (e) {} }
  let library = loadLib();
  let current = library[0] || EXAMPLE;
  let tab = "cards";

  function renderLibrary() {
    const box = $("library"); box.innerHTML = "";
    box.appendChild(el("span", "lbl", "My decks"));
    [...library, EXAMPLE].forEach((d) => {
      const b = el("button", "deck-chip" + (d.id === current.id ? " on" : ""), (d.example ? "Example: " : "") + d.title);
      b.type = "button";
      b.addEventListener("click", () => { current = d; tab = "cards"; renderLibrary(); renderDeck(); });
      box.appendChild(b);
    });
  }

  // ---------- deck ----------
  function daysTo(date) {
    if (!date) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(date + "T00:00:00") - t) / 86400000);
  }

  function renderDeck() {
    const d = current; const box = $("deck"); box.innerHTML = "";
    const head = el("div", "deck-head");
    const left = el("div");
    left.appendChild(el("h2", null, d.title));
    const meta = el("div", "meta");
    if (d.example) meta.appendChild(el("span", "pill ex", "Example deck"));
    if (d.subject) meta.appendChild(el("span", "pill", d.subject));
    meta.appendChild(el("span", "pill", d.topics.length + " topics"));
    meta.appendChild(el("span", "pill", d.flashcards.length + " flip cards"));
    meta.appendChild(el("span", "pill", d.quiz.length + " quiz questions"));
    left.appendChild(meta);
    head.appendChild(left);
    const n = daysTo(d.exam);
    if (n !== null && n >= 0) {
      const c = el("div", "countdown");
      c.appendChild(el("div", "n", n === 0 ? "Exam today!" : n + (n === 1 ? " day left" : " days left")));
      const perDay = Math.max(1, Math.ceil(d.topics.length / Math.max(1, n - 1)));
      c.appendChild(el("div", "t", n <= 1 ? "Revise the ⭐ cards and do the quiz." : "Learn " + perDay + " card" + (perDay > 1 ? "s" : "") + " a day, quiz on the last day."));
      head.appendChild(c);
    }
    box.appendChild(head);
    if (d.pages && d.pages.to < d.pages.asked) {
      box.appendChild(el("div", "cutnote", "Made from pages " + d.pages.from + "–" + d.pages.to + ". Pages " + (d.pages.to + 1) + "–" + d.pages.asked + " were too long to fit in this deck, so make another deck for them."));
    } else if (d.pages) {
      box.appendChild(el("div", "pagesnote", "Made from pages " + d.pages.from + "–" + d.pages.to + " of " + d.pages.total));
    }

    const tabs = el("div", "tabs"); tabs.setAttribute("role", "tablist");
    [["cards", "Key cards"], ["flip", "Flip cards"], ["quiz", "Quiz"], ["summary", "Summary"]].forEach(([k, label]) => {
      const t = el("button", "tab", label); t.type = "button"; t.setAttribute("role", "tab"); t.setAttribute("aria-selected", String(tab === k));
      t.addEventListener("click", () => { tab = k; renderDeck(); });
      tabs.appendChild(t);
    });
    box.appendChild(tabs);
    const view = el("div", "view");
    box.appendChild(view);
    if (tab === "cards") renderCards(view, d);
    else if (tab === "flip") renderFlip(view, d);
    else if (tab === "quiz") renderQuiz(view, d);
    else renderSummary(view, d);
  }

  function renderCards(view, d) {
    const grid = el("div", "grid");
    const order = [...d.topics].sort((a, b) => (a.importance === "must" ? 0 : 1) - (b.importance === "must" ? 0 : 1));
    order.forEach((t, i) => {
      const c = el("article", "tcard c" + (i % 6));
      const top = el("div", "top");
      top.appendChild(el("span", "num", "Card " + (i + 1)));
      top.appendChild(el("span", "badge " + (t.importance === "must" ? "must" : "good"), t.importance === "must" ? "⭐ Must know" : "Good to know"));
      c.appendChild(top);
      c.appendChild(el("h3", null, t.title));
      if (t.points.length) { const ul = el("ul"); t.points.forEach((p) => ul.appendChild(el("li", null, p))); c.appendChild(ul); }
      if (t.formula) c.appendChild(el("div", "formula", t.formula));
      if (t.example) { const ex = el("div", "example"); ex.appendChild(el("b", null, "Example: ")); ex.appendChild(document.createTextNode(t.example)); c.appendChild(ex); }
      if (t.trick) c.appendChild(el("div", "trick", "✏️ " + t.trick));
      const more = el("button", "linkbtn", "Explain it more simply"); more.type = "button";
      const out = el("div", "simpler"); out.hidden = true;
      more.addEventListener("click", () => explainSimpler(t, d, more, out));
      c.append(more, out);
      grid.appendChild(c);
    });
    view.appendChild(grid);
  }

  let flipState = null;
  function renderFlip(view, d) {
    if (!flipState || flipState.deck !== d.id) flipState = { deck: d.id, order: d.flashcards.map((_, i) => i), pos: 0, knew: 0, again: [] };
    const s = flipState; const wrap = el("div", "flip-wrap");
    if (!d.flashcards.length) { wrap.appendChild(el("p", "note", "This deck has no flip cards.")); view.appendChild(wrap); return; }
    if (s.pos >= s.order.length) {
      const done = el("div", "flip-done");
      done.appendChild(el("div", "big", s.knew + " / " + s.order.length));
      done.appendChild(el("p", null, s.again.length ? "Nice work! " + s.again.length + " card" + (s.again.length > 1 ? "s" : "") + " to practise again." : "You knew every card. Amazing! 🎉"));
      const row = el("div", "btn-row");
      if (s.again.length) {
        const b = el("button", "btn primary", "Practise the ones I missed"); b.type = "button";
        b.addEventListener("click", () => { flipState = { deck: d.id, order: s.again.slice(), pos: 0, knew: 0, again: [] }; renderDeck(); });
        row.appendChild(b);
      }
      const r = el("button", "btn", "Start again"); r.type = "button";
      r.addEventListener("click", () => { flipState = null; renderDeck(); });
      row.appendChild(r); done.appendChild(row); wrap.appendChild(done); view.appendChild(wrap); return;
    }
    const card = d.flashcards[s.order[s.pos]];
    wrap.appendChild(el("div", "flip-count", "Card " + (s.pos + 1) + " of " + s.order.length + " · knew " + s.knew));
    const f = el("button", "flip"); f.type = "button"; f.setAttribute("aria-label", "Flip card");
    const inner = el("div", "flip-inner");
    const front = el("div", "face front"); front.append(el("div", "k", "Question"), el("div", "q", card.q), el("div", "tap", "Tap to see the answer"));
    const back = el("div", "face back"); back.append(el("div", "k", "Answer"), el("div", "a", card.a));
    inner.append(front, back); f.appendChild(inner);
    f.addEventListener("click", () => f.classList.toggle("flipped"));
    wrap.appendChild(f);
    const row = el("div", "btn-row");
    const again = el("button", "btn", "Study again"); again.type = "button";
    again.addEventListener("click", () => { s.again.push(s.order[s.pos]); s.pos++; renderDeck(); });
    const knew = el("button", "btn primary", "I knew it"); knew.type = "button";
    knew.addEventListener("click", () => { s.knew++; s.pos++; renderDeck(); });
    row.append(again, knew); wrap.appendChild(row);
    view.appendChild(wrap);
  }

  let quizState = null;
  function renderQuiz(view, d) {
    if (!quizState || quizState.deck !== d.id) quizState = { deck: d.id, picked: {} };
    const s = quizState; const q = el("div", "quiz");
    const answered = Object.keys(s.picked).length;
    const right = Object.entries(s.picked).filter(([i, p]) => d.quiz[i] && d.quiz[i].answer === p).length;
    const top = el("div", "btn-row");
    top.appendChild(el("span", "score", "Score " + right + " / " + d.quiz.length));
    if (answered) { const r = el("button", "btn small", "Retry quiz"); r.type = "button"; r.addEventListener("click", () => { quizState = null; renderDeck(); }); top.appendChild(r); }
    q.appendChild(top);
    d.quiz.forEach((item, i) => {
      const b = el("div", "qbox");
      b.appendChild(el("div", "qn", "Question " + (i + 1)));
      b.appendChild(el("div", "qq", item.q));
      const opts = el("div", "opts");
      const picked = s.picked[i];
      item.options.forEach((o, j) => {
        const ob = el("button", "opt", String.fromCharCode(65 + j) + ". " + o); ob.type = "button";
        if (picked !== undefined) {
          ob.disabled = true;
          if (j === item.answer) ob.classList.add("right");
          else if (j === picked) ob.classList.add("wrong");
        }
        ob.addEventListener("click", () => { s.picked[i] = j; renderDeck(); });
        opts.appendChild(ob);
      });
      b.appendChild(opts);
      if (picked !== undefined) b.appendChild(el("div", "why", (picked === item.answer ? "✅ Correct. " : "❌ Not quite. ") + item.why));
      q.appendChild(b);
    });
    view.appendChild(q);
  }

  function renderSummary(view, d) {
    const s = el("div", "sum");
    const b1 = el("div", "box b1"); b1.appendChild(el("h3", null, "The chapter in short")); b1.appendChild(el("p", null, d.summary));
    const must = d.topics.filter((t) => t.importance === "must");
    if (must.length) { const h = el("h3", null, "⭐ Must-know topics"); h.style.marginTop = "16px"; b1.appendChild(h); const ol = el("ol"); must.forEach((t) => ol.appendChild(el("li", null, t.title + (t.formula ? "  (" + t.formula + ")" : "")))); b1.appendChild(ol); }
    const b2 = el("div", "box b2"); b2.appendChild(el("h3", null, "Exam tips"));
    const ul = el("ul"); d.examTips.forEach((t) => ul.appendChild(el("li", null, t))); b2.appendChild(ul);
    const n = daysTo(d.exam);
    if (n !== null && n > 1) {
      const p = el("div", "plan");
      p.appendChild(el("b", null, "Your " + n + "-day plan: "));
      p.appendChild(document.createTextNode("learn the ⭐ cards first, then the rest. Use flip cards every evening. Take the quiz " + (n > 3 ? "3 days" : "1 day") + " before the exam and practise the cards you missed."));
      b2.appendChild(p);
    }
    s.append(b1, b2); view.appendChild(s);
  }

  // ---------- talking to our server ----------
  const MAX_IMAGES = 8;
  let leftToday = null;
  function showLeft(n) {
    if (typeof n !== "number") return;
    leftToday = n;
    $("left").textContent = n <= 0 ? "No free decks left today" : n === 1 ? "1 free deck left today" : n + " free decks left today";
  }

  function postJson(url, body, signal) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  }

  // Sends the PDF text to /api/cards and reads the streamed events.
  async function makeDeck(payload, signal, onProgress) {
    let r;
    try { r = await postJson("/api/cards", payload, signal); }
    catch (e) { throw { code: e && e.name === "AbortError" ? "cancelled" : "offline" }; }
    if (!r.ok) {
      let j = {};
      try { j = await r.json(); } catch (e) { /* not JSON */ }
      if (j.error === "daily_limit") showLeft(0);
      throw { code: j.error || (r.status === 413 ? "too_big" : "busy") };
    }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "", deck = null, started = false;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          let ev;
          try { ev = JSON.parse(line); } catch (e) { continue; }
          if (ev.t === "start") { started = true; showLeft(ev.left); }
          else if (ev.t === "progress") onProgress(ev.chars);
          else if (ev.t === "done") { deck = ev.deck; showLeft(ev.left); }
          else if (ev.t === "error") throw { code: ev.code };
        }
      }
    } catch (e) {
      if (started && leftToday !== null) showLeft(leftToday + 1); // failed decks don't use up the free limit
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw e && e.code ? e : { code: "offline" };
    }
    if (!deck) throw { code: "busy" };
    return deck;
  }

  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(",")[1] || "");
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  function errorText(e) {
    const c = e && e.code;
    if (c === "daily_limit") return "You've used today's free decks. Come back tomorrow for more! 💜";
    if (c === "site_busy") return "So many students used the site today that we've reached today's limit. Please try again tomorrow.";
    if (c === "busy") return "The card maker is busy right now. Wait a minute and try again.";
    if (c === "offline") return "Couldn't reach the server. Check your internet and try again.";
    if (c === "too_big") return "That's too much at once. Choose fewer pages and try again.";
    if (c === "too_little_text") return "There's hardly any text on these pages. Pick pages with more content.";
    if (c === "too_long") return "This chapter made too many cards at once. Choose fewer pages and try again.";
    if (c === "bad_input") return "Those pages couldn't be read. Try different pages or another PDF.";
    if (c === "messy" || c === "bad_shape") return "The cards came out messy. Tap the button to try again.";
    if (c === "refused") return "This PDF couldn't be turned into cards. Try a different chapter.";
    if (c === "server_setup") return "The site isn't set up correctly yet. Please let @postpallete_.stdio know.";
    return "Something went wrong. Please try again.";
  }

  function normalize(raw, opts, fileName) {
    if (!raw || typeof raw !== "object") throw { code: "bad_shape" };
    const arr = (v) => (Array.isArray(v) ? v : []);
    const topics = arr(raw.topics).map((t) => ({
      title: str(t && t.title), importance: t && t.importance === "must" ? "must" : "good",
      points: arr(t && t.points).map(str).filter(Boolean).slice(0, 5),
      formula: str(t && t.formula), example: str(t && t.example), trick: str(t && t.trick)
    })).filter((t) => t.title);
    const flashcards = arr(raw.flashcards).map((f) => ({ q: str(f && f.q), a: str(f && f.a) })).filter((f) => f.q && f.a);
    const quiz = arr(raw.quiz).map((q) => ({
      q: str(q && q.q), options: arr(q && q.options).map(str).slice(0, 4), answer: Number(q && q.answer), why: str(q && q.why)
    })).filter((q) => q.q && q.options.length === 4 && q.answer >= 0 && q.answer < 4);
    if (!topics.length) throw { code: "bad_shape" };
    return {
      id: "d" + Date.now(), title: str(raw.title) || fileName.replace(/\.pdf$/i, ""), subject: opts.subject || str(raw.subject),
      level: opts.level, source: fileName, exam: opts.exam, summary: str(raw.summary), topics, flashcards, quiz,
      examTips: arr(raw.examTips).map(str).filter(Boolean)
    };
  }

  async function explainSimpler(t, d, btn, out) {
    out.hidden = false;
    btn.disabled = true;
    out.textContent = "Thinking…";
    try {
      const r = await postJson("/api/explain", { title: t.title, points: t.points, formula: t.formula, level: d.level, lang: $("lang").value });
      let j = {};
      try { j = await r.json(); } catch (e) { /* not JSON */ }
      if (j.error === "daily_limit") out.textContent = "You've used today's free explanations. Come back tomorrow!";
      else if (j.error || !j.text) out.textContent = errorText({ code: j.error || "busy" });
      else out.textContent = j.text;
    } catch (e) {
      out.textContent = errorText({ code: "offline" });
    } finally { btn.disabled = false; }
  }

  // ---------- PDF ----------
  let pdfDoc = null, pdfName = "";
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  function setStatus(t, err) { const s = $("status"); s.textContent = t; s.classList.toggle("err", !!err); }

  async function openFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") { setStatus("Please choose a PDF file.", true); return; }
    if (!window.pdfjsLib) { setStatus("The PDF reader didn't load. Refresh the page and try again.", true); return; }
    setStatus("Opening " + file.name + "…");
    try {
      const buf = await file.arrayBuffer();
      pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      pdfName = file.name;
      $("drop-big").textContent = file.name;
      $("drop-small").textContent = pdfDoc.numPages + " page" + (pdfDoc.numPages > 1 ? "s" : "") + " · tap to choose a different file";
      $("range-row").hidden = false;
      $("p-from").max = $("p-to").max = pdfDoc.numPages;
      $("p-from").value = 1; $("p-to").value = Math.min(pdfDoc.numPages, 40);
      $("go").disabled = false;
      setStatus(pdfDoc.numPages > 40 ? "Big PDF! Pick up to 40 pages, like one chapter, for the best cards." : "Ready. Tap Make smart cards.");
    } catch (e) {
      pdfDoc = null; setStatus("Couldn't open this PDF. If it has a password, remove it and try again.", true);
    }
  }

  async function pageText(n) {
    const page = await pdfDoc.getPage(n);
    const tc = await page.getTextContent();
    return tc.items.map((it) => it.str + (it.hasEOL ? "\n" : " ")).join("");
  }
  async function pageImage(n) {
    const page = await pdfDoc.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: Math.min(2, 1100 / v1.width) });
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.75));
  }

  const drop = $("drop");
  drop.addEventListener("click", () => $("file").click());
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", (e) => openFile(e.target.files[0]));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); openFile(e.dataTransfer.files[0]); });

  let ctl = null;
  $("stop").addEventListener("click", () => { if (ctl) ctl.abort(); });

  $("go").addEventListener("click", async () => {
    if (!pdfDoc) { setStatus("Choose a PDF first.", true); return; }
    let from = Math.max(1, parseInt($("p-from").value, 10) || 1);
    let to = Math.min(pdfDoc.numPages, parseInt($("p-to").value, 10) || pdfDoc.numPages);
    if (to < from) [from, to] = [to, from];
    if (to - from + 1 > 60) { setStatus("Please choose 60 pages or fewer at a time, like one chapter.", true); return; }
    const opts = { level: $("level").value, lang: $("lang").value, subject: str($("subject").value), exam: $("exam").value };

    $("go").disabled = true; $("stop").hidden = false; $("bar").hidden = false;
    ctl = new AbortController();
    try {
      setStatus("Reading pages " + from + "–" + to + "…");
      let text = "", lastUsed = to;
      for (let p = from; p <= to; p++) {
        const chunk = "\n[Page " + p + "]\n" + (await pageText(p));
        if (text.length + chunk.length > MAX_CHARS) {
          if (p === from) { text = chunk.slice(0, MAX_CHARS); lastUsed = from; } else lastUsed = p - 1;
          break;
        }
        text += chunk;
      }
      const cut = lastUsed < to;
      const pages = lastUsed - from + 1;
      const letters = text.replace(/\s+|\[Page \d+\]/g, "").length;
      let images = [];
      if (letters / pages < 80) {
        const max = Math.min(MAX_IMAGES, pages);
        setStatus("This looks like a scanned PDF. Reading " + max + " page picture" + (max > 1 ? "s" : "") + "…");
        for (let p = from; p < from + max; p++) images.push(await blobToBase64(await pageImage(p)));
        text = "";
      }
      setStatus((cut ? "Pages " + from + "–" + to + " are too long for one deck, so I'm using pages " + from + "–" + lastUsed + ". " : "") + "Finding the important topics… this can take up to a minute.");
      const raw = await makeDeck(
        { level: opts.level, lang: opts.lang, subject: opts.subject, text, images },
        ctl.signal,
        (chars) => setStatus("Writing your cards… " + Math.round(chars / 100) / 10 + "k letters so far")
      );
      const deck = normalize(raw, opts, pdfName);
      const usedTo = images.length ? from + images.length - 1 : lastUsed;
      deck.pages = { from, to: usedTo, asked: to, total: pdfDoc.numPages };
      library = [deck, ...library.filter((d) => d.id !== deck.id)].slice(0, 12); saveLib();
      current = deck; tab = "cards"; flipState = null; quizState = null;
      renderLibrary(); renderDeck();
      const done = "Done! " + deck.topics.length + " cards, " + deck.flashcards.length + " flip cards and " + deck.quiz.length + " quiz questions from pages " + from + "–" + usedTo + ".";
      if (usedTo < to) {
        $("p-from").value = usedTo + 1; $("p-to").value = to;
        setStatus(done + " Pages " + (usedTo + 1) + "–" + to + " weren't included. They're filled in above, so tap Make smart cards again for a second deck.");
      } else setStatus(done);
      $("deck").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      if (e && e.code === "cancelled") setStatus("Stopped.");
      else setStatus(errorText(e), true);
    } finally {
      $("go").disabled = false; $("stop").hidden = true; $("bar").hidden = true; ctl = null;
    }
  });

  renderLibrary(); renderDeck();
})();
