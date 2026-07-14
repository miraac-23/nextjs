/* ============================================================
   Sunum Motoru — render, navigasyon, ajanda, genel bakış
   ============================================================ */
(function () {
  "use strict";

  // ---------- Java syntax highlighter ----------
  const KW = new Set("abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record sealed permits yield non-sealed when".split(" "));
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlight(code) {
    let out = "", i = 0; const n = code.length;
    while (i < n) {
      const c = code[i];
      if (c === "/" && code[i + 1] === "/") { let j = code.indexOf("\n", i); if (j < 0) j = n; out += `<span class="tok-com">${esc(code.slice(i, j))}</span>`; i = j; continue; }
      if (c === "/" && code[i + 1] === "*") { let j = code.indexOf("*/", i); j = j < 0 ? n : j + 2; out += `<span class="tok-com">${esc(code.slice(i, j))}</span>`; i = j; continue; }
      if (c === "#") { let j = code.indexOf("\n", i); if (j < 0) j = n; out += `<span class="tok-com">${esc(code.slice(i, j))}</span>`; i = j; continue; }
      if (c === '"') { let j = i + 1; while (j < n && !(code[j] === '"' && code[j - 1] !== "\\")) j++; j++; out += `<span class="tok-str">${esc(code.slice(i, Math.min(j, n)))}</span>`; i = j; continue; }
      if (c === "'") { let j = i + 1; while (j < n && !(code[j] === "'" && code[j - 1] !== "\\")) j++; j++; out += `<span class="tok-str">${esc(code.slice(i, Math.min(j, n)))}</span>`; i = j; continue; }
      if (c === "@") { let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(code[j])) j++; out += `<span class="tok-ann">${esc(code.slice(i, j))}</span>`; i = j; continue; }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i; while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
        const w = code.slice(i, j);
        const after = code.slice(j).match(/^\s*\(/);
        if (KW.has(w)) out += `<span class="tok-key">${w}</span>`;
        else if (/^[A-Z]/.test(w)) out += `<span class="tok-type">${esc(w)}</span>`;
        else if (after) out += `<span class="tok-fn">${esc(w)}</span>`;
        else out += esc(w);
        i = j; continue;
      }
      if (/[0-9]/.test(c)) { let j = i; while (j < n && /[0-9._a-fA-FxX]/.test(code[j])) j++; out += `<span class="tok-num">${esc(code.slice(i, j))}</span>`; i = j; continue; }
      out += esc(c); i++;
    }
    return out;
  }

  // ---------- inline markdown (bold + `code`) ----------
  function inl(t) {
    return esc(t)
      .replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>")
      .replace(/&lt;br&gt;/g, "<br>")
      .replace(/`([^`]+)`/g, '<code style="font-family:var(--mono);font-size:.92em;background:rgba(255,255,255,.08);padding:1px 6px;border-radius:5px;">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  // ---------- block renderers ----------
  function renderBlock(b) {
    switch (b.type) {
      case "lead": return `<p class="lead">${inl(b.text)}</p>`;
      case "heading": return `<div class="block-title">${inl(b.text)}</div>`;
      case "framework":
        return `<div class="fw-grid">${b.items.map(it => `
          <div class="fw-card">
            <span class="fw-ico">${it.ico || "▹"}</span>
            <div class="fw-label">${esc(it.label)}</div>
            <div class="fw-text">${inl(it.text)}</div>
          </div>`).join("")}</div>`;
      case "bullets":
        return `${b.title ? `<div class="block-title">${inl(b.title)}</div>` : ""}
          <ul class="bullets">${b.items.map(x => `<li>${inl(x)}</li>`).join("")}</ul>`;
      case "twocol":
        return `<div class="twocol">
          <div class="col-card pos"><h4>✓ ${esc(b.pos.title)}</h4><ul>${b.pos.items.map(x => `<li>${inl(x)}</li>`).join("")}</ul></div>
          <div class="col-card neg"><h4>✕ ${esc(b.neg.title)}</h4><ul>${b.neg.items.map(x => `<li>${inl(x)}</li>`).join("")}</ul></div>
        </div>`;
      case "code":
        return `<div class="code-wrap">
          <div class="code-head"><span class="code-dots"><i></i><i></i><i></i></span><span class="code-cap">${esc(b.cap || "Java")}</span></div>
          <pre class="code">${highlight(b.code)}</pre>
        </div>`;
      case "table":
        return `<div class="tbl-wrap"><table class="cmp">
          <thead><tr>${b.headers.map(h => `<th>${inl(h)}</th>`).join("")}</tr></thead>
          <tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>`;
      case "callout":
        return `<div class="callout ${b.variant || "info"}"><span class="ic">${b.icon || "💡"}</span><div class="ct">${inl(b.text)}</div></div>`;
      case "tags":
        return `<div class="tags">${b.items.map(t => `<span class="tag">${inl(t)}</span>`).join("")}</div>`;
      case "qa":
        return `<div class="qa-wrap" data-qa>
          <div class="qa-head"><span class="qa-badge">S–C</span> Soru &amp; Cevap
            <span class="qa-hint">soruya tıkla → cevap açılır</span>
            <button class="qa-all" type="button" title="Tüm cevapları aç/kapat">Tümünü aç</button>
          </div>
          ${b.items.map(it => `<div class="qa-item" data-qaitem>
            <button class="qa-q" type="button" aria-expanded="false">
              <span class="qa-mark q">S</span><span class="qa-qtext">${inl(it.q)}</span>
              <span class="qa-toggle" aria-hidden="true">＋</span>
            </button>
            <div class="qa-a" hidden><span class="qa-mark a">C</span><span>${inl(it.a)}</span></div>
          </div>`).join("")}
        </div>`;
      case "stats":
        return `<div class="stat-row">${b.items.map(s => `<div class="stat"><div class="big">${esc(s.big)}</div><div class="lbl">${inl(s.lbl)}</div></div>`).join("")}</div>`;
      case "concept": {
        const rows = [
          { k: "Nedir?", ic: "🔎", v: b.what, cls: "what" },
          { k: "Nereden gelir?", ic: "🧭", v: b.origin, cls: "origin" },
          { k: "Nasıl kullanılır?", ic: "🛠️", v: b.use, cls: "use" }
        ].filter(r => r.v);
        return `<div class="concept">
          <div class="concept-head"><span class="concept-badge">KAVRAM</span>${b.term ? `<span class="concept-term">${inl(b.term)}</span>` : ""}</div>
          <div class="concept-grid">${rows.map(r => `
            <div class="concept-cell ${r.cls}">
              <div class="concept-k"><span class="concept-ic">${r.ic}</span>${r.k}</div>
              <div class="concept-v">${inl(r.v)}</div>
            </div>`).join("")}</div>
        </div>`;
      }
      case "recap":
        return `<div class="recap">
          <div class="recap-head"><span class="recap-ic">🎒</span>${inl(b.title || "Aklında Kalsın")}</div>
          <ol class="recap-list">${b.items.map(x => `<li>${inl(x)}</li>`).join("")}</ol>
        </div>`;
      case "glossary":
        return `${b.title ? `<div class="block-title">${inl(b.title)}</div>` : ""}
          <div class="gloss">${b.items.map(g => `<div class="gloss-item"><span class="gloss-term">${inl(g.t)}</span><span class="gloss-def">${inl(g.d)}</span></div>`).join("")}</div>`;
      case "split":
        return `<div class="split"><div>${b.left.map(renderBlock).join("")}</div><div>${b.right.map(renderBlock).join("")}</div></div>`;
      default: return "";
    }
  }

  // ---------- build linear slide list ----------
  const flat = []; // {cat, section, kind, ...}
  flat.push({ kind: "cover", cat: "intro", section: "Giriş" });
  if (PRESENTATION.roadmap) flat.push({ kind: "roadmap", cat: "intro", section: "Yol Haritası" });
  PRESENTATION.sections.forEach((sec, si) => {
    flat.push({ kind: "section", cat: sec.cat, section: sec.title, sec, si });
    sec.slides.forEach(sl => flat.push({ kind: "content", cat: sec.cat, section: sec.title, sl }));
  });
  flat.push({ kind: "end", cat: "intro", section: "Kapanış" });

  // ---------- render slides into stage ----------
  const stage = document.getElementById("stage");
  function slideHTML(item, idx) {
    if (item.kind === "cover") {
      const c = PRESENTATION.cover;
      return `<section class="slide cover" data-cat="intro">
        <div class="kbox">${c.pills.map(p => `<span>${esc(p)}</span>`).join("")}</div>
        <h1>${c.title}</h1>
        <p class="tagline">${inl(c.tagline)}</p>
        <div class="meta">${c.meta.map(m => `<div><b>${esc(m.v)}</b>${esc(m.k)}</div>`).join("")}</div>
        <div class="startcue">Başlamak için → tuşuna bas</div>
      </section>`;
    }
    if (item.kind === "roadmap") {
      const r = PRESENTATION.roadmap;
      const colors = { java: "var(--java)", version: "var(--version)", spring: "var(--spring)", boot: "var(--boot)", compare: "var(--compare)" };
      const stops = PRESENTATION.sections.map((s, si) => {
        const di = flat.findIndex(f => f.kind === "section" && f.si === si);
        const shortT = s.rmLabel || (s.kicker.includes("·") ? s.kicker.split("·").slice(1).join("·").trim() : s.title);
        const col = colors[s.cat] || "var(--accent)";
        const delay = (0.28 + si * 0.13).toFixed(2);
        const topicList = (s.topics || []).map(t => `<li>${esc(t.replace(/\s*\(.*?\)\s*$/, ""))}</li>`).join("");
        const more = s.slides.length > (s.topics || []).length
          ? `<li class="rm-more-li"><button class="rm-more" data-sec="${si}" title="Tüm başlıkları gör">⋯ tüm başlıklar (${s.slides.length})</button></li>`
          : "";
        return `<div class="rm-stop" data-go="${di}" role="button" tabindex="0" style="--rm-c:${col};animation-delay:${delay}s">
            <div class="rm-node"><span class="rm-num">${String(si + 1).padStart(2, "0")}</span><span class="rm-ico">${s.icon}</span></div>
            <div class="rm-ttl">${esc(shortT)}</div>
            <div class="rm-desc">${s.slides.length} slayt</div>
            <ul class="rm-subs">${topicList}${more}</ul>
          </div>`;
      }).join("");
      return `<section class="slide roadmap-slide" data-cat="intro">
        <div class="slide-scroll">
          ${r.eyebrow ? `<span class="eyebrow"><span class="dot"></span>${esc(r.eyebrow)}</span>` : ""}
          <h2 class="s-title">${r.title}</h2>
          ${r.subtitle ? `<p class="s-sub">${inl(r.subtitle)}</p>` : ""}
          <div class="rm-grid">${stops}</div>
        </div>
      </section>`;
    }
    if (item.kind === "section") {
      const s = item.sec;
      return `<section class="slide section-slide" data-cat="${s.cat}">
        <div class="sec-index">${String(item.si + 1).padStart(2, "0")}</div>
        <div class="sec-kicker">${esc(s.kicker)}</div>
        <h2 class="sec-title gradient-text">${esc(s.title)}</h2>
        <p class="sec-desc">${inl(s.desc)}</p>
        <div class="sec-topics">${s.topics.map(t => `<span>${esc(t)}</span>`).join("")}</div>
      </section>`;
    }
    if (item.kind === "end") {
      const e = PRESENTATION.end;
      return `<section class="slide cover" data-cat="intro">
        <div class="kbox">${e.pills.map(p => `<span>${esc(p)}</span>`).join("")}</div>
        <h1 class="gradient-text">${e.title}</h1>
        <p class="tagline">${inl(e.tagline)}</p>
        <div class="meta">${e.meta.map(m => `<div><b>${esc(m.v)}</b>${esc(m.k)}</div>`).join("")}</div>
      </section>`;
    }
    const sl = item.sl;
    return `<section class="slide" data-cat="${item.cat}">
      <div class="slide-scroll">
        ${sl.eyebrow ? `<span class="eyebrow"><span class="dot"></span>${esc(sl.eyebrow)}</span>` : ""}
        ${sl.title ? `<h2 class="s-title">${inl(sl.title)}</h2>` : ""}
        ${sl.sub ? `<p class="s-sub">${inl(sl.sub)}</p>` : ""}
        ${(sl.blocks || []).map(renderBlock).join("")}
      </div>
    </section>`;
  }
  stage.innerHTML = flat.map(slideHTML).join("");
  const slides = Array.from(stage.querySelectorAll(".slide"));
  stage.querySelectorAll(".rm-stop[data-go]").forEach(el => el.onclick = () => show(+el.dataset.go));

  // ---------- "tüm başlıklar" modalı (yol haritası) ----------
  const topicsModal = document.getElementById("topicsModal");
  const tmTitle = document.getElementById("tmTitle");
  const tmList = document.getElementById("tmList");
  function openTopics(si) {
    const sec = PRESENTATION.sections[si];
    const di = flat.findIndex(f => f.kind === "section" && f.si === si);
    tmTitle.textContent = sec.title + " — Tüm Başlıklar (" + sec.slides.length + ")";
    tmList.innerHTML = sec.slides.map((sl, k) => {
      const gi = di + 1 + k;
      const label = sl.nav || sl.title || sl.eyebrow || "Slayt";
      return `<button class="tm-item" data-go="${gi}"><span class="tm-no">${String(k + 1).padStart(2, "0")}</span><span>${esc(label)}</span></button>`;
    }).join("");
    tmList.querySelectorAll(".tm-item[data-go]").forEach(el => el.onclick = () => { const g = +el.dataset.go; closeTopics(); show(g); });
    topicsModal.classList.add("show"); topicsModal.setAttribute("aria-hidden", "false");
  }
  function closeTopics() { topicsModal.classList.remove("show"); topicsModal.setAttribute("aria-hidden", "true"); }
  document.getElementById("tmClose").onclick = closeTopics;
  topicsModal.onclick = (e) => { if (e.target === topicsModal) closeTopics(); };
  stage.querySelectorAll(".rm-more[data-sec]").forEach(el => el.onclick = (e) => { e.stopPropagation(); openTopics(+el.dataset.sec); });

  // ---------- interaktif Soru–Cevap (tıkla → cevabı aç) ----------
  function toggleQA(item, force) {
    const ans = item.querySelector(".qa-a");
    const q = item.querySelector(".qa-q");
    const tog = item.querySelector(".qa-toggle");
    const open = force === undefined ? ans.hasAttribute("hidden") : force;
    if (open) { ans.removeAttribute("hidden"); q.setAttribute("aria-expanded", "true"); item.classList.add("open"); if (tog) tog.textContent = "－"; }
    else { ans.setAttribute("hidden", ""); q.setAttribute("aria-expanded", "false"); item.classList.remove("open"); if (tog) tog.textContent = "＋"; }
  }
  stage.querySelectorAll(".qa-q").forEach(q => {
    q.addEventListener("click", () => toggleQA(q.closest("[data-qaitem]")));
  });
  stage.querySelectorAll(".qa-all").forEach(btn => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest("[data-qa]");
      const items = Array.from(wrap.querySelectorAll("[data-qaitem]"));
      const anyClosed = items.some(it => it.querySelector(".qa-a").hasAttribute("hidden"));
      items.forEach(it => toggleQA(it, anyClosed));
      btn.textContent = anyClosed ? "Tümünü kapat" : "Tümünü aç";
    });
  });

  // ---------- navigation ----------
  let cur = 0;
  const progressFill = document.getElementById("progressFill");
  const curNo = document.getElementById("curNo");
  const totNo = document.getElementById("totNo");
  const sectionChip = document.getElementById("sectionChip");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  totNo.textContent = slides.length;

  function show(i, push) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].classList.remove("active");
    cur = i;
    slides[cur].classList.add("active");
    const sc = slides[cur].querySelector(".slide-scroll");
    if (sc) sc.scrollTop = 0;
    progressFill.style.width = ((i) / (slides.length - 1)) * 100 + "%";
    curNo.textContent = i + 1;
    sectionChip.textContent = flat[i].section;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === slides.length - 1;
    updateAgenda();
    updateOverview();
    if (i >= 1) maybeAutoStartTimer(); // ilk slayttan ilerleyince sayaç başlar
    if (push !== false) history.replaceState(null, "", "#" + (i + 1));
  }
  function next() { show(cur + 1); }
  function prev() { show(cur - 1); }

  prevBtn.onclick = prev;
  nextBtn.onclick = next;

  // ---------- keyboard ----------
  document.addEventListener("keydown", e => {
    // Odak bir Soru butonundaysa boşluk/enter cevabı açsın, slaytı ilerletmesin
    const onBtn = e.target && e.target.tagName === "BUTTON";
    if (onBtn && (e.key === " " || e.key === "Enter")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { prev(); }
    else if (e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "Home") { show(0); }
    else if (e.key === "End") { show(slides.length - 1); }
    else if (e.key.toLowerCase() === "m") { toggleSidebar(); }
    else if (e.key.toLowerCase() === "o") { toggleOverview(); }
    else if (e.key.toLowerCase() === "f") { toggleFs(); }
    else if (e.key.toLowerCase() === "t") { toggleTimer(); }
    else if (e.key.toLowerCase() === "r") { resetTimer(); }
    else if (e.key === "Escape") { closeAll(); }
  });

  // ---------- touch ----------
  let tx = 0, ty = 0;
  stage.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
  }, { passive: true });

  // ---------- sidebar / agenda ----------
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const agenda = document.getElementById("agenda");
  function buildAgenda() {
    let html = "";
    PRESENTATION.sections.forEach((sec, si) => {
      const startIdx = flat.findIndex(f => f.kind === "section" && f.si === si);
      html += `<div class="ag-group"><div class="ag-cat">${esc(sec.kicker)}</div>`;
      html += `<div class="ag-item" data-go="${startIdx}"><span class="ag-ico">${sec.icon}</span><span>${esc(sec.title)}</span><span class="ag-no">${startIdx + 1}</span></div>`;
      sec.slides.forEach((sl, k) => {
        const idx = startIdx + 1 + k;
        const label = sl.nav || sl.title || sl.eyebrow || "Slayt";
        html += `<div class="ag-item" data-go="${idx}" style="padding-left:18px"><span class="ag-ico" style="background:transparent;font-size:11px;color:var(--text-faint)">${k + 1}</span><span>${esc(label)}</span></div>`;
      });
      html += `</div>`;
    });
    agenda.innerHTML = html;
    agenda.querySelectorAll(".ag-item").forEach(el => el.onclick = () => { show(+el.dataset.go); closeSidebar(); });
  }
  function updateAgenda() {
    agenda.querySelectorAll(".ag-item").forEach(el => el.classList.toggle("current", +el.dataset.go === cur));
    const c = agenda.querySelector(".ag-item.current");
    if (c && sidebar.classList.contains("open")) c.scrollIntoView({ block: "nearest" });
  }
  function openSidebar() { sidebar.classList.add("open"); sidebar.setAttribute("aria-hidden", "false"); scrim.classList.add("show"); updateAgenda(); }
  function closeSidebar() { sidebar.classList.remove("open"); sidebar.setAttribute("aria-hidden", "true"); scrim.classList.remove("show"); }
  function toggleSidebar() { sidebar.classList.contains("open") ? closeSidebar() : openSidebar(); }
  document.getElementById("menuBtn").onclick = toggleSidebar;
  document.getElementById("closeSidebar").onclick = closeSidebar;
  scrim.onclick = closeAll;

  // ---------- overview ----------
  const overview = document.getElementById("overview");
  const overviewGrid = document.getElementById("overviewGrid");
  const catColor = { intro: "var(--accent)", java: "var(--java)", version: "var(--version)", spring: "var(--spring)", boot: "var(--boot)", compare: "var(--compare)" };
  function buildOverview() {
    const groups = [];
    let g = null;
    flat.forEach((f, i) => {
      if (f.kind === "cover" || f.kind === "roadmap") {
        if (!g || g.key !== "intro") { g = { key: "intro", title: "Giriş", icon: "✨", cat: "intro", items: [] }; groups.push(g); }
      } else if (f.kind === "section") {
        g = { key: "sec" + f.si, title: f.sec.title, icon: f.sec.icon, cat: f.cat, items: [] }; groups.push(g);
      } else if (f.kind === "end") {
        g = { key: "end", title: "Kapanış", icon: "🎬", cat: "intro", items: [] }; groups.push(g);
      }
      let t = f.section;
      if (f.kind === "content") t = f.sl.nav || f.sl.title || f.sl.eyebrow || "Slayt";
      else if (f.kind === "section") t = "▸ Bölüm girişi";
      else if (f.kind === "cover") t = "Kapak";
      else if (f.kind === "roadmap") t = "Yol Haritası";
      else if (f.kind === "end") t = "Kapanış";
      if (g) g.items.push({ i, t, cat: f.cat });
    });
    overviewGrid.innerHTML = groups.map(gr => `
      <div class="ov-group">
        <div class="ov-group-head" style="--g-c:${catColor[gr.cat] || "var(--accent)"}">
          <span class="ov-group-ico">${gr.icon}</span>
          <span class="ov-group-ttl">${esc(gr.title)}</span>
          <span class="ov-group-count">${gr.items.length} slayt</span>
        </div>
        <div class="ov-group-grid">
          ${gr.items.map(it => `<div class="ov-card" data-go="${it.i}">
            <div class="ov-no">${String(it.i + 1).padStart(2, "0")}</div>
            <div class="ov-t">${esc(it.t)}</div>
            <div class="ov-bar" style="background:${catColor[it.cat] || "var(--accent)"}"></div>
          </div>`).join("")}
        </div>
      </div>`).join("");
    overviewGrid.querySelectorAll(".ov-card").forEach(el => el.onclick = () => { show(+el.dataset.go); closeOverview(); });
  }
  function updateOverview() { overviewGrid.querySelectorAll(".ov-card").forEach(el => el.classList.toggle("current", +el.dataset.go === cur)); }
  function openOverview() { overview.classList.add("show"); overview.setAttribute("aria-hidden", "false"); updateOverview(); const c = overviewGrid.querySelector(".ov-card.current"); if (c) c.scrollIntoView({ block: "center" }); }
  function closeOverview() { overview.classList.remove("show"); overview.setAttribute("aria-hidden", "true"); }
  function toggleOverview() { overview.classList.contains("show") ? closeOverview() : openOverview(); }
  document.getElementById("overviewBtn").onclick = toggleOverview;
  document.getElementById("closeOverview").onclick = closeOverview;

  function closeAll() { closeSidebar(); closeOverview(); closeTopics(); }

  // ---------- fullscreen ----------
  function toggleFs() { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); else document.exitFullscreen && document.exitFullscreen(); }
  document.getElementById("fsBtn").onclick = toggleFs;

  // ---------- başa dön (home) ----------
  document.getElementById("brandHome").onclick = () => { closeAll(); show(0); };

  // ---------- sunum sayacı (timer) ----------
  const timerEl = document.getElementById("timer");
  const timerTime = document.getElementById("timerTime");
  const timerToggleBtn = document.getElementById("timerToggle");
  const timerResetBtn = document.getElementById("timerReset");
  let timerSec = 0, timerHandle = null, timerStarted = false;
  function fmtTime(s) { const m = Math.floor(s / 60), ss = s % 60; return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0"); }
  function renderTimer() { timerTime.textContent = fmtTime(timerSec); }
  function startTimer() {
    if (timerHandle) return;
    timerStarted = true;
    timerEl.classList.remove("paused");
    timerToggleBtn.textContent = "❚❚"; timerToggleBtn.title = "Duraklat (T)";
    timerHandle = setInterval(() => { timerSec++; renderTimer(); }, 1000);
  }
  function pauseTimer() {
    timerEl.classList.add("paused");
    timerToggleBtn.textContent = "▶"; timerToggleBtn.title = "Başlat (T)";
    clearInterval(timerHandle); timerHandle = null;
  }
  function toggleTimer() { timerHandle ? pauseTimer() : startTimer(); }
  function resetTimer() { timerSec = 0; renderTimer(); }
  // İlk ileri geçişte (sunum başlayınca) sayacı başlat; ▶ ikonuyla elle de başlatılabilir.
  function maybeAutoStartTimer() { if (!timerStarted) startTimer(); }
  timerToggleBtn.onclick = toggleTimer;
  timerResetBtn.onclick = resetTimer;
  renderTimer();
  pauseTimer(); // başta DURUR (00:00); ilk ilerlemede veya ▶ ile başlar

  // ---------- hint auto-hide ----------
  const hint = document.getElementById("hint");
  setTimeout(() => { hint.style.opacity = "0"; }, 6000);

  // ---------- init ----------
  buildAgenda();
  buildOverview();
  const startHash = parseInt(location.hash.replace("#", ""), 10);
  slides[0].classList.add("active");
  if (startHash >= 1 && startHash <= slides.length) show(startHash - 1, false);
  else show(0, false);

  // Hash ile derin bağlantı / gezinme (programatik replaceState hashchange tetiklemez)
  window.addEventListener("hashchange", () => {
    const n = parseInt(location.hash.replace("#", ""), 10);
    if (n >= 1 && n <= slides.length && n - 1 !== cur) show(n - 1, false);
  });
})();
