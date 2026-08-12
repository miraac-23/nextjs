/* Java & Spring Kapsamlı Eğitim — İngilizce sözlük.
   Anahtar: bloğun DÜZ METNİ (Türkçe) · Değer: İngilizce HTML.
   Sözlükte olmayan blok Türkçe kalır — bkz. /deck-i18n.js
   DURUM: sunum kabuğu çevrildi; slayt gövde metinleri sırada. */
(function () {
  var D = {};
  function t(k, v) { D[k] = v; }

  /* --------------------------- Kabuk --------------------------- */
  t(`İçindekiler`, `Contents`);
  t(`İçindekiler (M)`, `Contents (M)`);
  t(`Menü`, `Menu`);
  t(`Başa dön (Home)`, `Back to start (Home)`);
  t(`Başa dön`, `Back to start`);
  t(`Genel bakış (O)`, `Overview (O)`);
  t(`Genel bakış`, `Overview`);
  t(`Tam ekran (F)`, `Fullscreen (F)`);
  t(`Tam ekran`, `Fullscreen`);
  t(`Tüm Slaytlar`, `All Slides`);
  t(`Kapat`, `Close`);
  t(`Giriş`, `Intro`);
  t(`Slayt`, `Slide`);
  t(`Sunum süresi`, `Presentation timer`);
  t(`Duraklat / Başlat (T)`, `Pause / Start (T)`);
  t(`Duraklat (T)`, `Pause (T)`);
  t(`Başlat (T)`, `Start (T)`);
  t(`Duraklat/Başlat`, `Pause/Start`);
  t(`Sıfırla (R)`, `Reset (R)`);
  t(`Sıfırla`, `Reset`);
  t(`Tümünü aç`, `Expand all`);
  t(`Tümünü kapat`, `Collapse all`);

  window.DECK_EN = D;
})();
