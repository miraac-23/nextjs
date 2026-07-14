/* ================= BÖLÜM 5 — SPRING vs SPRING BOOT ================= */
PRESENTATION.sections.push({
  cat: "compare", icon: "⚖️", kicker: "Bölüm 5 · Karşılaştırma", rmLabel: "Spring Vs SpringBoot",
  title: "Spring vs Spring Boot",
  desc: "Rakip değil, iki yüz: Spring temeli sağlar, Boot kurulum yükünü kaldırır. \"Spring'i öğren, Spring Boot ile uygula.\" — karşılaştırma, seçim, geçiş ve Soru–Cevap.",
  topics: ["Temel Farklar", "Ne Zaman Hangisi", "Geçiş (Migration)", "Sonuç"],
  slides: [
    {
      nav: "Temel Farklar", eyebrow: "Karşılaştırma · Tablo",
      title: "Temel Farklar",
      sub: "Spring Boot, Spring Framework'ün üzerine kurulu bir <b>kolaylık katmanıdır</b> — onun yerine geçmez, onu hızlandırır.",
      blocks: [
        {
          type: "table",
          headers: ["Konu", "Spring", "Spring Boot"],
          rows: [
            ["Yapılandırma", "Manuel (XML/Java config)", "Otomatik (auto-configuration)"],
            ["Bağımlılık", "Tek tek + sürüm uyumu", "Starter'lar + BOM"],
            ["Sunucu", "Harici Tomcat (WAR)", "Gömülü (`java -jar`)"],
            ["Varsayılanlar", "Sen verirsin", "Makul varsayılanlar hazır"],
            ["Boilerplate", "Yüzlerce satır config", "Minimal"],
            ["Üretim araçları", "Elle ekle", "Actuator/profil/metrik hazır"],
            ["Kontrol", "Tam manuel", "Varsayılanı geçersiz kılabilirsin"]
          ]
        },
        {
          type: "callout", variant: "key", icon: "🎛️",
          text: "**Kontrol kaybı korkusu yersiz:** Boot opinionated ama dayatmacı değil. Bean tanımlamazsan varsayılan gelir; tanımlarsan <b>seninki kazanır</b> (`@ConditionalOnMissingBean`); istemediğini `exclude` edebilirsin."
        },
        {
          type: "qa", items: [
            { q: "Spring Boot, Spring'in yerini mi aldı?", a: "Hayır. Boot, Spring'in **üstünde** çalışır — aynı IoC/DI, AOP, MVC çekirdeğini kullanır. Boot sadece kurulumu ve yapılandırmayı otomatikleştirir. \"Boot öğrenmek\" aslında \"Spring'i kolay yoldan kullanmak\"tır." },
            { q: "Auto-configuration nasıl çalışır?", a: "Boot, classpath'e ve mevcut bean'lere bakar (`@Conditional`). Ör. classpath'te H2 ve JPA varsa otomatik bir DataSource kurar — ama sen kendi DataSource'unu tanımlarsan onu kullanır." }
          ]
        }
      ]
    },
    {
      nav: "Somut Fark: Kod", eyebrow: "Karşılaştırma · Öncesi/Sonrası",
      title: "Somut Fark: Aynı İş, İki Yol",
      sub: "Bir web + JPA uygulamasını ayağa kaldırmak — düz Spring'de elle, Spring Boot'ta auto-config ile.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Düz Spring — her şeyi elle kur" },
            { type: "code", cap: "Onlarca satır config + WAR + harici Tomcat", code: `@Configuration @EnableWebMvc @ComponentScan
class WebConfig { /* ViewResolver, converter... */ }

@Configuration
class DataConfig {
  @Bean DataSource ds() {
    var d = new DriverManagerDataSource();
    d.setUrl("jdbc:mysql://..."); d.setUsername("app");
    return d;
  }
  @Bean LocalContainerEntityManagerFactoryBean emf() { ... }
  @Bean PlatformTransactionManager tx() { ... }
}
// + WebApplicationInitializer (DispatcherServlet kaydı)
// + WAR paketle + harici Tomcat'e deploy` }
          ],
          right: [
            { type: "heading", text: "Spring Boot — auto-config" },
            { type: "code", cap: "Birkaç satır + java -jar", code: `@SpringBootApplication
class App {
  public static void main(String[] a) {
    SpringApplication.run(App.class, a);
  }
}` },
            { type: "code", cap: "application.yml — gerisi otomatik", code: `spring.datasource.url: jdbc:mysql://...
spring.datasource.username: app
# DataSource, JPA, transaction, DispatcherServlet,
# gömülü Tomcat → HEPSİ auto-config ile` }
          ]
        },
        {
          type: "callout", variant: "key", icon: "⚖️",
          text: "**Aynı işlevsellik:** Düz Spring'de onlarca satır config + WAR + harici sunucu; Boot'ta birkaç satır + `java -jar`. Boot bu yapılandırmayı senin yerine \"fikir sahibi varsayılanlar\"la üretir — istemediğini `@Bean`/property ile <b>override edersin</b>, kontrol sende kalır."
        },
        {
          type: "qa", items: [
            { q: "Boot config'i \"gizliyor\" — sorun olmaz mı?", a: "Gizlemiyor, **varsayılan veriyor**. `--debug` ile auto-config raporunu (hangi config neden uygulandı/atlandı) görebilir; `application.yml` veya `@Bean` ile her şeyi override edebilirsin. Sihir değil, şeffaf bir varsayılanlar katmanı." }
          ]
        }
      ]
    },
    {
      nav: "Ne Zaman Hangisi", eyebrow: "Karşılaştırma · Seçim",
      title: "Ne Zaman Hangisi?",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Spring Boot tercih et", items: ["Yeni web/REST uygulaması, mikroservis (neredeyse her zaman)", "Hızlı prototip / MVP — dakikalar içinde başla", "Standart altyapı (DB, web, güvenlik) — auto-config", "Üretim odaklı: hazır monitoring/metrik/health"] },
          neg: { title: "Düz Spring tercih et", items: ["Mevcut, büyük, özel yapılandırılmış legacy sistem", "Çok özel/sıra dışı altyapı, tam manuel kontrol", "Boot dışı minimal bağımlılık zorunluluğu", "(Günümüzde yeni projede nadirdir)"] }
        },
        {
          type: "stats",
          items: [
            { big: "%90+", lbl: "Yeni projede doğru seçim: Boot" },
            { big: "Dakika", lbl: "Initializr ile başlangıç" },
            { big: "1 jar", lbl: "Gömülü sunucu ile dağıtım" }
          ]
        },
        {
          type: "qa", items: [
            { q: "Öğrenmeye Spring'den mi Boot'tan mı başlamalıyım?", a: "Pratikte Boot ile çalışmaya başlarsın (hızlı geri bildirim), ama **altındaki Spring kavramlarını** (IoC/DI, bean, transaction) öğrenmeden Boot'un \"sihri\" anlaşılmaz. İkisi birlikte; bu eğitimin sırası da budur." }
          ]
        }
      ]
    },
    {
      nav: "Geçiş & Sonuç", eyebrow: "Karşılaştırma · Migration & Sonuç",
      title: "Geçiş Adımları ve Sonuç",
      blocks: [
        {
          type: "bullets", title: "Düz Spring → Spring Boot (kademeli)",
          items: [
            "Bağımlılıkları `spring-boot-starter-*`'a çevir; sürümü BOM'a bırak.",
            "`@SpringBootApplication` + `SpringApplication.run(...)` giriş noktası ekle.",
            "Elle `DataSource/JdbcTemplate/DispatcherServlet` config'lerini sil; sadece gerçekten özel olanı bırak.",
            "XML → `application.yml` + `@Configuration`.",
            "Harici Tomcat/WAR → gömülü sunucu + `java -jar`.",
            "Actuator/profil/metrik ekle; her adımda testleri çalıştır."
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🎯",
          text: "**Doğru zihniyet:** \"Spring'i öğren, Spring Boot ile uygula.\" Boot'un sihrini anlamak, altındaki Spring'i anlamaktır. Yeni projede Boot seç — ama her katmanı ihtiyaç duyduğunda özelleştirebileceğini bil."
        },
        {
          type: "qa", items: [
            { q: "Geçiş sırasında en sık ne kırılır?", a: "Genelde XML/elle bean tanımları ile auto-config'in **çakışması** ve bağımlılık sürüm çatışmaları. Kademeli git: her adımda testleri koştur, çakışan auto-config'i `exclude` et, davranış farklarını yakala." },
            { q: "Bu eğitimden sonra ne yapmalıyım?", a: "Küçük bir Boot projesi kur (REST + JPA + Security), sonra bir mikroservis ikilisi (Eureka/Gateway veya Kafka) ile dağıtık konuları uygula. Her konuyu **yaparak** pekiştir — slaytlar harita, pratik yoldur." }
          ]
        }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ / KARAR ---------------- */
    {
      nav: "Karar Özeti", eyebrow: "Bölüm 5 · Kapanış",
      title: "Ne Zaman Hangisi — Aklında Kalsın",
      sub: "Spring ve Spring Boot rakip değil; aynı takımın iki oyuncusu. Karar için pusula:",
      blocks: [
        {
          type: "recap",
          title: "Özet",
          items: [
            "**Aynı çekirdek.** Boot, Spring'in üstünde çalışır — IoC/DI, AOP, MVC hep aynı. Boot yeni bir framework değil, Spring'i kolay kullanma yoludur.",
            "**Yeni proje mi? → Spring Boot.** Neredeyse her zaman. Dakikalar içinde çalışan, üretime hazır iskelet.",
            "**Tam manuel kontrol / özel legacy ihtiyaç? → Düz Spring.** Nadir; genelde Boot varsayılanı geçersiz kılmak yeter.",
            "**Kontrol kaybı korkusu yersiz:** Bean tanımlamazsan varsayılan gelir; tanımlarsan seninki kazanır; istemediğini `exclude` edersin.",
            "**Geçiş kademeli olmalı:** 2.7 (köprü) → Java 17 → 3.x → 4.x; her halkada test. `javax→jakarta` için OpenRewrite."
          ]
        },
        {
          type: "callout", variant: "key", icon: "🎯",
          text: "**Tek cümle:** \"**Spring'i öğren, Spring Boot ile uygula.**\" Temeli anlarsan, Boot'un otomatiği sana sihir değil, kontrol edebildiğin bir kolaylık olarak görünür."
        }
      ]
    }
  ]
});

/* ================= BÖLÜM 6 — SPRING BOOT SÜRÜM ANALİZİ ================= */
PRESENTATION.sections.push({
  cat: "boot", icon: "📈", kicker: "Bölüm 6 · Spring Boot Sürüm Analizi",
  title: "Spring Boot Sürüm Analizi: 1.x → 4.x",
  desc: "Spring Boot'un büyük sürümleri ve <b>yükseltmenin</b> getirileri/riskleri — 2.x→3.x'teki <b>javax → jakarta</b> kırılmasından <b>Boot 4.0/4.1</b> (Spring 7, Jackson 3) yeniliklerine.",
  topics: ["Sürüm Evrimi (1.x → 4.x)", "Boot 4.0 / 4.1 Yenilikleri", "Avantaj / Dezavantaj / Risk", "Yükseltme Stratejisi"],
  slides: [
    {
      nav: "Sürüm Evrimi", eyebrow: "Boot Sürüm · Evrim",
      title: "Spring Boot Sürüm Evrimi",
      sub: "Her büyük sürüm bir Spring Framework kuşağına dayanır ve Java taban sürümünü yükseltir.",
      blocks: [
        {
          type: "table",
          headers: ["Sürüm", "Dayandığı / Java", "Öne çıkan", "Durum"],
          rows: [
            ["**Boot 1.x** (2014)", "Spring 4 / Java 6–8", "İlk auto-config, starter, gömülü sunucu", "🔴 EOL"],
            ["**Boot 2.x** (2018)", "Spring 5 / Java 8–17", "WebFlux (reactive), Micrometer, HikariCP", "🟡 OSS desteği bitti"],
            ["**Boot 3.0** (2022)", "Spring 6 / **Java 17+**", "**javax→jakarta**, GraalVM Native (AOT), Observation", "🟢 3.x hattı"],
            ["**Boot 3.2** (2023)", "Java 17/21", "**Virtual Threads**, **RestClient**", "🟢"],
            ["**Boot 3.3–3.5** (24–25)", "Java 17–25", "Observability, güvenlik, kademeli iyileştirme", "🟢 3.x hattı"],
            ["**Boot 4.0** (Kas 2025)", "**Spring 7** / Java 17–25", "**Jackson 3**, **JSpecify**, **API versiyonlama**, yerleşik `@Retryable`", "🟢 Güncel major"],
            ["**Boot 4.1** (2026)", "Spring 7.x / Java 17–25", "4.x hattının kademeli iyileştirmeleri", "🟢 En güncel"]
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**En büyük kırılma 2.x → 3.x:** Jakarta EE 9 ile tüm `javax.*` paketleri `jakarta.*` oldu (`javax.persistence` → `jakarta.persistence`). Bu, senin kodunu <b>ve</b> tüm 3. parti kütüphaneleri etkiler. Ayrıca <b>Java 17 artık zorunlu</b> taban."
        },
        {
          type: "qa", items: [
            { q: "Neden sürekli yükseltmeliyim, çalışan sürümde kalsam?", a: "Eski sürüm = **güvenlik yaması yok** (Boot 2.x OSS desteği bitti). Açıklar kapanmaz, yeni kütüphaneler uyumsuzlaşır, işe alım/topluluk desteği azalır. Yükseltme bir bakım borcudur — biriktikçe pahalılaşır." },
            { q: "Hangi sürümü hedeflemeliyim?", a: "Yeni projede **en güncel 4.x** (Spring 7). Mevcut 2.x sistemde önce 2.7'ye çık (köprü), Java 17'ye geç, 3.x'e atla, sonra 4.x'i planla." }
          ]
        }
      ]
    },
    {
      nav: "Boot 4.0 / 4.1 Yenilikleri", eyebrow: "Boot Sürüm · 4.x",
      title: "Spring Boot 4.0 ve 4.1: Yenilikler",
      sub: "Boot 4.0 (Kasım 2025), <b>Spring Framework 7</b> üstüne kuruludur. Baseline Java 17, Java 25'e kadar test edilir. 4.1 ise 4.x hattının kademeli devamıdır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔢", label: "API Versiyonlama", text: "Endpoint'leri <b>yerleşik</b> sürümle (header/param/path) — istemciyi kırmadan API'yi evir." },
            { ico: "🛡️", label: "JSpecify Null-Safety", text: "Standart `@Nullable`/`@NonNull`; derleyici/araç null analizi, Kotlin dostu." },
            { ico: "📦", label: "Jackson 3", text: "Yeni namespace (`tools.jackson`), daha hızlı, daha güvenli varsayılanlar." },
            { ico: "🔁", label: "Yerleşik Dayanıklılık", text: "`@Retryable`, `@ConcurrencyLimit` artık <b>Spring core</b>'da (ek bağımlılık yok)." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "API versiyonlama (Boot 4)", code: `@GetMapping(value = "/urunler", version = "1.0")
List<UrunV1> v1() { ... }

@GetMapping(value = "/urunler", version = "2.0")
List<UrunV2> v2() { ... }
// İstemci sürümü header/param/path ile seçer;
// v1 ve v2 yan yana yaşar → kademeli geçiş` }
          ],
          right: [
            { type: "code", cap: "Yerleşik retry + null-safety", code: `@Retryable(maxAttempts = 3)      // Spring core (Spring Retry gerekmez)
@ConcurrencyLimit(10)            // eşzamanlı çağrı sınırı
public Sonuc disServis() { ... }

import org.jspecify.annotations.Nullable;
@Nullable Kullanici bul(Long id);  // IDE/derleyici null analizi` }
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Boot 3 → 4 yükseltme:** Ana kalemler **Jackson 2 → 3** (`com.fasterxml.jackson` → `tools.jackson`) ve **Spring 6 → 7** API değişiklikleri + kaldırılan eski API'ler. 2→3'teki kadar yıkıcı değil (jakarta zaten yapıldı), baseline yine Java 17 — ama yine de Release Notes + OpenRewrite ile git."
        },
        {
          type: "qa", items: [
            { q: "Boot 3'ten 4'e geçiş, 2'den 3'e kadar zor mu?", a: "Genelde **daha hafif**. En sancılı kısım olan `javax→jakarta` zaten 3'te yapıldı. 4'te ana iş Jackson 3 ve Spring 7 API uyarlamaları; taban yine Java 17 olduğundan JVM geçişi gerekmez." },
            { q: "Yeni projede 3.x mi 4.x mi?", a: "Yeni projede **en güncel 4.x** — Spring 7, Jackson 3, yerleşik dayanıklılık ve API versiyonlama hazır gelir. Mevcut stabil 3.x sistemi aceleyle taşıman gerekmez ama yol haritasına ekle (3.x desteği zamanla daralır)." },
            { q: "API versiyonlama neden bu kadar önemli?", a: "İstemcileri **kırmadan** API'yi evirebilmek için. `v1` ve `v2`'yi aynı anda sunup mobil/web istemcileri kademeli geçirir, eski sürümü zamanı gelince kaldırırsın. Önceden elle (path/header) yapılırdı; Boot 4 bunu standartlaştırdı." }
          ]
        }
      ]
    },
    {
      nav: "Avantaj / Dezavantaj / Risk", eyebrow: "Boot Sürüm · Değerlendirme",
      title: "Yükseltmenin Avantaj, Dezavantaj ve Riskleri",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Avantajları", items: ["**Güvenlik yamaları** + uzun destek penceresi", "**Performans**: Spring 6/7, Hibernate 6, daha hızlı başlatma", "**Yeni yetenekler**: Virtual Threads, GraalVM Native, RestClient, API versiyonlama (4.x), Jackson 3", "Güncel kütüphane uyumu + canlı topluluk"] },
          neg: { title: "Dezavantajları", items: ["**Migrasyon eforu** (özellikle 2→3)", "**Java 17 zorunlu** — eski JVM/altyapı geçişi", "3. parti kütüphane **uyum gecikmesi**", "Test ve regresyon yükü"] }
        },
        {
          type: "callout", variant: "warn", icon: "🚨",
          text: "**Başlıca riskler (2→3):** ① `javax → jakarta` tüm import'lar + bağımlılıklar. ② Kaldırılan/değişen API'ler (`WebSecurityConfigurerAdapter` gitti, Security lambda-DSL). ③ Hibernate 6 sorgu/şema farkları. ④ Property yeniden adlandırmaları. ⑤ `trailing slash` eşleştirme davranışı değişti. Hepsi <b>derleme veya çalışma zamanında</b> patlayabilir."
        },
        {
          type: "bullets", title: "Güvenli yükseltme stratejisi",
          items: [
            "Sıçramayı zincirle: **2.7** (köprü) → Java 17 → **3.x** → **4.x**; her halkada test koş",
            "**OpenRewrite / Spring Boot Migrator** ile otomatik `javax→jakarta` dönüşümü",
            "Bağımlılıkları **BOM**'a bırak, sürümleri tek tek elle zorlama",
            "Güçlü **test kapsamı** + her adımda CI; davranış farklarını yakala",
            "**Release Notes / Migration Guide**'ı oku — kaldırılan/değişen API listesi orada",
            "Kademeli yayınla (canary); geri dönüş (rollback) planı hazır olsun"
          ]
        },
        {
          type: "qa", items: [
            { q: "javax→jakarta dönüşümünü elle mi yapacağım?", a: "Hayır — **OpenRewrite** (veya IDE/Spring Boot Migrator) çoğu import ve bağımlılık dönüşümünü otomatik yapar. Yine de 3. parti kütüphanelerin jakarta-uyumlu sürümlerini bulman ve davranış farklarını test etmen gerekir." },
            { q: "Büyük bir 2.x monolitini 3.x'e geçirmek riskli, nasıl yönetirim?", a: "Tek seferde \"big bang\" yerine **kademeli**: önce Java 17 + Boot 2.7 (her şey çalışır durumda), sonra otomatik dönüşüm + modül modül test, sonra 3.x. Mümkünse kritik modülleri ayır, feature-flag ve canary ile yayına al." }
          ]
        }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ ---------------- */
    {
      nav: "Bölüm Özeti · Boot Sürümleri", eyebrow: "Bölüm 6 · Kapanış",
      title: "Spring Boot Sürümleri — Aklında Kalsın",
      sub: "1.x'ten 4.x'e Boot olgunlaştı; en kritik kırılma 2→3 (javax→jakarta). Özet:",
      blocks: [
        {
          type: "recap",
          title: "Ne öğrendik?",
          items: [
            "**Her Boot sürümü bir Spring kuşağına ve Java tabanına yaslanır:** Boot 3.x → Spring 6 + Java 17; Boot 4.x → Spring 7 + Jackson 3.",
            "**En büyük kırılma 2.x → 3.x:** tüm `javax.*` → `jakarta.*`. Bu, kod değil paket/namespace değişimidir ama her yeri etkiler.",
            "**Yükseltmenin getirisi:** güvenlik yamaları, performans (daha hızlı başlatma), yeni yetenekler (Virtual Threads, GraalVM Native, RestClient).",
            "**Güvenli strateji:** 2.7 (köprü) → Java 17 → 3.x → 4.x; her halkada test. `javax→jakarta` için **OpenRewrite** otomatik dönüşüm.",
            "**LTS + BOM disiplini:** bağımlılık sürümlerini elle zorlama, BOM'a bırak; canary ile kademeli yayınla, rollback planı hazır olsun."
          ]
        }
      ]
    },

    /* ---------------- TERİM SÖZLÜĞÜ (genel kapanış) ---------------- */
    {
      nav: "Terim Sözlüğü", eyebrow: "Kapanış · Hızlı Başvuru",
      title: "Terim Sözlüğü — Bir Bakışta",
      sub: "Sunum boyunca geçen anahtar terimlerin tek cümlelik karşılıkları. Aklında kalmayanlara buradan hızlıca bak.",
      blocks: [
        {
          type: "glossary", title: "Java & JVM",
          items: [
            { t: "JDK", d: "Geliştirme kiti: derleyici + araçlar + JRE." },
            { t: "JRE", d: "Çalıştırma ortamı: JVM + standart kütüphaneler." },
            { t: "JVM", d: "`.class` bytecode'unu yorumlayan/derleyen sanal makine." },
            { t: "Bytecode", d: "Platformdan bağımsız ara kod (`.class`)." },
            { t: "GC", d: "Çöp toplayıcı: erişilmeyen nesnelerin belleğini otomatik boşaltır." },
            { t: "JIT", d: "Sıcak metotları çalışma anında makine koduna derler." },
            { t: "Thread", d: "Paylaşılan bellekte bağımsız yürütme şeridi." },
            { t: "Virtual Thread", d: "Java 21: milyonlarca ucuz, I/O-dostu thread." }
          ]
        },
        {
          type: "glossary", title: "Spring & Spring Boot",
          items: [
            { t: "IoC", d: "Nesne oluşturma/bağlama kontrolünü çerçeveye devretmek." },
            { t: "DI", d: "Bağımlılıkları dışarıdan enjekte etmek (IoC'nin uygulaması)." },
            { t: "Bean", d: "Container'ın oluşturup yönettiği nesne." },
            { t: "ApplicationContext", d: "Bean'leri kuran/bağlayan Spring container'ı." },
            { t: "AOP", d: "Kesişen ilgileri (log, transaction) koddan ayırma." },
            { t: "@Transactional", d: "Metodu ya-hep-ya-hiç işlem sınırına sarar." },
            { t: "Auto-config", d: "Classpath'e bakıp makul varsayılanları otomatik kuran Boot yeteneği." },
            { t: "Starter", d: "Uyumlu bağımlılıkları tek pakette toplayan Boot modülü." }
          ]
        }
      ]
    }
  ]
});
