/* API Gateway & Merkezi Trafik Yönetimi — İngilizce sözlük.
   Anahtar: bloğun DÜZ METNİ (Türkçe) · Değer: İngilizce HTML.
   Sözlükte olmayan blok Türkçe kalır — bkz. /deck-i18n.js
   DURUM: sunum kabuğu + gezinme çevrildi; slayt gövde metinleri sırada. */
(function () {
  var D = {};
  function t(k, v) { D[k] = v; }

  /* --------------------------- Kabuk --------------------------- */
  t(`Tüm slaytlar`, `All slides`);
  t(`Başa dön`, `Back to start`);
  t(`Başa dön (Home)`, `Back to start (Home)`);
  t(`Tüm slaytlar (O)`, `All slides (O)`);
  t(`Önceki`, `Previous`);
  t(`Sonraki`, `Next`);
  t(`Kapat`, `Close`);
  t(`←→ gezin · O tüm slaytlar · Home başa · F tam ekran · R tekrar`,
    `<kbd>←</kbd><kbd>→</kbd> navigate · <kbd>O</kbd> all slides · <kbd>Home</kbd> start · <kbd>F</kbd> fullscreen · <kbd>R</kbd> replay`);

  window.DECK_EN = D;
})();
