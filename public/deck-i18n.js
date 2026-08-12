/* ============================================================================
   Sunum uygulamaları için ortak dil katmanı.

   Tasarım kararları:
   - Sunumlar siteyle AYNI ORIGIN'de olduğu için dil tercihi doğrudan
     localStorage('lang') üzerinden okunur; ?lang= parametresi ve ana sayfadan
     gelen postMessage de desteklenir.
   - Çeviri BLOK düzeyindedir: sözlük, bir öğenin normalize edilmiş innerHTML'i
     → İngilizce innerHTML biçiminde tutulur. Metin düğümü düzeyinde çeviri
     yapılmaz; çünkü satır içi <b>/<span> etiketleri cümleyi parçalara böler ve
     Türkçe (SOV) → İngilizce (SVO) sıra farkı yüzünden parça parça çeviri
     bozuk sonuç verir.
   - Sözlükte karşılığı olmayan blok OLDUĞU GİBİ kalır; sözlük eksik olsa da
     sunum bozulmaz, kısmi çeviriyle çalışır.

   Kullanım:
     <script src="/deck-i18n.js"></script>
     <script src="i18n.en.js"></script>        // DECK_EN sözlüğünü tanımlar
     <script>DeckI18n.init({ dict: window.DECK_EN })</script>
   ========================================================================== */
(function (global) {
  'use strict';

  var LANG_KEY = 'lang';
  var lang = 'tr';
  var dict = {};
  var listeners = [];
  var doc = global.document;

  /* ----------------------------- dil çözümü ----------------------------- */

  function readLang() {
    try {
      var q = new URLSearchParams(global.location.search).get('lang');
      if (q === 'en' || q === 'tr') return q;
    } catch (e) { /* URLSearchParams yoksa geç */ }
    try {
      var s = global.localStorage.getItem(LANG_KEY);
      if (s === 'en' || s === 'tr') return s;
    } catch (e) { /* localStorage kapalıysa geç */ }
    return 'tr';
  }

  function persist(next) {
    try { global.localStorage.setItem(LANG_KEY, next); } catch (e) { /* yoksay */ }
  }

  /* ------------------------------ normalize ------------------------------ */

  /**
   * Sözlük anahtarı bloğun DÜZ METNİdir (innerHTML değil).
   * Neden: kaynak HTML ile tarayıcının ürettiği innerHTML arasında `&` → `&amp;`,
   * tırnak biçimi gibi farklar var; düz metin iki tarafta da aynı olduğu için
   * anahtar eşleşmesi bu farklardan etkilenmez. Değer ise İngilizce HTML'dir.
   */
  function norm(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  /** Verilen düz metnin aktif dildeki HTML karşılığı; sözlükte yoksa null. */
  function lookup(text) {
    if (lang !== 'en') return null;
    var hit = dict[norm(text)];
    return hit == null ? null : hit;
  }

  /** Düz metin çevirisi (nitelikler ve çıplak metin düğümleri için). */
  function t(text) {
    var hit = lookup(text);
    if (hit == null) return text;
    // Nitelik/metin bağlamında HTML etiketi istemeyiz.
    return hit.replace(/<[^>]*>/g, '');
  }

  /* --------------------------- blok çevirisi ---------------------------- */

  // İçine hiç girilmeyecek öğeler (kod, tuval, dil düğmesi…).
  // KBD burada DEĞİL: tuş ipucu satırı ("← → gezin · O tüm slaytlar") tek blok olarak
  // çevrilebilsin diye <kbd> satır içi kabul edilir.
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, CANVAS: 1, TEXTAREA: 1 };
  // Bir bloğun "yaprak" sayılmasını engellemeyen satır içi etiketler.
  var INLINE = {
    B: 1, I: 1, EM: 1, STRONG: 1, SPAN: 1, SMALL: 1, U: 1, S: 1, SUB: 1, SUP: 1,
    BR: 1, A: 1, MARK: 1, ABBR: 1, CODE: 1, KBD: 1, VAR: 1, TIME: 1, WBR: 1,
  };
  var ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];

  function isSkipped(el) {
    return SKIP[el.tagName] || el.hasAttribute('data-no-i18n');
  }

  /** Öğe yalnızca satır içi çocuklar barındırıyorsa çevrilebilir bir "blok"tur. */
  function isLeafBlock(el) {
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      if (!INLINE[kids[i].tagName]) return false;
      if (isSkipped(kids[i])) return false;
    }
    return el.textContent.trim().length > 0;
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var store = '__tr_' + a;
      if (el[store] == null) el[store] = el.getAttribute(a);
      el.setAttribute(a, lang === 'en' ? t(el[store]) : el[store]);
    }
  }

  function visit(el) {
    if (el.nodeType !== 1) return;
    // data-no-i18n TAM muafiyettir: nitelikleri de çevrilmez.
    if (el.hasAttribute('data-no-i18n')) return;
    // SKIP listesi öğenin İÇERİĞİ için geçerlidir (kod, tuval…). Nitelikleri —
    // özellikle ekran okuyucuya giden aria-label — yine de çevrilmelidir.
    translateAttrs(el);
    if (SKIP[el.tagName]) return;

    if (isLeafBlock(el)) {
      // Orijinali (hem HTML hem metin) sakla ki dil geri alınabilsin.
      //
      // Sunum motoru aynı bloğu çalışma anında YENİDEN YAZABİLİR (demo notları,
      // durum rozetleri, düğme etiketleri). O durumda saklanan "orijinal" artık
      // geçersizdir: yenilenmezse bir sonraki çeviri turu eski içeriği geri
      // yazar ve dinamik güncelleme kaybolur. Bu yüzden son yazdığımız çıktı
      // (__trOut) ile mevcut innerHTML karşılaştırılır; farklıysa içerik dışarıdan
      // değişmiş demektir ve yeni içerik yeni orijinal kabul edilir.
      if (el.__trHtml == null || (el.__trOut != null && el.innerHTML !== el.__trOut)) {
        el.__trHtml = el.innerHTML;
        el.__trText = el.textContent;
      }
      var next = lang === 'en' ? lookup(el.__trText) : null;
      if (next == null) next = el.__trHtml;
      if (next !== el.innerHTML) el.innerHTML = next;
      el.__trOut = el.innerHTML;
      return; // yaprak blok — daha derine inme
    }

    var kids = el.children;
    for (var i = 0; i < kids.length; i++) visit(kids[i]);

    // Blok öğeler arasına serpiştirilmiş çıplak metin düğümleri (nadir).
    var n = el.firstChild;
    while (n) {
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        if (n.__tr == null) n.__tr = n.nodeValue;
        n.nodeValue = lang === 'en' ? t(n.__tr) : n.__tr;
      }
      n = n.nextSibling;
    }
  }

  var applying = false;

  /** Belirtilen kökü (varsayılan: document.body) yeniden çevirir. */
  function apply(root) {
    var start = root || doc.body;
    if (!start || applying) return;
    applying = true;
    try { visit(start); } finally { applying = false; }
  }

  /**
   * Sunumlar slayt geçişlerinde YENİ DÜĞÜM üretiyor (genel bakış ızgarası,
   * demo adımları, senaryo satırları). Bunları da çevirmek için yalnızca
   * `childList` eklemeleri izlenir.
   *
   * characterData BİLEREK izlenmez: canlı sayaçlar her karede metin düğümü
   * günceller; onları dinlemek gözlemciyi kare başına tetikleyip sayfayı
   * kilitler — üstelik o değerler sayı olduğu için çeviri de gerektirmez.
   */
  function observe() {
    if (!global.MutationObserver || !doc.body) return;
    var queue = [];
    var pending = null;
    var mo = new global.MutationObserver(function (records) {
      if (applying || lang !== 'en') return;
      for (var i = 0; i < records.length; i++) {
        // DEĞİŞEN ÖĞENİN KENDİSİ de kuyruğa alınır. Yalnızca eklenen düğümlere
        // bakmak yetmez: `el.innerHTML = '<b>a</b> b'` ya da `el.textContent = 'x'`
        // yazıldığında çevrilmesi gereken blok, eklenen çocuklar değil ÖĞENİN
        // KENDİSİDİR (sözlük anahtarı bloğun tüm metnidir). Yalnız çocuklara
        // bakınca cümle parça parça aranır ve hiçbiri sözlükte bulunmaz.
        if (records[i].target && records[i].target.nodeType === 1) queue.push(records[i].target);
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) queue.push(added[j]);
        }
      }
      if (!queue.length || pending) return;
      pending = global.setTimeout(function () {
        pending = null;
        var roots = queue;
        queue = [];
        applying = true;
        try {
          for (var k = 0; k < roots.length; k++) {
            if (roots[k].isConnected) visit(roots[k]);
          }
        } finally { applying = false; }
      }, 120);
    });
    mo.observe(doc.body, { childList: true, subtree: true });
  }

  /* ------------------------------ dil değiş ------------------------------ */

  function setLang(next, opts) {
    if (next !== 'en' && next !== 'tr') return;
    if (next === lang) return;
    lang = next;
    doc.documentElement.lang = next;
    doc.documentElement.setAttribute('data-lang', next);
    if (!opts || opts.persist !== false) persist(next);
    apply();
    listeners.forEach(function (fn) { try { fn(lang); } catch (e) { /* yoksay */ } });
  }

  function onChange(fn) { listeners.push(fn); }

  /* ------------------------------ düğme UI ------------------------------ */

  /** Sunum kabuğuna TR/EN düğmesi ekler. */
  function mountToggle(host, className) {
    if (!host) return null;
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = className || 'deck-lang-btn';
    btn.setAttribute('data-no-i18n', '');
    function paint() {
      btn.textContent = lang === 'en' ? 'EN' : 'TR';
      var to = lang === 'en' ? 'Türkçeye geç' : 'Switch to English';
      btn.title = to;
      btn.setAttribute('aria-label', to);
    }
    btn.addEventListener('click', function () { setLang(lang === 'en' ? 'tr' : 'en'); });
    onChange(paint);
    paint();
    host.appendChild(btn);
    return btn;
  }

  function injectStyle() {
    if (doc.getElementById('deck-lang-style')) return;
    var el = doc.createElement('style');
    el.id = 'deck-lang-style';
    el.textContent =
      '.deck-lang-btn{display:inline-flex;align-items:center;justify-content:center;' +
      'min-width:2.5em;height:2.1em;padding:0 .55em;border-radius:.6em;cursor:pointer;' +
      'font:600 12px/1 Inter,system-ui,sans-serif;letter-spacing:.05em;color:inherit;' +
      'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);' +
      'transition:background .2s,border-color .2s}' +
      '.deck-lang-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.32)}';
    doc.head.appendChild(el);
  }

  /* -------------------------------- init -------------------------------- */

  function init(opts) {
    opts = opts || {};
    dict = opts.dict || {};
    lang = readLang();
    doc.documentElement.lang = lang;
    doc.documentElement.setAttribute('data-lang', lang);
    injectStyle();

    // Ana sayfa dili değiştirdiğinde iframe içindeki sunumu da çevir.
    global.addEventListener('message', function (e) {
      if (e && e.data && e.data.type === 'deck-lang') setLang(e.data.lang, { persist: false });
    });
    // Başka bir sekmede dil değişirse burada da uygula.
    global.addEventListener('storage', function (e) {
      if (e && e.key === LANG_KEY) setLang(e.newValue, { persist: false });
    });

    function start() { apply(); observe(); }
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
    return API;
  }

  var API = {
    init: init,
    t: t,
    norm: norm,
    apply: apply,
    setLang: setLang,
    onChange: onChange,
    mountToggle: mountToggle,
    get lang() { return lang; },
  };

  global.DeckI18n = API;
})(window);
