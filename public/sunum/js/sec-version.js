/* ================= BÖLÜM 2 — JAVA SÜRÜM ANALİZİ ================= */
PRESENTATION.sections.push({
  cat: "version", icon: "🔢", kicker: "Bölüm 2 · Sürüm Evrimi", rmLabel: "Java Sürüm Evrimi",
  title: "Java Sürüm Analizi: 8 → 25",
  desc: "Java'nın paradigma değiştiren LTS sürümleri — \"öncesi vs sonrası\" kod örnekleri, neden önemli oldukları ve her sürümde Soru–Cevap'la.",
  topics: ["Java 8 — Fonksiyonel", "Java 11 — Modern API", "Java 17 — Veri-odaklı", "Java 21 — Virtual Threads", "Java 25 — Olgunlaşma", "8→21 Kazanım", "Sürüm Geçişi: Risk & Kazanım"],
  slides: [
    /* ---- Java 8 ---- */
    {
      nav: "Java 8 · Lambda & Stream", eyebrow: "2014 · LTS · 1/2",
      title: "Java 8 — Fonksiyonel Devrim",
      sub: "Java tarihinin en büyük paradigma değişimi: OOP + emir kipinden <b>fonksiyonel + deklaratif</b> programlamaya geçiş.",
      blocks: [
        {
          type: "concept", term: "LTS ve Sürüm Döngüsü",
          what: "<b>LTS = Long-Term Support</b> (uzun süreli destekli) sürüm. Java 2017'den beri <b>6 ayda bir</b> yeni sürüm çıkarır; her 2 yılda biri LTS olur (8, 11, 17, 21, 25).",
          origin: "Eskiden sürümler yıllarca gecikirdi (Java 6→7 ~5 yıl). 2017'de tren-modeli benimsendi: küçük, sık, öngörülebilir sürümler.",
          use: "Üretimde genelde <b>LTS</b> seçilir (uzun güvenlik desteği). Ara sürümler yeni özellikleri erken denemek içindir."
        },
        {
          type: "callout", variant: "analogy", icon: "🚆",
          text: "**Sanki tren seferleri gibi:** Her 6 ayda bir tren kalkar (yeni sürüm); kaçırsan da bir sonrakine binersin. LTS trenleri ise <b>uzun yol</b> için — yıllarca bakım/güvenlik desteği garantili. Şirketler çoğunlukla bu uzun-yol trenlerine biner."
        },
        {
          type: "code", cap: "Öncesi vs Sonrası — Stream API", code: `// ESKİ — imperatif döngü, geçici liste
List<String> r = new ArrayList<>();
for (Urun u : urunler)
    if (u.kategori().equals("Elektronik") && u.fiyat() > 1000)
        r.add(u.ad().toUpperCase());

// YENİ — deklaratif, niyet-odaklı zincir
var r = urunler.stream()
    .filter(u -> u.kategori().equals("Elektronik"))
    .filter(u -> u.fiyat() > 1000)
    .map(u -> u.ad().toUpperCase())
    .toList();` },
        {
          type: "bullets", title: "Java 8'in getirdikleri",
          items: [
            "**Lambda** — davranışı veri gibi geç (`(a,b) -> a+b`); boilerplate'in sonu.",
            "**Stream API** — `filter/map/reduce/collect` zinciri; `parallelStream()` ile paralellik.",
            "**Optional** — `null` yerine tip seviyesinde \"değer olabilir\".",
            "**java.time** — immutable, thread-safe tarih/saat (`LocalDate`, `Duration`).",
            "**Default metotlar** — arayüzü kırmadan evirme; `CompletableFuture`."
          ]
        },
        {
          type: "qa", items: [
            { q: "Stream her zaman döngüden iyi mi?", a: "Okunabilirlikte genelde evet; **performansta** her zaman değil. Basit tek döngülerde klasik `for` daha hızlı olabilir. Stream'in gücü; karmaşık dönüşüm zincirleri ve paralelleştirmedir." },
            { q: "`Optional`'ı alan (field) olarak kullanmalı mıyım?", a: "Hayır — `Optional` **dönüş tipi** için tasarlandı (\"sonuç olmayabilir\"). Entity alanı, metot parametresi veya koleksiyon elemanı olarak kullanmak önerilmez (serileştirme/bellek sorunları)." }
          ]
        }
      ]
    },
    {
      nav: "Java 8 · Tarih & Optional", eyebrow: "2014 · LTS · 2/2",
      title: "Java 8 — Tarih/Saat ve Optional Pratiği",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "java.time — eski Date/Calendar'ın sonu" },
            { type: "code", cap: "İnsan mantığıyla, immutable", code: `// ESKİ: ay 0-tabanlı, mutable — hata kaynağı
Calendar c = Calendar.getInstance();
c.set(2026, 5, 24);   // 5 = HAZİRAN değil!

// YENİ: net, immutable
LocalDate t = LocalDate.of(2026, 6, 24);
LocalDate son = t.plusMonths(2).plusDays(10);
long yas = ChronoUnit.YEARS.between(dogum, t);` }
          ],
          right: [
            { type: "heading", text: "Optional ile null güvenliği" },
            { type: "code", cap: "NPE zincirine son", code: `// ESKİ: iç içe null kontrol
if (k != null && k.getEmail() != null)
    System.out.println(k.getEmail().toUpperCase());

// YENİ: akıcı, niyet açık
bul(id).map(Kullanici::getEmail)
       .map(String::toUpperCase)
       .ifPresent(System.out::println);` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Bir bankacılık uygulamasında faiz vade hesabı eski `Calendar` ile ay/yıl taşmalarında bug üretirdi. `LocalDate.plusMonths()` artık bunu doğru ve okunur biçimde yapar; `Duration`/`Period` ile mesai/vade hesapları nettir."
        },
        {
          type: "qa", items: [
            { q: "`LocalDateTime` mi `Instant` mı kullanmalıyım?", a: "Kullanıcıya gösterilen yerel zaman için `LocalDateTime`/`ZonedDateTime`; sunucu/DB'de **olay anı** için `Instant` (UTC). Zaman dilimi karmaşasından kaçınmak için saklamayı UTC yapıp gösterimde dönüştür." }
          ]
        }
      ]
    },
    /* ---- Java 11 ---- */
    {
      nav: "Java 11", eyebrow: "2018 · LTS",
      title: "Java 11 — Modern Kütüphaneler",
      sub: "\"Özellikleri sabitleme\" noktası; Java 8'den geçişin en yaygın hedefi. Dış kütüphanesiz modern API'ler.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "bullets", title: "Yenilikler", items: ["**HTTP Client** — HTTP/2, async; OkHttp gerekmez", "**String** — `strip/isBlank/lines/repeat`", "**Files.readString/writeString** — tek satır dosya I/O", "**Lambda'da `var`** — anotasyon eklenebilir", "**Tek dosya çalıştırma** — `java Merhaba.java`"] }
          ],
          right: [
            { type: "code", cap: "Yeni HTTP Client (≈3 satır)", code: `HttpClient c = HttpClient.newHttpClient();
HttpResponse<String> r = c.send(
  HttpRequest.newBuilder(
     URI.create("https://api.com/data")).build(),
  BodyHandlers.ofString());
String body = r.body();` }
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Geçiş riski (JEP 320):** Java EE/CORBA modülleri (JAXB, SOAP, `javax.annotation`) JDK'dan kaldırıldı. Java 8 kodu Java 11'de `NoClassDefFoundError` verebilir → eksik modülleri bağımlılık olarak ekle."
        },
        {
          type: "qa", items: [
            { q: "Neden Java 9/10 değil de 11'e geçiyoruz?", a: "Java 9 ve 10 yalnızca 6 ay desteklenen ara sürümlerdi. **11 LTS**'tir (uzun destek). Kurumsal dünyada \"8'den sonraki yeni temel\" 11 oldu." },
            { q: "Yeni HttpClient'a geçmeli miyim?", a: "Yeni kodda evet — HTTP/2, async, reactive akış destekler ve JDK'ya dahildir (ek bağımlılık yok). Spring tarafında ise genelde `RestClient`/`WebClient` tercih edilir." }
          ]
        }
      ]
    },
    /* ---- Java 17 ---- */
    {
      nav: "Java 17", eyebrow: "2021 · LTS",
      title: "Java 17 — Veri-Odaklı Programlama",
      sub: "Java 9–16 arası modern özelliklerin bir LTS pakette toplanması. <b>Spring Boot 3'ün tabanı.</b>",
      blocks: [
        {
          type: "split",
          left: [
            { type: "code", cap: "Records — 30 satır → 1 satır", code: `// getter+equals+hashCode+toString hepsi otomatik
public record Nokta(int x, int y) {}

// Text blocks — çok satırlı string
String json = """
    { "ad": "Ada", "yas": 30 }
    """;` },
            { type: "code", cap: "Sealed — kontrollü hiyerarşi", code: `public sealed interface Sekil
    permits Daire, Kare {}     // SADECE bunlar` }
          ],
          right: [
            { type: "bullets", title: "Öne çıkanlar", items: ["**Records** (kalıcı) — immutable veri sınıfları (DTO, value object)", "**Sealed classes** — kontrollü kalıtım + exhaustiveness", "**Pattern matching for switch** (preview)", "**Text blocks** — çok satırlı string", "**Strong encapsulation** — `sun.*` iç API'ler kapandı (risk)"] },
            { type: "callout", variant: "info", icon: "🧱", text: "Sealed + Records + Pattern matching = \"cebirsel\" veri modelleme; derleyici eksik dalı yakalar." }
          ]
        },
        {
          type: "qa", items: [
            { q: "Record'lar Lombok'un yerini tutar mı?", a: "Çoğu DTO/value-object için **evet** (dil-içi, ek araç yok, immutable). Ama record'lar `final` ve immutable'dır; mutable JPA `@Entity` veya zengin builder gereken yerlerde Lombok/klasik sınıf hâlâ kullanılır." },
            { q: "Neden Java 17 kurumsal standart oldu?", a: "Spring Boot 3 ve Spring Framework 6 **minimum Java 17** ister. Records, sealed, pattern matching, text blocks gibi birikmiş özelliklerin tek LTS'te toplanması da geçişi cazip kıldı." }
          ]
        }
      ]
    },
    /* ---- Java 21 ---- */
    {
      nav: "Java 21", eyebrow: "2023 · LTS",
      title: "Java 21 — Eşzamanlılık Devrimi",
      sub: "Virtual Threads tek başına bu sürümü tarihi yapar. \"Yeni kurumsal çağ.\"",
      blocks: [
        {
          type: "bullets", title: "Kalıcılaşan yenilikler",
          items: [
            "**Virtual Threads** ⭐ — milyonlarca hafif thread; thread-per-request geri döner.",
            "**Pattern matching for switch** (kalıcı) — `when` guard'lı, null-güvenli.",
            "**Record patterns** — iç içe record'ları bileşenlerine yıkma.",
            "**Sequenced Collections** — `getFirst/getLast/reversed` her sıralı koleksiyonda.",
            "**Generational ZGC** — sub-millisecond pause, büyük heap."
          ]
        },
        {
          type: "code", cap: "Record patterns + guarded switch", code: `record Adres(String sehir, String ulke) {}
record Kullanici(String ad, Adres adres) {}

String s = switch (o) {
    case Kullanici(String ad, Adres(var sehir, var ulke)) -> ad + " @ " + sehir;
    case Integer i when i > 0 -> "pozitif: " + i;
    case null -> "bos";
    default -> "diger";
};` },
        {
          type: "qa", items: [
            { q: "Virtual Threads gelince reactive (WebFlux) öldü mü?", a: "Hayır ama çoğu I/O-bound senaryoda **gereksizleşti**. Basit senkron kodla virtual thread ölçeği alırsın. Reactive hâlâ backpressure, akış işleme (streaming) ve olay-tabanlı pipeline'larda değerlidir." },
            { q: "Java 21'e geçince hemen kazanç görür müyüm?", a: "Records/pattern matching gibi dil özellikleri anında. Virtual thread kazancı için sunucuyu (Boot 3.2+) ve bloklayan I/O profilini kullanman gerekir; CPU-bound iş yükünde fark görmezsin." }
          ]
        }
      ]
    },
    /* ---- Java 25 ---- */
    {
      nav: "Java 25", eyebrow: "2025 · LTS (en güncel)",
      title: "Java 25 — Olgunlaşma ve Kalıcılaşma",
      sub: "Preview'dan standarda geçişler. Virtual Threads + Scoped Values + Structured Concurrency üçlemesi tamamlanıyor.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "code", cap: "Compact Source + Instance main", code: `// ESKİ: public class + public static main
void main() {                 // YENİ (kalıcı)
    IO.println("Merhaba Dünya");
}` },
            { type: "code", cap: "Flexible Constructor Bodies", code: `public Calisan(String ad, int maas) {
    if (maas < 0) throw new IllegalArgumentException();
    super(maas);     // artık super() ÖNCESİ doğrulama
    this.ad = ad;
}` }
          ],
          right: [
            { type: "bullets", title: "Yenilikler", items: ["**Scoped Values** (kalıcı) — `ThreadLocal` yerine; virtual-thread dostu", "**Module Import** — `import module java.base;`", "**Compact Source / `void main()`** — öğrenme bariyeri kalkar", "**Stable Values** (preview) — güvenli lazy init", "**Compact Object Headers** — heap/cache iyileşmesi"] },
            { type: "callout", variant: "warn", icon: "🚫", text: "**String Templates** Java 21'de preview gelmiş, 23'te geri çekilmişti — 25'te yoktur. Production'da kullanma." }
          ]
        },
        {
          type: "qa", items: [
            { q: "`void main()` ve `import module` profesyonel kodda mı?", a: "Daha çok **öğrenme, prototip ve script** içindir — başlangıç bariyerini düşürür. Büyük projelerde açık `public class` ve tekil import'lar okunabilirlik için tercih edilmeye devam eder." },
            { q: "Bugün hangi sürümü hedeflemeliyim?", a: "Yeni projede **21** (geniş kütüphane/araç desteği, virtual threads stabil) ya da en güncel LTS **25**. Eski sistemler için önce 8→11→17 borcunu kapatmak önceliklidir." }
          ]
        }
      ]
    },
    /* ---- Sentez ---- */
    {
      nav: "8 → 21 Kazanım", eyebrow: "Sürüm · Sentez",
      title: "Java 8'den 21'e: Ne Kazanılır?",
      blocks: [
        {
          type: "stats",
          items: [
            { big: "~%60", lbl: "Lambda+Stream ile boilerplate azalışı" },
            { big: "30→1", lbl: "Records ile DTO satır sayısı" },
            { big: "200→1M+", lbl: "Platform → Virtual thread ölçeği" },
            { big: "0 bağ.", lbl: "HTTP Client / Files ile dış kütüphane" }
          ]
        },
        {
          type: "twocol",
          pos: { title: "Kazanımlar", items: ["Deklaratif, niyet-odaklı, okunabilir kod", "Modern API: java.time, HTTP Client, Files", "Virtual Threads ile reactive karmaşıklığı olmadan ölçek", "GC iyileştirmeleri (ZGC), JFR teşhis"] },
          neg: { title: "Geçiş tavsiye sırası", items: ["**Java 8 →** en az 11 (kritik teknik borç)", "**11 →** 17 (Spring Boot 3 baseline)", "**17 →** 21 (Virtual Threads, stabil durak)", "**21 →** 25 (olgunlaşan özellikler, esnek)"] }
        },
        {
          type: "qa", items: [
            { q: "Sürüm atlamak (8'den doğrudan 21'e) riskli mi?", a: "Yönetilebilir ama kademeli doğrular: önce derleme (kaldırılan `javax.*` modülleri, güçlü kapsülleme), sonra bağımlılıkları güncelle (Spring/Hibernate sürümleri), sonra davranış testleri. Büyük sıçramayı CI ile adım adım yap." },
            { q: "LTS dışı sürümleri (12–16, 18–20) kullanmalı mıyım?", a: "Üretimde genelde **LTS** (8/11/17/21/25) tercih edilir — daha uzun güvenlik desteği. Ara sürümler yeni özellikleri erken denemek isteyen ekipler içindir." }
          ]
        }
      ]
    },
    {
      nav: "Sürüm Geçişi · Risk & Kazanım", eyebrow: "Sürüm · Geçiş Riski & Kazanım",
      title: "Java Sürüm Geçişi: Riskler ve Kazanımlar",
      sub: "Yeni Java sürümüne geçmek büyük kazanım sağlar (dil, performans, güvenlik) — ama her büyük adımın kendine özgü <b>kırılmaları</b> vardır. Neyi kazanırsın, neye dikkat edersin?",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Kazanımlar", items: ["**Dil**: lambda/Stream → records, sealed, pattern matching → virtual threads", "**Performans**: yeni GC (G1/ZGC), JIT iyileştirmeleri, daha hızlı başlatma", "**Güvenlik**: aktif yamalar (eski LTS desteği biter)", "**Modern API**: java.time, HttpClient, Files; daha az boilerplate"] },
          neg: { title: "Riskler", items: ["**Kaldırılan API'ler** (ör. `javax.*` modülleri) → `NoClassDefFoundError`", "**Davranış değişiklikleri** (GC, sayısal, tarih)", "**3. parti uyum**: eski kütüphane yeni JDK'da çalışmayabilir", "**Build/araç** güncellemesi (Gradle/Maven, derleyici hedefi)"] }
        },
        {
          type: "table",
          headers: ["Geçiş", "En kritik kırılma", "Aksiyon"],
          rows: [
            ["**8 → 11**", "Java EE modülleri kaldırıldı (JAXB, JAX-WS, `javax.annotation`)", "Eksik modülleri bağımlılık olarak ekle"],
            ["**11 → 17**", "Güçlü kapsülleme: `sun.*`/iç API erişimi kapandı", "İç API'ye dayanan kütüphaneleri güncelle"],
            ["**17 → 21**", "Çoğunlukla uyumlu; `synchronized` pinning (virtual thread)", "Sıcak yolda `ReentrantLock` gözden geçir"],
            ["**Genel**", "Hibernate/Spring/3. parti sürüm uyumu", "Bağımlılıkları birlikte yükselt (BOM)"]
          ]
        },
        {
          type: "code", cap: "Geçiş öncesi tara — kaldırılan/iç API kullanımını bul", code: `# Kaldırılan JDK iç API kullanımını bul
jdeps --jdk-internals uygulama.jar

# Hedef sürümde kullanımdan kaldırılan API'leri tara
jdeprscan --release 17 uygulama.jar`
        },
        {
          type: "callout", variant: "tip", icon: "🎯",
          text: "**Strateji:** Tek seferde \"big bang\" yerine **kademeli** sıçra: 8 → 11 → 17 → 21. Her adımda **derle + tüm testleri koştur**, `jdeps`/`jdeprscan` ile tarama yap, bağımlılıkları yükselt ve **CI'da birden çok JDK** ile doğrula. Üretime canary/kademeli yayınla."
        },
        {
          type: "qa", items: [
            { q: "Java 8'den 17'ye en sık ne kırılır?", a: "**`javax.*` modüllerinin kaldırılması** (8→11) ve **güçlü kapsülleme** (11→17: `sun.*`/iç API erişiminin kapanması). Ayrıca eski 3. parti kütüphanelerin yeni JDK ile uyumsuzluğu. Çözüm: eksik modülleri ekle, iç API'ye dayanan bağımlılıkları güncelle." },
            { q: "Doğrudan 8'den 21'e atlamak mantıklı mı?", a: "Hedef 21 olsa bile **kademeli** doğrula: önce derleme/uyumu 11 ve 17 üzerinden geçir (kırılmaları erken yakala), sonra 21. Büyük sıçramayı CI ile adım adım test etmek riski çok azaltır." },
            { q: "Geçişi nasıl güvenle test ederim?", a: "Güçlü **otomatik test kapsamı** şart. CI'yı **birden çok JDK sürümünde** çalıştır, `jdeps`/`jdeprscan` ile statik tara, davranış farklarını (GC/tarih/sayısal) gözle, ve üretime **canary** ile kademeli çık; geri dönüş planı hazır olsun." }
          ]
        }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ ---------------- */
    {
      nav: "Bölüm Özeti · Sürümler", eyebrow: "Bölüm 2 · Kapanış",
      title: "Java Sürüm Evrimi — Aklında Kalsın",
      sub: "8'den 25'e Java sürekli sadeleşti ve hızlandı. Her LTS'in özü:",
      blocks: [
        {
          type: "recap",
          title: "Ne öğrendik?",
          items: [
            "**Java 8 (2014) — Fonksiyonel devrim:** Lambda, Stream, Optional, `java.time`. Emir kipinden deklaratif (niyet-odaklı) koda geçiş.",
            "**Java 11 (2018) — Modern API:** `var`, yeni String/HTTP Client, tek dosya çalıştırma; ilk gerçek modern LTS.",
            "**Java 17 (2021) — Veri-odaklı:** `record`, sealed class, pattern matching, text block — daha az kod, daha güvenli veri modelleme.",
            "**Java 21 (2023) — Eşzamanlılık devrimi:** Virtual Threads, pattern matching for switch, sequenced collections.",
            "**Java 25 (2025) — Olgunlaşma:** Önizleme özelliklerinin kararlılaşması, performans ve dil ince ayarları.",
            "**Geçiş kademeli:** 8→11→17→21; her adımda derle + test + `jdeps`/`jdeprscan` tara. LTS seç, canary ile yayınla."
          ]
        },
        {
          type: "callout", variant: "key", icon: "🔑",
          text: "**Tek cümle:** Java her sürümde \"aynı işi daha az ve daha güvenli kodla\" yazmanı sağladı. Yeni sürüme geçmek sadece güncellik değil, <b>daha az hata ve daha hızlı çalışan uygulama</b> demektir."
        }
      ]
    }
  ]
});
