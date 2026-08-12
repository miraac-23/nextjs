/* ============================================================================
   Trafik Polisi Operasyon ve Takip Sistemi — Sunum motoru

   Slayt gezinme, aşama ilerleyişi, animasyonlu sayaçlar ve on canlı
   görselleştirme (vardiya kaosu, istek yolu, operasyon panosu, bölüm eleme,
   indeks yarışı, görevlendirme yarış koşulu, kilit sırası, SSE dağıtımı,
   Kafka tamponu, virtual thread, idempotency, token bucket).
   Bağımlılık yok, tamamen offline çalışır.
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

  var STAGE_NAMES = { "0": "GİRİŞ", "1": "AŞAMA 1 · OPERASYON", "2": "AŞAMA 2 · MİMARİ",
                      "3": "AŞAMA 3 · DOĞRULUK", "4": "AŞAMA 4 · ÖLÇEK" };
  var LV = { "0": "#a8b1c5", "1": "#ffb545", "2": "#4f8dff", "3": "#a78bfa", "4": "#2ed3b7" };

  elTot.textContent = String(total);

  /* ---------------------------------------------------------- zamanlayıcı -- */
  var timers = [], rafs = [], killers = [];
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers.length = 0;
    rafs.forEach(function (r) { cancelAnimationFrame(r); });
    rafs.length = 0;
    /* rAF döngülerini gerçekten durdur — yalnızca kuyruktaki kareyi iptal etmek
       yetmez, döngü kendini yeniden kuyruğa alır. */
    killers.forEach(function (k) { k(); });
    killers.length = 0;
  }
  /* Slayt yeniden girildiğinde çalıştırıcı yeni yerel durum yaratır. Bir kez
     eklenmiş dinleyici ESKİ kapanışa bağlı kalır ve düğmeler sessizce ölür.
     ev() dinleyiciyi ekler ve slayt değişiminde kaldırır; her girişte taze ve
     doğru duruma bağlı yeniden kurulur. */
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
          vio: css("--violet"), teal: css("--teal"), good: css("--good"), warn: css("--warn"),
          danger: css("--danger"), canvas: "#05070b",
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
      /* Yükseklik CSS'ten geliyor — style.height'a dokunma, yoksa duyarlılık kaybolur. */
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
    var c = i18nCtx(cv.getContext("2d"));
    c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, w: w, h: hh };
  }
  /* Yüksekliği tamamen CSS'e bırakılmış canvas'lar (kapak, pano maketi) için. */
  function fitFree(cv) {
    var d = Math.min(1.75, window.devicePixelRatio || 1);
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return null;
    var W = Math.round(w * d), H = Math.round(h * d);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var c = i18nCtx(cv.getContext("2d"));
    c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, w: w, h: h };
  }
  /* Canvas metinleri DOM'da olmadığı için /deck-i18n.js taramasına yakalanmaz.
     Her sahnede tek tek sarmak yerine çizim bağlamının fillText'i BİR KEZ
     sarılır: sahnedeki her etiket yazılmadan önce sözlükten geçer.
     Değişken içeren etiketler `{0}` şablonuyla yazılır (bkz. tpl). */
  function i18nCtx(c) {
    if (c.__i18n) return c;
    var orig = c.fillText.bind(c);
    c.fillText = function (str, x, y, maxWidth) {
      return orig(tpl(String(str)), x, y, maxWidth);
    };
    c.__i18n = true;
    return c;
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function nf(n) { return n.toLocaleString("tr-TR"); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* Sabit tohumlu sözde rastgele: her açılışta aynı sahne çizilir, sunum
     tekrar edilebilir olur. */
  function rnd(seed) {
    var s = seed;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }

  /* --------------------------------------------------------------- dil ---- */
  /* Çalışma anında üretilen metinler (demo notları, durum rozetleri, düğme
     etiketleri) statik HTML'de bulunmadığı için /deck-i18n.js taramasına
     yakalanmaz. tpl() bunları yazarken çevirir.

     İçinde değişken geçen cümleler `{0}` yer tutucusuyla yazılır: sözlükte
     ŞABLON aranır, değerler çeviriden SONRA yerleştirilir. Aksi hâlde anahtar
     sayıya göre her seferinde değişir ve hiçbir zaman eşleşmez. */
  function tpl(str) {
    var args = Array.prototype.slice.call(arguments, 1);
    var out = String(str == null ? "" : str);
    var dict = window.DECK_EN;
    if (dict && window.DeckI18n && window.DeckI18n.lang === "en") {
      var hit = dict[window.DeckI18n.norm(out.replace(/<[^>]*>/g, ""))];
      if (hit != null) out = hit;
    }
    return out.replace(/\{(\d+)\}/g, function (m, i) { return args[+i]; });
  }

  /* ------------------------------------------------------------ noktalar --- */
  slides.forEach(function (s, i) {
    var d = document.createElement("div");
    d.className = "dot" + (i === 0 ? " on" : "");
    d.dataset.l = s.dataset.lv || "0";
    d.title = (i + 1) + " · " + tpl(s.dataset.title || "");
    d.addEventListener("click", function () { go(i); });
    elDots.appendChild(d);
  });
  var dots = Array.prototype.slice.call(elDots.children);

  /* aşama şeridi — üstteki ilerleme çubuğunun altında aşama haritası */
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
    elStageName.textContent = tpl(STAGE_NAMES[lv]);
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
                    '<span class="ov-name">' + tpl(s.dataset.title || "Slayt") + '</span>';
      c.addEventListener("click", function () { closeOv(); go(i); });
      ovGrid.appendChild(c);
    });
    ovCount.textContent = tpl("{0} slayt · 4 aşama", total);
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
    if (id === "slide-cover") runCover();
    else if (id === "slide-journey") runJourney();
    else if (id === "slide-problem") runProblem();
    else if (id === "slide-flow") runFlow();
    else if (id === "slide-screen") runScreen();
    else if (id === "slide-pkg") runPkg();
    else if (id === "slide-part") runPart();
    else if (id === "slide-index") runIndex();
    else if (id === "slide-race") runRace();
    else if (id === "slide-defense") runDefense();
    else if (id === "slide-security") runSecurity();
    else if (id === "slide-sse") runSse();
    else if (id === "slide-kafka") runKafka();
    else if (id === "slide-vt") runVt();
    else if (id === "slide-idem") runIdem();
    else if (id === "slide-rl") runRl();
    else if (id === "slide-recap") runRecap();
  }

  /* ═══════════════════════════ KAPAK ═══════════════════════════════════════
     Şehir ızgarası üzerinde dağınık duran ekipler; periyodik olarak bir olay
     doğuyor ve en yakın üç ekip oraya yöneliyor. Sistemin tek cümlelik özeti. */
  function runCover() {
    var cv = $("#coverCv"); if (!cv) return;
    var R = rnd(20260812);
    var units = [], events = [], t0 = performance.now(), last = 0, acc = 0;

    for (var i = 0; i < 22; i++) {
      units.push({
        x: 0.1 + R() * 0.8, y: 0.1 + R() * 0.8,
        tx: 0.1 + R() * 0.8, ty: 0.1 + R() * 0.8,
        sp: 0.00006 + R() * 0.00009, busy: 0, ph: R() * 6.28
      });
    }
    function spawnEvent() {
      var e = { x: 0.18 + R() * 0.64, y: 0.18 + R() * 0.64, born: performance.now(), crit: R() < 0.3 };
      events.push(e);
      if (events.length > 3) events.shift();
      /* En yakın iki müsait ekibi olaya yönlendir — sistemin yaptığı işin özeti. */
      var free = units.filter(function (u) { return !u.busy; })
        .sort(function (a, b) {
          return (Math.pow(a.x - e.x, 2) + Math.pow(a.y - e.y, 2)) -
                 (Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
        });
      free.slice(0, 2).forEach(function (u) { u.busy = 1; u.tx = e.x; u.ty = e.y; u.ev = e; });
    }

    function fitCover() {
      var d = Math.min(1.75, window.devicePixelRatio || 1);
      var w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return null;
      var W = Math.round(w * d), H = Math.round(h * d);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      var c = i18nCtx(cv.getContext("2d"));
      c.setTransform(d, 0, 0, d, 0, 0);
      return { c: c, w: w, h: h };
    }

    loop(function (now) {
      var g = fitCover(); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      var boot = reduce ? 1 : Math.min(1, (now - t0) / 900);

      if (!reduce) { acc += dt; if (acc > 2600) { acc = 0; spawnEvent(); } }
      else if (!events.length) spawnEvent();

      c.clearRect(0, 0, W, H);

      /* şehir ızgarası */
      c.save();
      c.globalAlpha = 0.5 * boot;
      c.strokeStyle = "rgba(255,255,255,.045)";
      c.lineWidth = 1;
      for (var k = 1; k < 9; k++) {
        c.beginPath(); c.moveTo(W * k / 9, 0); c.lineTo(W * k / 9, H); c.stroke();
        c.beginPath(); c.moveTo(0, H * k / 9); c.lineTo(W, H * k / 9); c.stroke();
      }
      /* iki ana arter */
      c.strokeStyle = "rgba(255,255,255,.09)"; c.lineWidth = 6;
      c.beginPath(); c.moveTo(0, H * 0.62); c.lineTo(W, H * 0.38); c.stroke();
      c.beginPath(); c.moveTo(W * 0.34, 0); c.lineTo(W * 0.52, H); c.stroke();
      c.restore();

      /* radar süpürmesi — merkezden dönen ışık konisi */
      if (!reduce) {
        var ang = (now / 3600) % 1 * Math.PI * 2;
        var gr = c.createConicGradient ? null : null;
        c.save();
        c.globalAlpha = 0.16 * boot;
        c.translate(W / 2, H / 2);
        c.rotate(ang);
        var rad = Math.min(W, H) * 0.5;
        var lg = c.createLinearGradient(0, 0, rad, 0);
        lg.addColorStop(0, "rgba(79,141,255,.55)");
        lg.addColorStop(1, "rgba(79,141,255,0)");
        c.fillStyle = lg;
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, rad, -0.32, 0); c.closePath(); c.fill();
        c.restore();
      }

      /* olaylar */
      events.forEach(function (e) {
        var age = (now - e.born) / 1000;
        var col = e.crit ? C.danger : C.acc2;
        var pr = (age % 1.6) / 1.6;
        c.save();
        c.globalAlpha = (1 - pr) * 0.5 * boot;
        c.strokeStyle = col; c.lineWidth = 2;
        c.beginPath(); c.arc(e.x * W, e.y * H, 10 + pr * 42, 0, Math.PI * 2); c.stroke();
        c.restore();
        c.globalAlpha = boot;
        c.fillStyle = col;
        c.beginPath(); c.arc(e.x * W, e.y * H, 6, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      });

      /* ekipler */
      units.forEach(function (u) {
        if (!reduce) {
          var dx = u.tx - u.x, dy = u.ty - u.y;
          var d2 = Math.sqrt(dx * dx + dy * dy);
          var sp = u.busy ? u.sp * 2.1 : u.sp;
          if (d2 < 0.012) {
            if (u.busy) {
              /* olaya vardı; kısa süre kalıp yeniden devriyeye çıkar */
              if (!u.hold) u.hold = now;
              if (now - u.hold > 2200) { u.busy = 0; u.hold = 0; u.ev = null; u.tx = 0.1 + R() * 0.8; u.ty = 0.1 + R() * 0.8; }
            } else { u.tx = 0.1 + R() * 0.8; u.ty = 0.1 + R() * 0.8; }
          } else { u.x += dx / d2 * sp * dt; u.y += dy / d2 * sp * dt; }
        }
        var x = u.x * W, y = u.y * H;
        var col = u.busy ? C.acc : C.good;
        /* iz */
        c.globalAlpha = 0.28 * boot;
        c.strokeStyle = col; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(x, y); c.lineTo(u.tx * W, u.ty * H); c.stroke();
        /* nokta + hale */
        c.globalAlpha = 0.22 * boot;
        c.fillStyle = col;
        c.beginPath(); c.arc(x, y, 9 + Math.sin(now / 700 + u.ph) * 1.6, 0, Math.PI * 2); c.fill();
        c.globalAlpha = boot;
        c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      });
    });
  }

  /* ═══════════════════════════ YOLCULUK RAYI ══════════════════════════════ */
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

  /* ═══════════════════════════ PROBLEM · VARDİYA ══════════════════════════
     Solda olaylar birikiyor, sağda ekipler duruyor. Görevlendirme rastgele
     yapılıyor: bazı ekipler iki olaya birden gidiyor, bazı olaylar bekliyor. */
  function runProblem() {
    var cv = $("#dispatchCv"); if (!cv) return;
    var badge = $("#probBad");
    var R = rnd(77003);
    var evs = [], units = [], links = [], errs = 0, acc = 0, last = 0, t0 = performance.now();

    for (var i = 0; i < 10; i++) units.push({ i: i, load: 0, flash: 0 });

    function step() {
      /* yeni olay */
      evs.push({ born: performance.now(), assigned: -1, wait: 0 });
      if (evs.length > 7) evs.shift();
      /* operatör tahminle atıyor: müsaitlik bilgisi yok */
      var pick = (R() * units.length) | 0;
      var e = evs[evs.length - 1];
      e.assigned = pick;
      units[pick].load++;
      units[pick].flash = 1;
      links.push({ e: e, u: pick, born: performance.now(), bad: units[pick].load > 1 });
      if (links.length > 7) links.shift();
      if (units[pick].load > 1) { errs++; badge.textContent = tpl("{0} hatalı görevlendirme", errs); }
      /* ekipler zamanla serbest kalır */
      if (R() < 0.5) { var f = (R() * units.length) | 0; units[f].load = Math.max(0, units[f].load - 1); }
    }
    if (reduce) { for (var q = 0; q < 6; q++) step(); }

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      var boot = reduce ? 1 : Math.min(1, (now - t0) / 700);
      if (!reduce) { acc += dt; if (acc > 1250) { acc = 0; step(); } }

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var padT = 34, colL = W * 0.22, colR = W * 0.78;

      c.font = "700 11px " + C.mono; c.textAlign = "center";
      c.fillStyle = C.t3;
      c.fillText("GELEN OLAYLAR", colL, 20);
      c.fillText("SAHADAKİ EKİPLER", colR, 20);

      /* bağlantı çizgileri */
      links.forEach(function (l) {
        var ei = evs.indexOf(l.e); if (ei < 0) return;
        var ey = padT + ei * ((H - padT - 16) / Math.max(1, evs.length)) + 16;
        var uy = padT + l.u * ((H - padT - 16) / units.length) + 12;
        var age = Math.min(1, (now - l.born) / 420);
        c.save();
        c.globalAlpha = 0.75 * boot;
        c.strokeStyle = l.bad ? C.danger : C.line2;
        c.lineWidth = l.bad ? 2 : 1.2;
        if (l.bad) c.setLineDash([4, 3]);
        c.beginPath();
        c.moveTo(colL + 62, ey);
        var mx = lerp(colL + 62, colR - 62, age);
        c.bezierCurveTo((colL + colR) / 2, ey, (colL + colR) / 2, uy, mx, lerp(ey, uy, age));
        c.stroke();
        c.restore();
      });

      /* olay kutuları */
      evs.forEach(function (e, i) {
        var y = padT + i * ((H - padT - 16) / Math.max(1, evs.length));
        var w = 124, h = 26;
        var waited = (now - e.born) / 1000;
        rr(c, colL - w / 2, y, w, h, 6);
        c.fillStyle = C.s2; c.fill();
        c.strokeStyle = waited > 4 ? C.warn : C.line; c.lineWidth = 1; c.stroke();
        c.fillStyle = waited > 4 ? C.warn : C.t2;
        c.font = "600 10.5px " + C.mono; c.textAlign = "left";
        c.fillText("EVT-" + (1000 + i), colL - w / 2 + 9, y + 17);
        c.textAlign = "right";
        c.fillStyle = C.t3;
        c.fillText(waited.toFixed(0) + "s", colL + w / 2 - 9, y + 17);
      });

      /* ekipler */
      units.forEach(function (u, i) {
        var y = padT + i * ((H - padT - 16) / units.length);
        var w = 128, h = 22;
        u.flash = Math.max(0, u.flash - dt / 500);
        var over = u.load > 1;
        rr(c, colR - w / 2, y, w, h, 6);
        c.fillStyle = over ? "rgba(248,113,113,.14)" : C.s2; c.fill();
        c.strokeStyle = over ? C.danger : (u.load ? C.acc : C.line); c.lineWidth = 1; c.stroke();
        c.textAlign = "left"; c.font = "600 10.5px " + C.mono;
        c.fillStyle = over ? C.danger : (u.load ? C.acc : C.t3);
        c.fillText(tpl("EKİP-{0}", String(i + 1).padStart(2, "0")), colR - w / 2 + 9, y + 15);
        c.textAlign = "right";
        c.fillText(u.load === 0 ? "müsait" : tpl("{0} görev", u.load), colR + w / 2 - 9, y + 15);
        if (u.flash > 0) {
          c.save(); c.globalAlpha = u.flash * 0.5;
          rr(c, colR - w / 2 - 2, y - 2, w + 4, h + 4, 8);
          c.strokeStyle = over ? C.danger : C.acc; c.lineWidth = 2; c.stroke(); c.restore();
        }
      });

      /* orta uyarı */
      if (errs > 0) {
        c.textAlign = "center"; c.font = "700 11px " + C.mono;
        c.fillStyle = C.danger;
        c.fillText("aynı ekip birden fazla olayda", W / 2, H - 8);
      }
    });
  }

  /* ═══════════════════════════ UÇTAN UCA AKIŞ ═════════════════════════════ */
  function runFlow() {
    var cv = $("#flowCv"); if (!cv) return;
    var stepEl = $("#flowStep"), noteEl = $("#flowNote");

    var STEPS = [
      { n: "Saha cihazı", d: "POST /locations", ico: "car", col: "acc2",
        t: "<b>1 · Konum bildirimi.</b> Cihaz konumu gönderir. İstek doğrudan veritabanına yazılmaz; Kafka topic'ine bırakılır ve <span class='chip-mono'>202 Accepted</span> anında döner. Böylece cihaz veritabanı yazımını beklemez." },
      { n: "Kafka", d: "6 bölüm · anahtar=policeId", ico: "stream", col: "teal",
        t: "<b>2 · Tampon.</b> Bölüm anahtarı <span class='chip-mono'>policeId</span> olduğu için aynı personelin kayıtları aynı bölüme düşer ve sıra korunur. Ani yük burada birikir, veritabanına yansımaz." },
      { n: "Tüketici", d: "500'lük batch", ico: "cpu", col: "teal",
        t: "<b>3 · Toplu yazma.</b> Üç tüketici 500'lük gruplar hâlinde okur ve tek transaction'da yazar. Onay modu <span class='chip-mono'>BATCH</span>: grup yazılmadan offset ilerlemez." },
      { n: "PostgreSQL", d: "aylık bölümlü tablo", ico: "db", col: "acc",
        t: "<b>4 · Kalıcı kayıt.</b> Satır, ayına ait bölüme yazılır. Rota sorgusu daha sonra yalnızca ilgili bölümü okuyacak." },
      { n: "SSE + Redis", d: "tüm örneklere yayın", ico: "net", col: "vio",
        t: "<b>5 · Yayın.</b> Değişiklik Redis kanalına yazılır; tüm backend örnekleri aboneyken kendi SSE istemcilerine iletir. Operatör sayfayı yenilemez." },
      { n: "Operatör", d: "harita güncellenir", ico: "eye", col: "good",
        t: "<b>6 · Ekran.</b> İşaretçi yeni konuma kayar. Bu noktadan sonra operatör görevlendirme yapar — ve oradaki asıl zorluk 3. aşamanın konusu." }
    ];

    var cur = 0, acc = 0, last = 0, parts = [];

    function setStep(i) {
      cur = i;
      stepEl.textContent = (i + 1) + " · " + tpl(STEPS[i].n);
      noteEl.innerHTML = tpl(STEPS[i].t);
    }
    setStep(0);
    if (!reduce) every(function () { setStep((cur + 1) % STEPS.length); }, 3400);

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var n = STEPS.length;
      var boxW = Math.min(150, (W - 40) / n - 12);
      var gap = (W - 40 - boxW * n) / (n - 1);
      var y = H * 0.36, boxH = 62;

      /* akış çizgisi */
      c.strokeStyle = C.line; c.lineWidth = 2;
      c.beginPath(); c.moveTo(20 + boxW / 2, y + boxH / 2); c.lineTo(W - 20 - boxW / 2, y + boxH / 2); c.stroke();

      /* paketçikler */
      if (!reduce) { acc += dt; while (acc > 260) { acc -= 260; parts.push({ p: 0 }); } }
      parts = parts.filter(function (p) { return p.p < 1; });
      parts.forEach(function (p) {
        p.p += dt * 0.00021;
        var x = lerp(20 + boxW / 2, W - 20 - boxW / 2, p.p);
        c.fillStyle = C.acc2;
        c.globalAlpha = 0.85;
        c.beginPath(); c.arc(x, y + boxH / 2, 3.4, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      });

      STEPS.forEach(function (s, i) {
        var x = 20 + i * (boxW + gap);
        var on = i === cur;
        var col = s.col === "acc" ? C.acc : s.col === "acc2" ? C.acc2 : s.col === "teal" ? C.teal
                : s.col === "vio" ? C.vio : C.good;
        rr(c, x, y, boxW, boxH, 10);
        c.fillStyle = on ? "rgba(255,255,255,.05)" : C.s1; c.fill();
        c.strokeStyle = on ? col : C.line; c.lineWidth = on ? 2 : 1; c.stroke();
        if (on) {
          c.save(); c.globalAlpha = 0.18;
          rr(c, x - 4, y - 4, boxW + 8, boxH + 8, 13);
          c.strokeStyle = col; c.lineWidth = 6; c.stroke(); c.restore();
        }
        c.textAlign = "center";
        c.fillStyle = on ? C.t1 : C.t2; c.font = "700 12px " + C.sans;
        c.fillText(s.n, x + boxW / 2, y + 26);
        c.fillStyle = C.t3; c.font = "9.5px " + C.mono;
        var d = tpl(s.d);
        if (c.measureText(d).width > boxW - 12) d = d.slice(0, 18) + "…";
        c.fillText(d, x + boxW / 2, y + 44);
        /* numara */
        c.fillStyle = on ? col : C.line2;
        c.beginPath(); c.arc(x + boxW / 2, y - 14, 9, 0, Math.PI * 2); c.fill();
        c.fillStyle = on ? "#05070b" : C.t3; c.font = "700 10px " + C.mono;
        c.fillText(String(i + 1), x + boxW / 2, y - 10.5);
      });

      /* alt açıklama şeridi */
      c.textAlign = "left"; c.font = "10.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText("konum bildirimi → tampon → toplu yazma → kalıcı kayıt → yayın → ekran", 20, H - 14);
    });
  }

  /* ═══════════════════════════ OPERASYON PANOSU ═══════════════════════════ */
  function runScreen() {
    var cv = $("#mockCv"); if (!cv) return;
    var toast = $("#mockToast"), toastTx = $("#mockToastTx");
    var kEv = $("#kpiEv"), kAv = $("#kpiAv"), kOn = $("#kpiOn");
    var R = rnd(4242);
    var units = [], evs = [], last = 0, evCount = 14, avail = 126, onDuty = 78;

    for (var i = 0; i < 26; i++) {
      units.push({ x: 0.08 + R() * 0.84, y: 0.1 + R() * 0.8, tx: 0.08 + R() * 0.84, ty: 0.1 + R() * 0.8,
                   sp: 0.00008 + R() * 0.0001, st: R() < 0.42 ? 1 : 0 });
    }
    evs.push({ x: 0.3, y: 0.42, c: C.danger }, { x: 0.68, y: 0.3, c: C.warn }, { x: 0.52, y: 0.72, c: C.acc });

    var TOASTS = ["Yeni olay: EVT-2026-001043", "Görevlendirme yapıldı", "Ekip-14 görevde", "Olay kapatıldı"];
    var ti = 0;
    if (!reduce) {
      every(function () {
        toastTx.textContent = TOASTS[ti % TOASTS.length]; ti++;
        toast.classList.add("on");
        later(function () { toast.classList.remove("on"); }, 2200);
        /* KPI'lar canlıymış gibi küçük oynamalar yapar */
        evCount += (R() < 0.5 ? 1 : -1); evCount = clamp(evCount, 11, 18);
        avail += (R() < 0.5 ? 2 : -2); avail = clamp(avail, 112, 138);
        onDuty = 204 - avail;
        kEv.textContent = evCount; kAv.textContent = avail; kOn.textContent = onDuty;
      }, 3600);
    }

    loop(function (now) {
      var g = fitFree(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = "#070a12"; c.fillRect(0, 0, W, H);

      /* yol ağı */
      c.strokeStyle = "rgba(255,255,255,.05)"; c.lineWidth = 1;
      for (var k = 1; k < 7; k++) {
        c.beginPath(); c.moveTo(W * k / 7, 0); c.lineTo(W * k / 7, H); c.stroke();
        c.beginPath(); c.moveTo(0, H * k / 7); c.lineTo(W, H * k / 7); c.stroke();
      }
      c.strokeStyle = "rgba(255,255,255,.10)"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(0, H * 0.58); c.lineTo(W, H * 0.42); c.stroke();
      c.beginPath(); c.moveTo(W * 0.42, 0); c.lineTo(W * 0.56, H); c.stroke();

      /* olaylar */
      evs.forEach(function (e) {
        var pr = ((now / 1500) % 1);
        c.save(); c.globalAlpha = (1 - pr) * 0.55;
        c.strokeStyle = e.c; c.lineWidth = 1.6;
        c.beginPath(); c.arc(e.x * W, e.y * H, 6 + pr * 22, 0, Math.PI * 2); c.stroke(); c.restore();
        c.fillStyle = e.c;
        c.beginPath(); c.arc(e.x * W, e.y * H, 4.5, 0, Math.PI * 2); c.fill();
      });

      /* personel */
      units.forEach(function (u) {
        if (!reduce) {
          var dx = u.tx - u.x, dy = u.ty - u.y, d2 = Math.sqrt(dx * dx + dy * dy);
          if (d2 < 0.01) { u.tx = 0.08 + R() * 0.84; u.ty = 0.1 + R() * 0.8; }
          else { u.x += dx / d2 * u.sp * dt; u.y += dy / d2 * u.sp * dt; }
        }
        var col = u.st ? C.acc : C.good;
        c.globalAlpha = 0.2;
        c.fillStyle = col;
        c.beginPath(); c.arc(u.x * W, u.y * H, 6, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        c.beginPath(); c.arc(u.x * W, u.y * H, 2.8, 0, Math.PI * 2); c.fill();
      });

      /* lejant */
      c.font = "9px " + C.mono; c.textAlign = "left";
      var lx = 10, ly = H - 10;
      c.fillStyle = C.good; c.beginPath(); c.arc(lx + 3, ly - 3, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.t3; c.fillText("müsait", lx + 11, ly);
      c.fillStyle = C.acc; c.beginPath(); c.arc(lx + 58, ly - 3, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.t3; c.fillText("görevde", lx + 66, ly);
    });
  }

  /* ═══════════════════════════ PAKET AĞACI ═══════════════════════════════ */
  function runPkg() {
    var info = $("#pkgInfo");
    var TX = {
      security: "<b>security/</b> — Kimlik doğrulama, JWT üretimi ve doğrulaması, refresh token rotasyonu, SSE bileti ve yetkilendirme yapılandırması. Diğer feature paketleri buraya bağımlı değildir; yetki kuralları kendi sözleşmelerinde durur.",
      police: "<b>police/</b> — Personel yönetimi. Sicil, rütbe, görev durumu, takım ve araç ilişkisi. Personel arama sorguları burada; trigram indeksinin karşılığı bu paketin repository'sinde.",
      org: "<b>organization/</b> — Birim ve takım hiyerarşisi ile referans veriler. Nadiren değişen bu veri Redis'te önbelleklenir; önbellek anotasyonu controller'da değil servis metodunda durur.",
      event: "<b>event/</b> — Trafik olayının yaşam döngüsü: açılış, güncelleme, durum geçişleri. Olay güncellemeleri sürüm alanıyla korunur.",
      assignment: "<b>assignment/</b> — Projenin en kritik iş kuralı burada: bir personel aynı anda tek aktif görevlendirmeye sahip olabilir. Kötümser kilit, sabit kilit sırası ve öncelik devri kuralları bu pakette.",
      location: "<b>location/</b> — Konum bildirimi, geçmiş sorgusu ve Kafka ingest'i. <span class='chip-mono'>LocationIngestChannel</span> arayüzünün iki gerçekleştirimi (kafka / direct) burada yaşar.",
      realtime: "<b>realtime/</b> — SSE bağlantı kayıtları, yayın ve Redis pub/sub abone yapılandırması. Yayın virtual thread'lerle eş zamanlı yapılır; yavaş bir istemci diğerlerini bekletmez.",
      dashboard: "<b>dashboard/</b> — Operasyon istatistikleri. Ağır toplama sorguları 30 saniyelik Redis önbelleği arkasında.",
      common: "<b>common/</b> — Feature'lara ait olmayan ortak yapı: tek tip hata yanıtı ve <span class='chip-mono'>ErrorCode</span> sözlüğü, idempotency aspect'i, hız sınırı filtresi ve Lua script'i, thread yapılandırması.",
      client: "<b>client/</b> — API sözleşmesi. Yol, HTTP metodu, parametre anotasyonları, yetki kuralı ve Javadoc burada. Controller'ı okumadan uç noktanın ne yaptığı anlaşılır.",
      controller: "<b>controller/</b> — Sözleşmenin gerçekleştirimi. Yalnızca <span class='chip-mono'>@Override</span> ve servis çağrısı içerir; iş kuralı barındırmaz.",
      service: "<b>service/</b> — İş kuralı arayüzü. Controller somut sınıfa değil bu soyutlamaya bağımlıdır.",
      impl: "<b>service/impl/</b> — İş kuralı gerçekleştirimi. Transaction sınırları, kilitleme ve doğrulamalar burada.",
      repo: "<b>repository/</b> — Veri erişimi. Liste sorguları entity grafiği yerine projeksiyon DTO'su döndürür; N+1 problemi böyle önlenir.",
      entity: "<b>entity/</b> — JPA varlıkları. Eskiden <span class='chip-mono'>domain</span> adındaydı; paket adı, içindekinin ne olduğunu doğrudan söylesin diye değiştirildi.",
      dto: "<b>dto/</b> — İstek ve yanıt nesneleri. Java 21 <span class='chip-mono'>record</span> tipiyle yazıldıkları için değişmezdirler ve eşitlik/hash davranışı ücretsiz gelir."
    };
    var nodes = $$("#pkgTree .tn");
    nodes.forEach(function (n) {
      ev(n, "click", function () {
        nodes.forEach(function (o) { o.classList.remove("hot"); });
        n.classList.add("hot");
        info.innerHTML = tpl(TX[n.dataset.k] || "");
      });
    });
  }

  /* ═══════════════════════════ BÖLÜM ELEME ═══════════════════════════════ */
  function runPart() {
    var cv = $("#partCv"); if (!cv) return;
    var stat = $("#partStat"), note = $("#partNote");
    var N = 17, mode = null, prog = 0, scanned = [];

    function reset() { mode = null; prog = 0; scanned = []; stat.textContent = tpl("hazır"); stat.className = "sbadge a"; }
    reset();

    ev($("#partGood"), "click", function () {
      mode = "good"; prog = 0; scanned = [];
      stat.textContent = tpl("çalışıyor…"); stat.className = "sbadge a";
      note.innerHTML = tpl("<b>Zaman filtreli sorgu.</b> Planlayıcı <span class='chip-mono'>WHERE recorded_at >= now() - interval '24 hours'</span> " +
        "koşulunu görüp ilgisiz bölümleri <b>planlama aşamasında</b> eler. Gerçek sistemde " +
        "<span class='chip-mono'>EXPLAIN</span> çıktısı bunu doğruladı: <span class='chip-mono'>Subplans Removed: 16</span>.");
    });
    ev($("#partBad"), "click", function () {
      mode = "bad"; prog = 0; scanned = [];
      stat.textContent = tpl("çalışıyor…"); stat.className = "sbadge r";
      note.innerHTML = tpl("<b>Filtresiz sorgu.</b> Zaman koşulu olmadığı için planlayıcı hiçbir bölümü eleyemez ve " +
        "<b>17 bölümün tamamını</b> tarar. Bölümleme burada fayda sağlamaz — hatta 17 ayrı tarama planı yönetmek " +
        "ek maliyettir. Bölümlemenin faydası, sorguların bölüm anahtarını içermesine bağlıdır.");
    });
    ev($("#partReset"), "click", function () {
      reset();
      note.innerHTML = tpl("<b>Zaman filtreli sorgu</b>, planlama aşamasında ilgisiz bölümleri eler. Gerçek sistemde " +
        "<span class='chip-mono'>EXPLAIN</span> çıktısı bunu doğruladı: 17 bölümün 16'sı elendi " +
        "(<span class='chip-mono'>Subplans Removed: 16</span>).");
    });

    var last = 0;
    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      if (mode) prog = Math.min(1, prog + dt * (mode === "good" ? 0.0016 : 0.0004));

      var cols = 6, rows = Math.ceil(N / cols);
      var pad = 16, topY = 54;
      var bw = (W - pad * 2 - (cols - 1) * 10) / cols;
      var bh = Math.min(46, (H - topY - 44 - (rows - 1) * 10) / rows);

      /* sorgu kutusu */
      c.textAlign = "left"; c.font = "700 11px " + C.mono; c.fillStyle = C.t3;
      c.fillText("SORGU", pad, 20);
      c.font = "12px " + C.mono; c.fillStyle = mode === "bad" ? C.danger : C.acc2;
      c.fillText(mode === "bad"
        ? "SELECT * FROM police_locations WHERE police_id = 42"
        : "SELECT * FROM police_locations WHERE police_id = 42 AND recorded_at >= now() - interval '24h'",
        pad, 38);

      var target = N - 1;  /* güncel ay: son bölüm */
      for (var i = 0; i < N; i++) {
        var r = (i / cols) | 0, cc = i % cols;
        var x = pad + cc * (bw + 10), y = topY + r * (bh + 10);
        var isTarget = i === target;
        var hit = false;
        if (mode === "good") hit = isTarget && prog > 0.25;
        else if (mode === "bad") hit = prog > (i / N) * 0.95;
        var pruned = mode === "good" && !isTarget && prog > 0.15;

        rr(c, x, y, bw, bh, 7);
        c.fillStyle = hit ? (mode === "bad" ? "rgba(248,113,113,.16)" : "rgba(46,211,183,.16)") : C.s1;
        c.fill();
        c.save();
        if (pruned) c.globalAlpha = 0.28;
        c.strokeStyle = hit ? (mode === "bad" ? C.danger : C.teal) : C.line;
        c.lineWidth = hit ? 1.8 : 1; c.stroke();

        c.textAlign = "center";
        c.fillStyle = hit ? C.t1 : C.t3;
        c.font = "600 9.5px " + C.mono;
        var m = ((i + 4) % 12) + 1, yr = 2026 + (((i + 4) / 12) | 0);
        c.fillText(yr + "-" + String(m).padStart(2, "0"), x + bw / 2, y + bh / 2 - 2);
        c.font = "8px " + C.mono;
        c.fillStyle = hit ? (mode === "bad" ? C.danger : C.teal) : C.line2;
        c.fillText(hit ? "TARANIYOR" : (pruned ? "ELENDİ" : "—"), x + bw / 2, y + bh / 2 + 11);
        c.restore();
      }

      /* özet */
      c.textAlign = "left"; c.font = "700 11.5px " + C.mono;
      if (mode === "good") {
        c.fillStyle = C.teal;
        c.fillText("okunan bölüm: 1 / 17    ·    elenen: 16", pad, H - 14);
      } else if (mode === "bad") {
        c.fillStyle = C.danger;
        c.fillText(tpl("okunan bölüm: {0} / 17    ·    elenen: 0", Math.min(N, Math.ceil(prog * N))), pad, H - 14);
      } else {
        c.fillStyle = C.t3;
        c.fillText("bir sorgu çalıştırın", pad, H - 14);
      }
    });
  }

  /* ═══════════════════════════ İNDEKS YARIŞI ═════════════════════════════ */
  function runIndex() {
    var cv = $("#idxCv"); if (!cv) return;
    var stat = $("#idxStat");
    var running = false, a = 0, b = 0, doneA = 0, doneB = 0, t0 = 0;
    var ROWS = 240000;

    function reset() { running = false; a = 0; b = 0; doneA = 0; doneB = 0; stat.textContent = tpl("hazır"); stat.className = "sbadge b"; }
    reset();
    ev($("#idxRun"), "click", function () {
      if (running) return;
      reset(); running = true; t0 = performance.now();
      stat.textContent = tpl("çalışıyor…"); stat.className = "sbadge a";
    });
    ev($("#idxReset"), "click", reset);
    if (reduce) { a = 1; b = 1; doneA = 1420; doneB = 6; }

    var last = 0;
    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      if (running) {
        b = Math.min(1, b + dt * 0.0075);          /* trigram: hızlı */
        a = Math.min(1, a + dt * 0.00042);         /* tam tarama: yavaş */
        if (b >= 1 && !doneB) doneB = Math.round(now - t0);
        if (a >= 1 && !doneA) { doneA = Math.round(now - t0); running = false; stat.textContent = tpl("bitti"); stat.className = "sbadge g"; }
      }

      var pad = 18, barH = 30, lane = (H - 66) / 2;

      function drawLane(i, label, sub, p, col, doneMs, rowsRead) {
        var y = 42 + i * lane;
        c.textAlign = "left"; c.font = "700 11.5px " + C.sans; c.fillStyle = C.t1;
        c.fillText(label, pad, y);
        c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
        c.fillText(sub, pad, y + 15);

        var bx = pad, by = y + 24, bw = W - pad * 2;
        rr(c, bx, by, bw, barH, 7); c.fillStyle = C.s2; c.fill();
        c.strokeStyle = C.line; c.lineWidth = 1; c.stroke();
        if (p > 0) {
          c.save();
          rr(c, bx, by, bw, barH, 7); c.clip();
          c.fillStyle = col; c.globalAlpha = 0.24;
          c.fillRect(bx, by, bw * p, barH);
          c.globalAlpha = 1;
          c.fillStyle = col;
          c.fillRect(bx + bw * p - 2.5, by, 2.5, barH);
          c.restore();
        }
        /* Süre YAZILMAZ: bu sahne ölçülmüş bir kıyaslama değil, planların
           okuduğu satır sayısını gösteren temsilî bir anlatımdır. Uydurma bir
           milisaniye değeri, olmayan bir ölçüm iddiası olurdu. */
        c.textAlign = "right"; c.font = "700 11px " + C.mono;
        c.fillStyle = p >= 1 ? col : C.t3;
        var txt = p >= 1 ? tpl("{0} satır okundu", nf(rowsRead))
                         : tpl("{0} satır…", nf(Math.round(rowsRead * p)));
        c.fillText(txt, bx + bw - 10, by + 20);
      }

      c.textAlign = "left"; c.font = "12px " + C.mono; c.fillStyle = C.acc2;
      c.fillText("WHERE full_name ILIKE '%yılmaz%'   ·   240.000 satır", pad, 22);

      drawLane(0, "Seq Scan — indekssiz tam tablo taraması",
        "B-tree indeksi '%...%' desenini kullanamaz; planlayıcı onu atlar", a, C.danger, doneA || 1420, ROWS);
      drawLane(1, "Bitmap Index Scan — GIN + pg_trgm",
        "trigram indeksi alt dize aramasını destekler; yalnızca eşleşen satırlar okunur", b, C.good, doneB || 6, 38);

      if (a >= 1 && b >= 1) {
        c.textAlign = "center"; c.font = "700 11px " + C.mono; c.fillStyle = C.good;
        c.fillText("aynı sorgu, aynı veri — fark yalnızca indeks tipi", W / 2, H - 22);
      }
      c.textAlign = "center"; c.font = "9px " + C.mono; c.fillStyle = C.t3;
      c.fillText("çubuk hızları temsilîdir; ölçülmüş süre değildir", W / 2, H - 8);
    });
  }

  /* ═══════════════════════════ YARIŞ KOŞULU ══════════════════════════════ */
  function runRace() {
    var cv = $("#raceCv"); if (!cv) return;
    var stat = $("#raceStat"), note = $("#raceNote"), lockBtn = $("#raceLock");
    var locked = false, running = false, t = 0, result = null;

    /* İki transaction'ın adımları. Kilit kapalıyken ikisi de aynı anda okur. */
    var A = { name: "Operatör A · EVT-1042", col: "#4f8dff" };
    var B = { name: "Operatör B · EVT-1043", col: "#ffb545" };

    function setLockLabel() {
      lockBtn.innerHTML = '<svg><use href="#i-lock"/></svg> ' +
        tpl(locked ? "Satır kilidi: AÇIK" : "Satır kilidi: KAPALI");
      lockBtn.classList.toggle("on", locked);
    }
    function reset() {
      running = false; t = 0; result = null;
      stat.textContent = tpl("hazır"); stat.className = "sbadge";
    }
    setLockLabel(); reset();

    ev(lockBtn, "click", function () { locked = !locked; setLockLabel(); reset(); });
    ev($("#raceReset"), "click", reset);
    ev($("#raceRun"), "click", function () {
      if (running) return;
      running = true; t = 0; result = null;
      stat.textContent = tpl("çalışıyor…"); stat.className = "sbadge a";
    });

    var last = 0;
    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      if (running) t += dt;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var laneH = 52, topY = 40;
      var TL = W * 0.10, TR = W - 20;
      var steps = ["oku: müsait mi?", "kural kontrolü", "INSERT assignment", "COMMIT"];

      /* zaman ekseni */
      c.strokeStyle = C.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(TL, topY - 14); c.lineTo(TR, topY - 14); c.stroke();
      c.textAlign = "left"; c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText("zaman →", TL, topY - 20);

      function drawTx(tx, i) {
        var y = topY + i * (laneH + 26);
        c.textAlign = "left"; c.font = "700 11.5px " + C.sans; c.fillStyle = tx.col;
        c.fillText(tx.name, 8, y + 4);

        var segW = (TR - TL) / steps.length;
        /* B kilitliyken bekler: ilerlemesi A commit ettikten sonra başlar */
        var own = t;
        var blocked = false;
        if (locked && i === 1) {
          if (t < 1500) { own = 0; blocked = true; }     /* A'nın kilidi serbest bırakmasını bekler */
          else own = t - 1500;
        }
        var p = clamp(own / 1900, 0, 1);

        for (var s = 0; s < steps.length; s++) {
          var x = TL + s * segW;
          var sp = clamp((p - s / steps.length) * steps.length, 0, 1);
          rr(c, x + 3, y + 14, segW - 6, 26, 6);
          c.fillStyle = C.s1; c.fill();
          c.strokeStyle = C.line; c.lineWidth = 1; c.stroke();
          if (sp > 0) {
            c.save(); rr(c, x + 3, y + 14, segW - 6, 26, 6); c.clip();
            c.fillStyle = tx.col; c.globalAlpha = 0.22;
            c.fillRect(x + 3, y + 14, (segW - 6) * sp, 26);
            c.restore();
          }
          c.textAlign = "center"; c.font = "9.5px " + C.mono;
          c.fillStyle = sp > 0.5 ? C.t1 : C.t3;
          var lbl = steps[s];
          if (c.measureText(lbl).width > segW - 14) lbl = lbl.slice(0, 12) + "…";
          c.fillText(lbl, x + segW / 2, y + 31);
        }

        if (blocked) {
          c.textAlign = "left"; c.font = "700 10.5px " + C.mono; c.fillStyle = C.warn;
          c.fillText("⏸ satır kilidi bekleniyor (PESSIMISTIC_WRITE)", TL + 6, y + 56);
        }
        return p;
      }

      var pA = drawTx(A, 0);
      var pB = drawTx(B, 1);

      /* sonuç */
      if (running && pA >= 1 && pB >= 1 && !result) {
        result = locked ? "ok" : "bad";
        running = false;
        stat.textContent = tpl(locked ? "tutarlı" : "veri bozuldu");
        stat.className = "sbadge " + (locked ? "g" : "r");
        note.innerHTML = tpl(locked
          ? "<b>Kilit açıkken:</b> B, A'nın transaction'ı bitene kadar bekler ve <b>güncel</b> durumu okur. " +
            "Personelin artık meşgul olduğunu görür; görevlendirme reddedilir ve operatöre başka bir ekip seçmesi gerektiği söylenir. " +
            "Bekleme milisaniyeler sürer — kullanıcı fark etmez."
          : "<b>Kilit kapalıyken:</b> iki transaction da aynı anda \"personel müsait\" cevabını okudu, ikisi de kural kontrolünden geçti ve ikisi de yazdı. " +
            "Sonuç: <b>bir polis iki olaya birden atanmış</b> görünüyor. Sahaya tek ekip gidiyor, ikinci olay ekip geldiğini sanarak bekliyor. " +
            "Bu, kodda hiçbir hata mesajı üretmeyen sessiz bir veri bozulmasıdır.");
      }

      /* sonuç kutusu */
      var by = topY + 2 * (laneH + 26) + 16;
      if (by < H - 40) {
        rr(c, 8, by, W - 16, H - by - 8, 8);
        c.fillStyle = result === "bad" ? "rgba(248,113,113,.10)" : result === "ok" ? "rgba(52,211,153,.10)" : C.s1;
        c.fill();
        c.strokeStyle = result === "bad" ? C.danger : result === "ok" ? C.good : C.line;
        c.lineWidth = 1; c.stroke();
        c.textAlign = "left"; c.font = "700 11px " + C.mono;
        c.fillStyle = result === "bad" ? C.danger : result === "ok" ? C.good : C.t3;
        var msg = result === "bad" ? "event_assignments: 2 AKTİF satır — aynı police_id"
                : result === "ok" ? "event_assignments: 1 AKTİF satır — kural korundu"
                : "veritabanı durumu: bekleniyor";
        c.fillText(msg, 18, by + 22);
        c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
        c.fillText(result === "bad" ? "kısmi UNIQUE indeks olmasaydı bu satır yazılırdı" : "", 18, by + 38);
      }
    });
  }

  /* ═══════════════════════════ KİLİT SIRASI ══════════════════════════════ */
  function runDefense() {
    var cv = $("#lockCv"); if (!cv) return;
    var stat = $("#lockStat"), btn = $("#lockToggle");
    var ordered = true, t = 0, last = 0;

    function setLabel() {
      stat.textContent = tpl(ordered ? "sabit sıra" : "rastgele sıra");
      stat.className = "sbadge " + (ordered ? "g" : "r");
      btn.innerHTML = '<svg><use href="#i-repeat"/></svg> ' +
        tpl(ordered ? "Sırayı bozup dene" : "Sabit sıraya dön");
    }
    setLabel();
    ev(btn, "click", function () { ordered = !ordered; t = 0; setLabel(); });

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      t += dt; if (t > 4200) t = 0;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var p = clamp(t / 2200, 0, 1);
      var cx = W / 2, cy = H / 2;
      var rw = 84, rh = 30;
      /* iki kaynak: kaynak-1 (id 7) ve kaynak-2 (id 11) */
      var res = [
        { n: "police_id 7", x: cx - rw / 2, y: 34 },
        { n: "police_id 11", x: cx - rw / 2, y: H - 34 - rh }
      ];
      var txs = [
        { n: "T1", col: C.acc, x: 22, order: ordered ? [0, 1] : [0, 1] },
        { n: "T2", col: C.acc2, x: W - 22 - 46, order: ordered ? [0, 1] : [1, 0] }
      ];

      res.forEach(function (r) {
        rr(c, r.x, r.y, rw, rh, 7); c.fillStyle = C.s2; c.fill();
        c.strokeStyle = C.line2; c.lineWidth = 1; c.stroke();
        c.textAlign = "center"; c.font = "600 10px " + C.mono; c.fillStyle = C.t2;
        c.fillText(r.n, r.x + rw / 2, r.y + 19);
      });

      var deadlock = !ordered && p > 0.72;

      txs.forEach(function (tx, i) {
        var ty = cy - 14;
        rr(c, tx.x, ty, 46, 28, 7);
        c.fillStyle = deadlock ? "rgba(248,113,113,.16)" : C.s1; c.fill();
        c.strokeStyle = deadlock ? C.danger : tx.col; c.lineWidth = 1.6; c.stroke();
        c.textAlign = "center"; c.font = "700 11px " + C.mono;
        c.fillStyle = deadlock ? C.danger : tx.col;
        c.fillText(tx.n, tx.x + 23, ty + 19);

        /* ilk kilit hemen, ikinci kilit p>0.5 sonrası talep edilir */
        tx.order.forEach(function (ri, k) {
          var got = k === 0 ? p > 0.2 : (ordered ? p > 0.78 : false);
          var want = k === 1 && p > 0.5;
          if (!got && !want) return;
          var r = res[ri];
          var fromX = tx.x + (i === 0 ? 46 : 0), fromY = ty + 14;
          var toX = i === 0 ? r.x : r.x + rw, toY = r.y + rh / 2;
          c.save();
          c.strokeStyle = got ? tx.col : (deadlock ? C.danger : C.warn);
          c.lineWidth = got ? 2 : 1.6;
          if (!got) c.setLineDash([5, 4]);
          c.beginPath(); c.moveTo(fromX, fromY);
          c.bezierCurveTo((fromX + toX) / 2, fromY, (fromX + toX) / 2, toY, toX, toY);
          c.stroke();
          c.restore();
          /* kilit rozeti */
          c.fillStyle = got ? tx.col : (deadlock ? C.danger : C.warn);
          c.beginPath(); c.arc(toX + (i === 0 ? -8 : 8), toY, 4, 0, Math.PI * 2); c.fill();
        });
      });

      c.textAlign = "center"; c.font = "700 10.5px " + C.mono;
      if (deadlock) {
        c.fillStyle = C.danger;
        c.fillText("KİLİTLENME — T1, T2'nin tuttuğunu bekliyor; T2 de T1'inkini", cx, H - 8);
      } else if (ordered) {
        c.fillStyle = C.good;
        c.fillText("her iki transaction da kilitleri id'ye göre artan sırada alır", cx, H - 8);
      } else {
        c.fillStyle = C.warn;
        c.fillText("sıra farklı: T1 → 7, 11   ·   T2 → 11, 7", cx, H - 8);
      }
    });
  }

  /* ═══════════════════════════ JWT ANATOMİSİ ═════════════════════════════ */
  function runSecurity() {
    var segs = $$(".anat-seg"), cards = $$("#jwtCards .anat-card");
    var i = 0, auto = true;
    function focus(k) {
      segs.forEach(function (s) { s.classList.toggle("hot", +s.dataset.i === k); s.classList.toggle("dim", +s.dataset.i !== k); });
      cards.forEach(function (cd) { cd.classList.toggle("hot", +cd.dataset.i === k); });
    }
    focus(0);
    segs.forEach(function (s) { ev(s, "click", function () { auto = false; focus(+s.dataset.i); }); });
    cards.forEach(function (cd) { ev(cd, "click", function () { auto = false; focus(+cd.dataset.i); }); });
    if (!reduce) every(function () { if (auto) { i = (i + 1) % 3; focus(i); } }, 2400);
  }

  /* ═══════════════════════════ SSE DAĞITIMI ══════════════════════════════ */
  function runSse() {
    var cv = $("#sseCv"); if (!cv) return;
    var stat = $("#sseStat"), note = $("#sseNote");
    var two = false, redis = false, pulses = [], last = 0;

    function labels() {
      stat.textContent = tpl(two ? (redis ? "iki örnek · redis açık" : "iki örnek · redis kapalı") : "tek örnek");
      stat.className = "sbadge " + (two && !redis ? "r" : two ? "g" : "");
      $("#sseScale").innerHTML = '<svg><use href="#i-server"/></svg> ' +
        tpl(two ? "Tek sunucuya dön" : "İkinci sunucuyu ekle");
      $("#sseRedis").innerHTML = '<svg><use href="#i-layers"/></svg> ' +
        tpl(redis ? "Redis pub/sub: AÇIK" : "Redis pub/sub: KAPALI");
      $("#sseRedis").classList.toggle("on", redis);
    }
    labels();
    ev($("#sseScale"), "click", function () { two = !two; pulses = []; labels(); });
    ev($("#sseRedis"), "click", function () { redis = !redis; pulses = []; labels(); });
    ev($("#ssePub"), "click", function () {
      pulses.push({ t: 0, viaRedis: redis });
      note.innerHTML = tpl(!two
        ? "<b>Tek sunucuda sorun görünmez.</b> Olay aynı örnekte oluşuyor ve aynı örneğe bağlı istemcilere gidiyor. " +
          "Geliştirme ortamında her şey doğru çalışır — bu yüzden hata üretime kadar fark edilmez."
        : (redis
          ? "<b>Redis pub/sub açık.</b> Yayın kanala yazılıyor ve <b>tüm örnekler</b> aboneyken kendi istemcilerine iletiyor. " +
            "Yayını yapan örnek kendi mesajını da geri alır — böylece \"yerel\" ve \"uzak\" diye iki ayrı kod yolu oluşmaz."
          : "<b>Redis kapalı.</b> Olay 1 numaralı örnekte oluştu; yalnızca ona bağlı istemciler haberdar oldu. " +
            "2 numaralı örneğe bağlı operatörün ekranı <b>sessizce eskiyor</b>. Hata mesajı yok, log yok — sadece güncellenmeyen bir harita."));
    });

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var nInst = two ? 2 : 1;
      var instW = 118, instH = 46;
      var redisY = 26, instY = H * 0.44, cliY = H - 54;

      /* redis kutusu */
      if (two) {
        var rx = W / 2 - 60;
        rr(c, rx, redisY, 120, 30, 7);
        c.fillStyle = redis ? "rgba(167,139,250,.14)" : C.s1; c.fill();
        c.strokeStyle = redis ? C.vio : C.line; c.lineWidth = redis ? 1.8 : 1;
        if (!redis) c.setLineDash([4, 3]);
        c.stroke(); c.setLineDash([]);
        c.textAlign = "center"; c.font = "700 10.5px " + C.mono;
        c.fillStyle = redis ? C.vio : C.t3;
        c.fillText("REDIS PUB/SUB", W / 2, redisY + 19);
        if (!redis) {
          c.font = "9px " + C.mono; c.fillStyle = C.t3;
          c.fillText("devre dışı", W / 2, redisY + 42);
        }
      }

      var xs = [];
      for (var i = 0; i < nInst; i++) {
        var x = nInst === 1 ? W / 2 - instW / 2 : (i === 0 ? W * 0.22 - instW / 2 : W * 0.78 - instW / 2);
        xs.push(x + instW / 2);
        rr(c, x, instY, instW, instH, 8);
        c.fillStyle = C.s1; c.fill();
        c.strokeStyle = i === 0 ? C.acc : C.teal; c.lineWidth = 1.4; c.stroke();
        c.textAlign = "center"; c.font = "700 11px " + C.mono;
        c.fillStyle = i === 0 ? C.acc : C.teal;
        c.fillText("BACKEND-" + (i + 1), x + instW / 2, instY + 20);
        c.font = "9px " + C.mono; c.fillStyle = C.t3;
        c.fillText("3 SSE bağlantısı", x + instW / 2, instY + 35);

        /* redis bağlantısı */
        if (two) {
          c.save();
          c.strokeStyle = redis ? C.vio : C.line;
          c.lineWidth = 1.2; if (!redis) c.setLineDash([4, 4]);
          c.beginPath(); c.moveTo(x + instW / 2, instY); c.lineTo(W / 2, redisY + 30); c.stroke();
          c.restore();
        }

        /* istemciler */
        for (var k = 0; k < 3; k++) {
          var cxp = x + 20 + k * ((instW - 40) / 2);
          c.strokeStyle = C.line; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x + instW / 2, instY + instH); c.lineTo(cxp, cliY); c.stroke();
          c.fillStyle = C.s2;
          rr(c, cxp - 13, cliY, 26, 20, 4); c.fill();
          c.strokeStyle = C.line2; c.stroke();
        }
      }

      /* darbeler */
      pulses.forEach(function (p) { p.t += dt; });
      pulses = pulses.filter(function (p) { return p.t < 2600; });

      pulses.forEach(function (p) {
        var pr = clamp(p.t / 1100, 0, 1);
        /* olay her zaman backend-1'de doğar */
        var srcX = xs[0], srcY = instY + instH / 2;

        /* 1) kaynak örneğin istemcilerine */
        for (var k = 0; k < 3; k++) {
          var cxp = (nInst === 1 ? W / 2 - instW / 2 : W * 0.22 - instW / 2) + 20 + k * ((instW - 40) / 2);
          var x = lerp(srcX, cxp, pr), y = lerp(instY + instH, cliY, pr);
          c.fillStyle = C.good;
          c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
          if (pr >= 1) {
            c.save(); c.globalAlpha = clamp(2 - p.t / 900, 0, 1) * 0.7;
            c.strokeStyle = C.good; c.lineWidth = 1.6;
            rr(c, cxp - 15, cliY - 2, 30, 24, 5); c.stroke(); c.restore();
          }
        }

        /* 2) ikinci örneğe — yalnızca redis açıkken */
        if (two) {
          if (p.viaRedis) {
            var pr2 = clamp((p.t - 300) / 900, 0, 1);
            if (pr2 > 0) {
              var mx = lerp(srcX, W / 2, Math.min(1, pr2 * 2));
              var my = lerp(instY, redisY + 30, Math.min(1, pr2 * 2));
              if (pr2 <= 0.5) {
                c.fillStyle = C.vio;
                c.beginPath(); c.arc(mx, my, 3.2, 0, Math.PI * 2); c.fill();
              } else {
                var q = (pr2 - 0.5) * 2;
                var x2 = lerp(W / 2, xs[1], q), y2 = lerp(redisY + 30, instY, q);
                c.fillStyle = C.vio;
                c.beginPath(); c.arc(x2, y2, 3.2, 0, Math.PI * 2); c.fill();
              }
            }
            var pr3 = clamp((p.t - 1400) / 800, 0, 1);
            if (pr3 > 0) {
              for (var k2 = 0; k2 < 3; k2++) {
                var cx2 = W * 0.78 - instW / 2 + 20 + k2 * ((instW - 40) / 2);
                var x3 = lerp(xs[1], cx2, pr3), y3 = lerp(instY + instH, cliY, pr3);
                c.fillStyle = C.good;
                c.beginPath(); c.arc(x3, y3, 3.2, 0, Math.PI * 2); c.fill();
              }
            }
          } else if (p.t > 900) {
            /* kopuk: ikinci örnek habersiz */
            c.save();
            c.globalAlpha = clamp(1.6 - p.t / 1800, 0, 1);
            c.strokeStyle = C.danger; c.lineWidth = 1.6; c.setLineDash([5, 4]);
            rr(c, W * 0.78 - instW / 2 - 6, instY - 6, instW + 12, instH + 12, 11);
            c.stroke(); c.restore();
            c.textAlign = "center"; c.font = "700 9.5px " + C.mono; c.fillStyle = C.danger;
            c.fillText("haberi yok", xs[1], instY - 14);
          }
        }
      });

      c.textAlign = "center"; c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText("olay her zaman BACKEND-1'de oluşuyor", W / 2, H - 8);
    });
  }

  /* ═══════════════════════════ KAFKA TAMPONU ═════════════════════════════ */
  function runKafka() {
    var cv = $("#kafkaCv"); if (!cv) return;
    var rate = $("#kafkaRate"), rateL = $("#kafkaRateL"), stat = $("#kafkaStat"), note = $("#kafkaNote");
    var mD = $("#mDirect"), mK = $("#mKafka"), mP = $("#mPool"), mL = $("#mLag");
    var last = 0, parts = [], acc = 0, queue = 0;
    var POOL = 20;

    function update() {
      var r = +rate.value;
      rateL.textContent = r;
      /* Doğrudan yazımda her istek bir bağlantı tutar: havuz dolunca kuyruk oluşur.
         Kafka yolunda istek yalnızca topic'e yazılır; veritabanı yükü toplu ve sabit. */
      var perConn = 1000 / 55;                    /* tek yazımın ortalama süresi (ms) */
      var capacity = POOL * (1000 / perConn);     /* saniyede yazılabilen istek */
      var over = r / capacity;
      var directMs = over <= 1 ? Math.round(6 + over * 14) : Math.round(20 + Math.pow(over, 2.1) * 240);
      var kafkaMs = 3 + Math.round(Math.min(4, r / 500));
      var busy = Math.min(POOL, Math.round(Math.min(1, over) * POOL));
      var lag = over <= 1 ? 0 : Math.round((r - capacity) * 0.9);

      mD.textContent = directMs > 1200 ? tpl("zaman aşımı") : directMs + " ms";
      mK.textContent = kafkaMs + " ms";
      mP.textContent = busy + " / " + POOL;
      mL.textContent = nf(lag);

      if (over <= 0.8) { stat.textContent = tpl("normal yük"); stat.className = "sbadge g"; }
      else if (over <= 1.2) { stat.textContent = tpl("sınırda"); stat.className = "sbadge w"; }
      else { stat.textContent = tpl("aşırı yük"); stat.className = "sbadge r"; }

      if (over <= 0.8) {
        note.innerHTML = tpl("<b>Normal yükte iki yol da çalışır.</b> Bu, mimari kararların en tehlikeli anıdır: " +
          "doğrudan yazımın sorunu bu koşulda <b>görünmez</b>. Yükü artırın.");
      } else if (over <= 1.2) {
        note.innerHTML = tpl("<b>Bağlantı havuzu doldu.</b> Doğrudan yazımda istekler artık bağlantı beklemeye başlıyor. " +
          "Kafka yolunda yanıt süresi değişmedi; çünkü istek veritabanına hiç dokunmuyor.");
      } else {
        note.innerHTML = tpl("<b>Kritik fark burada.</b> Doğrudan yazımda konum bildirimleri havuzun tamamını tutuyor ve " +
          "<b>operatörün olay oluşturma isteği de aynı kuyruğa giriyor</b> — yani saha cihazının burst'ü operasyon merkezini yavaşlatıyor. " +
          "Kafka yolunda ani yük topic'te birikir (tüketici gecikmesi artar), veritabanı sabit hızda yazmaya devam eder ve " +
          "operatör isteklerinin yanıt süresi <b>etkilenmez</b>.");
      }
    }
    ev(rate, "input", update);
    update();

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      var r = +rate.value;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);
      var half = H / 2;

      /* parçacık üretimi — hız kaydırıcıya bağlı */
      if (!reduce) {
        acc += dt;
        var interval = Math.max(28, 2400 / r * 8);
        while (acc > interval) { acc -= interval; parts.push({ p: 0, lane: 0 }); parts.push({ p: 0, lane: 1 }); }
      }
      parts = parts.filter(function (p) { return p.p < 1.05; });

      function lane(y0, y1, title, sub, col, isDirect) {
        var mid = (y0 + y1) / 2;
        var srcX = 66, dbX = W - 74;
        c.textAlign = "left"; c.font = "700 11px " + C.sans; c.fillStyle = col;
        c.fillText(title, 10, y0 + 16);
        c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
        c.fillText(sub, 10, y0 + 30);

        /* kaynak */
        rr(c, 10, mid - 12, 48, 24, 6); c.fillStyle = C.s2; c.fill();
        c.strokeStyle = C.line2; c.lineWidth = 1; c.stroke();
        c.textAlign = "center"; c.font = "9px " + C.mono; c.fillStyle = C.t2;
        c.fillText("cihaz", 34, mid + 3);

        /* orta bileşen */
        var midX = W * 0.5;
        if (!isDirect) {
          rr(c, midX - 44, mid - 18, 88, 36, 7);
          c.fillStyle = "rgba(46,211,183,.10)"; c.fill();
          c.strokeStyle = C.teal; c.lineWidth = 1.4; c.stroke();
          c.fillStyle = C.teal; c.font = "700 9.5px " + C.mono;
          c.fillText("KAFKA", midX, mid - 2);
          c.fillStyle = C.t3; c.font = "8px " + C.mono;
          c.fillText("6 bölüm · batch 500", midX, mid + 10);
        }

        /* veritabanı + havuz */
        var poolFill = Math.min(1, r / (POOL * 55));
        rr(c, dbX, mid - 20, 62, 40, 7);
        c.fillStyle = isDirect && poolFill >= 1 ? "rgba(248,113,113,.12)" : C.s2; c.fill();
        c.strokeStyle = isDirect && poolFill >= 1 ? C.danger : C.line2; c.lineWidth = 1.2; c.stroke();
        c.fillStyle = C.t2; c.font = "700 9px " + C.mono;
        c.fillText("POSTGRES", dbX + 31, mid - 4);
        /* havuz doluluk çubuğu */
        var bw = 46;
        rr(c, dbX + 8, mid + 4, bw, 7, 3); c.fillStyle = C.s3; c.fill();
        c.save(); rr(c, dbX + 8, mid + 4, bw, 7, 3); c.clip();
        c.fillStyle = isDirect ? (poolFill >= 1 ? C.danger : C.warn) : C.good;
        c.fillRect(dbX + 8, mid + 4, bw * (isDirect ? poolFill : Math.min(0.45, poolFill * 0.3)), 7);
        c.restore();

        /* hat */
        c.strokeStyle = C.line; c.lineWidth = 1;
        c.beginPath(); c.moveTo(58, mid); c.lineTo(dbX, mid); c.stroke();

        /* parçacıklar */
        parts.forEach(function (p) {
          if (p.lane !== (isDirect ? 0 : 1)) return;
          p.p += dt * 0.00055 * (isDirect ? (poolFill >= 1 ? 0.35 : 1) : 1);
          var x = lerp(58, dbX, Math.min(1, p.p));
          /* kafka yolunda parçacık topic'te kısa süre bekler */
          if (!isDirect && p.p > 0.42 && p.p < 0.58) x = midX;
          c.fillStyle = isDirect ? (poolFill >= 1 ? C.danger : C.acc2) : C.teal;
          c.beginPath(); c.arc(x, mid + (isDirect ? 0 : Math.sin(p.p * 12) * 3), 2.8, 0, Math.PI * 2); c.fill();
        });

        /* aşırı yükte kuyruk yığılması */
        if (isDirect && poolFill >= 1) {
          var qn = Math.min(14, Math.round((r / (POOL * 55) - 1) * 12));
          for (var i = 0; i < qn; i++) {
            c.fillStyle = C.danger;
            c.globalAlpha = 0.75;
            c.beginPath(); c.arc(dbX - 12 - i * 7, mid, 2.6, 0, Math.PI * 2); c.fill();
            c.globalAlpha = 1;
          }
          c.textAlign = "right"; c.font = "700 9px " + C.mono; c.fillStyle = C.danger;
          c.fillText("bağlantı kuyruğu", dbX - 12, mid - 14);
        }
      }

      lane(4, half - 4, "1 · Doğrudan veritabanına yazma", "her istek bir bağlantı tutar", C.danger, true);
      c.strokeStyle = C.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, half); c.lineTo(W, half); c.stroke();
      lane(half + 4, H - 4, "2 · Kafka üzerinden toplu yazma", "istek topic'e yazılır, 202 döner", C.teal, false);
    });
  }

  /* ═══════════════════════════ VIRTUAL THREAD ════════════════════════════ */
  function runVt() {
    var cv = $("#vtCv"); if (!cv) return;
    var nEl = $("#vtN"), nL = $("#vtNL"), modeBtn = $("#vtMode"), stat = $("#vtStat"), note = $("#vtNote");
    var virtual = false, last = 0;
    var POOL = 200;   /* Tomcat varsayılan platform thread havuzu */

    function update() {
      var n = +nEl.value;
      nL.textContent = n;
      modeBtn.innerHTML = '<svg><use href="#i-repeat"/></svg> ' +
        tpl(virtual ? "Model: VIRTUAL THREAD" : "Model: PLATFORM THREAD");
      modeBtn.classList.toggle("on", virtual);
      stat.textContent = tpl(virtual ? "virtual thread" : "platform havuzu");
      stat.className = "sbadge " + (virtual ? "g" : (n > POOL ? "r" : "w"));

      if (!virtual) {
        if (n <= POOL * 0.6) {
          note.innerHTML = tpl("<b>Havuz yetiyor.</b> {0} açık bağlantı, 200'lük havuzun {1}%'ini tutuyor. " +
            "Bu thread'lerin tek yaptığı beklemek — ama yine de her biri ~1 MB yığın alanı ayırıyor.",
            n, Math.round(n / POOL * 100));
        } else if (n <= POOL) {
          note.innerHTML = tpl("<b>Havuz doluyor.</b> {0} bağlantı 200'lük havuzun neredeyse tamamını tutuyor. " +
            "Yeni bir <b>normal API isteği</b> geldiğinde ona verilecek thread kalmayabilir — SSE bağlantıları " +
            "sıradan istekleri aç bırakır.", n);
        } else {
          note.innerHTML = tpl("<b>Havuz tükendi.</b> {0} bağlantı için yalnızca 200 thread var. Fazlası kuyrukta bekliyor: " +
            "operatör giriş yapamıyor, harita açılmıyor. Sunucunun CPU'su boşta — <b>darboğaz işlem gücü değil, thread sayısı.</b>", n);
        }
      } else {
        note.innerHTML = tpl("<b>Her bağlantı kendi virtual thread'inde.</b> {0} bağlantı, JVM'in " +
          "birkaç taşıyıcı (carrier) thread'i üzerinde çalışıyor. Bloke eden G/Ç sırasında taşıyıcı serbest kalır. " +
          "Yığın maliyeti kilobayt mertebesinde; 10.000 bağlantı da aynı modelle taşınır. " +
          "<b>Sınır:</b> veritabanı bağlantı havuzu hâlâ 20 — virtual thread yazma kapasitesini artırmaz.", n);
      }
    }
    ev(nEl, "input", update);
    ev(modeBtn, "click", function () { virtual = !virtual; update(); });
    update();

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;
      var n = +nEl.value;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var pad = 16;
      c.textAlign = "left"; c.font = "700 10.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText(virtual ? "VIRTUAL THREAD MODELİ" : "PLATFORM THREAD HAVUZU (200)", pad, 18);

      /* thread ızgarası */
      var gridTop = 30, gridH = H * 0.46;
      var cols = 40, rowsN = 5;
      var cw = (W - pad * 2) / cols, ch = gridH / rowsN;
      var shown = virtual ? Math.min(200, Math.ceil(n / 8)) : POOL;   /* virtualde taşıyıcılar az */
      var used = virtual ? Math.min(shown, 6) : Math.min(POOL, n);

      for (var i = 0; i < (virtual ? 8 : POOL); i++) {
        var r0 = (i / cols) | 0, c0 = i % cols;
        var x = pad + c0 * cw, y = gridTop + r0 * ch;
        var w = cw - 2, h = Math.min(14, ch - 3);
        var busy = i < used;
        rr(c, x, y, w, h, 2);
        c.fillStyle = busy ? (virtual ? C.good : (n > POOL ? C.danger : C.acc)) : C.s3;
        c.fill();
      }
      c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText(virtual
        ? tpl("{0} taşıyıcı thread · {1} virtual thread bunların üzerinde", used, n)
        : tpl("{0} / 200 thread meşgul", Math.min(POOL, n)) +
          (n > POOL ? tpl("  ·  {0} istek kuyrukta", n - POOL) : ""),
        pad, gridTop + gridH + 2);

      /* bağlantı görselleştirmesi */
      var by = gridTop + gridH + 22, bh = H - by - 24;
      var maxDots = 300;
      var showN = Math.min(maxDots, n);
      var dcols = Math.ceil(Math.sqrt(showN * (W / bh) * 0.8)) || 1;
      var drows = Math.ceil(showN / dcols);
      var dw = (W - pad * 2) / dcols, dh = Math.min(11, bh / Math.max(1, drows));

      for (var k = 0; k < showN; k++) {
        var rr0 = (k / dcols) | 0, cc0 = k % dcols;
        var x2 = pad + cc0 * dw + dw / 2, y2 = by + rr0 * dh + dh / 2;
        var served = virtual ? true : k < POOL;
        c.fillStyle = served ? (virtual ? C.teal : C.acc) : C.danger;
        c.globalAlpha = served ? 0.85 : 1;
        c.beginPath(); c.arc(x2, y2, 2.6, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }

      c.font = "9.5px " + C.mono;
      c.fillStyle = virtual ? C.teal : C.acc;
      c.fillText(virtual ? "tüm bağlantılar taşınıyor" : tpl("{0} bağlantı taşınıyor", Math.min(POOL, n)), pad, H - 8);
      if (!virtual && n > POOL) {
        c.textAlign = "right"; c.fillStyle = C.danger;
        c.fillText(tpl("{0} bağlantı bekliyor", n - POOL), W - pad, H - 8);
      }
    });
  }

  /* ═══════════════════════════ IDEMPOTENCY ═══════════════════════════════ */
  function runIdem() {
    var cv = $("#idemCv"); if (!cv) return;
    var stat = $("#idemStat"), note = $("#idemNote"), toggle = $("#idemToggle");
    var keyOn = false, rows = [], reqs = [], last = 0, key = "a3f9-71c2";

    function labels() {
      stat.textContent = tpl(keyOn ? "Idempotency-Key: AÇIK" : "Idempotency-Key: KAPALI");
      stat.className = "sbadge " + (keyOn ? "g" : "r");
      toggle.innerHTML = '<svg><use href="#i-key"/></svg> ' +
        tpl(keyOn ? "Anahtarı kapat" : "Anahtarı aç");
      toggle.classList.toggle("on", keyOn);
    }
    function reset() { rows = []; reqs = []; note.innerHTML = tpl(keyOn
      ? "<b>Anahtar açık.</b> Düğmeye üst üste basın: ilk istek kaydı oluşturur, sonrakiler aynı yanıtı döndürür."
      : "<b>Anahtar kapalıyken düğmeye üst üste basın.</b> Her basış yeni bir olay kaydı üretir."); }
    labels(); reset();

    ev(toggle, "click", function () { keyOn = !keyOn; labels(); reset(); });
    ev($("#idemReset"), "click", reset);
    ev($("#idemFire"), "click", function () {
      var replay = keyOn && rows.length > 0;
      reqs.push({ t: 0, replay: replay });
      if (!replay) rows.push({ code: "EVT-2026-" + String(1043 + rows.length).padStart(6, "0"), born: performance.now() });
      note.innerHTML = replay
        ? tpl("<b>Tekrar isteği yakalandı.</b> Aynı anahtar Redis'te <span class='chip-mono'>idem:{0}</span> " +
          "olarak zaten kayıtlı. Yeni kayıt oluşturulmadı; ilk isteğin yanıtı <span class='chip-mono'>Idempotent-Replay: true</span> " +
          "başlığıyla döndü. İstemci için sonuç aynı, veritabanı için tek satır.", "{userId}:" + key)
        : (keyOn
          ? tpl("<b>İlk istek.</b> Anahtar rezerve edildi, olay oluşturuldu ve yanıt saklandı. Şimdi tekrar basın.")
          : tpl("<b>{0}. kayıt oluşturuldu.</b> Anahtar olmadığı için sunucu bu isteğin daha önce " +
            "geldiğini bilemez. Operatörün çift tıklaması, sahaya iki ekip gönderilmesi demek.", rows.length));
    });

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var cliX = 40, srvX = W * 0.46, dbX = W - 60;
      var midY = 46;

      /* düğümler */
      function node(x, label, sub, col) {
        rr(c, x - 34, midY - 16, 68, 32, 7);
        c.fillStyle = C.s1; c.fill();
        c.strokeStyle = col; c.lineWidth = 1.3; c.stroke();
        c.textAlign = "center"; c.font = "700 9.5px " + C.mono; c.fillStyle = col;
        c.fillText(label, x, midY - 1);
        c.font = "8px " + C.mono; c.fillStyle = C.t3;
        c.fillText(sub, x, midY + 11);
      }
      c.strokeStyle = C.line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(cliX, midY); c.lineTo(dbX, midY); c.stroke();
      node(cliX, "TARAYICI", "operatör", C.acc2);
      node(srvX, keyOn ? "REDIS" : "API", keyOn ? "idem: " + key : "doğrudan", keyOn ? C.vio : C.t3);
      node(dbX, "POSTGRES", tpl("{0} kayıt", rows.length), rows.length > 1 ? C.danger : C.good);

      /* istekler */
      reqs.forEach(function (q) { q.t += dt; });
      reqs = reqs.filter(function (q) { return q.t < 2000; });
      reqs.forEach(function (q) {
        var p = clamp(q.t / 1100, 0, 1);
        var stop = q.replay ? srvX : dbX;
        var x = lerp(cliX, stop, p);
        c.fillStyle = q.replay ? C.vio : C.acc2;
        c.beginPath(); c.arc(x, midY, 3.6, 0, Math.PI * 2); c.fill();
        if (p >= 1 && q.replay) {
          c.save(); c.globalAlpha = clamp(2 - q.t / 900, 0, 1);
          c.strokeStyle = C.vio; c.lineWidth = 1.6;
          c.beginPath(); c.arc(srvX, midY, 22 + (q.t - 1100) * 0.02, 0, Math.PI * 2); c.stroke();
          c.restore();
          c.textAlign = "center"; c.font = "700 9px " + C.mono; c.fillStyle = C.vio;
          c.fillText("burada durdu", srvX, midY + 30);
        }
      });

      /* oluşan kayıtlar */
      c.textAlign = "left"; c.font = "700 10px " + C.mono; c.fillStyle = C.t3;
      c.fillText("event_assignments / traffic_events", 14, midY + 52);
      rows.forEach(function (r, i) {
        var y = midY + 62 + i * 24;
        if (y > H - 14) return;
        var w = Math.min(240, W - 28);
        rr(c, 14, y, w, 20, 5);
        c.fillStyle = rows.length > 1 ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.10)"; c.fill();
        c.strokeStyle = rows.length > 1 ? C.danger : C.good; c.lineWidth = 1; c.stroke();
        c.font = "10px " + C.mono; c.fillStyle = rows.length > 1 ? C.danger : C.good;
        c.fillText(r.code + "   ·   " + tpl(i === 0 ? "ilk kayıt" : "TEKRAR — istenmeyen"), 22, y + 14);
      });
      if (!rows.length) {
        c.font = "10px " + C.mono; c.fillStyle = C.line2;
        c.fillText("henüz kayıt yok", 14, midY + 76);
      }
    });
  }

  /* ═══════════════════════════ TOKEN BUCKET ══════════════════════════════ */
  function runRl() {
    var cv = $("#bucketCv"); if (!cv) return;
    var stat = $("#rlStat"), note = $("#rlNote"), tal = $("#rlTallies"), ruleEl = $("#rlRule"), ruleBtn = $("#rlRuleBtn");

    var RULES = [
      { k: "login", cap: 10, refill: 0.1667, d: "Giriş uç noktası — IP bazlı, kaba kuvvete karşı bilinçli olarak sıkı." },
      { k: "location", cap: 600, refill: 50, d: "Konum bildirimi — saha cihazının toplu gönderimini tolere edecek kadar geniş." },
      { k: "default", cap: 300, refill: 100, d: "Diğer tüm /api/** uçları." }
    ];
    var ri = 0, tokens = RULES[0].cap, log = [], last = 0, flash = 0, flashOk = true;

    function rule() { return RULES[ri]; }
    function labels() {
      ruleEl.textContent = rule().k;
      ruleBtn.innerHTML = '<svg><use href="#i-sliders"/></svg> ' +
        tpl("Kural: {0}", rule().k.toUpperCase());
      stat.textContent = tpl("kapasite {0} · {1}/sn", rule().cap, rule().refill);
      stat.className = "sbadge b";
    }
    function renderTallies() {
      tal.innerHTML = "";
      log.slice(-28).forEach(function (l) {
        var d = document.createElement("span");
        d.className = "tally " + (l ? "ok" : "no");
        d.textContent = l ? "✓" : "429";
        d.style.fontSize = l ? "12px" : "8.5px";
        tal.appendChild(d);
      });
    }
    function reset() {
      tokens = rule().cap; log = []; renderTallies();
      note.innerHTML = tpl("<b>{0}</b> Kova dolu başlar. Her istek bir token alır; kova boşsa istek " +
        "<span class='chip-mono'>429</span> ile reddedilir ve <span class='chip-mono'>Retry-After</span> başlığı döner.",
        tpl(rule().d));
    }
    function fire(n) {
      for (var i = 0; i < n; i++) {
        if (tokens >= 1) { tokens -= 1; log.push(true); flashOk = true; }
        else { log.push(false); flashOk = false; }
      }
      flash = 1;
      renderTallies();
      var denied = log.filter(function (l) { return !l; }).length;
      var passed = log.length - denied;
      if (denied > 0) {
        var wait = Math.ceil(1 / rule().refill);
        note.innerHTML = tpl("<b>{0} istek geçti, {1} istek reddedildi.</b> " +
          "Kova boşaldığı an sunucu <span class='chip-mono'>429</span> döndürüyor ve " +
          "<span class='chip-mono'>Retry-After: {2}</span> ile ne zaman tekrar denenebileceğini söylüyor. " +
          "İstek downstream'e hiç ulaşmıyor — veritabanı bu yükü <b>hiç görmüyor</b>.", passed, denied, wait);
      } else {
        note.innerHTML = tpl("<b>{0} istek geçti.</b> Kovada {1} token kaldı. " +
          "Kapasite kadar ani yük tolere edilir; sürdürülebilir hızı belirleyen dolum oranıdır.",
          passed, Math.floor(tokens));
      }
    }
    labels(); reset();

    ev(ruleBtn, "click", function () { ri = (ri + 1) % RULES.length; labels(); reset(); });
    ev($("#rlReset"), "click", reset);
    ev($("#rlOne"), "click", function () { fire(1); });
    ev($("#rlBurst"), "click", function () { fire(14); });

    loop(function (now) {
      var g = fit(cv); if (!g) return;
      var c = g.c, W = g.w, H = g.h;
      var dt = last ? Math.min(48, now - last) : 16; last = now;

      /* dolum — Redis sunucu saatiyle aynı mantık: geçen süre × oran */
      tokens = Math.min(rule().cap, tokens + (dt / 1000) * rule().refill);
      flash = Math.max(0, flash - dt / 600);

      c.fillStyle = C.canvas; c.fillRect(0, 0, W, H);

      var bx = W * 0.5 - 58, bw = 116;
      var by = 42, bh = H - by - 40;

      /* damlayan token */
      if (!reduce) {
        var dropT = (now / 900) % 1;
        c.fillStyle = C.teal; c.globalAlpha = 0.9;
        c.beginPath(); c.arc(bx + bw / 2, lerp(16, by - 4, dropT), 3, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
      c.textAlign = "center"; c.font = "9.5px " + C.mono; c.fillStyle = C.teal;
      c.fillText(tpl("+{0} token/sn", rule().refill), bx + bw / 2, 14);

      /* kova */
      var ratio = tokens / rule().cap;
      c.save();
      rr(c, bx, by, bw, bh, 10); c.clip();
      c.fillStyle = C.s1; c.fillRect(bx, by, bw, bh);
      var fh = bh * ratio;
      var lg = c.createLinearGradient(0, by + bh - fh, 0, by + bh);
      lg.addColorStop(0, "rgba(46,211,183,.55)");
      lg.addColorStop(1, "rgba(79,141,255,.35)");
      c.fillStyle = lg;
      c.fillRect(bx, by + bh - fh, bw, fh);
      /* yüzey dalgası */
      if (!reduce && ratio > 0.02) {
        c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 1.4;
        c.beginPath();
        for (var x = 0; x <= bw; x += 4) {
          var yy = by + bh - fh + Math.sin((x / 18) + now / 320) * 2.2;
          x === 0 ? c.moveTo(bx + x, yy) : c.lineTo(bx + x, yy);
        }
        c.stroke();
      }
      c.restore();
      rr(c, bx, by, bw, bh, 10);
      c.strokeStyle = flash > 0 ? (flashOk ? C.good : C.danger) : C.line2;
      c.lineWidth = flash > 0 ? 2.4 : 1.2; c.stroke();

      /* kapasite işareti */
      c.textAlign = "right"; c.font = "9px " + C.mono; c.fillStyle = C.t3;
      c.fillText(tpl("kapasite {0}", rule().cap), bx - 10, by + 12);
      c.fillText("0", bx - 10, by + bh);

      /* token sayısı */
      c.textAlign = "center";
      c.font = "800 26px " + C.mono;
      c.fillStyle = tokens < 1 ? C.danger : C.t1;
      c.fillText(Math.floor(tokens), bx + bw / 2, by + bh / 2 + 2);
      c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText("token", bx + bw / 2, by + bh / 2 + 18);

      /* sağda gelen istekler */
      c.textAlign = "left"; c.font = "700 10px " + C.mono; c.fillStyle = C.t3;
      c.fillText("SON İSTEKLER", bx + bw + 26, by + 4);
      var recent = log.slice(-12);
      recent.forEach(function (l, i) {
        var y = by + 16 + i * 17;
        if (y > H - 34) return;
        c.fillStyle = l ? C.good : C.danger;
        c.beginPath(); c.arc(bx + bw + 32, y, 3.2, 0, Math.PI * 2); c.fill();
        c.font = "9.5px " + C.mono; c.fillStyle = l ? C.t2 : C.danger;
        c.fillText(l ? "200 OK" : "429 Too Many Requests", bx + bw + 42, y + 3.5);
      });

      /* solda kural özeti */
      c.textAlign = "left"; c.font = "700 10px " + C.mono; c.fillStyle = C.t3;
      c.fillText("KURAL", 12, by + 4);
      c.font = "9.5px " + C.mono; c.fillStyle = C.acc2;
      c.fillText(rule().k, 12, by + 20);
      c.fillStyle = C.t3;
      c.fillText(tpl("capacity {0}", rule().cap), 12, by + 36);
      c.fillText(tpl("refill {0}/sn", rule().refill), 12, by + 50);
      c.fillText(rule().k === "login" ? "anahtar: IP" : "anahtar: kullanıcı", 12, by + 66);

      c.textAlign = "center"; c.font = "9.5px " + C.mono; c.fillStyle = C.t3;
      c.fillText("Redis Lua script'i bu üç adımı bölünmeden yapar: oku → hesapla → yaz", W / 2, H - 12);
    });
  }

  /* Dil değişince mevcut slayt yeniden kurulur. Statik metinleri /deck-i18n.js
     yerinde çevirir; ancak çalışma anında üretilen notlar, rozetler ve düğme
     etiketleri yalnızca sahne yeniden çalıştırıldığında yeni dille yazılır. */
  if (window.DeckI18n && window.DeckI18n.onChange) {
    window.DeckI18n.onChange(function () {
      buildOverview();
      markOverviewCurrent();
      /* nokta ipuçları yalnızca bir kez üretiliyor; dil değişince tazelenir */
      dots.forEach(function (d, i) {
        d.title = (i + 1) + " · " + tpl(slides[i].dataset.title || "");
      });
      elStageName.textContent = tpl(STAGE_NAMES[slides[index].dataset.lv || "0"]);
      onEnter(slides[index], true);
    });
  }

  /* ------------------------------------------------------------- başlangıç - */
  var m = /^#s(\d+)$/.exec(window.location.hash);
  var start = m ? Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1)) : 0;
  slides[0].classList.add("active");
  go(start);
})();
