/* ============================================================================
   Sunum motoru — slayt gezinme, ilerleme, animasyonlu sayaçlar ve öğretici
   görselleştirmeler (token bucket, fixed window, yarış koşulu, anahtar anatomisi,
   CDC pipeline, fail modu). Bağımlılık yok, tamamen offline.
   ========================================================================== */
(function () {
  "use strict";

  const slides = Array.from(document.querySelectorAll(".slide"));
  const total = slides.length;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const elProgress = document.getElementById("progress");
  const elCur = document.getElementById("cur");
  const elTot = document.getElementById("tot");
  const elDots = document.getElementById("dots");
  let index = 0;
  const timers = [];

  elTot.textContent = String(total);

  slides.forEach((_, i) => {
    const d = document.createElement("div");
    d.className = "dot" + (i === 0 ? " on" : "");
    d.addEventListener("click", () => go(i));
    elDots.appendChild(d);
  });
  const dots = Array.from(elDots.children);

  function clearTimers() { timers.forEach((t) => clearTimeout(t) || clearInterval(t)); timers.length = 0; }
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };

  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    clearTimers();
    slides[index].classList.remove("active");
    dots[index].classList.remove("on");
    index = i;
    slides[index].classList.add("active");
    dots[index].classList.add("on");
    elCur.textContent = String(index + 1);
    elProgress.style.width = ((index + 1) / total) * 100 + "%";
    onEnter(slides[index]);
    markOverviewCurrent();
    window.location.hash = "s" + (index + 1);
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  document.getElementById("next").addEventListener("click", next);
  document.getElementById("prev").addEventListener("click", prev);

  // ---------------------------------------- başa dön + genel bakış (grid)
  const ovPanel = document.getElementById("overviewPanel");
  const ovGrid = document.getElementById("ovGrid");
  const ovCount = document.getElementById("ovCount");
  const slideTitle = (s) => { const h = s.querySelector("h1, h2"); return h ? h.textContent.trim() : "Slayt"; };
  function buildOverview() {
    if (!ovGrid) return;
    ovGrid.innerHTML = "";
    slides.forEach((s, i) => {
      const c = document.createElement("button");
      c.className = "ov-card";
      c.innerHTML = '<span class="ov-num">' + (i + 1) + "</span><span class=\"ov-name\">" + slideTitle(s) + "</span>";
      c.addEventListener("click", () => { closeOverview(); go(i); });
      ovGrid.appendChild(c);
    });
    if (ovCount) ovCount.textContent = slides.length + " slayt";
  }
  function markOverviewCurrent() {
    if (!ovGrid) return;
    Array.from(ovGrid.children).forEach((c, i) => c.classList.toggle("cur", i === index));
  }
  function openOverview() { if (ovPanel) { ovPanel.hidden = false; markOverviewCurrent(); } }
  function closeOverview() { if (ovPanel) ovPanel.hidden = true; }
  function toggleOverview() { if (ovPanel) (ovPanel.hidden ? openOverview() : closeOverview()); }
  buildOverview();
  const homeBtn = document.getElementById("home");
  if (homeBtn) homeBtn.addEventListener("click", () => { closeOverview(); go(0); });
  const ovBtn = document.getElementById("overview");
  if (ovBtn) ovBtn.addEventListener("click", toggleOverview);
  const ovCloseBtn = document.getElementById("ovClose");
  if (ovCloseBtn) ovCloseBtn.addEventListener("click", closeOverview);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(total - 1);
    else if (e.key === "f" || e.key === "F") toggleFs();
    else if (e.key === "r" || e.key === "R") onEnter(slides[index], true); // animasyonu tekrarla
    else if (e.key === "o" || e.key === "O") toggleOverview();
    else if (e.key === "Escape") closeOverview();
  });
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  let tx = 0, ty = 0;
  document.addEventListener("touchstart", (e) => {
    tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    // Yalnızca YATAY baskın kaydırmada slayt değiştir; dikey kaydırma (içerik) serbest kalsın.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
  }, { passive: true });

  // ----------------------------------------------------------- slayt girişi
  function onEnter(slide, force) {
    slide.querySelectorAll("[data-count]").forEach((el) => {
      if (force) el.dataset.done = "";
      if (!el.dataset.done) animateCount(el);
    });
    const id = slide.id;
    if (id === "slide-intro") runIntro();
    else if (id === "slide-wallet") runWallet();
    else if (id === "slide-summary") runSummary();
    else if (id === "slide-obs") runObs();
    else if (id === "slide-es") runEs();
    else if (id === "slide-kafka") runKafka();
    else if (id === "slide-why-tech") runWhyTech();
    else if (id === "slide-tests-detail") runTestsDetail();
    else if (id === "slide-security") runSecurity();
    else if (id === "slide-stores") runStores();
    else if (id === "slide-redis") runRedis();
    else if (id === "slide-algos") runAlgos();
    else if (id === "slide-axes") runAxes();
    else if (id === "slide-concepts") runConcepts();
    else if (id === "slide-need") runNeed();
    else if (id === "slide-why") runWhy();
    else if (id === "slide-tbucket") runTokenBucket();
    else if (id === "slide-fixedwin") runFixedWindow();
    else if (id === "slide-race") runRace();
    else if (id === "slide-keyanat") runKeyAnat();
    else if (id === "slide-cdc") runCdc();
    else if (id === "slide-fail") runFail();
    else if (id === "slide-periods") runPeriods();
    else if (id === "slide-reconcile") runReconcile();
    else if (id === "slide-tests-intro") runTestRun();
    else if (id === "slide-ratelab") runRateLab();
    else if (id === "slide-quotalab") runQuotaLab();
  }

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || "0", 10);
    const suffix = el.dataset.suffix || "";
    el.dataset.done = "1";
    const fmt = (v) => (dec > 0 ? v.toFixed(dec).replace(".", ",") : Math.round(v).toLocaleString("tr-TR")) + suffix;
    if (reduce) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1100;
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }

  // -------------------------------------------------------- token bucket
  function runTokenBucket() {
    const tokens = document.getElementById("tbTokens");
    const water = document.getElementById("tbWater");
    const log = document.getElementById("tbLog");
    if (!tokens) return;
    const lns = log ? log.querySelectorAll(".ln") : [];
    if (!lns.length) return;
    const CAP = 5;
    function setTokens(n) {
      tokens.innerHTML = "";
      for (let i = 0; i < n; i++) { const t = document.createElement("div"); t.className = "tb-token"; tokens.appendChild(t); }
      water.style.height = (n / CAP) * 100 + "%";
    }
    lns.forEach((l) => l.classList.remove("on"));
    if (reduce) { setTokens(0); lns.forEach((l) => l.classList.add("on")); return; }
    setTokens(CAP);
    lns[0].classList.add("on");
    later(() => { lns[1].classList.add("on"); setTokens(0); }, 1400);            // 5 istek geçti
    later(() => { lns[2].classList.add("on"); }, 2800);                          // 6. reddedildi
    later(() => { lns[3].classList.add("on"); setTokens(CAP); }, 4200);          // yeniden doldu
  }

  // ------------------------------------------------------- fixed window

  // ------------------------------------------------------------- yarış

  // ----------------------------------------------------- anahtar anatomi

  // ------------------------------------------------------------- CDC

  // ------------------------------------------------------------- fail
  function runFail() {
    const head = document.getElementById("fdHead");
    const ico = document.getElementById("fdIco");
    const msg = document.getElementById("fdMsg");
    const open = document.getElementById("fdOpen");
    const closed = document.getElementById("fdClosed");
    const deg = document.getElementById("fdDeg");
    if (!head) return;
    const up = () => {
      head.classList.add("up");
      ico.innerHTML = '<use href="#i-db"/>';
      msg.innerHTML = "<b>Redis çalışıyor</b> — kararlar normal veriliyor";
      open.textContent = "200"; open.style.opacity = 1;
      closed.textContent = "200"; closed.style.opacity = 1;
      deg.textContent = "200"; deg.style.opacity = 1;
    };
    const down = () => {
      head.classList.remove("up");
      ico.innerHTML = '<use href="#i-warn"/>';
      msg.innerHTML = "<b>Redis çöktü</b> — her kural kendi politikasına göre davranıyor";
      open.textContent = "200 ↺"; deg.textContent = "200/429";
      closed.textContent = "503";
    };
    up();
    if (reduce) { down(); return; }
    later(down, 1600);
    every(() => { up(); later(down, 1600); }, 4200);
  }

  // -------------------------------------------------------- cüzdan demosu

  // ----------------------------------------------------- kota dönemleri

  // ------------------------------------------------- uzlaşma / kurtarma

  // ------------------------------------------------- gerçek test koşusu

  // -------------------------------------------- uygulamalı: hız limiti
  const CAP = 10;
  const rlState = { tokens: CAP, ok: 0, bad: 0 };
  function rlId() { return "d-" + Math.random().toString(16).slice(2, 8); }
  function rlRender() {
    const g = document.getElementById("rlTokens");
    const gl = document.getElementById("rlTokenLbl");
    if (g) g.style.width = (rlState.tokens / CAP) * 100 + "%";
    if (gl) gl.textContent = rlState.tokens + " / " + CAP + " token";
    const ok = document.getElementById("rlOk"), bad = document.getElementById("rlBad");
    if (ok) ok.textContent = rlState.ok;
    if (bad) bad.textContent = rlState.bad;
    const bypass = document.getElementById("rlBypass");
    const port = document.getElementById("rlPort");
    if (port) port.textContent = bypass && bypass.checked ? "port :8082 · doğrudan servis" : "port :8080 · gateway";
    if (g) g.classList.toggle("empty", rlState.tokens === 0);
  }
  function rlSendOne() {
    const bypass = document.getElementById("rlBypass");
    const dots = document.getElementById("rlDots");
    const resp = document.getElementById("rlResp");
    const direct = bypass && bypass.checked;
    let code;
    if (direct) { code = 200; }
    else if (rlState.tokens > 0) { rlState.tokens--; code = 200; }
    else { code = 429; }
    if (code === 200) rlState.ok++; else rlState.bad++;
    if (dots) {
      const d = document.createElement("span");
      d.className = "rl-dot " + (code === 200 ? "ok" : "bad");
      d.textContent = code;
      dots.appendChild(d);
      dots.scrollTop = dots.scrollHeight;
    }
    if (resp) {
      if (direct) {
        resp.textContent =
          "HTTP/1.1 200 OK        (port :8082 — limitleme YOK)\n" +
          "X-Served-By: demo-service\n\n" +
          "Aynı istek, gateway atlandığı için her seferinde geçer.";
      } else if (code === 200) {
        resp.textContent =
          "HTTP/1.1 200 OK\n" +
          "RateLimit: limit=30, remaining=" + rlState.tokens + ", reset=2\n" +
          "X-RateLimit-Limit: 30\n" +
          "X-RateLimit-Remaining: " + rlState.tokens + "\n" +
          "X-RateLimit-Decision-Id: " + rlId();
      } else {
        resp.textContent =
          "HTTP/1.1 429 Too Many Requests\n" +
          "Retry-After: 2\n\n" +
          "{\n" +
          '  "type": ".../problems/rate-limit-exceeded",\n' +
          '  "title": "Rate limit exceeded",\n' +
          '  "status": 429,\n' +
          '  "rateLimit": { "limit": 30, "remaining": 0,\n' +
          '                 "window": "1m", "retryAfterSeconds": 2 }\n' +
          "}";
      }
    }
    rlRender();
  }
  function rlReset() {
    rlState.tokens = CAP; rlState.ok = 0; rlState.bad = 0;
    const dots = document.getElementById("rlDots");
    const resp = document.getElementById("rlResp");
    if (dots) dots.innerHTML = "";
    if (resp) resp.textContent = "İstek göndermek için soldaki butona basın.";
    rlRender();
  }
  function runRateLab() {
    const send = document.getElementById("rlSend");
    if (!send) return;
    if (!send.dataset.wired) {
      send.dataset.wired = "1";
      send.addEventListener("click", rlSendOne);
      document.getElementById("rlReset").addEventListener("click", rlReset);
      document.getElementById("rlBypass").addEventListener("change", rlRender);
      document.getElementById("rlBurst").addEventListener("click", () => {
        let n = 0;
        every(function fire() { if (n++ < 15) rlSendOne(); else clearTimers(); }, reduce ? 0 : 160);
      });
    }
    rlReset();
  }

  // ------------------------------------------- uygulamalı: kota senaryoları

  /* ==== a_opening ==== */
// --------------------------------------------------- vaka: neden var?
  function runWhy() {
    const bad = document.getElementById("whyBad");
    const good = document.getElementById("whyGood");
    if (!bad || !good) return;

    const setState = (lane, txt) => { const s = lane.querySelector("[data-state]"); if (s) s.textContent = txt; };
    const setMeter = (lane, pct) => {
      pct = Math.max(0, Math.min(100, pct));
      const i = lane.querySelector(".wl-meter i");
      const p = lane.querySelector(".wl-pct");
      if (i) i.style.width = pct + "%";
      if (p) p.textContent = Math.round(pct) + "%";
    };
    const spawn = (lane, reject) => {
      const box = lane.querySelector(".wl-dots");
      if (!box) return;
      const d = document.createElement("div");
      d.className = "why-dot" + (reject ? " rej" : "");
      d.style.top = (34 + Math.random() * 30) + "%";
      box.appendChild(d);
      d.addEventListener("animationend", () => d.remove());
      later(() => { if (d.parentNode) d.remove(); }, 1500);
    };
    const reset = () => {
      bad.classList.remove("crashed");
      bad.querySelectorAll(".why-dot").forEach((e) => e.remove());
      good.querySelectorAll(".why-dot").forEach((e) => e.remove());
      setMeter(bad, 0); setMeter(good, 0);
      setState(bad, "akıyor…"); setState(good, "stabil");
    };

    reset();
    if (reduce) {
      setMeter(bad, 100); bad.classList.add("crashed"); setState(bad, "ÇÖKTÜ");
      setMeter(good, 55); setState(good, "stabil");
      return;
    }

    let tick = 0;
    every(function cycle() {
      tick++;
      // korumasız: her turda daha çok istek, hepsi servise ulaşır
      spawn(bad, false);
      if (tick > 3) spawn(bad, false);
      if (tick > 6) spawn(bad, false);
      // korumalı: bir istek geçer, fazlası kapıda 429 ile döner
      spawn(good, false);
      if (tick % 2 === 0) spawn(good, true);

      const badPct = Math.min(100, tick * 11);
      setMeter(bad, badPct);
      if (badPct >= 100 && !bad.classList.contains("crashed")) { bad.classList.add("crashed"); setState(bad, "ÇÖKTÜ"); }
      else if (badPct > 70) setState(bad, "yük yüksek");

      setMeter(good, 48 + Math.sin(tick / 1.6) * 7);
      setState(good, "stabil");

      if (tick >= 12) { clearTimers(); later(runWhy, 1700); }
    }, 430);
  }

  // ---------------------------------- neden ihtiyaç var? (6 sıkıntı vurgusu)
  function runNeed() {
    const cards = Array.from(document.querySelectorAll("#slide-need .nd-card"));
    if (!cards.length) return;
    cards.forEach((c) => c.classList.remove("nd-lit"));
    if (reduce) return;
    let i = 0;
    every(function step() {
      cards.forEach((c) => c.classList.remove("nd-lit"));
      if (i < cards.length) { cards[i].classList.add("nd-lit"); i++; }
      else { clearTimers(); later(runNeed, 2200); }
    }, 600);
  }

  /* ==== b_concepts ==== */
// ---------------------------------------------------- kavram sözlüğü (slide 4)
// Beş kavram kartı, giriş revealinden sonra sırayla hafifçe vurgulanır (tarayan
// bir ışık gibi), sonra hepsi sakin son duruma yerleşir.
function runConcepts() {
  var grid = document.getElementById("conceptGrid");
  if (!grid) return;
  var cards = grid.querySelectorAll(".concept");
  if (!cards.length) return;
  cards.forEach(function (c) { c.classList.remove("cn-lit"); });
  if (reduce) return;
  var i = 0;
  function step() {
    cards.forEach(function (c) { c.classList.remove("cn-lit"); });
    cards[i].classList.add("cn-lit");
    i++;
    if (i < cards.length) later(step, 640);
    else later(function () { cards.forEach(function (c) { c.classList.remove("cn-lit"); }); }, 760);
  }
  later(step, 520);
}

// ------------------------------------------------ iki eksen · canlı (slide 5)
// İki sayaç aynı ritimde ilerler. Hız limiti biter -> KENDİLİĞİNDEN dolar.
// Kota biter -> boşta kalır, bir kez eksiye (overdraft/kod 5) düşer, ancak
// bir YÜKLEME ile geri dolar. Fark yan yana canlı izlenir.
function runAxes() {
  var rf = document.getElementById("axRateFill"),
      rb = document.getElementById("axRateBal"),
      rs = document.getElementById("axRateStat"),
      qf = document.getElementById("axQuotaFill"),
      qb = document.getElementById("axQuotaBal"),
      qs = document.getElementById("axQuotaStat");
  if (!rf || !qf) return;

  function setStat(el, tone, ico, txt) {
    el.className = "ax-stat " + tone;
    el.innerHTML = '<svg><use href="#i-' + ico + '"/></svg><span>' + txt + "</span>";
  }

  var rate = [
    { w: 100, bal: "10 / 10 jeton", tone: "ok",   ico: "check",  t: "200 · RateLimit-Remaining: 10" },
    { w: 60,  bal: "6 / 10 jeton",  tone: "ok",   ico: "check",  t: "200 · RateLimit-Remaining: 6" },
    { w: 20,  bal: "2 / 10 jeton",  tone: "warn", ico: "gauge",  t: "200 · RateLimit-Remaining: 2" },
    { w: 0,   bal: "0 / 10 jeton",  tone: "bad",  ico: "x",      t: "429 · Retry-After: 3s" },
    { w: 20,  bal: "2 / 10 · ⟳",    tone: "warn", ico: "repeat", t: "kendiliğinden +2 doluyor" },
    { w: 60,  bal: "6 / 10 · ⟳",    tone: "warn", ico: "repeat", t: "dolmaya devam ediyor" },
    { w: 100, bal: "10 / 10 jeton", tone: "ok",   ico: "check",  t: "200 · yeniden hazır" }
  ];
  var quota = [
    { w: 100, over: false, bal: "100.000 birim",        tone: "ok",   ico: "check",   t: "200 · Quota-Remaining: 100.000" },
    { w: 60,  over: false, bal: "60.000 birim",         tone: "ok",   ico: "check",   t: "200 · Quota-Remaining: 60.000" },
    { w: 20,  over: false, bal: "20.000 birim",         tone: "warn", ico: "invoice", t: "200 · Quota-Remaining: 20.000" },
    { w: 100, over: true,  bal: "−40.000 · AŞIM",       tone: "over", ico: "warn",    t: "200 · AŞIM (overdraft · kod 5)" },
    { w: 100, over: true,  bal: "−40.000 · kilitli",    tone: "bad",  ico: "lock",    t: "429 · kota bitti · yükleme gerek" },
    { w: 100, over: true,  bal: "−40.000 · bekliyor",   tone: "bad",  ico: "lock",    t: "429 · zaman DOLDURMAZ" },
    { w: 100, over: false, bal: "+200.000 yüklendi",    tone: "ok",   ico: "wallet",  t: "200 · yeniden dolu" }
  ];

  function applyRate(f) { rf.style.width = f.w + "%"; rb.textContent = f.bal; setStat(rs, f.tone, f.ico, f.t); }
  function applyQuota(f) {
    qf.style.width = f.w + "%"; qf.classList.toggle("over", f.over);
    qb.textContent = f.bal; setStat(qs, f.tone, f.ico, f.t);
  }

  if (reduce) { applyRate(rate[3]); applyQuota(quota[3]); return; }

  var i = 0;
  applyRate(rate[0]); applyQuota(quota[0]);
  every(function () {
    i = (i + 1) % rate.length;
    applyRate(rate[i]);
    applyQuota(quota[i]);
  }, 1500);
}

  /* ==== c_algos ==== */
// -------------------------------------------------- 8 · algoritma kıyaslaması
  function runAlgos() {
    const slide = document.getElementById("slide-algos");
    if (!slide) return;
    const cards = [...slide.querySelectorAll(".al-card")];
    const rows = [...slide.querySelectorAll(".al-dec-row")];
    const fwDots = slide.querySelector(".al-fw-dots");
    const gc = [...slide.querySelectorAll(".al-gc i")];
    const ovFill = slide.querySelector(".al-ov-fill");
    const ovNeg = slide.querySelector(".al-ov-neg");

    // Fixed Window: eşit aralıklı isteklerin + sınırda kırmızı yığılma
    function paintFW() {
      if (!fwDots) return;
      fwDots.innerHTML = "";
      const mk = (x, cls, delay) => {
        const d = document.createElement("i");
        d.className = "al-fwd " + cls;
        d.style.left = x + "%";
        if (delay) d.style.animationDelay = delay + "ms";
        fwDots.appendChild(d);
      };
      [10, 24, 38].forEach((x, i) => mk(x, "ok", i * 90));
      [64, 78, 92].forEach((x, i) => mk(x, "ok", 620 + i * 90));
      [42, 47, 52, 57].forEach((x, i) => mk(x, "burst", 760 + i * 70)); // sınır patlaması
    }

    // GCRA: metronom gibi eşit aralıklı, pürüzsüz dolan kadans
    let gci = 0;
    function gcStep() {
      if (!gc.length) return;
      const n = gci % (gc.length + 1);
      gc.forEach((t, k) => t.classList.toggle("on", k < n));
      gci++;
    }

    // Overdraft: bakiye tükenir → bir kez eksiye → kilit
    function ovCycle() {
      if (!ovFill) return;
      ovFill.className = "al-ov-fill";
      ovFill.style.width = "100%";
      if (ovNeg) ovNeg.classList.remove("show");
      later(() => { ovFill.style.width = "42%"; }, 550);
      later(() => { ovFill.style.width = "9%"; ovFill.classList.add("warn"); }, 1500);
      later(() => { ovFill.style.width = "0%"; }, 2350);
      later(() => { if (ovNeg) ovNeg.classList.add("show"); }, 2750); // eksiye düştü + kilit
    }

    // sıfırla
    cards.forEach((c) => c.classList.remove("lit"));
    rows.forEach((r) => r.classList.remove("spot"));

    if (reduce) {
      cards.forEach((c) => c.classList.add("lit"));
      paintFW();
      gc.forEach((t) => t.classList.add("on"));
      if (ovFill) { ovFill.style.width = "0%"; ovFill.classList.add("warn"); }
      if (ovNeg) ovNeg.classList.add("show");
      rows.forEach((r) => r.classList.add("spot"));
      return;
    }

    // kartlar kademeli/vurgulu belirir
    cards.forEach((c, i) => later(() => c.classList.add("lit"), 200 + i * 170));

    // mini görselleştirmeler
    paintFW();
    every(paintFW, 2600);
    gcStep();
    every(gcStep, 260);
    ovCycle();
    every(ovCycle, 4200);

    // kartlar belirdikten sonra karar satırlarında dolaşan spot ışığı
    later(() => {
      let ri = 0;
      const spot = () => {
        rows.forEach((r) => r.classList.remove("spot"));
        if (rows[ri % rows.length]) rows[ri % rows.length].classList.add("spot");
        ri++;
      };
      spot();
      every(spot, 1700);
    }, 200 + cards.length * 170 + 500);
  }

  /* ==== d_engine ==== */
/* ============================================================================
   MOTOR — etkileşimli sürümler. Mevcut runFixedWindow/runRace/runKeyAnat'ın
   yerine geçer (aynı adlar korunur; onEnter kaydı bozulmaz).
   Yardımcılar (later/every/reduce) yeniden TANIMLANMAZ — sadece çağrılır.
   ========================================================================== */

// ------------------------------------------------------- Fixed Window
const fwState = { w1: 0, w2: 0 };
const FW_LIMIT = 100;
function fwBatch() {
  const s = document.getElementById("fwBatch");
  return s ? parseInt(s.value, 10) : 20;
}
function fwDrawHits(which, accepted, rejected) {
  const box = document.getElementById(which === 1 ? "fwDots1" : "fwDots2");
  if (!box) return;
  if (box.children.length > 130) return;
  const place = (rej) => {
    const d = document.createElement("span");
    d.className = "fw-hit" + (rej ? " rej" : "");
    // pencere 1 → sınıra yakın SAĞ; pencere 2 → sınıra yakın SOL
    const x = which === 1 ? 55 + Math.random() * 42 : 3 + Math.random() * 42;
    d.style.left = x + "%";
    d.style.top = 10 + Math.random() * 80 + "%";
    box.appendChild(d);
  };
  for (let i = 0; i < accepted; i++) place(false);
  for (let i = 0; i < rejected; i++) place(true);
}
function fwRender() {
  const setW = (id, v, full) => {
    const f = document.getElementById(id);
    if (f) { f.style.width = Math.min(100, v) + "%"; f.classList.toggle("full", full); }
  };
  const setT = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  setW("fwF1", fwState.w1, fwState.w1 >= FW_LIMIT);
  setW("fwF2", fwState.w2, fwState.w2 >= FW_LIMIT);
  setT("fwV1", fwState.w1 + " / 100");
  setT("fwV2", fwState.w2 + " / 100");
  const straddle = fwState.w1 + fwState.w2;
  setT("fwSbig", String(straddle));
  const sBox = document.getElementById("fwStraddle");
  const zone = document.getElementById("fwZone");
  const level = straddle >= 200 ? "danger" : (straddle > FW_LIMIT ? "warn" : "");
  if (sBox) sBox.className = "fw-straddle" + (level ? " " + level : "");
  if (zone) zone.classList.toggle("hot", straddle > FW_LIMIT);
  const noteTxt = document.getElementById("tlNoteTxt");
  if (noteTxt) {
    if (straddle >= 200)
      noteTxt.innerHTML = "İşte tuzak: her pencere <b>tam olarak 100</b> uyguladı, kural doğru işledi. Ama sıfırlama anına yığılan istekler iki pencereye bölündüğü için 1 saniyelik aralıkta <b>" + straddle + " istek</b> geçti — limitin <b>2 katı</b>.";
    else if (straddle > FW_LIMIT)
      noteTxt.innerHTML = "Sınır penceresinde <b>" + straddle + " istek</b> geçti — limiti (100) aştı bile. Diğer pencereyi de doldurun, 200'e çıkacak.";
    else
      noteTxt.innerHTML = "Her pencere kendi limitini (100) doğru uygular — ama iki pencereyi de sınıra doldurun: 1 saniyelik aralıkta <b>200 istek</b> geçer. Fiili tepe yük, limitin <b>2 katı</b>.";
  }
}
function fwSend(which) {
  const key = which === 1 ? "w1" : "w2";
  const batch = fwBatch();
  const room = FW_LIMIT - fwState[key];
  const acc = Math.max(0, Math.min(room, batch));
  const rej = batch - acc;
  fwState[key] += acc;
  fwDrawHits(which, acc, rej);
  fwRender();
}
function fwClearHits() {
  ["fwDots1", "fwDots2"].forEach((id) => { const e = document.getElementById(id); if (e) e.innerHTML = ""; });
}
function fwResetState() {
  fwState.w1 = 0; fwState.w2 = 0;
  fwClearHits();
  fwRender();
}
function fwPlay() {
  fwResetState();
  if (reduce) { fwState.w1 = 120 > FW_LIMIT ? FW_LIMIT : 120; fwState.w2 = FW_LIMIT; fwDrawHits(1, 100, 20); fwDrawHits(2, 100, 20); fwRender(); return; }
  // pencere 1 sonunu doldur, sonra pencere 2 başını doldur — tuzak canlı oluşsun
  const seq = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
  seq.forEach((w, i) => later(() => fwSend(w), 260 + i * 300));
}
function runFixedWindow() {
  const w1 = document.getElementById("fwW1");
  if (!w1) return;
  if (!w1.dataset.wired) {
    w1.dataset.wired = "1";
    w1.addEventListener("click", () => fwSend(1));
    document.getElementById("fwW2").addEventListener("click", () => fwSend(2));
    document.getElementById("fwPlay").addEventListener("click", fwPlay);
    document.getElementById("fwReset").addEventListener("click", fwResetState);
    const sl = document.getElementById("fwBatch");
    const lbl = document.getElementById("fwBatchLbl");
    sl.addEventListener("input", () => { if (lbl) lbl.textContent = sl.value; });
  }
  if (reduce) {
    fwClearHits();
    fwState.w1 = FW_LIMIT; fwState.w2 = FW_LIMIT;
    fwDrawHits(1, 100, 20); fwDrawHits(2, 100, 20);
    fwRender();
    return;
  }
  fwResetState();
}

// ------------------------------------------------------------- Yarış
let raceMode = "naif";
function raceReset() {
  const ctr = document.getElementById("raceCtr");
  document.querySelectorAll("#slide-race .race-step").forEach((s) => s.classList.remove("on"));
  if (ctr) { ctr.textContent = "99"; ctr.className = "race-counter"; }
  const v = document.getElementById("rqVerdict");
  if (v) { v.textContent = "yolu seç ve gönder"; v.className = "rq-verdict"; }
  document.querySelectorAll("#slide-race .rq-fire").forEach((f) => f.remove());
}
function raceSetMode(mode) {
  raceMode = mode;
  document.querySelectorAll("#rqSeg .rq-opt").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
  const grid = document.getElementById("raceGrid");
  if (grid) grid.className = "race reveal mode-" + mode;
  raceReset();
}
function raceFire(cls, delay) {
  const mid = document.getElementById("slide-race") ? document.querySelector("#slide-race .race-mid") : null;
  if (!mid) return;
  later(() => {
    const f = document.createElement("span");
    f.className = "rq-fire " + cls;
    mid.appendChild(f);
    later(() => f.remove(), 520);
  }, delay);
}
function raceGo() {
  raceReset();
  const ctr = document.getElementById("raceCtr");
  const v = document.getElementById("rqVerdict");
  const lit = (r) => { const el = document.querySelector('#slide-race [data-r="' + r + '"]'); if (el) el.classList.add("on"); };
  if (raceMode === "naif") {
    const seq = [
      ["b0", () => raceFire("a", 0)],
      ["b1", () => raceFire("b", 0)],
      ["b2"], ["b3"],
      ["b4", () => { if (ctr) { ctr.textContent = "101"; ctr.classList.add("hot"); } if (v) { v.textContent = "101 — limit AŞILDI"; v.className = "rq-verdict hot"; } }],
    ];
    if (reduce) { seq.forEach((s) => { lit(s[0]); if (s[1]) s[1](); }); return; }
    seq.forEach((s, k) => later(() => { lit(s[0]); if (s[1]) s[1](); }, 400 + k * 640));
  } else {
    const seq = [
      ["g0", () => { raceFire("a", 0); if (ctr) { ctr.textContent = "99"; ctr.className = "race-counter"; } }],
      ["g1", () => { if (ctr) ctr.textContent = "100"; }],
      ["g2", () => raceFire("b", 0)],
      ["g3"],
      ["g4", () => { if (ctr) ctr.classList.add("safe"); if (v) { v.textContent = "100 — korundu"; v.className = "rq-verdict safe"; } }],
    ];
    if (reduce) { seq.forEach((s) => { lit(s[0]); if (s[1]) s[1](); }); return; }
    seq.forEach((s, k) => later(() => { lit(s[0]); if (s[1]) s[1](); }, 400 + k * 640));
  }
}
function runRace() {
  const go = document.getElementById("rqGo");
  if (!go) return;
  if (!go.dataset.wired) {
    go.dataset.wired = "1";
    go.addEventListener("click", raceGo);
    document.getElementById("rqReset").addEventListener("click", raceReset);
    document.querySelectorAll("#rqSeg .rq-opt").forEach((b) =>
      b.addEventListener("click", () => raceSetMode(b.dataset.mode)));
  }
  raceSetMode(raceMode);
  if (reduce) raceGo();
}

// ----------------------------------------------------- Anahtar anatomisi
const KA_EXAMPLES = [
  { tag: "takvim · aylık", parts: [
    { t: "rl:", cls: "p1", lbl: "önek", tone: "t3", ic: "i-key", title: 'Sabit önek <span class="chip-mono">rl:</span>',
      desc: "Tüm rate-limit anahtarlarını tek isim alanında toplar. Araçlar, TTL süpürme ve <b>SCAN</b> bu önekle güvenle çalışır." },
    { t: "{t:acme}", cls: "p2", lbl: "hash-tag · özne", tone: "accent", ic: "i-key", title: 'Hash-tag <span class="chip-mono">{t:acme}</span>',
      desc: "Küme (cluster) içinde aynı öznenin <b>tüm</b> anahtarlarını <b>aynı slot'a</b> düşürür — böylece tek atomik Lua script hepsine dokunabilir." },
    { t: ":", cls: "p1", lbl: "", tone: "t3", ic: "i-key", title: "Ayraç :",
      desc: "Parçaları ayırır; okunabilir, ayrıştırılabilir ve önek-arama dostu bir anahtar oluşturur." },
    { t: "q.api", cls: "p3", lbl: "counterKey · ne ölçer", tone: "violet", ic: "i-target", title: 'counterKey <span class="chip-mono">q.api</span>',
      desc: "Sayaç <b>NE</b> ölçtüğünü söyler — hangi kural olduğunu değil. Müşteri plan değiştirse bile sayaç sıfırlanmaz, <b>tüketim korunur</b>." },
    { t: ":", cls: "p1", lbl: "", tone: "t3", ic: "i-key", title: "Ayraç :",
      desc: "Son parçayı, dönem dilimini ayırır." },
    { t: "202607", cls: "p4", lbl: "pencere dilimi", tone: "good", ic: "i-clock", title: 'Pencere dilimi <span class="chip-mono">202607</span>',
      desc: "Yıl+ay. Takvim penceresi anahtara <b>gömülür</b>; Temmuz 2026 biter bitmez yeni ay <b>yeni bir anahtara</b> yazar — otomatik sıfırlama, silme işi yok." },
  ]},
  { tag: "süresiz · overdraft", parts: [
    { t: "rl:", cls: "p1", lbl: "önek", tone: "t3", ic: "i-key", title: 'Sabit önek <span class="chip-mono">rl:</span>',
      desc: "Cüzdan anahtarları da aynı <span class='chip-mono'>rl:</span> isim alanında yaşar." },
    { t: "{t:acme}", cls: "p2", lbl: "hash-tag · özne", tone: "accent", ic: "i-key", title: 'Hash-tag <span class="chip-mono">{t:acme}</span>',
      desc: "Aynı özne, aynı slot. Cüzdan güncellemesi ve okuması tek atomik çağrıda kalır." },
    { t: ":", cls: "p1", lbl: "", tone: "t3", ic: "i-key", title: "Ayraç :", desc: "Parçaları ayırır." },
    { t: "q.wallet", cls: "p3", lbl: "counterKey · cüzdan", tone: "violet", ic: "i-wallet", title: 'counterKey <span class="chip-mono">q.wallet</span>',
      desc: "Cüzdan bakiyesi <b>para karşılığıdır</b>. Yalnız yükleyerek dolar, bir kez eksiye düşebilir (<b>overdraft</b>, kod 5)." },
    { t: "∅", cls: "p1", lbl: "pencere dilimi YOK", tone: "t3", ic: "i-lock", title: "Dönem dilimi YOK — süresiz",
      desc: "Cüzdanda takvim dilimi <b>bulunmaz</b>: dönem bitince sıfırlanmaz. Bakiye kalıcıdır — Redis <span class='chip-mono'>AOF</span> ile restart'ta bile korunur (test: 850 → restart → 850)." },
  ]},
  { tag: "kayan · GCRA", parts: [
    { t: "rl:", cls: "p1", lbl: "önek", tone: "t3", ic: "i-key", title: 'Sabit önek <span class="chip-mono">rl:</span>',
      desc: "Hız-limiti anahtarları da aynı isim alanında." },
    { t: "{t:acme}", cls: "p2", lbl: "hash-tag · özne", tone: "accent", ic: "i-key", title: 'Hash-tag <span class="chip-mono">{t:acme}</span>',
      desc: "Özne bazlı slot yerleşimi — GCRA sayacı da atomik Lua ile güncellenir." },
    { t: ":", cls: "p1", lbl: "", tone: "t3", ic: "i-key", title: "Ayraç :", desc: "Parçaları ayırır." },
    { t: "rate.api", cls: "p3", lbl: "counterKey · hız", tone: "violet", ic: "i-gauge", title: 'counterKey <span class="chip-mono">rate.api</span>',
      desc: "GCRA / token-bucket sayacı: '<b>ne kadar hızlı</b>' sorusunu ölçer. Kendiliğinden dolar, <b>faturalanmaz</b>, sistemi korur (burst 10, 30/dk)." },
    { t: "∅", cls: "p1", lbl: "pencere dilimi YOK", tone: "t3", ic: "i-gauge", title: "Dönem dilimi YOK — kayan pencere",
      desc: "GCRA takvim dilimi kullanmaz. Zaman, sayaç değerinin <b>içinde</b> saklanır (TAT — teorik varış zamanı), anahtarda değil. Sınır tuzağı da yoktur." },
  ]},
];
let kaExample = 0;
function kaDetailReset() {
  const set = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  const d = document.getElementById("kaDetail");
  if (d) d.className = "ka-detail reveal i-t3";
  const ico = document.getElementById("kadIco");
  if (ico) ico.innerHTML = '<use href="#i-key"/>';
  set("kadTitle", "Bir parçanın üstüne gelin");
  set("kadDesc", "Fare ile (veya klavyeyle sekerek) yukarıdaki parçaları gezin — her birinin görevi ve neden orada olduğu burada belirir.");
  const tag = document.getElementById("kadTag");
  if (tag) tag.textContent = KA_EXAMPLES[kaExample].tag;
  const box = document.getElementById("keyAnat");
  if (box) box.classList.remove("dimmed");
  document.querySelectorAll("#keyAnat .ka-part").forEach((p) => p.classList.remove("active"));
}
function kaShow(idx) {
  const part = KA_EXAMPLES[kaExample].parts[idx];
  if (!part) return;
  const toneCls = { t3: "i-t3", accent: "i-accent", violet: "i-violet", good: "i-good" }[part.tone] || "i-t3";
  const d = document.getElementById("kaDetail");
  if (d) d.className = "ka-detail reveal " + toneCls;
  const ico = document.getElementById("kadIco");
  if (ico) ico.innerHTML = '<use href="#' + part.ic + '"/>';
  const set = (id, html) => { const e = document.getElementById(id); if (e) e.innerHTML = html; };
  set("kadTitle", part.title);
  set("kadDesc", part.desc);
  const tag = document.getElementById("kadTag");
  if (tag) tag.textContent = KA_EXAMPLES[kaExample].tag;
  const box = document.getElementById("keyAnat");
  if (box) box.classList.add("dimmed");
  document.querySelectorAll("#keyAnat .ka-part").forEach((p, i) => p.classList.toggle("active", i === idx));
}
function kaRender() {
  const box = document.getElementById("keyAnat");
  if (!box) return;
  const ex = KA_EXAMPLES[kaExample];
  box.classList.remove("dimmed");
  box.innerHTML = "";
  ex.parts.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "ka-part " + p.cls;
    el.dataset.idx = String(i);
    el.tabIndex = 0;
    el.innerHTML = p.t + '<span class="lbl">' + (p.lbl || "") + "</span>";
    box.appendChild(el);
    if (reduce) el.classList.add("in");
    else later(() => el.classList.add("in"), 260 + i * 260);
  });
  if (!box.dataset.wired) {
    box.dataset.wired = "1";
    const from = (e) => { const t = e.target.closest(".ka-part"); if (t) kaShow(parseInt(t.dataset.idx, 10)); };
    box.addEventListener("mouseover", from);
    box.addEventListener("focusin", from);
    box.addEventListener("mouseleave", kaDetailReset);
  }
}
function runKeyAnat() {
  const seg = document.getElementById("kaSeg");
  if (!seg) return;
  if (!seg.dataset.wired) {
    seg.dataset.wired = "1";
    seg.querySelectorAll(".rq-opt").forEach((b) =>
      b.addEventListener("click", () => {
        kaExample = parseInt(b.dataset.ex, 10);
        seg.querySelectorAll(".rq-opt").forEach((o) => o.classList.toggle("on", o === b));
        kaRender();
        kaDetailReset();
      }));
  }
  kaRender();
  kaDetailReset();
}

  /* ==== e_infra ==== */
/* ---------------------------------------------------------------- 13 · REDIS
   Bir isteğin Redis'te atomik Lua ile ~19µs'de karara dönüşü.
   Satırlar tek tek yanar, µs sayacı birikir (4+3+5+4+3 = 19µs), karar dışarı çıkar. */
function runRedis() {
  const eng = document.getElementById("rdsEngine");
  if (!eng) return;
  const req = document.getElementById("rdsReq");
  const out = document.getElementById("rdsOut");
  const us = document.getElementById("rdsUs");
  const lines = eng.querySelectorAll(".rds-lua .rl");
  const totalUs = () => Array.prototype.reduce.call(lines, (a, l) => a + (parseInt(l.dataset.t, 10) || 0), 0);
  const reset = () => {
    req.classList.remove("in");
    out.classList.remove("in");
    lines.forEach((l) => l.classList.remove("on"));
    us.textContent = "0 µs";
  };
  if (reduce) {
    req.classList.add("in");
    lines.forEach((l) => l.classList.add("on"));
    out.classList.add("in");
    us.textContent = totalUs() + " µs";
    return;
  }
  const play = () => {
    reset();
    const base = 700, step = 520;
    later(() => req.classList.add("in"), 220);
    let acc = 0;
    lines.forEach((l, i) => {
      later(() => {
        l.classList.add("on");
        acc += parseInt(l.dataset.t, 10) || 0;
        us.textContent = acc + " µs";
      }, base + i * step);
    });
    later(() => out.classList.add("in"), base + lines.length * step + 220);
  };
  play();
  every(play, 700 + lines.length * 520 + 2600);
}

/* ------------------------------------------------------------------ 14 · CDC
   PostgreSQL→outbox→Debezium→Kafka→gateway zincirinde paket akışı.
   Segment gecikmeleri (8+12+9+6=35ms) birikerek uçtan uca ~35ms'yi gösterir. */
function runCdc() {
  const pipe = document.getElementById("cdcPipe");
  if (!pipe) return;
  const nodes = pipe.querySelectorAll(".pipe-node");
  const segs = pipe.querySelectorAll(".pipe-seg");
  const mss = pipe.querySelectorAll(".cdcx-ms");
  const timer = document.getElementById("cdcTimer");
  const total = Array.prototype.reduce.call(segs, (a, s) => a + (parseInt(s.dataset.ms, 10) || 0), 0);
  const clear = () => {
    nodes.forEach((n) => n.classList.remove("lit"));
    segs.forEach((s) => s.classList.remove("run"));
    mss.forEach((m) => m.classList.remove("on"));
    if (timer) timer.textContent = "0 ms";
  };
  if (reduce) {
    nodes.forEach((n) => n.classList.add("lit"));
    mss.forEach((m) => m.classList.add("on"));
    if (timer) timer.textContent = total + " ms";
    return;
  }
  const play = () => {
    clear();
    nodes[0].classList.add("lit");
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      later(() => {
        const s = segs[i];
        s.classList.remove("run"); void s.offsetWidth; s.classList.add("run");
        if (mss[i]) mss[i].classList.add("on");
        acc += parseInt(s.dataset.ms, 10) || 0;
        if (timer) timer.textContent = acc + " ms";
        later(() => nodes[i + 1] && nodes[i + 1].classList.add("lit"), 780);
      }, 500 + i * 1150);
    }
  };
  play();
  every(play, segs.length * 1150 + 2600);
}

/* --------------------------------------------------------------- 15 · STORES
   Bir DENY olayının üç depoya farklı amaçlarla dağılışı.
   Prometheus şeridinde tenant etiketi görünür biçimde DÜŞÜLÜR (ADR-011). */
function runStores() {
  const stage = document.getElementById("stStage");
  if (!stage) return;
  const evt = document.getElementById("stEvent");
  const drop = document.getElementById("stDrop");
  const paths = stage.querySelectorAll(".st-path");
  const cards = stage.querySelectorAll(".st-store");
  const clear = () => {
    evt.classList.remove("fire");
    paths.forEach((p) => p.classList.remove("run"));
    cards.forEach((c) => c.classList.remove("hit"));
    if (drop) drop.classList.remove("cut");
  };
  if (reduce) {
    evt.classList.add("fire");
    paths.forEach((p) => p.classList.add("run"));
    cards.forEach((c) => c.classList.add("hit"));
    if (drop) drop.classList.add("cut");
    return;
  }
  const play = () => {
    clear();
    later(() => evt.classList.add("fire"), 220);
    paths.forEach((p, i) => later(() => {
      p.classList.remove("run"); void p.offsetWidth; p.classList.add("run");
    }, 780 + i * 260));
    cards.forEach((c, i) => later(() => c.classList.add("hit"), 1480 + i * 260));
    later(() => { if (drop) drop.classList.add("cut"); }, 2700);
  };
  play();
  every(play, 5400);
}

  /* ==== f_product ==== */
/* ===========================================================================
   ÜRÜN 2 — interaktif animasyonlar
   (later/every/reduce KAPSAMDA; yeniden tanımlama — sadece çağır)
   =========================================================================== */

// -------------------------------------------- interaktif kota cüzdanı (overdraft)
function runWallet() {
  const bar = document.getElementById("wal2Bar");
  const fill = document.getElementById("wal2Fill");
  const bal = document.getElementById("wal2Bal");
  const gEl = document.getElementById("wal2Granted");
  const uEl = document.getElementById("wal2Used");
  const resp = document.getElementById("wal2Resp");
  const send = document.getElementById("wal2Send");
  const load = document.getElementById("wal2Load");
  const reset = document.getElementById("wal2Reset");
  const auto = document.getElementById("wal2Auto");
  if (!bar || !fill) return;

  const S = { g: 1000, u: 900 };
  let autoT = null, ai = 0;

  const render = function (flash) {
    const balance = S.g - S.u;
    const over = balance < 0;
    const low = !over && balance <= S.g * 0.25;
    const pct = Math.max(0, Math.min(100, (S.u / S.g) * 100));
    fill.style.width = pct + "%";
    bar.classList.toggle("over", over);
    bar.classList.toggle("warn", low);
    bal.textContent = "bakiye " + balance + (over ? " · AŞIM" : "");
    bal.style.color = over ? "var(--danger)" : (low ? "var(--warn)" : "var(--good)");
    gEl.textContent = S.g;
    uEl.textContent = S.u;
    if (flash && !reduce) { resp.classList.remove("wal2-flash"); void resp.offsetWidth; resp.classList.add("wal2-flash"); }
  };

  const showResp = function (ok, code, statusTxt, rem) {
    const cls = ok ? "st-ok" : "st-bad";
    const rv = rem < 0 ? "hv-neg" : "hv-pos";
    resp.innerHTML =
      'HTTP/1.1 <span class="' + cls + '">' + code + " " + statusTxt + "</span>\n" +
      '<span class="hd">X-Quota-Remaining</span>: <span class="' + rv + '">' + rem + "</span>";
  };

  const doSend = function () {
    if (S.g - S.u > 0) { S.u += 200; render(true); showResp(true, 200, "OK", S.g - S.u); }
    else { render(true); showResp(false, 429, "Too Many Requests", S.g - S.u); }
  };
  const doLoad = function () { S.g += 1000; render(true); showResp(true, 200, "OK · +1000 birim yüklendi", S.g - S.u); };
  const doReset = function () {
    S.g = 1000; S.u = 900; render(false);
    resp.innerHTML = '<span class="hint">// İstek gönderin — bakiye 100. 200 birimlik istek geçer, sizi -100\'e düşürür; sonrası 429.</span>';
  };

  const stopAuto = function () { if (autoT) { clearInterval(autoT); autoT = null; } if (auto) auto.checked = false; };
  const seq = [doSend, doSend, doSend, doLoad, doReset];
  const startAuto = function () {
    stopAuto(); ai = 0; if (auto) auto.checked = true;
    autoT = every(function () { seq[ai % seq.length](); ai++; }, 2000);
  };

  if (!send.dataset.wired) {
    send.dataset.wired = "1";
    send.addEventListener("click", function () { stopAuto(); doSend(); });
    load.addEventListener("click", function () { stopAuto(); doLoad(); });
    reset.addEventListener("click", function () { stopAuto(); doReset(); });
    auto.addEventListener("change", function () { auto.checked ? startAuto() : stopAuto(); });
  }

  if (reduce) {
    S.g = 1000; S.u = 1100; render(false);
    showResp(false, 429, "Too Many Requests", -100);
    return;
  }
  doReset();
  later(startAuto, 700); // canlı giriş; ilk buton basışında durur
}

// ------------------------------------ ön ödemeli vs yenilenen (dönem-dilimli anahtar)
function runPeriods() {
  const pre = document.getElementById("per2Pre");
  const ren = document.getElementById("per2Ren");
  const preCap = document.getElementById("per2PreCap");
  const renCap = document.getElementById("per2RenCap");
  const chip = document.querySelector(".per2-keychip");
  const sliceEl = document.getElementById("per2Slice");
  const periodEl = document.getElementById("per2Period");
  const modeLbl = document.getElementById("per2ModeLbl");
  const seg = document.getElementById("per2Seg");
  const adv = document.getElementById("per2Adv");
  const reset = document.getElementById("per2Reset");
  const auto = document.getElementById("per2Auto");
  const prevEl = document.getElementById("per2Prev");
  const curEl = document.getElementById("per2Cur");
  const nextEl = document.getElementById("per2Next");
  if (!pre || !ren) return;

  const pad = function (n) { return (n < 10 ? "0" : "") + n; };
  const sliceDay = function (p) {
    const d = new Date(2026, 6, 24); d.setDate(d.getDate() + p);
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  };
  const sliceWeek = function (p) { return "2026W" + (30 + p); };
  const sliceMonth = function (p) {
    const m = 7 + p, y = 2026 + Math.floor((m - 1) / 12), mm = ((m - 1) % 12) + 1;
    return "" + y + pad(mm);
  };
  const MODES = {
    day: { lbl: "Günlük", slice: sliceDay },
    week: { lbl: "Haftalık", slice: sliceWeek },
    month: { lbl: "Aylık", slice: sliceMonth },
  };

  const S = { mode: "day", period: 0, preUsed: 0, renUsed: 0 };
  let autoT = null;

  const chunk = function () { return 24 + Math.round(Math.random() * 16); }; // 24–40

  const renderKey = function (bump) {
    const sl = MODES[S.mode].slice;
    sliceEl.textContent = sl(S.period);
    modeLbl.textContent = MODES[S.mode].lbl;
    periodEl.textContent = (S.period + 1) + ". dönem";
    prevEl.textContent = S.period > 0 ? sl(S.period - 1) : "—";
    curEl.textContent = sl(S.period);
    nextEl.textContent = sl(S.period + 1);
    if (bump && !reduce) {
      chip.classList.remove("flash"); void chip.offsetWidth; chip.classList.add("flash");
      curEl.classList.remove("bump"); void curEl.offsetWidth; curEl.classList.add("bump");
    }
  };

  const renderBars = function () {
    pre.style.width = Math.min(100, S.preUsed) + "%";
    ren.style.width = Math.min(100, S.renUsed) + "%";
    if (S.preUsed >= 96) {
      preCap.classList.add("hot");
      preCap.innerHTML = "cüzdan doldu — erişim durur, yeniden <b>yükleme</b> gerekir";
    } else {
      preCap.classList.remove("hot");
      preCap.innerHTML = "tüketim <b>birikir</b> — dönem değişse de sıfırlanmaz";
    }
  };

  const consumeNewPeriod = function () {
    const c = chunk();
    S.preUsed = Math.min(100, S.preUsed + c);
    S.renUsed = c;
    renderBars();
  };

  const advance = function () {
    if (S.preUsed >= 96) { doReset(); return; } // cüzdan dolduysa hikayeyi baştan al
    // yenilenen: dönem sınırında 0'a döner (görsel flash)
    if (!reduce) { ren.classList.remove("per2-reset"); void ren.offsetWidth; ren.classList.add("per2-reset"); }
    S.renUsed = 0; renderBars();
    S.period++; renderKey(true);
    later(consumeNewPeriod, reduce ? 0 : 360);
  };

  const doReset = function () {
    ren.classList.remove("per2-reset");
    S.period = 0; S.preUsed = 0; S.renUsed = 0;
    renderKey(false);
    const c = chunk(); S.preUsed = c; S.renUsed = c; renderBars();
  };

  const setMode = function (m) {
    if (!MODES[m]) return;
    S.mode = m;
    Array.prototype.forEach.call(seg.children, function (b) { b.classList.toggle("on", b.dataset.mode === m); });
    doReset();
  };

  const stopAuto = function () { if (autoT) { clearInterval(autoT); autoT = null; } if (auto) auto.checked = false; };
  const startAuto = function () { stopAuto(); if (auto) auto.checked = true; autoT = every(advance, 2200); };

  if (!adv.dataset.wired) {
    adv.dataset.wired = "1";
    adv.addEventListener("click", function () { stopAuto(); advance(); });
    reset.addEventListener("click", function () { stopAuto(); doReset(); });
    auto.addEventListener("change", function () { auto.checked ? startAuto() : stopAuto(); });
    Array.prototype.forEach.call(seg.children, function (b) {
      b.addEventListener("click", function () { stopAuto(); setMode(b.dataset.mode); });
    });
  }

  if (reduce) {
    S.mode = "day"; S.period = 1; S.preUsed = 62; S.renUsed = 30;
    renderKey(false); renderBars();
    return;
  }
  doReset();
  later(startAuto, 900); // canlı giriş; ilk etkileşimde durur
}

  /* ==== g_resilience ==== */
// NOT: slide-reconcile => runReconcile onEnter'da ZATEN kayıtlı. Aşağıdaki runReconcile,
//      mevcut runReconcile fonksiyonunun YERİNE geçer (aynı ad korunur, geliştirilmiş sürüm).

// ---------------------------------------------------------------------------
// 19 · UZLAŞMA — kullanıcı etkileşimli çökme/kurtarma + idempotent taban
// ---------------------------------------------------------------------------
let rcCrashed = false, rcRunning = false;
function runReconcile() {
  const redis = document.getElementById("rcRedis");
  if (!redis) return;
  const rv = document.getElementById("rcRedisVal");
  const rs = document.getElementById("rcRedisSub");
  const pv = document.getElementById("rcPgVal");
  const flow = document.getElementById("rcFlow");
  const flowLbl = document.getElementById("rcFlowLbl");
  const arrow = document.getElementById("rcArrow");
  const status = document.getElementById("rcStatus");
  const phase = document.getElementById("rcPhase");
  const idem = document.getElementById("rcIdem");
  const workers = document.getElementById("rcWorkers");
  const floorVal = document.getElementById("rcFloorVal");
  const incrVal = document.getElementById("rcIncrVal");

  const setPhase = (t) => { if (phase) phase.textContent = "durum · " + t; };

  function normal() {
    rcCrashed = false; rcRunning = false;
    redis.className = "rc-box redis";
    rv.textContent = "30"; rs.textContent = "hızlı karar";
    pv.textContent = "30";
    flow.className = "rc-flow"; arrow.innerHTML = '<use href="#i-right"/>';
    flowLbl.textContent = "her 30 sn · checkpoint";
    status.className = "rc-status";
    status.innerHTML = "<b>Normal:</b> Redis karar veriyor, checkpoint her 30 sn tazeleniyor.";
    if (idem) idem.hidden = true;
    setPhase("normal");
  }

  function crash() {
    if (rcRunning) return;
    rcCrashed = true;
    redis.className = "rc-box redis dead";
    rv.textContent = "—"; rs.textContent = "veri kayboldu";
    flow.className = "rc-flow"; arrow.innerHTML = '<use href="#i-right"/>';
    status.className = "rc-status danger";
    status.innerHTML = "<b>Çökme:</b> Redis sayacı gitti. <b>Uzlaşmayı çalıştır</b>'a basın — checkpoint'ten kurtaralım.";
    if (idem) idem.hidden = true;
    setPhase("çökme");
  }

  function buildWorkers() {
    if (!workers) return [];
    workers.innerHTML = "";
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const w = document.createElement("div");
      w.className = "rc-worker";
      w.textContent = "#" + (i + 1) + " geri yükle";
      workers.appendChild(w);
      arr.push(w);
    }
    return arr;
  }

  function finishRestore() {
    redis.className = "rc-box redis restored";
    rv.textContent = "30"; rs.textContent = "checkpoint'ten kuruldu";
    flow.className = "rc-flow back"; arrow.innerHTML = '<use href="#i-left"/>';
    flowLbl.textContent = "geri yükle · taban = max(mevcut, 30)";
    status.className = "rc-status good";
    status.innerHTML = "<b>Kurtarıldı:</b> tüketim <b>30</b> — 0 değil. 6 eş zamanlı çağrıya rağmen taban <b>30</b>; INCRBY olsaydı <b style='color:var(--danger)'>180</b>. Müşteri bedava kota kazanmadı, tüketim şişmedi.";
    if (floorVal) floorVal.textContent = "30";
    if (incrVal) { incrVal.textContent = "180"; incrVal.classList.add("hot"); }
    rcCrashed = false; rcRunning = false;
    setPhase("kurtarıldı");
  }

  function reconcile() {
    if (rcRunning) return;
    if (!rcCrashed) {
      status.className = "rc-status info";
      status.innerHTML = "<b>Tutarlı:</b> checkpoint = Redis (30). Geri yüklenecek kayıp yok — uzlaşma güvenle tekrar çalıştırılabilir (idempotent).";
      setPhase("tutarlı");
      later(() => {
        if (!rcCrashed && !rcRunning) {
          status.className = "rc-status";
          status.innerHTML = "<b>Normal:</b> Redis karar veriyor, checkpoint her 30 sn tazeleniyor.";
          setPhase("normal");
        }
      }, reduce ? 0 : 2600);
      return;
    }
    rcRunning = true;
    setPhase("uzlaşma");
    if (idem) idem.hidden = false;
    const ws = buildWorkers();
    if (floorVal) floorVal.textContent = "30";
    if (incrVal) { incrVal.textContent = "0"; incrVal.classList.remove("hot"); }
    flow.className = "rc-flow back pulse"; arrow.innerHTML = '<use href="#i-left"/>';
    flowLbl.textContent = "geri yükle · taban = max(mevcut, 30)";
    redis.className = "rc-box redis";
    rv.textContent = "30"; rs.textContent = "taban yazılıyor…";
    status.className = "rc-status";
    status.innerHTML = "<b>Uzlaşma:</b> 6 eş zamanlı çağrı checkpoint tabanını yazıyor…";
    if (reduce) { ws.forEach((w) => w.classList.add("commit")); finishRestore(); return; }
    ws.forEach((w, i) => later(() => {
      w.classList.add("commit");
      if (rv) rv.textContent = "30";                              // atomik taban: sabit kalır
      const hypo = 30 * (i + 1);                                  // INCRBY olsaydı biriken değer
      if (incrVal) { incrVal.textContent = String(hypo); if (hypo > 30) incrVal.classList.add("hot"); }
    }, 500 + i * 420));
    later(finishRestore, 500 + 6 * 420 + 300);
  }

  const cB = document.getElementById("rcCrash");
  if (cB && !cB.dataset.wired) {
    cB.dataset.wired = "1";
    cB.addEventListener("click", crash);
    document.getElementById("rcReconcile").addEventListener("click", reconcile);
    document.getElementById("rcReset").addEventListener("click", normal);
  }

  normal();
  if (reduce) return;
  // ambiyans: normal durumda checkpoint akışını nabız gibi göster
  every(() => {
    if (!rcCrashed && !rcRunning) {
      flow.classList.add("pulse");
      later(() => { if (!rcCrashed && !rcRunning) flow.classList.remove("pulse"); }, 1000);
    }
  }, 3200);
}

// ---------------------------------------------------------------------------
// 20 · GÜVENLİK & İDEMPOTENCY — SET NX yarışı + IDOR/HMAC
// ---------------------------------------------------------------------------
const SEC_N = 50;
let secRunning = false;

function secBuildDots() {
  const g = document.getElementById("secDots");
  if (!g) return [];
  g.innerHTML = "";
  const arr = [];
  for (let i = 0; i < SEC_N; i++) {
    const d = document.createElement("div");
    d.className = "sec-dot";
    g.appendChild(d);
    arr.push(d);
  }
  return arr;
}

function secReset() {
  secRunning = false;
  secBuildDots();
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set("secOwn", "0"); set("secDup", "0"); set("secAmount", "+0 TL");
}

// n eş zamanlı istek, AYNI Idempotency-Key → tam 1 SET NX kazanır, gerisi yinelenen
function secScenario(n) {
  if (secRunning) return;
  secBuildDots();
  const g = document.getElementById("secDots");
  if (!g) return;
  const dots = Array.from(g.children);
  const ownEl = document.getElementById("secOwn");
  const dupEl = document.getElementById("secDup");
  const amtEl = document.getElementById("secAmount");
  if (ownEl) ownEl.textContent = "0";
  if (dupEl) dupEl.textContent = "0";
  if (amtEl) amtEl.textContent = "+0 TL";

  if (reduce) {
    dots[0].classList.add("own");
    for (let i = 1; i < n; i++) dots[i].classList.add("dup");
    if (ownEl) ownEl.textContent = "1";
    if (dupEl) dupEl.textContent = String(n - 1);
    if (amtEl) amtEl.textContent = "+20.000 TL";
    return;
  }

  secRunning = true;
  const step = n > 10 ? 22 : 170;
  // kazanan önce çözülür (SET NX döner)
  later(() => { dots[0].classList.add("own"); if (ownEl) ownEl.textContent = "1"; }, 260);
  let done = 0;
  const total = n - 1;
  for (let i = 1; i < n; i++) {
    later(() => {
      dots[i].classList.add("dup");
      done++;
      if (dupEl) dupEl.textContent = String(done);
      if (done === total) {
        if (amtEl) amtEl.textContent = "+20.000 TL"; // para tam BİR kez yazıldı
        secRunning = false;
      }
    }, 320 + i * step);
  }
  if (total === 0) { if (amtEl) amtEl.textContent = "+20.000 TL"; secRunning = false; }
}

function secIdor(attack) {
  const pay = document.getElementById("idorPayload");
  const sig = document.getElementById("idorSig");
  const verdict = document.getElementById("idorVerdict");
  if (!pay || !sig || !verdict) return;
  if (attack) {
    pay.innerHTML = '{ "customer": <span class="chg">"globex"</span>, "exp": 1790000000 }';
    sig.innerHTML = 'gönderilen a91f…7c2e&nbsp;&nbsp;≠&nbsp;&nbsp;hesaplanan <span class="chg">e07b…4d19</span>';
    verdict.className = "tk-verdict bad";
    verdict.textContent = "403 Forbidden · imza uyuşmuyor — değiştirilen ?customer parametresi yok sayılır";
  } else {
    pay.innerHTML = '{ "customer": "acme", "exp": 1790000000 }';
    sig.innerHTML = 'gönderilen a91f…7c2e&nbsp;&nbsp;=&nbsp;&nbsp;hesaplanan a91f…7c2e';
    verdict.className = "tk-verdict ok";
    verdict.textContent = "200 OK · imza doğru — token içindeki kimlik kullanılır";
  }
}

function runSecurity() {
  const burst = document.getElementById("secBurst");
  if (!burst) return;
  if (!burst.dataset.wired) {
    burst.dataset.wired = "1";
    burst.addEventListener("click", () => secScenario(50));
    document.getElementById("secDbl").addEventListener("click", () => secScenario(2));
    document.getElementById("secReset").addEventListener("click", secReset);
    document.getElementById("idorLegit").addEventListener("click", () => secIdor(false));
    document.getElementById("idorAttack").addEventListener("click", () => secIdor(true));
  }
  secReset();
  secIdor(false);
  if (!reduce) later(() => secScenario(50), 550); // girişte otomatik demo
}

  /* ==== h_closing ==== */
/* ============================================================================
   h_closing — EKRANLAR + GERÇEK TEST ÖZETİ
   runScreens · runTestRun (geliştirildi) · runTestsDetail · runWhyTech
   Yardımcılar (later/every/reduce) kapsamda; yeniden tanımlanmaz.
   ========================================================================== */

/* ton adı → [renk, yumuşak-arkaplan] CSS değişken çiftleri */
function hcToneVars(t) {
  const m = {
    info:   ["var(--info)",   "var(--info-s)"],
    accent: ["var(--accent)", "var(--accent-s)"],
    violet: ["var(--violet)", "var(--violet-s)"],
    good:   ["var(--good)",   "var(--good-s)"],
    warn:   ["var(--warn)",   "var(--warn-s)"],
    danger: ["var(--danger)", "var(--danger-s)"]
  };
  return m[t] || m.accent;
}

/* -------------------------------------------------- 1 · GÖREBİLECEĞİNİZ EKRANLAR */
const HC_SCR = {
  dash:   { ico: "i-chart",   tone: "info",   name: "Dashboard", k: "nabız & oran",
    desc: "Sistemin genel sağlığını ve en çok tüketen 10 özneyi tek bakışta gösterir. Kavram olarak <b>oran</b> ve <b>gözlem</b>i yönetir — hangi tenant ne kadar 429 alıyor.",
    ex: "izin/red oranı · p99 · top-10" },
  test:   { ico: "i-bolt",    tone: "accent", name: "Canlı Test", k: "hız limiti kararı",
    desc: "İstek üretip kararın canlı verilişini izlersiniz. <b>Burst</b>, <b>pencere</b> ve <b>token bucket / GCRA</b> kavramını gözle görürsünüz.",
    ex: "curl :8080 → 200 ×10, sonra 429" },
  cust:   { ico: "i-users",   tone: "violet", name: "Müşteriler", k: "kota / cüzdan",
    desc: "Her müşterinin cüzdan bakiyesini yönetirsiniz: <b>yükleme</b>, <b>overdraft</b>, <b>askıya alma</b>, <b>iade</b>. Kota ekseninin ana ekranı.",
    ex: "+1000 yükle · bakiye 900" },
  cat:    { ico: "i-catalog", tone: "violet", name: "Servis Kataloğu", k: "scope & maliyet",
    desc: "Her servis/endpoint'in <b>scope</b>'unu ve istek başına <b>maliyet</b>ini çalışma anında ayarlarsınız. Ağır bir endpoint 1 yerine 20 sayabilir.",
    ex: "export = 20 · feed = 1" },
  portal: { ico: "i-invoice", tone: "violet", name: "Müşteri Portalı", k: "429 ayrımı & kalan",
    desc: "Müşterinin kendi self-servis ekranı: kalan hak, geçmiş tüketim, faturalanan aşım. <b>Hız limiti mi kota mı</b> ayrımını yanıt başlığından okur.",
    ex: "X-Quota-Remaining · RateLimit" },
  rules:  { ico: "i-shield",  tone: "good",   name: "Kurallar / Operasyon", k: "kural + CDC yayılım",
    desc: "Kural oluşturma, <b>kill-switch</b> ve denetim kaydı. Buradaki değişiklik outbox → Debezium → Kafka ile gateway'e <b>~35 ms</b>'de yayılır.",
    ex: "UPDATE rule → gateway ~35 ms" },
  obs:    { ico: "i-search",  tone: "warn",   name: "Kibana · RedisInsight · Kafka UI", k: "analitik & metrik",
    desc: "Kibana yüksek-kardinaliteli olay sorgusu, RedisInsight canlı sayaçlar, Kafka UI konu akışı. <b>Analitik</b> kavramı burada yaşar.",
    ex: 'tenantId:"globex" AND decision:"DENY"' },
  graf:   { ico: "i-gauge",   tone: "info",   name: "Grafana", k: "operasyon nabzı",
    desc: "Düşük-kardinaliteli operasyon panoları: <b>p99</b>, <b>rps</b>, <b>5xx</b> ve alarm eşikleri. Prometheus verisini görselleştirir.",
    ex: "histogram_quantile(0.99, …)" }
};
function hcSelectScreen(card, initial) {
  const grid = document.getElementById("scrGrid");
  if (!grid || !card) return;
  grid.querySelectorAll(".scr-card").forEach((c) => c.classList.remove("sel"));
  card.classList.add("sel");
  const d = HC_SCR[card.dataset.scr];
  if (!d) return;
  const dock = document.getElementById("scrDock");
  const [tc, ts] = hcToneVars(d.tone);
  dock.style.setProperty("--tone", tc);
  dock.style.setProperty("--tone-s", ts);
  dock.classList.add("lit");
  document.getElementById("scrDico").innerHTML = '<svg><use href="#' + d.ico + '"/></svg>';
  document.getElementById("scrDname").innerHTML = d.name + ' <span class="scr-kbadge">kavram: ' + d.k + "</span>";
  document.getElementById("scrDdesc").innerHTML = d.desc;
  document.getElementById("scrDex").textContent = d.ex;
  if (!initial && !reduce) { dock.classList.remove("swap"); void dock.offsetWidth; dock.classList.add("swap"); }
}
function runScreens() {
  const grid = document.getElementById("scrGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".scr-card"));
  cards.forEach((c) => c.classList.remove("in"));
  if (reduce) cards.forEach((c) => c.classList.add("in"));
  else cards.forEach((c, i) => later(() => c.classList.add("in"), 120 + i * 90));
  if (!grid.dataset.wired) {
    grid.dataset.wired = "1";
    cards.forEach((c) => c.addEventListener("click", () => hcSelectScreen(c, false)));
  }
  hcSelectScreen(cards[0], true);
}

/* -------------------------------------------------- 2 · KONUŞMADAN ÖNCE — ÇALIŞTIRDIK */
let hcTrToken = 0;
function runTestRun() {
  const wrap = document.getElementById("testRun");
  if (!wrap) return;
  const rows = Array.from(wrap.querySelectorAll("[data-tr]"));
  const foot = document.getElementById("trFoot");
  const fill = document.getElementById("trFill");
  const prog = document.getElementById("trProg");
  const timer = document.getElementById("trTimer");
  const N = rows.length;

  function reset() {
    hcTrToken++;
    rows.forEach((r) => { r.classList.remove("on", "running"); r.classList.add("pending"); });
    if (foot) foot.classList.remove("on");
    if (fill) fill.style.width = "0%";
    if (prog) prog.innerHTML = "0 / " + N + " geçti";
    if (timer) timer.textContent = "hazır";
  }
  function finishAll() {
    rows.forEach((r) => { r.classList.remove("pending", "running"); r.classList.add("on"); });
    if (foot) foot.classList.add("on");
    if (fill) fill.style.width = "100%";
    if (prog) prog.innerHTML = N + " / " + N + " geçti";
    if (timer) timer.textContent = "0 hata ✓";
  }
  function run() {
    reset();
    const tok = hcTrToken;
    rows.forEach((r, i) => {
      const runDelay = 250 + i * 520;
      later(() => {
        if (tok !== hcTrToken) return;
        r.classList.remove("pending"); r.classList.add("running");
        if (prog) prog.innerHTML = '<span class="p-run">' + i + " / " + N + " · çalışıyor…</span>";
      }, runDelay);
      later(() => {
        if (tok !== hcTrToken) return;
        r.classList.remove("running"); r.classList.add("on");
        const done = i + 1;
        if (fill) fill.style.width = (done / N) * 100 + "%";
        if (prog) prog.innerHTML = done + " / " + N + " geçti";
        if (timer) timer.textContent = done * 90 + " ms";
      }, runDelay + 320);
    });
    later(() => {
      if (tok !== hcTrToken) return;
      if (foot) foot.classList.add("on");
      if (timer) timer.textContent = "0 hata ✓";
    }, 250 + N * 520 + 420);
  }

  if (!wrap.dataset.wired) {
    wrap.dataset.wired = "1";
    const rb = document.getElementById("trRun");
    const rp = document.getElementById("trReplay");
    if (rb) rb.addEventListener("click", run);
    if (rp) rp.addEventListener("click", run);
  }
  if (reduce) { finishAll(); return; }
  run(); // slayda girince otomatik oynat; butonlar tekrar tetikler
}

/* -------------------------------------------------- 3 · HER TESTİN ARKASINDAKİ MANTIK */

/* -------------------------------------------------- 4 · NEYİ NEDEN KULLANDIK */
const HC_WT = {
  redis: { ico: "i-db", tone: "danger", name: "Redis", role: "Karar",
    desc: "Her karar sıcak yolda tek <b>EVALSHA</b> ile ~19 µs'de verilir. Sayaç Redis'te yaşar; para değil <b>hız</b> tutar. Cüzdan bakiyesi için AOF açık.",
    code: '<span class="c">-- atomik karar (bölünmez)</span>\n<span class="k">EVALSHA</span> sha 1 <span class="v">rl:{t:acme}:q.wallet:202607</span>\n<span class="c">→ allow=true, remaining=39</span>',
    proof: "500 eş zamanlı → tam <b>250</b> · restart → bakiye <b>850→850</b>" },
  pg: { ico: "i-layers", tone: "good", name: "PostgreSQL", role: "Gerçek",
    desc: "Kuralların, cüzdanların ve <b>checkpoint</b>'lerin dayanıklı, ACID kaynağı. Redis kaybında sayaç buradan kurulur; faturanın hukuki kaydı burada.",
    code: '<span class="k">SELECT</span> balance <span class="k">FROM</span> quota_checkpoint\n<span class="k">WHERE</span> counter_key = <span class="v">\'q.wallet\'</span>;\n<span class="c">→ 30 (çökme sonrası taban)</span>',
    proof: "Redis silindi → checkpoint'ten <b>30</b> geri yüklendi (0 değil)" },
  kafka: { ico: "i-stream", tone: "violet", name: "Kafka + Debezium", role: "Yayılım",
    desc: "Kural değişikliği <b>outbox</b>'a aynı transaction'da yazılır; Debezium WAL'den okuyup Kafka'ya taşır; gateway belleğe alır. İkili-yazım tutarsızlığı olmaz.",
    code: '<span class="c">-- outbox → Debezium → Kafka</span>\ntopic: <span class="v">rules.v1</span>  (compacted)\n<span class="c">Admin UPDATE → gateway: ~35 ms</span>',
    proof: "Admin'de kural değişti → gateway'e <b>~35 ms</b>'de yayıldı" },
  es: { ico: "i-search", tone: "warn", name: "Elasticsearch", role: "Analitik",
    desc: "Yüksek kardinaliteli her kararı (tenant, endpoint, karar) indeksler. \"Kim, ne zaman, neden kesildi\" sorusunu Prometheus'un taşıyamayacağı ayrıntıda yanıtlar.",
    code: '<span class="k">GET</span> usage/_search\n{ <span class="k">"query"</span>: <span class="v">tenantId:"globex" AND decision:"DENY"</span> }',
    proof: "5.000 tenant × 1.200 endpoint kırılımı — Prometheus'ta imkânsız" },
  prom: { ico: "i-gauge", tone: "info", name: "Prometheus + Grafana", role: "Nabız",
    desc: "Düşük kardinaliteli operasyon nabzı: p99, rps, 5xx. Ucuz, sürekli sağlık izleme ve alarm. <b>Tenant etiketi taşımaz</b> (ADR-011) — seri patlaması olmaz.",
    code: '<span class="k">histogram_quantile</span>(0.99,\n  rate(gateway_decision_seconds_bucket[5m]))\n<span class="c">→ 7,1 ms  (p99)</span>',
    proof: "GC darboğazı burada görüldü: <b>231ms → 14ms</b>, 5xx → 0" },
  gw: { ico: "i-shield", tone: "accent", name: "Spring Cloud Gateway", role: "Uygulayıcı",
    desc: "Reaktif, tek karar noktası. Kuralları bellekte tutar, her istekte DB'ye gitmez; kimlik doğrulamadan sonra ama yönlendirmeden önce çalışır. Retry yok — timeout'ta fallback.",
    code: '<span class="c">// auth sonrası, route öncesi filtre</span>\nctx → rule match (bellek) → <span class="k">Redis</span>\n→ 200 | 429 / 503 / 403',
    proof: "1081 rps sürdürüldü · ek gecikme p99 <b>7,1 ms</b> · 5xx <b>0</b>" }
};
function hcSelectWhy(key, initial) {
  const list = document.getElementById("wtList");
  if (!list) return;
  list.querySelectorAll(".wt-row").forEach((r) => r.classList.toggle("sel", r.dataset.wt === key));
  const d = HC_WT[key];
  if (!d) return;
  const dock = document.getElementById("wtDock");
  const [tc, ts] = hcToneVars(d.tone);
  dock.style.setProperty("--tone", tc);
  dock.style.setProperty("--tone-s", ts);
  document.getElementById("wtdIco").innerHTML = '<svg><use href="#' + d.ico + '"/></svg>';
  document.getElementById("wtdName").textContent = d.name;
  document.getElementById("wtdRole").textContent = d.role;
  document.getElementById("wtdDesc").innerHTML = d.desc;
  document.getElementById("wtdCode").innerHTML = d.code;
  document.getElementById("wtdProofTxt").innerHTML = d.proof;
  if (!initial && !reduce) { dock.classList.remove("swap"); void dock.offsetWidth; dock.classList.add("swap"); }
}

  /* ==== i_scenarios ==== */
// ------------------------------------------- uygulamalı: kota senaryoları (çoklu senaryo)
// Her senaryo aynı adım-yürütücü şemasını kullanır:
//   { title, granted, consumed, bal, ev, tone:'ok'|'warn'|'bad', why, log?:{ic,tone,txt} }
const SCENARIOS = {
  overdraft: {
    label: "Eksiye düşme (overdraft)",
    desc: "Bakiye pozitifken <b>bir kez</b> aşıma izin verilir; sonra 429. %80 eşik bildirimi, askıya alma ve başarısız çağrı iadesi de aynı akışta.",
    steps: [
      { title: "1 · Yeni müşteri — kota yüklenmemiş", granted: 0, consumed: 0, bal: 0,
        ev: "5 istek → 429 ×5", tone: "bad",
        why: "Cüzdan kuralı <b>limit=0</b> ile açılır — güvenli varsayılan. Kural hiç oluşturulmasaydı müşteri <b>limitsiz</b> erişirdi.",
        log: { ic: "i-x", tone: "bad", txt: "Erişim yok — kota 0" } },
      { title: "2 · 1.000 birim yüklendi", granted: 1000, consumed: 0, bal: 1000,
        ev: "5 istek → 200 ×5", tone: "ok",
        why: "Yükleme cüzdan kuralının <b>limitValue</b>'sunu artırır; değişiklik PostgreSQL→outbox→Debezium→Kafka→gateway zincirinden <b>~35 ms</b>'de yayılır.",
        log: { ic: "i-check", tone: "ok", txt: "+1.000 yüklendi · erişim açıldı" } },
      { title: "3 · 800 birim tüketildi (%80)", granted: 1000, consumed: 800, bal: 200,
        ev: "doluluk %80", tone: "warn",
        why: "Eşikler müşteri bazında ayarlanır (<span class='chip-mono'>notifyThresholds</span>, varsayılan [80,100]). Aynı eşik için <b>tek</b> bildirim gider; <span class='chip-mono'>last_threshold</span> hafızası tekrarı önler.",
        log: { ic: "i-bell", tone: "warn", txt: "QUOTA_THRESHOLD · %80 bildirimi gönderildi" } },
      { title: "4 · 100 birim daha tüketildi", granted: 1000, consumed: 900, bal: 100,
        ev: "bakiye 100", tone: "warn",
        why: "Her başarılı çağrı kotadan düşer. Bakiye hâlâ pozitif — istekler geçmeye devam eder." },
      { title: "5 · 200 birimlik istek geldi (bakiye 100)", granted: 1000, consumed: 1100, bal: -100,
        ev: "200 OK — GEÇER (aşım!)", tone: "ok",
        why: "Bakiye pozitifti; istek <b>tamamlanır</b> ve müşteriyi eksiye düşürür. <span class='chip-mono'>X-Quota-Remaining: -100</span>, <span class='chip-mono'>Overdraft: true</span>. Neden? İsteği ortada kesmek <b>yarım iş</b> üretir; aşım faturalanabilir, yarım iş faturalanamaz.",
        log: { ic: "i-wallet", tone: "warn", txt: "Aşım · bakiye -100 (yalnızca bir kez izin verilir)" } },
      { title: "6 · Sonraki istek (bakiye -100)", granted: 1000, consumed: 1100, bal: -100,
        ev: "429 — bakiye ≤ 0", tone: "bad",
        why: "Artık eksideyiz; her <b>yeni</b> istek kesilir. Aşım yalnızca <b>bir kez</b>, bakiye pozitifken verilir.",
        log: { ic: "i-x", tone: "bad", txt: "429 · eksi bakiyede erişim durdu" } },
      { title: "7 · 1.000 birim daha yüklendi", granted: 2000, consumed: 1100, bal: 900,
        ev: "erişim açıldı · bakiye 900", tone: "ok",
        why: "Yükleme erişimi açar ama <b>geçmiş tüketim silinmez</b> (tüketilen 1.100 kalır). Bakiye = 2.000 − 1.100 = <b>900</b>.",
        log: { ic: "i-check", tone: "ok", txt: "+1.000 yüklendi · bakiye 900" } },
      { title: "8 · Müşteri askıya alındı", granted: 2000, consumed: 1100, bal: 900,
        ev: "403 — Forbidden", tone: "bad",
        why: "Askıya alma <b>idari</b> karardır. 429 değil ('sen çok istek attın' değil), 503 değil ('sistem bozuk' değil). Kotası dolu olsa bile erişemez.",
        log: { ic: "i-pause", tone: "bad", txt: "SUSPENDED · 403 (idari karar)" } },
      { title: "9 · Devam + başarısız çağrı iadesi", granted: 2000, consumed: 1100, bal: 900,
        ev: "50 düş → iade → net 0", tone: "ok",
        why: "Karar anında <b>düş, sonra gerekirse iade et</b>: kesme kararı atomik olmalı (yarış koşulu olmasın). Downstream hata dönerse tüketilen birim geri verilir — sistemin hatası müşteriye faturalanmaz. İade yalnızca <b>kota</b>'da yapılır.",
        log: { ic: "i-repeat", tone: "ok", txt: "REFUND · 50 iade edildi · bakiye 900" } },
    ],
  },

  weekly: {
    label: "Haftalık yenilenme",
    desc: "Kota <b>dönem-dilimli anahtar</b> ile tutulur (2026W30). Hafta dönünce (Pazartesi 00:00) anahtar 2026W31'e döner ve sayaç <b>kendiliğinden 0</b>'a iner — cron/TTL değil, anahtarın kendisi.",
    steps: [
      { title: "1 · Haftalık kota tanımlı — 2.000 / hafta", granted: 2000, consumed: 0, bal: 2000,
        ev: "dönem 2026W30 · aktif", tone: "ok",
        why: "Kota <b>dönem-dilimli anahtar</b> ile tutulur: <span class='chip-mono'>quota:{müşteri}:2026W30</span>. Her yeni hafta = yeni anahtar → sayaç sıfırdan başlar.",
        log: { ic: "i-key", tone: "ok", txt: "Dönem 2026W30 açıldı · 2.000 birim" } },
      { title: "2 · Hafta içi 1.600 tüketildi (%80)", granted: 2000, consumed: 1600, bal: 400,
        ev: "doluluk %80", tone: "warn",
        why: "Tüketim yalnızca <b>bu haftanın</b> anahtarındaki sayacı artırır. %80 eşiği aşıldı → tek bildirim gider.",
        log: { ic: "i-bell", tone: "warn", txt: "QUOTA_THRESHOLD · %80 · 2026W30" } },
      { title: "3 · 380 birim daha — bakiye 20", granted: 2000, consumed: 1980, bal: 20,
        ev: "bakiye 20 · kritik", tone: "warn",
        why: "Hafta bitmeden kota tükenmek üzere. Yenilenme <b>Pazartesi 00:00</b>'ı bekler — hız limiti gibi kendiliğinden erken dolmaz." },
      { title: "4 · Kalan tüketildi — bakiye 0", granted: 2000, consumed: 2000, bal: 0,
        ev: "429 — dönem kotası doldu", tone: "bad",
        why: "Bu haftanın kotası doldu; yeni istekler <b>429</b>. Kota bir <b>takvim dönümü</b> bekler; token bucket gibi zamanla damlamaz.",
        log: { ic: "i-x", tone: "bad", txt: "429 · 2026W30 kotası bitti" } },
      { title: "5 · Pazartesi 00:00 — hafta döndü", granted: 2000, consumed: 0, bal: 2000,
        ev: "2026W30 → 2026W31 · oto-sıfır", tone: "ok",
        why: "Yeni hafta → yeni anahtar <span class='chip-mono'>…:2026W31</span>. Eski sayaç silinmez, artık <b>okunmaz</b>; tüketim etkin olarak <b>0</b>. Sıfırlayan bir cron yok — <b>anahtarın kendisi</b> döner.",
        log: { ic: "i-repeat", tone: "ok", txt: "Dönem 2026W31 · sayaç 0" } },
      { title: "6 · Yeni haftada ilk istekler geçer", granted: 2000, consumed: 5, bal: 1995,
        ev: "200 OK · taze kota", tone: "ok",
        why: "Yeni dönemde bakiye tam. Geçen haftanın tüketimi bu haftayı <b>etkilemez</b> — dönemler bağımsızdır (günlük/haftalık/aylık aynı desen).",
        log: { ic: "i-check", tone: "ok", txt: "200 · yeni dönemde erişim açık" } },
    ],
  },

  multi: {
    label: "Çoklu servis maliyeti",
    desc: "Aynı cüzdanı farklı servisler paylaşır ve farklı <b>birim maliyet</b> düşer: <span class='chip-mono'>feed</span> = 1, <span class='chip-mono'>export</span> = 20 birim/çağrı. Ağır çağrı kotayı hızlı eritir; %80 eşiği tetiklenir.",
    steps: [
      { title: "1 · 1.000 birim kota · iki servis", granted: 1000, consumed: 0, bal: 1000,
        ev: "feed=1 · export=20 birim/çağrı", tone: "ok",
        why: "Tek cüzdan, farklı maliyetler: her servisin birim değeri <b>servis kataloğunda</b> tanımlı ve çalışma zamanında değişebilir. <span class='chip-mono'>feed</span> çağrısı 1, <span class='chip-mono'>export</span> çağrısı 20 birim düşer.",
        log: { ic: "i-catalog", tone: "ok", txt: "Cüzdan 1.000 · katalog yüklendi" } },
      { title: "2 · 300 feed çağrısı (×1)", granted: 1000, consumed: 300, bal: 700,
        ev: "300 × feed = 300 birim", tone: "ok",
        why: "Hafif çağrılar kotayı yavaş eritir: 300 feed = 300 birim, bakiye 700. Sayı çok ama maliyet düşük.",
        log: { ic: "i-stream", tone: "ok", txt: "300 feed · −300 birim" } },
      { title: "3 · 20 export çağrısı (×20)", granted: 1000, consumed: 700, bal: 300,
        ev: "20 × export = 400 birim", tone: "warn",
        why: "Ağır çağrı kotayı <b>hızlı</b> eritir: yalnızca 20 export = 400 birim. Sayı az, maliyet yüksek — kota adet değil, <b>iş</b> ölçer.",
        log: { ic: "i-bolt", tone: "warn", txt: "20 export · −400 birim (ağır)" } },
      { title: "4 · 5 export daha — %80 eşiği", granted: 1000, consumed: 800, bal: 200,
        ev: "doluluk %80", tone: "warn",
        why: "5 export daha = 100 birim → tüketim 800, doluluk %80. Eşik servisten bağımsız, <b>toplam</b> doluluğa bakar; tek bildirim gider.",
        log: { ic: "i-bell", tone: "warn", txt: "QUOTA_THRESHOLD · %80" } },
      { title: "5 · 10 export isteği (bakiye 200)", granted: 1000, consumed: 1000, bal: 0,
        ev: "10 × export = 200 · bakiye 0", tone: "warn",
        why: "Karar <b>istenen birim</b> üzerinden verilir: 200 birim istendi, bakiye tam 200 → geçer, bakiye 0. Kısmi düşme yok — çağrı ya tam geçer ya reddedilir.",
        log: { ic: "i-wallet", tone: "warn", txt: "10 export · −200 · bakiye 0" } },
      { title: "6 · Yeni export çağrısı (bakiye 0)", granted: 1000, consumed: 1000, bal: 0,
        ev: "429 — 20 birim yetmiyor", tone: "bad",
        why: "Export 20 birim ister ama bakiye 0 → <b>reddedilir</b>. İlginç: hafif feed çağrısı 1 birim ister, o da reddedilir. Kota servis değil <b>birim</b> ayırır; bakiye bittiğinde ikisi de durur.",
        log: { ic: "i-x", tone: "bad", txt: "429 · export için kota yetersiz" } },
    ],
  },

  idem: {
    label: "İdempotent yükleme",
    desc: "Aynı <span class='chip-mono'>Idempotency-Key</span> ile çift tıklanan yükleme yalnız <b>bir kez</b> uygulanır — kota iki kez dolmaz. Para/yükleme işlemlerinde retry böyle güvenli olur.",
    steps: [
      { title: "1 · Başlangıç — bakiye 500", granted: 500, consumed: 0, bal: 500,
        ev: "cüzdan hazır", tone: "ok",
        why: "Cüzdanda 500 birim var. Şimdi <b>+1.000</b> birimlik bir yükleme göndereceğiz — ama ağ takıldı ve kullanıcı butona <b>iki kez</b> tıkladı.",
        log: { ic: "i-wallet", tone: "ok", txt: "Başlangıç bakiyesi 500" } },
      { title: "2 · Yükleme #1 · Idempotency-Key: ab12", granted: 1500, consumed: 0, bal: 1500,
        ev: "+1.000 · anahtar ab12 işlendi", tone: "ok",
        why: "İlk istek işlenir: bakiye 500 → <b>1.500</b>. <span class='chip-mono'>Idempotency-Key: ab12</span> sonucuyla birlikte kaydedilir.",
        log: { ic: "i-check", tone: "ok", txt: "TOPUP · +1.000 · anahtar ab12 kaydedildi" } },
      { title: "3 · Çift tıklama · AYNI anahtar ab12", granted: 1500, consumed: 0, bal: 1500,
        ev: "200 OK — ama tekrar UYGULANMADI", tone: "warn",
        why: "Aynı <span class='chip-mono'>ab12</span> ile ikinci istek gelir. Sunucu anahtarı tanır, ilk sonucu <b>geri döndürür</b> — bakiye <b>1.500'de kalır</b>. Yükleme iki kez işlenmez.",
        log: { ic: "i-repeat", tone: "warn", txt: "IDEMPOTENT_HIT · ab12 · yeniden uygulanmadı" } },
      { title: "4 · Neden önemli?", granted: 1500, consumed: 0, bal: 1500,
        ev: "çift ödeme / çift yükleme yok", tone: "ok",
        why: "Anahtar olmasa iki tık = <b>3.000</b> birim (yanlış). Anahtarla = <b>1.500</b> (doğru). Para işlemlerinde şarttır: aynı niyet, kaç kez tekrar denenirse denensin bir kez uygulanır.",
        log: { ic: "i-shield", tone: "ok", txt: "Çift yükleme engellendi · veri tutarlı" } },
      { title: "5 · Gerçekten yeni yükleme · Key: cd34", granted: 2500, consumed: 0, bal: 2500,
        ev: "+1.000 · FARKLI anahtar", tone: "ok",
        why: "<b>Farklı</b> anahtar = <b>farklı</b> işlem; bu gerçek bir yeni yükleme. Bakiye 1.500 → 2.500. Anahtar isteği değil <b>niyeti</b> ayırt eder.",
        log: { ic: "i-check", tone: "ok", txt: "TOPUP · +1.000 · anahtar cd34" } },
    ],
  },

  refund: {
    label: "Başarısız çağrı iadesi",
    desc: "Karar anında <b>önce düş</b> (atomik), iş başarısız olursa <b>iade et</b> → net değişim 0. Sistemin hatası müşteriye faturalanmaz; iade yalnızca kotada yapılır.",
    steps: [
      { title: "1 · Bakiye 300 · ağır iş çağrısı", granted: 1000, consumed: 700, bal: 300,
        ev: "50 birimlik çağrı başlıyor", tone: "ok",
        why: "Cüzdanda 300 birim kaldı (1.000'den 700 tüketildi). 50 birimlik bir işlem başlatılıyor.",
        log: { ic: "i-wallet", tone: "ok", txt: "Bakiye 300 · çağrı hazırlanıyor" } },
      { title: "2 · Önce DÜŞ (atomik)", granted: 1000, consumed: 750, bal: 250,
        ev: "−50 · karar anında düşüldü", tone: "warn",
        why: "Karar atomik olmalı: Redis'te Lua ile <b>önce düşülür</b> (bakiye 250). Kontrol + düşme tek adımdır ki yarış koşulu olmasın. İş henüz yapılmadı.",
        log: { ic: "i-bolt", tone: "warn", txt: "DEBIT · −50 · atomik rezervasyon" } },
      { title: "3 · Downstream 500 döndü — iş başarısız", granted: 1000, consumed: 750, bal: 250,
        ev: "upstream hatası", tone: "bad",
        why: "Asıl iş (downstream servis) <b>hata</b> döndü. Müşteri çıktı alamadı — ama 50 birim şu an düşülü duruyor. Sistemin hatası müşteriye faturalanamaz.",
        log: { ic: "i-warn", tone: "bad", txt: "UPSTREAM_ERROR · 500 · iş yapılamadı" } },
      { title: "4 · İADE — 50 geri verildi", granted: 1000, consumed: 700, bal: 300,
        ev: "+50 iade · net 0", tone: "ok",
        why: "Düşülen 50 birim <b>geri iade edilir</b>: bakiye tekrar 300, net etki <b>0</b>. İade yalnızca <b>kota</b>'da yapılır — hız limitinde iade yoktur (o sistemi korur, faturalanmaz).",
        log: { ic: "i-repeat", tone: "ok", txt: "REFUND · +50 · net değişim 0" } },
      { title: "5 · Tekrar dene — bu kez başarılı", granted: 1000, consumed: 750, bal: 250,
        ev: "50 düş · 200 OK", tone: "ok",
        why: "Retry güvenli: yeni denemede 50 düşer, iş başarılı olur, iade yok. Bakiye 250'de <b>doğru</b> kalır. 'Düş → gerekirse iade' deseni parayı hep tutarlı tutar.",
        log: { ic: "i-check", tone: "ok", txt: "200 OK · 50 tüketildi · kalıcı" } },
    ],
  },
};

let qScenario = "overdraft";
let curSteps = SCENARIOS[qScenario].steps;
let qIdx = 0;

function qApply(step) {
  const fill = document.getElementById("qFill");
  const g = step.granted, c = step.consumed, b = step.bal;
  const pct = g > 0 ? Math.min(100, (c / g) * 100) : 0;
  if (fill) {
    fill.style.width = (b < 0 ? 100 : pct) + "%";
    fill.className = "q-wfill" + (b < 0 ? " over" : (pct >= 80 ? " warn" : ""));
  }
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set("qTitle", step.title);
  const bal = document.getElementById("qBal");
  if (bal) { bal.textContent = "bakiye " + b.toLocaleString("tr-TR"); bal.className = "q-wbal" + (b < 0 ? " neg" : (b === 0 ? " zero" : "")); }
  set("qGranted", "yüklenen " + g.toLocaleString("tr-TR"));
  set("qConsumed", "tüketilen " + c.toLocaleString("tr-TR"));
  const ev = document.getElementById("qEvent");
  const evt = document.getElementById("qEventTxt");
  if (evt) evt.innerHTML = step.ev;
  if (ev) ev.className = "q-event " + step.tone;
  const why = document.getElementById("qWhy");
  if (why) why.innerHTML = "<b>Neden:</b> " + step.why;
  // Sol panel: adım detaylarını adım adım BİRİKTİR (menü gibi büyür).
  const steps = document.getElementById("qSteps");
  if (steps) {
    const empty = steps.querySelector(".q-steps-empty");
    if (empty) empty.remove();
    const prevActive = steps.querySelector(".q-step.active");
    if (prevActive) prevActive.classList.remove("active");
    const row = document.createElement("div");
    row.className = "q-step active " + step.tone;
    var balTxt = "bakiye " + b.toLocaleString("tr-TR");
    row.innerHTML =
      '<span class="q-step-dot"></span>' +
      '<div class="q-step-body">' +
        '<div class="q-step-top"><span class="q-step-t">' + step.title + '</span>' +
        '<span class="q-step-bal">' + balTxt + '</span></div>' +
        '<div class="q-step-ev">' + step.ev + '</div>' +
      '</div>';
    steps.appendChild(row);
    steps.scrollTop = steps.scrollHeight;
  }
  if (step.log) {
    const log = document.getElementById("qLog");
    if (log) {
      const row = document.createElement("div");
      row.className = "q-logrow " + step.log.tone;
      row.innerHTML = '<svg><use href="#' + step.log.ic + '"/></svg><span>' + step.log.txt + "</span>";
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }
  }
  const prog = document.getElementById("qProgress");
  if (prog) prog.textContent = qIdx + " / " + curSteps.length;
}
function qNext() {
  if (qIdx >= curSteps.length) return;
  qApply(curSteps[qIdx]);
  qIdx++;
  const prog = document.getElementById("qProgress");
  if (prog) prog.textContent = qIdx + " / " + curSteps.length;
  if (qIdx >= curSteps.length) {
    const btn = document.getElementById("qNext");
    if (btn) { btn.disabled = true; btn.classList.add("done"); }
  }
}
function qReset() {
  qIdx = 0;
  const log = document.getElementById("qLog");
  if (log) log.innerHTML = "";
  const steps = document.getElementById("qSteps");
  if (steps) steps.innerHTML = '<div class="q-steps-empty">İlerledikçe adımlar burada birikecek.</div>';
  const btn = document.getElementById("qNext");
  if (btn) { btn.disabled = false; btn.classList.remove("done"); }
  const fill = document.getElementById("qFill");
  if (fill) { fill.style.width = "0%"; fill.className = "q-wfill"; }
  const set = (id, v, cls) => { const e = document.getElementById(id); if (e) { e.textContent = v; if (cls !== undefined) e.className = cls; } };
  set("qTitle", 'Başlamak için "Sonraki adım"a basın');
  set("qBal", "—", "q-wbal");
  set("qGranted", "yüklenen 0");
  set("qConsumed", "tüketilen 0");
  const evt = document.getElementById("qEventTxt"); if (evt) evt.textContent = "hazır";
  const ev = document.getElementById("qEvent"); if (ev) ev.className = "q-event";
  const why = document.getElementById("qWhy");
  if (why) why.innerHTML = "Her adımda burada <b>neden</b> öyle davrandığını göreceksiniz.";
  const prog = document.getElementById("qProgress"); if (prog) prog.textContent = "0 / " + curSteps.length;
}
function qSelect(key) {
  if (!SCENARIOS[key]) return;
  qScenario = key;
  curSteps = SCENARIOS[key].steps;
  document.querySelectorAll("#slide-quotalab .qs-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.scenario === key);
  });
  const desc = document.getElementById("qsDesc");
  if (desc) {
    desc.innerHTML = SCENARIOS[key].desc;
    if (!reduce) { desc.style.animation = "none"; void desc.offsetWidth; desc.style.animation = ""; }
  }
  qReset();
}
function runQuotaLab() {
  const nextBtn = document.getElementById("qNext");
  if (!nextBtn) return;
  if (!nextBtn.dataset.wired) {
    nextBtn.dataset.wired = "1";
    nextBtn.addEventListener("click", qNext);
    document.getElementById("qReset").addEventListener("click", qReset);
    document.querySelectorAll("#slide-quotalab .qs-chip").forEach((chip) => {
      if (chip.dataset.wired) return;
      chip.dataset.wired = "1";
      chip.addEventListener("click", () => qSelect(chip.dataset.scenario));
    });
  }
  qSelect(qScenario);
}

  /* ==== kafka_deep ==== */
/* --------------------------------------------------------------- slide-kafka
   Kafka olay omurgası: producer'lar → topic partition'ları → consumer group'lar.
   Anlatı döngüsü (loop):
     1) CDC: Admin → rules.v1 (compact, son değer) → tüm gateway'ler (~35 ms)
     2) usage: Gateway A, key=acme → hep P2  · fan-out → ES + Eşik izleyici
     3) usage: Gateway B, key=globex → P5    · fan-out → ES + Eşik izleyici
     4) usage: key=acme yine → P2 (aynı anahtar → aynı partition, sıra korunur)
     5) eşik: Admin → quota-events.v1 (%80) → Downstream (bildirim/otomasyon)
   later/every/reduce KAPSAMDA; yeniden tanımlanmaz. Paketler stage'e göre uçar.
   ------------------------------------------------------------------------- */
function runKafka() {
  const stage = document.getElementById("kfStage");
  if (!stage) return;

  const q = (sel) => stage.querySelector(sel);
  const prod = (k) => q('[data-prod="' + k + '"]');
  const cons = (k) => q('[data-cons="' + k + '"]');
  const cell = (k) => q('[data-cell="' + k + '"]');
  const badge = document.getElementById("kfBadge");
  const rulesVal = document.getElementById("kfRulesVal");
  const qVal = document.getElementById("kfQVal");
  const order = document.getElementById("kfOrder");

  const offs = {}; // partition offset sayaçları döngüler arası birikir
  const bumpOff = (c) => {
    const o = c.querySelector(".kf-off"); if (!o) return;
    const key = c.getAttribute("data-cell");
    offs[key] = (offs[key] || 0) + 1;
    o.textContent = "off " + offs[key];
  };
  const heapDot = (c) => {
    const h = c.querySelector(".kf-heap"); if (!h) return;
    const i = document.createElement("i"); h.appendChild(i);
    while (h.children.length > 4) h.removeChild(h.firstChild);
  };
  const reset = () => {
    stage.querySelectorAll(".kf-node, .kf-cell").forEach((e) => e.classList.remove("lit", "hot"));
    if (badge) badge.classList.remove("on");
    if (order) order.classList.remove("on");
    stage.querySelectorAll(".kf-pkt").forEach((p) => p.remove());
  };

  const center = (el) => {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  };
  // bir paketi sıralı düğümler boyunca uçur
  const fly = (seq, cls, dur, cb) => {
    seq = seq.filter(Boolean);
    if (seq.length < 2) { cb && cb(); return; }
    const p = document.createElement("div");
    p.className = "kf-pkt " + (cls || "");
    const c0 = center(seq[0]);
    p.style.left = c0.x + "px"; p.style.top = c0.y + "px";
    stage.appendChild(p);
    void p.offsetWidth;
    p.style.transition = "left " + dur + "ms var(--ease), top " + dur + "ms var(--ease)";
    let i = 1;
    const step = () => {
      if (i >= seq.length) { later(() => { p.remove(); cb && cb(); }, 150); return; }
      const c = center(seq[i]); p.style.left = c.x + "px"; p.style.top = c.y + "px"; i++;
      later(step, dur);
    };
    later(step, 30);
  };
  const lit = (el, on) => { if (el) el.classList.toggle("lit", on !== false); };

  // reduced-motion: hareketsiz son durum
  if (reduce) {
    ["a", "b", "admin"].forEach((k) => lit(prod(k)));
    ["gw", "es", "mon", "down"].forEach((k) => lit(cons(k)));
    ["u0", "u1", "u2", "u3", "u4", "u5"].forEach((k) => { const c = cell(k); lit(c); bumpOff(c); heapDot(c); });
    lit(cell("rules")); lit(cell("ovr")); lit(cell("q"));
    if (badge) badge.classList.add("on");
    if (rulesVal) rulesVal.textContent = "rule#42 · 30/dk";
    if (qVal) qVal.textContent = "acme · %80 aşıldı";
    if (order) order.classList.add("on");
    return;
  }

  const usageBeat = (pk, key, cellKey, showOrder) => {
    const c = cell(cellKey);
    lit(prod(pk));
    fly([prod(pk), c], "u", 640, () => {
      lit(c); bumpOff(c); heapDot(c);
      if (showOrder && order) order.classList.add("on");
      fly([c, cons("es")], "u", 560, () => lit(cons("es")));
      fly([c, cons("mon")], "u", 620, () => lit(cons("mon")));
      later(() => { lit(prod(pk), false); lit(c, false); }, 900);
    });
  };

  const play = () => {
    reset();

    // 1) CDC — compact rules broadcast
    later(() => {
      lit(prod("admin"));
      if (rulesVal) rulesVal.textContent = "rule#42 · 45/dk";
      fly([prod("admin"), cell("rules")], "r", 640, () => {
        lit(cell("rules"));
        fly([cell("rules"), cons("gw")], "r", 640, () => {
          lit(cons("gw"));
          if (badge) badge.classList.add("on");
          later(() => { lit(prod("admin"), false); lit(cell("rules"), false); lit(cons("gw"), false); }, 950);
        });
      });
    }, 250);

    // 2) usage — Gateway A, acme → P2
    later(() => usageBeat("a", "acme", "u2", false), 2100);
    // 3) usage — Gateway B, globex → P5
    later(() => usageBeat("b", "globex", "u5", false), 3700);
    // 4) usage — acme yine → P2 (aynı anahtar → aynı partition)
    later(() => usageBeat("a", "acme", "u2", true), 5300);

    // 5) eşik olayı → quota-events.v1 → downstream
    later(() => {
      lit(cons("mon"));
      lit(prod("admin"));
      const qc = cell("q");
      if (qc) qc.classList.add("hot");
      if (qVal) qVal.textContent = "acme · %80 aşıldı";
      fly([prod("admin"), qc], "q", 660, () => {
        lit(qc);
        fly([qc, cons("down")], "q", 640, () => {
          lit(cons("down"));
          later(() => {
            lit(cons("mon"), false); lit(prod("admin"), false);
            lit(qc, false); if (qc) qc.classList.remove("hot");
            lit(cons("down"), false);
            if (qVal) qVal.textContent = "— bekliyor —";
          }, 1100);
        });
      });
    }, 7000);
  };

  play();
  every(play, 9200);
}

  /* ==== es_deep ==== */
/* ---------------------------------------------------------------- 15b · ELASTICSEARCH + KIBANA
   ratelimit.usage.v1'den akan kullanım olayları:
   - Sol: örnek olaylar stream'e düşer, _bulk tamponu dolar, flush olunca belge sayacı sıçrar.
   - Sağ (Kibana): 429'lar histogramı ve "en çok reddedilen endpoint" terms-agg'ı canlı büyür,
     globex 429 sorgu sonucu birikir.
   later/every/reduce KAPSAMDA — yeniden tanımlanmaz, sadece çağrılır. */
function runEs() {
  var stream = document.getElementById("esStream");
  if (!stream) return;

  var bufFill = document.getElementById("esBufFill");
  var bufCnt = document.getElementById("esBufCnt");
  var bulk = document.getElementById("esBulk");
  var docEl = document.getElementById("esDocCount");
  var rpsEl = document.getElementById("esRps");
  var hist = document.getElementById("esHist");
  var agg = document.getElementById("esAgg");
  var qresN = document.getElementById("esQresN");

  var BATCH = 500;                       // _bulk penceresi
  var hbars = hist ? hist.querySelectorAll(".es-hbar") : [];
  var arows = agg ? agg.querySelectorAll(".es-arow") : [];

  var tenants = ["globex", "initech", "acme", "umbrella", "wayne", "stark"];
  var endpoints = ["/v1/pay", "/v1/export", "/v1/search", "/v1/upload", "/v1/users"];

  // durum
  var buffer, docCount, deny, hbuck, globex429, ticks;

  function reset() {
    buffer = 0; docCount = 1284096; globex429 = 0; ticks = 0;
    deny = {}; endpoints.forEach(function (e) { deny[e] = 0; });
    hbuck = [3, 5, 4, 7, 6, 9, 8, 11, 9, 12, 10, 14, 11, 6];
    stream.innerHTML = "";
    renderDoc(); renderHist(); renderAgg(); renderQres();
  }

  var fmt = function (n) { return n.toLocaleString("tr-TR"); };
  function renderDoc(bump) {
    docEl.textContent = fmt(docCount);
    if (bump) { docEl.classList.remove("bump"); void docEl.offsetWidth; docEl.classList.add("bump"); }
  }
  function renderHist() {
    var max = Math.max.apply(null, hbuck) || 1;
    for (var i = 0; i < hbars.length; i++) {
      var v = hbuck[i] || 0;
      hbars[i].style.height = Math.max(6, Math.round((v / max) * 100)) + "%";
    }
  }
  function renderAgg() {
    var vals = endpoints.map(function (e) { return deny[e]; });
    var max = Math.max.apply(null, vals) || 1;
    arows.forEach(function (row) {
      var ep = row.dataset.ep, v = deny[ep] || 0;
      row.querySelector(".es-afill").style.width = Math.round((v / max) * 100) + "%";
      row.querySelector(".es-aval").textContent = v;
      row.classList.toggle("lead", v === max && v > 0);
    });
  }
  function renderQres() { qresN.textContent = fmt(globex429); }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function decide() {
    var r = Math.random();
    if (r < 0.60) return "ALLOW";
    if (r < 0.90) return "DENY";
    return "SHADOW";
  }
  function clock() {
    var t = 14 * 60 + 32 + ticks; // dakika ilerlet
    var hh = String(Math.floor(t / 60) % 24).padStart(2, "0");
    var mm = String(t % 60).padStart(2, "0");
    var ss = String(Math.floor(Math.random() * 60)).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function addRow(ev) {
    var cls = ev.decision === "ALLOW" ? "allow" : ev.decision === "DENY" ? "deny" : "shadow";
    var row = document.createElement("div");
    row.className = "es-row enter " + cls;
    row.innerHTML =
      '<span class="es-t">' + ev.t + '</span>' +
      '<span class="es-tn">' + ev.tenant + '</span>' +
      '<span class="es-ep">' + ev.method + " " + ev.endpoint + '</span>' +
      '<span class="es-dec">' + ev.decision + '</span>';
    stream.insertBefore(row, stream.firstChild);
    while (stream.children.length > 5) stream.removeChild(stream.lastChild);
  }

  function ingest() {
    var ev = {
      t: clock(), tenant: pick(tenants), endpoint: pick(endpoints),
      method: "POST", decision: decide()
    };
    addRow(ev);

    // analitik güncelle (örnek + üretim ölçeğini temsilen)
    if (ev.decision === "DENY") {
      deny[ev.endpoint] += 1;
      hbuck[hbuck.length - 1] += 1;
      if (ev.tenant === "globex") { globex429 += 1 + Math.floor(Math.random() * 3); }
      renderAgg(); renderHist(); renderQres();
    }

    // _bulk tamponunu doldur (görünür örneğin arkasındaki gerçek hacim)
    buffer += 30 + Math.floor(Math.random() * 70);
    if (buffer >= BATCH) {
      var flushed = buffer; buffer = 0;
      bulk.classList.remove("flash"); void bulk.offsetWidth; bulk.classList.add("flash");
      docCount += flushed;
      renderDoc(true);
      if (rpsEl) rpsEl.textContent = fmt(Math.round(flushed / 0.5));
    }
    bufFill.style.width = Math.min(100, (buffer / BATCH) * 100) + "%";
    bufCnt.textContent = Math.min(BATCH, buffer) + " / " + BATCH;

    ticks += 1;
    // zaman ilerledikçe histogram kovalarını kaydır
    if (ticks % 7 === 0) { hbuck.shift(); hbuck.push(0); renderHist(); }
  }

  reset();

  if (reduce) {
    // son duruma zıpla: temsili dolu bir pano
    deny = { "/v1/pay": 41, "/v1/export": 33, "/v1/search": 22, "/v1/upload": 15, "/v1/users": 9 };
    hbuck = [3, 5, 4, 7, 6, 9, 8, 11, 9, 12, 10, 14, 16, 13];
    globex429 = 128; docCount = 1290640; buffer = 380;
    ["ALLOW", "DENY", "SHADOW", "DENY", "ALLOW"].forEach(function (dc, i) {
      addRow({ t: "14:3" + i + ":0" + i, tenant: tenants[i], endpoint: endpoints[i % 5], method: "POST", decision: dc });
    });
    bufFill.style.width = "76%"; bufCnt.textContent = "380 / 500";
    renderDoc(); renderHist(); renderAgg(); renderQres();
    if (rpsEl) rpsEl.textContent = "982";
    return;
  }

  later(function seed() { ingest(); }, 260);
  every(ingest, 780);
}

  /* ==== obs_deep ==== */
// ------------------------------------------------ Prometheus + Grafana (slide-obs)
// İki paralel anlatı: (1) SOL — Grafana panelinde red-oranı zaman serisi scrape
// ritminde canlı çizilir; %10 eşiği aşılınca ALARM yanar, zirveden (%14) sonra
// normale döner. (2) SAĞ — kardinalite patlaması: tenantId etiket OLSAYDI yüzlerce
// seri çubuğu açılır ve sayaç 6.000.000'a fırlar; etiketsiz halde tek seri kalır.
// Yardımcılar later/every/reduce/clearTimers KAPSAMDA — yeniden tanımlanmaz.
function runObs() {
  var slide = document.getElementById("slide-obs");
  if (!slide) return;

  var line   = document.getElementById("obLine");
  var area   = document.getElementById("obArea");
  var head   = document.getElementById("obHead");
  var thr    = document.getElementById("obThresh");
  var alarm  = document.getElementById("obAlarm");
  var cur    = document.getElementById("obCur");
  var fan    = document.getElementById("obFan");
  var series = document.getElementById("obSeries");
  if (!line) return;

  // --- grafik geometrisi (viewBox 0 0 340 140) ---
  var X0 = 40, X1 = 322, Y0 = 116, YTOP = 16, VMAX = 18, THR = 10;
  var data = [4, 5, 3, 6, 4.5, 5.5, 7, 6, 5.5, 8, 11, 14, 13, 9, 6, 5];
  var N = data.length;
  var mapX = function (i) { return X0 + i * (X1 - X0) / (N - 1); };
  var mapY = function (v) { return Y0 - (v / VMAX) * (Y0 - YTOP); };

  function render(n) {
    var pts = [], i;
    for (i = 0; i < n; i++) { pts.push(mapX(i).toFixed(1) + "," + mapY(data[i]).toFixed(1)); }
    line.setAttribute("points", pts.join(" "));
    if (area && n >= 2) {
      area.setAttribute("points", mapX(0).toFixed(1) + "," + Y0 + " " + pts.join(" ") + " " + mapX(n - 1).toFixed(1) + "," + Y0);
    }
    if (head && n >= 1) {
      head.setAttribute("cx", mapX(n - 1).toFixed(1));
      head.setAttribute("cy", mapY(data[n - 1]).toFixed(1));
      head.style.opacity = "1";
    }
  }
  function setCur(v) { if (cur) cur.textContent = v.toFixed(1).replace(".", ",") + "%"; }
  function setAlarm(on) {
    if (alarm) alarm.classList.toggle("ob-on", on);
    if (thr) thr.classList.toggle("ob-thr-hot", on);
    if (head) head.classList.toggle("ob-head-hot", on);
  }

  // --- kardinalite: seri çubukları ---
  var BARS = 48, TARGET = 6000000;
  if (fan) { fan.innerHTML = ""; for (var b = 0; b < BARS; b++) { fan.appendChild(document.createElement("i")); } }
  var bars = fan ? fan.querySelectorAll("i") : [];
  function setSeries(v) { if (series) series.textContent = Math.round(v).toLocaleString("tr-TR"); }

  // --- reduced motion: doğrudan son duruma zıpla ---
  if (reduce) {
    render(N); setCur(data[N - 1]); setAlarm(true);
    for (var k = 0; k < bars.length; k++) bars[k].classList.add("ob-lit");
    setSeries(TARGET);
    return;
  }

  // --- (1) canlı çizim · scrape ritmi ---
  setAlarm(false);
  render(1); setCur(data[0]);
  var idx = 1;
  var chartTimer = every(function () {
    render(idx + 1);
    setCur(data[idx]);
    if (data[idx] > THR) setAlarm(true);
    else if (idx >= 13) setAlarm(false);   // zirve geçti, normale döndü
    idx++;
    if (idx >= N) clearInterval(chartTimer);
  }, 430);

  // --- (2) kardinalite patlaması (paralel) ---
  var lit = 0;
  var fanTimer = every(function () {
    if (bars[lit]) bars[lit].classList.add("ob-lit");
    lit++;
    if (lit >= bars.length) clearInterval(fanTimer);
  }, 34);

  // seri sayacı 0 -> 6.000.000
  var t0 = null, DUR = 1700;
  function count(ts) {
    if (t0 === null) t0 = ts;
    var p = Math.min((ts - t0) / DUR, 1);
    var e = 1 - Math.pow(1 - p, 3);
    setSeries(TARGET * e);
    if (p < 1) requestAnimationFrame(count);
  }
  requestAnimationFrame(count);
}

  /* ==== td2 ==== */
/* ============================================================================
   6 · HER TESTİN MANTIĞI — akordeon + her mekanizma için mini canlı animasyon.
   runTestsDetail() akordeonu açar/kapar ve açılan öğenin mini şemasını oynatır.
   Yardımcılar (later/every/reduce) kapsamdadır; yeniden tanımlanmaz.
   ========================================================================== */
function runTestsDetail() {
  const ac = document.getElementById("tdAc");
  if (!ac) return;
  const items = Array.from(ac.querySelectorAll("[data-td]"));

  /* --- açılan öğeye özel zamanlayıcıların yönetimi (ac üzerinde saklanır) --- */
  const clearAnim = () => { (ac._td2t || []).forEach((id) => { clearInterval(id); clearTimeout(id); }); ac._td2t = []; };
  const track = (id) => { (ac._td2t = ac._td2t || []).push(id); return id; };

  /* --- mekanizma mini animasyonları --- */
  const ANIMS = {
    /* 1 · yarış / atomiklik: iki istek tek Lua'da sıraya girer, sayaç 99→100 */
    race(stage) {
      const a = stage.querySelector(".td2-tok.a"), b = stage.querySelector(".td2-tok.b");
      const lua = stage.querySelector(".td2-lua"), v = stage.querySelector(".td2-ctrv");
      const ro = stage.querySelector(".td2-res.ok"), rn = stage.querySelector(".td2-res.no");
      if (reduce) { a.classList.add("show", "go"); b.classList.add("show", "go"); v.textContent = "100"; ro.classList.add("show"); rn.classList.add("show"); return; }
      const cycle = () => {
        a.className = "td2-tok a show"; b.className = "td2-tok b show"; v.textContent = "99"; v.classList.remove("bump"); ro.classList.remove("show"); rn.classList.remove("show"); lua.classList.remove("pulse");
        track(later(() => { a.classList.add("go"); lua.classList.add("pulse"); }, 550));
        track(later(() => { v.textContent = "100"; v.classList.add("bump"); }, 950));
        track(later(() => { lua.classList.remove("pulse"); ro.classList.add("show"); }, 1350));
        track(later(() => { b.classList.add("go"); lua.classList.add("pulse"); }, 1950));
        track(later(() => { lua.classList.remove("pulse"); rn.classList.add("show"); }, 2450));
      };
      cycle(); track(every(cycle, 3900));
    },

    /* 2 · overdraft: bakiye 100 → 200'lük istek → -100 → 429 kilidi */
    wallet(stage) {
      const num = stage.querySelector(".td2-wnum"), fill = stage.querySelector(".td2-wfill");
      const neg = stage.querySelector(".td2-wneg"), stamp = stage.querySelector(".td2-wstamp");
      const setBal = (bal) => {
        num.textContent = bal; const pct = Math.max(0, Math.min(100, (bal + 100) / 200 * 100));
        fill.style.width = pct + "%"; const isNeg = bal <= 0;
        num.classList.toggle("neg", isNeg); fill.classList.toggle("neg", isNeg);
      };
      if (reduce) { setBal(-100); neg.classList.add("show"); stamp.classList.add("show"); return; }
      const cycle = () => {
        neg.classList.remove("show"); stamp.classList.remove("show"); setBal(100);
        track(later(() => {
          let bal = 100; const iv = setInterval(() => { bal -= 10; setBal(bal); if (bal <= -100) clearInterval(iv); }, 70); track(iv);
        }, 600));
        track(later(() => neg.classList.add("show"), 2200));
        track(later(() => stamp.classList.add("show"), 2650));
      };
      cycle(); track(every(cycle, 4300));
    },

    /* 3 · idempotency (SET NX): 50 aday yarışır, tam 1 sahiplenir */
    nx(stage) {
      const grid = stage.querySelector(".td2-nxgrid"), out = stage.querySelector(".td2-nxout");
      if (!grid.dataset.built) { grid.dataset.built = "1"; let h = ""; for (let i = 0; i < 50; i++) h += '<span class="td2-nxcell"></span>'; grid.innerHTML = h; }
      const cells = Array.from(grid.children), win = 23;
      if (reduce) { cells.forEach((c, i) => c.className = "td2-nxcell " + (i === win ? "win" : "lose")); out.classList.add("show"); return; }
      const cycle = () => {
        cells.forEach((c) => c.className = "td2-nxcell"); out.classList.remove("show");
        cells.forEach((c, i) => track(later(() => c.classList.add("race"), 300 + (i % 10) * 25 + Math.floor(i / 10) * 35)));
        track(later(() => { cells.forEach((c, i) => { c.classList.remove("race"); c.classList.add(i === win ? "win" : "lose"); }); }, 2000));
        track(later(() => out.classList.add("show"), 2300));
      };
      cycle(); track(every(cycle, 4300));
    },

    /* 4 · uzlaşma / checkpoint: Redis çöker → PG checkpoint'ten 30 geri yüklenir */
    ckpt(stage) {
      const redis = stage.querySelector(".td2-cknode.redis"), num = stage.querySelector(".td2-cknum"), flow = stage.querySelector(".td2-ckflow");
      if (reduce) { redis.className = "td2-cknode redis restored"; num.textContent = "30"; flow.classList.add("on"); return; }
      const cycle = () => {
        redis.className = "td2-cknode redis"; num.textContent = "30"; flow.classList.remove("on");
        track(later(() => { redis.classList.add("crash"); num.textContent = "✗"; }, 750));
        track(later(() => flow.classList.add("on"), 1550));
        track(later(() => { redis.classList.remove("crash"); redis.classList.add("restored"); num.textContent = "30"; }, 2150));
        track(later(() => flow.classList.remove("on"), 3100));
      };
      cycle(); track(every(cycle, 4500));
    },

    /* 5 · dönemsel kota: gün dönümünde anahtar döner, sayaç 0'lanır */
    period(stage) {
      const day = stage.querySelector(".td2-perday"), fill = stage.querySelector(".td2-perfill"), num = stage.querySelector(".td2-pernum"), tick = stage.querySelector(".td2-pertick");
      const setC = (n) => { num.textContent = n; fill.style.width = (n / 20 * 100) + "%"; };
      if (reduce) { day.textContent = "20260725"; setC(0); tick.classList.add("on"); return; }
      const cycle = () => {
        day.textContent = "20260724"; day.classList.remove("flip"); tick.classList.remove("on"); fill.classList.remove("reset"); setC(0);
        track(later(() => { let n = 0; const iv = setInterval(() => { n++; setC(n); if (n >= 18) clearInterval(iv); }, 90); track(iv); }, 500));
        track(later(() => tick.classList.add("on"), 2550));
        track(later(() => day.classList.add("flip"), 2750));
        track(later(() => day.textContent = "20260725", 3000));
        track(later(() => { day.classList.remove("flip"); fill.classList.add("reset"); setC(0); }, 3300));
      };
      cycle(); track(every(cycle, 5300));
    },

    /* 6 · yük / GC: 231→14 ms bar, 5xx 125.100 → 0 */
    gc(stage) {
      const before = stage.querySelector(".td2-gcbar.before .td2-gch");
      const after = stage.querySelector(".td2-gcbar.after .td2-gch");
      const line = stage.querySelector(".td2-gc5");
      if (reduce) { before.style.height = "68px"; after.style.height = "6px"; line.classList.add("show"); return; }
      const cycle = () => {
        before.style.height = "4px"; after.style.height = "4px"; line.classList.remove("show");
        track(later(() => { before.style.height = "68px"; }, 400));
        track(later(() => { after.style.height = "6px"; }, 950));
        track(later(() => line.classList.add("show"), 1500));
      };
      cycle(); track(every(cycle, 4200));
    }
  };

  const playAnim = (it) => {
    clearAnim();
    const stage = it.querySelector(".td2-stage");
    if (!stage) return;
    const fn = ANIMS[stage.dataset.anim];
    if (fn) fn(stage);
  };

  const openItem = (it) => {
    const wasOpen = it.classList.contains("open");
    items.forEach((x) => x.classList.remove("open"));
    clearAnim();
    if (!wasOpen) { it.classList.add("open"); if (reduce) playAnim(it); else later(() => playAnim(it), 300); }
  };

  /* giriş: kademeli reveal */
  items.forEach((it) => it.classList.remove("in", "open"));
  clearAnim();
  if (reduce) items.forEach((it) => it.classList.add("in"));
  else items.forEach((it, i) => later(() => it.classList.add("in"), 120 + i * 90));

  /* listener'lar yalnız bir kez */
  if (!ac.dataset.wired) {
    ac.dataset.wired = "1";
    items.forEach((it) => { const h = it.querySelector(".td-head"); if (h) h.addEventListener("click", () => openItem(it)); });
  }

  /* ilk öğeyi aç ve animasyonunu başlat */
  const first = items[0];
  if (!first) return;
  if (reduce) { first.classList.add("open"); playAnim(first); }
  else later(() => { first.classList.add("open"); later(() => playAnim(first), 320); }, 120 + items.length * 90 + 160);
}

  /* ==== wt2 ==== */
/* =========================================================================
   NEYİ NEDEN KULLANDIK — öğretici teknoloji matrisi + mini animasyonlar
   Kapsamdaki yardımcılar: later(fn,ms) · every(fn,ms) · reduce (boolean)
   Bu fonksiyon eski runWhyTech'in yerine geçer (aynı ad korunur).
   ========================================================================= */

const WT2_TONE = {
  danger: ["var(--danger)", "var(--danger-s)"],
  good:   ["var(--good)",   "var(--good-s)"],
  violet: ["var(--violet)", "var(--violet-s)"],
  warn:   ["var(--warn)",   "var(--warn-s)"],
  info:   ["var(--info)",   "var(--info-s)"],
  accent: ["var(--accent)", "var(--accent-s)"]
};

/* Her teknoloji için ÖĞRETİCİ kart verisi:
   def = NE OLDUĞU · why = NEDEN SEÇTİK · solves = NEYİ ÇÖZER · here = BU UYGULAMADA NEREDE */
const WT2 = {
  redis: {
    ico: "i-db", tone: "danger", name: "Redis", role: "Karar", tag: "p99 · 7,1 ms",
    def:    "Bellek-içi (RAM) veri deposu. Diske değil belleğe yazar; bu yüzden okuma/yazma mikro-saniyeler sürer.",
    why:    "Karar sıcak yolda, <b>her istekte</b> verilir; milisaniyeler bile birikince gecikmeye döner. RAM + tek iş parçacığı = tahmin edilebilir hız.",
    solves: "<b>Yarış koşulu</b> ve <b>gecikme</b>. Sayacı okuyup-azaltmayı tek atomik <b>Lua</b> betiğiyle yapar — iki istek aynı anda gelse bile sayaç bozulmaz.",
    here:   "Rate-limit ve kota <b>sayacı</b> burada yaşar (para değil, hız/adet). Karar tek <span class='chip-mono'>EVALSHA</span> ile ~19 µs'de döner.",
    code: '<span class="c">-- atomik karar (bölünmez)</span>\n<span class="k">EVALSHA</span> sha 1 <span class="v">rl:{t:acme}:q.wallet:202607</span>\n<span class="c">→ allow=true, remaining=39</span>',
    proof: "500 eş zamanlı istek → tam <b>250</b> geçti · sıcak yolda p99 <b>7,1 ms</b>",
    stage: () =>
      '<div class="wt2-st wt2-st-redis">' +
        '<div class="wt2-node">istek</div>' +
        '<div class="wt2-wire"><span class="wt2-spark"></span></div>' +
        '<div class="wt2-lua"><span class="wt2-lua-tag">Lua · EVALSHA</span><span class="wt2-lua-op">counter − 1</span></div>' +
        '<div class="wt2-wire"><span class="wt2-spark"></span></div>' +
        '<div class="wt2-ctr"><b id="wt2Ctr">40</b><i>kalan</i></div>' +
        '<div class="wt2-verdict">ALLOW</div>' +
      '</div>'
  },

  pg: {
    ico: "i-layers", tone: "good", name: "PostgreSQL", role: "Gerçek", tag: "ACID · kalıcı",
    def:    "İlişkisel (SQL) veritabanı. Veriyi diske <b>ACID</b> garantisiyle yazar: bir işlem ya tamamen olur ya hiç olmaz.",
    why:    "Para ve kurallar <b>kaybolmamalı</b> ve tutarsız kalmamalı. Redis hızlıdır ama uçucudur; gerçeğin tek kaynağı dayanıklı olmalı.",
    solves: "<b>Kalıcılık ve doğruluk.</b> Redis çökerse sayaç buradaki <b>checkpoint</b>'ten yeniden kurulur (0'dan değil). Faturanın hukuki kaydı burada durur.",
    here:   "Kurallar, cüzdanlar ve periyodik <b>checkpoint</b>'ler burada. Kurtarma tabanı idempotent; çift sayım olmaz.",
    code: '<span class="k">SELECT</span> balance <span class="k">FROM</span> quota_checkpoint\n<span class="k">WHERE</span> counter_key = <span class="v">\'q.wallet\'</span>;\n<span class="c">→ 30 (çökme sonrası taban)</span>',
    proof: "Redis silindi → checkpoint'ten bakiye <b>30</b> geri yüklendi (0 değil)",
    stage: () =>
      '<div class="wt2-st wt2-st-pg">' +
        '<div class="wt2-wal">' +
          '<div class="wt2-wal-row">BEGIN</div>' +
          '<div class="wt2-wal-row">UPDATE wallet −200</div>' +
          '<div class="wt2-wal-row">INSERT checkpoint</div>' +
        '</div>' +
        '<div class="wt2-wire"><span class="wt2-spark"></span></div>' +
        '<div class="wt2-commit"><svg><use href="#i-lock"/></svg><span>COMMIT ✓</span></div>' +
      '</div>'
  },

  kafka: {
    ico: "i-stream", tone: "violet", name: "Kafka + Debezium", role: "Yayılım", tag: "~35 ms",
    def:    "Kafka = dayanıklı, tekrar-oynatılabilir <b>olay omurgası</b>. Debezium = veritabanının değişiklik günlüğünü (CDC) okuyup olaya çeviren köprü.",
    why:    "Bir kural değişince <b>tüm</b> gateway'lerin haberi olmalı — yeniden başlatmadan, kimseyi kaçırmadan. Olay akışı bunu ölçeklenir biçimde yapar.",
    solves: "<b>İkili-yazım tutarsızlığı ve dağıtım.</b> DB ile olay aynı transaction'da (<b>outbox</b>) yazılır; CDC değişikliği yakalar; çok tüketici aynı olayı bağımsız işler.",
    here:   "Kural/eşik değişimi <span class='chip-mono'>rules.v1</span> ve <span class='chip-mono'>quota-events.v1</span> üzerinden yayılır; gateway belleğine <b>~35 ms</b>'de iner.",
    code: '<span class="c">-- outbox → Debezium (CDC) → Kafka</span>\ntopic: <span class="v">rules.v1</span>  (compacted)\n<span class="c">Admin UPDATE → tüm gateway: ~35 ms</span>',
    proof: "Admin'de kural değişti → gateway'lere <b>~35 ms</b>'de, restart'sız yayıldı",
    stage: () =>
      '<div class="wt2-st wt2-st-kafka">' +
        '<div class="wt2-node"><b>DB</b><br>outbox</div>' +
        '<div class="wt2-bus"><div class="wt2-bus-line"></div>' +
          '<span class="wt2-ev">rules.v1</span><span class="wt2-ev">quota</span><span class="wt2-ev">rules.v1</span>' +
        '</div>' +
        '<div class="wt2-fanout"><span class="wt2-gw">GW · 1</span><span class="wt2-gw">GW · 2</span><span class="wt2-gw">GW · 3</span></div>' +
      '</div>'
  },

  es: {
    ico: "i-search", tone: "warn", name: "Elasticsearch + Kibana", role: "Analitik", tag: "yüksek kardinalite",
    def:    "Elasticsearch = arama/analitik motoru; her olayı indeksler. Kibana = üstündeki görselleştirme arayüzü.",
    why:    "\"Kim, ne zaman, neden kesildi?\" gibi sorular <b>tenant, endpoint, karar</b> gibi yüksek-kardinaliteli kırılım ister — metrik sistemleri bunu taşıyamaz.",
    solves: "<b>Serbest sorgu ve derin kırılım.</b> Milyonlarca olayı ada, uca, karara göre gruplayıp (agregasyon) saniyede yanıtlar.",
    here:   "Her kararın olayı indekslenir; Kibana'da tenant × endpoint × karar kırılımı çıkar — Prometheus'un yapamayacağı ayrıntı.",
    code: '<span class="k">GET</span> usage/_search\n{ <span class="k">"query"</span>: <span class="v">tenantId:"globex" AND decision:"DENY"</span> }',
    proof: "5.000 tenant × 1.200 endpoint kırılımı — Prometheus'ta imkânsız, burada saniyeler",
    stage: () =>
      '<div class="wt2-st wt2-st-es">' +
        '<div class="wt2-raw"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>' +
        '<div class="wt2-agg-arrow"><svg><use href="#i-right"/></svg></div>' +
        '<div class="wt2-buckets">' +
          '<div class="wt2-bucket"><div class="wt2-bar b1"></div><i>DENY</i></div>' +
          '<div class="wt2-bucket"><div class="wt2-bar b2"></div><i>429</i></div>' +
          '<div class="wt2-bucket"><div class="wt2-bar b3"></div><i>OK</i></div>' +
        '</div>' +
      '</div>'
  },

  prom: {
    ico: "i-gauge", tone: "info", name: "Prometheus + Grafana", role: "Nabız", tag: "p99 · rps · 5xx",
    def:    "Prometheus = zaman-serisi metrik toplayıcı; Grafana = pano/grafik katmanı. Sayısal nabzı sürekli ölçer.",
    why:    "Sistemin sağlığı <b>ucuz ve sürekli</b> izlenmeli. Metrikler az sayıda seride tutulursa yıllarca saklanabilir ve alarm kurulabilir.",
    solves: "<b>Operasyonel görünürlük ve alarm.</b> p99 gecikme, rps, 5xx gibi düşük-kardinaliteli sinyalleri toplar; anomaliyi anında gösterir.",
    here:   "Tenant etiketi <b>taşımaz</b> (ADR-011 · kardinalite kuralı) — seri patlaması olmaz. GC darboğazı burada görülüp çözüldü.",
    code: '<span class="k">histogram_quantile</span>(0.99,\n  rate(gateway_decision_seconds_bucket[5m]))\n<span class="c">→ 7,1 ms  (p99)</span>',
    proof: "GC darboğazı burada yakalandı: <b>231 ms → 14 ms</b>, 5xx → <b>0</b>",
    stage: () =>
      '<div class="wt2-st wt2-st-prom">' +
        '<div class="wt2-chart"><svg class="wt2-chart-svg" viewBox="0 0 190 66" preserveAspectRatio="none">' +
          '<polyline class="wt2-line" points="0,52 26,46 52,50 78,30 104,36 130,16 156,22 190,10"/>' +
          '<circle class="wt2-dot" cx="190" cy="10" r="3"/>' +
        '</svg></div>' +
        '<div class="wt2-readout"><b>7,1 ms</b><i>p99 karar gecikmesi</i><span class="wt2-gc">GC · 231 → 14 ms</span></div>' +
      '</div>'
  },

  gw: {
    ico: "i-shield", tone: "accent", name: "Spring Cloud Gateway", role: "Uygulayıcı", tag: "tek karar noktası",
    def:    "Reaktif (non-blocking) API ağ geçidi. Her istek buradan geçer; kimlik doğrulamadan sonra, yönlendirmeden önce filtre çalışır.",
    why:    "Kararın <b>tek, merkezi</b> bir yerde uygulanması gerekir — her servise ayrı ayrı serpiştirilmemeli. Reaktif model az kaynakla çok isteği taşır.",
    solves: "<b>Merkezi uygulama ve DB-ekonomi.</b> Kuralı <b>bellekte</b> tutar, her istekte DB'ye gitmez; yalnız karar için Redis'e dokunur.",
    here:   "Kararı burada uygular: <span class='chip-mono'>200</span> | <span class='chip-mono'>429</span> / <span class='chip-mono'>503</span> / <span class='chip-mono'>403</span>. Retry yok; timeout'ta güvenli fallback.",
    code: '<span class="c">// auth sonrası, route öncesi filtre</span>\nctx → rule match (bellek) → <span class="k">Redis</span>\n→ 200 | 429 / 503 / 403',
    proof: "1081 rps sürdürüldü · ek gecikme p99 <b>7,1 ms</b> · 5xx <b>0</b>",
    stage: () =>
      '<div class="wt2-st wt2-st-gw">' +
        '<div class="wt2-inflow"><span class="wt2-req"></span><span class="wt2-req"></span><span class="wt2-req deny"></span><span class="wt2-req"></span></div>' +
        '<div class="wt2-gate"></div>' +
        '<div class="wt2-outflow"><span class="wt2-verd ok">200 OK</span><span class="wt2-verd no">429</span><span class="wt2-verd ok">200 OK</span></div>' +
      '</div>'
  }
};

const WT2_FACTS = [
  { k: "def",    ico: "i-target", lbl: "Ne olduğu" },
  { k: "why",    ico: "i-bolt",   lbl: "Neden seçtik" },
  { k: "solves", ico: "i-check",  lbl: "Neyi çözer" },
  { k: "here",   ico: "i-map",    lbl: "Bu uygulamada" }
];

function wt2Select(key, initial) {
  const d = WT2[key];
  if (!d) return;
  const rail = document.getElementById("wt2Rail");
  if (rail) rail.querySelectorAll(".wt2-chip").forEach((c) => c.classList.toggle("sel", c.dataset.wt === key));

  const panel = document.getElementById("wt2Panel");
  if (!panel) return;
  const tv = WT2_TONE[d.tone] || WT2_TONE.accent;
  panel.style.setProperty("--tone", tv[0]);
  panel.style.setProperty("--tone-s", tv[1]);

  document.getElementById("wt2Ico").innerHTML = '<svg><use href="#' + d.ico + '"/></svg>';
  document.getElementById("wt2Name").textContent = d.name;
  document.getElementById("wt2Role").textContent = d.role;
  document.getElementById("wt2Tag").textContent = d.tag;

  const facts = document.getElementById("wt2Facts");
  facts.innerHTML = WT2_FACTS.map((f) =>
    '<div class="wt2-fact"><span class="wt2-fact-ico"><svg><use href="#' + f.ico + '"/></svg></span>' +
    '<span class="wt2-fact-b"><span class="lbl">' + f.lbl + '</span><span class="txt">' + d[f.k] + '</span></span></div>'
  ).join("");

  document.getElementById("wt2Code").innerHTML = d.code;
  document.getElementById("wt2ProofTxt").innerHTML = d.proof;

  // mini animasyon sahnesi — innerHTML atanınca CSS animasyonları baştan başlar
  const stage = document.getElementById("wt2Stage");
  stage.innerHTML = d.stage();

  // Redis sayacı: 40'tan geri say (JS ile). Element yoksa/başka teknoloji seçilince kendini durdurur.
  if (key === "redis" && !reduce) {
    const ctr = document.getElementById("wt2Ctr");
    if (ctr) {
      let n = 40;
      every(function tick() {
        if (!document.body.contains(ctr)) return; // sahne değişti → sessizce dur
        n = n <= 35 ? 40 : n - 1;
        ctr.textContent = n;
      }, 750);
    }
  }

  if (!initial && !reduce) { panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap"); }
}

function runWhyTech() {
  const rail = document.getElementById("wt2Rail");
  if (!rail) return;
  const chips = Array.from(rail.querySelectorAll(".wt2-chip"));

  // kademeli giriş
  chips.forEach((c) => c.classList.remove("in"));
  if (reduce) chips.forEach((c) => c.classList.add("in"));
  else chips.forEach((c, i) => later(() => c.classList.add("in"), 90 + i * 70));

  // tıklama listener'ı bir kez bağla
  if (!rail.dataset.wired) {
    rail.dataset.wired = "1";
    chips.forEach((c) => c.addEventListener("click", () => wt2Select(c.dataset.wt, false)));
  }

  wt2Select("redis", true);
}

  /* ==== sum2 ==== */
// ---------------------------------------------------- kapanış / öğrenme yolculuğu
// Altı teorik durak bir "yol çizgisi" üzerinde kademeli belirir: ray dolgusu
// ilerledikçe her düğüm yanar, ilgili tematik kart akıcı biçimde açılır ve en
// sonda "tek cümlede ne öğrendik" kutusu belirir. Ardından düğümlerde hafif,
// gezinen bir parıltı döngüsü kalır. reduce ise doğrudan son duruma zıplar.
function runSummary() {
  var slide = document.getElementById("slide-summary");
  if (!slide) return;

  var fill  = slide.querySelector(".sm2-track-fill");
  var dots  = [].slice.call(slide.querySelectorAll(".sm2-dot"));
  var cards = [].slice.call(slide.querySelectorAll(".sm2-card"));
  var final = slide.querySelector(".sm2-final");
  if (!cards.length) return;

  // sıfırla
  dots.forEach(function (d) { d.classList.remove("on", "pulse"); });
  cards.forEach(function (c) { c.classList.remove("lit"); });
  if (fill) fill.style.width = "0%";
  if (final) final.classList.remove("show");

  var n = cards.length;

  if (reduce) {
    dots.forEach(function (d) { d.classList.add("on"); });
    cards.forEach(function (c) { c.classList.add("lit"); });
    if (fill) fill.style.width = "100%";
    if (final) final.classList.add("show");
    return;
  }

  // duraklar sırayla: ray dolar + düğüm yanar + kart açılır
  cards.forEach(function (c, i) {
    later(function () {
      c.classList.add("lit");
      if (dots[i]) dots[i].classList.add("on");
      if (fill) fill.style.width = Math.round(((i + 1) / n) * 100) + "%";
    }, 360 + i * 300);
  });

  // kapanış kutusu son duraktan sonra
  later(function () {
    if (final) final.classList.add("show");
  }, 360 + n * 300 + 240);

  // yolculuk kurulduktan sonra düğümlerde gezinen parıltı
  later(function () {
    var k = 0;
    every(function () {
      dots.forEach(function (d) { d.classList.remove("pulse"); });
      var d = dots[k % dots.length];
      if (d) d.classList.add("pulse");
      k++;
    }, 1100);
  }, 360 + n * 300 + 700);
}

  // --------------------------------------------------- vaka giriş (intro)
  function runIntro() {
    const dims = document.querySelectorAll("#intDims .int-dim");
    const req = document.getElementById("intReq");
    const gate = document.getElementById("intGate");
    const evalT = document.getElementById("intEval");
    const allow = document.getElementById("intAllow");
    const deny = document.getElementById("intDeny");
    if (!dims.length) return;
    let round = 0;
    const reset = () => {
      dims.forEach((d) => d.classList.remove("on"));
      if (req) req.classList.remove("go");
      if (gate) gate.classList.remove("busy");
      if (allow) allow.classList.remove("on");
      if (deny) deny.classList.remove("on");
      if (evalT) evalT.textContent = "değerlendiriliyor…";
    };
    if (reduce) {
      dims.forEach((d) => d.classList.add("on"));
      if (allow) allow.classList.add("on");
      if (evalT) evalT.textContent = "6 boyut kontrol edildi";
      return;
    }
    const play = () => {
      reset();
      later(() => { if (req) req.classList.add("go"); }, 200);
      later(() => { if (gate) gate.classList.add("busy"); }, 520);
      dims.forEach((d, i) => later(() => d.classList.add("on"), 700 + i * 260));
      const doneAt = 700 + dims.length * 260;
      later(() => { if (evalT) evalT.textContent = "6 boyut kontrol edildi"; }, doneAt + 180);
      const cut = round % 3 === 2;   // her 3 turda bir kes (limit/kota aşımı)
      later(() => {
        if (cut) { if (deny) deny.classList.add("on"); if (evalT) evalT.textContent = "limit/kota aşıldı → kesildi"; }
        else if (allow) allow.classList.add("on");
      }, doneAt + 640);
      round++;
    };
    play();
    every(play, 700 + dims.length * 260 + 2600);
  }

  // başlat
  const hash = window.location.hash.match(/^#s(\d+)$/);
  const start = hash ? Math.min(total, Math.max(1, parseInt(hash[1], 10))) - 1 : 0;
  go(start);
})();
