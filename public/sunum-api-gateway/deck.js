/* ============================================================================
   API Gateway & Merkezi Trafik Yönetimi — Sunum motoru
   Slayt gezinme, seviye ilerleyişi, animasyonlu sayaçlar ve yedi canlı
   görselleştirme (istek zinciri, rate limit, devre kesici, canary, retry
   fırtınası, blast radius, gecikme bütçesi). Bağımlılık yok, tamamen offline.
   ========================================================================== */
(function () {
  "use strict";

  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var total = slides.length;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var elProgress = document.getElementById("progress");
  var elStages = document.getElementById("progressStages");
  var elCur = document.getElementById("cur");
  var elTot = document.getElementById("tot");
  var elDots = document.getElementById("dots");
  var elStageName = document.getElementById("stageName");
  var index = 0;

  var STAGE_NAMES = { "0": "GİRİŞ", "1": "AŞAMA 1 · TEMEL", "2": "AŞAMA 2 · UYGULAMA",
                      "3": "AŞAMA 3 · İLERİ", "4": "AŞAMA 4 · UZMAN" };
  var LV = { "0": "#a9b2c6", "1": "#38e1c8", "2": "#5b8cff", "3": "#a78bfa", "4": "#f0a15c" };

  elTot.textContent = String(total);

  /* ---------------------------------------------------------- zamanlayıcı -- */
  var timers = [], rafs = [], killers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers.length = 0;
    rafs.forEach(function (r) { cancelAnimationFrame(r); });
    rafs.length = 0;
    /* rAF döngülerini gerçekten durdur — yalnızca kuyruktaki kareyi iptal
       etmek yetmez, döngü kendini yeniden kuyruğa alır. */
    killers.forEach(function (k) { k(); });
    killers.length = 0;
  }
  /* Slayt yeniden girildiğinde çalıştırıcı yeni yerel durum yaratır. Bir kez
     eklenmiş dinleyici ESKİ kapanışa bağlı kalır ve düğmeler sessizce ölür
     (ör. Sıfırla). ev() dinleyiciyi ekler ve slayt değişiminde kaldırır, böylece
     her girişte taze ve doğru duruma bağlı yeniden kurulur. */
  function ev(el, type, fn) {
    if (!el) return;
    el.addEventListener(type, fn);
    killers.push(function () { el.removeEventListener(type, fn); });
  }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }
  /* Slayt değişince otomatik duran animasyon döngüsü */
  function loop(fn) {
    var alive = true;
    function step(now) {
      if (!alive) return;
      fn(now);
      rafs.push(requestAnimationFrame(step));
    }
    rafs.push(requestAnimationFrame(step));
    killers.push(function () { alive = false; });
    return function () { alive = false; };
  }

  /* ------------------------------------------------------------- yardımcı -- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  var C = {};
  function palette() {
    C = { t1: css("--t1"), t2: css("--t2"), t3: css("--t3"), line: css("--line"), line2: css("--line-2"),
          s1: css("--s1"), s2: css("--s2"), s3: css("--s3"), acc: css("--accent"), acc2: css("--accent-2"),
          vio: css("--violet"), amber: css("--amber"), good: css("--good"), warn: css("--warn"),
          danger: css("--danger"), canvas: "#06080c",
          mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' };
  }
  palette();

  /* CSS yüksekliğini SADECE bir kez, ilk height özniteliğinden al ve sakla.
     clientHeight'tan türetmek geri besleme döngüsü yaratır: cv.height özniteliği
     yazılınca layout yüksekliği de değişir, sonraki kare onu okur ve canvas büyür. */
  function fit(cv) {
    var d = Math.min(1.75, window.devicePixelRatio || 1);
    var hh;
    if (cv.classList.contains("cv-flex")) {
      /* Yükseklik CSS'ten geliyor (ör. clamp(...vh...)) — style.height'a dokunma,
         yoksa duyarlılık kaybolur. clientHeight CSS tarafından sabitlendiği için
         geri besleme döngüsü oluşmaz. */
      hh = cv.clientHeight;
      if (!hh) return null;
    } else {
      if (!cv.dataset.cssh) cv.dataset.cssh = String(parseInt(cv.getAttribute("height"), 10) || 200);
      hh = +cv.dataset.cssh;
      cv.style.height = hh + "px";
    }
    var w = cv.clientWidth;
    if (!w) return null;
    var W = Math.round(w * d), H = Math.round(hh * d);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var c = cv.getContext("2d");
    c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, w: w, h: hh };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function nf(n) { return n.toLocaleString("tr-TR"); }

  /* ------------------------------------------------------------ noktalar --- */
  slides.forEach(function (s, i) {
    var d = document.createElement("div");
    d.className = "dot" + (i === 0 ? " on" : "");
    d.dataset.l = s.dataset.lv || "0";
    d.title = (i + 1) + " · " + (s.dataset.title || "");
    d.addEventListener("click", function () { go(i); });
    elDots.appendChild(d);
  });
  var dots = Array.prototype.slice.call(elDots.children);

  /* aşama şeridi — üstteki ilerleme çubuğunun altında seviye haritası */
  (function buildStages() {
    slides.forEach(function (s) {
      var i = document.createElement("i");
      i.style.width = (100 / total) + "%";
      i.style.background = LV[s.dataset.lv || "0"];
      elStages.appendChild(i);
    });
  })();

  /* ------------------------------------------------------------- gezinme --- */
  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    clearTimers();
    slides[index].classList.remove("active");
    dots[index].classList.remove("on");
    index = i;
    slides[index].classList.add("active");
    slides[index].scrollTop = 0;
    dots[index].classList.add("on");
    elCur.textContent = String(index + 1);
    elProgress.style.width = ((index + 1) / total) * 100 + "%";
    var lv = slides[index].dataset.lv || "0";
    elStageName.textContent = STAGE_NAMES[lv];
    elStageName.style.color = LV[lv];
    onEnter(slides[index]);
    markOverviewCurrent();
    try { history.replaceState(null, "", "#s" + (index + 1)); } catch (e) { window.location.hash = "s" + (index + 1); }
  }
  function next() { go(index + 1); }
  function prev() { go(index - 1); }
  $("#next").addEventListener("click", next);
  $("#prev").addEventListener("click", prev);

  /* -------------------------------------------------------- genel bakış ---- */
  var ovPanel = $("#overviewPanel"), ovGrid = $("#ovGrid"), ovCount = $("#ovCount");
  function buildOverview() {
    ovGrid.innerHTML = "";
    slides.forEach(function (s, i) {
      var c = document.createElement("button");
      c.className = "ov-card";
      c.dataset.l = s.dataset.lv || "0";
      c.innerHTML = '<span class="ov-num">' + String(i + 1).padStart(2, "0") + '</span>' +
                    '<span class="ov-name">' + (s.dataset.title || "Slayt") + '</span>';
      c.addEventListener("click", function () { closeOv(); go(i); });
      ovGrid.appendChild(c);
    });
    ovCount.textContent = total + " slayt · 4 seviye";
  }
  function markOverviewCurrent() {
    Array.prototype.slice.call(ovGrid.children).forEach(function (c, i) { c.classList.toggle("cur", i === index); });
  }
  function openOv() { ovPanel.hidden = false; markOverviewCurrent(); }
  function closeOv() { ovPanel.hidden = true; }
  function toggleOv() { ovPanel.hidden ? openOv() : closeOv(); }
  buildOverview();
  $("#home").addEventListener("click", function () { closeOv(); go(0); });
  $("#overview").addEventListener("click", toggleOv);
  $("#ovClose").addEventListener("click", closeOv);

  /* -------------------------------------------------------------- klavye --- */
  document.addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var k = e.key;
    if (k === "Escape") { closeOv(); return; }
    if (k === "ArrowRight" || k === "PageDown" || k === " ") { e.preventDefault(); next(); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
    else if (k === "Home") { e.preventDefault(); go(0); }
    else if (k === "End") { e.preventDefault(); go(total - 1); }
    else if (k === "o" || k === "O") { toggleOv(); }
    else if (k === "r" || k === "R") { onEnter(slides[index], true); }
    else if (k === "f" || k === "F") {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    }
  });

  /* --------------------------------------------------------------- dokun --- */
  var tx = 0, ty = 0;
  document.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) { dx < 0 ? next() : prev(); }
  }, { passive: true });

  window.addEventListener("resize", function () { onEnter(slides[index], true); });

  /* ------------------------------------------------------------ sayaçlar --- */
  function animateCount(el) {
    var target = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.dec || "0", 10);
    var suffix = el.dataset.suffix || "";
    el.dataset.done = "1";
    function fmt(v) { return (dec > 0 ? v.toFixed(dec).replace(".", ",") : nf(Math.round(v))) + suffix; }
    if (reduce) { el.textContent = fmt(target); return; }
    var t0 = performance.now(), dur = 1100;
    function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) rafs.push(requestAnimationFrame(step));
    }
    rafs.push(requestAnimationFrame(step));
  }

  /* ============================================================== onEnter == */
  function onEnter(slide, force) {
    if (force) clearTimers();
    $$("[data-count]", slide).forEach(function (el) {
      if (force) el.dataset.done = "";
      if (!el.dataset.done) animateCount(el);
    });
    var id = slide.id;
    if (id === "slide-journey") runJourney();
    else if (id === "slide-problem") runProblem();
    else if (id === "slide-what") runWhat();
    else if (id === "slide-pipe") { runPipe(); runRightChain(); }
    else if (id === "slide-chain") runChain();
    else if (id === "slide-jwt") runJwt();
    else if (id === "slide-phantom") runPhantom();
    else if (id === "slide-rl") runRl();
    else if (id === "slide-trace") runTrace();
    else if (id === "slide-timeout") runRetry();
    else if (id === "slide-cb") runCb();
    else if (id === "slide-canary") { runCanary(); runDeployStrat(); }
    else if (id === "slide-spof") runSpof();
    else if (id === "slide-latency") runLatency();
    else if (id === "slide-products") runProducts();
    else if (id === "slide-decide") runDecide();
    else if (id === "slide-recap") runRecap();
    /* --- görsel ve etkileşim yükseltmeleri --- */
    else if (id === "slide-vs") runVs();
    else if (id === "slide-discovery") runDiscovery();
    else if (id === "slide-shed") runShed();
    else if (id === "slide-obs") runObs();
    else if (id === "slide-poc") runPoc();
    else if (id === "slide-sec") runSec();
    else if (id === "slide-plugins") runPlugins();
    else if (id === "slide-arena") runArena();
    else if (id === "slide-r4j") { runR4j(); runDecChain(); runFsm(); }
    else if (id === "slide-dynamic") runDynamic();
    else if (id === "slide-anti") runAnti();
    else if (id === "slide-diff") runDiff();
    else if (id === "slide-scg") runScg();
    else if (id === "slide-cover") runCover();
    else if (id === "stage-1") runStage1();
    else if (id === "slide-ns") runNs();
    else if (id === "slide-ha") runHa();
    else if (id === "slide-body") runUpload();
  }

  /* ═══════════════════════════ 1 · YOLCULUK RAYI ═══════════════════════════ */
  function runJourney() {
    var fill = $("#jFill"), stops = $$("#jStops .lvstop");
    if (!fill) return;
    fill.style.width = "0%";
    stops.forEach(function (s) { s.classList.remove("on"); });
    if (reduce) { fill.style.width = "100%"; stops.forEach(function (s) { s.classList.add("on"); }); return; }
    var pcts = [14, 38, 63, 100];
    stops.forEach(function (s, i) {
      later(function () { s.classList.add("on"); fill.style.width = pcts[i] + "%"; }, 420 + i * 620);
    });
  }
  function runRecap() {
    var fill = $("#rFill");
    if (!fill) return;
    fill.style.width = "0%";
    later(function () { fill.style.width = "100%"; }, 350);
  }

  /* ═══════════════════════════ 2 · PROBLEM (N × M) ═════════════════════════ */
  function runProblem() {
    var cv = $("#probCv"); if (!cv) return;
    var lbl = $("#probCount");
    var COLS = 10, ROWS = 4, TASKS = 8;
    var t0 = performance.now();
    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var el = reduce ? 4000 : now - t0;
      c.clearRect(0, 0, W, H);

      var padX = 18, padY = 26;
      var cw = (W - padX * 2) / COLS, chh = (H - padY * 2) / ROWS;
      var box = Math.min(cw, chh) * 0.78;
      var shown = Math.min(COLS * ROWS, Math.floor(el / 45));
      var dotsShown = Math.max(0, Math.min(COLS * ROWS * TASKS, Math.floor((el - 900) / 3)));

      c.font = "10px " + C.mono;
      c.fillStyle = C.t3;
      c.fillText("40 MİKROSERVİS × 8 ÇAPRAZ KESEN GÖREV", padX, 14);

      var placed = 0;
      for (var r = 0; r < ROWS; r++) {
        for (var k = 0; k < COLS; k++) {
          var i = r * COLS + k;
          if (i >= shown) break;
          var x = padX + k * cw + (cw - box) / 2;
          var y = padY + r * chh + (chh - box) / 2;
          c.fillStyle = "rgba(91,140,255,.10)";
          c.strokeStyle = "rgba(91,140,255,.55)";
          c.lineWidth = 1;
          rr(c, x, y, box, box, 5); c.fill(); c.stroke();
          // her servisin içinde 8 tekrarlanan görev noktası
          for (var t = 0; t < TASKS; t++) {
            if (placed >= dotsShown) { t = TASKS; break; }
            var col = t % 4, row = (t / 4) | 0;
            var dx = x + box * 0.22 + col * box * 0.19;
            var dy = y + box * 0.34 + row * box * 0.3;
            c.fillStyle = C.danger;
            c.beginPath(); c.arc(dx, dy, Math.max(1.3, box * 0.045), 0, Math.PI * 2); c.fill();
            placed++;
          }
        }
      }
      if (lbl) lbl.textContent = nf(placed) + " / 320 tekrar";
    });
  }

  /* ═══════════════════════════ 3 · GATEWAY NEDİR ══════════════════════════ */
  function runWhat() {
    var nodes = $$("#whatFlow .flow-node");
    if (!nodes.length) return;
    nodes.forEach(function (n) { n.classList.remove("hot"); });
    if (reduce) return;
    var i = 0;
    every(function () {
      nodes.forEach(function (n) { n.classList.remove("hot"); });
      nodes[i % nodes.length].classList.add("hot");
      i++;
    }, 1100);
  }

  /* ═══════════════════════════ 4 · İSTEK ZİNCİRİ ══════════════════════════ */
  var BANDS = ["TLS", "LİMİT", "ROTA", "KİMLİK", "YETKİ", "KOTA", "DÖNÜŞÜM", "İZLEME"];
  function runPipe() {
    var cv = $("#pipeCv"); if (!cv) return;
    var stat = $("#pipeStat");
    var CLIENTS = ["Mobil", "Web", "Partner", "IoT"];
    var SERVICES = ["sipariş", "katalog", "ödeme", "kullanıcı", "stok"];
    var parts = [], last = performance.now(), acc = 0, okN = 0, badN = 0;

    function spawn() {
      var blocked = Math.random() < 0.2;
      parts.push({
        from: (Math.random() * CLIENTS.length) | 0,
        to: (Math.random() * SERVICES.length) | 0,
        p: 0, sp: 0.00028 + Math.random() * 0.00024,
        blocked: blocked,
        blockBand: 3 + ((Math.random() * 3) | 0),
        dead: 0
      });
      if (parts.length > 80) parts.shift();
    }
    if (reduce) { for (var i = 0; i < 24; i++) { spawn(); parts[i].p = Math.random(); } }

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = Math.min(48, now - last); last = now;
      if (!reduce) { acc += dt; while (acc > 170) { acc -= 170; spawn(); } }

      c.clearRect(0, 0, W, H);
      /* Ölçek: canvas yüksekliği arttıkça bantlar, kutular ve yazılar birlikte büyür. */
      var k = Math.max(0.85, Math.min(1.55, H / 300));
      var gwW = Math.max(140, Math.min(260, W * 0.26));
      var gwX = W / 2 - gwW / 2, gwY = 26 * k, gwH = H - 52 * k;
      var nodeW = Math.round(72 * k), nodeH = Math.round(26 * k);
      var lx = Math.max(14, W * 0.045), rx = W - Math.max(14, W * 0.045);
      var fNode = Math.max(10.5, Math.min(15, 11 * k));

      function cy(i, n) { return gwY + 14 * k + (gwH - 28 * k) * (n === 1 ? 0.5 : i / (n - 1)); }

      // bağlantı çizgileri
      c.strokeStyle = "rgba(110,122,145,.16)"; c.lineWidth = 1;
      CLIENTS.forEach(function (_, i) { c.beginPath(); c.moveTo(lx + nodeW - 6, cy(i, CLIENTS.length)); c.lineTo(gwX, H / 2); c.stroke(); });
      SERVICES.forEach(function (_, i) { c.beginPath(); c.moveTo(gwX + gwW, H / 2); c.lineTo(rx - nodeW, cy(i, SERVICES.length)); c.stroke(); });

      // gateway gövdesi
      c.fillStyle = "rgba(91,140,255,.05)"; c.strokeStyle = "rgba(91,140,255,.5)"; c.lineWidth = 1.4;
      rr(c, gwX, gwY, gwW, gwH, 10); c.fill(); c.stroke();

      var bh = gwH / BANDS.length;
      var fBand = Math.max(9, Math.min(13, bh * 0.36));
      c.textAlign = "center";
      BANDS.forEach(function (b, i) {
        var by = gwY + i * bh;
        var hot = parts.some(function (p) {
          if (p.dead) return false;
          var seg = (p.p - 0.34) / 0.32;
          return seg >= i / BANDS.length && seg < (i + 1) / BANDS.length;
        });
        /* aktif bant belirgin bir zemin alsın — alt bantlar da okunur kalsın */
        if (hot) { c.fillStyle = "rgba(91,140,255,.13)"; rr(c, gwX + 2, by + 1, gwW - 4, bh - 2, 5); c.fill(); }
        if (i > 0) { c.strokeStyle = "rgba(91,140,255,.16)"; c.lineWidth = 1; c.beginPath(); c.moveTo(gwX, by); c.lineTo(gwX + gwW, by); c.stroke(); }
        c.font = (hot ? "700 " : "") + fBand.toFixed(1) + "px " + C.mono;
        c.fillStyle = hot ? C.acc : "rgba(150,162,185,.62)";
        c.fillText(b, gwX + gwW / 2, by + bh / 2 + fBand * 0.36);
      });

      // düğümler
      c.textAlign = "left"; c.font = fNode.toFixed(1) + "px " + C.sans;
      CLIENTS.forEach(function (n, i) {
        var y = cy(i, CLIENTS.length);
        c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = "rgba(110,122,145,.34)"; c.lineWidth = 1;
        rr(c, lx - 6, y - nodeH / 2, nodeW, nodeH, 6); c.fill(); c.stroke();
        c.fillStyle = C.t2; c.fillText(n, lx + 3, y + fNode * 0.36);
      });
      SERVICES.forEach(function (n, i) {
        var y = cy(i, SERVICES.length);
        c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = "rgba(110,122,145,.34)";
        rr(c, rx - nodeW, y - nodeH / 2, nodeW, nodeH, 6); c.fill(); c.stroke();
        c.fillStyle = C.t2; c.fillText(n, rx - nodeW + 9, y + fNode * 0.36);
      });

      // paketler
      for (var i2 = parts.length - 1; i2 >= 0; i2--) {
        var p = parts[i2];
        if (!reduce) p.p += p.sp * dt;
        var blockAt = 0.34 + 0.32 * ((p.blockBand + 0.6) / BANDS.length);
        if (p.blocked && p.p >= blockAt && !p.dead) { p.dead = 1; badN++; }
        if (p.dead) { p.dead += dt * 0.004; if (p.dead > 2.4) { parts.splice(i2, 1); continue; } }
        else if (p.p > 1) { parts.splice(i2, 1); okN++; continue; }

        var x, y, sy = cy(p.from, CLIENTS.length), ey = cy(p.to, SERVICES.length);
        var sx0 = lx + nodeW - 6, ex0 = rx - nodeW;
        if (p.p < 0.34) { var u = p.p / 0.34; x = sx0 + (gwX - sx0) * u; y = sy + (H / 2 - sy) * u; }
        else if (p.p < 0.66) { var u2 = (p.p - 0.34) / 0.32; x = gwX + gwW * u2; y = H / 2 + Math.sin(u2 * Math.PI * 3) * 3 * k; }
        else { var u3 = (p.p - 0.66) / 0.34; x = (gwX + gwW) + (ex0 - (gwX + gwW)) * u3; y = H / 2 + (ey - H / 2) * u3; }

        if (p.dead) {
          var a = Math.max(0, 1 - (p.dead - 1) / 1.4);
          c.strokeStyle = "rgba(248,113,113," + a + ")"; c.lineWidth = 1.5;
          c.beginPath(); c.arc(x, y, 3 + (p.dead - 1) * 8, 0, Math.PI * 2); c.stroke();
          c.fillStyle = "rgba(248,113,113," + a + ")";
          c.beginPath(); c.arc(x, y, 2.6, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = p.p < 0.66 ? C.acc : C.acc2;
          c.beginPath(); c.arc(x, y, 2.8 * k, 0, Math.PI * 2); c.fill();
          c.globalAlpha = .25; c.beginPath(); c.arc(x, y, 6 * k, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        }
      }
      if (stat) stat.innerHTML = '<span style="color:' + C.acc2 + '">' + okN + " geçti</span> · " +
                                 '<span style="color:' + C.danger + '">' + badN + " kesildi</span>";
    });
  }

  /* ═══════════════════════════ 5 · ZİNCİR GEZGİNİ ═════════════════════════ */
  var CHAIN = [
    { t: "Bağlantı ve TLS sonlandırma", ph: "PRE",
      w: "TCP bağlantısı kabul edilir, TLS el sıkışması yapılır, sertifika sunulur; partner trafiğinde istemci sertifikası (mTLS) doğrulanır. Protokol (HTTP/1.1, HTTP/2, HTTP/3) burada belirlenir.",
      y: "Şifrelemeyi tek noktada bitirmek, arka uç servisleri sertifika yönetiminden kurtarır ve TLS yapılandırmasını tekdüze kılar.",
      f: "Süresi geçmiş sertifika (tüm trafik durur), zayıf şifre takımı, eksik SNI, sertifika zinciri eksikliği.",
      k: "TLS 1.3 · ECDSA P-256 · OCSP stapling · ALPN", ic: "i-lock", cost: "~0,3 ms", ex: "Alt yapı: <b>TLS 1.3</b> · ECDSA P-256 · <b>ALPN</b> ile h2/h3 seçimi · partner rotasında istemci sertifikası zorunlu", go: "slide-sec", goT: "Güvenlik: OWASP, CORS, TLS" },
    { t: "Kaba istek kontrolü", ph: "PRE",
      w: "Header sayısı ve toplam boyutu, URL uzunluğu, istek satırının geçerliliği kontrol edilir. Belirsiz Content-Length / Transfer-Encoding kombinasyonları reddedilir.",
      y: "Bu kontroller neredeyse ücretsizdir ve pahalı işlemlerden önce gelmelidir. İstek kaçakçılığı savunmasının ilk hattıdır.",
      f: "Limit yoksa bellek tüketimi saldırısı; belirsiz kodlama kabul edilirse ara katmanlar arası tutarsızlık ve güvenlik atlatma.",
      k: "max_header_bytes · max_uri_length · 431", ic: "i-shield", cost: "~0,02 ms", ex: "<b>max_header_bytes</b> 16 KB · URL 8 KB · belirsiz <b>Content-Length + Transfer-Encoding</b> ikilisi reddedilir", go: "slide-body", goT: "Gövde, upload ve akış" },
    { t: "Header hijyeni", ph: "PRE",
      w: "İstemciden gelen güven gerektiren header'lar koşulsuz silinir: X-User-Id, X-Roles, X-Internal-*, X-Real-IP. X-Forwarded-For güvenilir proxy sayısına göre kesilir ve yeniden yazılır.",
      y: "Gateway'in ekleyeceği kimlik bilgisinin istemci tarafından taklit edilmesini engeller. Tek satırlık bu işlem, en yaygın kimlik sahteciliği yolunu kapatır.",
      f: "Atlanırsa: IP tabanlı kısıtlama ve rate limit atlatma, doğrudan kimlik taklidi, yetki yükseltme.",
      k: "RemoveRequestHeader · trusted proxy count", ic: "i-mask", cost: "~0,02 ms", ex: "<b>RemoveRequestHeader</b>=X-User-Id, X-Roles, X-Internal-* · XFF güvenilir proxy sayısına göre kesilir", go: "slide-headers", goT: "Header dönüşümü ve güven sınırı" },
    { t: "Rota eşleme (predicate)", ph: "PRE",
      w: "Yol, metot, host, header ve query değerlerine göre eşleşen rota bulunur. Yol parametreleri çıkarılır, rota kimliği (route_id) belirlenir.",
      y: "Bundan sonraki bütün politikalar rotaya bağlıdır: hangi kota, hangi timeout, hangi yetki. Rota kimliği aynı zamanda metrik ve log etiketidir.",
      f: "Genel rotanın spesifik rotayı gölgelemesi → sıkı politikalar hiç uygulanmaz. Binlerce rotada doğrusal arama → gecikme.",
      k: "Path · Method · Host · Header · Weight · order", ic: "i-route", cost: "~0,05 ms", ex: "<b>Path</b>=/api/v1/siparis/** + <b>Method</b>=GET,POST · eşleşen rotanın <b>route_id</b> değeri tüm politikaların anahtarı olur", go: "slide-route", goT: "Route modeli: koşul + filtre" },
    { t: "CORS ön kontrol (preflight)", ph: "PRE",
      w: "OPTIONS istekleri, kimlik doğrulamadan ÖNCE yanıtlanır. Origin allowlist'e göre izin verilen metot ve header'lar döndürülür.",
      y: "Preflight istekleri tanım gereği kimlik bilgisi taşımaz. Kimliğin arkasına konursa tarayıcıdan gelen her çağrı başarısız olur.",
      f: "Allow-Origin: * ile Allow-Credentials birlikte; Origin'in doğrulanmadan yansıtılması; Vary: Origin eksikliği.",
      k: "Access-Control-Allow-* · Vary: Origin · Max-Age", ic: "i-globe", cost: "~0,01 ms", ex: "<b>OPTIONS</b> kimlikten önce yanıtlanır · <b>Vary: Origin</b> zorunlu · Allow-Origin yalnızca allowlist üzerinden", go: "slide-sec", goT: "Güvenlik: OWASP, CORS, TLS" },
    { t: "Gövde boyutu limiti", ph: "PRE",
      w: "Content-Length kontrol edilir; akış hâlinde okunan gövde sayaçla sınırlanır. Aşılırsa 413 döner ve bağlantı sonlandırılır.",
      y: "Kimlik ve şema doğrulama gibi pahalı adımlardan önce gelmeli. Aksi hâlde 100 MB'lık bir gövde size CPU ve bellek harcatır.",
      f: "Sınır yoksa bellek tükenmesi; sınır sadece Content-Length'e bakıyorsa chunked istekle atlatılır.",
      k: "RequestSize filtresi · 413 Payload Too Large", ic: "i-box", cost: "~0,02 ms", ex: "<b>RequestSize</b> maxSize=1MB · chunked istekte sayaçla sınırlanır · aşımda <b>413</b>", go: "slide-body", goT: "Gövde, upload ve akış" },
    { t: "Anonim hız sınırı", ph: "PRE",
      w: "Kimlik henüz bilinmediği için IP (veya cihaz parmak izi) bazlı kaba bir limit uygulanır.",
      y: "Kimlik doğrulama ucu ve token doğrulama maliyeti, kimliksiz saldırganlara karşı korunmalıdır. Aksi hâlde login ucu bedava DoS hedefidir.",
      f: "NAT arkasındaki binlerce kullanıcının tek IP'den gelmesi → yanlış reddetme. Çözüm: gevşek limit + davranışsal tespit.",
      k: "ip: anahtarı · 429 · Retry-After", ic: "i-gauge", cost: "~0,6 ms", ex: "Anahtar <b>ip:203.0.113.9</b> · gevşek limit (20–100/dk) · NAT arkasındaki kullanıcılar için tolerans", go: "slide-rl", goT: "Rate limit algoritmaları" },
    { t: "Kimlik doğrulama", ph: "PRE",
      w: "Bearer token doğrulanır: imza (JWKS'ten kid ile), algoritma allowlist'i, iss, aud, exp/nbf. Opaque token varsa introspection yapılır ve sonuç önbelleklenir. mTLS'te sertifika zinciri ve CN/SAN eşlemesi kontrol edilir.",
      y: "Bütün mikroservisler için tek ve tutarlı doğrulama noktası. OWASP API2 riskini en çok azaltan tek adım.",
      f: "aud kontrolünün atlanması (başka servisin token'ı kabul edilir), alg karışıklığı saldırısı, JWKS önbelleğinin rotasyonu kaçırması.",
      k: "Authorization: Bearer · JWKS · 401", ic: "i-key", cost: "~0,25 ms", ex: "<b>alg</b> allowlist · <b>iss / aud / exp</b> kontrolü · <b>kid</b> ile JWKS · opaque token varsa introspection önbelleklenir", go: "slide-jwt", goT: "Kimlik doğrulama · JWT anatomisi" },
    { t: "Kaba taneli yetkilendirme", ph: "PRE",
      w: "Rota için gerekli scope/rol kontrol edilir. Gerekirse harici politika motoruna (OPA/Cedar) karar sorulur.",
      y: "Admin uçlarının dış trafiğe kapatılması ve fonksiyon düzeyi yetkinin (OWASP API5) merkezî uygulanması. Ucuz ve etkili bir filtredir.",
      f: "Nesne düzeyi yetkiyi burada çözmeye çalışmak — gateway iş verisini bilmez. Uzak PDP'ye gitmek gecikme bütçesini yer.",
      k: "scope · ext_authz · 403", ic: "i-shield", cost: "~0,1 ms", ex: "Rota için gereken <b>scope</b> veya rol · gerekirse OPA sidecar üzerinden <b>ext_authz</b> çağrısı", go: "slide-authz", goT: "Yetkilendirme sınırı nerede biter?" },
    { t: "Kimliğe bağlı kota", ph: "PRE",
      w: "Kullanıcı, kurum, API anahtarı ve rota boyutlarında limitler sırayla kontrol edilir. Sayaçlar Redis üzerinde atomik olarak güncellenir.",
      y: "Adil paylaşım ve gürültülü komşu koruması. Kimlik çözülmeden yapılamaz, bu yüzden kimlik adımından sonradır.",
      f: "Redis kesintisinde davranışın tanımsız olması; hangi limitin devreye girdiğinin yanıtta belirtilmemesi.",
      k: "RateLimit-* · Retry-After · Lua betiği", ic: "i-pulse", cost: "~0,6 ms", ex: "Anahtar <b>k:ACME</b> · jeton kovası · Redis üzerinde tek <b>Lua</b> betiğiyle atomik · aşımda <b>429 + Retry-After</b>", go: "slide-quota", goT: "Dağıtık kota ve çok boyutlu kontrol" },
    { t: "Şema doğrulama", ph: "PRE",
      w: "İstek, OpenAPI/JSON Schema tanımına göre doğrulanır: tipler, formatlar, zorunlu alanlar, bilinmeyen alanlar, dizi ve derinlik sınırları.",
      y: "Sözleşmeye uymayan istek servise hiç ulaşmaz. Enjeksiyon yüzeyi daralır, servis kodundan doğrulama tekrarları kalkar.",
      f: "Sadece 'geçerli JSON mu' bakmak; additionalProperties açık bırakmak; derinlik sınırı koymamak (ayrıştırıcı DoS).",
      k: "400 / 422 · application/problem+json", ic: "i-check", cost: "~0,4 ms", ex: "OpenAPI şeması · <b>additionalProperties: false</b> · derinlik sınırı · uymayanda <b>400 / 422</b>", go: "slide-sec", goT: "Güvenlik: OWASP, CORS, TLS" },
    { t: "İstek dönüşümü ve zenginleştirme", ph: "PRE",
      w: "Yol yeniden yazılır (StripPrefix/RewritePath). Kimlik bağlamı header olarak eklenir: X-User-Id, X-Kurum-Kodu, X-Scopes, abonelik katmanı.",
      y: "Downstream servisler token ayrıştırmak veya kullanıcı servisini tekrar çağırmak zorunda kalmaz. Dış yol ile iç yol ayrışır.",
      f: "Bu header'ların imzalanmaması veya iç ağın mTLS ile korunmaması → kimlik taklidi vektörü.",
      k: "StripPrefix · AddRequestHeader · SetPath", ic: "i-filter", cost: "~0,05 ms", ex: "<b>StripPrefix</b>=2 · <b>AddRequestHeader</b>=X-Kurum-Kodu, X-Scopes · bağlam başlığı imzalanır", go: "slide-headers", goT: "Header dönüşümü ve güven sınırı" },
    { t: "Correlation ID ve trace bağlamı", ph: "PRE",
      w: "Geçerli bir traceparent yoksa üretilir; correlation ID atanır. Her ikisi de upstream'e iletilir, log bağlamına ve yanıt header'ına yazılır.",
      y: "Uçtan uca izlenebilirlik buradan başlar. Gateway, izin başladığı ilk enstrümante bileşendir.",
      f: "Header allowlist'i nedeniyle traceparent'ın düşürülmesi → izler servis sınırında kopar; en sık görülen tracing arızası.",
      k: "traceparent · tracestate · X-Correlation-Id", ic: "i-net", cost: "~0,15 ms", ex: "<b>traceparent</b> yoksa üretilir, varsa doğrulanır · <b>X-Correlation-Id</b> yanıta da yazılır", go: "slide-trace", goT: "Correlation ID ve W3C trace context" },
    { t: "Upstream seçimi ve dayanıklılık", ph: "ROUTE",
      w: "Servis keşfinden sağlıklı örnekler alınır, yük dağıtım algoritmasıyla biri seçilir. Devre kesici durumu kontrol edilir; timeout ve retry politikası uygulanır. Bağlantı havuzundan keep-alive bağlantı alınır.",
      y: "Arka uçtaki bir sorunun istemciye ve diğer rotalara yayılmasını engeller. Gateway'in dayanıklılık katkısının tamamı buradadır.",
      f: "TimeLimiter olmadan devre kesici; bütçesiz retry (fırtına); bağlantı havuzunun varsayılan bırakılması.",
      k: "lb:// · outlier detection · CircuitBreaker", ic: "i-breaker", cost: "değişken", ex: "<b>lb://</b> ile örnek seçimi · outlier detection · <b>CircuitBreaker</b> + <b>TimeLimiter</b> · keep-alive havuzu", go: "slide-cb", goT: "Circuit breaker · canlı" },
    { t: "Yanıt dönüşümü", ph: "POST",
      w: "Yanıt header'ları düzenlenir: Server ve X-Powered-By kaldırılır, güvenlik header'ları eklenir, CORS tekilleştirilir, Deprecation/Sunset uyarıları eklenir. Gerekirse hassas alanlar maskelenir.",
      y: "Bilgi sızıntısını keser ve güvenlik politikasını tek noktada dayatır. Sürüm emeklilik sinyalleri buradan verilir.",
      f: "Gövdeyi değiştirmek için tamponlama yapmak → akış (SSE/streaming) bozulur, bellek şişer.",
      k: "SecureHeaders · Deprecation · Sunset", ic: "i-tag", cost: "~0,1 ms", ex: "<b>RemoveResponseHeader</b>=Server · <b>SecureHeaders</b> · <b>Deprecation</b> ve <b>Sunset</b> uyarıları", go: "slide-version", goT: "Versiyonlama ve emeklilik" },
    { t: "Telemetri ve yanıt yazımı", ph: "POST",
      w: "Süre, durum kodu, rota kimliği, upstream gecikmesi ve sonuç metriklere yazılır; erişim logu (örneklenmiş, PII maskeli) üretilir; span kapatılır. Yanıt istemciye akıtılır.",
      y: "Gateway sistemin en değerli gözlem noktasıdır: bütün trafiği görür ve kullanıcı deneyimine en yakın ölçümü üretir.",
      f: "Metrik etiketine ham yol koymak → kardinalite patlaması. Senkron log yazımı → gecikme artışı.",
      k: "spring.cloud.gateway.requests · route_id", ic: "i-eye", cost: "~0,1 ms", ex: "<b>spring.cloud.gateway.requests</b> timer · route_id etiketi · erişim logu örneklenmiş ve PII maskeli", go: "slide-obs", goT: "Gözlemlenebilirlik ve alarm" }
  ];
  var chainBuilt = false, chainCur = 0, chainTimer = null;
  function runChain() {
    var list = $("#chainList"), det = $("#chainDetail"), pos = $("#chainPos"), autoBtn = $("#chainAuto");
    if (!list) return;
    if (!chainBuilt) {
      CHAIN.forEach(function (s, i) {
        var b = document.createElement("button");
        b.className = "chain-item"; b.setAttribute("role", "tab");
        b.dataset.ph = s.ph;
        b.innerHTML = '<span class="ci">' + String(i + 1).padStart(2, "0") + '</span>' +
          '<span class="cig"><svg><use href="#' + (s.ic || "i-check") + '"/></svg></span>' +
          '<span>' + s.t + '</span><span class="cc">' + (s.cost || "") + '</span>';
        ev(b, "click", function () { stopChain(); selChain(i); });
        list.appendChild(b);
      });
      ev(autoBtn, "click", function () {
        if (chainTimer) return stopChain();
        autoBtn.innerHTML = '<svg><use href="#i-pause"/></svg> Durdur';
        var pk = $("#metroPkt"); if (pk) pk.classList.add("go");
        chainTimer = setInterval(function () { selChain((chainCur + 1) % CHAIN.length); }, 3200);
      });
      /* --- metro hattı --- */
      var track = $("#metroTrack");
      if (track) {
        track.innerHTML = '<div class="metro-line" id="metroLine">' +
          CHAIN.map(function (st, i) {
            return '<div class="mstop" data-i="' + i + '" data-ph="' + st.ph + '">' +
              '<span class="mdot"><svg><use href="#' + (st.ic || "i-check") + '"/></svg></span>' +
              '<span class="mn">' + String(i + 1).padStart(2, "0") + "</span>" +
              '<span class="ml">' + st.t + "</span></div>";
          }).join("") +
          '<div class="metro-pkt" id="metroPkt"></div></div>';
        ev(track, "click", function (e) {
          var st = e.target.closest(".mstop[data-i]");
          if (st) { stopChain(); selChain(+st.dataset.i); }
        });
      }
      chainBuilt = true;
    }
    function stopChain() {
      if (chainTimer) { clearInterval(chainTimer); chainTimer = null; }
      autoBtn.innerHTML = '<svg><use href="#i-play"/></svg> Hattı oynat';
      var pk = $("#metroPkt"); if (pk) pk.classList.remove("go");
    }
    /* slayttan çıkarken otomatik oynatma da dursun */
    killers.push(stopChain);
    function selChain(i) {
      chainCur = i;
      var btns = $$(".chain-item", list);
      btns.forEach(function (b, j) { b.classList.toggle("on", j === i); });
      var s = CHAIN[i];
      var col = s.ph === "PRE" ? "#38e1c8" : s.ph === "POST" ? "#f0a15c" : "#a78bfa";
      var phName = s.ph === "PRE" ? "PRE · istek yolu" : s.ph === "POST" ? "POST · yanıt dönüşü" : "ROUTE · arka uca çıkış";
      var keys = (s.k || "").split(" · ").map(function (x) { return '<span class="kk">' + x + "</span>"; }).join("");
      det.innerHTML =
        '<div class="cd-head">' +
          '<span class="cd-ico" style="border-color:' + col + '55;background:' + col + '14">' +
            '<svg style="color:' + col + '"><use href="#' + (s.ic || "i-check") + '"/></svg></span>' +
          '<div>' +
            '<div class="cd-meta">' +
              '<span class="lvbadge" style="color:' + col + ';border-color:' + col + '55;background:' + col + '18">' + phName + '</span>' +
              '<span style="font-family:' + C.mono + ';font-size:10.5px;color:var(--t3);letter-spacing:.1em">DURAK ' + String(i + 1).padStart(2, "0") + ' / 16</span>' +
            '</div><h3>' + s.t + '</h3></div>' +
          '<div class="cd-cost"><div class="cv3">' + (s.cost || "—") + '</div><div class="cl3">tipik maliyet</div></div>' +
        '</div>' +
        '<div class="cd-body">' +
          '<p class="cd-lead">' + s.w + '</p>' +
          '<div class="cd-grid">' +
            '<div class="cd-box good"><svg style="color:var(--good)"><use href="#i-check"/></svg>' +
              '<div><h5 style="color:var(--good)">Neden burada</h5><p>' + s.y + '</p></div></div>' +
            '<div class="cd-box bad"><svg style="color:var(--danger)"><use href="#i-warn"/></svg>' +
              '<div><h5 style="color:var(--danger)">Atlanırsa ne olur</h5><p>' + s.f + '</p></div></div>' +
          '</div>' +
          '<div class="cd-ex"><svg><use href="#i-terminal"/></svg>' +
            '<div class="cx">' + (s.ex || "") + '</div></div>' +
          '<div class="cd-keys"><span class="kt">Anahtarlar</span>' + keys + '</div>' +
          '<div class="cd-go">' +
            '<span class="gtx">Bu durak şu bölümde derinleşiyor: <b>' + (s.goT || "") + '</b></span>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
              '<div class="cd-nav">' +
                '<button data-nav="-1" aria-label="Önceki durak"><svg><use href="#i-left"/></svg></button>' +
                '<button data-nav="1" aria-label="Sonraki durak"><svg><use href="#i-right"/></svg></button>' +
              '</div>' +
              '<button class="cd-jump" data-go="' + (s.go || "") + '">Bölüme git <svg><use href="#i-arrow"/></svg></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      $$("[data-nav]", det).forEach(function (b2) {
        ev(b2, "click", function () {
          stopChain();
          selChain((chainCur + (+b2.dataset.nav) + CHAIN.length) % CHAIN.length);
        });
      });
      var jb = $(".cd-jump", det);
      if (jb) ev(jb, "click", function () {
        var idx = slides.findIndex(function (sl) { return sl.id === jb.dataset.go; });
        if (idx >= 0) go(idx);
      });
      pos.textContent = String(i + 1).padStart(2, "0") + " / 16";
      pos.className = "sbadge " + (s.ph === "PRE" ? "g" : s.ph === "POST" ? "w" : "a");
      var b = btns[i], lt = list.scrollTop, lh = list.clientHeight;
      if (b.offsetTop < lt || b.offsetTop + b.offsetHeight > lt + lh) list.scrollTop = b.offsetTop - lh / 2;
      /* metro hattını senkronla */
      var stops = $$(".mstop");
      stops.forEach(function (el, j) {
        el.classList.toggle("on", j === i);
        el.classList.toggle("passed", j < i);
      });
      var pk = $("#metroPkt"), line = $("#metroLine");
      if (pk && stops[i] && line) {
        var dot = stops[i].querySelector(".mdot");
        pk.style.left = (dot.offsetLeft + dot.offsetWidth / 2 - 7) + "px";
        pk.style.background = s.ph === "PRE" ? "#38e1c8" : s.ph === "POST" ? "#f0a15c" : "#a78bfa";
        pk.style.boxShadow = "0 0 14px " + (s.ph === "PRE" ? "rgba(56,225,200,.65)" : s.ph === "POST" ? "rgba(240,161,92,.65)" : "rgba(167,139,250,.65)");
        pk.classList.add("go");
        var tw = $("#metroTrack");
        if (tw && tw.scrollWidth > tw.clientWidth) {
          var target = dot.offsetLeft - tw.clientWidth / 2;
          tw.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
        }
      }
    }
    selChain(0);
  }

  /* ═══════════════════════════ 6 · ANATOMİ (JWT / TRACE) ══════════════════ */
  function anatomy(lineEl, cardsEl, segs, dur) {
    if (!lineEl) return;
    lineEl.innerHTML = segs.map(function (s, i) {
      return '<span class="anat-seg" data-i="' + i + '" style="color:' + s.col + '">' + s.txt + '</span>' +
             (s.sep ? '<span style="color:var(--t3)">' + s.sep + '</span>' : "");
    }).join("");
    cardsEl.innerHTML = segs.map(function (s, i) {
      return '<div class="anat-card" data-i="' + i + '">' +
        '<div class="ak" style="color:' + s.col + '">' + s.k + '</div>' +
        '<div class="av">' + s.v + '</div><div class="ad">' + s.d + '</div></div>';
    }).join("");
    var segEls = $$(".anat-seg", lineEl), cardEls = $$(".anat-card", cardsEl);
    if (reduce) return;
    var i = 0;
    function tick() {
      segEls.forEach(function (e, j) { e.classList.toggle("hot", j === i); e.classList.toggle("dim", j !== i); });
      cardEls.forEach(function (e, j) { e.classList.toggle("hot", j === i); });
      i = (i + 1) % segs.length;
    }
    tick();
    every(tick, dur || 1900);
  }
  function runJwt() {
    anatomy($("#jwtLine"), $("#jwtCards"), [
      { txt: "eyJhbGciOiJSUzI1NiIsImtpZCI6ImE3ZiJ9", col: "#5b8cff", sep: ".", k: "HEADER", v: "alg · kid",
        d: "İmza algoritması ve anahtar kimliği. Gateway alg'i ALLOWLIST'ten doğrular — token'ın dediğine güvenmez." },
      { txt: "eyJpc3MiOiJodHRwczovL2lkcC5rdXJ1bS5jb20iLCJhdWQiOiJzaXBhcmlzLWFwaSIsImV4cCI6MTc2NzIyNTYwMH0", col: "#38e1c8", sep: ".", k: "PAYLOAD (CLAIMS)", v: "iss · aud · exp · scope",
        d: "Base64'tür, ŞİFRELİ DEĞİLDİR. Tarayıcıda duran bir JWT e-posta ve rol bilgisini açığa çıkarır — Phantom Token deseninin sebebi budur." },
      { txt: "SflKxwRJSMeKKF2QT4fwpMeJf36P", col: "#a78bfa", sep: "", k: "SIGNATURE", v: "RS256 imza",
        d: "JWKS'ten kid ile seçilen açık anahtarla doğrulanır. Doğrulama yerel ve mikrosaniyeler sürer — asıl maliyet JWKS'i her istekte çekmektir." }
    ], 2400);
  }
  function runTrace() {
    anatomy($("#tpLine"), $("#tpCards"), [
      { txt: "00", col: "#f0a15c", sep: "-", k: "VERSION", v: "00",
        d: "Spesifikasyon sürümü. Bilinmeyen sürüm gelirse alanı KORU ve İLET, atma." },
      { txt: "4bf92f3577b34da6a3ce929d0e0e4736", col: "#38e1c8", sep: "-", k: "TRACE-ID · 16 bayt", v: "4bf92f35…",
        d: "Tüm çağrı ağacı boyunca DEĞİŞMEZ. Bütün servislerin logunda aynı görünmesi gereken değer budur." },
      { txt: "00f067aa0ba902b7", col: "#5b8cff", sep: "-", k: "PARENT-ID · 8 bayt", v: "00f067aa…",
        d: "Çağıranın span kimliği. Her atlamada DEĞİŞİR — ağacın kenarları buradan kurulur." },
      { txt: "01", col: "#34d399", sep: "", k: "FLAGS", v: "01",
        d: "Örnekleme bayrağı. 01 = bu iz kaydedilecek. Yanında tracestate satıcı bağlamını, baggage uygulama anahtarlarını taşır." }
    ], 2100);
  }

  /* ═══════════════════════════ 7 · PHANTOM TOKEN ══════════════════════════ */
  function runPhantom() {
    var nodes = $$("#phFlow [data-p]"), idp = $('[data-p="idp"]'), step = $("#phStep");
    if (!step) return;
    var STEPS = [
      { on: ["0"], t: "1 · İstemci opaque token gönderir — rastgele bir dize, hiçbir bilgi taşımaz", c: "b" },
      { on: ["1", "idp"], t: "2 · Gateway token'ı introspection ile sorar ve sonucu ÖNBELLEKLER", c: "a" },
      { on: ["1"], t: "3 · Gateway imzalı JWT üretir ve kimlik bağlamıyla zenginleştirir", c: "a" },
      { on: ["2"], t: "4 · Mikroservis JWT'yi YEREL doğrular — IdP'ye hiç gitmez", c: "g" }
    ];
    function clearAll() {
      nodes.forEach(function (n) { n.classList.remove("hot"); });
      if (idp) idp.classList.remove("hot");
    }
    var i = 0;
    function tick() {
      clearAll();
      var s = STEPS[i];
      s.on.forEach(function (k) { var el = $('[data-p="' + k + '"]'); if (el) el.classList.add("hot"); });
      step.className = "pill " + s.c;
      step.textContent = s.t;
      i = (i + 1) % STEPS.length;
    }
    tick();
    if (!reduce) every(tick, 2300);
  }

  /* ═══════════════════════════ 8 · RATE LIMIT SİM ═════════════════════════ */
  var RL_DOC = {
    fixed: {
      c: "#f87171", t: "Sabit pencere (Fixed Window)", m: "1 sayaç + 1 pencere kimliği",
      how: [
        "Zaman, sabit uzunlukta ardışık dilimlere bölünür (örneğin her tam dakika).",
        "Her dilim için tek bir sayaç tutulur; istek geldiğinde sayaç artırılır.",
        "Sayaç limiti aşarsa istek reddedilir.",
        "Yeni dilim başladığında sayaç <b>anında sıfırlanır</b> — asıl sorun buradadır."
      ],
      f: "izin = sayaç(pencere) &lt; limit",
      pro: "Uygulaması en basit, belleği en az olan yöntem. Tek bir Redis <span class='chip-mono'>INCR</span> + <span class='chip-mono'>EXPIRE</span> ile atomik biçimde gerçeklenebilir.",
      con: "<b>Sınır patlaması:</b> pencerenin son anında limit kadar, ilk anında yine limit kadar istek geçebilir. Sonuç, çok kısa bir aralıkta <b>iki katı</b> trafiktir. Ayrıca pencere başında ani yığılma oluşur (herkes sıfırlanmayı bekler).",
      use: "İç servisler arası kaba koruma ve maliyeti düşük emniyet supabı. <b>Dış API'lerde önerilmez.</b>",
      code: "<span class='c-c'>-- Redis: tek atomik adım</span>\n<span class='c-k'>local</span> k = <span class='c-s'>'rl:'</span> .. anahtar .. <span class='c-s'>':'</span> .. math.<span class='c-f'>floor</span>(simdi/pencere)\n<span class='c-k'>local</span> n = redis.<span class='c-f'>call</span>(<span class='c-s'>'INCR'</span>, k)\n<span class='c-k'>if</span> n == <span class='c-n'>1</span> <span class='c-k'>then</span> redis.<span class='c-f'>call</span>(<span class='c-s'>'PEXPIRE'</span>, k, pencere) <span class='c-k'>end</span>\n<span class='c-k'>return</span> n &lt;= limit"
    },
    slide: {
      c: "#38e1c8", t: "Kayan pencere — kayıt (Sliding Window Log)", m: "Penceredeki her isteğin zaman damgası",
      how: [
        "Her kabul edilen isteğin zaman damgası bir sıralı kümede saklanır.",
        "Yeni istek geldiğinde pencere dışında kalan damgalar silinir.",
        "Kalan damga sayısı limitten küçükse istek kabul edilir ve damgası eklenir.",
        "Pencere <b>her an</b> geriye doğru kayar; sabit bir sıfırlanma anı yoktur."
      ],
      f: "izin = |{ t : şimdi − t &lt; pencere }| &lt; limit",
      pro: "<b>Tam doğruluk.</b> Sınır patlaması yoktur; her an geriye bakıldığında limit kesinlikle korunur. Kalan kotanın ne zaman serbest kalacağı da tam olarak bilinir.",
      con: "Bellek, izin verilen istek sayısıyla <b>doğrusal</b> büyür: dakikada 10.000 limitli bir anahtar 10.000 zaman damgası tutar. Her istekte budama maliyeti vardır (<span class='chip-mono'>ZREMRANGEBYSCORE</span>).",
      use: "Düşük hacimli ama doğruluğu kritik uçlar: para transferi, OTP gönderimi, hesap oluşturma.",
      code: "<span class='c-c'>-- Redis sorted set: skor = zaman damgası</span>\nredis.<span class='c-f'>call</span>(<span class='c-s'>'ZREMRANGEBYSCORE'</span>, k, <span class='c-n'>0</span>, simdi - pencere)\n<span class='c-k'>local</span> n = redis.<span class='c-f'>call</span>(<span class='c-s'>'ZCARD'</span>, k)\n<span class='c-k'>if</span> n &lt; limit <span class='c-k'>then</span>\n  redis.<span class='c-f'>call</span>(<span class='c-s'>'ZADD'</span>, k, simdi, simdi .. <span class='c-s'>':'</span> .. math.<span class='c-f'>random</span>())\n  redis.<span class='c-f'>call</span>(<span class='c-s'>'PEXPIRE'</span>, k, pencere)\n<span class='c-k'>end</span>\n<span class='c-k'>return</span> n &lt; limit"
    },
    token: {
      c: "#5b8cff", t: "Jeton kovası (Token Bucket)", m: "2 alan: jeton sayısı + son güncelleme anı",
      how: [
        "Kova, kapasitesi kadar jeton tutabilir ve sabit hızda doldurulur.",
        "Jetonlar zamanla değil, <b>talep anında</b> hesaplanır: geçen süre × doldurma hızı.",
        "Her istek bir jeton tüketir; jeton yoksa istek reddedilir.",
        "Kullanılmayan jetonlar kapasiteye kadar <b>birikir</b> — ani yükü karşılayan mekanizma budur."
      ],
      f: "jeton = min(kapasite, jeton + Δt × hız) &nbsp;·&nbsp; izin = jeton ≥ 1",
      pro: "<b>Kontrollü ani yük.</b> Uzun süre sessiz kalan bir istemci, biriken jetonlarla kısa bir patlama yapabilir; ancak ortalama hız uzun vadede garanti altındadır. Bellek sabittir ve dağıtık ortamda tek Lua betiğiyle atomik hesaplanır.",
      con: "Kova boşaldıktan sonra istemci <b>doldurma hızına mahkûmdur</b>; ardışık iki patlama yapılamaz. Kapasite çok büyük seçilirse arka uç, taşıyamayacağı bir ani yükle karşılaşabilir.",
      use: "<b>Dış API'ler için en iyi varsayılan.</b> Gerçek istemci davranışına (sessizlik + patlama) en yakın modeldir. Spring Cloud Gateway'in <span class='chip-mono'>RedisRateLimiter</span>'ı bu algoritmayı kullanır.",
      code: "<span class='c-c'>-- replenishRate = hız, burstCapacity = kapasite</span>\n<span class='c-k'>local</span> gecen = (simdi - ts) / <span class='c-n'>1000</span>\njeton = math.<span class='c-f'>min</span>(kapasite, jeton + gecen * hiz)\n<span class='c-k'>if</span> jeton &gt;= <span class='c-n'>1</span> <span class='c-k'>then</span>\n  jeton = jeton - <span class='c-n'>1</span>; izin = <span class='c-n'>1</span>\n<span class='c-k'>else</span>\n  bekle = math.<span class='c-f'>ceil</span>((<span class='c-n'>1</span> - jeton) / hiz)  <span class='c-c'>-- Retry-After</span>\n<span class='c-k'>end</span>"
    },
    leaky: {
      c: "#fbbf24", t: "Sızdıran kova (Leaky Bucket)", m: "Kuyruk seviyesi + son sızıntı anı",
      how: [
        "İstekler bir kuyruğa alınır; kuyruk sabit hızda <b>boşalır</b> (sızar).",
        "Kuyrukta yer varsa istek kabul edilir, yoksa reddedilir.",
        "Çıkış hızı her koşulda sabittir — giriş ne kadar düzensiz olursa olsun.",
        "Jeton kovasının aynadaki görüntüsüdür: o <b>girişi</b>, bu <b>çıkışı</b> sınırlar."
      ],
      f: "seviye = max(0, seviye − Δt × sızma) &nbsp;·&nbsp; izin = seviye &lt; kapasite",
      pro: "<b>Arka uca sabit hız garantisi.</b> Ani yük kuyrukta emilir ve upstream düzgün bir akış görür. Kapasite planlaması yapılabilir hâle gelir.",
      con: "Kuyrukta bekleyen istek <b>gecikme</b> demektir; istemci çoktan vazgeçmiş olabilir ve iş boşa yapılır. Bu yüzden kuyruğa da bir bekleme bütçesi konmalıdır.",
      use: "Arka ucun kesinlikle sabit hız istediği durumlar: eski sistemler, ödeme ağ geçitleri, SMS/e-posta sağlayıcıları, toplu iş kuyrukları.",
      code: "<span class='c-c'>-- kuyruk sabit hızda boşalır</span>\n<span class='c-k'>local</span> gecen = (simdi - ts) / <span class='c-n'>1000</span>\nseviye = math.<span class='c-f'>max</span>(<span class='c-n'>0</span>, seviye - gecen * sizma)\n<span class='c-k'>if</span> seviye &lt; kapasite <span class='c-k'>then</span>\n  seviye = seviye + <span class='c-n'>1</span>; izin = <span class='c-n'>1</span>\n  bekleme = seviye / sizma        <span class='c-c'>-- tahmini gecikme</span>\n<span class='c-k'>end</span>"
    }
  };
  function runRl() {
    var cv = $("#rlCv"); if (!cv) return;
    var WIN = 2000, LIMIT = 5, SPAN = 6000;
    var ROWS = [
      { k: "fixed", n: "Sabit pencere", g: "pencere sayacı" },
      { k: "slide", n: "Kayan pencere", g: "son 2 sn kaydı" },
      { k: "token", n: "Jeton kovası", g: "kalan jeton" },
      { k: "leaky", n: "Sızdıran kova", g: "kuyruk doluluğu" }
    ];
    var st = { fixed: { ws: 0, n: 0 }, slide: { log: [] }, token: { tk: LIMIT, ts: 0 }, leaky: { lv: 0, ts: 0 } };
    var arrivals = [], paused = false, t0 = performance.now(), nextAt = 300;

    function decide(t) {
      var r = {};
      var f = st.fixed;
      if (t - f.ws >= WIN) { f.ws = Math.floor(t / WIN) * WIN; f.n = 0; }
      r.fixed = f.n < LIMIT; if (r.fixed) f.n++;
      var s = st.slide;
      s.log = s.log.filter(function (x) { return t - x < WIN; });
      r.slide = s.log.length < LIMIT; if (r.slide) s.log.push(t);
      var tb = st.token, rate = LIMIT / (WIN / 1000);
      tb.tk = Math.min(LIMIT, tb.tk + (t - tb.ts) / 1000 * rate); tb.ts = t;
      r.token = tb.tk >= 1; if (r.token) tb.tk -= 1;
      var lb = st.leaky;
      lb.lv = Math.max(0, lb.lv - (t - lb.ts) / 1000 * rate); lb.ts = t;
      r.leaky = lb.lv < LIMIT; if (r.leaky) lb.lv += 1;
      return r;
    }
    var burstBtn = $("#rlBurst"), pauseBtn = $("#rlPause"), steadyBtn = $("#rlSteady");
    var steady = false, sel = "token", stats = { fixed: [0, 0], slide: [0, 0], token: [0, 0], leaky: [0, 0] };
    function showDoc(k) {
      sel = k;
      var d = RL_DOC[k];
      $("#rlPanel").innerHTML =
        '<div class="hp-k" style="color:' + d.c + '">' + d.m + '</div>' +
        '<div class="hp-t">' + d.t + '</div>' +
        '<div class="hp-d"><b>Nasıl çalışır:</b><ol style="margin:7px 0 0 1.1em;display:grid;gap:5px">' +
          d.how.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol>" +
        '<div style="margin-top:10px;padding:9px 11px;background:var(--s3);border-radius:6px;' +
          'font-family:var(--mono);font-size:12.5px;color:' + d.c + '">' + d.f + '</div>' +
        '<div style="margin-top:10px"><b style="color:var(--good)">Artısı:</b> ' + d.pro + '</div>' +
        '<div style="margin-top:7px"><b style="color:var(--danger)">Eksisi:</b> ' + d.con + '</div>' +
        '<div style="margin-top:7px"><b style="color:var(--accent-2)">Nerede kullanılır:</b> ' + d.use + '</div></div>';
      $("#rlCode").innerHTML =
        '<div class="hd"><svg><use href="#i-code"/></svg> ' + d.t +
        ' <span class="tag">dağıtık gerçeklenim</span></div><pre>' + d.code + "</pre>";
    }
    ev(burstBtn, "click", function () {
      var t = performance.now() - t0;
      for (var i = 0; i < 8; i++) { var tt = t + i * 5; arrivals.push({ t: tt, r: decide(tt), burst: true }); }
    });
    ev(pauseBtn, "click", function () {
      paused = !paused;
      pauseBtn.innerHTML = paused ? '<svg><use href="#i-play"/></svg> Devam' : '<svg><use href="#i-pause"/></svg> Duraklat';
    });
    ev(steadyBtn, "click", function () {
      steady = !steady;
      steadyBtn.innerHTML = steady
        ? '<svg><use href="#i-repeat"/></svg> Normal akışa dön'
        : '<svg><use href="#i-repeat"/></svg> Sabit yüksek akış';
      $("#rlRate").textContent = steady ? "akış: ~6,5 istek/sn" : "akış: ~2,6 istek/sn";
    });
    cv.style.cursor = "pointer";
    ev(cv, "click", function (e) {
      var r = cv.getBoundingClientRect();
      var row = Math.floor((e.clientY - r.top) / (r.height / ROWS.length));
      showDoc(ROWS[Math.max(0, Math.min(ROWS.length - 1, row))].k);
    });
    showDoc(sel);

    loop(function () {
      var t = performance.now() - t0;
      if (!paused && !reduce) {
        if (t - nextAt > 8000) nextAt = t;
        while (nextAt < t) {
          arrivals.push({ t: nextAt, r: decide(nextAt) });
          nextAt += steady ? (130 + Math.random() * 60) : (250 + Math.random() * 520);
        }
        if (arrivals.length > 260) arrivals.splice(0, arrivals.length - 260);
      }
      /* pencere içi kabul/ret sayımı — hangi algoritmanın ne yaptığını sayısallaştırır */
      ROWS.forEach(function (row) { stats[row.k] = [0, 0]; });
      arrivals.forEach(function (a) {
        if (t - a.t > SPAN) return;
        ROWS.forEach(function (row) { stats[row.k][a.r[row.k] ? 0 : 1]++; });
      });

      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var LX = 10, LW = Math.min(150, W * 0.23), GW = 132;
      var TX = LX + LW + 8, TW = Math.max(60, W - TX - GW - 12);
      var rh = H / ROWS.length;

      c.clearRect(0, 0, W, H);
      ROWS.forEach(function (row, i) {
        var y = i * rh, mid = y + rh / 2;
        var doc = RL_DOC[row.k], on = sel === row.k;

        /* seçili satırı vurgula */
        if (on) {
          c.fillStyle = "rgba(255,255,255,.030)"; c.fillRect(0, y, W, rh);
          c.fillStyle = doc.c; c.fillRect(0, y, 3, rh);
        }
        if (i > 0) { c.strokeStyle = C.line; c.lineWidth = 1; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

        c.textAlign = "left";
        c.fillStyle = on ? doc.c : C.t1; c.font = (on ? "700 " : "600 ") + "12.5px " + C.sans;
        c.fillText(row.n, LX, mid - 8);
        c.fillStyle = C.t3; c.font = "9.5px " + C.mono; c.fillText(row.g, LX, mid + 6);
        /* satır içi kabul/ret sayacı */
        c.font = "9.5px " + C.mono;
        c.fillStyle = C.acc2; c.fillText("✓ " + stats[row.k][0], LX, mid + 21);
        c.fillStyle = C.danger; c.fillText("✕ " + stats[row.k][1], LX + 42, mid + 21);

        /* zaman ekseni */
        c.strokeStyle = C.line; c.lineWidth = 1;
        c.beginPath(); c.moveTo(TX, mid); c.lineTo(TX + TW, mid); c.stroke();

        /* --- algoritmaya özgü arka plan görselleştirmesi --- */
        if (row.k === "fixed") {
          /* pencere dilimleri: dolgu yoğunluğu o dilimdeki sayaç */
          for (var w = Math.floor((t - SPAN) / WIN) * WIN; w < t + WIN; w += WIN) {
            var x1 = TX + (w - (t - SPAN)) / SPAN * TW;
            var x2 = TX + (w + WIN - (t - SPAN)) / SPAN * TW;
            x1 = Math.max(TX, x1); x2 = Math.min(TX + TW, x2);
            if (x2 <= x1) continue;
            var cnt = arrivals.filter(function (a) { return a.t >= w && a.t < w + WIN && a.r.fixed; }).length;
            c.fillStyle = "rgba(248,113,113," + Math.min(.20, cnt / LIMIT * .18) + ")";
            c.fillRect(x1, y + 6, x2 - x1, rh - 12);
            c.strokeStyle = "rgba(251,191,36,.55)"; c.setLineDash([3, 3]); c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(x1, y + 6); c.lineTo(x1, y + rh - 6); c.stroke(); c.setLineDash([]);
          }
        } else if (row.k === "slide") {
          /* kayan pencere: şimdiden geriye WIN kadar taralı bant */
          var sx = TX + (t - WIN - (t - SPAN)) / SPAN * TW;
          c.fillStyle = "rgba(56,225,200,.09)";
          c.fillRect(Math.max(TX, sx), y + 6, TX + TW - Math.max(TX, sx), rh - 12);
          c.strokeStyle = "rgba(56,225,200,.5)"; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(Math.max(TX, sx), y + 6); c.lineTo(Math.max(TX, sx), y + rh - 6); c.stroke();
        } else if (row.k === "token") {
          /* jeton kovası: doluluk zaman içinde eğri olarak */
          c.beginPath();
          for (var px = 0; px <= TW; px += 4) {
            var tt = (t - SPAN) + px / TW * SPAN;
            var used = arrivals.filter(function (a) { return a.t <= tt && a.r.token; }).length;
            var refill = Math.max(0, tt) / 1000 * (LIMIT / (WIN / 1000));
            var lvl = Math.max(0, Math.min(LIMIT, LIMIT + refill - used));
            var py = mid + (rh / 2 - 10) - (lvl / LIMIT) * (rh - 22);
            px ? c.lineTo(TX + px, py) : c.moveTo(TX + px, py);
          }
          c.strokeStyle = "rgba(91,140,255,.6)"; c.lineWidth = 1.6; c.stroke();
        } else {
          /* sızdıran kova: sabit çıkış hızı bandı */
          c.strokeStyle = "rgba(251,191,36,.35)"; c.setLineDash([2, 4]); c.lineWidth = 1;
          c.beginPath(); c.moveTo(TX, mid - 14); c.lineTo(TX + TW, mid - 14); c.stroke(); c.setLineDash([]);
          c.fillStyle = "rgba(251,191,36,.55)"; c.font = "8.5px " + C.mono;
          c.fillText("sabit çıkış hızı", TX + 4, mid - 17);
        }

        /* --- istekler --- */
        arrivals.forEach(function (a) {
          if (t - a.t > SPAN) return;
          var x = TX + (a.t - (t - SPAN)) / SPAN * TW;
          var ok = a.r[row.k], age = (t - a.t) / SPAN;
          c.globalAlpha = Math.max(.28, 1 - age * .72);
          if (ok) {
            c.fillStyle = C.acc2;
            c.beginPath(); c.arc(x, mid - 9, a.burst ? 3.8 : 3.2, 0, Math.PI * 2); c.fill();
            if (a.burst) { c.strokeStyle = C.acc2; c.lineWidth = 1; c.beginPath(); c.arc(x, mid - 9, 6, 0, Math.PI * 2); c.stroke(); }
          } else {
            c.strokeStyle = C.danger; c.lineWidth = 1.4;
            c.beginPath(); c.moveTo(x - 3, mid + 6); c.lineTo(x + 3, mid + 12);
            c.moveTo(x + 3, mid + 6); c.lineTo(x - 3, mid + 12); c.stroke();
          }
          c.globalAlpha = 1;
        });

        /* --- iç durum göstergesi --- */
        var v = 0, lbl = "", sub = "";
        if (row.k === "fixed") {
          v = st.fixed.n / LIMIT; lbl = st.fixed.n + " / " + LIMIT;
          sub = "sıfırlanmaya " + Math.max(0, ((st.fixed.ws + WIN - t) / 1000)).toFixed(1) + " sn";
        }
        if (row.k === "slide") {
          var n2 = st.slide.log.filter(function (x) { return t - x < WIN; }).length;
          v = n2 / LIMIT; lbl = n2 + " / " + LIMIT; sub = n2 + " zaman damgası";
        }
        if (row.k === "token") {
          var tk = Math.min(LIMIT, st.token.tk + (t - st.token.ts) / 1000 * (LIMIT / (WIN / 1000)));
          v = 1 - tk / LIMIT; lbl = tk.toFixed(1) + " jeton"; sub = "doldurma 2,5/sn";
        }
        if (row.k === "leaky") {
          var lv = Math.max(0, st.leaky.lv - (t - st.leaky.ts) / 1000 * (LIMIT / (WIN / 1000)));
          v = lv / LIMIT; lbl = lv.toFixed(1) + " / " + LIMIT;
          sub = "bekleme ~" + (lv / 2.5).toFixed(1) + " sn";
        }
        var gx = TX + TW + 12, gw = GW - 24, gy = mid - 14;
        c.fillStyle = C.s3; rr(c, gx, gy, gw, 14, 4); c.fill();
        c.fillStyle = v > .85 ? C.danger : doc.c;
        rr(c, gx, gy, Math.max(2, gw * Math.min(1, v)), 14, 4); c.fill();
        c.fillStyle = C.t1; c.font = "10px " + C.mono; c.textAlign = "left";
        c.fillText(lbl, gx, gy + 27);
        c.fillStyle = C.t3; c.font = "8.5px " + C.mono;
        c.fillText(sub, gx, gy + 39);
      });

      /* "şimdi" çizgisi */
      c.strokeStyle = C.acc; c.globalAlpha = .35; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(TX + TW, 0); c.lineTo(TX + TW, H); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = C.acc; c.font = "8.5px " + C.mono; c.textAlign = "right";
      c.fillText("şimdi", TX + TW - 4, 10); c.textAlign = "left";
    });
  }

  /* ═══════════════════════════ 9 · RETRY FIRTINASI ════════════════════════ */
  function runRetry() {
    var cv = $("#retryCv"); if (!cv) return;
    var stat = $("#retryStat");
    var t0 = performance.now();
    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var el = reduce ? 9000 : (now - t0) % 9000;
      c.clearRect(0, 0, W, H);

      var padL = 14, padR = 14, baseY = H - 34;
      var w = W - padL - padR;
      var STEPS = 40;
      var bw = w / STEPS;
      // arka uç yavaşlama eğrisi
      var slow = Math.min(1, Math.max(0, (el - 1500) / 4200));
      var lay = [
        { c: C.acc2, f: 1 },
        { c: C.warn, f: slow * 0.85 },
        { c: C.danger, f: Math.max(0, slow - 0.35) * 1.1 }
      ];
      var maxH = H - 62;
      for (var i = 0; i < STEPS; i++) {
        var x = padL + i * bw;
        var appear = i / STEPS;
        if (appear > el / 9000 * 1.25) continue;
        var acc = 0;
        for (var L = 0; L < lay.length; L++) {
          var hh = maxH * 0.30 * lay[L].f;
          if (hh < 0.5) continue;
          c.fillStyle = lay[L].c;
          c.globalAlpha = .85;
          c.fillRect(x + 1, baseY - acc - hh, Math.max(1, bw - 2), hh);
          acc += hh;
        }
        c.globalAlpha = 1;
      }
      // kapasite çizgisi
      var capY = baseY - maxH * 0.42;
      c.strokeStyle = C.t3; c.setLineDash([5, 4]); c.lineWidth = 1;
      c.beginPath(); c.moveTo(padL, capY); c.lineTo(W - padR, capY); c.stroke(); c.setLineDash([]);
      c.fillStyle = C.t3; c.font = "10px " + C.mono; c.textAlign = "left";
      c.fillText("arka uç kapasitesi", padL + 4, capY - 6);
      c.fillText("zaman →", padL, H - 10);

      var mult = (1 + lay[1].f + lay[2].f);
      if (stat) {
        stat.innerHTML = '<span style="font-family:' + C.mono + '">yük çarpanı <b style="color:' +
          (mult > 2 ? C.danger : mult > 1.4 ? C.warn : C.acc2) + '">' + mult.toFixed(1).replace(".", ",") + '×</b></span>';
      }
    });
  }

  /* ═══════════════════════════ 10 · CIRCUIT BREAKER ═══════════════════════ */
  function runCb() {
    var cv = $("#cbCv"); if (!cv) return;
    var TICK = 120, OPEN_MS = 3000, HALF_N = 5, SIZE = 20, MINC = 10, THRESH = 50;
    var TIME_MS = 10000, CONSEC = 5, SLOW_THRESH = 60;

    /* Dört strateji AYNI arıza akışını tüketir; her biri bağımsız karar verir.
       Böylece "hangisi daha erken açar / daha çok yanlış keser" sorusu ölçülebilir. */
    var STRATS = [
      { k: "count", n: "Sayı tabanlı pencere", ic: "i-layers", tag: "varsayılan",
        cfg: "COUNT_BASED · size 20 · min 10 · failureRate %50",
        yml: "slidingWindowType: COUNT_BASED · slidingWindowSize: 20",
        why: "Resilience4j varsayılanı. Son <b>20 çağrının</b> en az %50'si başarısızsa açar. Trafik seyrekse pencere yavaş dolar; gece 2'de gelen 3 hata gündüzdeki 3 hatayla aynı ağırlıkta değildir ama pencere bunu ayırt etmez.",
        pro: "Bellek sabit, karar ucuz, kavraması kolay. Yüksek hacimde en hızlı tepki.",
        con: "Karar hızı trafiğe bağlı. Düşük hacimde pencere dolmadan devre hiç açılmaz.",
        use: "Sabit ve yüksek hacimli, öngörülebilir trafikte." },
      { k: "time", n: "Zaman tabanlı pencere", ic: "i-clock", tag: "hacimden bağımsız",
        cfg: "TIME_BASED · 10 sn · min 10 · failureRate %50",
        yml: "slidingWindowType: TIME_BASED · slidingWindowSize: 10",
        why: "Son <b>10 saniyeyi</b> değerlendirir. Karar hızı trafik hacminden bağımsızdır: yükseldiğinde de düştüğünde de aynı sürede tepki verir. Eski sonuçlar zamanla pencereden düşer, hafıza taşımaz.",
        pro: "Tepki süresi öngörülebilir; SLO'yla aynı dilde konuşur (\"10 sn içinde karar\").",
        con: "Yoğun trafikte daha fazla bellek; kısa ani patlamaları yumuşatarak geciktirir.",
        use: "Trafiği gün içinde 10 kat dalgalanan uçlarda." },
      { k: "consec", n: "Ardışık hata sayacı", ic: "i-stack", tag: "klasik",
        cfg: "consecutiveFailures 5 (Hystrix öncesi klasik yaklaşım)",
        yml: "Resilience4j'de doğrudan yok — kendi TransitionCheck'iniz",
        why: "<b>5 çağrı üst üste</b> başarısızsa açar. En hızlı ve en az yanlış kesme yapan yaklaşım — ama %40 hata veren bir servisi neredeyse hiç yakalamaz, çünkü araya giren tek başarı sayacı sıfırlar.",
        pro: "Neredeyse sıfır yanlış kesme; tam çökmede en hızlısı; tek tam sayı durum.",
        con: "Kısmi bozulmaya kör. %40 hata veren servis günlerce fark edilmeden çalışır.",
        use: "Tam çöken (ya hep ya hiç) bağımlılıklarda; kısmi bozulmada zayıf." },
      { k: "slow", n: "Hata + yavaş çağrı", ic: "i-timer", tag: "önerilen",
        cfg: "failureRate %50 VEYA slowCallRate %60 · slowCallDurationThreshold 1 sn",
        yml: "slowCallRateThreshold: 60 · slowCallDurationThreshold: 1s",
        why: "Hata oranının yanı sıra <b>yavaş çağrı oranını</b> da izler. Gerçek olayların çoğunda arka uç hata dönmez, yavaşlar: bağlantı havuzu dolar, kuyruk büyür, timeout'a kadar iplik tutulur. Sadece hataya bakan strateji bunu göremez.",
        pro: "Üretimdeki asıl arıza şeklini — sessiz yavaşlamayı — yakalayan tek strateji.",
        con: "İki eşik ayarlamak gerekir; yavaşlık süresi yanlış seçilirse gereksiz açar.",
        use: "Neredeyse her yerde — üretimdeki asıl arıza şekli yavaşlamadır." }
    ];

    var SPC = ["#5b8cff", "#38e1c8", "#f0a15c", "#a78bfa"];
    var sel = 0, playing = true, rate = 10, slowRate = 5, tape = [], last = 0, hist = [];
    var els = { c: $("#cbClosed"), o: $("#cbOpen"), h: $("#cbHalf") };

    function mk() {
      return STRATS.map(function () {
        return { state: "CLOSED", win: [], slowWin: [], tw: [], streak: 0, openedAt: 0,
                 half: [], saved: 0, wasted: 0, falseBlock: 0, trips: 0 };
      });
    }
    var S = mk();

    /* ── kontroller ─────────────────────────────────────────────────────── */
    var pillWrap = $("#cbStrat");
    pillWrap.innerHTML = STRATS.map(function (s, i) {
      return '<button class="pill' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' +
        '<svg><use href="#' + s.ic + '"/></svg>' + s.n + "</button>";
    }).join("");
    function pick(i) {
      sel = i;
      $$("#cbStrat .pill").forEach(function (p, j) { p.classList.toggle("on", j === i); });
      $$("#cbCmp .cbrow").forEach(function (r, j) { r.classList.toggle("on", j === i); });
      $$("#cbSpec .cbsp").forEach(function (r, j) {
        r.classList.toggle("on", j === i);
        r.style.borderLeftColor = j === i ? SPC[j] : "var(--s3)";
      });
    }
    ev(pillWrap, "click", function (e) {
      var b = e.target.closest(".pill"); if (b) pick(+b.dataset.i);
    });

    var playBtn = $("#cbPlay");
    function paint() {
      playBtn.innerHTML = playing ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Devam et';
    }
    paint();
    ev(playBtn, "click", function () { playing = !playing; paint(); });
    ev($("#cbReset"), "click", function () { S = mk(); tape = []; hist = []; });

    var rateEl = $("#cbRate"), slowEl = $("#cbSlow");
    rate = +rateEl.value; slowRate = +slowEl.value;
    function lbls() {
      $("#cbRateLbl").textContent = rate + "%"; $("#cbSlowLbl").textContent = slowRate + "%";
    }
    lbls();
    ev(rateEl, "input", function (e) { rate = +e.target.value; lbls(); });
    ev(slowEl, "input", function (e) { slowRate = +e.target.value; lbls(); });

    var SCEN = { healthy: [2, 3], flap: [45, 20], down: [95, 5], slow: [2, 85] };
    $$("#slide-cb [data-scen]").forEach(function (b) {
      ev(b, "click", function () {
        var v = SCEN[b.dataset.scen];
        rate = v[0]; slowRate = v[1]; rateEl.value = rate; slowEl.value = slowRate; lbls();
        S = mk(); tape = []; hist = [];
        $$("#slide-cb [data-scen]").forEach(function (o) { o.classList.toggle("on", o === b); });
      });
    });

    /* karşılaştırma satırları */
    $("#cbCmp").innerHTML = STRATS.map(function (s, i) {
      return '<div class="cbrow' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' +
        '<div class="cbn2"><svg><use href="#' + s.ic + '"/></svg>' + s.n +
          '<svg class="cbw"><use href="#i-check"/></svg></div>' +
        '<div><span class="cbst c" data-st="' + i + '">kapalı</span></div>' +
        '<div class="num2" style="color:var(--good)" data-sv="' + i + '">0</div>' +
        '<div class="num2" style="color:var(--danger)" data-wa="' + i + '">0</div>' +
        '<div class="num2" style="color:var(--warn)" data-fb="' + i + '">0</div>' +
        '<div><div class="num2" data-pr="' + i + '">—</div>' +
        '<div class="cbbar"><i data-bar="' + i + '" style="width:0%"></i></div></div></div>';
    }).join("");
    ev($("#cbCmp"), "click", function (e) {
      var r = e.target.closest(".cbrow"); if (r) pick(+r.dataset.i);
    });

    /* sağ kolon künyeleri: yapılandırma ↔ davranış bağını kurar */
    $("#cbSpec").innerHTML = STRATS.map(function (s, i) {
      return '<div class="cbsp' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' +
        '<div class="cbsp-h"><svg style="color:' + SPC[i] + '"><use href="#' + s.ic + '"/></svg>' + s.n +
          '<span class="cbsp-t">' + s.tag + "</span></div>" +
        '<div class="cbsp-c">' + s.yml + "</div>" +
        '<div class="cbsp-b">' + s.why +
          '<div class="pm"><div class="p"><b>Artısı</b>' + s.pro + "</div>" +
          '<div class="m"><b>Eksisi</b>' + s.con + "</div></div>" +
          '<div style="margin-top:7px"><span style="color:var(--accent-2)">Nerede kullanılır:</span> ' + s.use + "</div>" +
        "</div></div>";
    }).join("");
    ev($("#cbSpec"), "click", function (e) {
      var r = e.target.closest(".cbsp"); if (r) pick(+r.dataset.i);
    });
    pick(0);

    /* ── durum makinesi (strateji başına) ───────────────────────────────── */
    function fr(a) { return a.length ? a.filter(function (x) { return x; }).length / a.length * 100 : 0; }
    function shouldOpen(st, i, now) {
      if (i === 0) return st.win.length >= MINC && fr(st.win) >= THRESH;
      if (i === 1) {
        st.tw = st.tw.filter(function (r) { return now - r.t < TIME_MS; });
        var f = st.tw.filter(function (r) { return r.f; }).length;
        return st.tw.length >= MINC && f / st.tw.length * 100 >= THRESH;
      }
      if (i === 2) return st.streak >= CONSEC;
      var okF = st.win.length >= MINC && fr(st.win) >= THRESH;
      var okS = st.slowWin.length >= MINC && fr(st.slowWin) >= SLOW_THRESH;
      return okF || okS;
    }
    function step(i, now, o) {
      var st = S[i];
      if (st.state === "OPEN") {
        /* Kesilen çağrı: arka uç gerçekten bozuksa kazanç, sağlıklıysa kayıp. */
        if (o.fail || o.slow) st.saved++; else st.falseBlock++;
        if (now - st.openedAt >= OPEN_MS) { st.state = "HALF"; st.half = []; }
        return;
      }
      var bad = i === 3 ? (o.fail || o.slow) : o.fail;
      if (st.state === "HALF") {
        if (bad) st.wasted++;
        st.half.push(bad);
        if (st.half.length >= HALF_N) {
          if (fr(st.half) >= THRESH) { st.state = "OPEN"; st.openedAt = now; st.trips++; }
          else { st.state = "CLOSED"; st.win = []; st.slowWin = []; st.tw = []; st.streak = 0; }
        }
        return;
      }
      if (bad) st.wasted++;
      st.win.push(o.fail); if (st.win.length > SIZE) st.win.shift();
      st.slowWin.push(o.slow); if (st.slowWin.length > SIZE) st.slowWin.shift();
      st.tw.push({ t: now, f: o.fail });
      st.streak = o.fail ? st.streak + 1 : 0;
      if (shouldOpen(st, i, now)) { st.state = "OPEN"; st.openedAt = now; st.trips++; }
    }

    /* ── çizim ──────────────────────────────────────────────────────────── */
    var STC = { CLOSED: "c", OPEN: "o", HALF: "h" };
    var STN = { CLOSED: "kapalı", OPEN: "açık", HALF: "yarı açık" };

    loop(function (now) {
      if (playing && !reduce && now - last > TICK) {
        last = now;
        var o = { fail: Math.random() * 100 < rate, slow: false };
        if (!o.fail) o.slow = Math.random() * 100 < slowRate;   /* yavaş = hata değil */
        tape.push(o); if (tape.length > 200) tape.shift();
        for (var i = 0; i < 4; i++) step(i, now, o);
        hist.push(S.map(function (s) { return s.state; }));
        if (hist.length > 200) hist.shift();
      }

      var cur = S[sel], meta = STRATS[sel];
      els.c.classList.toggle("on", cur.state === "CLOSED");
      els.o.classList.toggle("on", cur.state === "OPEN");
      els.h.classList.toggle("on", cur.state === "HALF");

      /* seçili stratejinin ölçüm penceresi */
      var wtxt, wrate;
      if (sel === 1) { wtxt = cur.tw.length + " çağrı/10 sn"; wrate = fr(cur.tw.map(function (r) { return r.f; })); }
      else if (sel === 2) { wtxt = cur.streak + "/" + CONSEC + " ardışık"; wrate = cur.streak / CONSEC * 100; }
      else if (sel === 3) {
        wtxt = cur.win.length + "/" + SIZE;
        wrate = Math.max(fr(cur.win) / THRESH, fr(cur.slowWin) / SLOW_THRESH) * 100;
      } else { wtxt = cur.win.length + "/" + SIZE; wrate = fr(cur.win); }
      if (cur.state === "HALF") { wtxt = cur.half.length + "/" + HALF_N; wrate = fr(cur.half); }
      $("#cbWin").textContent = wtxt;
      $("#cbFail").textContent = Math.round(Math.min(100, wrate)) + "%";
      $("#cbSaved").textContent = nf(cur.saved);
      $("#cbWasted").textContent = nf(cur.wasted);
      $("#cbFalse").textContent = nf(cur.falseBlock);
      $("#cbTrips").textContent = cur.trips;

      var best = -1, bestPr = -1, anyTrip = false, prs = [];
      for (var j = 0; j < 4; j++) {
        var s2 = S[j], b = $('[data-st="' + j + '"]');
        b.className = "cbst " + STC[s2.state]; b.textContent = STN[s2.state];
        $('[data-sv="' + j + '"]').textContent = nf(s2.saved);
        $('[data-wa="' + j + '"]').textContent = nf(s2.wasted);
        $('[data-fb="' + j + '"]').textContent = nf(s2.falseBlock);
        /* Hiç açılmamış devre için oran anlamsız: sağlıklı bir arka uçta 0 puan
           "başarısız" gibi okunur. Böyle durumda tire gösterilir. */
        var tot = s2.saved + s2.wasted;
        var pr = (!tot || (!s2.saved && !s2.trips)) ? -1 : s2.saved / tot * 100;
        prs.push(pr);
        if (s2.trips) anyTrip = true;
        if (pr > bestPr) { bestPr = pr; best = j; }
        var pe = $('[data-pr="' + j + '"]'), bar = $('[data-bar="' + j + '"]');
        pe.textContent = pr < 0 ? "—" : Math.round(pr) + "%";
        pe.style.color = pr < 0 ? C.t3 : pr >= 60 ? C.good : pr >= 30 ? C.warn : C.danger;
        bar.style.width = Math.max(0, pr) + "%";
        bar.style.background = pr >= 60 ? C.good : pr >= 30 ? C.warn : C.danger;
      }
      $$("#cbCmp .cbrow").forEach(function (r, j) {
        r.classList.toggle("win", anyTrip && j === best && prs[j] > 0);
      });

      /* hüküm: sayılar ne söylüyor */
      var vd = $("#cbVerdict").querySelector("div");
      if (!anyTrip) {
        vd.innerHTML = rate + slowRate < 25
          ? "Arka uç sağlıklı: <b>hiçbir devre açılmadı</b> ve açılmaması doğru. Devre kesicinin başarısı ne kadar sık açtığıyla değil, <b>gerektiğinde</b> açmasıyla ölçülür."
          : "Henüz kimse açmadı — pencereler doluyor. <b>minimumNumberOfCalls</b> eşiği aşılmadan hiçbir strateji karar vermez.";
      } else {
        var w = STRATS[best], lo = prs.indexOf(Math.min.apply(null, prs.filter(function (x) { return x >= 0; })));
        vd.innerHTML = "Şu anki yükte en iyi koruma <b style='color:var(--good)'>" + w.n + "</b> " +
          "(%" + Math.round(bestPr) + "). " +
          (slowRate >= 50 && rate < 20
            ? "Hata değil <b>yavaşlık</b> var: yalnızca yavaş çağrı oranını izleyen strateji bunu görebiliyor, diğer üçü kör."
            : rate >= 80
              ? "Arka uç tamamen çökmüş durumda; bu senaryoda dört strateji de yakınsıyor — <b>ayrım kısmi bozulmada ortaya çıkar</b>."
              : "Dikkat: <b>yanlış kesme</b> sütunu da artıyor. Hızlı açan strateji sağlıklı çağrıları da reddeder; " +
                "eşiği düşürmek koruma ile yanlış kesme arasında <b>takas</b> yapmaktır." ) +
          (lo >= 0 && lo !== best ? " En zayıfı <b style='color:var(--danger)'>" + STRATS[lo].n + "</b>." : "");
      }

      /* açıklama */
      var nb = $("#cbNote").querySelector("div");
      var head = cur.state === "CLOSED" ? "<b style='color:var(--good)'>KAPALI</b>"
        : cur.state === "OPEN" ? "<b style='color:var(--danger)'>AÇIK</b>"
        : "<b style='color:var(--warn)'>YARI AÇIK</b>";
      nb.innerHTML = head + " · <b>" + meta.n + "</b> — " + meta.why +
        "<br><span style='color:var(--t3);font-family:var(--mono);font-size:11px'>" + meta.cfg + "</span>" +
        "<br><span style='color:var(--accent-2)'>Nerede:</span> " + meta.use;

      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);
      var pad = 10;

      /* --- üst: seçili stratejinin karar penceresi --- */
      c.font = "9px " + C.mono; c.fillStyle = C.t3; c.textAlign = "left";
      var ttl = cur.state === "HALF" ? "YARI AÇIK DENEME PENCERESİ · " + HALF_N + " ÇAĞRI"
        : sel === 1 ? "ZAMAN PENCERESİ · SON 10 SANİYE"
        : sel === 2 ? "ARDIŞIK HATA SAYACI · " + CONSEC + " İLE AÇILIR"
        : "KAYAN PENCERE · SON " + SIZE + " ÇAĞRI";
      c.fillText(ttl, pad, 12);
      c.textAlign = "right"; c.fillStyle = C.t3;
      c.fillText("yeşil başarı · kırmızı hata · turuncu yavaş", W - pad, 12);
      c.textAlign = "left";

      var y = 20, chh = Math.max(18, H * 0.17), N, cells = [];
      if (cur.state === "HALF") {
        N = HALF_N;
        cells = cur.half.map(function (f) { return f ? 2 : 0; });
      } else if (sel === 1) {
        N = Math.max(12, cur.tw.length);
        cells = cur.tw.map(function (r) { return r.f ? 2 : 0; });
      } else if (sel === 2) {
        N = CONSEC;
        for (var q = 0; q < Math.min(CONSEC, cur.streak); q++) cells.push(2);
      } else {
        N = SIZE;
        cells = cur.win.map(function (f, ix) { return f ? 2 : (cur.slowWin[ix] ? 1 : 0); });
      }
      var cw = (W - pad * 2) / N;
      for (var i2 = 0; i2 < N; i2++) {
        var x = pad + i2 * cw + 1.5, ww = Math.max(2, cw - 3), v = cells[i2];
        c.fillStyle = i2 < cells.length ? (v === 2 ? C.danger : v === 1 ? C.amber : C.good) : C.s3;
        rr(c, x, y, ww, chh, 3); c.fill();
      }

      /* --- orta: eşik çubuğu --- */
      var by = y + chh + 12, bw = W - pad * 2, hb = 8;
      var shown = Math.min(100, wrate);
      c.fillStyle = C.s3; rr(c, pad, by, bw, hb, 4); c.fill();
      c.fillStyle = shown >= 100 || (sel !== 2 && shown >= THRESH) ? C.danger : C.good;
      rr(c, pad, by, Math.max(2, bw * shown / 100), hb, 4); c.fill();
      var tx = pad + bw * (sel === 2 || sel === 3 ? 100 : THRESH) / 100;
      c.strokeStyle = C.acc; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(tx - 1, by - 5); c.lineTo(tx - 1, by + hb + 5); c.stroke();
      c.fillStyle = C.acc; c.font = "9px " + C.mono; c.textAlign = "right";
      c.fillText(sel === 2 ? CONSEC + " ardışık" : sel === 3 ? "eşiğe doluluk" : "eşik %" + THRESH, tx - 5, by - 8);
      c.textAlign = "left";

      /* --- alt: dört stratejinin durum şeridi (zaman içinde ayrışma) --- */
      var ry = by + hb + 20, rh = Math.max(7, (H - ry - 6) / 4 - 4);
      for (var k = 0; k < 4; k++) {
        var yy = ry + k * (rh + 4);
        c.fillStyle = C.s2; rr(c, pad + 74, yy, W - pad * 2 - 74, rh, 2); c.fill();
        c.font = "8.5px " + C.mono; c.textAlign = "left";
        c.fillStyle = k === sel ? C.t1 : C.t3;
        c.fillText(STRATS[k].n.slice(0, 13), pad, yy + rh - 1);
        var n2 = hist.length, sw = (W - pad * 2 - 74) / 200;
        for (var m = 0; m < n2; m++) {
          var stt = hist[m][k];
          if (stt === "CLOSED") continue;
          c.fillStyle = stt === "OPEN" ? C.danger : C.warn;
          c.fillRect(pad + 74 + m * sw, yy, Math.max(1, sw + 0.6), rh);
        }
        if (k === sel) {
          c.strokeStyle = C.acc; c.lineWidth = 1;
          rr(c, pad + 74 - .5, yy - .5, W - pad * 2 - 74 + 1, rh + 1, 2); c.stroke();
        }
      }
      c.fillStyle = C.t3; c.font = "8.5px " + C.mono; c.textAlign = "right";
      c.fillText("kırmızı = devre açık · turuncu = yarı açık", W - pad, ry - 6);
      c.textAlign = "left";
    });
  }

  /* ═══════════════════════════ 11 · CANARY ════════════════════════════════ */
  function runCanary() {
    var cv = $("#cwCv"); if (!cv) return;
    var w = +$("#cwRange").value, dots2 = [], last = performance.now(), acc = 0;
    var TOTAL = 1000000, USERS = 12000;
    function set(v) {
      w = v; $("#cwRange").value = v; $("#cwLbl").textContent = v + "%";
      $("#cwA").style.width = (100 - v) + "%"; $("#cwB").style.width = v + "%";
      $("#cwReq").textContent = nf(Math.round(TOTAL * v / 100));
      $("#cwUsers").textContent = "~" + nf(Math.round(USERS * v / 100));
      $("#cwImpact").textContent = (2 * v / 100).toFixed(2).replace(".", ",") + "%";
      var rps = TOTAL / 86400 * v / 100, sec = rps > 0 ? 1000 / rps : Infinity;
      $("#cwDetect").textContent = !isFinite(sec) ? "—" : sec < 90 ? Math.round(sec) + " sn" :
        sec < 5400 ? "~" + Math.round(sec / 60) + " dk" : "~" + (sec / 3600).toFixed(1).replace(".", ",") + " sa";
      var n = $("#cwNote").querySelector("div");
      if (v === 0) n.innerHTML = "Canary kapalı. Tüm trafik kararlı sürümde.";
      else if (v <= 1) n.innerHTML = "<b>İlk adım.</b> Riski en aza indirir ama istatistiksel anlamlılık için gereken süre uzundur. Bu aşamada amaç hata oranını ölçmek değil, <b>ölümcül bir hatanın olmadığını</b> doğrulamaktır.";
      else if (v <= 10) n.innerHTML = "<b>Ölçüm aşaması.</b> Hata oranı ve p99 karşılaştırması için genelde yeterli hacim. Karşılaştırmayı kararlı sürümün <b>aynı andaki</b> metrikleriyle yapın, dünkü değerlerle değil.";
      else if (v < 50) n.innerHTML = "<b>Yayılım aşaması.</b> Artık gerçek bir kullanıcı kitlesi etkileniyor. Otomatik geri alma kapıları (hata oranı, gecikme, iş metriği) bu aşamada aktif olmalı.";
      else if (v < 100) n.innerHTML = "<b>Son doğrulama.</b> Kapasite ve kaynak tüketimi burada test edilir; düşük ağırlıkta görünmeyen bağlantı havuzu ve bellek sorunları burada ortaya çıkar.";
      else n.innerHTML = "<b>Tamamlandı.</b> Eski sürümü hemen silmeyin: birkaç saat sıcak yedek olarak bekletmek, geri alma süresini dakikalardan saniyelere indirir.";
    }
    var rangeEl = $("#cwRange");
    ev(rangeEl, "input", function (e) { set(+e.target.value); });
    $$("[data-cw]").forEach(function (b) { ev(b, "click", function () { set(+b.dataset.cw); }); });
    set(w);

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = Math.min(48, now - last); last = now;
      if (!reduce) { acc += dt; while (acc > 95) { acc -= 95; dots2.push({ p: 0, b: Math.random() * 100 < w }); } }
      if (dots2.length > 110) dots2.splice(0, dots2.length - 110);

      c.clearRect(0, 0, W, H);
      var sx = W * 0.10, mx = W * 0.42, ex = W * 0.80;
      var ya = H * 0.28, yb = H * 0.74;
      c.strokeStyle = C.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(sx, H / 2); c.lineTo(mx, H / 2); c.stroke();
      c.strokeStyle = "rgba(56,225,200,.34)";
      c.beginPath(); c.moveTo(mx, H / 2); c.bezierCurveTo(mx + 40, H / 2, ex - 60, ya, ex, ya); c.stroke();
      c.strokeStyle = "rgba(91,140,255,.34)";
      c.beginPath(); c.moveTo(mx, H / 2); c.bezierCurveTo(mx + 40, H / 2, ex - 60, yb, ex, yb); c.stroke();

      c.font = "11px " + C.sans; c.textAlign = "left";
      c.fillStyle = C.t3; c.fillText("gelen trafik", 6, H / 2 - 11);
      [["v1 · kararlı", ya, C.acc2], ["v2 · canary", yb, C.acc]].forEach(function (n) {
        c.fillStyle = C.s2; c.strokeStyle = n[2]; c.lineWidth = 1.3;
        rr(c, ex, n[1] - 14, Math.max(70, W - ex - 6), 28, 6); c.fill(); c.stroke();
        c.fillStyle = n[2]; c.font = "600 11.5px " + C.sans; c.fillText(n[0], ex + 9, n[1] + 4);
      });
      for (var i = dots2.length - 1; i >= 0; i--) {
        var d = dots2[i];
        if (!reduce) d.p += 0.0068 * dt;
        if (d.p > 1) { dots2.splice(i, 1); continue; }
        var x, y;
        if (d.p < 0.40) { var u = d.p / 0.40; x = sx + (mx - sx) * u; y = H / 2; }
        else {
          var u2 = (d.p - 0.40) / 0.60, ty = d.b ? yb : ya, mt = 1 - u2;
          var p0x = mx, p0y = H / 2, p1x = mx + 40, p1y = H / 2, p2x = ex - 60, p2y = ty, p3x = ex, p3y = ty;
          x = mt * mt * mt * p0x + 3 * mt * mt * u2 * p1x + 3 * mt * u2 * u2 * p2x + u2 * u2 * u2 * p3x;
          y = mt * mt * mt * p0y + 3 * mt * mt * u2 * p1y + 3 * mt * u2 * u2 * p2y + u2 * u2 * u2 * p3y;
        }
        c.fillStyle = d.b ? C.acc : C.acc2;
        c.beginPath(); c.arc(x, y, 2.7, 0, Math.PI * 2); c.fill();
      }
    });
  }

  /* ═══════════════════════════ 12 · BLAST RADIUS ══════════════════════════ */
  function runSpof() {
    var g = $("#ringGroup"), lbl = $("#ringLbl"); if (!g) return;
    var RINGS = [
      { r: 196, c: "#38e1c8", t: "1 · DNS / GSLB" },
      { r: 160, c: "#5b8cff", t: "2 · Anycast" },
      { r: 124, c: "#8b6cff", t: "3 · Çoklu AZ · L4 LB" },
      { r: 88, c: "#a78bfa", t: "4 · Çoklu gateway örneği" },
      { r: 52, c: "#f0a15c", t: "5 · Hücresel dağıtım" }
    ];
    g.innerHTML = RINGS.map(function (x, i) {
      return '<circle cx="210" cy="210" r="' + x.r + '" fill="none" stroke="' + x.c +
        '" stroke-width="2" stroke-opacity=".18" data-i="' + i + '"/>';
    }).join("") +
      '<circle cx="210" cy="210" r="26" fill="rgba(91,140,255,.10)" stroke="#5b8cff" stroke-width="1.4"/>' +
      '<text x="210" y="207" text-anchor="middle" fill="#5b8cff" font-size="11" font-weight="700" font-family="' + C.sans + '">API</text>' +
      '<text x="210" y="220" text-anchor="middle" fill="#5b8cff" font-size="11" font-weight="700" font-family="' + C.sans + '">GW</text>';
    var circles = $$("circle[data-i]", g);
    if (reduce) { circles.forEach(function (c2) { c2.setAttribute("stroke-opacity", ".65"); }); return; }
    var i = 0;
    function tick() {
      circles.forEach(function (c2, j) {
        c2.setAttribute("stroke-opacity", j === i ? ".95" : ".16");
        c2.setAttribute("stroke-width", j === i ? "3.4" : "2");
      });
      if (lbl) { lbl.textContent = RINGS[i].t; lbl.style.color = RINGS[i].c; }
      i = (i + 1) % RINGS.length;
    }
    tick();
    every(tick, 1700);
  }

  /* ═══════════════════════════ 13 · GECİKME BÜTÇESİ ═══════════════════════ */
  var LAT = [
    { k: "proxy", n: "Proxy temel maliyeti", ms: 0.30, on: true, fixed: true, net: 0, col: "#5b8cff", d: "Soket okuma/yazma, header ayrıştırma, upstream'e aktarım. Kaçınılmaz taban maliyet." },
    { k: "route", n: "Rota eşleme", ms: 0.05, on: true, net: 0, col: "#6f8fd8", d: "Radix ağacıyla binlerce rotada bile ihmal edilebilir." },
    { k: "tls", n: "TLS el sıkışması (yeni bağlantı)", ms: 1.10, on: false, net: 0, col: "#8b6cff", d: "Keep-alive ile amorti edilir. Kapatamıyorsanız bağlantı havuzunuz çalışmıyor demektir." },
    { k: "jwt", n: "JWT yerel doğrulama", ms: 0.25, on: true, net: 0, col: "#38e1c8", d: "JWKS önbellekteyse mikrosaniyeler. Gateway'in en ucuz yüksek değerli işi." },
    { k: "intro", n: "Token introspection (uzak IdP)", ms: 3.50, on: false, net: 1, col: "#f87171", d: "Her istekte IdP'ye gitmek. Önbellek veya Phantom Token ile ortadan kaldırın." },
    { k: "rl", n: "Rate limit (Redis)", ms: 0.60, on: true, net: 1, col: "#fbbf24", d: "Aynı bölgede Redis gidiş-dönüşü. Lua betiği tek çağrıda atomik karar verir." },
    { k: "authz", n: "Harici yetki (OPA sidecar)", ms: 0.45, on: false, net: 1, col: "#a78bfa", d: "Sidecar olarak localhost üzerinden. Uzak PDP olsaydı 3–5 ms olurdu." },
    { k: "schema", n: "OpenAPI şema doğrulama", ms: 0.40, on: false, net: 0, col: "#34d399", d: "Gövde boyutuyla doğru orantılı. Büyük yüklerde en pahalı filtre olabilir." },
    { k: "body", n: "Gövde dönüşümü", ms: 1.20, on: false, net: 0, col: "#f0a15c", d: "Tamponlama gerektirir; akışı bozar ve bellek baskısı yaratır. Mümkünse kaçının." },
    { k: "waf", n: "WAF kural taraması", ms: 0.80, on: false, net: 0, col: "#e06666", d: "Kural setinin büyüklüğüne çok duyarlı." },
    { k: "mtls", n: "Upstream mTLS", ms: 0.30, on: false, net: 0, col: "#60a5fa", d: "Keep-alive ile amorti edilir; havuz yoksa her istekte ödenir." },
    { k: "obs", n: "Log + metrik + trace", ms: 0.15, on: true, net: 0, col: "#7bd8c4", d: "Asenkron yazıldığı sürece ucuz. Senkron dosya yazımı 10× artırır." }
  ];
  function runLatency() {
    var wrap = $("#lbChips"); if (!wrap) return;
    function render() {
      wrap.innerHTML = "";
      LAT.forEach(function (it) {
        var b = document.createElement("button");
        b.className = "pill" + (it.on ? " on" : "");
        b.textContent = it.n + " · " + it.ms.toFixed(2).replace(".", ",") + " ms";
        b.title = it.d;
        if (it.fixed) { b.style.opacity = .7; b.style.cursor = "default"; }
        else ev(b, "click", function () { it.on = !it.on; render(); });
        wrap.appendChild(b);
      });
      var on = LAT.filter(function (x) { return x.on; });
      var totalMs = on.reduce(function (a, b) { return a + b.ms; }, 0);
      var hops = on.filter(function (x) { return x.net; }).length;
      var bar = $("#lbBar"); bar.innerHTML = "";
      on.forEach(function (it) {
        var s = document.createElement("i");
        s.style.width = (it.ms / totalMs * 100) + "%";
        s.style.background = it.col;
        s.title = it.n + ": " + it.ms.toFixed(2) + " ms";
        bar.appendChild(s);
      });
      $("#lbTotal").textContent = totalMs.toFixed(2).replace(".", ",") + " ms";
      $("#lbP99").textContent = (totalMs * 2.6 + 1.2 + hops * 1.8).toFixed(1).replace(".", ",") + " ms";
      $("#lbHops").textContent = hops;
      var n = $("#lbNote").querySelector("div"), msg;
      if (totalMs < 1.5) msg = "<b>Çok iyi.</b> Bu profil gateway'in kullanıcı tarafında hissedilmeyeceği anlamına gelir — arka uç gecikmesi tipik olarak 50–500 ms aralığındadır.";
      else if (totalMs < 4) msg = "<b>Sağlıklı.</b> Tipik bir üretim profili. p99'un p50'nin birkaç katı olması normaldir; asıl izlenmesi gereken p99'un <b>zaman içindeki eğilimidir</b>.";
      else msg = "<b>Dikkat.</b> Bu seviyede gateway ölçülebilir bir gecikme kaynağı. Önce <b>ağ çağrısı yapan</b> filtreleri hedefleyin: önbellekleme veya sidecar'a taşıma en yüksek kazancı verir.";
      if (hops >= 2) msg += " <b>Uyarı:</b> istek yolunda " + hops + " senkron ağ çağrısı var — her biri hem gecikme hem <b>erişilebilirlik riski</b> ekler.";
      n.innerHTML = msg;
    }
    render();
  }

  /* ═══════════════════════════ 14 · ÜRÜN MANZARASI ═══════════════════════ */
  var PTYPES = [
    { k: "a", n: "Kütüphane / framework", c: "#38e1c8", i: "i-code",
      d: "Kendi uygulamanızın içine gömülür. <b>En yüksek özelleştirme, en düşük hazır özellik.</b> Gateway'i bir ürün gibi satın almak yerine bir uygulama gibi geliştirmek isteyen ekipler içindir." },
    { k: "b", n: "Bağımsız proxy", c: "#5b8cff", i: "i-server",
      d: "Ayrı bir süreç olarak çalışır, yapılandırmayla yönetilir. <b>Performans ve olgunluk bu kategoride.</b> Eklenti yazmak mümkündür ama ürünün dilinde ve sınırları içinde." },
    { k: "c", n: "Yönetilen bulut servisi", c: "#a78bfa", i: "i-cloud",
      d: "Operasyon yok, fatura var. <b>Hızlı başlangıç, ölçekte pahalı, kısıtlar sabit.</b> Bulut sağlayıcının ekosistemiyle derin bütünleşme sunar; karşılığında satıcı bağımlılığı gelir." },
    { k: "d", n: "Tam API yönetimi", c: "#f0a15c", i: "i-money",
      d: "Gateway + portal + katalog + analitik + monetizasyon. <b>API bir ürünse gerekir.</b> Dış geliştirici ekosistemi olmayan kurumlarda bu katmanın büyük kısmı kullanılmadan kalır." }
  ];
  var PMAP = [
    { n: "Spring Cloud Gateway", t: "a", x: 58, y: 95, r: 16, note: "Kod yazarak sınırsız özelleştirme; işletme yükü tamamen sizde." },
    { n: "Ocelot / YARP", t: "a", x: 50, y: 82, r: 11, note: ".NET dünyasının karşılığı; ekosistem küçük ama yeterli." },
    { n: "Envoy", t: "b", x: 88, y: 78, r: 18, note: "En güçlü veri düzlemi; kontrol düzlemi olmadan çalışmaz." },
    { n: "Apache APISIX", t: "b", x: 66, y: 70, r: 14, note: "Yüksek performans ve 100'ü aşkın hazır eklenti bir arada." },
    { n: "Kong", t: "b", x: 55, y: 58, r: 19, note: "En olgun ekosistem; kurumsal maliyet yüksek." },
    { n: "Tyk", t: "b", x: 60, y: 53, r: 12, note: "Hava boşluklu kuruluma uygun; yönetim paneli ücretli." },
    { n: "Traefik", t: "b", x: 30, y: 26, r: 14, note: "Sıfır yapılandırmaya en yakın; genişletilebilirlik sınırlı." },
    { n: "KrakenD", t: "b", x: 40, y: 32, r: 10, note: "Durumsuz; çok kaynaklı yanıt birleştirme odaklı." },
    { n: "NGINX", t: "b", x: 47, y: 38, r: 17, note: "Kararlılığı efsanevi; API yönetimi katmanı yok." },
    { n: "AWS API Gateway", t: "c", x: 6, y: 18, r: 16, note: "Sıfır operasyon; 10 MB yük sınırı ve ölçek maliyeti." },
    { n: "Azure APIM", t: "c", x: 14, y: 31, r: 14, note: "Kurumsal özellikler hazır; XML policy dili hantal." },
    { n: "Apigee", t: "c d", x: 25, y: 45, r: 17, note: "En olgun API yönetimi; en yüksek maliyet sınıfı." },
    { n: "WSO2 API Manager", t: "d", x: 76, y: 66, r: 13, note: "Açık kaynak tam API yönetimi; kaynak tüketimi yüksek." },
    { n: "Gravitee", t: "d", x: 69, y: 59, r: 10, note: "Olay güdümlü ve asenkron API'lerde farklılaşır." }
  ];
  function runProducts() {
    var cv = $("#mapCv"); if (!cv) return;
    var box = $("#prodFilter");
    var rows = $$("#prodTable tbody tr");
    $$("button", box).forEach(function (b) {
      ev(b, "click", function () {
        $$("button", box).forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var cat = b.dataset.cat;
        rows.forEach(function (r) {
          r.style.display = (cat === "all" || (r.dataset.cat || "").split(" ").indexOf(cat) >= 0) ? "" : "none";
        });
      });
    });
    var typeBox = $("#mapTypes"), panel = $("#mapPanel");
    var focus = null, hovered = -1, anim = 0, selIdx = -1;
    function typeOf(p) { return p.t.split(" ")[0]; }
    function colOf(p) { var t = PTYPES.filter(function (x) { return x.k === typeOf(p); })[0]; return t ? t.c : C.t3; }
    function renderTypes() {
      typeBox.innerHTML = PTYPES.map(function (t) {
        var on = focus === t.k;
        return '<button class="card' + (on ? " acc" : "") + '" data-t="' + t.k + '" style="cursor:pointer;text-align:left;' +
          (on ? "border-color:" + t.c + ";" : "") + '">' +
          '<div class="ico" style="width:30px;height:30px;margin-bottom:8px"><svg style="color:' + t.c + '"><use href="#' + t.i + '"/></svg></div>' +
          '<div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:' + t.c + '">Tür ' + t.k.toUpperCase() + '</div>' +
          '<h3 style="font-size:13.5px;margin:3px 0 5px">' + t.n + '</h3>' +
          '<p style="font-size:12px;line-height:1.5">' + t.d + '</p></button>';
      }).join("");
      $$("button[data-t]", typeBox).forEach(function (b) {
        ev(b, "click", function () {
          focus = (focus === b.dataset.t) ? null : b.dataset.t;
          selIdx = -1; renderTypes(); showPanel();
        });
      });
    }
    function showPanel() {
      if (selIdx >= 0) {
        var p = PMAP[selIdx], t = PTYPES.filter(function (x) { return x.k === typeOf(p); })[0];
        panel.innerHTML = '<div class="hp-k" style="color:' + t.c + '">' + t.n + '</div>' +
          '<div class="hp-t">' + p.n + '</div>' +
          '<div class="hp-d">' + p.note + '<br><br>' +
          '<b>Operasyon yükü:</b> ' + (p.x < 25 ? "çok düşük" : p.x < 50 ? "orta" : p.x < 75 ? "yüksek" : "çok yüksek") +
          ' &nbsp;·&nbsp; <b>Özelleştirme derinliği:</b> ' + (p.y < 30 ? "yapılandırmayla sınırlı" : p.y < 60 ? "eklentiyle genişletilebilir" : p.y < 85 ? "derin eklenti" : "kod düzeyinde sınırsız") + '</div>';
      } else if (focus) {
        var tt = PTYPES.filter(function (x) { return x.k === focus; })[0];
        var list = PMAP.filter(function (p) { return p.t.indexOf(focus) >= 0; }).map(function (p) { return p.n; });
        panel.innerHTML = '<div class="hp-k" style="color:' + tt.c + '">Tür ' + focus.toUpperCase() + '</div>' +
          '<div class="hp-t">' + tt.n + '</div><div class="hp-d">' + tt.d +
          '<br><br><b>Bu türdeki ürünler:</b> ' + list.join(" · ") + '</div>';
      } else {
        panel.innerHTML = '<div class="hp-k" style="color:var(--t3)">Harita</div>' +
          '<div class="hp-t">İki eksen, dört bölge</div>' +
          '<div class="hp-d"><b>Sol alt:</b> yönetilen servisler — operasyon yok, özelleştirme de yok. ' +
          '<b>Sağ üst:</b> kendi işlettiğiniz, derinlemesine genişletilebilir ürünler; platform ekibi gerektirir. ' +
          '<b>Sağ alt bölge boştur</b> ve boş olması doğrudur: yüksek operasyon yükü üstlenip karşılığında ' +
          'özelleştirme alamamak savunulabilir bir konum değildir.<br><br>' +
          'Bir balona veya sağdaki tür kartına tıklayarak ayrıntıya inebilirsiniz.</div>';
      }
    }
    renderTypes(); showPanel();

    var geom = { l: 54, t: 26, r: 18, b: 42, W: 0, H: 0 };
    function px(x) { return geom.l + (geom.W - geom.l - geom.r) * (x / 100); }
    function py(y) { return geom.H - geom.b - (geom.H - geom.t - geom.b) * (y / 100); }
    function hitTest(mx, my) {
      for (var i = PMAP.length - 1; i >= 0; i--) {
        var p = PMAP[i], dx = mx - px(p.x), dy = my - py(p.y);
        var rr0 = p.r * 0.88 + 6;
        if (dx * dx + dy * dy <= rr0 * rr0) return i;
      }
      return -1;
    }
    ev(cv, "mousemove", function (e) {
      var r = cv.getBoundingClientRect();
      hovered = hitTest(e.clientX - r.left, e.clientY - r.top);
      cv.style.cursor = hovered >= 0 ? "pointer" : "default";
    });
    ev(cv, "mouseleave", function () { hovered = -1; });
    ev(cv, "click", function (e) {
      var r = cv.getBoundingClientRect();
      var h = hitTest(e.clientX - r.left, e.clientY - r.top);
      selIdx = (h === selIdx) ? -1 : h; showPanel();
    });

    loop(function () {
      var g = fit(cv); if (!g) return;
      var c = g.c; geom.W = g.w; geom.H = g.h;
      if (anim < 1) anim = Math.min(1, anim + (reduce ? 1 : 0.032));
      c.clearRect(0, 0, geom.W, geom.H);

      var mx = px(50), my = py(50);
      c.fillStyle = "rgba(167,139,250,.05)"; c.fillRect(geom.l, my, mx - geom.l, geom.H - geom.b - my);
      c.fillStyle = "rgba(91,140,255,.05)"; c.fillRect(mx, geom.t, geom.W - geom.r - mx, my - geom.t);
      c.fillStyle = "rgba(248,113,113,.035)"; c.fillRect(mx, my, geom.W - geom.r - mx, geom.H - geom.b - my);
      c.fillStyle = "rgba(56,225,200,.05)"; c.fillRect(geom.l, geom.t, mx - geom.l, my - geom.t);

      c.strokeStyle = C.line; c.lineWidth = 1;
      for (var v = 0; v <= 100; v += 25) {
        c.globalAlpha = v === 50 ? .9 : .35;
        c.beginPath(); c.moveTo(px(v), geom.t); c.lineTo(px(v), geom.H - geom.b); c.stroke();
        c.beginPath(); c.moveTo(geom.l, py(v)); c.lineTo(geom.W - geom.r, py(v)); c.stroke();
      }
      c.globalAlpha = 1;

      c.fillStyle = C.t3; c.font = "9.5px " + C.mono; c.textAlign = "center";
      c.fillText("OPERASYON YÜKÜ  →", (geom.l + geom.W - geom.r) / 2, geom.H - 8);
      c.fillText("düşük", px(7), geom.H - 24); c.fillText("yüksek", px(93), geom.H - 24);
      c.save(); c.translate(14, (geom.t + geom.H - geom.b) / 2); c.rotate(-Math.PI / 2);
      c.fillText("ÖZELLEŞTİRME DERİNLİĞİ  →", 0, 0); c.restore();

      c.font = "8.5px " + C.mono; c.globalAlpha = .6;
      c.fillStyle = "#38e1c8"; c.textAlign = "left"; c.fillText("düşük ops · derin özelleştirme", geom.l + 7, geom.t + 13);
      c.fillStyle = "#5b8cff"; c.textAlign = "right"; c.fillText("platform ekibi gerektirir", geom.W - geom.r - 7, geom.t + 13);
      c.fillStyle = "#a78bfa"; c.textAlign = "left"; c.fillText("yönetilen · kısıtlı", geom.l + 7, geom.H - geom.b - 7);
      c.fillStyle = "#f87171"; c.textAlign = "right"; c.fillText("savunulamaz bölge", geom.W - geom.r - 7, geom.H - geom.b - 7);
      c.globalAlpha = 1;

      PMAP.forEach(function (p, i) {
        var dim = focus && p.t.indexOf(focus) < 0;
        var on = (i === hovered || i === selIdx);
        var col = colOf(p);
        var rad = (p.r * 0.88) * (0.35 + 0.65 * anim) * (on ? 1.25 : 1);
        c.globalAlpha = dim ? .15 : 1;
        if (on) {
          c.fillStyle = col; c.globalAlpha = dim ? .1 : .16;
          c.beginPath(); c.arc(px(p.x), py(p.y), rad + 8, 0, Math.PI * 2); c.fill();
          c.globalAlpha = dim ? .15 : 1;
        }
        c.fillStyle = col + (on ? "55" : "2e");
        c.beginPath(); c.arc(px(p.x), py(p.y), rad, 0, Math.PI * 2); c.fill();
        c.strokeStyle = col; c.lineWidth = on ? 2.2 : 1.4;
        c.beginPath(); c.arc(px(p.x), py(p.y), rad, 0, Math.PI * 2); c.stroke();
        if (!dim && anim > .45) {
          c.fillStyle = on ? C.t1 : C.t2;
          c.font = (on ? "700 " : "") + "10px " + C.sans;
          c.textAlign = "center";
          var lbl = p.n.length > 17 ? p.n.split(" ")[0] : p.n;
          c.fillText(lbl, px(p.x), py(p.y) + rad + 11);
        }
        c.globalAlpha = 1;
      });
      c.textAlign = "left";
    });
  }

  /* ═══════════════════════════ ARENA MATRİSİ ══════════════════════════════ */
  var matSortIdx = -1;
  function runMatrix(selectFn) {
    var host = $("#matrix"); if (!host) return;
    var sortBox = $("#matSort");
    function cellCol(v) {
      return v >= 4.5 ? "#34d399" : v >= 3.5 ? "#7bd88f" : v >= 2.5 ? "#fbbf24" : v >= 1.5 ? "#f0975c" : "#f87171";
    }
    function draw() {
      var idx = ARENA.map(function (p, i) { return i; });
      idx.sort(function (a, b) {
        var pa = ARENA[a], pb = ARENA[b];
        var va = matSortIdx < 0 ? pa.v.reduce(function (x, y) { return x + y; }, 0) : pa.v[matSortIdx];
        var vb = matSortIdx < 0 ? pb.v.reduce(function (x, y) { return x + y; }, 0) : pb.v[matSortIdx];
        return vb - va;
      });
      host.innerHTML =
        '<div class="mrow head"><span>Ürün</span>' +
        AXES.map(function (a) { return "<span>" + a.replace(" ", "<br>") + "</span>"; }).join("") +
        "<span>Toplam</span></div>" +
        idx.map(function (i) {
          var p = ARENA[i];
          var tot = p.v.reduce(function (x, y) { return x + y; }, 0);
          return '<div class="mrow" data-i="' + i + '">' +
            '<span class="mname">' + p.n + "<i>" + p.c + "</i></span>" +
            p.v.map(function (v, k) {
              var hi = (matSortIdx === k);
              return '<span class="mcell" style="background:' + cellCol(v) + (hi ? "40" : "20") +
                ";color:" + cellCol(v) + ";border:1px solid " + cellCol(v) + (hi ? "aa" : "30") + '">' +
                v.toString().replace(".", ",") + "</span>";
            }).join("") +
            '<span class="mtot">' + tot.toFixed(1).replace(".", ",") + "</span></div>";
        }).join("");
      $$(".mrow[data-i]", host).forEach(function (r) {
        ev(r, "click", function () { if (selectFn) selectFn(+r.dataset.i); });
      });
    }
    sortBox.innerHTML = '<button class="pill on" data-s="-1">Toplam</button>' +
      AXES.map(function (a, i) { return '<button class="pill" data-s="' + i + '">' + a.split(" ")[0] + "</button>"; }).join("");
    ev(sortBox, "click", function (e) {
      var b = e.target.closest("button[data-s]"); if (!b) return;
      $$("button", sortBox).forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on"); matSortIdx = +b.dataset.s; draw();
    });
    draw();
  }

  /* ═══════════════════════════ 15 · KARAR ARACI ═══════════════════════════ */
  var PRODUCTS = {
    scg: { n: "Spring Cloud Gateway", w: "JVM ekipleri için en düşük sürtünmeli seçim; özel politika yazmak sizin ana dilinizde olur." },
    envoy: { n: "Envoy Gateway / Istio", w: "Kubernetes-native, çok dilli ortamların standardı; Gateway API ile persona ayrımı hazır gelir." },
    apisix: { n: "Apache APISIX", w: "Yüksek performans + 100'den fazla hazır eklenti; etcd üzerinden milisaniyelik yapılandırma yayılımı." },
    kong: { n: "Kong", w: "En olgun ekosistem ve kurumsal destek; hazır özellik ihtiyacı yüksekse en hızlı yol." },
    traefik: { n: "Traefik", w: "Otomatik keşif ve otomatik TLS ile en hızlı kurulum; küçük–orta kümelerde ideal." },
    aws: { n: "AWS API Gateway", w: "AWS serverless mimarilerde sıfır operasyon; IAM ve Lambda ile derin bütünleşme." },
    krakend: { n: "KrakenD", w: "Durumsuz, çok düşük gecikmeli yanıt birleştirme; BFF senaryolarında öne çıkar." },
    apim: { n: "Kurumsal API Yönetimi (Apigee / WSO2 / Kong Konnect)", w: "API bir ürünse: portal, katalog, monetizasyon ve analitik hazır gelir." }
  };
  var DQ = [
    { q: "1 · Çalışma ortamınız hangisi?", o: [
      { l: "Kubernetes", d: "Küme içinde çalışan mikroservisler", s: { envoy: 3, apisix: 2, traefik: 2, kong: 1, scg: 1 } },
      { l: "Klasik sunucu / VM", d: "Şirket içi veya bulut VM'leri", s: { scg: 3, kong: 2, apisix: 2, apim: 1 } },
      { l: "AWS serverless", d: "Lambda, Fargate ağırlıklı", s: { aws: 4, krakend: 1 } },
      { l: "Hibrit / çoklu bulut", d: "Şirket içi + bulut birlikte", s: { apim: 3, kong: 2, apisix: 2, scg: 1 } }
    ] },
    { q: "2 · Önceliğiniz ne?", o: [
      { l: "Ekip hızı ve tanıdıklık", d: "Bildiğimiz dille, öğrenme maliyeti olmadan", s: { scg: 3, traefik: 2, aws: 1 } },
      { l: "Hazır özellik zenginliği", d: "Yazmadan, yapılandırarak çözmek", s: { kong: 3, apisix: 2, apim: 2 } },
      { l: "En düşük gecikme ve ölçek", d: "Yüksek hacim, sıkı gecikme bütçesi", s: { apisix: 3, envoy: 3, krakend: 2 } },
      { l: "API'yi ürünleştirmek", d: "Dış geliştiriciler, portal, faturalandırma", s: { apim: 4, kong: 2 } }
    ] },
    { q: "3 · Ekibinizin profili?", o: [
      { l: "Java / Spring ağırlıklı", d: "JVM ekosisteminde derin bilgi", s: { scg: 4, apim: 1 } },
      { l: "Go / platform mühendisliği", d: "Bulut-native araçlara hâkim", s: { traefik: 2, envoy: 2, krakend: 2, apisix: 1 } },
      { l: "Küçük ekip, operasyon yok", d: "Mümkün olduğunca az işletmek istiyoruz", s: { aws: 3, traefik: 2, apim: 1 } },
      { l: "Adanmış platform ekibi var", d: "Karmaşık altyapıyı işletebiliriz", s: { envoy: 2, apisix: 2, kong: 2, scg: 1 } }
    ] }
  ];
  var dqPick = [null, null, null];
  var DQ_ICON = [
    ["i-cloud", "i-server", "i-bolt", "i-layers"],
    ["i-users", "i-stack", "i-gauge", "i-money"],
    ["i-spring", "i-terminal", "i-clock", "i-cpu"]
  ];
  var DQ_SUB = ["Platform bağlamı", "Öncelik ekseni", "Ekip profili"];
  function runDecide() {
    var host = $("#decision"); if (!host) return;
    ev($("#dReset"), "click", function () { dqPick = [null, null, null]; renderD(); });
    function score() {
      var s = {};
      dqPick.forEach(function (pi, li) {
        if (pi === null) return;
        var opt = DQ[li].o[pi];
        Object.keys(opt.s).forEach(function (k) { s[k] = (s[k] || 0) + opt.s[k]; });
      });
      return s;
    }
    function renderD() {
      var answered = dqPick.filter(function (x) { return x !== null; }).length;
      var badge = $("#dProgress");
      if (badge) {
        badge.textContent = answered + " / 3 katman";
        badge.className = "sbadge " + (answered === 3 ? "g" : answered ? "w" : "a");
      }
      var html = "";
      DQ.forEach(function (q, li) {
        var picked = dqPick[li];
        var prevDone = li === 0 || dqPick[li - 1] !== null;
        var cls = picked !== null ? "done" : (prevDone ? "active" : "");
        if (picked !== null) cls += " linked";
        html += '<div class="dlayer ' + cls + '" data-l="' + li + '">' +
          '<div class="dl-head">' +
            '<span class="dl-num">' + (picked !== null ? "✓" : li + 1) + "</span>" +
            '<span class="dl-q">' + q.q.replace(/^\d+ · /, "") + "<span>" + DQ_SUB[li] + "</span></span>" +
            (picked !== null ? '<button class="dl-change" data-c="' + li + '">Değiştir</button>' : "") +
          "</div>" +
          '<div class="dl-opts">' +
            q.o.map(function (opt, oi) {
              var sel = picked === oi;
              var dim = picked !== null && !sel;
              var locked = !prevDone;
              return '<button class="dl-opt' + (sel ? " sel" : "") + (dim ? " dim" : "") + '"' +
                (locked ? " disabled style=\"opacity:.3;cursor:not-allowed\"" : "") +
                ' data-l="' + li + '" data-o="' + oi + '">' +
                '<svg><use href="#' + DQ_ICON[li][oi] + '"/></svg>' +
                "<span><b>" + opt.l + "</b>" + opt.d + "</span></button>";
            }).join("") +
          "</div></div>";
      });

      if (dqPick.every(function (x) { return x !== null; })) {
        var sc = score();
        var ranked = Object.keys(sc).sort(function (a, b) { return sc[b] - sc[a]; });
        var top = ranked.slice(0, 3), max = sc[ranked[0]] || 1;
        html += '<div class="dlayer linked"><div class="dl-head">' +
          '<span class="dl-num" style="background:var(--accent);border-color:var(--accent);color:#071018">★</span>' +
          '<span class="dl-q">Sonuç<span>Ağırlıklandırılmış öneri</span></span></div>' +
          '<div class="dresult">' +
          top.map(function (k, i) {
            var pct = Math.round(sc[k] / max * 100);
            var medal = i === 0 ? "Birincil" : "Alternatif " + i;
            var mc = i === 0 ? "var(--accent)" : "var(--t3)";
            return '<div class="dres-card' + (i === 0 ? " win" : "") + '">' +
              '<span class="medal" style="color:' + mc + ';border:1px solid ' + mc + '55">' + medal + "</span>" +
              '<div class="drk">' + pct + " puan uyum</div>" +
              "<h3>" + PRODUCTS[k].n + "</h3>" +
              '<div class="dscore"><i style="width:' + pct + '%"></i></div>' +
              "<p>" + PRODUCTS[k].w + "</p></div>";
          }).join("") +
          '<div class="note" style="font-size:13.5px"><svg><use href="#i-info"/></svg><div>' +
          "<b>Bu bir başlangıç noktasıdır.</b> Nihai karar PoC ile verilmelidir: en az iki aday aynı senaryolarla " +
          "kurulmalı ve son haftada gateway'i kullanacak <b>başka bir ekipten</b> bir mühendisin ne kadar hızlı " +
          "yeni rota ekleyebildiği ölçülmelidir. Yukarıdaki herhangi bir katmanda <b>Değiştir</b> ile seçim " +
          "güncellenebilir; sonuç anında yeniden hesaplanır.</div></div></div></div>";
      }
      host.innerHTML = html;

      $$(".dl-opt[data-l]", host).forEach(function (b) {
        if (b.disabled) return;
        ev(b, "click", function () {
          var li = +b.dataset.l;
          dqPick[li] = +b.dataset.o;
          for (var j = li + 1; j < dqPick.length; j++) { /* sonraki katmanlar korunur */ }
          renderD();
        });
      });
      $$(".dl-change", host).forEach(function (b) {
        ev(b, "click", function (e) {
          e.stopPropagation(); dqPick[+b.dataset.c] = null; renderD();
        });
      });
    }
    renderD();
  }

  /* ══════════════════════════ PAYLAŞILAN BİLEŞENLER ═══════════════════════ */

  /* Ne? / Neden? / Nasıl? / Neden bu? sekmeleri */
  function techTabs(rootSel, bodySel, tabs) {
    var root = $(rootSel), body = $(bodySel);
    if (!root || !body) return;
    var btns = $$(".tech-tabs button", root);
    function show(i) {
      btns.forEach(function (b, j) { b.classList.toggle("on", j === i); });
      body.innerHTML = tabs[i];
    }
    btns.forEach(function (b, i) { ev(b, "click", function () { show(i); }); });
    show(0);
  }

  /* Tıklanabilir SVG sıcak nokta diyagramı */
  function hotspot(svgSel, panelSel, data, first) {
    var svg = $(svgSel), panel = $(panelSel);
    if (!svg || !panel) return;
    var nodes = $$(".hs-node", svg);
    function sel(k) {
      var d = data[k]; if (!d) return;
      nodes.forEach(function (n) {
        var on = n.dataset.h === k;
        n.style.opacity = on ? "1" : ".42";
        var sh = n.querySelector("rect");
        if (sh) sh.setAttribute("stroke-width", on ? "2.6" : "1.3");
      });
      panel.innerHTML = '<div class="hp-k" style="color:' + d.c + '">' + d.k + '</div>' +
        '<div class="hp-t">' + d.t + '</div><div class="hp-d">' + d.d + '</div>';
    }
    nodes.forEach(function (n) {
      ev(n, "click", function () { sel(n.dataset.h); });
      ev(n, "mouseenter", function () { n.style.cursor = "pointer"; });
    });
    sel(first);
    /* ilk girişte kısa bir tur */
    if (!reduce) {
      var keys = Object.keys(data), i = keys.indexOf(first);
      var tourN = 0;
      var t = every(function () {
        i = (i + 1) % keys.length; sel(keys[i]);
        if (++tourN >= keys.length - 1) clearInterval(t);
      }, 1800);
    }
  }

  /* Animasyonlu kıyaslama barları */
  function cmpBars(sel, rows, onClick) {
    var host = $(sel); if (!host) return;
    host.innerHTML = rows.map(function (r, i) {
      return '<div class="cmp-row" data-i="' + i + '"' + (onClick ? ' style="cursor:pointer"' : '') + '>' +
        '<span class="cl">' + r.n + '</span>' +
        '<span class="cmp-track"><i data-w="' + r.v + '" style="background:' + r.c + '"></i></span>' +
        '<span class="cv2">' + r.l + '</span></div>';
    }).join("");
    var bars = $$(".cmp-track i", host);
    later(function () { bars.forEach(function (b) { b.style.width = b.dataset.w + "%"; }); }, 120);
    if (onClick) {
      $$(".cmp-row", host).forEach(function (row) {
        ev(row, "click", function () { onClick(+row.dataset.i); });
      });
    }
  }

  /* Açılır kart (detay) */
  function accordion(slideSel, map, hintText) {
    var cards = $$(slideSel + " .acc-card");
    cards.forEach(function (c, i) {
      var key = (c.querySelector(".cnum") || {}).textContent || String(i);
      var extra = map[key.trim()] || map[String(i)] || "";
      var more = document.createElement("div");
      more.className = "acc-more";
      more.innerHTML = extra;
      var hint = document.createElement("div");
      hint.className = "acc-hint";
      hint.innerHTML = '<svg><use href="#i-right"/></svg><span>' + (hintText || "Ayrıntı") + '</span>';
      c.appendChild(more); c.appendChild(hint);
      ev(c, "click", function () { c.classList.toggle("open"); });
    });
  }

  /* Kıvılcım çizgisi (sparkline) */
  function spark(cv, data, col, fill) {
    var g = fit(cv); if (!g) return;
    var c = g.c, W = g.w, H = g.h, pad = 3;
    c.clearRect(0, 0, W, H);
    var max = Math.max.apply(null, data) || 1, min = Math.min.apply(null, data);
    var rng = Math.max(0.0001, max - min);
    function px(i) { return pad + (W - pad * 2) * (i / (data.length - 1)); }
    function py(v) { return H - pad - (H - pad * 2) * ((v - min) / rng); }
    if (fill) {
      c.beginPath(); c.moveTo(px(0), H);
      data.forEach(function (v, i) { c.lineTo(px(i), py(v)); });
      c.lineTo(px(data.length - 1), H); c.closePath();
      var grd = c.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, col + "44"); grd.addColorStop(1, col + "00");
      c.fillStyle = grd; c.fill();
    }
    c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath();
    data.forEach(function (v, i) { i ? c.lineTo(px(i), py(v)) : c.moveTo(px(i), py(v)); });
    c.stroke();
    c.fillStyle = col;
    c.beginPath(); c.arc(px(data.length - 1), py(data[data.length - 1]), 2.6, 0, Math.PI * 2); c.fill();
  }

  /* ══════════════════════════ SLAYT: GATEWAY NEDİR ════════════════════════ */
  function runWhat() {
    hotspot("#whatSvg", "#whatPanel", {
      client: { c: C.t2, k: "Tüketici", t: "İstemciler", d: "Mobil uygulama, web arayüzü, partner sistemleri ve cihazlar. Gateway'in varlık sebebi, bu tüketicilerin iç mimariyi <b>hiç bilmeden</b> çalışabilmesidir: servis bölünse, birleşse veya taşınsa da dış sözleşme değişmez." },
      edge: { c: C.acc, k: "Politika noktası", t: "API Gateway", d: "Tek giriş noktası. Her isteği <b>anlar</b> — yalnızca taşımaz. Dört sorumluluk grubunu tek yerde uygular ve iç mimariyi dış sözleşmeden yalıtır. İş mantığı barındırmaz." },
      sec: { c: C.acc2, k: "Grup 1", t: "Güvenlik", d: "TLS sonlandırma ve mTLS doğrulama, token doğrulama (JWT/opaque), kaba taneli yetki, güvenilmez header'ların temizlenmesi, CORS ve güvenlik başlıkları, şema doğrulama. <b>Nesne düzeyi yetki buraya ait değildir.</b>" },
      traffic: { c: C.warn, k: "Grup 2", t: "Trafik yönetimi", d: "Rota eşleme ve servis keşfi, yük dağıtımı, rate limit ve kota, ağırlıklı yönlendirme ve canary, sürüm çözümleme, istek/yanıt başlık dönüşümü. Gateway'in <b>günlük olarak en çok değiştirilen</b> katmanıdır." },
      resil: { c: C.vio, k: "Grup 3", t: "Dayanıklılık", d: "Timeout hiyerarşisi, bütçeli retry, devre kesici, bulkhead, yük atma ve fallback. Bu katman, arka uçtaki bir sorunun <b>istemciye ve diğer rotalara yayılmasını</b> engeller." },
      obs: { c: C.amber, k: "Grup 4", t: "Gözlemlenebilirlik", d: "Correlation ID üretimi, W3C trace bağlamının taşınması, rota bazlı metrikler, örneklenmiş ve PII maskeli erişim logu. Gateway, <b>kullanıcı deneyimine en yakın ölçümü</b> üreten bileşendir." },
      svc: { c: C.t2, k: "Arka uç", t: "Mikroservisler", d: "İş mantığının yaşadığı yer. Gateway'in arkasında olmaları onları <b>korumasız bırakmaz</b>: sıfır güven ilkesi gereği her servis kendisine gelen token'ı yeniden doğrular ve nesne düzeyi yetkiyi kendisi uygular." }
    }, "edge");

    /* İstek paketleri: istemciden gateway'e, bantlardan aşağı, servislere.
       Bir kısmı güvenlik veya trafik bandında kesilir. */
    var dots = $("#whatDots"); if (!dots || reduce) return;
    var N = 9, els = [];
    dots.innerHTML = "";
    for (var i = 0; i < N; i++) {
      var c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c1.setAttribute("r", "3.4"); c1.setAttribute("opacity", "0");
      dots.appendChild(c1); els.push(c1);
    }
    var CY = [124, 155, 186], SY = [91, 155, 219], BANDS = [72, 132, 192, 252];
    var seeds = els.map(function (_, i) {
      return { off: i / N, lane: i % 3, out: (i * 2) % 3, blocked: (i % 4 === 1), band: 1 + (i % 2) };
    });
    var t0w = performance.now();
    loop(function (now) {
      var el = (now - t0w) / 1000;
      els.forEach(function (ci, i) {
        var s = seeds[i];
        var t = ((el * 0.34) + s.off) % 1;
        var x, y, op = 1, col = "#5b8cff";
        if (t < 0.22) {                       // istemci → gateway
          var u = t / 0.22;
          x = 122 + (194 - 122) * u; y = CY[s.lane] + (155 - CY[s.lane]) * u;
        } else if (t < 0.62) {                // gateway içinde bantlardan aşağı
          var u2 = (t - 0.22) / 0.40;
          x = 290 + Math.sin(u2 * Math.PI * 2) * 46;
          y = 62 + (250 - 62) * u2;
          if (s.blocked && u2 > (s.band / 4)) { col = "#f87171"; op = Math.max(0, 1 - (u2 - s.band / 4) * 6); }
        } else {                              // gateway → servis
          if (s.blocked) { op = 0; x = 290; y = 250; }
          else {
            var u3 = (t - 0.62) / 0.38;
            x = 388 + (458 - 388) * u3; y = 155 + (SY[s.out] - 155) * u3;
            col = "#38e1c8";
          }
        }
        ci.setAttribute("cx", x); ci.setAttribute("cy", y);
        ci.setAttribute("fill", col);
        ci.setAttribute("opacity", String(op * 0.9));
      });
    });
  }

  /* ══════════════════════════ SLAYT: KARŞILAŞTIRMA ════════════════════════ */
  var VS = [
    { n: "Load Balancer", v: 22, c: "#6b7488", l: "L4",
      k: "Kapasite", t: "Load Balancer — ışıkları açık tutar",
      d: "Yalnızca <b>bağlantı, port ve sağlık</b> bilir. İsteğin içeriğine bakmaz; hedefi hacmi verimli taşımaktır. Kimlik kavramı yoktur. Sahibi genellikle ağ ekibidir. <b>Ne zaman yeterli:</b> tek tip trafik, politika ihtiyacı yok." },
    { n: "Reverse Proxy", v: 48, c: "#5b8cff", l: "L7",
      k: "Güvenlik / performans", t: "Reverse Proxy — kötüleri dışarıda tutar",
      d: "<b>Yol, başlık ve TLS</b> düzeyinde HTTP semantiğini anlar. Önbellek, sıkıştırma, temel filtreleme yapar. Kimlik kavramı zayıftır; tüketici başına kota veya sürüm yönetimi sunmaz. <b>Ne zaman yeterli:</b> tek uygulama, basit TLS sonlandırma." },
    { n: "API Gateway", v: 92, c: "#38e1c8", l: "API",
      k: "Politika / yönetim", t: "API Gateway — trafiğin iş kurallarını yönetir",
      d: "<b>API, tüketici, kota, sürüm ve şema</b> bilir. Kim olduğunuza göre farklı davranabilir; sözleşmeyi çalışma zamanında dayatır; sürüm emekliliğini yönetir. Sahipliği platform ve ürün ekipleri arasında paylaşılır. <b>Ne zaman gerekir:</b> birden çok servis, birden çok tüketici tipi, tekdüze politika ihtiyacı." },
    { n: "Service Mesh", v: 70, c: "#a78bfa", l: "E-W",
      k: "Servisler arası", t: "Service Mesh — doğu-batı trafiğini yönetir",
      d: "<b>Servis kimliği ve çağrı grafiği</b> bilir; kullanıcı kimliğini bilmez. mTLS, retry ve gözlemlenebilirliği <b>uygulama kodu değişmeden</b> sağlar. Gateway'in alternatifi değil, tamamlayıcısıdır: gateway kuzey-güneyi, mesh doğu-batıyı üstlenir." }
  ];
  var VS_ICON = ["i-scale", "i-shield", "i-gate", "i-net"];
  function runVs() {
    var stack = $("#vsStack"); if (!stack) return;
    cmpBars("#vsCmp", VS.map(function (x) { return { n: x.n, v: x.v, c: x.c, l: x.l }; }), function (i) { showVs(i); });
    /* Dört açıklama da baştan görünür; tıklama yalnızca öne çıkarır. */
    stack.innerHTML = VS.map(function (d, i) {
      return '<div class="vcard" data-i="' + i + '" style="color:' + d.c + '">' +
        '<span class="vi"><svg style="color:' + d.c + '"><use href="#' + VS_ICON[i] + '"/></svg></span>' +
        '<div><div class="vk" style="color:' + d.c + '">' + d.k + '</div>' +
        '<h4>' + d.t + '</h4><p>' + d.d + '</p></div></div>';
    }).join("");
    function showVs(i) {
      $$(".vcard", stack).forEach(function (el, j) { el.classList.toggle("on", j === i); });
      $$("#vsCmp .cmp-row").forEach(function (el, j) { el.style.opacity = j === i ? "1" : ".55"; });
    }
    ev(stack, "click", function (e) {
      var card = e.target.closest(".vcard[data-i]");
      if (card) showVs(+card.dataset.i);
    });
    showVs(2);
  }

  /* ══════════════════════════ SLAYT: YÜK DAĞITIMI ═════════════════════════ */
  function runDiscovery() {
    var cv = $("#lbAlgoCv"); if (!cv) return;
    var ALG = [
      { k: "rr", n: "Round robin" },
      { k: "lr", n: "Least request" },
      { k: "hash", n: "Tutarlı hash" },
      { k: "zone", n: "Zone-aware" }
    ];
    var N = 4;                      // örnek sayısı
    /* DİKKAT: buradaki sayaç 'rr' olarak adlandırılamaz — üstteki rr() yuvarlak
       dikdörtgen yardımcısını gölgeler ve çizim ilk karede TypeError atar. */
    var st, last = 0, acc = 0, done = { rr: 0, lr: 0, hash: 0, zone: 0 }, rrIdx = 0, seq = 0;
    var running = true, slowFixed = false;
    var SLOW = 2;                   // 3 numaralı örnek (0 tabanlı 2) yavaş
    function reset() {
      st = {};
      ALG.forEach(function (a) {
        st[a.k] = [];
        for (var i = 0; i < N; i++) st[a.k].push({ q: 0, busy: 0 });
      });
      done = { rr: 0, lr: 0, hash: 0, zone: 0 }; rrIdx = 0; seq = 0;
    }
    reset();
    var rb = $("#lbAlgoReset"), pb = $("#lbAlgoPlay"), fb = $("#lbAlgoFix");
    function syncBtns() {
      if (pb) pb.innerHTML = running
        ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Başlat';
      var badge = $("#lbSlowBadge");
      if (badge) {
        badge.className = "sbadge " + (slowFixed ? "g" : "w");
        badge.textContent = slowFixed ? "tüm örnekler sağlıklı" : "3 numaralı örnek yavaş";
      }
      if (fb) fb.innerHTML = slowFixed
        ? '<svg><use href="#i-warn"/></svg> Örneği yeniden yavaşlat'
        : '<svg><use href="#i-check"/></svg> Yavaş örneği düzelt';
    }
    ev(rb, "click", function () { reset(); });
    if (pb) ev(pb, "click", function () { running = !running; syncBtns(); });
    if (fb) ev(fb, "click", function () { slowFixed = !slowFixed; reset(); syncBtns(); });
    running = true; syncBtns();

    function pick(k, s) {
      if (k === "rr") { return (rrIdx++) % N; }
      if (k === "lr") { var a = (Math.random() * N) | 0, b = (Math.random() * N) | 0;
        return (s[a].q + s[a].busy) <= (s[b].q + s[b].busy) ? a : b; }
      if (k === "hash") { return (seq * 2654435761 >>> 0) % N; }
      return seq % 2 === 0 ? 0 : 1;   // zone-aware: yerel bölge (0,1) tercih
    }

    loop(function (now) {
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      if (!reduce && running) {
        acc += dt;
        while (acc > 130) {
          acc -= 130; seq++;
          ALG.forEach(function (a) { var s = st[a.k]; s[pick(a.k, s)].q++; });
        }
        ALG.forEach(function (a) {
          st[a.k].forEach(function (inst, i) {
            var slow = (i === SLOW && !slowFixed);
            var rate = (slow ? 0.9 : 5.2) * dt / 1000;   // yavaş örnek ~6× yavaş
            if (inst.busy > 0) { inst.busy = Math.max(0, inst.busy - rate); if (inst.busy === 0) done[a.k]++; }
            if (inst.busy === 0 && inst.q > 0) { inst.q--; inst.busy = 1; }
          });
        });
      }
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);
      var colW = W / ALG.length, pad = 12;
      ALG.forEach(function (a, ai) {
        var x0 = ai * colW;
        c.textAlign = "center"; c.fillStyle = C.t1; c.font = "600 12px " + C.sans;
        c.fillText(a.n, x0 + colW / 2, 16);
        c.fillStyle = C.acc2; c.font = "10px " + C.mono;
        c.fillText(done[a.k] + " tamamlandı", x0 + colW / 2, H - 6);
        if (ai > 0) { c.strokeStyle = C.line; c.beginPath(); c.moveTo(x0, 24); c.lineTo(x0, H - 20); c.stroke(); }
        var bw = (colW - pad * 2) / N - 6;
        for (var i = 0; i < N; i++) {
          var inst = st[a.k][i];
          var bx = x0 + pad + i * ((colW - pad * 2) / N);
          var maxH = H - 62, base = H - 26;
          var qh = Math.min(maxH, inst.q * 7);
          var isSlow = (i === SLOW && !slowFixed);
          c.fillStyle = C.s3; rr(c, bx, base - maxH, bw, maxH, 3); c.fill();
          if (qh > 0) { c.fillStyle = isSlow ? C.danger : C.warn; rr(c, bx, base - qh, bw, qh, 3); c.fill(); }
          if (inst.busy > 0) { c.fillStyle = C.acc2; rr(c, bx, base - qh - 8, bw, 6, 2); c.fill(); }
          c.fillStyle = isSlow ? C.danger : C.t3; c.font = "9px " + C.mono;
          c.fillText(isSlow ? "yavaş" : "#" + (i + 1), bx + bw / 2, base + 12);
        }
      });
      c.textAlign = "left";
      var stat = $("#lbAlgoStat");
      if (stat) {
        var best = Object.keys(done).reduce(function (a, b) { return done[a] >= done[b] ? a : b; });
        var nm = { rr: "Round robin", lr: "Least request", hash: "Tutarlı hash", zone: "Zone-aware" }[best];
        var tot = done.rr + done.lr + done.hash + done.zone;
        stat.innerHTML = !running
          ? '<span style="font-family:' + C.mono + ';color:' + C.warn + '">duraklatıldı — <b>Başlat</b> ile devam edin</span>'
          : tot < 4
            ? '<span style="font-family:' + C.mono + ';color:' + C.t3 + '">ölçülüyor…</span>'
            : '<span style="font-family:' + C.mono + '">önde: <b style="color:' + C.acc2 + '">' + nm +
              '</b> · ' + done[best] + ' istek tamamlandı</span>';
      }
    });
  }

  /* ══════════════════════════ SLAYT: YÜK ATMA ═════════════════════════════ */
  function runShed() {
    var cv = $("#shedCv"); if (!cv) return;
    var TIERS = [
      { n: "critical", c: "#34d399", share: .30, d: "ödeme · giriş" },
      { n: "degraded", c: "#5b8cff", share: .25, d: "sipariş listesi" },
      { n: "best-effort", c: "#fbbf24", share: .25, d: "öneri · prefetch" },
      { n: "bulk", c: "#6b7488", share: .20, d: "telemetri · rapor" }
    ];
    var loadEl = $("#shedLoad"), playBtn = $("#shedPlay"), modeBtn = $("#shedMode");
    var auto = true, running = true, load = 80, phase = 0, last = 0, drops = [];
    function syncBtns() {
      playBtn.innerHTML = running
        ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Başlat';
      modeBtn.innerHTML = auto
        ? '<svg><use href="#i-sliders"/></svg> Elle kontrol'
        : '<svg><use href="#i-play"/></svg> Otomatik dalga';
      loadEl.disabled = auto;
      loadEl.style.opacity = auto ? ".4" : "1";
    }
    ev(loadEl, "input", function (e) { load = +e.target.value; });
    ev(playBtn, "click", function () { running = !running; syncBtns(); });
    ev(modeBtn, "click", function () {
      auto = !auto;
      if (!auto) loadEl.value = Math.round(load);
      syncBtns();
    });
    auto = true; running = true; syncBtns();

    loop(function (now) {
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      /* otomatik mod: yük bir trafik dalgası gibi inip çıkar — izlenecek şey budur */
      if (running) {
        if (auto) {
          phase += dt / 1000;
          load = 150 + Math.sin(phase * 0.42) * 110;          // 40 ↔ 260 arası salınım
          loadEl.value = Math.round(load);
        }
      }
      $("#shedLoadL").textContent = "%" + Math.round(load);

      var cap = 100;
      var accepted = [0, 0, 0, 0], asked = [0, 0, 0, 0], remaining = cap;
      TIERS.forEach(function (tr, i) { asked[i] = load * tr.share; });
      /* kritikten başlayarak kapasite tahsis et; artan kalmazsa alt öncelikler atılır */
      [0, 1, 2, 3].forEach(function (i) {
        var give = Math.min(asked[i], Math.max(0, remaining));
        accepted[i] = give; remaining -= give;
      });

      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var pad = 14, top = 52, bot = H - 46;
      var colW = (W - pad * 2) / TIERS.length;
      var scale = (bot - top) / 190;

      /* düşen istek parçacıkları — hareketin kaynağı */
      if (running && !reduce) {
        TIERS.forEach(function (tr, i) {
          var rate = asked[i] * dt / 2600;
          if (Math.random() < rate) {
            var okp = asked[i] > 0 ? accepted[i] / asked[i] : 1;
            drops.push({ i: i, y: 0, ok: Math.random() < okp, x: (Math.random() - .5) * colW * 0.5 });
          }
        });
        for (var d = drops.length - 1; d >= 0; d--) {
          drops[d].y += dt * 0.42;
          if (drops[d].y > bot - top) drops.splice(d, 1);
        }
        if (drops.length > 160) drops.splice(0, drops.length - 160);
      }

      c.clearRect(0, 0, W, H);
      c.textAlign = "center"; c.font = "10px " + C.mono; c.fillStyle = C.t3;
      c.fillText("KAPASİTE %100 · GELEN YÜK %" + Math.round(load) + (auto ? "  (otomatik dalga)" : "  (elle)"), W / 2, 14);

      /* yük dalgası mini grafiği */
      var wy = 26, wh = 16;
      c.strokeStyle = "rgba(91,140,255,.5)"; c.lineWidth = 1.4; c.beginPath();
      for (var px = 0; px <= W - pad * 2; px += 3) {
        var ph = phase - (1 - px / (W - pad * 2)) * 6;
        var lv = auto ? 150 + Math.sin(ph * 0.42) * 110 : load;
        var py = wy + wh - (lv / 260) * wh;
        px ? c.lineTo(pad + px, py) : c.moveTo(pad + px, py);
      }
      c.stroke();
      c.strokeStyle = "rgba(107,116,136,.5)"; c.setLineDash([3, 3]); c.lineWidth = 1;
      c.beginPath(); c.moveTo(pad, wy + wh - (100 / 260) * wh); c.lineTo(W - pad, wy + wh - (100 / 260) * wh); c.stroke(); c.setLineDash([]);

      TIERS.forEach(function (tr, i) {
        var x = pad + i * colW + colW * 0.16, bw = colW * 0.68;
        var ah = accepted[i] * scale, dh = (asked[i] - accepted[i]) * scale;
        c.fillStyle = C.s3; rr(c, x, top, bw, bot - top, 4); c.fill();
        if (dh > 0.5) { c.fillStyle = C.danger; c.globalAlpha = .8; rr(c, x, Math.max(top, bot - ah - dh), bw, Math.min(dh, bot - top - ah), 4); c.fill(); c.globalAlpha = 1; }
        if (ah > 0.5) { c.fillStyle = tr.c; rr(c, x, bot - ah, bw, ah, 4); c.fill(); }
        /* parçacıklar */
        drops.forEach(function (p) {
          if (p.i !== i) return;
          c.globalAlpha = .85;
          c.fillStyle = p.ok ? tr.c : C.danger;
          c.beginPath(); c.arc(x + bw / 2 + p.x, top + p.y, 2.4, 0, Math.PI * 2); c.fill();
          c.globalAlpha = 1;
        });
        c.textAlign = "center";
        c.fillStyle = C.t1; c.font = "600 11.5px " + C.sans;
        c.fillText(tr.n, x + bw / 2, bot + 16);
        c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
        c.fillText(tr.d, x + bw / 2, bot + 29);
        var pct = asked[i] > 0 ? Math.round(accepted[i] / asked[i] * 100) : 100;
        c.fillStyle = pct >= 99 ? C.good : pct > 40 ? C.warn : C.danger;
        c.font = "700 13px " + C.mono;
        c.fillText("%" + pct, x + bw / 2, top - 8);
      });

      var capY = bot - cap * scale;
      c.strokeStyle = C.t3; c.setLineDash([6, 4]); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(pad, capY); c.lineTo(W - pad, capY); c.stroke(); c.setLineDash([]);
      c.fillStyle = C.t3; c.font = "9px " + C.mono; c.textAlign = "left";
      c.fillText("kapasite", pad + 3, capY - 4);
      c.textAlign = "left";

      var totA = accepted.reduce(function (a, b) { return a + b; }, 0);
      var critPct = asked[0] > 0 ? Math.round(accepted[0] / asked[0] * 100) : 100;
      var stat = $("#shedStat");
      if (stat) {
        stat.innerHTML = '<span style="font-family:' + C.mono + '">kritik: <b style="color:' +
          (critPct >= 99 ? C.good : C.danger) + '">%' + critPct + '</b> · toplam kabul %' + Math.round(totA) + '</span>';
      }
      var note = $("#shedNote").querySelector("div");
      if (load <= 100) {
        note.innerHTML = "<b>Kapasite altında.</b> Gelen yük kapasitenin altında olduğu için dört öncelik de tam hizmet alıyor. " +
          "Yük atma mekanizması bu aralıkta <b>hiç devreye girmez</b> — varlığının bir maliyeti yoktur.";
      } else if (load <= 160) {
        note.innerHTML = "<b>İlk atılanlar en altta.</b> Kapasite aşıldı ve sistem önce <b>bulk</b> (telemetri, rapor) " +
          "trafiğini reddetmeye başladı. Kullanıcı bunu fark etmez; kaybedilen şey arka plan işidir. " +
          "Öncelik sıralaması olmasaydı bu yük rastgele dağılır ve <b>ödeme istekleri de aynı oranda</b> reddedilirdi.";
      } else if (load <= 220) {
        note.innerHTML = "<b>Bozulma kademeli ilerliyor.</b> Bulk tamamen kesildi, <b>best-effort</b> (öneri, ön yükleme) " +
          "de atılmaya başladı. Deneyim zayıflıyor ama <b>çalışıyor</b>: giriş yapılabiliyor, ödeme alınabiliyor. " +
          "Bu, \"herkese kötü hizmet\" yerine \"bazılarına hiç hizmet\" tercihinin somut karşılığıdır.";
      } else {
        note.innerHTML = "<b>Aşırı yük.</b> Yalnızca <b>critical</b> ve kısmen <b>degraded</b> ayakta. Netflix'in ölçtüğü " +
          "sonuç tam olarak budur: gerçek bir kesintide kullanıcı kaynaklı isteklerde <b>%99,4 üzeri</b> erişilebilirlik " +
          "korunurken ön yükleme istekleri %20'ye düştü. Öncelik olmadan bu tabloda <b>her şey</b> aynı anda bozulurdu.";
      }
    });
  }

  /* ══════════════════════════ SLAYT: GÖZLEMLENEBİLİRLİK ═══════════════════ */
  function runObs() {
    var host = $("#obsDash"); if (!host) return;
    var P = [
      { k: "rps", n: "İstek / sn", u: "", base: 4200, col: "#5b8cff", cls: "" },
      { k: "err", n: "Hata oranı", u: "%", base: 0.4, col: "#34d399", cls: "ok", dec: 2 },
      { k: "p99", n: "p99 gecikme", u: " ms", base: 118, col: "#a78bfa", cls: "" },
      { k: "gw", n: "Gateway ek yükü", u: " ms", base: 1.6, col: "#38e1c8", cls: "ok", dec: 1 },
      { k: "429", n: "429 oranı", u: "%", base: 0.9, col: "#fbbf24", cls: "", dec: 1 },
      { k: "cb", n: "Açık devre", u: "", base: 0, col: "#f87171", cls: "" },
      { k: "pool", n: "Havuz doygunluğu", u: "%", base: 42, col: "#f0a15c", cls: "" },
      { k: "cert", n: "Sertifika ömrü", u: " gün", base: 61, col: "#8b6cff", cls: "" }
    ];
    var hist = {}, incident = 0, t0 = performance.now();
    P.forEach(function (p) { hist[p.k] = []; for (var i = 0; i < 40; i++) hist[p.k].push(p.base); });
    host.innerHTML = P.map(function (p) {
      return '<div class="dpanel ' + p.cls + '" data-k="' + p.k + '">' +
        '<div class="dh"><span>' + p.n + '</span><span class="dstate">●</span></div>' +
        '<div class="dv">—</div><canvas height="38"></canvas>' +
        '<div class="dl">son 10 dakika</div></div>';
    }).join("");
    var btn = $("#obsIncident");
    ev(btn, "click", function () { incident = incident ? 0 : performance.now(); });
    loop(function (now) {
      var inc = incident ? Math.min(1, (now - incident) / 3500) : 0;
      P.forEach(function (p) {
        var v = p.base, j = (Math.random() - 0.5);
        if (p.k === "rps") v = p.base * (1 + j * .06) * (1 - inc * .35);
        else if (p.k === "err") v = p.base + inc * 11 + j * .1;
        else if (p.k === "p99") v = p.base * (1 + j * .08) + inc * 640;
        else if (p.k === "gw") v = p.base + j * .12 + inc * .5;
        else if (p.k === "429") v = p.base + j * .2 + inc * 4;
        else if (p.k === "cb") v = inc > .55 ? 2 : 0;
        else if (p.k === "pool") v = p.base + j * 3 + inc * 48;
        else v = p.base;
        hist[p.k].push(Math.max(0, v)); if (hist[p.k].length > 40) hist[p.k].shift();
      });
      $$(".dpanel", host).forEach(function (el) {
        var k = el.dataset.k, p = P.filter(function (x) { return x.k === k; })[0];
        var arr = hist[k], v = arr[arr.length - 1];
        var dec = p.dec || 0;
        el.querySelector(".dv").textContent = (dec ? v.toFixed(dec).replace(".", ",") : nf(Math.round(v))) + p.u;
        var bad = (k === "err" && v > 2) || (k === "p99" && v > 300) || (k === "cb" && v > 0) ||
                  (k === "pool" && v > 80) || (k === "429" && v > 3) || (k === "gw" && v > 4);
        var warnv = !bad && ((k === "err" && v > 1) || (k === "p99" && v > 200) || (k === "pool" && v > 65) || (k === "cert" && v < 20));
        el.classList.toggle("alarm", !!bad);
        el.classList.toggle("warn", !!warnv);
        el.classList.toggle("ok", !bad && !warnv && (k === "err" || k === "gw"));
        el.querySelector(".dstate").style.color = bad ? C.danger : warnv ? C.warn : C.good;
        spark(el.querySelector("canvas"), arr, bad ? C.danger : warnv ? C.warn : p.col, true);
      });
      var badge = $("#obsStatus"), note = $("#obsNote").querySelector("div");
      if (inc > .5) {
        badge.className = "sbadge r"; badge.textContent = "olay · devre açık";
        note.innerHTML = "<b>Ne oldu?</b> Hata oranı ve p99 birlikte yükseldi, bağlantı havuzu doygunluğa gitti ve iki devre kesici açıldı. " +
          "Gateway ek yükü ise <b>neredeyse sabit kaldı</b> — bu, sorunun gateway'de değil <b>arka uçta</b> olduğunun tek bakışta okunan kanıtıdır. " +
          "İstek/sn'nin düşmesi trafik azaldığı için değil, <b>devre kesicinin çağrıları kestiği</b> içindir.";
      } else if (inc > 0) {
        badge.className = "sbadge w"; badge.textContent = "bozulma başladı";
        note.innerHTML = "<b>Erken uyarı.</b> Bağlantı havuzu doygunluğu tırmanıyor ve p99 sapıyor; hata oranı henüz eşiğin altında. " +
          "Doygunluk, kesintiden önce gelen <b>tek güvenilir öncü göstergedir</b> — alarm kurulacak yer burasıdır.";
      } else {
        badge.className = "sbadge g"; badge.textContent = "tüm sinyaller normal";
        note.innerHTML = "<b>Sağlıklı durum.</b> Bu sekiz panel, gateway'in tamamı hakkında konuşabilmek için gereken asgari settir: " +
          "üç RED sinyali, gateway'e özgü ek yük ve 429, doygunluk göstergesi, devre kesici durumu ve sertifika ömrü. " +
          "<b>Olay senaryosunu başlatın</b> ve bir bozulmanın panellerde hangi sırayla göründüğünü izleyin.";
      }
    });
  }

  /* ══════════════════════════ SLAYT: POC ZAMAN ÇİZELGESİ ══════════════════ */
  var GANTT = [
    { n: "İskelet", d: "gateway + 5 servis", s: 1, e: 1, c: "#5b8cff" },
    { n: "Keşif & rota", d: "predicate, iç/dış ayrım", s: 2, e: 2, c: "#5b8cff" },
    { n: "Kimlik", d: "OIDC, JWT, JWKS", s: 3, e: 3, c: "#38e1c8" },
    { n: "Kota", d: "Redis limiter, 429", s: 4, e: 4, c: "#38e1c8" },
    { n: "Gözlemlenebilirlik", d: "trace, RED, dashboard", s: 5, e: 5, c: "#a78bfa" },
    { n: "Dayanıklılık", d: "timeout/retry/CB matrisi", s: 6, e: 6, c: "#a78bfa" },
    { n: "Güvenlik", d: "CORS, TLS, şema", s: 7, e: 7, c: "#a78bfa" },
    { n: "Sürüm geçişi", d: "canary, sunset", s: 8, e: 8, c: "#f0a15c" },
    { n: "Performans", d: "3 aşamalı yük testi", s: 9, e: 9, c: "#f0a15c" },
    { n: "Erişilebilirlik", d: "kesinti tatbikatları", s: 10, e: 10, c: "#f0a15c" },
    { n: "Karar", d: "alternatif + TCO", s: 11, e: 11, c: "#f87171" }
  ];
  function runPoc() {
    var rows = $("#ganttRows"); if (!rows) return;
    var W = 11;
    $("#ganttWeeks").innerHTML = Array.from({ length: W }, function (_, i) { return "<span>" + (i + 1) + "</span>"; }).join("");
    rows.innerHTML = GANTT.map(function (g, i) {
      var l = (g.s - 1) / W * 100, w = (g.e - g.s + 1) / W * 100;
      return '<div class="gantt-row"><div class="gl"><b>' + g.n + '</b>' + g.d + '</div>' +
        '<div class="gantt-track"><div class="gantt-bar" data-i="' + i + '" style="left:' + l + '%;width:' + w + '%;background:' + g.c + '">H' + g.s + '</div></div></div>';
    }).join("");
    var bars = $$(".gantt-bar", rows);
    function play() {
      bars.forEach(function (b) { b.classList.remove("show"); });
      bars.forEach(function (b, i) { later(function () { b.classList.add("show"); }, 130 + i * 150); });
    }
    var pb = $("#ganttPlay");
    ev(pb, "click", play);
    if (reduce) bars.forEach(function (b) { b.classList.add("show"); }); else play();
  }

  /* ══════════════════════════ SLAYT: OWASP ════════════════════════════════ */
  var OWASP = {
    API1: { c: "#f87171", t: "Broken Object Level Authorization", d: "Gateway <b>çözemez</b>: \"42 numaralı kaydın sahibi kim\" sorusunun cevabı yalnızca servisin veritabanındadır. Gateway'in katkısı dolaylıdır — tek bir token'ın kısa sürede çok sayıda farklı nesne kimliğine erişmesini <b>anomali olarak</b> yakalayabilir. Asıl kontrol, her sorguya sahiplik koşulunun eklenmesiyle serviste yapılır." },
    API2: { c: "#34d399", t: "Broken Authentication", d: "Gateway'in <b>en yüksek katkı sağladığı</b> madde. Token doğrulaması tek yerde ve tekdüze yapılır: algoritma allowlist'i, <span class='chip-mono'>iss</span>/<span class='chip-mono'>aud</span>/<span class='chip-mono'>exp</span> kontrolü, JWKS önbelleği ve rotasyonu. Ayrıca kimlik uçlarına kaba kuvvet saldırısına karşı IP bazlı limit uygulanır." },
    API3: { c: "#fbbf24", t: "Broken Object Property Level Authorization", d: "<b>Kısmi.</b> İstek tarafında şema doğrulamayla bilinmeyen alanların geçmesi engellenir (<span class='chip-mono'>additionalProperties: false</span>); yanıt tarafında role göre alan maskeleme yapılabilir. Ancak hangi alanın kime görünmesi gerektiği veri modeline bağlı olduğundan nihai karar serviste kalır." },
    API4: { c: "#34d399", t: "Unrestricted Resource Consumption", d: "Gateway'in <b>doğal alanı</b>. Rate limit ve kota, gövde/başlık/URL boyut sınırları, JSON derinliği, sıkıştırma oranı, timeout, eşzamanlılık sınırı ve yük atma — hepsi tek noktada uygulanır. Bu maddeyi uygulama katmanında çözmeye çalışmak, her serviste tekrarlanan ve tutarsız kod üretir." },
    API5: { c: "#34d399", t: "Broken Function Level Authorization", d: "<b>Kaba taneli düzeyde yüksek katkı.</b> Yönetim uçlarının dış trafiğe hiç açılmaması, rota bazlı rol/scope kontrolü ve iç/dış filo ayrımı bu riski büyük ölçüde kapatır. Fonksiyonun <b>iş bağlamına</b> göre yetkisi ise serviste doğrulanmalıdır." },
    API6: { c: "#fbbf24", t: "Unrestricted Access to Sensitive Business Flows", d: "<b>Kısmi.</b> Bot tespiti, cihaz parmak izi ve davranış hızı limitleri gateway'de uygulanabilir. Ancak \"bu akış kötüye kullanılıyor mu\" sorusu iş bağlamı gerektirir: bilet alma, kampanya kullanma veya hesap açma akışlarının normal deseni yalnızca ürün ekibince bilinir." },
    API7: { c: "#34d399", t: "Server Side Request Forgery", d: "<b>Yüksek katkı</b> — özellikle giden (egress) gateway olarak konumlandırıldığında. Dış çağrılar için hedef allowlist'i uygulanır, iç ağ adres aralıkları ve bulut meta veri uçları reddedilir, yönlendirmeler izlenir. Bu kontrol tek yerde uygulanmazsa her serviste ayrı ayrı unutulur." },
    API8: { c: "#34d399", t: "Security Misconfiguration", d: "<b>Yüksek katkı.</b> TLS sürümü ve şifre takımları, CORS politikası, güvenlik başlıkları, hata gövdelerinin normalize edilmesi ve sürüm bilgisi sızdıran başlıkların kaldırılması merkezî olarak dayatılır. Böylece güvenlik duruşu, en zayıf servisin seviyesine düşmez." },
    API9: { c: "#34d399", t: "Improper Inventory Management", d: "<b>Yüksek katkı.</b> Gateway, hangi API'nin hangi sürümünün yayında olduğunu bilen tek bileşendir. Rota envanteri, sürüm bazlı kullanım telemetrisi ve sunset takibi buradan üretilir. Envantere kayıtlı olmayan bir yolun trafik alması, <b>gölge API</b> tespitinin kendisidir." },
    API10: { c: "#fbbf24", t: "Unsafe Consumption of APIs", d: "<b>Kısmi.</b> Üçüncü taraf API'lerine giden çağrılar bir egress gateway üzerinden geçirilirse: yanıt boyutu sınırlanır, şema doğrulanır, timeout ve devre kesici uygulanır. Ancak dış yanıtın <b>içeriğine</b> duyulan güvenin sorgulanması uygulama sorumluluğundadır." }
  };
  function runSec() {
    var panel = $("#owaspPanel"); if (!panel) return;
    var rows = $$("tr[data-owasp]");
    function sel(k) {
      var d = OWASP[k];
      rows.forEach(function (r) { r.classList.toggle("sel", r.dataset.owasp === k); });
      panel.innerHTML = '<div class="hp-k" style="color:' + d.c + '">' + k + ":2023</div>" +
        '<div class="hp-t">' + d.t + '</div><div class="hp-d">' + d.d + '</div>';
    }
    rows.forEach(function (r) {
      ev(r, "click", function () { sel(r.dataset.owasp); });
    });
    sel("API4");
  }

  /* ══════════════════════════ SLAYT: EKLENTİ MODELLERİ ════════════════════ */
  var PLUG = [
    { n: "Lua / LuaJIT", c: "#5b8cff", perf: 95, iso: 5, dx: 45, hot: 70,
      k: "Kong · APISIX", t: "Lua / LuaJIT — en hızlı, en kırılgan",
      d: "JIT derleyici sıcak kodu makine koduna çevirir ve eklenti proxy ile <b>aynı süreçte, serileştirme olmadan</b> çalışır: performans neredeyse yerel. Bedeli izolasyonun sıfır olmasıdır — hatalı bir eklenti proxy'yi düşürebilir. <b>Ne zaman:</b> hazır eklenti ekosisteminden yararlanacak, nadiren kendi eklentisini yazacak ekipler." },
    { n: "Go (süreç içi)", c: "#38e1c8", perf: 88, iso: 5, dx: 78, hot: 25,
      k: "Tyk · Traefik", t: "Go — tanıdık dil, sürüm cehennemi",
      d: "Standart araçlarla (pprof, delve) hata ayıklanabilir ve geniş bir işe alım havuzu vardır. En sık dile getirilen sorun <b>sürüm uyumudur</b>: eklenti, gateway'in tam derleyici sürümüyle derlenmiş olmalıdır; aksi hâlde yüklenmez. <b>Ne zaman:</b> Go'ya hâkim platform ekipleri." },
    { n: "gRPC / harici süreç", c: "#a78bfa", perf: 35, iso: 98, dx: 85, hot: 95,
      k: "Envoy ext_proc", t: "Harici süreç — tam izolasyon, ağ bedeli",
      d: "Eklenti ayrı bir süreçte çalışır: çökmesi proxy'yi etkilemez ve <b>herhangi bir dilde</b> yazılabilir. Bedeli her çağrıda bir ağ gidiş-dönüşüdür; gecikme bütçesi dar rotalarda kullanılamaz. <b>Ne zaman:</b> ağır, nadir çağrılan veya özel kütüphane gerektiren mantık." },
    { n: "WASM (proxy-wasm)", c: "#f0a15c", perf: 68, iso: 90, dx: 40, hot: 98,
      k: "Envoy · Istio · APISIX", t: "WASM — gerçek sanal alan, zor hata ayıklama",
      d: "Eklenti izole bir sanal makinede çalışır: <b>çöken eklenti proxy'yi düşürmez</b> ve modül çalışma anında yüklenebilir. Veri VM belleğine kopyalandığı için yerel filtreden yavaştır; hata ayıklama belirgin biçimde zordur ve TinyGo standart Go değildir. <b>Ne zaman:</b> çok kiracılı platformlar, güvenilmeyen eklenti kaynakları." },
    { n: "Java", c: "#8b6cff", perf: 72, iso: 5, dx: 92, hot: 20,
      k: "Spring Cloud GW · WSO2", t: "Java — en geniş kurumsal havuz",
      d: "JIT ısındıktan sonra performans yeterlidir ve olgun kütüphane ekosistemi (HSM, imza, LDAP, kurum içi SDK'lar) doğrudan kullanılabilir. İzolasyon yoktur ve yeni eklenti genelde yeniden başlatma ister. <b>Ne zaman:</b> JVM kurumları — eklenti ihtiyacı sürekli ve iş mantığına yakınsa en düşük sürtünmeli seçenek." },
    { n: "JS / TypeScript", c: "#34d399", perf: 55, iso: 60, dx: 96, hot: 96,
      k: "Zuplo · Tyk (JS)", t: "TypeScript — en hızlı yineleme",
      d: "Derleme adımı yoktur, en büyük geliştirici havuzuna sahiptir ve dağıtım genelde Git üzerinden otomatiktir. Performans orta düzeydedir; ağır CPU işleri için uygun değildir. <b>Ne zaman:</b> ürün ekiplerinin kendi eklentisini yazacağı, hızın ikinci planda olduğu senaryolar." }
  ];
  function runPlugins() {
    var pills = $("#plugPills"); if (!pills) return;
    pills.innerHTML = PLUG.map(function (p, i) {
      return '<button class="pill' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' + p.n + "</button>";
    }).join("");
    function sel(i) {
      $$("button", pills).forEach(function (b, j) { b.classList.toggle("on", j === i); });
      var p = PLUG[i];
      cmpBars("#plugCmp", [
        { n: "Performans", v: p.perf, c: p.c, l: p.perf },
        { n: "İzolasyon", v: p.iso, c: p.c, l: p.iso },
        { n: "Gel. deneyimi", v: p.dx, c: p.c, l: p.dx },
        { n: "Sıcak yükleme", v: p.hot, c: p.c, l: p.hot }
      ]);
      $("#plugPanel").innerHTML = '<div class="hp-k" style="color:' + p.c + '">' + p.k + '</div>' +
        '<div class="hp-t">' + p.t + '</div><div class="hp-d">' + p.d + '</div>';
    }
    ev(pills, "click", function (e) {
      var b = e.target.closest("button[data-i]"); if (b) sel(+b.dataset.i);
    });
    sel(0);
  }

  /* ══════════════════════════ SLAYT: KIYASLAMA ARENASI ════════════════════ */
  var AXES = ["Performans", "Özellik zenginliği", "Genişletilebilirlik", "İşletme kolaylığı", "Olgunluk", "Maliyet avantajı"];
  var ARENA = [
    { n: "Spring Cloud Gateway", c: "Kütüphane · JVM", col: "#38e1c8", v: [3, 2.5, 5, 3.5, 4, 5],
      good: ["Ekibin ana dilinde sınırsız özelleştirme", "Spring ekosistemiyle sıfır sürtünme", "Mevcut kurumsal kütüphaneler doğrudan kullanılır", "Lisans maliyeti yok"],
      bad: ["Hazır eklenti pazarı ve portal yok", "JVM bellek tabanı ve JIT ısınması", "Tek düğüm kapasitesi C/Lua sınıfının altında"],
      w: "JVM ağırlıklı kurumlarda, gateway'de <b>iş kuralına yakın özel politika</b> gerektiğinde. Kod yazmayı sorun değil <b>avantaj</b> olarak görüyorsanız doğru seçim." },
    { n: "Envoy / Envoy Gateway", c: "Proxy · C++", col: "#5b8cff", v: [5, 4, 3.5, 2, 4.5, 4.5],
      good: ["Endüstri standardı veri düzlemi", "Olağanüstü trafik yönetimi (outlier, adaptive concurrency)", "xDS ile milisaniyelik dinamik yapılandırma", "Service mesh ile aynı teknoloji"],
      bad: ["Tek başına gateway değil — kontrol düzlemi şart", "Dik öğrenme eğrisi, YAML derinliği", "Eklenti için C++ veya WASM"],
      w: "Kubernetes-native, çok dilli ve <b>platform ekibi olan</b> organizasyonlarda. Kendi kontrol düzleminizi yazacaksanız veri düzlemi olarak da en akıllı tercih." },
    { n: "Apache APISIX", c: "Proxy · NGINX + LuaJIT", col: "#a78bfa", v: [4.5, 4.5, 4, 3, 3.5, 4.5],
      good: ["100'ü aşkın hazır eklenti", "etcd watch ile milisaniyelik yayılım, veritabanı yok", "Çok dilli eklenti (Lua, Java, Go, Python, WASM)", "Sıcak yeniden yükleme"],
      bad: ["etcd kümesi işletme yükü", "Lua bilen mühendis bulmak zor", "Topluluk Kong'a göre küçük"],
      w: "Yüksek performans <b>ve</b> zengin hazır özellik aynı anda gerektiğinde; yapılandırma yayılım hızının güvenlik parametresi olduğu ortamlarda." },
    { n: "Kong", c: "Proxy / API Yön. · Lua", col: "#f0a15c", v: [3.5, 5, 4, 3, 5, 2.5],
      good: ["En olgun ekosistem ve eklenti pazarı", "Güçlü kurumsal destek ve dokümantasyon", "DB-less mod ile GitOps uyumu", "Geliştirici portalı ve API yönetimi"],
      bad: ["Veritabanı anketiyle yayılım saniyeler sürebilir", "Yeni eklenti kodu yeniden yükleme ister", "Konnect fiyatlaması ölçekte hızla artar"],
      w: "Kurumsal bir <b>API programı</b> yürütülüyorsa; hazır özellik ihtiyacı yüksek, özel kod yazma iştahı düşükse en hızlı yol." },
    { n: "Traefik", c: "Proxy · Go", col: "#34d399", v: [3.5, 2.5, 2.5, 5, 4, 4.5],
      good: ["Sıfır yapılandırmaya en yakın deneyim", "Otomatik servis keşfi ve otomatik TLS", "GitOps ve Docker/K8s ile doğal uyum"],
      bad: ["Genişletilebilirlik sınırlı", "İleri API yönetimi özellikleri yok", "Karmaşık politika senaryolarında yetersiz kalır"],
      w: "Küçük–orta Kubernetes kümelerinde, <b>hızlı kurulum</b> ve düşük operasyon önceliğindeyse. Politika ihtiyacı büyüdükçe yerini bırakır." },
    { n: "KrakenD", c: "Proxy · Go, durumsuz", col: "#fbbf24", v: [4.5, 2.5, 2.5, 4.5, 3, 4],
      good: ["Çok kaynaklı yanıt birleştirmede sınıfının en iyisi", "Çalışma anında veritabanı yok — öngörülebilir gecikme", "Tek ikili dosya, kolay dağıtım"],
      bad: ["Durumsuzluk esneklik pahasına gelir", "Dinamik yapılandırma zayıf", "Ekosistem küçük"],
      w: "Mobil/BFF katmanında <b>birden çok servisin yanıtını birleştirmek</b> gerektiğinde ve gecikme bütçesi çok darsa." },
    { n: "Tyk", c: "Proxy / API Yön. · Go", col: "#60a5fa", v: [3.5, 4, 3.5, 3.5, 3.5, 3],
      good: ["Açık kaynak çekirdek yetenekli", "Hava boşluklu (air-gapped) kuruluma uygun", "GraphQL desteği", "Go / gRPC / JS eklenti seçenekleri"],
      bad: ["Yönetim özellikleri ücretli panelde", "Go eklenti sürüm uyumu sancılı", "Redis ve veritabanı bağımlılığı"],
      w: "Şirket içi, regülasyonlu veya internete kapalı ortamlarda; ticari panele bütçe ayrılabiliyorsa." },
    { n: "NGINX", c: "Proxy · C", col: "#8b6cff", v: [4.5, 1.5, 2.5, 4, 5, 5],
      good: ["Efsanevi kararlılık ve performans", "Her ekipte bilen biri vardır", "Çok düşük kaynak tüketimi"],
      bad: ["API yönetimi katmanı yok", "Dinamik yapılandırma zayıf (açık kaynak sürümde)", "Kota, portal, envanter kendiniz yazarsınız"],
      w: "İhtiyaç gerçekten <b>ters vekil + TLS sonlandırma</b>dan ibaretse. \"Gateway\" ihtiyacı varsa tek başına yetmez." },
    { n: "AWS API Gateway", c: "Yönetilen · AWS", col: "#f87171", v: [3, 3.5, 2, 5, 4.5, 1.5],
      good: ["Sıfır operasyon, otomatik ölçekleme", "IAM, Lambda ve WAF ile derin bütünleşme", "Kullandıkça öde, başlangıç maliyeti yok"],
      bad: ["10 MB yük sınırı — değiştirilemez", "Ölçekte pahalı (REST $3,50/milyon)", "Sınırlı özelleştirme, satıcı bağımlılığı"],
      w: "AWS serverless mimarilerde, <b>düşük–orta hacimde</b> ve platform ekibi yokken. Hacim yüz milyonlara çıkınca maliyet yeniden değerlendirilmeli." },
    { n: "Azure API Management", c: "Yönetilen · Azure", col: "#7aa2ff", v: [3, 4.5, 2.5, 4.5, 4, 1.5],
      good: ["Kurumsal özellikler hazır gelir", "Entra ID (Azure AD) ile doğal bütünleşme", "Geliştirici portalı dâhil"],
      bad: ["Policy dili XML — karmaşık senaryolarda hantal", "WebSocket / SSE / gRPC akış desteği sınırlı", "Premium katman maliyeti yüksek"],
      w: "Microsoft ekosistemine yerleşmiş kurumlarda. <b>Gerçek zamanlı akış</b> gerektiren ürünlerde bu kısıt ilk eleme kriteridir." },
    { n: "Apigee", c: "Yönetilen · Google", col: "#e06666", v: [3, 5, 3, 3, 5, 1],
      good: ["En olgun API yönetimi platformu", "Güçlü analitik ve monetizasyon", "Kapsamlı politika kütüphanesi"],
      bad: ["Kurulum ve işletme karmaşık", "Dik öğrenme eğrisi", "En yüksek maliyet sınıfı"],
      w: "Dış geliştirici ekosistemi olan, API'yi <b>gelir getiren bir ürün</b> olarak yöneten büyük organizasyonlarda." },
    { n: "WSO2 API Manager", c: "API Yönetimi · Java", col: "#5ddbb8", v: [2.5, 5, 4, 2.5, 4, 3.5],
      good: ["Açık kaynak tam API yönetimi", "Şirket içi ve hibritte güçlü", "Olgun AI gateway yetenekleri", "Java ile genişletilebilir"],
      bad: ["Ağır; yüksek kaynak tüketimi", "Karmaşık mimari, uzun kurulum", "Topluluk desteği sınırlı"],
      w: "Şirket içi veya çoklu bulut zorunluluğu olan, <b>tam API yönetimi</b> isteyen ve bütçesi lisans yerine donanıma ayrılmış kurumlarda." }
  ];
  function runArena() {
    var list = $("#arenaList"), body = $("#arenaBody"); if (!list) return;
    list.innerHTML = ARENA.map(function (p, i) {
      return '<button class="arena-item' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' + p.n +
        '<span class="ac">' + p.c + '</span></button>';
    }).join("");
    ev(list, "click", function (e) {
      var b = e.target.closest("button[data-i]"); if (b) sel(+b.dataset.i);
    });
    var cur = 0, anim = 0;
    function sel(i) {
      cur = i; anim = 0;
      $$(".arena-item", list).forEach(function (b, j) { b.classList.toggle("on", j === i); });
      var p = ARENA[i];
      body.innerHTML =
        '<div class="arena-top">' +
          '<div>' +
            '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
              '<h3 style="font-size:19px">' + p.n + '</h3>' +
              '<span class="sbadge a" style="border-color:' + p.col + '66;color:' + p.col + ';background:transparent">' + p.c + '</span></div>' +
            '<p style="color:var(--t2);font-size:14px;line-height:1.55;margin-top:9px"><b>Nerede kullanılmalı:</b> ' + p.w + '</p>' +
            '<div class="cmp" id="arenaBars" style="margin-top:12px"></div>' +
          '</div>' +
          '<canvas class="arena-radar" id="arenaCv" height="250"></canvas>' +
        '</div>' +
        '<div class="arena-vs">' +
          '<div class="vs-col good"><h4>Güçlü yanları</h4><ul>' + p.good.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></div>' +
          '<div class="vs-col bad"><h4>Zayıf yanları</h4><ul>' + p.bad.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></div>' +
        '</div>';
      cmpBars("#arenaBars", AXES.map(function (a, k) {
        return { n: a, v: p.v[k] / 5 * 100, c: p.col, l: p.v[k].toString().replace(".", ",") + "/5" };
      }));
    }
    sel(cur);
    runMatrix(function (i) { sel(i); document.querySelector('.slide.active').scrollTop = 0; });
    loop(function () {
      var cv = $("#arenaCv"); if (!cv) return;
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      if (anim < 1) anim = Math.min(1, anim + (reduce ? 1 : 0.045));
      c.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H / 2 + 2, R = Math.min(W - 54, H - 34) * 0.5;
      var n = AXES.length, p = ARENA[cur];
      // ızgara
      for (var ring = 1; ring <= 5; ring++) {
        c.beginPath();
        for (var i = 0; i <= n; i++) {
          var a = -Math.PI / 2 + (i % n) * (Math.PI * 2 / n), r = R * ring / 5;
          i ? c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        c.closePath(); c.strokeStyle = ring === 5 ? C.line2 : C.line; c.lineWidth = 1; c.stroke();
      }
      for (var i2 = 0; i2 < n; i2++) {
        var a2 = -Math.PI / 2 + i2 * (Math.PI * 2 / n);
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R);
        c.strokeStyle = C.line; c.stroke();
        c.fillStyle = C.t3; c.font = "9px " + C.mono; c.textAlign = "center";
        var lx = cx + Math.cos(a2) * (R + 16), ly = cy + Math.sin(a2) * (R + 16) + 3;
        c.fillText(AXES[i2].split(' ')[0].slice(0, 11), lx, ly);
      }
      // veri
      c.beginPath();
      for (var i3 = 0; i3 <= n; i3++) {
        var k = i3 % n, a3 = -Math.PI / 2 + k * (Math.PI * 2 / n), r3 = R * (p.v[k] / 5) * anim;
        i3 ? c.lineTo(cx + Math.cos(a3) * r3, cy + Math.sin(a3) * r3) : c.moveTo(cx + Math.cos(a3) * r3, cy + Math.sin(a3) * r3);
      }
      c.closePath();
      c.fillStyle = p.col + "33"; c.fill();
      c.strokeStyle = p.col; c.lineWidth = 2; c.stroke();
      for (var i4 = 0; i4 < n; i4++) {
        var a4 = -Math.PI / 2 + i4 * (Math.PI * 2 / n), r4 = R * (p.v[i4] / 5) * anim;
        c.fillStyle = p.col;
        c.beginPath(); c.arc(cx + Math.cos(a4) * r4, cy + Math.sin(a4) * r4, 3, 0, Math.PI * 2); c.fill();
      }
      c.textAlign = "left";
    });
  }

  /* ══════════════════════════ SLAYT: RESILIENCE4J ═════════════════════════ */
  function runR4j() {
    var cv = $("#r4jCv"); if (!cv) return;
    var els = { win: $("#r4jWin"), thr: $("#r4jThr"), wait: $("#r4jWait"), err: $("#r4jErr") };
    function bind(el, lbl, fmt) {
      ev(el, "input", function () { $(lbl).textContent = fmt(+el.value); });
    }
    bind(els.win, "#r4jWinL", function (v) { return v; });
    bind(els.thr, "#r4jThrL", function (v) { return v + "%"; });
    bind(els.wait, "#r4jWaitL", function (v) { return v + " sn"; });
    bind(els.err, "#r4jErrL", function (v) { return v + "%"; });
    $("#r4jWinL").textContent = els.win.value;
    $("#r4jThrL").textContent = els.thr.value + "%";
    $("#r4jWaitL").textContent = els.wait.value + " sn";
    $("#r4jErrL").textContent = els.err.value + "%";

    techTabs("#r4jTech", "#r4jTechBody", [
      "<b>Nedir?</b> Java için hafif bir hata toleransı kütüphanesi. Beş bağımsız desen sunar: " +
      "<b>CircuitBreaker</b> (devre kesici), <b>RateLimiter</b>, <b>Retry</b>, <b>Bulkhead</b> (eşzamanlılık izolasyonu) ve " +
      "<b>TimeLimiter</b>. Her biri tek başına veya birleştirilerek kullanılabilir; Spring Cloud Gateway'in " +
      "<span class='chip-mono'>CircuitBreaker</span> filtresi bu kütüphaneyi sarmalar." +
      "<div class='kv'><b>Kapsam</b><span>Yalnızca JVM. Diğer dillerde muadilleri: Polly (.NET), gobreaker (Go), Envoy'un yerleşik outlier detection'ı.</span></div>",

      "<b>Neden gerekli?</b> Çünkü <b>timeout tek başına yetmez</b>. Arka uç çöktüğünde her istek timeout süresi kadar " +
      "bekler; 2 saniyelik timeout ile saniyede 500 istek, 1.000 askıda çağrı demektir. Bağlantı havuzu dolar, " +
      "iş parçacıkları tükenir ve <b>gateway'in kendisi çöker</b> — arka uç sorunu bir gateway kesintisine dönüşür." +
      "<ul><li>Devre kesici, başarısız olacağı bilinen çağrıyı hiç yapmaz</li>" +
      "<li>Bulkhead, tek bir yavaş arka ucun tüm kaynakları tüketmesini engeller</li>" +
      "<li>Bütçeli retry, geçici hatayı kalıcı kesintiye çevirmeden telafi eder</li></ul>",

      "<b>Nasıl çalışır?</b> Devre kesici bir <b>kayan pencere</b> tutar (sayı veya zaman tabanlı) ve her çağrının " +
      "sonucunu kaydeder. Pencere en az <span class='chip-mono'>minimumNumberOfCalls</span> kadar dolduğunda hata oranı " +
      "hesaplanır; eşik aşılırsa durum <b>OPEN</b>'a geçer ve çağrılar anında reddedilir. " +
      "<span class='chip-mono'>waitDurationInOpenState</span> sonunda <b>HALF_OPEN</b>'a geçilir: sınırlı sayıda deneme " +
      "isteği geçirilir, sonuçlarına göre devre kapanır veya yeniden açılır." +
      "<div class='kv'><b>Kritik nokta</b><span>Devre kesici yalnızca <b>tamamlanan</b> çağrıları sayar. Yavaş bir arka uç hata döndürmez — bu yüzden TimeLimiter veya slowCallRateThreshold olmadan mekanizma kördür.</span></div>",

      "<b>Neden Resilience4j, alternatifi değil?</b> Öncülü <b>Hystrix</b> 2018'de bakım moduna alındı ve her çağrı için " +
      "ayrı iş parçacığı havuzu kullanan modeli reaktif yığınlarla uyumsuzdu. Resilience4j fonksiyonel, bağımlılıksız " +
      "(yalnızca Vavr) ve <b>reaktif akışlarla uyumludur</b>; Spring Boot 3/4 ile birinci sınıf bütünleşiktir." +
      "<ul><li><b>Sentinel</b> (Alibaba) daha zengindir ama ekosistemi ağırlıklı olarak Çin'dedir</li>" +
      "<li><b>Service mesh</b> aynı işi kod dışında yapar — ancak <b>iş bağlamını bilmez</b>: \"ödeme çağrısı\" ile \"öneri çağrısı\" arasındaki farkı ayırt edemez</li>" +
      "<li>Gateway'de kütüphane kullanmanın avantajı, politikanın <b>rota kimliğiyle</b> eşleşebilmesidir</li></ul>"
    ]);

    loop(function () {
      var win = +els.win.value, thr = +els.thr.value, wait = +els.wait.value, err = +els.err.value;
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);

      // hata oranının pencere üzerinden tahmini dağılımı (binom yaklaşımı)
      var p = err / 100;
      var sd = Math.sqrt(Math.max(1e-6, p * (1 - p) / win)) * 100;
      var mean = err;
      // grafik: pencere hata oranı dağılımı + eşik
      var pad = 12, top = 22, bot = H - 26;
      c.font = "9.5px " + C.mono; c.fillStyle = C.t3; c.textAlign = "left";
      c.fillText("PENCERE HATA ORANI DAĞILIMI (n=" + win + ")", pad, 13);
      function xOf(v) { return pad + (W - pad * 2) * (v / 100); }
      // eğri
      c.beginPath();
      for (var v = 0; v <= 100; v += 1) {
        var y = Math.exp(-0.5 * Math.pow((v - mean) / Math.max(0.8, sd), 2));
        var py = bot - y * (bot - top);
        v ? c.lineTo(xOf(v), py) : c.moveTo(xOf(v), py);
      }
      c.strokeStyle = C.acc; c.lineWidth = 1.8; c.stroke();
      c.lineTo(xOf(100), bot); c.lineTo(xOf(0), bot); c.closePath();
      c.fillStyle = "rgba(91,140,255,.14)"; c.fill();
      // eşiğin sağındaki alan = açılma olasılığı
      c.beginPath();
      for (var v2 = thr; v2 <= 100; v2 += 1) {
        var y2 = Math.exp(-0.5 * Math.pow((v2 - mean) / Math.max(0.8, sd), 2));
        var py2 = bot - y2 * (bot - top);
        v2 === thr ? c.moveTo(xOf(v2), py2) : c.lineTo(xOf(v2), py2);
      }
      c.lineTo(xOf(100), bot); c.lineTo(xOf(thr), bot); c.closePath();
      c.fillStyle = "rgba(248,113,113,.30)"; c.fill();
      // eşik çizgisi
      c.strokeStyle = C.danger; c.lineWidth = 1.8; c.setLineDash([4, 3]);
      c.beginPath(); c.moveTo(xOf(thr), top - 6); c.lineTo(xOf(thr), bot); c.stroke(); c.setLineDash([]);
      c.fillStyle = C.danger; c.font = "10px " + C.mono;
      c.fillText("eşik %" + thr, Math.min(W - 66, xOf(thr) + 5), top + 2);
      c.fillStyle = C.t3;
      c.fillText("%0", pad, bot + 14); c.fillText("%100", W - pad - 26, bot + 14);

      // metrikler
      var z = (thr - mean) / Math.max(0.8, sd);
      var pOpen = 1 / (1 + Math.exp(1.702 * z));          // lojistik yaklaşım
      var callsToTrip = Math.max(win, Math.ceil(win / Math.max(0.02, p)));
      var tripSec = p * 100 >= thr ? (win * 0.11).toFixed(1) : "—";
      $("#r4jTrip").textContent = p * 100 >= thr ? tripSec + " sn" : "açılmaz";
      $("#r4jSaved").textContent = p * 100 >= thr ? "%" + Math.round(p * 100) : "%0";
      var falseRisk = (mean < thr) ? pOpen : 1 - pOpen;
      $("#r4jFalse").textContent = "%" + Math.round(Math.min(99, falseRisk * 100));
      $("#r4jRec").textContent = wait + "–" + (wait + Math.round(win * 0.11)) + " sn";

      var verdict = $("#r4jVerdict"), note = $("#r4jNote").querySelector("div");
      var msg, cls;
      if (win <= 10 && falseRisk > 0.15) {
        cls = "r"; msg = "<b>Pencere çok küçük.</b> " + win + " çağrılık pencerede birkaç ardışık hata, oranı eşiğin üstüne " +
          "taşımaya yeter. Sonuç: sağlıklı bir arka uçta bile devrenin <b>gereksiz açılması</b>. Düşük trafikli rotalarda " +
          "bu etki daha da belirginleşir — pencereyi büyütün veya zaman tabanlı pencereye geçin.";
      } else if (thr >= 80) {
        cls = "w"; msg = "<b>Eşik çok yüksek.</b> %" + thr + " hata oranına ulaşana kadar devre açılmaz; bu, isteklerin " +
          "neredeyse tamamı başarısız olurken hâlâ arka uca yük bindirmek demektir. Yüksek eşik yalnızca <b>hatayı normal " +
          "kabul eden</b> rotalarda (örneğin isteğe bağlı zenginleştirme) savunulabilir.";
      } else if (thr <= 20) {
        cls = "w"; msg = "<b>Eşik çok düşük.</b> %" + thr + " ile devre, geçici dalgalanmalarda bile açılır. Bu ayar yalnızca " +
          "<b>kritik yazma rotalarında</b> (ödeme gibi) bilinçli bir tercih olarak anlamlıdır: orada yanlış açılmanın maliyeti, " +
          "hatalı işlem maliyetinden düşüktür.";
      } else if (wait <= 4) {
        cls = "w"; msg = "<b>Açık kalma süresi kısa.</b> " + wait + " saniye sonra deneme istekleri gönderilir; arka uç " +
          "henüz toparlanmadıysa devre sürekli açılıp kapanır (<b>flapping</b>) ve her döngüde çökmüş servise yeni yük biner. " +
          "Arka ucun tipik toparlanma süresini ölçüp bunun üstüne çıkın.";
      } else if (wait >= 45) {
        cls = "w"; msg = "<b>Açık kalma süresi uzun.</b> Arka uç 5 saniyede toparlansa bile kullanıcılar " + wait +
          " saniye boyunca hizmet alamaz. Uzun süre yalnızca toparlanması gerçekten yavaş olan (yeniden başlatma, önbellek " +
          "ısıtma gerektiren) arka uçlarda gerekçelendirilebilir.";
      } else {
        cls = "g"; msg = "<b>Dengeli yapılandırma.</b> Pencere istatistiksel olarak anlamlı (" + win + " çağrı), eşik " +
          "gürültüye dayanıklı (%" + thr + ") ve açık kalma süresi (" + wait + " sn) toparlanmaya fırsat tanıyor. " +
          "Bu üçlüyü sabitledikten sonra sıradaki adım <b>slowCallRateThreshold</b> eklemektir: üretimde arka uç genelde " +
          "hata vermez, <b>yavaşlar</b>.";
      }
      verdict.className = "sbadge " + cls;
      verdict.textContent = cls === "g" ? "dengeli" : cls === "w" ? "gözden geçirin" : "riskli";
      note.innerHTML = msg;
    });
  }

  /* ════════════ SLAYT 25 · DEKORATÖR ZİNCİRİ (SARMALAMA SIRASI) ═══════════ */
  function runDecChain() {
    var cv = $("#dcCv"); if (!cv) return;

    /* Sıra dıştan içe. Retry en dışta olmalı: devre kesici tek bir MANTIKSAL
       sonucu görsün, denemelerin her birini ayrı başarısızlık saymasın. */
    var MODS = [
      { k: "retry", n: "Retry", ic: "i-repeat", col: "#a78bfa",
        t: "Geçici hatayı, kalıcı kesintiye dönüşmeden telafi eder.",
        prot: "Ağ dalgalanması, tek düğümün anlık hatası, 503 dönen bir örnek.",
        risk: "Bütçesiz retry, arıza anında yükü katlar ve olayı büyütür (retry storm).",
        yml: "maxAttempts: 3\nwaitDuration: 200ms\nenableExponentialBackoff: true\nretryExceptions: [ IOException, TimeoutException ]",
        why: "En dışta: devre kesici bir mantıksal çağrının tek sonucunu görsün." },
      { k: "cb", n: "CircuitBreaker", ic: "i-breaker", col: "#f87171",
        t: "Başarısız olacağı bilinen çağrıyı hiç yapmaz.",
        prot: "Çökmüş ya da yavaşlamış arka uca yük bindirmeyi durdurur; gateway'in bağlantı havuzunu korur.",
        risk: "Eşik yanlışsa sağlıklı çağrıları da keser; pencere küçükse gürültüye tepki verir.",
        yml: "slidingWindowType: TIME_BASED\nslidingWindowSize: 10\nfailureRateThreshold: 50\nslowCallRateThreshold: 60\nwaitDurationInOpenState: 10s",
        why: "Retry'ın içinde, hız sınırının dışında: sağlık kararı hız kararından önce gelir." },
      { k: "rl", n: "RateLimiter", ic: "i-gauge", col: "#5b8cff",
        t: "Belirli bir zaman diliminde geçen çağrı sayısını sınırlar.",
        prot: "Arka ucun sözleşmeli kapasitesini aşmamak; paylaşılan bir kaynağı adil bölüştürmek.",
        risk: "Devre kesicinin dışına konursa, reddedilen çağrılar sağlık metriğini kirletir.",
        yml: "limitForPeriod: 100\nlimitRefreshPeriod: 1s\ntimeoutDuration: 0",
        why: "Devre kesicinin içinde: hız reddi bir arka uç arızası değildir, öyle sayılmamalı." },
      { k: "tl", n: "TimeLimiter", ic: "i-timer", col: "#38e1c8",
        t: "Çağrıya süre bütçesi koyar ve aşarsa iptal eder.",
        prot: "Sonsuza kadar bekleyen çağrıyı kesmek. Devre kesicinin YAVAŞLIĞI görebilmesi bunu gerektirir.",
        risk: "Bütçe p99'un altındaysa sağlıklı çağrılar da kesilir; iptal edilen yazma işlemi belirsiz kalır.",
        yml: "timeoutDuration: 2s\ncancelRunningFuture: true",
        why: "Devre kesiciye 'başarısızlık' sinyalini üreten katman; onun içinde olmalı." },
      { k: "bh", n: "Bulkhead", ic: "i-shuffle", col: "#f0a15c",
        t: "Eşzamanlı çağrı sayısını sınırlayarak kaynak izolasyonu sağlar.",
        prot: "Tek bir yavaş arka ucun tüm iş parçacıklarını / bağlantıları tüketmesini engeller.",
        risk: "Sınır çok düşükse normal yükte bile reddeder; çok yüksekse hiç korumaz.",
        yml: "maxConcurrentCalls: 25\nmaxWaitDuration: 0",
        why: "En içte: kaynak rezervasyonu, çağrıya en yakın kararıdır." }
    ];
    var CORE = { n: "Arka uç çağrısı", col: "#34d399" };

    var on = { retry: true, cb: true, rl: true, tl: true, bh: true };
    var rev = false, playing = true, detail = "cb", stopCnt = {}, ok = 0, saved = 0, stops = 0;
    var cbWin = [], cbState = "CLOSED", cbOpenedAt = 0, bhBusy = 0;
    var tok = null, nextAt = 0, evtMsg = "", evtCol = null;
    MODS.forEach(function (m) { stopCnt[m.k] = 0; });

    function order() {
      var a = MODS.filter(function (m) { return on[m.k]; });
      if (rev) {   /* Retry ile CircuitBreaker yer değiştirir */
        var i = a.findIndex(function (m) { return m.k === "retry"; });
        var j = a.findIndex(function (m) { return m.k === "cb"; });
        if (i >= 0 && j >= 0) { var t = a[i]; a[i] = a[j]; a[j] = t; }
      }
      return a;
    }

    /* ── kontroller ─────────────────────────────────────────────────────── */
    function drawMods() {
      var st = order();
      $("#dcMods").innerHTML = MODS.map(function (m) {
        var pos = st.findIndex(function (x) { return x.k === m.k; });
        return '<button class="dcmod ' + (on[m.k] ? "on" : "off") + '" data-k="' + m.k + '">' +
          '<span class="sw" style="' + (on[m.k] ? "background:" + m.col + ";box-shadow:0 0 8px " + m.col + "80" : "") + '"></span>' +
          m.n + '<span class="ord">' + (on[m.k] ? "#" + (pos + 1) : "kapalı") + "</span></button>";
      }).join("");
    }
    function drawDetail() {
      var m = MODS.filter(function (x) { return x.k === detail; })[0];
      var st = order(), pos = st.findIndex(function (x) { return x.k === m.k; });
      $("#dcDetail").innerHTML =
        '<div class="dh"><svg style="color:' + m.col + '"><use href="#' + m.ic + '"/></svg>' +
          "<h4>" + m.n + '</h4><span class="dord">' +
          (on[m.k] ? "sarmalama #" + (pos + 1) + " · " + (pos === 0 ? "en dışta" : pos === st.length - 1 ? "en içte" : "orta") : "devre dışı") +
        "</span></div>" +
        "<p>" + m.t + "</p>" +
        '<div class="dkv">' +
          "<div><b>Neyi korur</b><span>" + m.prot + "</span></div>" +
          "<div><b>Riski</b><span>" + m.risk + "</span></div>" +
          "<div><b>Sıradaki yeri</b><span>" + m.why + "</span></div>" +
        "</div>" +
        '<div class="dyml">' + m.yml + "</div>";
    }
    drawMods(); drawDetail();
    ev($("#dcMods"), "click", function (e) {
      var b = e.target.closest(".dcmod"); if (!b) return;
      var k = b.dataset.k;
      if (detail === k) on[k] = !on[k]; else detail = k;   /* ilk tık seçer, ikincisi açar/kapatır */
      drawMods(); drawDetail(); resetTok();
    });

    var pb = $("#dcPlay");
    function syncPb() {
      pb.innerHTML = playing ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Devam et';
    }
    syncPb();
    ev(pb, "click", function () { playing = !playing; syncPb(); });
    ev($("#dcStep"), "click", function () { playing = false; syncPb(); spawn(); });
    ev($("#dcOrder"), "click", function () {
      rev = !rev;
      $("#dcOrderNote").hidden = !rev;
      $("#dcOrder").classList.toggle("pri", rev);
      cbWin = []; cbState = "CLOSED";
      drawMods(); drawDetail(); resetTok();
    });

    function resetTok() { tok = null; nextAt = 0; }
    function errRate() { var e2 = $("#r4jErr"); return e2 ? +e2.value : 30; }

    /* ── zincir mantığı ─────────────────────────────────────────────────── */
    function decide(m, now) {
      if (m.k === "retry") return false;                     /* retry reddetmez, yeniden dener */
      if (m.k === "bh") return bhBusy >= 3;                  /* eşzamanlılık dolu */
      if (m.k === "rl") return Math.random() < 0.10;
      if (m.k === "tl") return false;                        /* kararı çağrı sonucu belirler */
      /* cb */
      if (cbState === "OPEN") {
        if (now - cbOpenedAt > 4200) { cbState = "CLOSED"; cbWin = []; return false; }
        return true;
      }
      return false;
    }
    function noteCb(bad) {
      cbWin.push(bad); if (cbWin.length > 12) cbWin.shift();
      if (cbWin.length >= 6) {
        var f = cbWin.filter(function (x) { return x; }).length / cbWin.length;
        if (f >= 0.5) { cbState = "OPEN"; cbOpenedAt = performance.now(); }
      }
    }
    function spawn() {
      var st = order();
      tok = { at: -1, phase: "in", x: 0, tx: 0, t0: 0, att: 1, stopK: null, st: st, hit: null, dead: false };
    }

    /* ── çizim yardımcıları ─────────────────────────────────────────────── */
    function geo(W, H) {
      var st = order(), n = st.length;
      var top = 30, bot = H - 26, left = 14, right = W - 14;
      var stepX = Math.min(46, (W * 0.5 - 90) / Math.max(1, n));
      var stepY = Math.min(21, (bot - top - 92) / (2 * Math.max(1, n)));
      var boxes = st.map(function (m, i) {
        return { m: m, x: left + i * stepX, y: top + i * stepY,
                 w: right - left - i * stepX * 2, h: bot - top - i * stepY * 2 };
      });
      var inner = boxes.length ? boxes[boxes.length - 1] : { x: left, y: top, w: right - left, h: bot - top };
      var cx = left + (right - left) / 2, cy = top + (bot - top) / 2;
      return { st: st, boxes: boxes, cx: cx, cy: cy, inner: inner, left: left, top: top, bot: bot };
    }

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var G = geo(W, H);

      if (playing && !reduce && !tok && now > nextAt) spawn();

      /* ── token ilerlemesi ── */
      if (tok) {
        var HOP = 320;
        if (!tok.t0) tok.t0 = now;
        var pr = Math.min(1, (now - tok.t0) / HOP);
        var stops2 = [];
        stops2.push(G.left - 6);
        G.boxes.forEach(function (b) { stops2.push(b.x + 12); });
        stops2.push(G.cx);
        var idx = tok.at + 1;                       /* 0 = dış kapı */
        var from = stops2[Math.max(0, Math.min(stops2.length - 1, idx))];
        var to = stops2[Math.max(0, Math.min(stops2.length - 1, idx + (tok.phase === "in" ? 1 : -1)))];
        tok.x = from + (to - from) * (pr * pr * (3 - 2 * pr));

        if (pr >= 1) {
          tok.t0 = now;
          if (tok.phase === "in") {
            tok.at++;
            if (tok.at < G.boxes.length) {
              var m = G.boxes[tok.at].m;
              if (m.k === "bh") bhBusy++;
              if (decide(m, now)) {
                tok.phase = "out"; tok.stopK = m.k; tok.hit = tok.at;
                stopCnt[m.k]++; stops++;
                evtMsg = "<b style='color:" + m.col + "'>" + m.n + " reddetti.</b> " +
                  (m.k === "cb" ? "Devre AÇIK: arka uca hiç gidilmiyor, fallback dönüyor."
                   : m.k === "bh" ? "Eşzamanlılık sınırı dolu: yeni çağrı kabul edilmiyor."
                   : "Hız sınırı aşıldı: istek bu pencerede geçemez.");
                evtCol = m.col;
              }
            } else {
              /* çekirdek: gerçek arka uç çağrısı */
              var fail = Math.random() * 100 < errRate();
              var slow = !fail && Math.random() < 0.18;
              var tlOn = on.tl && G.boxes.some(function (b) { return b.m.k === "tl"; });
              var bad = fail || (slow && tlOn);
              var cbIn = G.boxes.some(function (b) { return b.m.k === "cb"; });
              if (cbIn) noteCb(bad);
              tok.phase = "out";
              if (bad) {
                tok.stopK = slow && !fail ? "tl" : "core"; tok.hit = G.boxes.length - 1;
                if (slow && !fail) { stopCnt.tl++; stops++; }
                evtMsg = slow && !fail
                  ? "<b style='color:#38e1c8'>TimeLimiter kesti.</b> Arka uç hata dönmedi, <b>yavaşladı</b>. Bütçe aşıldı ve çağrı iptal edildi — devre kesici bunu bir başarısızlık olarak sayabildi."
                  : "<b style='color:#f87171'>Arka uç hata döndü.</b> Sonuç devre kesicinin penceresine yazıldı.";
                evtCol = slow && !fail ? "#38e1c8" : "#f87171";
              } else {
                tok.stopK = null; ok++;
                if (tok.att > 1) saved++;
                evtMsg = tok.att > 1
                  ? "<b style='color:#a78bfa'>Retry kurtardı.</b> " + tok.att + ". denemede arka uca ulaşıldı; kullanıcı hatayı hiç görmedi."
                  : "<b style='color:#34d399'>Çağrı tüm katmanlardan geçti</b> ve arka uçtan başarılı yanıt döndü.";
                evtCol = "#34d399";
              }
            }
          } else {
            /* dışa doğru */
            if (tok.at >= 0 && G.boxes[tok.at] && G.boxes[tok.at].m.k === "bh") bhBusy = Math.max(0, bhBusy - 1);
            tok.at--;
            if (tok.at < 0) {
              /* Retry en dıştaysa ve içeride bir sorun olduysa yeniden dener */
              var outer = G.boxes[0];
              var retryOutside = outer && outer.m.k === "retry";
              if (retryOutside && tok.stopK && tok.stopK !== "rl" && tok.att < 3) {
                tok.att++; tok.phase = "in"; tok.at = 0; tok.stopK = null; tok.hit = null;
                evtMsg = "<b style='color:#a78bfa'>Retry yeniden deniyor</b> (" + tok.att + "/3) — " +
                  "200 ms bekleme + jitter. Devre kesici bunu hâlâ <b>tek</b> mantıksal çağrı olarak görüyor.";
                evtCol = "#a78bfa";
              } else {
                if (rev && tok.stopK) {
                  evtMsg = "<b style='color:#f87171'>Sıra ters:</b> bu denemenin başarısızlığı devre kesiciye " +
                    "<b>ayrı</b> bir hata olarak yazıldı. Aynı mantıksal çağrının 3 denemesi = 3 hata.";
                }
                bhBusy = 0; tok = null; nextAt = now + 260;
              }
            }
          }
        }
      }

      /* ── sahne ── */
      c.clearRect(0, 0, W, H);
      c.font = "9px " + C.mono; c.fillStyle = C.t3; c.textAlign = "left";
      c.fillText("DIŞTAN İÇE SARMALAMA · İSTEK SOLDAN GİRER, ÇEKİRDEĞE ULAŞIR, AYNI YOLDAN DÖNER", 14, 14);
      c.textAlign = "right";
      c.fillStyle = cbState === "OPEN" ? C.danger : C.t3;
      c.fillText("devre: " + (cbState === "OPEN" ? "AÇIK" : "KAPALI") + " · eşzamanlı: " + bhBusy + "/3", W - 14, 14);
      c.textAlign = "left";

      G.boxes.forEach(function (b, i) {
        var lit = tok && tok.phase === "in" && tok.at >= i;
        var hitNow = tok && tok.hit === i && tok.stopK === b.m.k;
        c.strokeStyle = hitNow ? b.m.col : lit ? b.m.col : C.line2;
        c.lineWidth = hitNow ? 2.6 : lit ? 1.9 : 1.1;
        c.globalAlpha = hitNow ? 1 : lit ? 0.95 : 0.55;
        rr(c, b.x, b.y, b.w, b.h, 9); c.stroke();
        if (hitNow) { c.globalAlpha = 0.11; c.fillStyle = b.m.col; c.fill(); }
        c.globalAlpha = 1;
        /* etiket */
        var lx = b.x + 12, ly = b.y + 12;
        c.fillStyle = C.canvas; c.fillRect(lx - 4, ly - 8, c.measureText(b.m.n).width + 30, 11);
        c.font = "9.5px " + C.mono;
        c.fillStyle = hitNow || lit ? b.m.col : C.t3;
        c.fillText((i + 1) + " " + b.m.n.toUpperCase(), lx, ly);
      });

      /* çekirdek */
      var cr = 22;
      c.beginPath(); c.arc(G.cx, G.cy, cr, 0, 7);
      c.fillStyle = C.canvas; c.fill();
      c.strokeStyle = tok && tok.at >= G.boxes.length ? CORE.col : C.line2;
      c.lineWidth = tok && tok.at >= G.boxes.length ? 2.4 : 1.2; c.stroke();
      c.fillStyle = CORE.col; c.font = "9px " + C.mono; c.textAlign = "center";
      c.fillText("ARKA UÇ", G.cx, G.cy + 3);
      c.textAlign = "left";

      /* token */
      if (tok) {
        var ty = G.cy;
        var col = tok.stopK ? (tok.stopK === "core" ? C.danger : (MODS.filter(function (m) { return m.k === tok.stopK; })[0] || CORE).col) : C.acc2;
        c.beginPath(); c.arc(tok.x, ty, 6.5, 0, 7); c.fillStyle = col; c.fill();
        c.globalAlpha = 0.22; c.beginPath(); c.arc(tok.x, ty, 13, 0, 7); c.fill(); c.globalAlpha = 1;
        if (tok.att > 1) {
          c.fillStyle = "#a78bfa"; c.font = "8.5px " + C.mono; c.textAlign = "center";
          c.fillText("deneme " + tok.att, tok.x, ty - 16); c.textAlign = "left";
        }
      }

      /* ölçerler */
      $("#dcOk").textContent = nf(ok);
      $("#dcStop").textContent = nf(stops);
      $("#dcRetry").textContent = nf(saved);
      var top = null;
      MODS.forEach(function (m) { if (!top || stopCnt[m.k] > stopCnt[top]) top = m.k; });
      var topEl = $("#dcTop");
      topEl.textContent = top && stopCnt[top] ? (MODS.filter(function (m) { return m.k === top; })[0].n) : "—";
      topEl.style.fontSize = "17px";

      var nb = $("#dcNote").querySelector("div");
      nb.innerHTML = evtMsg || "Simülasyon başlıyor: istek en dıştaki modülden içeri doğru ilerleyecek.";
    });
  }

  /* ══════════════ SLAYT 25 · DEVRE KESİCİ DURUM MAKİNESİ (6 DURUM) ════════ */
  function runFsm() {
    var svg = $("#fsmSvg"); if (!svg) return;
    var FS = {
      CLOSED: { cls: "good", tag: "otomatik", t: "Normal işleyiş",
        lead: "Çağrılar arka uca gidiyor ve her sonuç kayan pencereye yazılıyor. Devre kesicinin <b>ölçüm yaptığı</b> tek otomatik durum budur.",
        inn: "Başlangıç durumu; HALF_OPEN'daki deneme çağrıları başarılı olduğunda buraya dönülür.",
        out: "Hata oranı <span class='chip-mono'>failureRateThreshold</span> veya yavaş çağrı oranı <span class='chip-mono'>slowCallRateThreshold</span> eşiğini aştığında OPEN'a geçer.",
        use: "Hedef durum. Bir devre kesicinin üretimde <b>zamanının %99'unu</b> burada geçirmesi beklenir.",
        watch: "Uyarı işareti: haftalarca hiç OPEN'a geçmemiş bir devre, çoğu zaman yanlış yapılandırılmış demektir — pencere hiç dolmuyordur.",
        cmd: null },
      OPEN: { cls: "bad", tag: "otomatik", t: "Devre kesildi",
        lead: "Çağrı arka uca hiç gitmiyor; <span class='chip-mono'>CallNotPermittedException</span> anında fırlatılıyor ve fallback devreye giriyor. Bekleme yok, iş parçacığı tutulmuyor.",
        inn: "CLOSED veya HALF_OPEN'da eşik aşıldığında otomatik girilir.",
        out: "<span class='chip-mono'>waitDurationInOpenState</span> süresi dolduğunda HALF_OPEN'a geçer. Bu süre boyunca hiçbir çağrı denenmez.",
        use: "Kütüphanenin kararı. Operatör olarak burada yapılacak iş, <b>fallback'in gerçekten çalıştığını</b> doğrulamaktır.",
        watch: "Sürekli OPEN↔CLOSED arasında salınım (flapping) görüyorsanız açık kalma süresi arka ucun toparlanma süresinden kısadır.",
        cmd: null },
      HALF_OPEN: { cls: "warn", tag: "otomatik", t: "Kontrollü deneme",
        lead: "Yalnızca <span class='chip-mono'>permittedNumberOfCallsInHalfOpenState</span> kadar çağrı geçirilir. Bu çağrılar birer <b>sağlık yoklaması</b>dır; sonuçları devrenin kaderini belirler.",
        inn: "OPEN durumundan, bekleme süresi dolduğunda otomatik girilir.",
        out: "Deneme çağrılarının hata oranı eşiğin altındaysa CLOSED'a, üstündeyse yeniden OPEN'a geçer.",
        use: "Bu adım olmadan sistem ya erken açılıp arka ucu tekrar çökertir ya da gereğinden uzun kapalı kalır.",
        watch: "Deneme sayısı çok yüksekse (ör. 50), henüz toparlanmamış arka uca ciddi bir yük binmiş olur. 3–10 arası tipik.",
        cmd: null },
      DISABLED: { cls: "op", tag: "operatör", t: "Tamamen devre dışı",
        lead: "Devre kesici <b>yok gibi</b> davranır: her çağrı geçer, hiçbir metrik toplanmaz, hiçbir geçiş olmaz. Otomatik olarak bu durumdan çıkılmaz — elle geri alınması gerekir.",
        inn: "Yalnızca operatör müdahalesiyle: actuator ucu veya <span class='chip-mono'>circuitBreaker.transitionToDisabledState()</span>.",
        out: "Yalnızca elle. <b>Kritik nokta:</b> unutulan bir DISABLED, sessizce kapatılmış bir yangın alarmıdır.",
        use: "Devre kesicinin <b>yanlış açtığı</b> kesinleştiğinde ve düzeltme yayına alınana kadar geçici çıkış kapısı olarak.",
        watch: "DISABLED sayısına alarm kurun ve süre sınırı koyun: \"2 saatten uzun DISABLED\" bir olay kaydı üretmelidir.",
        cmd: 'curl -XPOST .../circuitbreakers/siparisCB \\\n  -d \'{"updateState":"<v>DISABLE</v>"}\'' },
      FORCED_OPEN: { cls: "op", tag: "operatör", t: "Elle kilitli · hep reddet",
        lead: "Tüm çağrılar koşulsuz reddedilir; ölçüm yapılmaz. Arka uç düzelse bile devre kendi kendine kapanmaz.",
        inn: "Operatör müdahalesi: actuator ucu veya <span class='chip-mono'>transitionToForcedOpenState()</span>.",
        out: "Yalnızca elle. Bakım penceresi kapandığında geri almayı <b>kontrol listesine yazın</b>.",
        use: "Planlı bakım, arka ucun bilinçli olarak izole edilmesi, veya bir olayda ağır bir bağımlılığı devreden çıkarıp sistemin kalanını ayakta tutmak (fail static).",
        watch: "Bu, dayanıklılık aracından çok bir <b>olay müdahale aracıdır</b>. Runbook'ta yer alması, olay anında dakikalar kazandırır.",
        cmd: 'curl -XPOST .../circuitbreakers/siparisCB \\\n  -d \'{"updateState":"<v>FORCE_OPEN</v>"}\'' },
      METRICS_ONLY: { cls: "op", tag: "operatör", t: "Gözlem modu · kesme yok",
        lead: "Pencere dolar, hata oranı hesaplanır, metrikler ve olaylar üretilir — <b>ama devre asla açılmaz</b>. Trafik hiç etkilenmez.",
        inn: "Operatör müdahalesi: <span class='chip-mono'>transitionToMetricsOnlyState()</span>.",
        out: "Yalnızca elle; ölçüm sonuçları tatmin ediciyse CLOSED'a alınır.",
        use: "<b>Yeni bir devre kesiciyi üretime almanın en güvenli yolu.</b> Eşiği önce burada doğrulayın: seçtiğiniz değerle kaç kez açılacaktı? Trafiği hiç riske atmadan görülür.",
        watch: "Bu durumu bir <b>gölge dağıtım (shadow)</b> gibi kullanın: eşik doğrulanmadan gerçek kesme yetkisi vermeyin.",
        cmd: 'registry.circuitBreaker("siparisCB")\n  .<v>transitionToMetricsOnlyState</v>();' }
    };
    var AUTO = ["CLOSED", "OPEN", "HALF_OPEN"];
    var EDGE = { CLOSED: "#fsmE1", OPEN: "#fsmE2", HALF_OPEN: "#fsmE3" };
    var COL = { good: "var(--good)", bad: "var(--danger)", warn: "var(--warn)", op: "var(--violet)" };
    var BRD = { good: "rgba(52,211,153,.4)", bad: "rgba(248,113,113,.4)", warn: "rgba(251,191,36,.4)", op: "rgba(167,139,250,.4)" };
    var BG = { good: "var(--good-s)", bad: "var(--danger-s)", warn: "var(--warn-s)", op: "var(--violet-s)" };

    var sel = "CLOSED", walk = true, wi = 0, wt = 0;

    function show(k) {
      sel = k;
      var d = FS[k];
      $$("#fsmSvg .fsm-node").forEach(function (n) { n.classList.toggle("on", n.dataset.s === k); });
      $$("#fsmSvg .fsm-edge").forEach(function (e) { e.classList.remove("live"); });
      var eg = EDGE[k] ? $(EDGE[k]) : null; if (eg && walk) eg.classList.add("live");
      $("#fsmPanel").innerHTML =
        '<div class="fp-hd"><span class="fpb" style="color:' + COL[d.cls] + ";border-color:" + BRD[d.cls] +
          ";background:" + BG[d.cls] + '">' + k + "</span><h4>" + d.t + "</h4></div>" +
        '<div class="fp-lead">' + d.lead + "</div>" +
        '<div class="fp-grid">' +
          '<div class="fp-box"><div class="fk"><svg style="color:' + COL[d.cls] + '"><use href="#i-arrow"/></svg>Nasıl girilir</div><p>' + d.inn + "</p></div>" +
          '<div class="fp-box"><div class="fk"><svg style="color:' + COL[d.cls] + '"><use href="#i-repeat"/></svg>Nasıl çıkılır</div><p>' + d.out + "</p></div>" +
        "</div>" +
        '<div class="fp-box"><div class="fk"><svg style="color:var(--accent-2)"><use href="#i-target"/></svg>Ne zaman kullanılır</div><p>' + d.use + "</p></div>" +
        '<div class="fp-box"><div class="fk"><svg style="color:var(--amber)"><use href="#i-eye"/></svg>Yönetim önerisi</div><p>' + d.watch + "</p></div>" +
        (d.cmd ? '<div class="fp-cmd">' + d.cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;v&gt;/g, '<span class="v">').replace(/&lt;\/v&gt;/g, "</span>") + "</div>" : "");
    }

    $$("#fsmSvg .fsm-node").forEach(function (n) {
      ev(n, "click", function () {
        walk = AUTO.indexOf(n.dataset.s) >= 0 ? walk : false;
        if (AUTO.indexOf(n.dataset.s) >= 0) { walk = false; }
        show(n.dataset.s);
      });
      ev(n, "keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); walk = false; show(n.dataset.s); }
      });
    });
    show("CLOSED");

    /* otomatik tur: CLOSED → OPEN → HALF_OPEN → CLOSED */
    if (reduce) return;
    var iv = every(function () {
      if (!walk) return;
      wi = (wi + 1) % AUTO.length;
      show(AUTO[wi]);
    }, 2600);
    void iv; void wt;
  }

  /* ═══════ SLAYT 28 · DAĞITIM STRATEJİLERİ (ANİMASYONLU KARŞILAŞTIRMA) ════ */
  function runDeployStrat() {
    var cv = $("#dsCv"); if (!cv) return;

    var ST = [
      { k: "bg", n: "Blue-green", ic: "i-shuffle", col: "#5b8cff",
        how: "İki tam ortam yan yana durur. Tek bir yönlendirme değişikliğiyle <b>trafiğin tamamı</b> bir anda eski sürümden yenisine geçer; eski ortam sıcak yedek olarak bekler.",
        pro: "Geri alma tek bir anahtar çevirmedir — saniyeler. Sürümler asla aynı anda canlı olmadığı için şema uyumluluğu sorunu yaşanmaz.",
        con: "Etki alanı <b>anında %100</b>. Kusur yayına çıktığı saniyede bütün kullanıcılar görür; ayrıca sürekli <b>çift kapasite</b> maliyeti vardır.",
        when: "Hızlı geri alınabilir, durumsuz sürümlerde ve kapasitenin maliyet sorunu olmadığı yerlerde.",
        roll: "1 anahtar · saniyeler",
        yml: "- id: siparis\n  uri: lb://siparis-<v>GREEN</v>   # tek satır değişir\n  predicates: [ Path=/siparis/** ]" },
      { k: "canary", n: "Canary", ic: "i-target", col: "#38e1c8",
        how: "Trafiğin küçük bir yüzdesi yeni sürüme verilir. Metrik kapıları (hata oranı, p99, iş metriği) geçilirse ağırlık kademeli artırılır: <b>%1 → %5 → %25 → %50 → %100</b>.",
        pro: "Etki alanı her adımda <b>bilinçli olarak seçilir</b>. Kusur %1'de yakalanırsa kullanıcıların %99'u hiç fark etmez.",
        con: "İki sürüm bir süre <b>birlikte yaşar</b>: veritabanı şeması, kuyruk mesajı ve önbellek anahtarları <b>geriye uyumlu</b> olmak zorundadır.",
        when: "Varsayılan tercih. Ağırlık artırımını elle değil <b>metrik kapılarıyla</b> otomatikleştirin.",
        roll: "ağırlığı 0'a çek · saniyeler",
        yml: "- id: siparis-v2\n  uri: lb://siparis-v2\n  predicates:\n    - Path=/siparis/**\n    - <v>Weight</v>=siparis, 5     # v1: 95, v2: 5" },
      { k: "shadow", n: "Shadow / mirror", ic: "i-eye", col: "#a78bfa",
        how: "Her istek v1'e gider ve kullanıcı <b>yalnızca v1'in yanıtını</b> alır. Aynı istek eşzamanlı olarak v2'ye kopyalanır; v2'nin yanıtı ölçülüp <b>atılır</b>.",
        pro: "Kullanıcı etkisi <b>sıfır</b>. Yeni sürüm gerçek üretim trafiğinin tamamıyla, gerçek veri şekilleriyle sınanır.",
        con: "Gölge istek de <b>gerçek bir istektir</b>: veritabanına yazar, e-posta gönderir, üçüncü taraf kotasını tüketir. Yan etkiler izole edilmezse üretim verisi bozulur.",
        when: "Okuma ağırlıklı ve yan etkisiz rotalarda; ya da v2 sahte (mock) bir yazma katmanına bağlıyken.",
        roll: "kullanıcı etkisi yok",
        yml: "filters:\n  - name: <v>RequestMirror</v>       # Envoy: request_mirror_policies\n    args:\n      host: http://siparis-v2\n      fraction: 1.0" },
      { k: "sticky", n: "Yapışkan canary", ic: "i-users", col: "#f0a15c",
        how: "Sürüm kararı istek başına değil <b>kullanıcı başına</b> verilir: kullanıcı kimliğinin hash'i bir kovaya düşer ve o kullanıcı oturum boyunca <b>aynı sürümde</b> kalır.",
        pro: "Kullanıcı arayüz sürümleri arasında zıplamaz. Yarı v1 yarı v2 çizilen bir sayfa ya da bozulan çoklu adımlı akış olmaz.",
        con: "Gerçek dağılım istenen yüzdeye <b>tam oturmaz</b>: az sayıda kullanıcıda %25 hedefi %12 ya da %38 olarak gerçekleşir.",
        when: "Arayüzü, oturum durumunu veya çoklu adımlı akışları etkileyen değişikliklerde.",
        roll: "hash haritasını boşalt · dakikalar",
        yml: "# tutarlı hash: aynı kullanıcı → aynı sürüm\nkey: <v>hash(user_id)</v> % 100 < 25 ? v2 : v1\n# SCG: KeyResolver + Weight yerine özel predicate" },
      { k: "targeted", n: "Hedefli canary", ic: "i-tag", col: "#34d399",
        how: "Yönlendirme yüzdeye değil <b>isteğin içeriğine</b> bakar: yalnızca belirli bir başlığı, çerezi veya kullanıcı grubunu taşıyan istekler v2'ye gider. Dışarıdan gelen trafik hiç etkilenmez.",
        pro: "Etki alanı <b>tam olarak kimin</b> etkilendiğini bilecek kadar dardır. İç ekip, kendi hatasını müşteriden önce görür.",
        con: "İç kullanıcılar gerçek trafik çeşitliliğini <b>temsil etmez</b>: farklı cihazlar, kötü ağlar ve beklenmedik veri şekilleri burada görünmez.",
        when: "Her canary'nin <b>ilk</b> adımı. Yüzdeli canary'ye geçmeden önce buradan geçin.",
        roll: "header kuralını kaldır · saniyeler",
        yml: "- id: siparis-v2\n  predicates:\n    - Path=/siparis/**\n    - <v>Header</v>=X-Canary, ^(1|true)$\n    # ya da Cookie=surum, v2" }
    ];

    var sel = 0, playing = true, broken = false, last = 0, t0 = 0;
    var parts = [], flip = false, flipAt = 0, ramp = 0, rampAt = 0;
    var RAMP = [1, 5, 25, 50, 100];
    var nV1 = 0, nV2 = 0, hit = 0, uid = 0;
    /* Yapışkan canary: 8 kullanıcının kovası sabit — hedef %25 ama gerçekleşen farklı. */
    var UBUCKET = [72, 9, 41, 88, 17, 63, 4, 55];

    function reset() {
      parts = []; nV1 = 0; nV2 = 0; hit = 0; uid = 0;
      flip = false; flipAt = 0; ramp = 0; rampAt = 0;
    }

    /* ── kontroller ─────────────────────────────────────────────────────── */
    $("#dsPills").innerHTML = ST.map(function (s, i) {
      return '<button class="pill' + (i === 0 ? " on" : "") + '" data-i="' + i + '">' +
        '<svg style="color:' + s.col + '"><use href="#' + s.ic + '"/></svg>' + s.n + "</button>";
    }).join("");

    function side() {
      var s = ST[sel];
      $("#dsSide").innerHTML =
        '<div class="dsdet" style="border-left-color:' + s.col + '">' +
          '<div class="dh"><svg style="color:' + s.col + '"><use href="#' + s.ic + '"/></svg><h4>' + s.n + "</h4>" +
            '<span class="dord">geri alma: ' + s.roll + "</span></div>" +
          "<p>" + s.how + "</p>" +
          '<div class="pm">' +
            '<div class="p"><b>Artısı</b>' + s.pro + "</div>" +
            '<div class="m"><b>Eksisi</b>' + s.con + "</div>" +
          "</div>" +
          '<div class="wh"><svg><use href="#i-target"/></svg><div><b>Nerede kullanılır:</b> ' + s.when + "</div></div>" +
        "</div>" +
        '<div class="code"><div class="hd"><svg><use href="#i-code"/></svg> gateway yapılandırması ' +
          '<span class="tag">' + s.n + "</span></div><pre>" +
          s.yml.replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/&lt;v&gt;/g, '<span class="c-k">').replace(/&lt;\/v&gt;/g, "</span>")
            .replace(/(#[^\n]*)/g, '<span class="c-c">$1</span>') +
        "</pre></div>";
    }
    function pick(i) {
      sel = i; reset();
      $$("#dsPills .pill").forEach(function (p, j) { p.classList.toggle("on", j === i); });
      $$("#slide-canary .mtable tbody tr").forEach(function (r, j) { r.classList.toggle("on", j === i); });
      side();
    }
    ev($("#dsPills"), "click", function (e) {
      var b = e.target.closest(".pill"); if (b) pick(+b.dataset.i);
    });
    /* Üstteki tablo satırları da seçici olarak çalışır: sözle anlatım ile
       animasyon aynı nesneyi gösterir. */
    $$("#slide-canary .mtable tbody tr").forEach(function (r, j) {
      r.classList.add("pickable");
      ev(r, "click", function () { pick(j); cv.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); });
    });

    var pb = $("#dsPlay");
    function syncPb() {
      pb.innerHTML = playing ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Devam et';
    }
    syncPb();
    ev(pb, "click", function () { playing = !playing; syncPb(); });
    ev($("#dsReset"), "click", reset);
    var bb = $("#dsBreak");
    function syncBb() {
      bb.className = "btn" + (broken ? " pri" : "");
      bb.innerHTML = '<svg><use href="#i-warn"/></svg> ' + (broken ? "v2 bozuk · düzelt" : "v2'yi boz");
      if (broken) { bb.style.background = "var(--danger)"; bb.style.borderColor = "var(--danger)"; bb.style.color = "#160709"; }
      else { bb.style.background = ""; bb.style.borderColor = ""; bb.style.color = ""; }
    }
    syncBb();
    ev(bb, "click", function () { broken = !broken; hit = 0; syncBb(); });
    pick(0);

    /* ── yönlendirme kararı ─────────────────────────────────────────────── */
    function route(p, now) {
      var k = ST[sel].k;
      if (k === "bg") return flip ? "v2" : "v1";
      if (k === "canary") return Math.random() * 100 < RAMP[ramp] ? "v2" : "v1";
      if (k === "shadow") return "v1";                       /* kopya ayrıca üretilir */
      if (k === "sticky") return UBUCKET[p.u] < 25 ? "v2" : "v1";
      return p.tag ? "v2" : "v1";
    }

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var k = ST[sel].k, s = ST[sel];
      if (!t0) t0 = now;

      /* sahne geometrisi */
      var cx = 62, gx = W * 0.40, gw = 96, tx = W - 150, tw = 132;
      var v1y = H * 0.26, v2y = H * 0.62, binY = H * 0.90;
      var midY = H * 0.5, bh = 60;

      /* zamanlayıcılar */
      if (playing && !reduce) {
        if (k === "bg" && now - flipAt > 4200) { flip = !flip; flipAt = now; }
        if (k === "canary" && now - rampAt > 3400) { ramp = (ramp + 1) % RAMP.length; rampAt = now; }
        if (now - last > 190) {
          last = now;
          var u = uid % 8; uid++;
          var tag = k === "targeted" ? (uid % 7 === 0) : false;
          var p = { u: u, tag: tag, ph: 0, t: now, x: cx, y: midY, to: null, shadow: false, bad: false };
          p.to = route(p, now);
          parts.push(p);
          if (k === "shadow") {
            parts.push({ u: u, tag: false, ph: 0, t: now, x: cx, y: midY, to: "v2", shadow: true, bad: false });
          }
          if (parts.length > 90) parts.splice(0, parts.length - 90);
        }
      }

      /* ── ilerleme ── */
      var HOP = 620;
      for (var i = parts.length - 1; i >= 0; i--) {
        var q = parts[i], age = now - q.t, pr = Math.min(1, age / HOP);
        var e = pr * pr * (3 - 2 * pr);
        var ty = q.to === "v1" ? v1y + bh / 2 : v2y + bh / 2;
        if (q.ph === 0) {                       /* istemci → gateway */
          q.x = cx + (gx - cx) * e; q.y = midY;
          if (pr >= 1) { q.ph = 1; q.t = now; }
        } else if (q.ph === 1) {                /* gateway → sürüm */
          q.x = gx + gw + (tx - gx - gw) * e;
          q.y = midY + (ty - midY) * e;
          if (pr >= 1) {
            q.ph = 2; q.t = now;
            if (!q.shadow) { if (q.to === "v1") nV1++; else nV2++; }
            q.bad = q.to === "v2" && broken;
            if (q.bad && !q.shadow) hit++;
          }
        } else if (q.ph === 2) {                /* sürüm → geri (gölge: çöpe) */
          if (q.shadow) {
            q.x = tx + tw / 2; q.y = v2y + bh + (binY - v2y - bh) * e;
            if (pr >= 1) parts.splice(i, 1);
          } else {
            q.x = tx - (tx - cx) * e;
            q.y = ty + (midY - ty) * e;
            if (pr >= 1) parts.splice(i, 1);
          }
        }
      }

      /* ── çizim ── */
      c.clearRect(0, 0, W, H);
      c.font = "9px " + C.mono; c.textAlign = "left"; c.fillStyle = C.t3;
      c.fillText("İSTEMCİLER", 16, 14);
      c.textAlign = "center"; c.fillText("GATEWAY", gx + gw / 2, 14);
      c.textAlign = "right"; c.fillText("SÜRÜMLER", W - 16, 14);
      c.textAlign = "left";
      /* Blue-green'de anahtar hangi taraftaysa öteki ortam boşta bekler. */
      function v1dim0() { return k === "bg" && flip; }
      function v2dim0() { return k === "bg" && !flip; }

      /* istemci sütunu */
      for (var u2 = 0; u2 < 8; u2++) {
        var uy = H * 0.16 + u2 * (H * 0.68 / 7);
        var stick = k === "sticky", ucol = stick ? (UBUCKET[u2] < 25 ? s.col : C.t3) : C.t3;
        c.beginPath(); c.arc(cx - 26, uy, 5.5, 0, 7);
        c.fillStyle = ucol; c.globalAlpha = stick ? 1 : 0.5; c.fill(); c.globalAlpha = 1;
        c.font = "8px " + C.mono; c.fillStyle = C.t3; c.textAlign = "left";
        c.fillText("u" + (u2 + 1), cx - 18, uy + 3);
      }

      /* raylar: parçacık yokken de yapı okunsun */
      function rail(x1, y1, x2, y2, col, dim, dash) {
        c.save();
        c.setLineDash(dash || []);
        c.strokeStyle = col; c.lineWidth = 1.2; c.globalAlpha = dim ? 0.16 : 0.4;
        c.beginPath(); c.moveTo(x1, y1);
        c.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
        c.stroke(); c.restore();
      }
      rail(cx - 14, midY, gx, midY, C.t3, false);
      rail(gx + gw, midY, tx, v1y + bh / 2, "#38e1c8", v1dim0());
      rail(gx + gw, midY, tx, v2y + bh / 2, s.col, v2dim0(), k === "shadow" ? [4, 4] : null);
      if (k === "shadow") rail(tx + tw / 2, v2y + bh, tx + tw / 2, binY, C.t3, false, [3, 4]);

      /* gateway kutusu */
      c.fillStyle = C.s2; c.strokeStyle = C.line2; c.lineWidth = 1.3;
      rr(c, gx, midY - 44, gw, 88, 9); c.fill(); c.stroke();
      c.fillStyle = C.acc; c.font = "10px " + C.mono; c.textAlign = "center";
      c.fillText("ROUTE", gx + gw / 2, midY - 22);
      /* strateji göstergesi kutunun içinde */
      c.font = "9px " + C.mono; c.fillStyle = C.t2;
      var badge = k === "bg" ? (flip ? "→ GREEN" : "→ BLUE")
        : k === "canary" ? "ağırlık %" + RAMP[ramp]
        : k === "shadow" ? "1:1 kopya"
        : k === "sticky" ? "hash(uid)"
        : "X-Canary?";
      c.fillText(badge, gx + gw / 2, midY - 4);
      /* canary rampası bir mini bar */
      if (k === "canary") {
        var bwid = gw - 20, bx = gx + 10, byy = midY + 8;
        c.fillStyle = C.s3; rr(c, bx, byy, bwid, 6, 3); c.fill();
        c.fillStyle = s.col; rr(c, bx, byy, Math.max(2, bwid * RAMP[ramp] / 100), 6, 3); c.fill();
        c.fillStyle = C.t3; c.font = "8px " + C.mono;
        c.fillText("metrik kapısı " + (ramp + 1) + "/5", gx + gw / 2, midY + 28);
      } else if (k === "bg") {
        /* anahtar */
        var sx = gx + gw / 2 - 16, sy = midY + 12;
        c.fillStyle = C.s3; rr(c, sx, sy, 32, 14, 7); c.fill();
        c.beginPath(); c.arc(sx + (flip ? 24 : 8), sy + 7, 5.5, 0, 7);
        c.fillStyle = flip ? "#34d399" : "#5b8cff"; c.fill();
        c.fillStyle = C.t3; c.font = "8px " + C.mono;
        c.fillText("tek anahtar", gx + gw / 2, midY + 38);
      } else if (k === "targeted") {
        c.fillStyle = C.t3; c.font = "8px " + C.mono;
        c.fillText("başlık eşleşmesi", gx + gw / 2, midY + 22);
      } else if (k === "sticky") {
        c.fillStyle = C.t3; c.font = "8px " + C.mono;
        c.fillText("kullanıcı sabit", gx + gw / 2, midY + 22);
      } else {
        c.fillStyle = C.t3; c.font = "8px " + C.mono;
        c.fillText("çatalla + at", gx + gw / 2, midY + 22);
      }
      c.textAlign = "left";

      /* sürüm kutuları */
      function vbox(y, name, col, sub, dim, danger, share) {
        c.globalAlpha = dim ? 0.42 : 1;
        c.fillStyle = danger ? "rgba(248,113,113,.10)" : C.s2;
        c.strokeStyle = danger ? C.danger : col; c.lineWidth = danger ? 2.2 : 1.4;
        rr(c, tx, y, tw, bh, 9); c.fill(); c.stroke();
        c.fillStyle = danger ? C.danger : col; c.font = "12px " + C.mono; c.textAlign = "left";
        c.fillText(name, tx + 12, y + 20);
        c.fillStyle = C.t3; c.font = "8.5px " + C.mono;
        c.fillText(sub, tx + 12, y + 35);
        if (danger) {
          c.fillStyle = C.danger; c.font = "8.5px " + C.mono; c.textAlign = "right";
          c.fillText("HATA", tx + tw - 12, y + 20); c.textAlign = "left";
        }
        /* gerçekleşen trafik payı — hedeflenen değil, ölçülen */
        if (share >= 0) {
          var bx2 = tx + 12, bw2 = tw - 24, by2 = y + bh - 15;
          c.fillStyle = C.s3; rr(c, bx2, by2, bw2, 5, 3); c.fill();
          c.fillStyle = danger ? C.danger : col;
          rr(c, bx2, by2, Math.max(1.5, bw2 * share / 100), 5, 3); c.fill();
          c.fillStyle = C.t3; c.font = "8px " + C.mono; c.textAlign = "right";
          c.fillText(Math.round(share) + "%", tx + tw - 12, by2 - 3); c.textAlign = "left";
        }
        c.globalAlpha = 1;
      }
      var tot0 = nV1 + nV2, sh2 = tot0 ? nV2 / tot0 * 100 : -1;
      vbox(v1y, "v1", "#38e1c8", "kararlı sürüm", v1dim0(), false, tot0 ? 100 - sh2 : -1);
      vbox(v2y, "v2", s.col, k === "shadow" ? "gölge — yanıtı atılır" : "yeni sürüm", v2dim0(), broken,
        k === "shadow" ? -1 : sh2);

      /* gölge çöp kutusu */
      if (k === "shadow") {
        c.setLineDash([3, 4]); c.strokeStyle = C.t3; c.lineWidth = 1;
        rr(c, tx + 14, binY, tw - 28, 22, 6); c.stroke(); c.setLineDash([]);
        c.fillStyle = C.t3; c.font = "8.5px " + C.mono; c.textAlign = "center";
        c.fillText("yanıt atıldı", tx + tw / 2, binY + 15); c.textAlign = "left";
      }

      /* parçacıklar */
      parts.forEach(function (q) {
        var col = q.shadow ? "#a78bfa" : q.to === "v2" ? (broken ? C.danger : s.col) : "#38e1c8";
        if (q.ph === 2 && !q.shadow && !q.bad) col = "#34d399";
        c.globalAlpha = q.shadow ? 0.6 : 1;
        c.beginPath(); c.arc(q.x, q.y, q.shadow ? 3.6 : 4.6, 0, 7);
        c.fillStyle = col; c.fill();
        c.globalAlpha = 1;
        if (q.tag && q.ph < 2) {
          c.fillStyle = "#34d399"; c.font = "7.5px " + C.mono; c.textAlign = "center";
          c.fillText("x-canary", q.x, q.y - 8); c.textAlign = "left";
        }
      });

      /* ── ölçerler ── */
      var tot = nV1 + nV2, pv2 = tot ? nV2 / tot * 100 : 0;
      $("#dsV1").textContent = tot ? Math.round(100 - pv2) + "%" : "—";
      $("#dsV2").textContent = tot ? Math.round(pv2) + "%" : "—";
      var blast = k === "shadow" ? "%0" :
        k === "bg" ? (flip ? "%100" : "%0") :
        k === "canary" ? "%" + RAMP[ramp] :
        k === "sticky" ? Math.round(UBUCKET.filter(function (b) { return b < 25; }).length / 8 * 100) + "% kullanıcı" :
        "~%14 (yalnız iç)";
      var be = $("#dsBlast");
      be.textContent = blast;
      be.style.color = k === "shadow" ? C.good : (k === "bg" && flip) ? C.danger : C.t1;
      be.style.fontSize = blast.length > 8 ? "16px" : "";
      $("#dsHit").textContent = nf(hit);
      $("#dsHit").style.color = hit ? C.danger : C.t1;
      var re = $("#dsRoll");
      re.textContent = s.roll; re.style.fontSize = "13px";

      /* ── açıklama ── */
      var nb = $("#dsNote").querySelector("div");
      var msg;
      if (k === "bg") {
        msg = flip
          ? "<b style='color:var(--danger)'>Anahtar çevrildi: trafiğin tamamı v2'de.</b> Blue-green'de ara adım yoktur — " +
            (broken ? "v2 bozuk olduğu için <b>bütün kullanıcılar</b> şu anda hata alıyor. Etki alanı %100." :
             "kusur varsa aynı saniyede herkes görür. Buna karşılık geri alma da aynı hızda: anahtarı geri çevirmek yeter.")
          : "<b>Trafik v1'de.</b> v2 ortamı ayakta ve hazır bekliyor; geçiş tek bir yönlendirme değişikliğiyle olacak. " +
            "Bu modelin bedeli <b>sürekli çift kapasite</b>, kazancı ise saniyeler içinde geri alınabilirliktir.";
      } else if (k === "canary") {
        msg = "<b>Ağırlık %" + RAMP[ramp] + " · metrik kapısı " + (ramp + 1) + "/5.</b> " +
          (broken
            ? "v2 bozuk. Etkilenen istek oranı ağırlıkla <b>doğrudan orantılı</b>: şu anda hata alan istekler yalnızca v2'ye düşenler. " +
              "Kapı otomatikse bu adımda geri alma tetiklenir ve ağırlık 0'a çekilir."
            : "Her adımda etki alanı bilinçli olarak seçilir. Ağırlığı artırma kararını <b>elle değil</b>, hata oranı ve p99 " +
              "eşiklerine bağlı otomatik kapılarla verin — insan gözü küçük yüzdelerdeki bozulmayı fark edemez.");
      } else if (k === "shadow") {
        msg = "<b style='color:var(--violet)'>Her istek çatallanıyor.</b> Kullanıcı v1'in yanıtını alıyor; v2'ye giden " +
          "kopyanın yanıtı ölçülüp <b>atılıyor</b> (aşağıdaki kesikli kutu). Kullanıcı etkisi sıfır — " +
          "<b>ama yan etki değil</b>: kopya istek de veritabanına yazar, e-posta gönderir, üçüncü taraf kotasını tüketir.";
      } else if (k === "sticky") {
        var nu = UBUCKET.filter(function (b) { return b < 25; }).length;
        msg = "<b>Hedef %25, gerçekleşen %" + Math.round(nu / 8 * 100) + ".</b> Karar kullanıcı kimliğinin hash'ine göre " +
          "verildiği için " + nu + " kullanıcı (soldaki renkli noktalar) <b>her zaman</b> v2'de, diğerleri her zaman v1'de. " +
          "Kullanıcı sürümler arasında zıplamaz; bedeli, dağılımın istenen yüzdeye tam oturmamasıdır.";
      } else {
        msg = "<b style='color:var(--good)'>Yalnızca işaretli istekler v2'ye gidiyor.</b> Yönlendirme yüzdeye değil " +
          "<span class='chip-mono'>X-Canary</span> başlığına bakıyor; dışarıdan gelen trafik hiç etkilenmiyor. " +
          "Her canary bu adımla başlamalı — fakat iç kullanıcılar gerçek cihaz, ağ ve veri çeşitliliğini <b>temsil etmez</b>.";
      }
      nb.innerHTML = msg;
    });
  }

  /* ══════════════════════════ SLAYT: DİNAMİK CONFIG ═══════════════════════ */
  function runDynamic() {
    var cv = $("#dynCv"); if (!cv) return;
    var N = 6, nodes = [], gen = 41, pubT = -1, bad = false, last = 0;
    for (var i = 0; i < N; i++) nodes.push({ v: gen, p: 0, state: "ok" });
    function publish(broken) {
      bad = !!broken; pubT = 0; gen++;
      nodes.forEach(function (n) { n.p = 0; n.state = "pending"; });
      $("#dynGen").textContent = "sürüm v" + gen + (broken ? " (bozuk)" : "");
    }
    var pb = $("#dynPub"), fb = $("#dynFail");
    ev(pb, "click", function () { publish(false); });
    ev(fb, "click", function () { publish(true); });
    loop(function (now) {
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      if (pubT >= 0 && !reduce) {
        pubT += dt;
        nodes.forEach(function (n, i) {
          var delay = 180 + i * 120;
          if (pubT > delay && n.p < 1) n.p = Math.min(1, n.p + dt / 420);
          if (n.p >= 1 && n.state === "pending") {
            if (bad) { n.state = "reject"; }
            else { n.state = "ok"; n.v = gen; }
          }
        });
        if (nodes.every(function (n) { return n.p >= 1; })) {
          pubT = -1;
          var badge = $("#dynState");
          if (bad) { badge.className = "sbadge r"; badge.textContent = "reddedildi · eski sürüm korundu"; }
          else { badge.className = "sbadge g"; badge.textContent = "tüm düğümler güncel"; }
        } else {
          var b2 = $("#dynState"); b2.className = "sbadge w"; b2.textContent = "yayılıyor…";
        }
      }
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);
      var cpX = Math.max(70, W * 0.15), cpY = H / 2;
      // kontrol düzlemi
      c.fillStyle = "rgba(167,139,250,.10)"; c.strokeStyle = C.vio; c.lineWidth = 1.6;
      rr(c, cpX - 58, cpY - 46, 116, 92, 10); c.fill(); c.stroke();
      c.fillStyle = C.vio; c.font = "700 11.5px " + C.sans; c.textAlign = "center";
      c.fillText("Kontrol düzlemi", cpX, cpY - 18);
      c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
      c.fillText("etcd / CRD / Consul", cpX, cpY - 2);
      c.fillStyle = C.acc2; c.font = "700 13px " + C.mono;
      c.fillText("v" + gen, cpX, cpY + 22);

      var dx = W - Math.max(80, W * 0.22);
      for (var i = 0; i < N; i++) {
        var ny = 26 + (H - 66) * (i / (N - 1));
        // yayılım çizgisi
        c.strokeStyle = C.line; c.lineWidth = 1;
        c.beginPath(); c.moveTo(cpX + 58, cpY); c.lineTo(dx - 8, ny + 13); c.stroke();
        var n = nodes[i];
        if (n.p > 0 && n.p < 1) {
          var px = cpX + 58 + (dx - 8 - cpX - 58) * n.p;
          var py = cpY + (ny + 13 - cpY) * n.p;
          c.fillStyle = bad ? C.danger : C.acc2;
          c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill();
          c.globalAlpha = .3; c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        }
        var col = n.state === "reject" ? C.danger : n.v === gen ? C.acc2 : C.t3;
        c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = col; c.lineWidth = 1.4;
        rr(c, dx, ny, Math.min(120, W - dx - 8), 26, 6); c.fill(); c.stroke();
        c.fillStyle = col; c.font = "10.5px " + C.mono; c.textAlign = "left";
        c.fillText("gw-" + (i + 1) + "  v" + n.v + (n.state === "reject" ? "  ✕" : ""), dx + 9, ny + 17);
      }
      c.textAlign = "center"; c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
      c.fillText("VERİ DÜZLEMİ · " + N + " DÜĞÜM", dx + 55, 16);
      c.textAlign = "left";
    });
  }

  /* ══════════════════════ SPOTLIGHT İÇERİĞİ · ANTI-PATTERN ════════════════ */
  function M(k, v, n, c) { return { k: k, v: v, n: n, c: c }; }
  var R = "#f87171", W2 = "#fbbf24", G = "#34d399", A = "#5b8cff", V = "#a78bfa", O = "#f0a15c";
  var ANTI_SPOT = {
    "01": { c: R, tag: "En yaygın ve en pahalı tuzak", t: "Akıllı gateway — yeni monolit",
      meters: [M("Blast radius", "Tüm ürün ekipleri", 5, R), M("Tespit zorluğu", "Yüksek — sinsi ilerler", 4, W2), M("Düzeltme maliyeti", "Aylar", 5, R)],
      ba: [{ t: "Önce · dağıtık monolit", d: "Ürün değişikliği → gateway deposunda PR → merkezî ekip onayı → gateway deploy'u → ancak sonra yayına çıkabilir. Her ürün ekibi aynı darboğazda sıraya girer." },
           { t: "Sonra · ayrık sorumluluk", d: "Gateway yalnızca politika uygular. İstemciye özel şekil ihtiyacı, ilgili ekibin sahip olduğu BFF'te çözülür ve o ekibin kendi takvimiyle yayına çıkar." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Gateway deposuna en çok kod yazan ekip, gateway'i <b>işleten</b> ekip değildir.</li><li>Pull request başlıklarında ürün özellikleri geçer: \"kampanya indirimi eklendi\", \"yeni alan döndürülüyor\".</li><li>Gateway'in birim testleri iş kuralı doğruluyor.</li><li>Deploy için birden çok ekibin onayı isteniyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>Gateway, mimarideki <b>en kolay ortak nokta</b>dır. İki servisin verisini birleştirmek gerektiğinde \"burada yaparsak tek yerde olur\" cümlesi her zaman doğru görünür. Bu karar tek başına zararsızdır; zarar <b>birikimlidir</b> — otuz küçük istisna bir yıl sonra iş mantığı katmanına dönüşür.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>\"Gateway'e ne girmez\" listesini <b>yazılı</b> hâle getirin ve gözden geçirme kuralına bağlayın.</li><li>İstemciye özel veri şekli ihtiyacını <b>BFF</b>'e taşıyın — ürün ekibinin sahipliğinde.</li><li>Gateway deposuna kod eklemeyi CODEOWNERS ile kısıtlayın.</li><li>Ölçün: gateway deposundaki değişikliklerin kaç tanesi politika, kaç tanesi iş kuralı?</li></ul>" },
        { i: "i-map", h: "Gerçek örnek", c: V, b: "<p>Uber'in ikinci nesil gateway'i (RTAPI) bu yolla <b>~1 milyon satırlık</b> tek bir Node.js uygulamasına dönüştü; 110 endpoint grubu barındırıyor, 400'den fazla servise konuşuyor ve mühendisliğin <b>%40'ı</b> aynı depoya kod yazıyordu. Üçüncü nesle geçiş <b>iki yıl</b> sürdü ve en kritik kararı, kenar katmanında iş mantığını <b>yasaklamak</b> oldu.</p>" }],
      rel: ["BFF", "dağıtık monolit", "CODEOWNERS", "sorumluluk ayrımı"] },
    "02": { c: R, tag: "Ortak kader", t: "Tek paylaşılan dev filo",
      meters: [M("Blast radius", "Tüm trafik", 5, R), M("Tespit zorluğu", "Düşük — hemen görülür", 2, G), M("Düzeltme maliyeti", "Haftalar", 3, W2)],
      ba: [{ t: "Önce · tek küme", d: "Dış, partner ve iç trafik aynı pod setinde. Bir ekibin hatalı rotası, mobil uygulamayı da düşürür. Deploy için bakım penceresi ayarlanır." },
           { t: "Sonra · maruziyete göre ayrık", d: "Aynı gateway teknolojisi, üç ayrı dağıtım: ayrı pod seti, ayrı dinleyici, ayrı config namespace'i, ayrı otomatik ölçekleme. Öğrenme maliyeti tek, hata alanı ayrı." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Gateway deploy'u için \"bakım penceresi\" ayarlanıyor.</li><li>Bir partner'ın toplu işi, mobil uygulamanın gecikmesini bozuyor.</li><li>Kimse yapılandırma değiştirmeye cesaret edemiyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>İlk gün tek bir gateway kurmak doğru karardır — ayırma maliyeti erken aşamada gereksizdir. Hata, trafik ve ekip sayısı büyürken <b>bu kararın gözden geçirilmemesidir</b>.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Maruziyete göre ayırın: dış (DMZ) · partner (mTLS) · iç (küme içi).</li><li>Farklı ürün değil, <b>farklı dağıtım</b> yeterlidir.</li><li>Çok kiracılı kritik sistemlerde bir adım daha: <b>hücresel</b> dağıtım.</li></ul>" }],
      rel: ["blast radius", "hücresel mimari", "maruziyet ayrımı"] },
    "03": { c: R, tag: "Sınır ihlali", t: "Nesne yetkisini gateway'e taşımak",
      meters: [M("Blast radius", "Gateway + veri katmanı", 4, R), M("Tespit zorluğu", "Orta", 3, W2), M("Düzeltme maliyeti", "Yüksek", 4, R)],
      ba: [{ t: "Önce · gateway veriyi bilir", d: "Gateway'in bir veritabanı bağlantı dizesi vardır. Her istekte sahiplik sorgusu çalışır; gateway artık ölçeklenmesi ve sürümlenmesi gereken bir servistir." },
           { t: "Sonra · katmanlı yetki", d: "Gateway token'dan çözülebilen kaba yetkiyi (scope, rol) uygular. Nesne sahipliği servisin sorgusuna koşul olarak eklenir. Gateway veri katmanını hiç görmez." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Gateway'in yapılandırmasında bir <b>veritabanı bağlantı dizesi</b> var.</li><li>Gateway, kullanıcı-kaynak eşleşmesi için bir servise senkron çağrı yapıyor.</li><li>Yetki değişikliği gateway deploy'u gerektiriyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>\"Yetkiyi tek yerde toplayalım\" isteği doğrudur ama <b>yanlış yetkiye</b> uygulanır. Kimlik ve kaba yetki merkezîleştirilebilir; nesne düzeyi yetki merkezîleştirilemez çünkü <b>veriye bağımlıdır</b>.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Nesne yetkisini servise geri verin; sorguya sahiplik koşulu ekleyin.</li><li>Gateway'de yalnızca token'dan çözülebilen kontrolleri bırakın.</li><li>Gateway'in katkısını <b>anomali tespitiyle</b> destekleyin: bir token'ın kısa sürede çok sayıda farklı nesne kimliğine erişmesi işaretlensin.</li></ul>" },
        { i: "i-shield", h: "Güvenlik bağlamı", c: V, b: "<p>OWASP API1 (BOLA) listenin en tepesindeki risktir ve <b>tanımı gereği</b> gateway'de çözülemez. Bunu gateway'e taşımaya çalışmak, riski azaltmaz — yalnızca yeni bir bağımlılık ve yeni bir hata noktası ekler.</p>" }],
      rel: ["OWASP API1", "BOLA", "kaba vs ince taneli yetki"] },
    "04": { c: R, tag: "Sert kabuk, yumuşak iç", t: "Servisleri korumasız bırakmak",
      meters: [M("Blast radius", "Tüm sistem", 5, R), M("Tespit zorluğu", "Çok yüksek — sızma testine kadar", 5, R), M("Düzeltme maliyeti", "Orta", 3, W2)],
      ba: [{ t: "Önce · çevre güvenliği", d: "Servisler kimlik doğrulamaz; gateway'in eklediği başlığa güvenir. Kümeye erişen bir CI runner'ı, unutulmuş bir hata ayıklama pod'u veya tek bir SSRF açığı tam yetkili istek üretebilir." },
           { t: "Sonra · sıfır güven", d: "Her servis kendisine gelen token'ı yeniden doğrular (mikrosaniye maliyetli), servisler arası bağlantı mTLS ile kimliklidir ve ağ politikası varsayılan olarak reddeder." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Bir servis, küme içinden <span class='chip-mono'>curl</span> ile <b>token'sız</b> çağrılabiliyor.</li><li>Servis kodunda kimlik doğrulama yok; yalnızca <span class='chip-mono'>X-User-Id</span> başlığı okunuyor.</li><li>\"İç ağdayız, güvenli\" cümlesi mimari gerekçe olarak kullanılıyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>Gateway'in değeri \"tek yerde doğrula\" olarak <b>yanlış okunur</b>. Doğru okuma \"tekdüze doğrula\"dır: gateway doğrulamayı standartlaştırır, servisleri doğrulama yükümlülüğünden kurtarmaz.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Her serviste <b>yerel</b> JWT doğrulama — JWKS önbellekteyse maliyeti mikrosaniyedir.</li><li>Servisler arası <b>mTLS</b> (mesh veya SPIFFE).</li><li>Varsayılan-reddet <b>ağ politikası</b>: yalnızca gateway → servis, servis → izin verilen servis.</li><li>Gateway'in eklediği bağlam başlığını <b>imzalayın</b>.</li></ul>" }],
      rel: ["sıfır güven", "mTLS", "SSRF", "header hijyeni"] },
    "05": { c: W2, tag: "Hız kesici", t: "Config'i koda bağlamak",
      meters: [M("Blast radius", "Ürün ekiplerinin hızı", 3, W2), M("Tespit zorluğu", "Düşük", 2, G), M("Düzeltme maliyeti", "Orta", 3, W2)],
      ba: [{ t: "Önce · rota = kod", d: "Yeni rota eklemek için: kod değişikliği → PR → derleme → test → deploy → doğrulama. Süre gün mertebesinde. Acil bir yönlendirme değişikliği bile bu boru hattından geçer." },
           { t: "Sonra · rota = veri", d: "Rota tanımı CRD, etcd veya ayrı yaşam döngüsüne sahip bir GitOps deposunda. Değişiklik doğrulanır, canary'den geçer ve saniyeler içinde yayılır; uygulama deploy'u gerekmez." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>\"Yeni rota için sıradaki sürümü bekleyin\" cümlesi.</li><li>Acil durum müdahalesi için gateway'in yeniden derlenmesi gerekiyor.</li><li>Ekipler gateway'i baypas etmenin yollarını arıyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>Kütüphane tabanlı gateway'lerde (Spring Cloud Gateway gibi) rotayı YAML'a yazmak en kolay başlangıçtır ve doğrudur. Hata, <b>bu geçici çözümün kalıcılaşmasıdır</b>.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Dinamik rota kaynağı: <span class='chip-mono'>RouteDefinitionRepository</span>, CRD veya etcd.</li><li>Üç kapı: şema · anlam · <b>akıl sağlığı</b> doğrulaması.</li><li>Config'i de canary'den geçirin ve <b>60 saniyede geri alınabilir</b> yapın.</li></ul>" }],
      rel: ["dinamik yapılandırma", "GitOps", "fail static", "atomik geçiş"] },
    "06": { c: R, tag: "Yıkım çarpanı", t: "Sınırsız retry, hiyerarşisiz timeout",
      meters: [M("Blast radius", "Tüm arka uçlar", 5, R), M("Tespit zorluğu", "Orta — olay anında belli olur", 3, W2), M("Düzeltme maliyeti", "Düşük", 2, G)],
      ba: [{ t: "Önce · fırtına", d: "Arka uç yavaşlar → gateway retry yapar → yük 3× olur → arka uç daha da yavaşlar → daha çok retry. Küçük bir dalgalanma, tam karartmaya dönüşür." },
           { t: "Sonra · bütçeli retry", d: "Yalnızca idempotent metotlar, en fazla 1–2 deneme, jitter'lı üstel geri çekilme ve %10 retry bütçesi. Bütçe aşılırsa retry otomatik kapanır." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Küçük bir yavaşlamanın ardından yükün <b>katlanarak</b> arttığı grafikler.</li><li>Retry oranı toplam isteğin %10'unu aşıyor.</li><li>Gateway 2 sn'de vazgeçerken servis hâlâ 5 sn çalışmaya devam ediyor.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>Retry, tek bir isteğin başarı olasılığını artırır; <b>sistemin</b> başarı olasılığını düşürür. Bu ters ilişki sezgiye aykırı olduğu için retry genelde sınırsız açılır.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li><b>Dıştan içe daralan</b> timeout zinciri: gateway(2s) &gt; servis(1.5s) &gt; DB(1s).</li><li>Retry bütçesi ve jitter — <b>ikisi birlikte</b>.</li><li>TimeLimiter olmadan devre kesici kurmayın: yavaşlık hata olarak sayılmaz.</li></ul>" }],
      rel: ["retry bütçesi", "deadline propagation", "jitter", "TimeLimiter"] },
    "07": { c: W2, tag: "Sessiz maliyet", t: "Kardinalite patlaması",
      meters: [M("Blast radius", "Gözlemlenebilirlik yığını", 3, W2), M("Tespit zorluğu", "Düşük — fatura gelir", 2, G), M("Düzeltme maliyeti", "Düşük", 2, G)],
      ba: [{ t: "Önce · ham yol etiketi", d: "<span class='chip-mono'>/siparis/12345</span> her istekte yeni bir zaman serisi üretir. Bir milyon sipariş, bir milyon seri demektir; metrik sistemi ve fatura birlikte patlar." },
           { t: "Sonra · kalıp etiketi", d: "<span class='chip-mono'>route_id = /siparis/{id}</span>. Seri sayısı rota sayısıyla sınırlıdır. Kullanıcı ve korelasyon kimlikleri metriğe değil, log ve trace'e yazılır." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Metrik sisteminin faturası gateway'in altyapı maliyetini geçiyor.</li><li>Grafana sorguları zaman aşımına uğruyor.</li><li>Prometheus bellek kullanımı sürekli artıyor.</li></ul>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Etiket olarak <b>route_id</b> kalıbı kullanın.</li><li>Spring Cloud Gateway'de <span class='chip-mono'>path</span> etiketi varsayılan olarak <b>kapalıdır</b> — açmadan önce iki kez düşünün.</li><li>Yüksek kardinaliteli alanlar için doğru yer: yapılandırılmış log ve dağıtık iz.</li></ul>" }],
      rel: ["RED metrikleri", "route_id", "örnekleme", "log vs metrik"] },
    "08": { c: A, tag: "Yanlış ölçüt", t: "Kıyaslamaya göre ürün seçmek",
      meters: [M("Blast radius", "Beş yıllık teknoloji borcu", 4, W2), M("Tespit zorluğu", "Çok yüksek", 5, R), M("Düzeltme maliyeti", "Çok yüksek", 5, R)],
      ba: [{ t: "Önce · tek boyut", d: "Ürün seçim toplantısının tek gündemi RPS tablosu. En hızlı ürün seçilir; altı ay sonra kimse eklenti yazamıyor, kimse hata ayıklayamıyor ve gerçek tepe yük seçilen ürünün onda birinde kalıyor." },
           { t: "Sonra · ağırlıklı karar", d: "Performans bir <b>eşik</b> olarak kullanılır (\"tepe yükümüzün 3 katını karşılıyor mu?\"). Sıralamayı işletilebilirlik, işe alım, ekosistem, dinamiklik ve maliyet belirler." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Karar gerekçesinde yalnızca RPS ve gecikme sayıları var.</li><li>Kıyaslama kaynakları <b>ürün satıcılarının</b> kendi yayınları.</li><li>Ekibin o teknolojiyi işletebilme becerisi hiç tartışılmamış.</li></ul>" },
        { i: "i-warn", h: "Kök neden", c: R, b: "<p>Performans <b>ölçülebilir</b>, işletilebilirlik ölçülemez. Karar süreçleri ölçülebilen boyuta doğru kayar — ölçülemeyen boyut daha önemli olsa bile.</p>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Karar kriterlerini <b>önceden</b> yazın ve ağırlıklandırın.</li><li>PoC'nin son haftasında <b>başka bir ekipten</b> bir mühendisi çağırıp yeni rota eklemesini isteyin; süreyi ölçün.</li><li>0,3 ms fark, ekibin ürünü işletebilme becerisinin yanında önemsizdir.</li></ul>" }],
      rel: ["PoC", "TCO", "coordinated omission", "satıcı kıyaslamaları"] },
    "09": { c: W2, tag: "Birikimli borç", t: "Sürüm başına rota çoğaltmak",
      meters: [M("Blast radius", "Test yüzeyi ve bakım", 3, W2), M("Tespit zorluğu", "Düşük", 2, G), M("Düzeltme maliyeti", "Yüksek — geriye dönük", 4, R)],
      ba: [{ t: "Önce · sürüm enflasyonu", d: "v1, v1.1, v2, v2-beta, v3 aynı anda canlı. Kırk rota, kırk farklı davranış, devasa bir regresyon yüzeyi. Kimse hangisinin kullanıldığını bilmediği için hiçbiri kapatılamıyor." },
           { t: "Sonra · disiplinli sürüm", d: "Yalnızca kırıcı değişiklikte sürüm artar. Her sürüm doğduğu gün bir sunset tarihi alır. Kullanım telemetrisi, kapatma kararını tahminle değil <b>veriyle</b> verdirir." }],
      secs: [
        { i: "i-search", h: "Nasıl fark edilir", c: W2, b: "<ul><li>Aynı kaynağın üçten fazla sürümü canlı.</li><li>Hiçbir sürümün <b>sunset tarihi</b> yok.</li><li>\"Kim kullanıyor bilmiyoruz, kapatamayız\" cümlesi.</li></ul>" },
        { i: "i-check", h: "Çözüm", c: G, b: "<ul><li>Küçük eklemeler için sürüm çıkarmayın — <b>tolerant reader</b> ilkesi.</li><li><span class='chip-mono'>Deprecation</span> (RFC 9745) ve <span class='chip-mono'>Sunset</span> (RFC 8594) başlıklarını rota bazlı ekleyin.</li><li>Sürüm × tüketici × istemci sürümü kırılımında telemetri toplayın; kalan üç müşteriyi <b>ismen</b> arayın.</li></ul>" }],
      rel: ["RFC 8594", "RFC 9745", "tolerant reader", "sunset takvimi"] }
  };

  /* ══════════════════ SPOTLIGHT İÇERİĞİ · FARKLILAŞTIRICI ═════════════════ */
  function DS(c, tag, t, val, eff, avail, why, how, gain, rel, ba) {
    return { c: c, tag: tag, t: t,
      meters: [M("İş değeri", val[1], val[0], G), M("Uygulama eforu", eff[1], eff[0], W2), M("Üründe bulunma", avail[1], avail[0], A)],
      ba: ba,
      secs: [
        { i: "i-x", h: "Neden hazır üründe yok", c: R, b: why },
        { i: "i-code", h: "Nasıl uygulanır", c: A, b: how },
        { i: "i-check", h: "Somut kazanç", c: G, b: gain }
      ], rel: rel };
  }
  var DIFF_SPOT = {
    A: DS(A, "Alana özgü politika", "Bağlam farkında yetki ve kısıt", [5, "Çok yüksek"], [3, "Orta"], [1, "Yok"],
      "<p>Bu kurallar iş modelinizin bir parçasıdır. Hiçbir satıcı \"resmî tatilde EFT limitini düşür\" veya \"ana şirket alt şirketin verisini görebilir\" kuralını <b>genel bir eklenti</b> olarak yazamaz; çünkü kurum hiyerarşiniz, kanal tanımlarınız ve risk modeliniz size özgüdür.</p>",
      "<ul><li>Politika verisini (hiyerarşi, takvim, risk skoru) gateway'e <b>ayrı bir kanaldan</b> besleyin ve bellekte tutun.</li><li>Kararı sıcak yolda <b>ağ çağrısı yapmadan</b> verin.</li><li>Veriyi periyodik yenileyin; yenileme başarısız olursa <b>son bilinen sürümle</b> devam edin (fail static).</li><li>Politika sürümünü denetim kaydına yazın.</li></ul>",
      "<p>Yetki kuralı değişikliği artık <b>N servis deploy'u</b> değil, tek bir politika yayınıdır. Kanal bazlı limitler (şube ≠ mobil ≠ ATM) tek yerde tanımlanır ve tutarlılığı garanti altına alınır.</p>",
      ["OPA / Cedar", "fail static", "bellek içi politika", "denetim izi"],
      [{ t: "Önce", d: "Her servis kendi hiyerarşi sorgusunu yapar; kurallar sürüklenir ve zamanla birbirinden ayrışır." },
       { t: "Sonra", d: "Tek politika noktası; servisler yalnızca çözülmüş yetki bağlamını alır." }]),
    B: DS(G, "Bütünlük garantisi", "Idempotency ve in-flight coalescing", [5, "Kritik"], [3, "Orta"], [2, "Kısmi"],
      "<p>Ürünlerin bir kısmı basit bir <b>tekrar reddi</b> sunar; ancak <b>eş zamanlı</b> gelen ikinci isteğin birincinin sonucunu beklemesi (in-flight coalescing) neredeyse hiçbirinde yoktur. Asıl zor kısım budur ve tam olarak çift ödemenin oluştuğu yerdir.</p>",
      "<ul><li>Anahtar → (durum, yanıt, son kullanma) kaydını paylaşılan bir depoda tutun.</li><li>İlk istek kaydı <span class='chip-mono'>IN_PROGRESS</span> olarak oluşturur; eş zamanlı ikinci istek bu kaydı görüp <b>bekler</b>, tamamlanınca aynı yanıtı döndürür.</li><li>Anahtar <b>istemcide</b> üretilmelidir — sunucu üretirse zaman aşımı sonrası retry yeni anahtar üretir ve mekanizma baypas edilir.</li><li>Kaydın TTL'i, en uzun işlem süresinden uzun olmalıdır.</li></ul>",
      "<p>Çift ödeme, çift sipariş ve çift bildirim problemi <b>tek noktada</b> çözülür; her servisin ayrı idempotency uygulamasına gerek kalmaz. Açık Bankacılık düzenlemeleri bu başlığı zaten şart koşar.</p>",
      ["Idempotency-Key", "in-flight coalescing", "exactly-once", "Açık Bankacılık"],
      [{ t: "Önce", d: "Ağ kesintisinde istemci retry yapar; iki ödeme kaydı oluşur ve mutabakatta manuel düzeltme gerekir." },
       { t: "Sonra", d: "İkinci istek birincinin sonucunu döndürür; yan etki tek kez gerçekleşir." }]),
    C: DS(V, "Önbellek zekâsı", "Varlık farkında geçersizleştirme", [4, "Yüksek"], [3, "Orta"], [1, "Yok"],
      "<p>Hiçbir genel ürün <span class='chip-mono'>/musteri/42</span> ile <span class='chip-mono'>/musteri/42/adresler</span> arasındaki <b>ilişkiyi</b> bilemez. Ürünlerin sunduğu tek araç TTL'dir — yani ya bayat veri ya da düşük isabet oranı arasında seçim yapmanız istenir.</p>",
      "<ul><li>Önbellek anahtarını varlık kimliğiyle <b>etiketleyin</b>: <span class='chip-mono'>tag: musteri:42</span>.</li><li>Yazma isteği geçtiğinde ilgili etikete sahip tüm girdileri geçersiz kılın.</li><li>Etiket eşlemesini <b>rota tanımının parçası</b> olarak yapılandırın, koda gömmeyin.</li><li>Geçersizleştirmeyi asenkron yapın; yazma isteğinin gecikmesini artırmayın.</li></ul>",
      "<p>Uzun TTL <b>ve</b> taze veri aynı anda elde edilir. Okuma ağırlıklı sistemlerde arka uç yükü kat kat düşer; önbellek isabet oranı %60'lardan %90'ların üstüne çıkabilir.</p>",
      ["etiketli önbellek", "TTL", "isabet oranı", "stale-while-revalidate"],
      [{ t: "Önce", d: "TTL 30 sn: ya kullanıcı kendi güncellemesini göremez ya da önbellek işe yaramaz." },
       { t: "Sonra", d: "TTL 10 dk + yazmada anında geçersizleştirme: hem taze hem yüksek isabet." }]),
    D: DS(O, "Finansal görünürlük", "Maliyet muhasebesi ve geri faturalandırma", [4, "Yüksek"], [2, "Düşük"], [1, "Yok"],
      "<p>Ürünlerin analitik modülleri <b>istek sayısı</b> verir, <b>maliyet</b> vermez. Bir isteğin gerçek maliyeti (işlemci, bant genişliği, üçüncü taraf ücreti) yalnızca sizin altyapı faturanızla eşleştirilebilir.</p>",
      "<ul><li>Her rotaya bir <b>maliyet ağırlığı</b> verin (basit okuma 1, arama 10, rapor 100).</li><li>Erişim logunda tüketici, rota, süre ve ağırlığı birlikte kaydedin.</li><li>Toplu iş bu kayıtları altyapı faturasıyla eşleştirip ekip/kiracı kırılımında rapor üretsin.</li></ul>",
      "<p>\"Bu API bize ayda ne kadara mal oluyor, kim tüketiyor?\" sorusu cevaplanabilir hâle gelir. Kullanım bazlı fiyatlandırma ve kurumsal kota sözleşmeleri doğrudan bu veriden beslenir.</p>",
      ["chargeback", "maliyet birimi", "FinOps", "kota sözleşmesi"], null),
    E: DS(R, "Regülasyon", "PII maskeleme, veri yerleşimi, denetim izi", [5, "Zorunlu"], [4, "Yüksek"], [2, "Kısmi"],
      "<p>Ürünlerde <b>regex tabanlı genel</b> maskeleme bulunur. Gerçek ihtiyaç ise <b>alan bazlıdır</b>: \"yanıttaki <span class='chip-mono'>musteri.tckn</span> alanı, çağıran rol <span class='chip-mono'>OPERATOR</span> ise maskelensin.\" Bu, veri modelinizi bilmeyi gerektirir.</p>",
      "<ul><li>Maskeleme kurallarını OpenAPI şemasına <b>ek açıklama</b> olarak yazın: <span class='chip-mono'>x-pii: tckn</span>. Gateway şemayı zaten yüklediği için hangi alanın hassas olduğunu bilir.</li><li>Denetim kaydına <b>karar gerekçesini</b> ve politika sürümünü ekleyin.</li><li>Veri yerleşimi kuralına göre isteği doğru bölgeye yönlendirin.</li><li>Denetim kaydını değiştirilemez (WORM) depoda saklayın.</li></ul>",
      "<p>KVKK/GDPR yükümlülüğü tek noktada karşılanır. Denetçi karşısında \"bu erişime neden izin verildi\" sorusu, korelasyon kimliği ve politika sürümüyle birlikte <b>kanıtlanabilir</b> hâle gelir.</p>",
      ["KVKK", "GDPR", "WORM", "veri yerleşimi", "x-pii"], null),
    F: DS(W2, "Entegrasyon", "Legacy protokol köprüleri", [4, "Yüksek"], [4, "Yüksek"], [1, "Yok"],
      "<p>Hazır ürünler modern protokolleri hedefler. Kurumsal dünyada ayakta olan sistemlerin çoğu SOAP, ISO 8583, sabit uzunluklu kayıt veya EBCDIC konuşur — ve <b>her kurumun lehçesi farklıdır</b>. Genel bir ürün bu çeşitliliği kapsayamaz.</p>",
      "<ul><li>Köprüyü <b>ayrı bir filtre modülü</b> olarak yazın ve yalnızca ilgili rotalara bağlayın — asla varsayılan filtre yapmayın.</li><li>Dönüşüm kurallarını sürüm kontrolünde tutun ve sözleşme testiyle doğrulayın.</li><li>HSM ile imzalama gerekiyorsa bunu ayrı bir sidecar'a taşıyın.</li><li>Eski sistem emekli olduğunda modül <b>tek yerden</b> kaldırılır.</li></ul>",
      "<p>Modern servisleriniz eski dünyayı <b>hiç görmez</b>. Yeni geliştiriciler ISO 8583 öğrenmek zorunda kalmaz; teknik borç tek bir modülde izole edilir ve kaldırılması planlanabilir hâle gelir.</p>",
      ["SOAP", "ISO 8583", "EBCDIC", "HSM", "protokol köprüsü"], null),
    G: DS(A, "Akıllı yönlendirme", "SLA ve maliyet farkında yönlendirme", [4, "Yüksek"], [3, "Orta"], [2, "Kısmi"],
      "<p>Ürünler <b>ağırlık ve sağlık</b> bilir; <b>müşteri değeri</b> ve <b>maliyet</b> bilmez. \"VIP müşteriyi ayrılmış havuza yönlendir\" veya \"önce ucuz sağlayıcıyı dene\" kuralları iş bağlamı gerektirir.</p>",
      "<ul><li>Tüketici katmanını token'dan çözün ve <b>upstream seçimine girdi</b> yapın.</li><li>Ayrılmış havuzları ayrı upstream kümesi olarak tanımlayın.</li><li>Havuz sağlıksızsa paylaşımlı havuza <b>otomatik geri düşün</b> — izolasyon, erişilebilirliğin önüne geçmemeli.</li><li>Maliyet farkında yönlendirmeyi devre kesiciyle birleştirin.</li></ul>",
      "<p>Gürültülü komşu problemi <b>mimari düzeyde</b> çözülür: büyük müşteri kendi havuzunda, küçükler paylaşımlıda. Üçüncü taraf maliyetleri, birincil sağlayıcı sağlıklı olduğu sürece düşük tutulur.</p>",
      ["gürültülü komşu", "hücresel yönlendirme", "sağlayıcı yedekleme"], null),
    H: DS(V, "Test altyapısı", "Mock, kayıt/tekrar, hata enjeksiyonu", [4, "Yüksek"], [3, "Orta"], [2, "Kısmi"],
      "<p>Ürünlerin bir kısmı basit mock sunar; ancak <b>gerçek trafiği kaydedip tekrar oynatma</b> ve <b>sözleşme kayması tespiti</b> neredeyse hiçbirinde yoktur. Bunlar, sizin OpenAPI tanımlarınıza ve ortam yapınıza bağlıdır.</p>",
      "<ul><li>Mock yanıtları <b>OpenAPI örneklerinden</b> üretin — ayrı bir sahte servis yazmayın.</li><li>Kayıt/tekrar için istek-yanıt çiftlerini örnekleyerek saklayın (PII maskeli).</li><li>Hata enjeksiyonunu yalnızca <b>imzalı bir başlıkla</b> tetiklenebilir yapın; aksi hâlde saldırı aracına dönüşür.</li><li>Yanıtı şemayla karşılaştırıp sapmada alarm üretin (contract drift).</li></ul>",
      "<p>Ön uç ekibi arka ucu beklemez. Dayanıklılık kodunuz <b>gerçekten</b> test edilir. Dokümantasyon ile gerçeklik arasındaki kayma, müşteri fark etmeden üretimde yakalanır.</p>",
      ["contract drift", "chaos engineering", "dark launch", "OpenAPI örnekleri"], null),
    I: DS(G, "Kapasite yönetimi", "İş önceliğine göre yük atma", [5, "Çok yüksek"], [3, "Orta"], [1, "Yok"],
      "<p>Hangi işin kritik olduğu <b>tamamen size özgüdür</b>. Bir ürün, \"ödeme\" ile \"öneri\" arasındaki farkı bilemez; bilebilmesi için iş modelinizi tanıması gerekir.</p>",
      "<ul><li>Öncelik puanını <b>başlıklardan</b> türetin — gövdeyi ayrıştırmadan (Netflix'in yaklaşımı).</li><li>Uyarlanabilir eşzamanlılık limitiyle birleştirin.</li><li>Limit dolduğunda <b>en düşük öncelikliden</b> başlayarak reddedin.</li><li>Reddi <span class='chip-mono'>503 + Retry-After</span> ile bildirin; istemcinin doğru davranmasını sağlayın.</li></ul>",
      "<p>Netflix'in ölçtüğü sonuç: gerçek bir kesintide kullanıcı kaynaklı isteklerde <b>%99,4 üzeri</b> erişilebilirlik korunurken ön yükleme istekleri %20'ye düştü. Öncelik olmadan <b>her şey</b> aynı anda bozulurdu.</p>",
      ["adaptive concurrency", "CoDel", "Little Yasası", "graceful degradation"],
      [{ t: "Önce", d: "Aşırı yükte tüm istekler eşit yavaşlar; ödeme de öneri de zaman aşımına uğrar." },
       { t: "Sonra", d: "Rapor ve öneri atılır; ödeme ve giriş normal hızda hizmet almaya devam eder." }]),
    J: DS(A, "Kimlik", "Bağlam zenginleştirme ve sözleşme", [4, "Yüksek"], [2, "Düşük"], [2, "Kısmi"],
      "<p>Ürünler token'ı doğrular ve claim'leri iletir; ancak <b>kurum kodu, yetki seti, abonelik katmanı</b> gibi türetilmiş bağlamı sizin kaynaklarınızdan zenginleştirmez.</p>",
      "<ul><li>Kullanıcı/kurum bağlamını <b>kısa TTL</b> ile önbellekleyin.</li><li>Bağlam başlığını <b>imzalayın</b> (HMAC) veya iç ağı mTLS ile kapatın — aksi hâlde kimlik taklidi aracına dönüşür.</li><li>Şemasını <b>sürümleyin</b>: alan eklemek kolay, kaldırmak kırıcıdır.</li></ul>",
      "<p>Her servisin kullanıcı/kurum servisini tekrar tekrar çağırması sona erer. Tipik bir istek zincirinde <b>3–5 iç çağrı</b> ortadan kalkar; hem gecikme hem yük düşer.</p>",
      ["bağlam header'ı", "HMAC imza", "N+1 çağrı", "token exchange"], null),
    K: DS(V, "Geliştirici deneyimi", "Kuruma özel katalog ve otomasyon", [3, "Orta"], [3, "Orta"], [1, "Yok"],
      "<p>Ürünlerin geliştirici portalları <b>dış</b> geliştiriciler içindir. Asıl acınız genelde <b>iç</b> ekipler arası koordinasyondur: kimin hangi API'yi kullandığı, kimin sahibi olduğu, kimin haberdar edilmesi gerektiği.</p>",
      "<ul><li>Rota tanımına <b>sahiplik ve SLO</b> alanları ekleyin; servis kataloğuyla senkronize edin.</li><li>Deprecated rota kullanımını <b>tüketici bazında</b> raporlayın.</li><li>İlgili ekibe otomatik bildirim gönderin: \"mobil v3.2 hâlâ /api/v0 kullanıyor, sunset 45 gün sonra.\"</li><li>Gerçek kullanımdan otomatik SDK üretin.</li></ul>",
      "<p>Sürüm emekliliği bir <b>müzakere</b> olmaktan çıkıp otomatik bir sürece dönüşür. \"Kimse haber vermedi\" itirazı ortadan kalkar.</p>",
      ["Backstage", "servis kataloğu", "sunset otomasyonu", "SDK üretimi"], null),
    L: DS(O, "Yapay zekâ", "AI ve ajan trafiği katmanı", [4, "Yükseliyor"], [4, "Yüksek"], [2, "Yeni"],
      "<p>Bu, alanın <b>en hızlı büyüyen</b> kısmı ve klasik ürünlerin eklentilerle yetiştirmeye çalıştığı yer. Kendi model portföyünüze, maliyet yapınıza ve veri politikanıza göre optimize etmek ancak kendi katmanınızla mümkündür.</p>",
      "<ul><li>Kotayı istek değil <b>token</b> üzerinden düşün — yanıt akışından sayım yapın.</li><li><b>Anlamsal önbellek</b>: istek gömme vektörünü hesaplayıp benzerlik eşiğiyle eşleştirin.</li><li>Model yönlendirme ve yedeklemeyi <b>devre kesiciyle</b> birleştirin.</li><li>Prompt injection ve veri sızıntısı filtrelerini istek yolunda çalıştırın.</li><li>MCP sunucularına erişimi ajan gateway'i ile yönetin; araç çağrılarını denetim kaydına yazın.</li></ul>",
      "<p>İki istek arasında <b>1000× maliyet farkı</b> olabilen bir dünyada, istek bazlı kota anlamsızdır. Token bazlı kota ve anlamsal önbellek, maliyeti öngörülebilir hâle getirir.</p>",
      ["token kotası", "semantic cache", "MCP", "prompt injection", "model routing"], null),
    M: DS(R, "Güvenlik tespiti", "Davranışsal anomali ve BOLA sezgisi", [4, "Yüksek"], [4, "Yüksek"], [1, "Yok"],
      "<p>Genel WAF'lar <b>imza tabanlıdır</b>; iş akışı anomalisini bilmezler. Gateway ise tüm trafiği tek yerden gören <b>tek</b> bileşendir — bu tespiti yapabilecek başka bir nokta yoktur.</p>",
      "<ul><li>Tüketici başına kayan pencerede erişilen <b>farklı nesne kimliği sayısını</b> tutun.</li><li>Normalden sapma eşiği aşıldığında isteği <b>engellemeyin — işaretleyin</b> ve alarm üretin.</li><li>Yanlış pozitif maliyeti yüksek olduğu için otomatik engelleme <b>son adımdır</b>.</li><li>Profili tüketici tipine göre ayrı tutun: entegratör ile mobil kullanıcı aynı desende olamaz.</li></ul>",
      "<p>OWASP API1 (BOLA) sömürüsünün klasik imzası — tek token, kısa sürede yüzlerce farklı kimlik — yakalanabilir hâle gelir. Bu, gateway'in çözemeyeceği söylenen riske karşı <b>tek anlamlı katkıdır</b>.</p>",
      ["OWASP API1", "BOLA", "davranış profili", "anomali skoru"], null),
    N: DS(W2, "Yanıt şekillendirme", "Alan bazlı yetki ve sürüm eşleme", [3, "Orta"], [3, "Orta"], [2, "Kısmi"],
      "<p>Ürünler genel gövde dönüşümü sunar; ancak <b>rol × şema</b> eşlemesine dayalı alan filtreleme ve eski istemciler için alan adı haritalama, veri modelinizi bilmeyi gerektirir.</p>",
      "<ul><li>Alan filtreleme kurallarını <b>rol × şema</b> eşlemesi olarak tanımlayın.</li><li>Yalnızca JSON yanıtlarda ve <b>boyut sınırı altında</b> uygulayın.</li><li>Akış (streaming) rotalarında devre dışı bırakın — tamponlama akışı bozar.</li><li>Her kurala bir <b>sunset tarihi</b> verin.</li></ul>",
      "<p>Aynı endpoint farklı rollere farklı görünürlük sunabilir; eski istemciler yeni alanlardan etkilenmez. <b>Uyarı:</b> bu gövde dönüşümüdür ve tüm maliyetleri geçerlidir — kısa vadeli bir <b>geçiş aracı</b> olarak kullanın, kalıcı mimari olarak değil.</p>",
      ["field-level authz", "gövde dönüşümü", "tolerant reader", "geçiş aracı"], null)
  };

  /* ══════════════════════════ AÇILIR KARTLAR ══════════════════════════════ */
  var ANTI_MORE = {
    "01": "<b>Belirti:</b> Gateway deposuna en çok kod yazan ekip, gateway'i işleten ekip değildir. Pull request'ler ürün özellikleri içerir.<br><b>Çözüm:</b> Gateway deposuna kod eklemeyi gözden geçirme kuralıyla kısıtlayın; istemciye özel şekil ihtiyacını <b>BFF</b>'e taşıyın.",
    "02": "<b>Belirti:</b> Gateway deploy'u için \"bakım penceresi\" ayarlanıyor ve birden çok ekibin onayı isteniyor.<br><b>Çözüm:</b> Maruziyete göre (dış / partner / iç) ayrı filolar; aynı teknoloji, ayrı deployment ve ayrı otomatik ölçekleme.",
    "03": "<b>Belirti:</b> Gateway'in bir veritabanı bağlantı dizesi vardır.<br><b>Çözüm:</b> Nesne yetkisini servise geri verin; gateway'de yalnızca token'dan çözülebilen kaba yetkiyi bırakın. Anomali tespitiyle destekleyin.",
    "04": "<b>Belirti:</b> Bir servisin <span class='chip-mono'>curl</span> ile küme içinden token'sız çağrılabilmesi.<br><b>Çözüm:</b> Her serviste yerel JWT doğrulama (mikrosaniye maliyetli), servisler arası mTLS ve varsayılan-reddet ağ politikası.",
    "05": "<b>Belirti:</b> \"Yeni rota için sıradaki sürümü bekleyin\" cümlesi.<br><b>Çözüm:</b> Rota tanımını koddan ayırın: CRD, etcd veya en azından ayrı yaşam döngüsüne sahip GitOps deposu.",
    "06": "<b>Belirti:</b> Küçük bir arka uç yavaşlamasının ardından yükün üç katına çıkması.<br><b>Çözüm:</b> Retry bütçesi (%10), jitter'lı üstel geri çekilme, yalnızca idempotent metotlar ve dıştan içe daralan timeout zinciri.",
    "07": "<b>Belirti:</b> Metrik sisteminin faturası gateway'in altyapı maliyetini geçmesi.<br><b>Çözüm:</b> Etiket olarak ham yol değil <b>route_id</b> kalıbı; kullanıcı ve korelasyon kimlikleri metriğe değil <b>log ve trace</b>'e.",
    "08": "<b>Belirti:</b> Ürün seçim toplantısının tek gündem maddesinin RPS tablosu olması.<br><b>Çözüm:</b> Karar kriterlerini yazın ve ağırlıklandırın: işletilebilirlik, işe alım, ekosistem, dinamiklik, maliyet. Performansı <b>eşik</b> olarak kullanın, sıralama ölçütü olarak değil.",
    "09": "<b>Belirti:</b> Aynı kaynağın v1, v1.1, v2, v2-beta yollarının hepsinin canlı olması.<br><b>Çözüm:</b> Yalnızca kırıcı değişiklikte sürüm artırın; her sürüme doğduğu gün sunset tarihi verin; kullanım telemetrisiyle kapatma kararını veriyle alın."
  };
  var DIFF_MORE = {
    A: "<b>Nasıl uygulanır:</b> Politika verisini (hiyerarşi, takvim, risk skoru) gateway'e ayrı bir kanaldan besleyin ve <b>bellekte</b> tutun; kararı sıcak yolda ağ çağrısı yapmadan verin. Veriyi periyodik olarak yenileyin ve yenileme başarısız olursa son bilinen sürümle devam edin.",
    B: "<b>Nasıl uygulanır:</b> Anahtar → (durum, yanıt, son kullanma) kaydını paylaşılan bir depoda tutun. İlk istek kaydı <span class='chip-mono'>IN_PROGRESS</span> olarak oluşturur; eş zamanlı ikinci istek bu kaydı görüp <b>bekler</b>; tamamlanınca aynı yanıtı döndürür. Anahtarın <b>istemcide</b> üretilmesi zorunludur.",
    C: "<b>Nasıl uygulanır:</b> Önbellek anahtarını varlık kimliğiyle etiketleyin (<span class='chip-mono'>tag: musteri:42</span>). Yazma isteği geçtiğinde ilgili etikete sahip tüm girdileri geçersiz kılın. Etiket eşlemesi rota tanımının bir parçası olarak yapılandırılabilir.",
    D: "<b>Nasıl uygulanır:</b> Her rotaya bir maliyet ağırlığı verin; erişim logunda tüketici, rota, süre ve ağırlığı birlikte kaydedin. Toplu iş bu kayıtları altyapı faturasıyla eşleştirip ekip/kiracı kırılımında rapor üretir.",
    E: "<b>Nasıl uygulanır:</b> Maskeleme kurallarını OpenAPI şemasına <b>ek açıklama</b> olarak yazın (<span class='chip-mono'>x-pii: tckn</span>); gateway şemayı zaten yüklediği için hangi alanın hassas olduğunu bilir. Denetim kaydına karar gerekçesini ve politika sürümünü ekleyin.",
    F: "<b>Nasıl uygulanır:</b> Köprüyü ayrı bir filtre modülü olarak yazın ve <b>yalnızca ilgili rotalara</b> bağlayın; asla varsayılan filtre yapmayın. Eski sistem emekli olduğunda modül tek yerden kaldırılır. Dönüşüm kurallarını sürüm kontrolünde tutun.",
    G: "<b>Nasıl uygulanır:</b> Tüketici katmanını token'dan çözün ve upstream seçimine girdi yapın. Ayrılmış havuzları ayrı upstream kümesi olarak tanımlayın; havuz sağlıksızsa paylaşımlı havuza <b>otomatik geri düşün</b>.",
    H: "<b>Nasıl uygulanır:</b> Mock yanıtları OpenAPI örneklerinden üretin. Kayıt/tekrar için istek-yanıt çiftlerini örnekleyerek saklayın (PII maskeli). Hata enjeksiyonunu yalnızca imzalı bir başlıkla tetiklenebilir yapın — aksi hâlde saldırı aracına dönüşür.",
    I: "<b>Nasıl uygulanır:</b> Öncelik puanını başlıklardan türetin (gövdeyi ayrıştırmadan). Uyarlanabilir eşzamanlılık limitiyle birleştirin: limit dolduğunda <b>en düşük öncelikliden</b> başlayarak reddedin ve reddi <span class='chip-mono'>503 + Retry-After</span> ile bildirin.",
    J: "<b>Nasıl uygulanır:</b> Kullanıcı/kurum bağlamını kısa TTL ile önbellekleyin. Bağlam başlığını <b>imzalayın</b> (HMAC) veya iç ağı mTLS ile kapatın. Şemasını sürümleyin: alan eklemek kolay, kaldırmak kırıcıdır.",
    K: "<b>Nasıl uygulanır:</b> Rota tanımına sahiplik ve SLO alanları ekleyin; bunları servis kataloğuyla senkronize edin. Deprecated rota kullanımını tüketici bazında raporlayıp ilgili ekibe otomatik bildirim gönderin.",
    L: "<b>Nasıl uygulanır:</b> Token sayımını yanıt akışından okuyun ve kotayı istek değil <b>token</b> üzerinden düşün. Anlamsal önbellek için istek gömme (embedding) vektörünü hesaplayıp benzerlik eşiğiyle eşleştirin. Model yönlendirmeyi devre kesiciyle birleştirin.",
    M: "<b>Nasıl uygulanır:</b> Tüketici başına kayan pencerede erişilen <b>farklı nesne kimliği sayısını</b> tutun. Normalden sapma eşiği aşıldığında isteği engellemeyin — <b>işaretleyin ve alarm üretin</b>. Yanlış pozitif maliyeti yüksek olduğu için otomatik engelleme son adımdır.",
    N: "<b>Nasıl uygulanır:</b> Alan filtreleme kurallarını rol × şema eşlemesi olarak tanımlayın. Yalnızca JSON yanıtlarda ve boyut sınırı altında uygulayın; akış (streaming) rotalarında devre dışı bırakın. Her kurala bir <b>sunset tarihi</b> verin."
  };
  /* ══════════════════════ ÖNE ÇIKAN KART (SPOTLIGHT) ══════════════════════ */
  var spotEl = null;
  function ensureSpot() {
    if (spotEl) return spotEl;
    spotEl = document.createElement("div");
    spotEl.className = "spot";
    spotEl.hidden = true;
    spotEl.setAttribute("role", "dialog");
    spotEl.setAttribute("aria-modal", "true");
    spotEl.innerHTML = '<div class="spot-card" id="spotCard"></div>';
    document.body.appendChild(spotEl);
    spotEl.addEventListener("click", function (e) { if (e.target === spotEl) closeSpot(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !spotEl.hidden) { e.stopPropagation(); closeSpot(); }
    }, true);
    return spotEl;
  }
  var spotOpenKey = null;
  function closeSpot() {
    if (spotEl) { spotEl.hidden = true; spotOpenKey = null; }
  }
  function dotsBar(v, col) {
    var out = "";
    for (var i = 0; i < 5; i++) out += '<i style="background:' + (i < v ? col : "var(--s4)") + '"></i>';
    return '<div class="spot-dots">' + out + "</div>";
  }
  function openSpot(key, d) {
    ensureSpot();
    if (spotOpenKey === key) { closeSpot(); return; }   // aynı karta tekrar tıklama → kapat
    spotOpenKey = key;
    var card = $("#spotCard");
    var sec = function (icon, title, col, html) {
      return '<div class="spot-sec"><span class="si"><svg style="color:' + col + '"><use href="#' + icon + '"/></svg></span>' +
        '<div><h4 style="color:' + col + '">' + title + "</h4>" + html + "</div></div>";
    };
    card.innerHTML =
      '<div class="spot-hd">' +
        '<span class="sn" style="background:' + d.c + '1f;color:' + d.c + ';border:1px solid ' + d.c + '55">' + key + "</span>" +
        '<div><div class="stag" style="color:' + d.c + '">' + d.tag + "</div><h3>" + d.t + "</h3></div>" +
        '<button class="spot-close" id="spotX" aria-label="Kapat"><svg><use href="#i-x"/></svg></button>' +
      "</div>" +
      '<div class="spot-body">' +
        '<div class="spot-meters">' +
          d.meters.map(function (m) {
            return '<div class="spot-meter"><div class="smk">' + m.k + '</div>' +
              '<div class="smv" style="color:' + m.c + '">' + m.v + "</div>" + dotsBar(m.n, m.c) + "</div>";
          }).join("") +
        "</div>" +
        (d.ba ? '<div class="spot-ba">' +
          '<div class="ba-box bad"><div class="bt">' + d.ba[0].t + '</div><p>' + d.ba[0].d + "</p></div>" +
          '<div class="ba-arrow"><svg><use href="#i-arrow"/></svg></div>' +
          '<div class="ba-box good"><div class="bt">' + d.ba[1].t + '</div><p>' + d.ba[1].d + "</p></div>" +
        "</div>" : "") +
        d.secs.map(function (s) { return sec(s.i, s.h, s.c, s.b); }).join("") +
        (d.rel ? '<div class="spot-sec"><span class="si"><svg style="color:var(--t3)"><use href="#i-layers"/></svg></span>' +
          '<div><h4 style="color:var(--t3)">İlgili kavramlar</h4><div class="spot-rel">' +
          d.rel.map(function (r) { return "<span>" + r + "</span>"; }).join("") + "</div></div></div>" : "") +
      "</div>";
    /* Kart her açılışta yeniden üretiliyor; düğme de yeni. Doğrudan bağlanır. */
    $("#spotX").addEventListener("click", function (e) { e.stopPropagation(); closeSpot(); });
    spotEl.hidden = false;
    card.scrollTop = 0;
  }
  function spotlight(slideSel, data) {
    $$(slideSel + " .acc-card").forEach(function (c) {
      var key = ((c.querySelector(".cnum") || {}).textContent || "").trim();
      /* DOM süslemesi bir kez; dinleyiciler her girişte (ev() slayt çıkışında siler). */
      if (!c.dataset.spot) {
        c.dataset.spot = "1";
        c.setAttribute("tabindex", "0");
        c.setAttribute("role", "button");
        var hint = document.createElement("div");
        hint.className = "acc-hint";
        hint.innerHTML = '<svg><use href="#i-arrow"/></svg><span>Ayrıntılı görünüm</span>';
        c.appendChild(hint);
      }
      function open() { var d = data[key]; if (d) openSpot(key, d); }
      ev(c, "click", open);
      ev(c, "keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
  }

  function runAnti() { spotlight("#slide-anti", ANTI_SPOT); }
  function runDiff() { spotlight("#slide-diff", DIFF_SPOT); }

  /* ══════════════════════════ SLAYT: SCG TEKNOLOJİ ════════════════════════ */
  function runScg() {
    techTabs("#scgTech", "#scgTechBody", [
      "<b>Nedir?</b> Spring ekosistemi içinde <b>kütüphane olarak</b> çalışan bir API gateway. Ayrı bir ürün değil, " +
      "sizin yazdığınız bir Spring Boot uygulamasıdır: rota tanımlarını YAML veya Java DSL ile verirsiniz, " +
      "gerektiğinde kendi filtrelerinizi Java ile yazarsınız." +
      "<div class='kv'><b>İki varyant</b><span><span class='chip-mono'>server-webflux</span> (reaktif, Netty) ve <span class='chip-mono'>server-webmvc</span> (servlet, sanal iş parçacığı uyumlu) — aynı rota ve filtre modelini paylaşırlar.</span></div>",

      "<b>Neden tercih edilir?</b> Tek bir sebep diğerlerinin toplamından ağır basar: <b>ekibin zaten bildiği dil ve " +
      "araçlar</b>. Gateway'de iş kuralına yakın özel politika gerektiğinde — kurum hiyerarşisine göre yetki, " +
      "HSM ile imzalama, kuruma özel token biçimi — bunları Java ile yazmak, Lua öğrenmekten veya harici bir " +
      "süreçle konuşmaktan kat kat hızlıdır." +
      "<ul><li>Mevcut kurumsal kütüphaneler (imza, LDAP, kurum SDK'ları) doğrudan kullanılır</li>" +
      "<li>Eureka, Config Server, Micrometer, Sleuth/OTel ile hazır bütünleşme</li>" +
      "<li>Aynı CI/CD, aynı gözlemlenebilirlik, aynı güvenlik tarama zinciri</li>" +
      "<li>Lisans maliyeti yoktur; hava boşluklu ortamlarda sorunsuz çalışır</li></ul>",

      "<b>Nasıl çalışır?</b> Bir gateway ömrünün neredeyse tamamını arka ucu <b>beklerken</b> geçirir. " +
      "WebFlux varyantında istekler az sayıda <b>olay döngüsü iş parçacığı</b> üzerinde işlenir; bekleme " +
      "sırasında iş parçacığı serbest kalır ve başka isteklere hizmet eder. Bu yüzden binlerce eşzamanlı " +
      "bağlantı, binlerce iş parçacığı gerektirmez." +
      "<ul><li>İstek bir <b>rota</b> ile eşleşir (predicate zinciri)</li>" +
      "<li><b>Pre</b> filtreler sırayla çalışır; herhangi biri zinciri kısa devre edebilir</li>" +
      "<li>Global yönlendirme filtresi Netty HttpClient ile arka uca gider</li>" +
      "<li>Yanıt aynı zincirden <b>ters sırada</b> (post) geri döner</li></ul>" +
      "<div class='kv'><b>En pahalı hata</b><span>Reaktif zincirde bloklayan bir çağrı (JDBC, RestTemplate, Thread.sleep) olay döngüsünü kilitler. Sekiz çekirdekli makinede birkaç bloklayan çağrı tüm gateway'i durdurabilir — test ortamında BlockHound açık tutulmalıdır.</span></div>",

      "<b>Neden bu, alternatifi değil?</b> Karar üç soruyla netleşir:" +
      "<ul><li><b>Ekip JVM'de mi?</b> Evetse SCG'nin öğrenme maliyeti sıfıra yakındır; Kong veya APISIX ise Lua, Envoy ise C++/WASM getirir.</li>" +
      "<li><b>Hazır özellik mi, özel mantık mı?</b> Portal, monetizasyon ve eklenti pazarı istiyorsanız SCG'de bunlar <b>yoktur</b> — Kong/Apigee/WSO2 doğru adrestir.</li>" +
      "<li><b>Kapasite ne?</b> Tek düğümde on binlerce RPS gerekiyorsa C/LuaJIT sınıfı (Envoy, APISIX, NGINX) daha uygundur; çoğu kurumun gerçek tepe yükü bu eşiğin oldukça altındadır.</li></ul>" +
      "<b>Özetle:</b> SCG, <b>gateway'i bir ürün gibi satın almak</b> yerine <b>bir uygulama gibi geliştirmek</b> isteyen JVM ekipleri için tasarlanmıştır."
    ]);
  }

  /* ═══════════ SLAYT 9 · KATMANLI KONUMLANDIRMA HARİTASI ═══════════════ */
  var NS_MODES = {
    ns: {
      c: "#5b8cff", k: "Gateway'in alanı", t: "Kuzey-güney trafiği",
      hot: ["ns-clients", "ns-ar1", "ns-edgeG", "ns-axisNS"],
      dim: ["ns-ew", "ns-axisEW"],
      d: "Sistemin <b>dışından içine</b> akan istekler. Diyagramda yukarıdan aşağı inen mavi oklar budur; " +
         "terimin kaynağı da bu yöndür. Kimlik doğrulama, kota, sürüm çözümleme, dış sözleşme ve " +
         "dayanıklılık politikaları bu eksende uygulanır.<br><br>" +
         "<b>Kritik nokta:</b> bu trafiğin tek sahibi <b>Edge Gateway</b>'dir. Politikanın burada uygulanması, " +
         "aşağıdaki hiçbir katmanın kimlik veya kota kodu taşımamasını sağlar."
    },
    ew: {
      c: "#a78bfa", k: "Mesh'in alanı", t: "Doğu-batı trafiği",
      hot: ["ns-prod", "ns-domain", "ns-ew", "ns-axisEW"],
      dim: ["ns-clients", "ns-ar1", "ns-edgeG", "ns-axisNS", "ns-ar2", "ns-bff"],
      d: "Servislerin <b>birbirine</b> yaptığı yatay çağrılar. Aynı katmandaki kesikli mor oklar budur. " +
         "Bu trafikte kullanıcı kimliği değil <b>servis kimliği</b> önemlidir; mTLS, retry ve " +
         "gözlemlenebilirlik uygulama kodu değişmeden sağlanır.<br><br>" +
         "<b>Sık yapılan hata:</b> bu trafiği de gateway'den geçirmek. Bu, gereksiz bir atlama ve " +
         "yeni bir tek hata noktası ekler. Ayrım net: <b>gateway kuzey-güneyi, mesh doğu-batıyı</b> üstlenir."
    },
    layers: {
      c: "#38e1c8", k: "Dört katman", t: "BFF ve federation nereye ait?",
      hot: ["ns-bff", "ns-prod", "ns-domain", "ns-ar2", "ns-ar3", "ns-ar4"],
      dim: ["ns-axisNS", "ns-axisEW", "ns-ew"],
      d: "BFF ve GraphQL router, gateway'in <b>alternatifi değil arkasındaki katmandır</b>. " +
         "Kimlik, kota ve TLS hâlâ gateway'in işidir; bu katman yalnızca <b>istemciye özel veri şeklini</b> üretir.<br><br>" +
         "<b>Neden ayrı katman:</b> mobil küçük payload, web tam detay isterse gateway'de uzlaşma başlar ve " +
         "endpoint şişer. Şekil ihtiyacını ilgili ekibin sahip olduğu bir servise taşımak, gateway'i ince tutar. " +
         "Uber üçüncü nesil mimarisinde tam olarak bu dört katmanı kurumsallaştırdı ve kenar katmanında " +
         "iş mantığını <b>yasakladı</b>."
    }
  };
  function runNs() {
    var svg = $("#nsSvg"); if (!svg) return;
    var wrap = svg.closest(".nsmap"), modes = $("#nsModes"), panel = $("#nsPanel");
    var cur = "ns";
    function apply(m) {
      cur = m;
      var d = NS_MODES[m];
      $$("button[data-m]", modes).forEach(function (b) { b.classList.toggle("on", b.dataset.m === m); });
      $$('g[id^="ns-"]', svg).forEach(function (g) {
        g.classList.remove("ns-dim", "ns-hot");
        if (d.dim.indexOf(g.id) >= 0) g.classList.add("ns-dim");
        else if (d.hot.indexOf(g.id) >= 0) g.classList.add("ns-hot");
      });
      wrap.classList.toggle("ew-live", m === "ew");
      panel.innerHTML = '<div class="hp-k" style="color:' + d.c + '">' + d.k + "</div>" +
        '<div class="hp-t">' + d.t + '</div><div class="hp-d">' + d.d + "</div>";
    }
    ev(modes, "click", function (e) {
      var b = e.target.closest("button[data-m]"); if (b) apply(b.dataset.m);
    });
    apply(cur);

    /* kuzey-güney akışı: yukarıdan aşağı inen paketler */
    var dots = $("#nsDots"); if (!dots || reduce) return;
    var LANES = [186, 372, 558, 744];
    var STOPS = [64, 88, 140, 164, 212, 236, 284, 308];
    var N = 12, els = [];
    dots.innerHTML = "";
    for (var i = 0; i < N; i++) {
      var ci = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      ci.setAttribute("r", "3.6"); ci.setAttribute("opacity", "0");
      dots.appendChild(ci); els.push(ci);
    }
    var seeds = els.map(function (_, i) {
      return { lane: i % LANES.length, off: i / N, drift: ((i % 3) - 1) * 42 };
    });
    var t0n = performance.now();
    loop(function (now) {
      var visible = (cur !== "ew");
      var el = (now - t0n) / 1000;
      els.forEach(function (ci, i) {
        if (!visible) { ci.setAttribute("opacity", "0"); return; }
        var s = seeds[i];
        var t = ((el * 0.30) + s.off) % 1;
        /* 28 → 352 arası iner; katman aralarında hafif sağa-sola kayar */
        var y = 34 + (348 - 34) * t;
        var x = LANES[s.lane] + Math.sin(t * Math.PI * 2) * s.drift * 0.5;
        var col = y < 142 ? "#5b8cff" : "#38e1c8";
        /* katman sınırlarında kısa duraklama etkisi: opaklık nabzı */
        var near = STOPS.some(function (sy) { return Math.abs(y - sy) < 7; });
        ci.setAttribute("cx", x); ci.setAttribute("cy", y);
        ci.setAttribute("fill", col);
        ci.setAttribute("r", near ? "5" : "3.6");
        ci.setAttribute("opacity", String((cur === "layers" ? 0.55 : 0.9) * Math.min(1, Math.sin(t * Math.PI) * 2.2)));
      });
    });
  }

  /* ══════════════ SLAYT 7 · DOĞRU SIRALANMIŞ ZİNCİR (SONUÇ) ══════════════ */
  var RIGHT_CHAIN = [
    { i: "i-lock", t: "TLS", c: "~0,3 ms", ph: "pre", r: "KURAL 1 · ucuz olan önce",
      d: "Şifreleme burada biter; bundan sonrası düz metin üzerinde çalışır. Protokol ve istemci sertifikası kararı da bu noktada verilir." },
    { i: "i-shield", t: "Header hijyeni", c: "~0,02 ms", ph: "pre", r: "KURAL 3 · temizlik her şeyden önce",
      d: "İstemciden gelen <b>X-User-Id</b>, <b>X-Forwarded-For</b> gibi güven gerektiren başlıklar koşulsuz silinir. Bu adım sonraya bırakılırsa aradaki tüm filtreler sahte kimlikle çalışır." },
    { i: "i-box", t: "Boyut limiti", c: "~0,02 ms", ph: "pre", r: "KURAL 1 · ucuz olan önce",
      d: "Gövde, başlık ve URL boyutu kontrol edilir. Maliyetsizdir ve pahalı adımlardan önce gelmezse 100 MB'lık bir gövde size işlemci ve bellek harcatır." },
    { i: "i-route", t: "Rota eşleme", c: "~0,05 ms", ph: "route", r: "Politikaların adresi burada belirlenir",
      d: "Hangi rotaya düşüldüğü belirlenir; bundan sonraki her politika (kota, timeout, yetki) <b>bu rotaya</b> bağlıdır. Rota kimliği aynı zamanda metrik ve log etiketidir." },
    { i: "i-globe", t: "CORS ön kontrol", c: "~0,01 ms", ph: "pre", r: "Kimlikten önce olmak zorunda",
      d: "<b>OPTIONS</b> istekleri kimlik bilgisi taşımaz. Kimlik doğrulamanın arkasına konursa tarayıcıdan gelen her çağrı başarısız olur." },
    { i: "i-gauge", t: "Anonim hız sınırı", c: "~0,6 ms", ph: "pre", r: "KURAL 2 · kimlikten önce kaba limit",
      d: "Kimlik henüz bilinmediği için IP bazlı gevşek bir limit uygulanır. Bu adım olmazsa kimlik doğrulama ucu maliyetsiz bir DoS hedefine dönüşür." },
    { i: "i-key", t: "Kimlik doğrulama", c: "~0,25 ms", ph: "id", r: "Zincirin ekseni",
      d: "Token doğrulanır ve tüketici çözülür. Bundan öncesi <b>kimliksiz</b>, sonrası <b>kimlikli</b> dünyadır — sıralamanın tamamı bu çizgiye göre kurulur." },
    { i: "i-shield", t: "Kaba yetki", c: "~0,1 ms", ph: "id", r: "Kimlik çözüldü, artık mümkün",
      d: "Rota için gereken scope/rol kontrol edilir. Yönetim uçlarının dış trafiğe kapatılması bu adımda olur." },
    { i: "i-pulse", t: "Kimliğe bağlı kota", c: "~0,6 ms", ph: "cost", r: "KURAL 2 · kimlikten sonra",
      d: "Kullanıcı, kurum ve API anahtarı bazlı limitler uygulanır. Anahtar kimlikten türediği için bu adım kimlikten önce gelemez." },
    { i: "i-check", t: "Şema doğrulama", c: "~0,4 ms", ph: "cost", r: "Pahalı — yetkiden sonra",
      d: "Gövde OpenAPI şemasına göre doğrulanır. Maliyeti gövde boyutuyla arttığı için yetkisiz isteklere hiç harcanmamalıdır." },
    { i: "i-users", t: "Bağlam zenginleştirme", c: "~0,05 ms", ph: "id", r: "Downstream'in ihtiyacı",
      d: "Çözülmüş kimlik, kurum kodu ve yetki seti başlık olarak eklenir; servisler token ayrıştırmak zorunda kalmaz." },
    { i: "i-net", t: "Korelasyon + trace", c: "~0,15 ms", ph: "post", r: "KURAL 4 · en dışta olmalı",
      d: "Aslında zincirin <b>en dışında</b> konumlanır: pre'de ilk, post'ta son çalışır. Böylece hatalar dâhil her şeyi ölçebilir ve her isteğe tek bir kimlik damgası vurabilir." },
    { i: "i-breaker", t: "Dayanıklılık + upstream", c: "değişken", ph: "route", r: "Arka uca çıkış noktası",
      d: "Devre kesici durumu kontrol edilir, timeout ve retry politikası uygulanır, sağlıklı bir örnek seçilir ve bağlantı havuzundan bağlantı alınır." },
    { i: "i-eye", t: "Yanıt + telemetri", c: "~0,1 ms", ph: "post", r: "KURAL 4 · simetrinin geri dönüşü",
      d: "Güvenlik başlıkları eklenir, sızıntı yapan başlıklar kaldırılır, metrik ve erişim logu yazılır. Post aşaması pre'nin <b>ters sırasıyla</b> işler." }
  ];
  function runRightChain() {
    var host = $("#rightChain"); if (!host) return;
    var panel = $("#rcPanel"), stat = $("#chainStat");
    host.innerHTML = RIGHT_CHAIN.map(function (s, i) {
      return '<div class="rc-step" data-i="' + i + '" data-ph="' + s.ph + '">' +
        '<span class="rci"><svg><use href="#' + s.i + '"/></svg></span>' +
        '<span class="rcn">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="rct">' + s.t + "</span>" +
        '<span class="rcc">' + s.c + "</span></div>";
    }).join("");
    var steps = $$(".rc-step", host);
    var cur = 0, playing = !reduce, timer = null;
    var pos = $("#rcPos"), playBtn = $("#rcPlay"), prevBtn = $("#rcPrev"), nextBtn = $("#rcNext");

    function show(i) {
      cur = ((i % RIGHT_CHAIN.length) + RIGHT_CHAIN.length) % RIGHT_CHAIN.length;
      var s = RIGHT_CHAIN[cur];
      steps.forEach(function (el, j) {
        el.classList.toggle("hot", j === cur);
        el.classList.toggle("on", j === cur);
      });
      var col = { pre: "#38e1c8", id: "#5b8cff", cost: "#fbbf24", route: "#a78bfa", post: "#f0a15c" }[s.ph];
      panel.innerHTML = '<div class="hp-k" style="color:' + col + '">' + s.r + "</div>" +
        '<div class="hp-t">' + String(cur + 1).padStart(2, "0") + " · " + s.t +
        ' <span style="font-family:' + C.mono + ';font-size:11.5px;color:var(--t3);font-weight:400">· ' + s.c + '</span></div>' +
        '<div class="hp-d">' + s.d + "</div>";
      if (pos) pos.textContent = String(cur + 1).padStart(2, "0") + " / " + RIGHT_CHAIN.length;
      if (stat) {
        var ph = s.ph;
        stat.className = "sbadge " + (ph === "post" ? "w" : ph === "id" ? "a" : ph === "cost" ? "w" : "g");
        stat.textContent = ph === "post" ? "post aşaması" : ph === "id" ? "kimlikli bölge"
          : ph === "cost" ? "pahalı adımlar" : ph === "route" ? "yönlendirme" : "pre aşaması";
      }
      /* dar ekranda seçili adım görünür kalsın */
      if (host.scrollWidth > host.clientWidth) {
        var el2 = steps[cur];
        var target = el2.offsetLeft - host.clientWidth / 2 + el2.offsetWidth / 2;
        host.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
      }
    }
    function syncPlay() {
      if (!playBtn) return;
      playBtn.innerHTML = playing
        ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Oynat';
    }
    function stop() { playing = false; if (timer) { clearInterval(timer); timer = null; } syncPlay(); }
    function start() {
      playing = true; syncPlay();
      if (timer) clearInterval(timer);
      timer = every(function () { show(cur + 1); }, 2200);
    }
    ev(host, "click", function (e) {
      var st = e.target.closest(".rc-step[data-i]");
      if (st) { stop(); show(+st.dataset.i); }
    });
    if (prevBtn) ev(prevBtn, "click", function () { stop(); show(cur - 1); });
    if (nextBtn) ev(nextBtn, "click", function () { stop(); show(cur + 1); });
    if (playBtn) ev(playBtn, "click", function () { playing ? stop() : start(); });
    show(0);
    if (reduce) { stop(); return; }
    start();
  }

  /* ═════════════════ SLAYT 4 · ORTAK DİL (KAVRAM PANOSU) ═════════════════ */
  var GLOSS = [
    { k: "Tüketici", c: "#5b8cff", a: "gA-clients", hi: [10, 56, 128, 134],
      d: "API'yi <b>çağıran taraf</b>: mobil uygulama, web arayüzü, partner sistemi veya başka bir servis. Gateway'in kota, yetki ve öncelik kararları hep \"hangi tüketici\" sorusuna bağlıdır — bu yüzden kimlik çözülmeden hiçbir politika tam uygulanamaz." },
    { k: "Kuzey-güney trafiği", c: "#5b8cff", a: "gA-ns", hi: [132, 62, 196, 122],
      d: "Sistemin <b>dışından içine</b> akan istekler. Gateway'in asıl alanı budur: kimlik, kota, sürüm ve dış sözleşme burada uygulanır. Adı, mimari diyagramlarda istemcilerin üstte (kuzey), servislerin altta (güney) çizilmesinden gelir." },
    { k: "Doğu-batı trafiği", c: "#6b7488", a: "gA-ew", hi: [700, 58, 178, 128],
      d: "Servislerin <b>birbirine</b> yaptığı çağrılar. Bu trafik service mesh'in alanıdır; gateway'i araya sokmak gereksiz bir atlama ve yeni bir hata noktası ekler. Ayrım net: gateway kuzey-güneyi, mesh doğu-batıyı üstlenir." },
    { k: "Veri düzlemi", c: "#5b8cff", a: "gA-gw", hi: [322, 56, 236, 184],
      d: "İsteği fiilen karşılayan, politikayı uygulayan ve arka uca taşıyan katman. <b>İstek yolundadır</b> ve trafikle birlikte ölçeklenir. Düşerse kademeli bozulma olmaz — tam karartma olur." },
    { k: "Kontrol düzlemi", c: "#a78bfa", a: "gA-cp", hi: [334, 2, 212, 48],
      d: "Yapılandırmayı üreten, doğrulayan ve veri düzlemine dağıtan katman. <b>İstek yolunun dışındadır</b> ve trafikten bağımsız ölçeklenir. Rota tanımları, kota kuralları ve sertifikalar buradan yayılır." },
    { k: "Fail static", c: "#34d399", a: "gA-cp", hi: [400, 40, 82, 28],
      d: "Kontrol düzlemi erişilemez hâle geldiğinde veri düzleminin <b>son bilinen yapılandırmayla</b> çalışmaya devam etmesi. Bu kural ihlal edilirse, kontrol düzlemi kesintisi doğrudan üretim kesintisine dönüşür — gateway mimarisinin en kritik tek kuralıdır." },
    { k: "Rota (route)", c: "#38e1c8", a: "gA-route", hi: [334, 82, 212, 40],
      d: "Gateway'in temel yapı taşı: <b>koşul + davranış + hedef</b> üçlüsü. Hangi isteğin eşleşeceğini, üzerinde ne yapılacağını ve nereye gideceğini tanımlar. Ürün adları değişir (route, HTTPRoute, service+plugin) ama kavram aynıdır." },
    { k: "Predicate", c: "#38e1c8", a: "gA-route", hi: [334, 82, 108, 40],
      d: "Rotanın <b>eşleşme koşulu</b>: yol, metot, host, header, query, ağırlık, zaman aralığı. Koşullar \"ve\" mantığıyla birleşir. En sık hata, genel bir rotanın spesifik olanı gölgelemesidir — bu durumda sıkı politikalar hiç çalışmaz." },
    { k: "Filtre zinciri", c: "#fbbf24", a: "gA-chain", hi: [334, 120, 212, 40],
      d: "İsteğin sırayla geçtiği işlemler dizisi. İleri yönde (<b>pre</b>) istek üzerinde, geri dönüşte (<b>post</b>) yanıt üzerinde çalışır. En yüksek öncelikli filtre pre'de ilk, post'ta son çalışır; bu simetri korelasyon ve metriklerin her şeyi görebilmesini sağlar." },
    { k: "Politika", c: "#a78bfa", a: "gA-policy", hi: [334, 158, 212, 40],
      d: "Her isteğe <b>tekdüze</b> uygulanan kural: kimlik doğrulama, kota, gövde limiti, güvenlik başlıkları. Gateway'in var olma sebebi politikayı merkezîleştirmektir. İş kuralı politika değildir — o servise aittir." },
    { k: "Upstream", c: "#38e1c8", a: "gA-svc", hi: [680, 58, 148, 130],
      d: "İsteğin yönlendirildiği <b>arka uç hedefi</b>: bir servis, servis örnekleri kümesi veya dış API. Servis keşfi bu hedefin adresini çözer; sağlık kontrolü ve yük dağıtımı örnekler arasında seçim yapar." },
    { k: "Blast radius", c: "#f87171", a: "gA-blast", hi: [286, 34, 308, 228],
      d: "Bir arızanın <b>etkilediği alanın büyüklüğü</b>. Gateway her isteğin yolunda olduğu için varsayılan blast radius'u tüm sistemdir. Filo ayrımı, çoklu bölge ve hücresel dağıtım — hepsi bu yarıçapı küçültmek içindir." }
  ];
  function runStage1() {
    var svg = $("#glSvg"); if (!svg) return;
    var chips = $("#glChips"), panel = $("#glPanel"), hi = $("#glHi"), dots = $("#glDots");
    var cur = 0, auto = true, timer = null;

    chips.innerHTML = GLOSS.map(function (g, i) {
      return '<button class="gl-chip" data-i="' + i + '"><i style="background:' + g.c + '"></i>' + g.k + "</button>";
    }).join("");
    ev(chips, "click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) { stopAuto(); sel(+b.dataset.i); }
    });
    var pb = $("#glPlay");
    ev(pb, "click", function () { auto ? stopAuto() : startAuto(); });
    function setPlayBtn() {
      $("#glPlay").innerHTML = auto
        ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Otomatik oynat';
    }
    function stopAuto() { auto = false; if (timer) { clearInterval(timer); timer = null; } setPlayBtn(); }
    function startAuto() {
      auto = true; setPlayBtn();
      if (timer) clearInterval(timer);
      timer = every(function () { sel((cur + 1) % GLOSS.length); }, 3600);
    }
    function sel(i) {
      cur = i;
      var g = GLOSS[i];
      $$(".gl-chip", chips).forEach(function (b, j) { b.classList.toggle("on", j === i); });
      /* şemada ilgili grubu öne çıkar, diğerlerini soluklaştır */
      $$('g[id^="gA-"]', svg).forEach(function (el) { el.classList.toggle("gl-dim", el.id !== g.a); });
      var blast = $("#gA-blast");
      if (blast) blast.setAttribute("opacity", g.a === "gA-blast" ? ".85" : "0");
      hi.setAttribute("x", g.hi[0]); hi.setAttribute("y", g.hi[1]);
      hi.setAttribute("width", g.hi[2]); hi.setAttribute("height", g.hi[3]);
      hi.setAttribute("stroke", g.c);
      hi.setAttribute("fill", g.c + "14");
      hi.setAttribute("opacity", "1");
      panel.innerHTML = '<div class="hp-k" style="color:' + g.c + '">Kavram ' + (i + 1) + " / " + GLOSS.length + "</div>" +
        '<div class="hp-t">' + g.k + "</div><div class=\"hp-d\">" + g.d + "</div>";
    }
    sel(0);
    if (!reduce) startAuto(); else setPlayBtn();

    /* şemada akan paketler */
    if (!reduce) {
      var PATHS = [
        { d: [[134, 79], [322, 120]], c: "#5b8cff" }, { d: [[134, 123], [322, 140]], c: "#5b8cff" },
        { d: [[134, 167], [322, 160]], c: "#5b8cff" }, { d: [[556, 120], [680, 80]], c: "#38e1c8" },
        { d: [[556, 148], [680, 124]], c: "#38e1c8" }, { d: [[556, 176], [680, 168]], c: "#38e1c8" }
      ];
      dots.innerHTML = PATHS.map(function (p, i) {
        return '<circle r="3.2" fill="' + p.c + '" opacity="0" data-p="' + i + '"/>';
      }).join("");
      var circles = $$("circle[data-p]", dots), t0g = performance.now();
      loop(function (now) {
        var el = (now - t0g) / 1000;
        circles.forEach(function (ci, i) {
          var p = PATHS[i];
          var t = ((el * 0.55) + i * 0.17) % 1;
          ci.setAttribute("cx", p.d[0][0] + (p.d[1][0] - p.d[0][0]) * t);
          ci.setAttribute("cy", p.d[0][1] + (p.d[1][1] - p.d[0][1]) * t);
          ci.setAttribute("opacity", String(Math.sin(t * Math.PI) * 0.9));
        });
      });
    }
  }

  /* ═══════════════════════════ KAPAK SAHNESİ ═════════════════════════════ */
  /* Konunun kendisi: dağınık istemciler → tek politika çekirdeği → servisler.
     Sol yaydan gelen istekler filtre halkalarından geçer; bir kısmı çekirdekte
     kesilir, geçenler sağ yaya dağılır. */
  function runCover() {
    var cv = $("#coverCv"); if (!cv) return;
    var CLIENTS = ["mobil", "web", "partner", "IoT", "batch"];
    var SERVICES = ["sipariş", "ödeme", "katalog", "kullanıcı", "stok", "bildirim"];
    var RINGS = ["TLS", "KİMLİK", "KOTA", "İZLEME"];
    var parts = [], last = 0, acc = 0, spin = 0, glow = 0, boot = 0, t0 = performance.now();

    function spawn() {
      var blocked = Math.random() < 0.22;
      parts.push({
        from: (Math.random() * CLIENTS.length) | 0,
        to: (Math.random() * SERVICES.length) | 0,
        p: 0, sp: 0.00040 + Math.random() * 0.00026,
        blocked: blocked, ring: 1 + ((Math.random() * 3) | 0),
        dead: 0, wob: Math.random() * 6.28
      });
      if (parts.length > 70) parts.shift();
    }
    if (reduce) { for (var i = 0; i < 22; i++) { spawn(); parts[i].p = Math.random(); } }

    /* Kapak canvas'ı CSS ile kare tutuluyor; style.height'a dokunmadan ölçekle. */
    function fitCover() {
      var d = Math.min(1.75, window.devicePixelRatio || 1);
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return null;
      var W = Math.round(w * d), H = Math.round(h * d);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      var c = cv.getContext("2d");
      c.setTransform(d, 0, 0, d, 0, 0);
      return { c: c, w: w, h: h };
    }

    loop(function (now) {
      var g = fitCover(); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      /* Giriş, kare sayısına değil geçen zamana bağlı: sekme arka plandayken
         rAF seyrekleşse bile sahne görünmez kalmaz. */
      boot = reduce ? 1 : Math.min(1, (now - t0) / 900);
      if (!reduce) {
        acc += dt; while (acc > 190) { acc -= 190; spawn(); }
        spin += dt * 0.00016;
        glow = Math.max(0, glow - dt * 0.0022);
      }

      var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.355;
      var coreR = R * 0.155;
      var ease = boot * boot * (3 - 2 * boot);   // smoothstep

      c.clearRect(0, 0, W, H);

      /* --- arka plan: soluk yörünge halkaları --- */
      for (var k = 0; k < 4; k++) {
        var rr0 = R * (0.52 + k * 0.18) * ease;
        c.beginPath(); c.arc(cx, cy, rr0, 0, Math.PI * 2);
        c.strokeStyle = "rgba(120,140,180," + (0.05 + k * 0.012) + ")";
        c.lineWidth = 1; c.stroke();
      }

      /* --- düğüm konumları --- */
      function nodePos(i, n, a0, a1) {
        var a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1));
        return { x: cx + Math.cos(a) * R * ease, y: cy + Math.sin(a) * R * ease, a: a };
      }
      var CA0 = Math.PI * 0.72, CA1 = Math.PI * 1.28;      // sol yay
      var SA0 = -Math.PI * 0.30, SA1 = Math.PI * 0.30;      // sağ yay

      /* --- bağlantı hatları --- */
      c.lineWidth = 1;
      CLIENTS.forEach(function (_, i) {
        var p = nodePos(i, CLIENTS.length, CA0, CA1);
        c.beginPath(); c.moveTo(p.x, p.y);
        c.quadraticCurveTo((p.x + cx) / 2, (p.y + cy) / 2 + (p.y - cy) * 0.12, cx, cy);
        c.strokeStyle = "rgba(91,140,255,.10)"; c.stroke();
      });
      SERVICES.forEach(function (_, i) {
        var p = nodePos(i, SERVICES.length, SA0, SA1);
        c.beginPath(); c.moveTo(cx, cy);
        c.quadraticCurveTo((p.x + cx) / 2, (p.y + cy) / 2 + (p.y - cy) * 0.12, p.x, p.y);
        c.strokeStyle = "rgba(56,225,200,.10)"; c.stroke();
      });

      /* --- filtre halkaları: dönen yay parçaları --- */
      RINGS.forEach(function (nm, k) {
        var rr1 = coreR + (R * 0.085) * (k + 1);
        var dir = k % 2 === 0 ? 1 : -1;
        var segs = 3 + k;
        for (var s = 0; s < segs; s++) {
          var a0 = spin * dir * (1 + k * 0.35) + s * (Math.PI * 2 / segs);
          var a1 = a0 + (Math.PI * 2 / segs) * 0.52;
          c.beginPath(); c.arc(cx, cy, rr1 * ease, a0, a1);
          var hot = glow > 0.25 && k <= 1;
          c.strokeStyle = hot ? "rgba(91,140,255,.55)" : "rgba(120,150,220,.22)";
          c.lineWidth = 2.2; c.stroke();
        }
      });

      /* --- çekirdek: politika kapısı --- */
      var pulse = 1 + glow * 0.10;
      var grd = c.createRadialGradient(cx, cy, coreR * 0.2, cx, cy, coreR * 3.1);
      grd.addColorStop(0, "rgba(91,140,255," + (0.28 + glow * 0.30) + ")");
      grd.addColorStop(0.45, "rgba(139,108,255,.10)");
      grd.addColorStop(1, "rgba(91,140,255,0)");
      c.fillStyle = grd;
      c.beginPath(); c.arc(cx, cy, coreR * 3.1 * ease, 0, Math.PI * 2); c.fill();

      /* altıgen kapı gövdesi */
      c.beginPath();
      for (var h = 0; h < 6; h++) {
        var ha = -Math.PI / 2 + h * Math.PI / 3 + spin * 0.6;
        var hx = cx + Math.cos(ha) * coreR * pulse * ease;
        var hy = cy + Math.sin(ha) * coreR * pulse * ease;
        h ? c.lineTo(hx, hy) : c.moveTo(hx, hy);
      }
      c.closePath();
      c.fillStyle = "rgba(10,14,22,.92)"; c.fill();
      c.strokeStyle = "rgba(91,140,255," + (0.65 + glow * 0.3) + ")"; c.lineWidth = 1.8; c.stroke();

      /* kapı içi diyafram çizgileri */
      c.save(); c.beginPath();
      for (var h2 = 0; h2 < 6; h2++) {
        var ha2 = -Math.PI / 2 + h2 * Math.PI / 3 + spin * 0.6;
        var hx2 = cx + Math.cos(ha2) * coreR * pulse * ease;
        var hy2 = cy + Math.sin(ha2) * coreR * pulse * ease;
        h2 ? c.lineTo(hx2, hy2) : c.moveTo(hx2, hy2);
      }
      c.closePath(); c.clip();
      for (var d2 = 0; d2 < 3; d2++) {
        var dy = cy - coreR * 0.45 + d2 * coreR * 0.45;
        c.beginPath(); c.moveTo(cx - coreR, dy); c.lineTo(cx + coreR, dy);
        c.strokeStyle = "rgba(56,225,200,.16)"; c.lineWidth = 1; c.stroke();
      }
      c.restore();

      /* --- düğümler --- */
      c.textAlign = "center";
      function drawNode(p, label, col, side) {
        c.beginPath(); c.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        c.fillStyle = col; c.globalAlpha = .95 * ease; c.fill();
        c.globalAlpha = .18 * ease;
        c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        if (ease > 0.75) {
          c.fillStyle = "rgba(169,178,198," + (0.62 * ease) + ")";
          c.font = "9.5px " + C.mono;
          c.textAlign = side < 0 ? "right" : "left";
          c.fillText(label, p.x + side * 11, p.y + 3.5);
        }
      }
      CLIENTS.forEach(function (n, i) { drawNode(nodePos(i, CLIENTS.length, CA0, CA1), n, "#5b8cff", -1); });
      SERVICES.forEach(function (n, i) { drawNode(nodePos(i, SERVICES.length, SA0, SA1), n, "#38e1c8", 1); });

      /* --- paketler --- */
      function bez(p0, p1, p2, t) {
        var m = 1 - t;
        return { x: m * m * p0.x + 2 * m * t * p1.x + t * t * p2.x,
                 y: m * m * p0.y + 2 * m * t * p1.y + t * t * p2.y };
      }
      for (var i2 = parts.length - 1; i2 >= 0; i2--) {
        var pt = parts[i2];
        if (!reduce) pt.p += pt.sp * dt;
        var src = nodePos(pt.from, CLIENTS.length, CA0, CA1);
        var dst = nodePos(pt.to, SERVICES.length, SA0, SA1);
        var ctr = { x: cx, y: cy };
        var blockR = coreR + (R * 0.085) * pt.ring;
        var stopT = 1 - (blockR / (R * ease || 1)) * 0.92;

        if (pt.blocked && pt.p >= stopT * 0.5 && !pt.dead) { pt.dead = 1; }
        if (pt.dead) {
          pt.dead += dt * 0.0042;
          if (pt.dead > 2.2) { parts.splice(i2, 1); continue; }
        } else if (pt.p > 1) { parts.splice(i2, 1); continue; }

        var pos;
        if (pt.p < 0.5) {
          var t1 = pt.p / 0.5;
          pos = bez(src, { x: (src.x + cx) / 2, y: (src.y + cy) / 2 + (src.y - cy) * 0.12 }, ctr, t1);
        } else {
          var t2 = (pt.p - 0.5) / 0.5;
          pos = bez(ctr, { x: (dst.x + cx) / 2, y: (dst.y + cy) / 2 + (dst.y - cy) * 0.12 }, dst, t2);
          if (t2 < 0.06) glow = 1;
        }
        /* hafif salınım — akış organik görünsün */
        var wob = Math.sin(now / 420 + pt.wob) * 1.6;

        if (pt.dead) {
          var a = Math.max(0, 1 - (pt.dead - 1) / 1.2);
          c.strokeStyle = "rgba(248,113,113," + a * 0.9 + ")"; c.lineWidth = 1.4;
          c.beginPath(); c.arc(pos.x, pos.y, 3 + (pt.dead - 1) * 11, 0, Math.PI * 2); c.stroke();
          c.fillStyle = "rgba(248,113,113," + a + ")";
          c.beginPath(); c.arc(pos.x, pos.y, 2.6, 0, Math.PI * 2); c.fill();
        } else {
          var inbound = pt.p < 0.5;
          var col = inbound ? "#5b8cff" : "#38e1c8";
          c.globalAlpha = .22;
          c.fillStyle = col;
          c.beginPath(); c.arc(pos.x + wob * 0.3, pos.y + wob, 6.5, 0, Math.PI * 2); c.fill();
          c.globalAlpha = 1;
          c.fillStyle = col;
          c.beginPath(); c.arc(pos.x + wob * 0.3, pos.y + wob, 2.7, 0, Math.PI * 2); c.fill();
        }
      }

      /* --- çekirdek etiketi --- */
      if (ease > 0.8) {
        c.textAlign = "center";
        c.fillStyle = "rgba(242,245,251," + (0.85 * ease) + ")";
        c.font = "700 10px " + C.mono;
        c.fillText("GATEWAY", cx, cy + coreR + R * 0.40);
        c.fillStyle = "rgba(107,116,136," + (0.7 * ease) + ")";
        c.font = "8.5px " + C.mono;
        c.fillText("TEK POLİTİKA NOKTASI", cx, cy + coreR + R * 0.40 + 12);
      }
      c.textAlign = "left";
    });
  }

  /* ═══════════════════════ SLAYT 30 · HA TOPOLOJİLERİ ════════════════════ */
  function runHa() {
    var cv = $("#haCv"); if (!cv) return;

    /* Dört topoloji aynı düğüm sayısını çalıştırır; fark yalnızca ARIZA
       anında görünür. Hücre ağırlıkları o birimden geçen trafik payıdır;
       "etkilenen trafik" bu ağırlıklardan hesaplanır. */
    var TOPO = [
      { n: "Tek paylaşılan filo", d: "1 filo · 9 düğüm", col: "#f87171",
        cells: [{ n: "tüm trafik", w: 100 }], per: 9,
        mech: "Tek yayım birimi = tek karar. Metrik kapısı ancak <b>her şey bozulduktan sonra</b> devreye girer." },
      { n: "Maruziyete göre ayrık", d: "3 filo · 9 düğüm", col: "#f0a15c",
        cells: [{ n: "iç", w: 15 }, { n: "ortak", w: 30 }, { n: "genel", w: 55 }], per: 3,
        mech: "İç filo ilk yayım hedefi olur; kapı burada tutarsa kamuya açık trafik hiç etkilenmez." },
      { n: "Alana göre ayrık", d: "4 alan · 8 düğüm", col: "#5b8cff",
        cells: [{ n: "arama", w: 15 }, { n: "katalog", w: 25 }, { n: "sipariş", w: 40 }, { n: "ödeme", w: 20 }], per: 2,
        mech: "Yayım alan alan ilerler. En küçük ve en az kritik alan (arama) ilk sıradadır." },
      { n: "Hücresel (cell-based)", d: "6 hücre · 12 düğüm", col: "#34d399",
        cells: [{ n: "h1", w: 17 }, { n: "h2", w: 17 }, { n: "h3", w: 17 }, { n: "h4", w: 17 }, { n: "h5", w: 16 }, { n: "h6", w: 16 }], per: 2,
        mech: "Kiracılar hücrelere sabitlenir. Hem yayım hem de zehirli istek tek hücrede kalır." }
    ];
    var AZ = ["a", "b", "c"];

    var SCEN = [
      { k: "ok", n: "Sağlıklı", ic: "i-check" },
      { k: "deploy", n: "Bozuk sürüm yayımla", ic: "i-rocket" },
      { k: "az", n: "Bir AZ düşür", ic: "i-globe" },
      { k: "poison", n: "Zehirli kiracı", ic: "i-flask" }
    ];

    var scen = "ok", playing = true, last = 0, t = 0, pulse = 0;
    var nodes = [];      /* nodes[ti][ci] = [ {az, ver, state} ... ] */

    function build() {
      nodes = TOPO.map(function (tp) {
        var g = 0;
        return tp.cells.map(function () {
          var arr = [];
          for (var i = 0; i < tp.per; i++) { arr.push({ az: AZ[g % 3], ver: 1, state: "ok", load: 1 }); g++; }
          return arr;
        });
      });
    }
    function reset() { build(); t = 0; }
    build();

    $("#haScen").innerHTML = SCEN.map(function (s, i) {
      return '<button class="pill' + (i === 0 ? " on" : "") + '" data-k="' + s.k + '">' +
        '<svg><use href="#' + s.ic + '"/></svg>' + s.n + "</button>";
    }).join("");
    ev($("#haScen"), "click", function (e) {
      var b = e.target.closest(".pill"); if (!b) return;
      scen = b.dataset.k; reset();
      $$("#haScen .pill").forEach(function (p) { p.classList.toggle("on", p === b); });
    });
    var pb = $("#haPlay");
    function sync() {
      pb.innerHTML = playing ? '<svg><use href="#i-pause"/></svg> Duraklat'
        : '<svg><use href="#i-play"/></svg> Devam et';
    }
    sync();
    ev(pb, "click", function () { playing = !playing; sync(); });
    ev($("#haReset"), "click", reset);

    /* ── senaryo motoru ─────────────────────────────────────────────────── */
    var STEP = 620;   /* yayımda düğüm başına süre */
    function apply(ti) {
      var tp = TOPO[ti], N = nodes[ti];
      var gated = false, deployed = 0;
      N.forEach(function (cell) { cell.forEach(function (n) { n.state = "ok"; n.ver = 1; n.load = 1; }); });

      if (scen === "deploy") {
        /* Yayım hücre hücre, hücre içinde düğüm düğüm ilerler. Bir hücre
           tamamlandığında metrik kapısı bozulmayı görür ve yayım DURUR. */
        var steps = Math.floor(t / STEP), used = 0;
        for (var ci = 0; ci < N.length && !gated; ci++) {
          for (var ni = 0; ni < N[ci].length; ni++) {
            if (used < steps) { N[ci][ni].ver = 2; N[ci][ni].state = "bad"; deployed++; }
            used++;
          }
          /* hücre tamamlandıysa kapı devreye girer */
          if (steps >= used) gated = true;
        }
      } else if (scen === "az") {
        N.forEach(function (cell) {
          if (t > 400) cell.forEach(function (n) { if (n.az === "a") n.state = "down"; });
          var alive = cell.filter(function (n) { return n.state !== "down"; });
          var f = alive.length ? cell.length / alive.length : Infinity;
          alive.forEach(function (n) {
            n.load = f;
            if (f > 1.9) n.state = "over";
          });
        });
      } else if (scen === "poison") {
        /* Zehirli kiracı, hizmet aldığı BİR hücreyi doyurur. */
        if (t > 400) {
          var pick2 = TOPO[ti].cells.length === 1 ? 0 : 2 % N.length;
          N[pick2].forEach(function (n) { n.state = "over"; n.load = 3.4; });
        }
      }
      return { gated: gated, deployed: deployed };
    }

    function impact(ti) {
      var tp = TOPO[ti], N = nodes[ti], aff = 0, up = 0, tot = 0;
      N.forEach(function (cell, ci) {
        var bad = cell.filter(function (n) { return n.state === "bad" || n.state === "over" || n.state === "down"; }).length;
        var down = cell.filter(function (n) { return n.state === "down"; }).length;
        aff += tp.cells[ci].w * (bad / cell.length);
        tot += cell.length; up += cell.length - down -
          cell.filter(function (n) { return n.state === "over"; }).length;
      });
      return { aff: Math.round(aff), cap: tot ? Math.round(up / tot * 100) : 100 };
    }

    loop(function (now) {
      var dt = last ? Math.min(60, now - last) : 16; last = now;
      if (playing && !reduce) { pulse += dt; if (scen !== "ok") t += dt; }

      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);

      var colW = W / TOPO.length;
      var hdr = 42, footer = 62, top = hdr, bot = H - footer;
      var res = [], imp = [];

      TOPO.forEach(function (tp, ti) {
        res.push(apply(ti));
        imp.push(impact(ti));
      });

      TOPO.forEach(function (tp, ti) {
        var x0 = ti * colW;
        if (ti > 0) {
          c.strokeStyle = C.line; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x0, 22); c.lineTo(x0, H - 8); c.stroke();
        }
        c.textAlign = "center";
        c.fillStyle = C.t1; c.font = "600 12.5px " + C.sans;
        c.fillText(tp.n, x0 + colW / 2, 16);
        c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
        c.fillText(tp.d, x0 + colW / 2, 30);

        var nC = tp.cells.length;
        var gapC = 5, cw = (colW - 20 - gapC * (nC - 1)) / nC;
        for (var ci = 0; ci < nC; ci++) {
          var cx = x0 + 10 + ci * (cw + gapC);
          var cell = nodes[ti][ci];
          var cellBad = cell.some(function (n) { return n.state !== "ok"; });
          var first = scen === "deploy" && ci === 0;

          c.fillStyle = cellBad ? "rgba(248,113,113,.07)" : "rgba(255,255,255,.02)";
          c.strokeStyle = cellBad ? "rgba(248,113,113,.42)" : first ? "rgba(91,140,255,.45)" : C.line;
          c.lineWidth = 1;
          if (first) c.setLineDash([4, 3]);
          rr(c, cx, top, cw, bot - top, 6); c.fill(); c.stroke(); c.setLineDash([]);

          /* hücre başlığı: ad + trafik payı */
          c.font = "9px " + C.mono; c.textAlign = "left";
          c.fillStyle = cellBad ? C.danger : C.t2;
          c.fillText(tp.cells[ci].n, cx + 6, top + 13);
          c.textAlign = "right"; c.fillStyle = C.t3;
          c.fillText("%" + tp.cells[ci].w, cx + cw - 6, top + 13);
          c.textAlign = "left";

          /* düğümler */
          var nn = cell.length, cols = nn > 4 ? 2 : 1;
          var rowsN = Math.ceil(nn / cols);
          var iw = (cw - 12 - (cols - 1) * 4) / cols;
          var avail = bot - top - 30;
          var ih = Math.max(18, Math.min(46, (avail - (rowsN - 1) * 4) / rowsN));
          /* Düğüm yığınını hücre içinde dikey olarak ortala: boş alan kalmasın. */
          var y0 = top + 22 + Math.max(0, (avail - (rowsN * ih + (rowsN - 1) * 4)) / 2);
          for (var ni = 0; ni < nn; ni++) {
            var n = cell[ni];
            var nx = cx + 6 + (ni % cols) * (iw + 4);
            var ny = y0 + Math.floor(ni / cols) * (ih + 4);
            var col = n.state === "bad" ? C.danger : n.state === "over" ? C.amber
              : n.state === "down" ? "#3a4353" : n.ver === 2 ? C.acc : C.good;
            c.globalAlpha = n.state === "down" ? 0.5
              : n.state === "ok" ? (0.78 + 0.22 * Math.abs(Math.sin((pulse + ni * 260 + ci * 480) / 950))) : 1;
            c.fillStyle = col + "2b"; c.strokeStyle = col; c.lineWidth = 1.2;
            rr(c, nx, ny, iw, ih, 4); c.fill(); c.stroke();
            c.globalAlpha = 1;
            /* AZ etiketi */
            c.font = "8px " + C.mono; c.fillStyle = n.state === "down" ? "#5a6474" : col;
            c.textAlign = "left"; c.fillText(n.az, nx + 4, ny + ih / 2 + 3);
            /* sürüm ya da yük */
            c.textAlign = "right";
            if (scen === "deploy") c.fillText("v" + n.ver, nx + iw - 4, ny + ih / 2 + 3);
            else if (n.state === "down") c.fillText("×", nx + iw - 4, ny + ih / 2 + 3);
            else c.fillText(n.load.toFixed(1) + "×", nx + iw - 4, ny + ih / 2 + 3);
            c.textAlign = "left";
          }

          /* kapı işareti: yayım burada durdu */
          if (scen === "deploy" && res[ti].gated && ci === 0 && t > STEP * cell.length) {
            c.fillStyle = C.warn; c.font = "8.5px " + C.mono; c.textAlign = "center";
            c.fillText("⛔ kapı", cx + cw / 2, bot - 5); c.textAlign = "left";
          }
        }

        /* alt ölçerler */
        var I = imp[ti];
        c.textAlign = "center";
        var acol = I.aff === 0 ? C.good : I.aff <= 25 ? C.warn : C.danger;
        c.fillStyle = acol; c.font = "700 17px " + C.mono;
        c.fillText("%" + I.aff, x0 + colW / 2, bot + 24);
        c.fillStyle = C.t3; c.font = "9px " + C.mono;
        c.fillText("ETKİLENEN TRAFİK", x0 + colW / 2, bot + 36);
        c.fillStyle = I.cap === 100 ? C.good : I.cap >= 66 ? C.warn : C.danger;
        c.font = "10px " + C.mono;
        c.fillText("ayakta kapasite %" + I.cap, x0 + colW / 2, bot + 52);
        c.textAlign = "left";
      });

      /* olay zaman çizgisi — en altta, sütun başlıklarına karışmasın */
      if (scen !== "ok") {
        var tw2 = W - 24, tx2 = 12, tyy = H - 4;
        var span = 9000, pp = Math.min(1, t / span);
        c.fillStyle = C.s3; rr(c, tx2, tyy, tw2, 3, 2); c.fill();
        c.fillStyle = scen === "deploy" ? C.acc : C.danger;
        rr(c, tx2, tyy, Math.max(2, tw2 * pp), 3, 2); c.fill();
      }

      /* ── açıklama ── */
      var st = $("#haStat"), nt = $("#haNote").querySelector("div");
      function badge(txt, col) {
        if (st) st.innerHTML = '<span style="font-family:' + C.mono + ";color:" + col + '">' + txt + "</span>";
      }
      if (scen === "ok") {
        badge("tüm topolojiler sağlıklı", C.good);
        nt.innerHTML = "<b>Sağlıklı durum.</b> Dört topoloji de aynı sayıda düğüm çalıştırıyor ve dışarıdan " +
          "bakıldığında aralarında hiçbir fark yok — etkilenen trafik <b>%0</b>, kapasite <b>%100</b>. " +
          "Topoloji seçiminin bedeli normal işleyişte değil, <b>arıza anında</b> ortaya çıkar. " +
          "Yukarıdaki üç senaryoyu tek tek çalıştırıp aynı olayın dört farklı sonucunu karşılaştırın. " +
          "Her düğümün üzerindeki harf bulunduğu <b>erişilebilirlik bölgesini</b>, sağdaki değer ise " +
          "<b>taşıdığı yük katsayısını</b> gösterir.";
      } else if (scen === "deploy") {
        badge("bozuk sürüm yayımı: v2 ilerliyor", C.danger);
        nt.innerHTML = "<b>Bozuk sürüm senaryosu.</b> Hatalı bir binary ya da yapılandırma yayımlanıyor. Yayım " +
          "en küçük birimden (kesikli çerçeveli hücre) başlayıp düğüm düğüm ilerliyor; o birim tamamlandığında " +
          "metrik kapısı bozulmayı görüyor ve yayım <b>duruyor</b> (⛔). Tek belirleyici şudur: " +
          "<b>en küçük yayım biriminiz ne kadar küçük?</b> Tek filoda o birim trafiğin tamamıdır — kapı ancak " +
          "<b>%100</b> etkilendikten sonra devreye girer. Maruziyete göre ayrıkta iç filo <b>%15</b>, alan " +
          "bazlıda en küçük alan <b>%15</b>, hücresel dağıtımda tek hücre <b>%17</b>'de durur. " +
          "Blast radius'u küçülten şey daha iyi izleme değil, <b>daha küçük yayım birimidir</b>; hücre sayısını " +
          "artırmak bu oranı istediğiniz kadar aşağı çekebilen tek kaldıraçtır.";
      } else if (scen === "az") {
        badge("erişilebilirlik bölgesi 'a' kaybedildi", C.warn);
        nt.innerHTML = "<b>Altyapı arızası senaryosu — ve senaryonun tersine dönen dersi.</b> Bir erişilebilirlik " +
          "bölgesi tamamen kaybedildi; <span class='chip-mono'>a</span> etiketli her düğüm düştü. " +
          "<b>Kaybedilen düğüm oranı dört topolojide de aynı: ~%33</b> — çünkü düğümler bölgelere eşit " +
          "yayılmış (<span class='chip-mono'>topologySpreadConstraints</span>). Ama <b>etkilenen trafik aynı değil</b>: " +
          "kalan düğümler ölenlerin yükünü de devralır. Dokuz düğümlü tek filoda kalanlar <b>1.5 kat</b> yüke " +
          "çıkar ve ayakta kalır; hücre başına yalnızca <b>2 düğüm</b> olan modellerde hayatta kalan düğüm " +
          "<b>2 kat</b> yük taşır, doyar (turuncu) ve o hücrenin trafiği fiilen bozulur — etki <b>%60'ın</b> " +
          "üzerine çıkar. Yani <b>küçük hücreler yayım blast radius'unu küçültürken AZ kaybına karşı " +
          "kırılganlaşır</b>. Doğru sonuç \"hücrelerden vazgeçmek\" değil: <b>N+2 kuralını filo başına değil " +
          "hücre başına</b> uygulamaktır — 2 düğümlü hücre en iyi hâlde N+1'dir.";
      } else {
        badge("zehirli kiracı tek hücreyi doyurdu", C.amber);
        nt.innerHTML = "<b>Zehirli kiracı senaryosu.</b> Tek bir müşteri beklenmedik bir sorgu şekli veya retry " +
          "fırtınasıyla hizmet aldığı birimi doyuruyor. Kod hatasız, altyapı sağlam — sorun <b>iş yükünün kendisi</b>. " +
          "Tek filoda bu kiracı <b>bütün müşterileri</b> etkiler (gürültücü komşu). Hücresel dağıtımda kiracılar " +
          "hücrelere sabitlendiği için etki <b>o hücrenin müşterileriyle sınırlı</b> kalır ve diğer hücreler " +
          "olayı hiç fark etmez. Hücresel mimarinin asıl gerekçesi budur: <b>kod değil, iş yükü izolasyonu</b>.";
      }
    });
  }

  /* ═══════════════════ SLAYT 27 · YÜKLEME DESENLERİ ══════════════════════ */
  function runUpload() {
    var cv = $("#upCv"); if (!cv) return;
    var nEl = $("#upN"), pb = $("#upPlay");
    var n = +nEl.value, playing = false, t = 0, last = 0;
    ev(nEl, "input", function () { n = +nEl.value; $("#upNL").textContent = n; });
    ev(pb, "click", function () {
      playing = !playing; if (playing) t = 0;
      pb.innerHTML = playing ? '<svg><use href="#i-pause"/></svg> Durdur' : '<svg><use href="#i-play"/></svg> Yüklemeyi başlat';
    });
    $("#upNL").textContent = n;

    loop(function (now) {
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      if (playing && !reduce) { t += dt; if (t > 9000) t = 0; }
      var prog = Math.min(1, t / 8000);

      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      c.clearRect(0, 0, W, H);
      var half = H / 2;

      function lane(y0, y1, title, sub, col, viaGw) {
        var cy = (y0 + y1) / 2;
        c.textAlign = "left"; c.fillStyle = C.t1; c.font = "600 12px " + C.sans;
        c.fillText(title, 10, y0 + 15);
        c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
        c.fillText(sub, 10, y0 + 28);

        var cx = 150, gx = W * 0.46, sx = W - 118;
        /* düğümler */
        function boxN(x, w, label, colr) {
          c.fillStyle = "rgba(255,255,255,.03)"; c.strokeStyle = colr; c.lineWidth = 1.3;
          rr(c, x, cy - 15, w, 30, 6); c.fill(); c.stroke();
          c.fillStyle = colr; c.font = "10.5px " + C.mono; c.textAlign = "center";
          c.fillText(label, x + w / 2, cy + 4);
        }
        boxN(cx - 52, 88, "istemci", C.t3);
        boxN(gx - 44, 88, "gateway", viaGw ? C.danger : C.t3);
        boxN(sx - 40, 100, "nesne deposu", C.acc2);

        /* akış */
        c.lineWidth = viaGw ? 2.2 : 2.6;
        if (viaGw) {
          c.strokeStyle = "rgba(248,113,113,.35)";
          c.beginPath(); c.moveTo(cx + 36, cy); c.lineTo(gx - 44, cy); c.stroke();
          c.beginPath(); c.moveTo(gx + 44, cy); c.lineTo(sx - 40, cy); c.stroke();
        } else {
          c.strokeStyle = "rgba(52,211,153,.30)"; c.setLineDash([4, 4]);
          c.beginPath(); c.moveTo(cx + 36, cy - 9); c.lineTo(gx - 44, cy - 9); c.stroke();
          c.setLineDash([]);
          c.strokeStyle = "rgba(52,211,153,.45)";
          c.beginPath(); c.moveTo(cx + 36, cy + 10); c.bezierCurveTo(gx, cy + 34, gx + 60, cy + 34, sx - 40, cy + 10); c.stroke();
        }

        /* akan parçacıklar */
        if (playing) {
          for (var k = 0; k < n; k++) {
            var ph = ((t / 1400) + k / Math.max(1, n)) % 1;
            if (viaGw) {
              var xx, yy = cy;
              if (ph < 0.45) { xx = (cx + 36) + ((gx - 44) - (cx + 36)) * (ph / 0.45); }
              else { xx = (gx + 44) + ((sx - 40) - (gx + 44)) * ((ph - 0.45) / 0.55); }
              c.fillStyle = C.danger;
              c.beginPath(); c.arc(xx, yy, 3, 0, Math.PI * 2); c.fill();
            } else {
              var u = ph, mt = 1 - u;
              var x0b = cx + 36, y0b = cy + 10, x1 = gx, y1 = cy + 34, x2 = gx + 60, y2 = cy + 34, x3 = sx - 40, y3 = cy + 10;
              var xx2 = mt * mt * mt * x0b + 3 * mt * mt * u * x1 + 3 * mt * u * u * x2 + u * u * u * x3;
              var yy2 = mt * mt * mt * y0b + 3 * mt * mt * u * y1 + 3 * mt * u * u * y2 + u * u * u * y3;
              c.fillStyle = C.good;
              c.beginPath(); c.arc(xx2, yy2, 3, 0, Math.PI * 2); c.fill();
            }
          }
        }

        /* gateway yükü göstergesi */
        var memMB = viaGw ? Math.round(n * 500 * prog) : Math.round(n * 0.002 * 1000) / 1000;
        var conns = viaGw ? n : 0;
        c.textAlign = "left";
        c.fillStyle = viaGw ? C.danger : C.good; c.font = "700 12px " + C.mono;
        c.fillText(viaGw ? (memMB + " MB tampon") : "~0 MB tampon", gx - 44, y1 - 16);
        c.fillStyle = C.t3; c.font = "9px " + C.mono;
        c.fillText(conns + " uzun ömürlü bağlantı", gx - 44, y1 - 5);
      }

      lane(4, half - 4, "1 · Gateway üzerinden", "dosya gateway belleğinden geçer", C.danger, true);
      c.strokeStyle = C.line; c.beginPath(); c.moveTo(0, half); c.lineTo(W, half); c.stroke();
      lane(half + 4, H - 4, "2 · Ön imzalı URL ile doğrudan", "gateway yalnızca yetki verir, yolun dışındadır", C.good, false);

      var st = $("#upStat"), nt = $("#upNote").querySelector("div");
      if (st) st.innerHTML = '<span style="font-family:' + C.mono + '">gateway tamponu: <b style="color:' + C.danger + '">' +
        Math.round(n * 500 * prog) + ' MB</b> &nbsp;vs&nbsp; <b style="color:' + C.good + '">~0 MB</b></span>';
      if (!playing) {
        nt.innerHTML = "<b>Yüklemeyi başlatın.</b> Aynı 500 MB'lık dosya iki desenle taşınıyor. Eşzamanlı yükleme " +
          "sayısını artırdıkça iki desen arasındaki fark doğrusal olarak büyür.";
      } else if (n <= 4) {
        nt.innerHTML = "<b>Az sayıda yüklemede fark yönetilebilir görünür.</b> " + n + " eşzamanlı yükleme gateway'de " +
          Math.round(n * 500 * prog) + " MB tampon ve " + n + " uzun ömürlü bağlantı tutar. Sorun burada değil, " +
          "<b>ölçeklenmede</b>: bu sayı trafikle birlikte artar ve gateway'in belleği isteğe göre değil " +
          "<b>dosya boyutuna</b> göre büyür.";
      } else {
        nt.innerHTML = "<b>Ölçek problemi görünür oldu.</b> " + n + " eşzamanlı yükleme gateway'de yaklaşık " +
          Math.round(n * 500 * prog) + " MB tampon demektir — ve bu bellek <b>diğer tüm rotalardan</b> çalınır. " +
          "Ön imzalı URL deseninde gateway yalnızca kısa bir yetkilendirme çağrısı yapar; dosya hiç ona uğramaz. " +
          "Gateway sabit bellekle çalışır, boyut sınırı depoya taşınır ve <b>ağır işlem senkron istek yolundan çıkar</b>.";
      }
    });
  }

  /* ------------------------------------------------------------- başlangıç - */
  var m = /^#s(\d+)$/.exec(window.location.hash);
  var start = m ? Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1)) : 0;
  slides[0].classList.add("active");
  go(start);
})();
