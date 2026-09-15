// ATS raporu metinleri (TR/EN). Anahtar biçimi: "<kontrol-id>.title", "<kontrol-id>.fix",
// "<kontrol-id>.<durum-varyantı>". {değişken} yer tutucuları msg() ile doldurulur.

import type { AtsCategoryKey, AtsGrade, AtsLang } from './types'

type Lx = { tr: string; en: string }

const M: Record<string, Lx> = {
  /* ---------------------- biçim & ATS uyumluluğu ---------------------- */
  'searchable-text.title': { tr: 'Aranabilir, seçilebilir metin', en: 'Searchable, selectable text' },
  'searchable-text.pass': { tr: 'Metin seçilebilir durumda; ATS tüm içeriği okuyabilir ({words} kelime).', en: 'Text is selectable; the ATS can read all content ({words} words).' },
  'searchable-text.warn': { tr: 'Yalnızca {words} kelime okunabildi; içeriğin bir kısmı görsel olarak gömülmüş olabilir.', en: 'Only {words} words could be read; part of the content may be embedded as an image.' },
  'searchable-text.fail': { tr: 'Seçilebilir metin bulunamadı (taranmış ya da görüntü tabanlı belge). ATS hiçbir bilgiyi okuyamaz.', en: 'No selectable text found (scanned or image-based document). The ATS cannot read any information.' },
  'searchable-text.fix': { tr: 'CV’yi Word, Google Docs ya da CV Stüdyosu’ndan doğrudan metin tabanlı PDF olarak dışa aktarın; taranmış görüntü ya da ekran görüntüsü kullanmayın.', en: 'Export the CV directly from Word, Google Docs or the CV Studio as a text-based PDF; never use a scan or screenshot.' },

  'single-column.title': { tr: 'Tek sütunlu düzen', en: 'Single-column layout' },
  'single-column.pass': { tr: 'Belge tek sütun ve doğal okuma sırasında.', en: 'The document uses a single column in natural reading order.' },
  'single-column.fail': { tr: '{n} sütunlu düzen tespit edildi. ATS sütunları satır satır birleştirip bilgileri karıştırabilir.', en: '{n}-column layout detected. ATS parsers may merge columns line by line and scramble the information.' },
  'single-column.unknown': { tr: 'Bu dosya türünde sütun yapısı ölçülemedi; puan kırılmadı.', en: 'Column structure could not be measured for this file type; no points deducted.' },
  'single-column.fail-design': { tr: 'Şablon yan sütun ya da iki sütunlu gövde kullanıyor ({n} sütun). ATS sütunları satır satır birleştirip bilgileri karıştırabilir.', en: 'The template uses a sidebar or a two-column body ({n} columns). ATS parsers may merge columns line by line and scramble the information.' },
  'single-column.fix-template': { tr: 'Yan sütunlu görsel şablonlar ATS için risklidir. Şablon adımında tek sütunlu, ATS uyumlu bir Ankara şablonuna (ör. Çankaya) geçin.', en: 'Sidebar layouts are risky for ATS parsing. In the Template step, switch to a single-column ATS-compliant Ankara template (e.g. Çankaya).' },
  'single-column.fix': { tr: 'Kenar çubuğunu kaldırın; tüm bölümleri yukarıdan aşağı tek sütunda sıralayın.', en: 'Remove the sidebar and stack every section top to bottom in one column.' },

  'no-tables.title': { tr: 'Tablo yok', en: 'No tables' },
  'no-tables.pass': { tr: 'Tablo kullanılmamış.', en: 'No tables are used.' },
  'no-tables.fail': { tr: '{n} tablo tespit edildi. Birçok ATS tablo hücrelerini atlar ya da yanlış sırada okur.', en: '{n} table(s) detected. Many ATS parsers skip table cells or read them out of order.' },
  'no-tables.unknown': { tr: 'Bu dosya türünde tablo tespiti yapılamadı; puan kırılmadı.', en: 'Tables could not be detected for this file type; no points deducted.' },
  'no-tables.fix': { tr: 'Tabloları kaldırın; tarih ve konum bilgisini aynı satırda düz metin olarak yazın.', en: 'Remove tables; write dates and locations as plain text on the same line.' },

  'no-text-boxes.title': { tr: 'Metin kutusu yok', en: 'No text boxes' },
  'no-text-boxes.pass': { tr: 'Metin kutusu kullanılmamış.', en: 'No text boxes are used.' },
  'no-text-boxes.fail': { tr: '{n} metin kutusu tespit edildi. Metin kutularındaki içerik çoğu ATS tarafından okunmaz.', en: '{n} text box(es) detected. Content inside text boxes is ignored by most ATS parsers.' },
  'no-text-boxes.unknown': { tr: 'Metin kutusu tespiti bu dosya türünde yapılamadı; puan kırılmadı.', en: 'Text boxes could not be detected for this file type; no points deducted.' },
  'no-text-boxes.fix': { tr: 'Metin kutularındaki içeriği normal paragraf olarak belge gövdesine taşıyın.', en: 'Move text box content into the document body as normal paragraphs.' },

  'no-graphics.title': { tr: 'Grafik ve seviye göstergesi yok', en: 'No graphics or skill-level indicators' },
  'no-graphics.pass': { tr: 'Skill bar, ilerleme çubuğu ya da görsel seviye göstergesi yok.', en: 'No skill bars, progress bars or visual level indicators.' },
  'no-graphics.fail-shapes': { tr: '{n} grafik/şekil tespit edildi (skill bar, ilerleme çubuğu, dekoratif şekil). ATS bunları okuyamaz.', en: '{n} graphic/shape element(s) detected (skill bars, progress bars, decorative shapes). ATS parsers cannot read them.' },
  'no-graphics.fail-text': { tr: 'Metinle yazılmış seviye göstergeleri bulundu: {list}. ATS için anlamsızdır.', en: 'Text-based level indicators found: {list}. They are meaningless to an ATS.' },
  'no-graphics.unknown': { tr: 'Vektörel grafikler bu dosya türünde ölçülemedi; metinde seviye göstergesi bulunmadı.', en: 'Vector graphics could not be measured for this file type; no level indicators found in the text.' },
  'no-graphics.fail-design': { tr: '{n} görsel öğe basılıyor: yetenek/dil göstergeleri (çubuk, nokta, halka), renkli bant ya da yan sütun. ATS bunları okuyamaz.', en: '{n} visual element(s) are printed: skill/language meters (bars, dots, rings), coloured bands or a sidebar. ATS parsers cannot read them.' },
  'no-graphics.fix-template': { tr: 'Tasarım adımında yetenek göstergesini "Metin" ya da "Etiket" yapın; en güvenlisi ATS uyumlu bir Ankara şablonuna geçmek.', en: 'In the Design step set the skill style to "Text" or "Chips"; the safest option is switching to an ATS-compliant Ankara template.' },
  'no-graphics.fix': { tr: 'Yüzde, yıldız ya da çubuk yerine yetenekleri kategorilere ayrılmış metin olarak yazın (ör. "Backend: Java, Spring Boot").', en: 'Replace percentages, stars or bars with categorised text (e.g. "Backend: Java, Spring Boot").' },

  'no-images.title': { tr: 'Fotoğraf/görsel yok', en: 'No photos or images' },
  'no-images.pass': { tr: 'Gömülü görsel ya da fotoğraf yok.', en: 'No embedded images or photos.' },
  'no-images.fail': { tr: '{n} gömülü görsel tespit edildi. Fotoğraf ve görseller ATS’de okunmaz, dosyayı da ağırlaştırır.', en: '{n} embedded image(s) detected. Photos and images are unreadable to an ATS and bloat the file.' },
  'no-images.unknown': { tr: 'Görseller bu dosya türünde ölçülemedi; puan kırılmadı.', en: 'Images could not be measured for this file type; no points deducted.' },
  'no-images.fail-design': { tr: 'Profil fotoğrafı basılıyor. Fotoğraf ATS’de okunmaz; birçok ülkede işe alımcılar fotoğrafsız CV bekler.', en: 'A profile photo is printed. Photos are unreadable to an ATS, and many recruiters expect CVs without photos.' },
  'no-images.fix-template': { tr: 'Tasarım adımında "Fotoğrafı göster" seçeneğini kapatın ya da fotoğraf basmayan ATS uyumlu bir Ankara şablonuna geçin.', en: 'Turn off "Show photo" in the Design step, or switch to an ATS-compliant Ankara template that never prints photos.' },
  'no-images.fix': { tr: 'Fotoğrafı ve tüm görselleri kaldırın.', en: 'Remove the photo and all images.' },

  'no-logos.title': { tr: 'Logo yok', en: 'No logos' },
  'no-logos.pass': { tr: 'Logo ya da marka görseli yok.', en: 'No logos or brand images.' },
  'no-logos.warn': { tr: '{n} görsel var; şirket/okul logosu olup olmadığı ayırt edilemedi. Logolar ATS’de okunmaz.', en: '{n} image(s) present; could not tell whether they are company or school logos. Logos are unreadable to an ATS.' },
  'no-logos.unknown': { tr: 'Logo tespiti bu dosya türünde yapılamadı; puan kırılmadı.', en: 'Logos could not be detected for this file type; no points deducted.' },
  'no-logos.fix': { tr: 'Şirket ve okul adlarını logo yerine düz metin olarak yazın.', en: 'Write company and school names as plain text instead of logos.' },

  'no-header-footer-critical.title': { tr: 'Üst/alt bilgide kritik bilgi yok', en: 'No critical info in header/footer' },
  'no-header-footer-critical.pass': { tr: 'Ad ve iletişim bilgileri belge gövdesinde.', en: 'Name and contact details are in the document body.' },
  'no-header-footer-critical.fail': { tr: 'Üst/alt bilgi alanında kritik bilgi var: {list}. Birçok ATS bu alanları okumaz.', en: 'Critical information found in the header/footer: {list}. Many ATS parsers ignore these areas.' },
  'no-header-footer-critical.unknown': { tr: 'Üst/alt bilgi alanları bu dosya türünde ölçülemedi; puan kırılmadı.', en: 'Header/footer areas could not be measured for this file type; no points deducted.' },
  'no-header-footer-critical.fix': { tr: 'Ad, telefon ve e-postayı üst bilgi yerine sayfanın ilk satırlarına, belge gövdesine taşıyın.', en: 'Move your name, phone and email out of the header into the first lines of the document body.' },

  'no-icons-emoji.title': { tr: 'Emoji ve dekoratif ikon yok', en: 'No emoji or decorative icons' },
  'no-icons-emoji.pass': { tr: 'Emoji, ikon fontu ya da dekoratif simge bulunmadı.', en: 'No emoji, icon fonts or decorative symbols found.' },
  'no-icons-emoji.warn': { tr: 'Dekoratif simge bulundu: {list}. ATS bunları anlamsız karaktere çevirebilir.', en: 'Decorative symbols found: {list}. An ATS may turn them into garbage characters.' },
  'no-icons-emoji.fail': { tr: 'Çok sayıda emoji/ikon bulundu: {list}. Metin bozuk okunabilir ve profesyonel görünmez.', en: 'Many emoji/icons found: {list}. Text may be parsed as garbage and looks unprofessional.' },
  'no-icons-emoji.warn-layout': { tr: '{n} dekoratif ikon basılıyor (iletişim/kişisel bilgi ya da bağlantı simgeleri). ATS bunları anlamsız karaktere çevirebilir.', en: '{n} decorative icon(s) are printed (contact, personal info or link symbols). An ATS may turn them into garbage characters.' },
  'no-icons-emoji.fail-layout': { tr: '{n} dekoratif ikon basılıyor (iletişim, kişisel bilgi, bağlantı). Metin bozuk okunabilir.', en: '{n} decorative icons are printed (contact, personal info, links). The text may be parsed as garbage.' },
  'no-icons-emoji.fix-template': { tr: 'Tasarım adımında "İkonları göster" seçeneğini kapatın ya da ikon kullanmayan ATS uyumlu bir Ankara şablonuna geçin.', en: 'Turn off "Show icons" in the Design step, or switch to an ATS-compliant Ankara template without icons.' },
  'no-icons-emoji.fix': { tr: 'Telefon/e-posta ikonlarını ve emojileri silin; bilgiyi yalnızca metinle yazın.', en: 'Delete phone/email icons and emoji; write the information as text only.' },

  'reading-order.title': { tr: 'Doğal okuma sırası', en: 'Natural reading order' },
  'reading-order.pass': { tr: 'Ad ve iletişim en üstte, bölümler sırayla okunuyor.', en: 'Name and contact details come first and sections read in order.' },
  'reading-order.warn-top': { tr: 'Ad veya iletişim bilgisi metnin başında okunmuyor; ATS kişiyi yanlış tanımlayabilir.', en: 'Name or contact details are not read at the start of the text; the ATS may misidentify the candidate.' },
  'reading-order.warn-fragmented': { tr: 'Metin çok sayıda kısa, kopuk satırdan oluşuyor; sütunlar ya da tablo hücreleri karışık okunuyor olabilir.', en: 'The text consists of many short, broken lines; columns or table cells may be read out of order.' },
  'reading-order.warn-duplicate': { tr: 'Aynı başlık birden fazla kez okunuyor: {list}. Düzen parçalı okunuyor olabilir.', en: 'The same heading is read more than once: {list}. The layout may be parsed in fragments.' },
  'reading-order.fix': { tr: 'Ad, unvan ve iletişim bilgilerini en üste koyun; içeriği tek akışta, tablo ve sütun kullanmadan sıralayın.', en: 'Put name, title and contact details at the top and keep content in one flow without tables or columns.' },

  /* ------------------------------- format ------------------------------- */
  'standard-font.title': { tr: 'Standart font', en: 'Standard font' },
  'standard-font.pass': { tr: 'ATS dostu font kullanılmış: {list}.', en: 'ATS-friendly font(s) used: {list}.' },
  'standard-font.warn': { tr: 'Standart dışı font da var: {list}. Tercih: Arial, Calibri, Helvetica (ya da Times New Roman, Georgia, Cambria).', en: 'Non-standard font(s) also used: {list}. Prefer Arial, Calibri or Helvetica (or Times New Roman, Georgia, Cambria).' },
  'standard-font.warn-symbol': { tr: 'Sembol/ikon fontu kullanılmış: {list}. Bu karakterler ATS’de bozuk okunur.', en: 'Symbol/icon font used: {list}. These characters are parsed as garbage.' },
  'standard-font.fail': { tr: 'Standart dışı font: {list}. Karakterler hatalı çıkarılabilir.', en: 'Non-standard font(s): {list}. Characters may be extracted incorrectly.' },
  'standard-font.unknown': { tr: 'Font bilgisi bu dosya türünde okunamadı; puan kırılmadı.', en: 'Font information is not available for this file type; no points deducted.' },
  'standard-font.fix-template': { tr: 'Tasarım adımında yazı tipini Arial, Calibri ya da Helvetica yapın; ATS uyumlu Ankara şablonları yalnızca standart fontlar kullanır.', en: 'Set the font to Arial, Calibri or Helvetica in the Design step; ATS-compliant Ankara templates use standard fonts only.' },
  'standard-font.fix': { tr: 'Tüm belgede Arial, Calibri ya da Helvetica kullanın.', en: 'Use Arial, Calibri or Helvetica throughout the document.' },

  'body-font-size.title': { tr: 'Gövde yazı boyutu (10–12 pt)', en: 'Body font size (10–12 pt)' },
  'body-font-size.pass': { tr: 'Gövde metni {v} pt.', en: 'Body text is {v} pt.' },
  'body-font-size.warn': { tr: 'Gövde metni {v} pt; önerilen aralık 10–12 pt.', en: 'Body text is {v} pt; recommended range is 10–12 pt.' },
  'body-font-size.fail': { tr: 'Gövde metni {v} pt; okunabilirlik ve ATS çıkarımı için 10–12 pt olmalı.', en: 'Body text is {v} pt; it should be 10–12 pt for readability and reliable extraction.' },
  'body-font-size.unknown': { tr: 'Yazı boyutu bu dosya türünde ölçülemedi.', en: 'Font size could not be measured for this file type.' },
  'body-font-size.fix-template': { tr: 'Tasarım adımında yazı ölçeğini gövde 10–12 pt olacak şekilde ayarlayın ya da boyutları pt olarak sabitleyen bir Ankara şablonuna geçin.', en: 'Adjust the font scale in the Design step so body text is 10–12 pt, or switch to an Ankara template with fixed pt sizes.' },
  'body-font-size.fix': { tr: 'Gövde metnini 10–12 pt aralığına getirin.', en: 'Set body text to 10–12 pt.' },

  'heading-font-size.title': { tr: 'Başlık boyutu (13–16 pt)', en: 'Heading size (13–16 pt)' },
  'heading-font-size.pass': { tr: 'Bölüm başlıkları {v} pt.', en: 'Section headings are {v} pt.' },
  'heading-font-size.warn': { tr: 'Bölüm başlıkları {v} pt; önerilen aralık 13–16 pt.', en: 'Section headings are {v} pt; recommended range is 13–16 pt.' },
  'heading-font-size.unknown': { tr: 'Başlık boyutu bu dosya türünde ölçülemedi.', en: 'Heading size could not be measured for this file type.' },
  'heading-font-size.fix-template': { tr: 'Görsel şablonun başlıkları küçük. Başlık ölçeğini artırın ya da başlıkları 13–16 pt basan bir Ankara şablonuna geçin.', en: 'This visual template uses small headings. Increase the heading scale, or switch to an Ankara template with 13–16 pt headings.' },
  'heading-font-size.fix': { tr: 'Bölüm başlıklarını 13–16 pt yapın.', en: 'Set section headings to 13–16 pt.' },

  'name-font-size.title': { tr: 'Ad soyad boyutu (18–24 pt)', en: 'Name size (18–24 pt)' },
  'name-font-size.pass': { tr: 'Ad soyad {v} pt.', en: 'Name is {v} pt.' },
  'name-font-size.warn': { tr: 'Ad soyad {v} pt; önerilen aralık 18–24 pt.', en: 'Name is {v} pt; recommended range is 18–24 pt.' },
  'name-font-size.fail': { tr: 'Ad soyad {v} pt; 18–24 pt aralığının çok dışında.', en: 'Name is {v} pt; far outside the 18–24 pt range.' },
  'name-font-size.unknown': { tr: 'Ad boyutu bu dosya türünde ölçülemedi.', en: 'Name size could not be measured for this file type.' },
  'name-font-size.fix-template': { tr: 'Başlık ölçeğiyle ad boyutunu 18–24 pt aralığına getirin ya da bir Ankara şablonuna geçin.', en: 'Use the heading scale to bring the name to 18–24 pt, or switch to an Ankara template.' },
  'name-font-size.fix': { tr: 'Ad soyadı 18–24 pt yapın.', en: 'Set your name to 18–24 pt.' },

  'margins.title': { tr: 'Kenar boşlukları (≈0,7–1 inç)', en: 'Margins (≈0.7–1 inch)' },
  'margins.pass': { tr: 'Kenar boşlukları {v} mm.', en: 'Margins are {v} mm.' },
  'margins.warn': { tr: 'Kenar boşlukları {v} mm; önerilen 18–25,4 mm.', en: 'Margins are {v} mm; recommended 18–25.4 mm.' },
  'margins.fail': { tr: 'Kenar boşlukları {v} mm; çok dar, yazdırmada ve ayrıştırmada metin kesilebilir.', en: 'Margins are {v} mm; too narrow, text may be cut when printed or parsed.' },
  'margins.unknown': { tr: 'Kenar boşlukları bu dosya türünde ölçülemedi.', en: 'Margins could not be measured for this file type.' },
  'margins.fix-template': { tr: 'Tasarım adımında sayfa boşluğunu 18–25 mm yapın. Yan sütunlu şablonlar kenar boşluğu bırakmaz; ATS uyumlu Ankara şablonları 18–25,4 mm kullanır.', en: 'Set the page margin to 18–25 mm in the Design step. Sidebar templates run edge to edge; ATS-compliant Ankara templates use 18–25.4 mm.' },
  'margins.fix': { tr: 'Kenar boşluklarını 18–25,4 mm (0,7–1 inç) yapın.', en: 'Set margins to 18–25.4 mm (0.7–1 inch).' },

  'light-background.title': { tr: 'Açık zemin, koyu metin', en: 'Light background, dark text' },
  'light-background.pass': { tr: 'Beyaz/açık zemin üzerinde koyu metin.', en: 'Dark text on a white/light background.' },
  'light-background.fail': { tr: 'Koyu arka plan ya da renkli zemin tespit edildi; açık renk metin ATS’de kaybolabilir.', en: 'Dark or coloured background detected; light text may be lost during parsing.' },
  'light-background.warn-accent': { tr: 'Zemin beyaz ancak vurgu rengi soluk (kontrast {ratio}:1). Ad ve başlıklar için en az 4.5:1 kontrastlı koyu bir ton seçin.', en: 'The background is white but the accent colour is faint (contrast {ratio}:1). Pick a dark tone with at least 4.5:1 contrast for the name and headings.' },
  'light-background.unknown': { tr: 'Arka plan rengi bu dosya türünde ölçülemedi.', en: 'Background colour could not be measured for this file type.' },
  'light-background.fix-template': { tr: 'Tasarım adımında kâğıt tonunu "Beyaz" yapın ve koyu bir vurgu rengi seçin ya da bir Ankara şablonuna geçin.', en: 'Set the paper tone to "White" in the Design step and pick a dark accent, or switch to an Ankara template.' },
  'light-background.fix': { tr: 'Beyaz zemin ve siyah/koyu gri metin kullanın; en fazla bir sınırlı vurgu rengi bırakın.', en: 'Use a white background with black/dark-grey text and at most one limited accent colour.' },

  'standard-bullets.title': { tr: 'Standart madde işaretleri', en: 'Standard bullets' },
  'standard-bullets.pass': { tr: 'Madde işaretleri standart ("•" ya da "-").', en: 'Bullets are standard ("•" or "-").' },
  'standard-bullets.pass-none': { tr: 'Standart dışı madde işareti bulunmadı.', en: 'No non-standard bullet glyphs found.' },
  'standard-bullets.warn': { tr: 'Standart olmayan madde işaretleri: {list}. Yalnızca "•" ya da "-" kullanın.', en: 'Non-standard bullets: {list}. Use only "•" or "-".' },
  'standard-bullets.warn-mixed': { tr: 'Birden fazla madde işareti karışık kullanılmış: {list}.', en: 'Several bullet glyphs are mixed: {list}.' },
  'standard-bullets.fail': { tr: 'Dekoratif madde işaretleri (ok, onay, ikon) kullanılmış: {list}. ATS bunları bozuk karaktere çevirebilir.', en: 'Decorative bullets (arrows, check marks, icons) used: {list}. An ATS may turn them into garbage characters.' },
  'standard-bullets.fail-layout': { tr: 'Şablonda dekoratif madde işareti (kare, ok ya da onay) seçili. ATS bunları bozuk karaktere çevirebilir.', en: 'A decorative bullet style (square, arrow or check) is selected. An ATS may turn them into garbage characters.' },
  'standard-bullets.fix-template': { tr: 'Tasarım adımında madde işaretini "Nokta" ya da "Tire" yapın.', en: 'Set the bullet style to "Dot" or "Dash" in the Design step.' },
  'standard-bullets.fix': { tr: 'Tüm maddelerde tek tip "•" ya da "-" kullanın.', en: 'Use a single "•" or "-" glyph for every bullet.' },

  'consistent-dates.title': { tr: 'Tutarlı tarih biçimi', en: 'Consistent date format' },
  'consistent-dates.pass': { tr: 'Tüm tarihler tek biçimde: {fmt}.', en: 'All dates use one format: {fmt}.' },
  'consistent-dates.warn-year': { tr: 'Ay/yıl tarihleri ile yalnızca yıl yazılmış tarihler karışık ({list}).', en: 'Month/year dates are mixed with year-only dates ({list}).' },
  'consistent-dates.warn-none': { tr: 'Deneyimlerde tarih bulunamadı; ATS süre hesaplayamaz.', en: 'No dates found in experience; the ATS cannot calculate tenure.' },
  'consistent-dates.fail': { tr: 'Farklı tarih biçimleri karışık kullanılmış: {list}.', en: 'Different date formats are mixed: {list}.' },
  'consistent-dates.fix-template': { tr: 'Görsel şablonlar tarihleri yazdığınız gibi basar. Tüm tarihleri tek biçimde (AA/YYYY) girin ya da tarihleri otomatik biçimlendiren bir Ankara şablonuna geçin.', en: 'Visual templates print dates exactly as typed. Enter every date in one format (MM/YYYY), or switch to an Ankara template that formats dates automatically.' },
  'consistent-dates.fix': { tr: 'Tüm tarihleri tek biçimde yazın: "01/2024 – Günümüz" ya da "Oca 2024 – Günümüz".', en: 'Write every date in one format: "01/2024 – Present" or "Jan 2024 – Present".' },

  'human-readability.title': { tr: 'İnsan tarafından okunabilirlik', en: 'Human readability' },
  'human-readability.pass': { tr: 'Maddeler kısa ve yoğun (ortalama {avg} kelime).', en: 'Bullets are short and dense (average {avg} words).' },
  'human-readability.warn': { tr: 'Okunabilirlik sorunları: {list}.', en: 'Readability issues: {list}.' },
  'human-readability.fail': { tr: 'Metin satır/madde yapısı olmadan uzun bloklar halinde; hem ATS hem işe alımcı için okunması zor.', en: 'Text is one long block without line or bullet structure; hard to read for both ATS and recruiters.' },
  'human-readability.fix': { tr: 'Uzun paragrafları 1–2 satırlık maddelere bölün; her madde tek bir başarıyı anlatsın.', en: 'Split long paragraphs into 1–2 line bullets, one achievement per bullet.' },
  'human-readability.issue-long-bullets': { tr: '{n} madde 40 kelimeden uzun', en: '{n} bullet(s) longer than 40 words' },
  'human-readability.issue-avg': { tr: 'maddeler ortalama {avg} kelime', en: 'bullets average {avg} words' },
  'human-readability.issue-paragraphs': { tr: '{n} uzun paragraf', en: '{n} long paragraph(s)' },

  /* ------------------------------- headings ------------------------------- */
  'standard-headings.title': { tr: 'Standart bölüm başlıkları', en: 'Standard section headings' },
  'standard-headings.pass': { tr: '{n} bölüm başlığının tamamı ATS’lerin tanıdığı standart adlar.', en: 'All {n} section headings are standard names ATS parsers recognise.' },
  'standard-headings.warn': { tr: 'Standart olmayan başlık: {list}.', en: 'Non-standard heading(s): {list}.' },
  'standard-headings.fail': { tr: 'Yaratıcı/standart dışı başlıklar ana bölümleri gizliyor: {list}. ATS bu bölümleri sınıflandıramaz.', en: 'Creative/non-standard headings hide core sections: {list}. The ATS cannot classify these sections.' },
  'standard-headings.fail-none': { tr: 'Hiç bölüm başlığı tespit edilemedi; ATS deneyim, eğitim ve yetenekleri ayırt edemez.', en: 'No section headings detected; the ATS cannot tell experience, education and skills apart.' },
  'standard-headings.fix': { tr: 'Standart başlıklar kullanın: Profesyonel Özet, İş Deneyimi, Eğitim, Teknik Yetkinlikler, Projeler, Sertifikalar, Yabancı Dil (EN: Professional Summary, Work Experience, Education, Technical Skills…).', en: 'Use standard headings: Professional Summary, Work Experience, Education, Technical Skills, Projects, Certifications, Languages.' },

  'required-sections.title': { tr: 'Temel bölümler', en: 'Core sections' },
  'required-sections.pass': { tr: 'Deneyim, eğitim ve yetenek bölümleri mevcut.', en: 'Experience, education and skills sections are present.' },
  'required-sections.warn': { tr: 'Eksik bölüm: {list}.', en: 'Missing section: {list}.' },
  'required-sections.warn-summary': { tr: 'Profesyonel özet yok; ATS ve işe alımcı ilk bakışta uzmanlığınızı göremez.', en: 'No professional summary; the ATS and recruiters cannot see your expertise at a glance.' },
  'required-sections.fail': { tr: 'Birden fazla temel bölüm eksik: {list}.', en: 'Several core sections are missing: {list}.' },
  'required-sections.fix': { tr: 'İş Deneyimi, Eğitim ve Teknik Yetkinlikler bölümlerini ekleyin.', en: 'Add Work Experience, Education and Technical Skills sections.' },

  'section-order.title': { tr: 'Mantıklı bölüm sırası', en: 'Sensible section order' },
  'section-order.pass': { tr: 'Bölümler beklenen sırada.', en: 'Sections are in the expected order.' },
  'section-order.warn-summary': { tr: 'Özet en üstte değil; ATS ve işe alımcılar özeti ilk bölüm olarak bekler.', en: 'The summary is not at the top; ATS parsers and recruiters expect it first.' },
  'section-order.warn-education': { tr: 'Deneyimli bir aday için Eğitim, İş Deneyimi’nden önce geliyor.', en: 'For an experienced candidate, Education comes before Work Experience.' },
  'section-order.warn-minor': { tr: 'İkincil bölümler deneyimden önce geliyor: {list}.', en: 'Secondary sections come before experience: {list}.' },
  'section-order.fix': { tr: 'Sıra önerisi: Özet → İş Deneyimi → Eğitim → Teknik Yetkinlikler → Projeler → Sertifikalar → Yabancı Dil.', en: 'Suggested order: Summary → Work Experience → Education → Technical Skills → Projects → Certifications → Languages.' },

  /* ------------------------------- contact ------------------------------- */
  'clear-contact.title': { tr: 'Açık iletişim bilgileri', en: 'Clear contact information' },
  'clear-contact.pass': { tr: 'Ad, e-posta ve telefon metin olarak okunuyor.', en: 'Name, email and phone are readable as text.' },
  'clear-contact.warn': { tr: 'Eksik: {list}. Bilgiler yalnızca ikonla verilmişse ATS okuyamaz.', en: 'Missing: {list}. If shown only as icons, the ATS cannot read them.' },
  'clear-contact.fail': { tr: 'Kritik iletişim bilgisi okunamadı: {list}. İşe alımcı size ulaşamayabilir.', en: 'Critical contact details could not be read: {list}. Recruiters may be unable to reach you.' },
  'clear-contact.fix': { tr: 'Belge gövdesinin en üstüne ad soyad, telefon ve e-postayı açık metin olarak yazın.', en: 'Write your full name, phone and email as plain text at the top of the document body.' },

  'contact-location.title': { tr: 'Konum (şehir/ülke)', en: 'Location (city/country)' },
  'contact-location.pass': { tr: 'Konum: {v}.', en: 'Location: {v}.' },
  'contact-location.warn': { tr: 'Şehir/ülke bilgisi bulunamadı; konuma göre filtreleyen ATS’lerde elenebilirsiniz.', en: 'No city/country found; ATS filters by location may exclude you.' },
  'contact-location.fix': { tr: 'İletişim satırına "Şehir, Ülke" ekleyin (ör. "İstanbul, Türkiye").', en: 'Add "City, Country" to the contact line (e.g. "Istanbul, Türkiye").' },

  'contact-links.title': { tr: 'Web varlığı (LinkedIn / GitHub / Portfolyo)', en: 'Web presence (LinkedIn / GitHub / Portfolio)' },
  'contact-links.pass': { tr: 'Profesyonel bağlantılar: {list}.', en: 'Professional links: {list}.' },
  'contact-links.warn': { tr: 'LinkedIn, GitHub ya da portfolyo bağlantısı yok.', en: 'No LinkedIn, GitHub or portfolio link.' },
  'contact-links.fix': { tr: 'LinkedIn profil adresinizi (ve varsa GitHub/portfolyo) metin olarak ekleyin.', en: 'Add your LinkedIn URL (and GitHub/portfolio if relevant) as text.' },

  'contact-position.title': { tr: 'İletişim en üstte', en: 'Contact details at the top' },
  'contact-position.pass': { tr: 'İletişim bilgileri belgenin ilk satırlarında.', en: 'Contact details are in the first lines of the document.' },
  'contact-position.warn': { tr: 'İletişim bilgileri belgenin başında değil (satır {n}).', en: 'Contact details are not at the top of the document (line {n}).' },
  'contact-position.info': { tr: 'E-posta/telefon bulunamadığı için konum değerlendirilemedi.', en: 'Position could not be assessed because no email/phone was found.' },
  'contact-position.fix': { tr: 'İletişim bilgilerini adınızın hemen altına taşıyın.', en: 'Move contact details directly below your name.' },

  'relevant-title.title': { tr: 'İlanla uyumlu profesyonel unvan', en: 'Professional title aligned with the job' },
  'relevant-title.pass-nojd': { tr: 'Unvan: "{title}". Uyumu ölçmek için iş ilanı ekleyin.', en: 'Title: "{title}". Add a job posting to measure alignment.' },
  'relevant-title.pass': { tr: 'Unvan "{title}", hedef pozisyon "{target}" ile örtüşüyor.', en: 'Title "{title}" matches the target role "{target}".' },
  'relevant-title.warn': { tr: 'Unvan "{title}", hedef pozisyon "{target}" ile örtüşmüyor.', en: 'Title "{title}" does not match the target role "{target}".' },
  'relevant-title.fail': { tr: 'Adın altında profesyonel unvan yok; ATS unvan eşleştirmesi yapamaz.', en: 'No professional title under your name; the ATS cannot match job titles.' },
  'relevant-title.fix': { tr: 'Adınızın altına ilandaki terminolojiyi kullanan bir unvan yazın (yalnızca gerçekten yaptığınız rolü).', en: 'Add a title under your name using the posting’s terminology (only for a role you genuinely perform).' },

  /* ------------------------------- content ------------------------------- */
  'summary-length.title': { tr: 'Özet: 2–4 cümle', en: 'Summary: 2–4 sentences' },
  'summary-length.pass': { tr: 'Özet {s} cümle, {w} kelime.', en: 'Summary has {s} sentence(s), {w} words.' },
  'summary-length.warn': { tr: 'Özet {s} cümle, {w} kelime; ideal 2–4 cümle ve 25–100 kelime.', en: 'Summary has {s} sentence(s), {w} words; ideal is 2–4 sentences and 25–100 words.' },
  'summary-length.fail': { tr: 'Özet {s} cümle, {w} kelime; çok kısa ya da çok uzun.', en: 'Summary has {s} sentence(s), {w} words; far too short or too long.' },
  'summary-length.fail-missing': { tr: 'Profesyonel özet bulunamadı.', en: 'No professional summary found.' },
  'summary-length.info-missing': { tr: 'Özet olmadığından uzunluk değerlendirilmedi (eksikliği Aranabilirlik’te puanlandı).', en: 'Length not assessed because there is no summary (its absence is scored under Searchability).' },
  'summary-length.fix': { tr: '2–4 cümlede deneyim yılı, ana uzmanlık, temel teknolojiler, sektör ve somut bir başarıyı yazın.', en: 'In 2–4 sentences, state years of experience, main expertise, key technologies, domain and one concrete achievement.' },

  'no-first-person.title': { tr: 'Birinci tekil kullanılmamış', en: 'No first-person language' },
  'no-first-person.pass': { tr: 'Özet ve maddelerde birinci tekil kullanılmamış.', en: 'Summary and bullets avoid first-person language.' },
  'no-first-person.warn': { tr: 'Birinci tekil ifadeler bulundu: {list}.', en: 'First-person expressions found: {list}.' },
  'no-first-person.fail': { tr: 'Metin birinci tekil ağırlıklı: {list}.', en: 'The text relies heavily on first person: {list}.' },
  'no-first-person.fix': { tr: '"Ben/benim" ve "-dım/-yorum" yerine öznesiz, eylemle başlayan ifadeler kullanın ("… geliştirdi", "Developed …").', en: 'Drop "I/my"; start with an action instead ("Developed …", "Led …").' },

  'summary-years.title': { tr: 'Özette deneyim yılı', en: 'Years of experience in summary' },
  'summary-years.pass': { tr: 'Özette deneyim süresi belirtilmiş.', en: 'The summary states years of experience.' },
  'summary-years.warn': { tr: 'Özette deneyim yılı belirtilmemiş.', en: 'The summary does not mention years of experience.' },
  'summary-years.info': { tr: 'Değerlendirilmedi (özet yok ya da deneyim süresi kısa).', en: 'Not assessed (no summary or little experience).' },
  'summary-years.fix': { tr: 'Özete toplam deneyim sürenizi ekleyin (ör. "7+ yıl deneyimli …").', en: 'Add your total experience to the summary (e.g. "… with 7+ years of experience").' },

  'experience-details.title': { tr: 'Deneyim kayıtları eksiksiz', en: 'Complete experience entries' },
  'experience-details.pass': { tr: '{n} deneyim kaydının hepsinde pozisyon, şirket ve tarih var.', en: 'All {n} experience entries have job title, company and dates.' },
  'experience-details.warn': { tr: 'Eksik bilgi: {list}.', en: 'Missing details: {list}.' },
  'experience-details.warn-location': { tr: 'Kayıtların çoğunda konum (şehir) yok.', en: 'Most entries have no location (city).' },
  'experience-details.fail': { tr: 'Deneyim kayıtlarının çoğunda temel bilgi eksik: {list}.', en: 'Most experience entries lack core details: {list}.' },
  'experience-details.fail-none': { tr: 'İş deneyimi kaydı ayrıştırılamadı.', en: 'No work experience entries could be parsed.' },
  'experience-details.fix': { tr: 'Her kayıtta: Şirket, Pozisyon, Konum ve AA/YYYY – AA/YYYY tarih aralığı olsun.', en: 'Give every entry: Company, Job Title, Location and MM/YYYY – MM/YYYY dates.' },

  'bullets-per-role.title': { tr: 'Rol başına 3–6 madde', en: '3–6 bullets per role' },
  'bullets-per-role.pass': { tr: 'Rollerin madde sayısı dengeli.', en: 'Roles have a balanced number of bullets.' },
  'bullets-per-role.warn': { tr: 'Madde sayısı uygun olmayan roller: {list}.', en: 'Roles with an unsuitable bullet count: {list}.' },
  'bullets-per-role.fail': { tr: 'Rollerin çoğunda madde sayısı uygun değil: {list}.', en: 'Most roles have an unsuitable bullet count: {list}.' },
  'bullets-per-role.info': { tr: 'Deneyim kaydı olmadığından değerlendirilmedi.', en: 'Not assessed because there are no experience entries.' },
  'bullets-per-role.fix': { tr: 'Güncel rollere 3–6, eski rollere 2–3 madde yazın; tekrar eden görevleri birleştirin.', en: 'Write 3–6 bullets for recent roles and 2–3 for older ones; merge repetitive duties.' },

  'bullet-format.title': { tr: 'Paragraf yerine madde', en: 'Bullets instead of paragraphs' },
  'bullet-format.pass': { tr: 'Deneyimler maddeler halinde yazılmış.', en: 'Experience is written as bullets.' },
  'bullet-format.warn': { tr: 'Uzun paragrafla anlatılan roller: {list}.', en: 'Roles described in long paragraphs: {list}.' },
  'bullet-format.info': { tr: 'Deneyim kaydı olmadığından değerlendirilmedi.', en: 'Not assessed because there are no experience entries.' },
  'bullet-format.fix': { tr: 'Paragrafları "Eylem + Teknoloji + Ne yapıldı + Sonuç" yapısında maddelere bölün.', en: 'Split paragraphs into "Action + Technology + What was built + Result" bullets.' },

  'action-verbs.title': { tr: 'Güçlü eylem fiilleri', en: 'Strong action verbs' },
  'action-verbs.pass': { tr: 'Maddelerin %{p}’i eylemle anlatılıyor.', en: '{p}% of bullets are framed around an action.' },
  'action-verbs.warn': { tr: 'Maddelerin yalnızca %{p}’i eylem fiiliyle kurulmuş. Örnek: {list}.', en: 'Only {p}% of bullets use an action verb. Examples: {list}.' },
  'action-verbs.fail': { tr: 'Maddeler görev listesi gibi (%{p} eylem fiili). Örnek: {list}.', en: 'Bullets read like a task list ({p}% action verbs). Examples: {list}.' },
  'action-verbs.info': { tr: 'Madde bulunmadığından değerlendirilmedi.', en: 'Not assessed because no bullets were found.' },
  'action-verbs.fix': { tr: 'Her maddeyi güçlü bir eylemle kurun: "… geliştirdi / tasarladı / azalttı" ya da "Developed / Designed / Reduced …".', en: 'Start each bullet with a strong verb: Developed, Designed, Led, Reduced, Migrated…' },

  'quantified-achievements.title': { tr: 'Ölçülebilir başarılar', en: 'Quantified achievements' },
  'quantified-achievements.pass': { tr: '{q}/{n} madde ölçülebilir sonuç içeriyor.', en: '{q}/{n} bullets include measurable results.' },
  'quantified-achievements.warn': { tr: 'Yalnızca {q}/{n} madde sayı/yüzde/ölçek içeriyor.', en: 'Only {q}/{n} bullets include numbers, percentages or scale.' },
  'quantified-achievements.fail': { tr: '{q}/{n} madde ölçülebilir sonuç içeriyor; etki görünmüyor.', en: '{q}/{n} bullets include measurable results; impact is not visible.' },
  'quantified-achievements.warn-none': { tr: 'Madde bulunamadığından ölçülebilir başarı görülemedi.', en: 'No bullets found, so no measurable achievements are visible.' },
  'quantified-achievements.fix': { tr: 'Gerçekten bildiğiniz metrikleri ekleyin (%, süre, kullanıcı, işlem hacmi, ekip büyüklüğü). Asla uydurma rakam yazmayın.', en: 'Add metrics you genuinely know (%, time, users, transaction volume, team size). Never invent numbers.' },

  'reverse-chronological.title': { tr: 'Ters kronolojik sıra', en: 'Reverse chronological order' },
  'reverse-chronological.pass': { tr: 'Deneyimler en yeniden eskiye sıralı.', en: 'Experience is listed from newest to oldest.' },
  'reverse-chronological.pass-few': { tr: 'Sıralama kontrolü için yeterli tarihli kayıt yok.', en: 'Not enough dated entries to check ordering.' },
  'reverse-chronological.warn': { tr: 'Sıra dışı kayıt: {list}.', en: 'Out-of-order entry: {list}.' },
  'reverse-chronological.fail': { tr: 'Deneyimler kronolojik sırada değil: {list}.', en: 'Experience is not in reverse chronological order: {list}.' },
  'reverse-chronological.fix': { tr: 'Güncel rolü en üste koyun, diğerlerini başlangıç tarihine göre yeniden eskiye sıralayın.', en: 'Put the current role first and order the rest by start date, newest first.' },

  'acronyms-explained.title': { tr: 'Kısaltmaların açılımı', en: 'Acronyms explained' },
  'acronyms-explained.pass': { tr: 'Kısaltmalar ilk kullanımda açıklanmış.', en: 'Acronyms are explained on first use.' },
  'acronyms-explained.pass-none': { tr: 'Açıklama gerektiren kısaltma bulunmadı.', en: 'No acronyms requiring explanation were found.' },
  'acronyms-explained.warn': { tr: 'Açılımı verilmemiş kısaltmalar: {list}.', en: 'Acronyms without an expansion: {list}.' },
  'acronyms-explained.fix': { tr: 'İlk kullanımda açılımı yazın: "Sürekli Entegrasyon/Sürekli Dağıtım (CI/CD)". ATS hem kısaltmayı hem uzun hali arayabilir.', en: 'Spell out on first use: "Continuous Integration/Continuous Deployment (CI/CD)". ATS searches may use either form.' },

  'no-fabrication.title': { tr: 'Uydurma bilgi yok', en: 'No fabricated information' },
  'no-fabrication.info-builder': { tr: 'CV Stüdyosu içerik eklemez; her rakam ve iddia sizden gelir. Tüm metriklerin doğru ve kanıtlanabilir olduğunu kendiniz doğrulayın.', en: 'The CV Studio never adds content; every number and claim comes from you. Verify that all metrics are accurate and defensible.' },
  'no-fabrication.info-upload': { tr: 'Doğruluk otomatik olarak doğrulanamaz. Metriklerin, unvanların ve tarihlerin gerçek olduğundan emin olun; mülakatta hepsi sorulabilir.', en: 'Accuracy cannot be verified automatically. Make sure metrics, titles and dates are real; each may come up in interviews.' },

  /* ------------------------------- keywords ------------------------------- */
  'relevant-keywords.title': { tr: 'İlandaki hard skill anahtar kelimeleri', en: 'Hard skill keywords from the job' },
  'relevant-keywords.pass': { tr: 'İlandaki teknik/mesleki anahtar kelimelerin %{rate}’i CV’de geçiyor ({m}/{n}).', en: '{rate}% of the posting’s hard skill keywords appear in the CV ({m}/{n}).' },
  'relevant-keywords.warn': { tr: 'İlandaki hard skill’lerin %{rate}’i eşleşiyor ({m}/{n}). Eksik önemli terimler: {list}.', en: '{rate}% of the posting’s hard skills match ({m}/{n}). Missing important terms: {list}.' },
  'relevant-keywords.fail': { tr: 'Hard skill eşleşmesi düşük: %{rate} ({m}/{n}). Eksik önemli terimler: {list}.', en: 'Low hard skill match: {rate}% ({m}/{n}). Missing important terms: {list}.' },
  'relevant-keywords.info-nojd': { tr: 'İş ilanı eklenmedi; anahtar kelime uyumu ölçülmedi.', en: 'No job posting provided; keyword match was not measured.' },
  'relevant-keywords.info-empty': { tr: 'İlandan teknik/mesleki anahtar kelime çıkarılamadı.', en: 'No hard skill keywords could be extracted from the posting.' },
  'relevant-keywords.fix': { tr: 'Eksik terimlerden gerçekten bildiklerinizi deneyim maddelerinde doğal bağlamda kullanın; bilmediğiniz teknolojiyi eklemeyin.', en: 'Work the missing terms you genuinely know into experience bullets naturally; never add technologies you do not know.' },

  'skills-in-context.title': { tr: 'Yetenekler deneyimde de geçiyor', en: 'Skills backed by experience' },
  'skills-in-context.pass': { tr: 'Yeteneklerin çoğu deneyim/proje maddelerinde kullanılmış.', en: 'Most skills are used in experience/project bullets.' },
  'skills-in-context.warn': { tr: 'Yalnızca Yetenekler bölümünde geçen terimler: {list}.', en: 'Terms that appear only in the Skills section: {list}.' },
  'skills-in-context.info': { tr: 'Yetenek listesi bulunamadı.', en: 'No skills list found.' },
  'skills-in-context.fix': { tr: 'Önemli teknolojileri hangi işte, ne için kullandığınızı gösteren maddelere ekleyin.', en: 'Mention key technologies in bullets that show where and how you used them.' },

  'no-keyword-stuffing.title': { tr: 'Anahtar kelime doldurma yok', en: 'No keyword stuffing' },
  'no-keyword-stuffing.pass': { tr: 'Terimler doğal sıklıkta kullanılmış.', en: 'Terms are used at a natural frequency.' },
  'no-keyword-stuffing.warn': { tr: 'Aşırı tekrar edilen terimler: {list}.', en: 'Overused terms: {list}.' },
  'no-keyword-stuffing.fix': { tr: 'Aynı terimi 6 kereden fazla tekrarlamayın; bağlam içinde bir iki kez yeterli.', en: 'Avoid repeating a term more than 6 times; once or twice in context is enough.' },

  /* ------------------------------- length ------------------------------- */
  'page-length.title': { tr: 'Deneyime uygun uzunluk', en: 'Length fits experience' },
  'page-length.pass': { tr: '{p} sayfa; {level} için uygun.', en: '{p} page(s); appropriate for {level}.' },
  'page-length.warn': { tr: '{p} sayfa; {level} için önerilen en fazla {max} sayfa.', en: '{p} page(s); {max} page(s) maximum recommended for {level}.' },
  'page-length.fail': { tr: '{p} sayfa; çok uzun. {level} için en fazla {max} sayfa önerilir.', en: '{p} pages; far too long. {max} page(s) maximum recommended for {level}.' },
  'page-length.fix': { tr: 'Eski ve ilgisiz rolleri kısaltın, tekrar eden maddeleri birleştirin; içeriği doldurmak için uzatmayın.', en: 'Trim old or irrelevant roles and merge repetitive bullets; never pad the content.' },
  'page-length.level-junior': { tr: 'junior (0–3 yıl) aday', en: 'a junior (0–3 years) candidate' },
  'page-length.level-senior': { tr: 'orta/kıdemli aday', en: 'a mid/senior candidate' },

  'word-count.title': { tr: 'Makul kelime sayısı', en: 'Sensible word count' },
  'word-count.pass': { tr: '{w} kelime.', en: '{w} words.' },
  'word-count.warn-low': { tr: '{w} kelime; içerik zayıf görünebilir.', en: '{w} words; the content may look thin.' },
  'word-count.warn-high': { tr: '{w} kelime; gereğinden uzun.', en: '{w} words; longer than necessary.' },
  'word-count.fail-low': { tr: 'Yalnızca {w} kelime; ATS eşleştirmesi için yetersiz.', en: 'Only {w} words; not enough for ATS matching.' },
  'word-count.fail-high': { tr: '{w} kelime; çok uzun.', en: '{w} words; far too long.' },
  'word-count.fix': { tr: 'Hedef: 1 sayfa için ~300–600, 2 sayfa için ~600–1000 kelime.', en: 'Aim for ~300–600 words on one page or ~600–1000 on two.' },

  /* ------------------------------- yeni kontroller ------------------------------- */
  'file-type.title': { tr: 'Dosya türü (PDF / DOCX)', en: 'File type (PDF / DOCX)' },
  'file-type.pass': { tr: '{type} dosyası; ATS’lerin ve işe alımcıların beklediği biçim.', en: '{type} file; the format ATS systems and recruiters expect.' },
  'file-type.pass-builder': { tr: 'CV Stüdyosu metin tabanlı PDF ve DOCX üretir.', en: 'CV Studio exports text-based PDF and DOCX.' },
  'file-type.info-txt': { tr: 'Düz metin dosyası analiz edildi; işe alımcılar genellikle PDF ya da DOCX bekler.', en: 'A plain-text file was analysed; recruiters usually expect PDF or DOCX.' },
  'file-type.fix': { tr: 'Başvuruda metin tabanlı PDF ya da DOCX gönderin.', en: 'Submit a text-based PDF or DOCX.' },

  'page-setup.title': { tr: 'Sayfa düzeni (A4 / Letter)', en: 'Page setup (A4 / Letter)' },
  'page-setup.pass': { tr: '{size} boyutunda {p} sayfa.', en: '{p} page(s) in {size} size.' },
  'page-setup.warn': { tr: 'Sayfa genişliği {v} mm; standart A4 (210 mm) ya da Letter (216 mm) değil.', en: 'Page width is {v} mm; not standard A4 (210 mm) or Letter (216 mm).' },
  'page-setup.unknown': { tr: 'Sayfa boyutu bu dosya türünde ölçülemedi.', en: 'Page size could not be measured for this file type.' },
  'page-setup.fix': { tr: 'Belgeyi dikey A4 ya da Letter boyutunda kaydedin.', en: 'Save the document in portrait A4 or Letter size.' },

  'summary-present.title': { tr: 'Profesyonel özet', en: 'Professional summary' },
  'summary-present.pass': { tr: 'Özet mevcut ({w} kelime); ATS ve işe alımcı uzmanlığınızı ilk bakışta görür.', en: 'Summary present ({w} words); ATS and recruiters see your expertise at a glance.' },
  'summary-present.fail': { tr: 'Profesyonel özet yok. Özet, unvan ve anahtar yetkinliklerin ATS’de ilk arandığı yerdir.', en: 'No professional summary. The summary is where ATS searches first look for your title and key skills.' },
  'summary-present.fix': { tr: 'Adınızın altına 2–4 cümlelik bir Profesyonel Özet ekleyin: unvan, deneyim yılı, ana teknolojiler, somut bir başarı.', en: 'Add a 2–4 sentence Professional Summary: title, years of experience, core skills and one concrete achievement.' },

  'education-match.title': { tr: 'Eğitim bilgisi / ilan şartı', en: 'Education / job requirement' },
  'education-match.pass': { tr: 'Eğitim bilgisi mevcut ({n} kayıt).', en: 'Education details are present ({n} entry/entries).' },
  'education-match.pass-jd': { tr: 'İlandaki eğitim şartı ({req}) karşılanıyor görünüyor.', en: 'The posting’s education requirement ({req}) appears to be met.' },
  'education-match.warn-level': { tr: 'İlan en az {req} istiyor; CV’deki derece daha düşük görünüyor.', en: 'The posting asks for at least {req}; the degree in the CV appears lower.' },
  'education-match.warn-none': { tr: 'Eğitim bilgisi bulunamadı; birçok ATS filtresi derece alanını arar.', en: 'No education found; many ATS filters search the degree field.' },
  'education-match.fail-jd': { tr: 'İlan {req} istiyor ama CV’de eğitim bilgisi yok; ATS filtresinde elenebilirsiniz.', en: 'The posting requires {req} but the CV has no education; you may be filtered out.' },
  'education-match.fix': { tr: 'Eğitim bölümüne derece, bölüm, okul ve tarihleri açıkça yazın (ör. "Bilgisayar Mühendisliği, Lisans").', en: 'List degree, field, school and dates clearly (e.g. "BSc in Computer Engineering").' },
  'degree.1': { tr: 'ön lisans', en: 'an associate degree' },
  'degree.2': { tr: 'lisans', en: 'a bachelor’s degree' },
  'degree.3': { tr: 'yüksek lisans', en: 'a master’s degree' },
  'degree.4': { tr: 'doktora', en: 'a doctorate' },

  'soft-skills.title': { tr: 'İlandaki soft skill’ler', en: 'Soft skills from the job' },
  'soft-skills.pass': { tr: 'İlandaki kişisel yetkinliklerin %{rate}’i CV’de karşılanıyor ({m}/{n}).', en: '{rate}% of the posting’s soft skills are covered ({m}/{n}).' },
  'soft-skills.warn': { tr: 'Soft skill eşleşmesi %{rate} ({m}/{n}). Eksik: {list}.', en: 'Soft skill match is {rate}% ({m}/{n}). Missing: {list}.' },
  'soft-skills.fail': { tr: 'Soft skill eşleşmesi düşük: %{rate} ({m}/{n}). Eksik: {list}.', en: 'Low soft skill match: {rate}% ({m}/{n}). Missing: {list}.' },
  'soft-skills.info-nojd': { tr: 'İş ilanı eklenmedi; soft skill uyumu ölçülmedi.', en: 'No job posting provided; soft skill match was not measured.' },
  'soft-skills.info-empty': { tr: 'İlanda belirgin bir soft skill bulunamadı.', en: 'No explicit soft skills were found in the posting.' },
  'soft-skills.fix': { tr: 'İlandaki kişisel yetkinlikleri gerçekten sahip olduklarınızla, somut bir örnekle maddelerde gösterin (ör. "5 kişilik ekibe liderlik etti").', en: 'Show the posting’s soft skills you genuinely have with concrete bullets (e.g. "Led a team of 5 engineers").' },

  'soft-skills-in-context.title': { tr: 'Soft skill’ler maddelerde kanıtlanmış', en: 'Soft skills demonstrated in bullets' },
  'soft-skills-in-context.pass': { tr: 'Eşleşen {n} soft skill deneyim maddelerinde somut eylemlerle görülüyor.', en: 'All {n} matched soft skills are backed by concrete actions in your bullets.' },
  'soft-skills-in-context.warn': { tr: 'Yalnızca listelenmiş, maddelerde kanıtı olmayan soft skill’ler: {list}.', en: 'Soft skills only listed, with no evidence in bullets: {list}.' },
  'soft-skills-in-context.warn-none': { tr: 'İlandaki soft skill’lerin hiçbiri CV’de görülmüyor.', en: 'None of the posting’s soft skills are visible in the CV.' },
  'soft-skills-in-context.info-nojd': { tr: 'İş ilanı eklenmedi; değerlendirilmedi.', en: 'No job posting provided; not assessed.' },
  'soft-skills-in-context.info-empty': { tr: 'İlanda soft skill olmadığından değerlendirilmedi.', en: 'Not assessed because the posting lists no soft skills.' },
  'soft-skills-in-context.fix': { tr: '"İletişim becerisi güçlü" yazmak yerine kanıtlayın: "3 ekip arasında haftalık sunumlar yaptı", "4 geliştiriciye mentorluk yaptı".', en: 'Prove it instead of claiming it: "Presented weekly updates to 3 teams", "Mentored 4 developers".' },

  'buzzwords.title': { tr: 'Klişe ifadelerden kaçınma', en: 'Avoid buzzwords and clichés' },
  'buzzwords.pass': { tr: 'Klişe/boş ifade bulunmadı.', en: 'No buzzwords or empty clichés found.' },
  'buzzwords.pass-few': { tr: 'Az sayıda klişe var: {list}. Somut bir başarıyla değiştirmeyi düşünün.', en: 'A few clichés found: {list}. Consider replacing them with concrete achievements.' },
  'buzzwords.warn': { tr: '{n} klişe ifade: {list}. İşe alımcılar kanıtsız sıfatları atlar.', en: '{n} buzzwords: {list}. Recruiters skip unsupported adjectives.' },
  'buzzwords.fail': { tr: 'Metin klişe ağırlıklı ({n}): {list}.', en: 'The text relies on clichés ({n}): {list}.' },
  'buzzwords.fix': { tr: '"Çalışkan, dinamik, sonuç odaklı" yerine sonucu yazın: "Rapor süresini %40 kısalttı".', en: 'Replace "hard-working, results-driven" with the result itself: "Cut reporting time by 40%".' },

  'template.fix': { tr: 'Bu sorun seçili görsel şablonun yerleşiminden kaynaklanıyor. ATS uyumlu bir Ankara şablonuna (ör. Çankaya) geçin.', en: 'This issue comes from the selected visual template’s layout. Switch to an ATS-compliant Ankara template (e.g. Çankaya).' },
  'headline.design': { tr: '"{name}" görsel bir şablon; ATS için tek sütunlu bir Ankara şablonu önerilir.', en: '"{name}" is a visual template; a single-column Ankara template is recommended for ATS.' },

  /* ------------------------------- genel ------------------------------- */
  'field.name': { tr: 'ad soyad', en: 'full name' },
  'field.email': { tr: 'e-posta', en: 'email' },
  'field.phone': { tr: 'telefon', en: 'phone' },
  'field.title': { tr: 'pozisyon', en: 'job title' },
  'field.company': { tr: 'şirket', en: 'company' },
  'field.dates': { tr: 'tarih', en: 'dates' },
  'section.summary': { tr: 'Profesyonel Özet', en: 'Professional Summary' },
  'section.experience': { tr: 'İş Deneyimi', en: 'Work Experience' },
  'section.education': { tr: 'Eğitim', en: 'Education' },
  'section.skills': { tr: 'Teknik Yetkinlikler', en: 'Technical Skills' },
  'entry.unnamed': { tr: 'Adsız kayıt', en: 'Untitled entry' },
  'bullets.count': { tr: '{n} madde', en: '{n} bullets' },

  'headline.clean': { tr: 'ATS skoru {score}/100 — {grade}. CV’niz ATS’ler tarafından sorunsuz okunabilir{extra}.', en: 'ATS score {score}/100 — {grade}. Your CV can be parsed by ATS systems without issues{extra}.' },
  'headline.extra': { tr: '; {n} öneri skoru daha da artırabilir', en: '; {n} suggestion(s) could raise it further' },
  'headline.capped': { tr: 'Parse edilebilirlik sorunları giderilmeden skor sınırlandırıldı (sınırsız hesap: {raw}).', en: 'The score is capped until the parsing problems are fixed (uncapped: {raw}).' },
  'headline.issues': { tr: 'ATS skoru {score}/100 — {grade}. {f} kritik sorun ve {w} iyileştirme önerisi var.', en: 'ATS score {score}/100 — {grade}. {f} critical issue(s) and {w} improvement(s) found.' },
}

const GRADE: Record<AtsGrade, Lx> = {
  excellent: { tr: 'Mükemmel', en: 'Excellent' },
  good: { tr: 'İyi', en: 'Good' },
  fair: { tr: 'Geliştirilmeli', en: 'Needs work' },
  poor: { tr: 'Zayıf', en: 'Poor' },
}

const CATEGORY: Record<AtsCategoryKey, Lx> = {
  formatting: { tr: 'Biçim & ATS Uyumluluğu', en: 'Formatting & ATS Compatibility' },
  searchability: { tr: 'Aranabilirlik', en: 'Searchability' },
  hardSkills: { tr: 'Hard Skills (Teknik Yetkinlikler)', en: 'Hard Skills' },
  softSkills: { tr: 'Soft Skills (Kişisel Yetkinlikler)', en: 'Soft Skills' },
  recruiterTips: { tr: 'İşe Alımcı İpuçları', en: 'Recruiter Tips' },
}

export function msg(lang: AtsLang, key: string, vars?: Record<string, string | number>): string {
  const entry = M[key]
  if (!entry) return key
  let s = lang === 'en' ? entry.en : entry.tr
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.split('{' + k + '}').join(String(vars[k]))
    })
  }
  return s
}

export function hasMsg(key: string): boolean {
  return !!M[key]
}

export function gradeLabel(lang: AtsLang, g: AtsGrade): string {
  return lang === 'en' ? GRADE[g].en : GRADE[g].tr
}

export function categoryLabel(lang: AtsLang, c: AtsCategoryKey): string {
  return lang === 'en' ? CATEGORY[c].en : CATEGORY[c].tr
}

/** Liste birleştirme: en fazla `max` öğe, fazlası "+N". */
export function listText(items: string[], max = 5): string {
  const shown = items.slice(0, max).map((x) => `"${x}"`)
  return items.length > max ? `${shown.join(', ')} +${items.length - max}` : shown.join(', ')
}
