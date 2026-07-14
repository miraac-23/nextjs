/* ================= BÖLÜM 3 — SPRING FRAMEWORK ================= */
PRESENTATION.sections.push({
  cat: "spring", icon: "🍃", kicker: "Bölüm 3 · Spring Framework",
  title: "Spring: Çekirdek Felsefe",
  desc: "Spring bir \"sihir\" değil; kurumsal Java'nın <b>sıkı bağlılık (tight coupling)</b> acısına verilmiş zarif bir cevaptır. IoC/DI'dan transaction ve Web MVC'ye — gerçek örnekler ve Soru–Cevap'la.",
  topics: ["Spring & IoC", "Dependency Injection", "Bean Lifecycle & Scope", "Transaction (+ Distributed)", "Web MVC"],
  slides: [
    /* ---- IoC ---- */
    {
      nav: "Spring & IoC · Problem", eyebrow: "Spring · 1/2",
      title: "Spring Nedir? IoC Hangi Acıyı Çözer?",
      sub: "Spring, nesnelerin yaşam döngüsünü ve bağımlılıklarını yöneten framework'tür. Çözdüğü temel problem: <b>tight coupling</b> — bir sınıf bağımlılığını içeride `new` ile yaratırsa somut sınıflara mıhlanır.",
      blocks: [
        {
          type: "concept", term: "IoC / Dependency Injection",
          what: "Bir sınıfın ihtiyaç duyduğu nesneleri (bağımlılıkları) kendisinin `new`'lemesi yerine, <b>dışarıdan hazır verilmesi</b>. Kontrol sende değil, çerçevededir — adı buradan gelir.",
          origin: "2000'lerin başı kurumsal Java (J2EE/EJB) çok karmaşıktı. Rod Johnson 2003'te bu acıya karşı Spring'i yazdı; DI terimini de Martin Fowler adlandırdı.",
          use: "Bağımlılığı `interface` olarak <b>constructor parametresi</b> yap; `@Component`/`@Bean` ile tanımla. Spring container'ı uygun nesneyi bulup enjekte eder."
        },
        {
          type: "callout", variant: "analogy", icon: "🔌",
          text: "**Sanki priz gibi:** Lamba kendi elektrik santralini kurmaz — duvardaki prize takılır, elektrik <b>dışarıdan gelir</b>. DI'da da sınıf bağımlılığını kendi üretmez; container \"prizden\" verir. Santrali değiştirmek (MySQL→PostgreSQL) lambayı hiç ilgilendirmez."
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "❌ Acı: sıkı bağlılık" },
            { type: "code", cap: "İçeride new → değiştirilemez, test edilemez", code: `class SiparisServisi {
    private final MySqlDepo depo = new MySqlDepo();
    private final EpostaGonderici g = new EpostaGonderici();
    // DB'yi PostgreSQL'e çevirmek = sınıfın İÇİNİ değiştirmek
    // Testte sahte (mock) veremezsin
}` }
          ],
          right: [
            { type: "heading", text: "✓ Çözüm: IoC + DI" },
            { type: "code", cap: "Container kurar, sen tarif edersin", code: `@Configuration
class Config {
    @Bean Depo depo() { return new MySqlDepo(); }
    @Bean Bildirimci bildirimci() { return new EpostaGonderici(); }
}
var ctx = new AnnotationConfigApplicationContext(Config.class);
var s = ctx.getBean(SiparisServisi.class); // bağımlılıklar enjekte` }
          ]
        },
        {
          type: "callout", variant: "key", icon: "🔑",
          text: "**IoC (Inversion of Control):** nesneleri oluşturma/bağlama kontrolünü <b>sen değil, container</b> üstlenir. <b>DI</b>, IoC'nin bağımlılıklar özelindeki en bilinen uygulamasıdır."
        },
        {
          type: "qa", items: [
            { q: "IoC ile DI aynı şey mi?", a: "Tam değil. **IoC** geniş ilke: kontrolü çerçeveye devretmek. **DI** onun en yaygın biçimi: bağımlılıkları dışarıdan enjekte etmek. \"DI, IoC'nin bir türüdür.\"" },
            { q: "Spring'siz de DI yapamaz mıyım?", a: "Yapabilirsin (constructor'dan elle geçer) — ama uygulama büyüdükçe tüm nesneleri ve bağlantıları **elle kurmak** devasa, hataya açık kurulum kodu doğurur. Container bunu otomatikleştirir." },
            { q: "BeanFactory ile ApplicationContext farkı?", a: "`ApplicationContext`, `BeanFactory`'nin zengin halefidir: olay yayını, i18n, kaynak yükleme, otomatik bean post-processing. Modern Spring her yerde ApplicationContext kullanır." }
          ]
        }
      ]
    },
    {
      nav: "Spring · Ekosistem", eyebrow: "Spring · 2/2",
      title: "Bean, Container ve Ekosistem",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🫘", label: "Bean", text: "Container'ın oluşturup yönettiği nesne. Senin `SiparisServisi`'n bir bean'dir." },
            { ico: "📦", label: "Container", text: "`ApplicationContext` — bean'leri oluşturur, bağlar, yaşam döngülerini yönetir." },
            { ico: "📋", label: "Config Metadata", text: "\"Hangi bean'ler var?\" tarifi: Java config, anotasyonlar veya (eski) XML." },
            { ico: "🧩", label: "Modüler", text: "Core/Context, AOP, Data/JPA, Web/MVC, Security — aynı felsefe altında." }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Bir ekip ödeme sağlayıcısını Stripe'tan Iyzico'ya çevirdi. Servis arayüze (`OdemeSaglayici`) bağlı olduğundan, yalnızca yeni implementasyonu yazıp bean tanımını değiştirdiler — iş mantığı sınıflarına <b>hiç dokunmadılar</b>."
        },
        {
          type: "qa", items: [
            { q: "XML config hâlâ kullanılıyor mu?", a: "Yeni projelerde nadiren. Bugün **Java config** (`@Configuration`/`@Bean`) ve **anotasyonlar** (`@Component`) standarttır. XML çoğunlukla eski sistemlerde kalmıştır." },
            { q: "Bean hatasını ne zaman görürüm — derlemede mi?", a: "Genelde **uygulama başlangıcında**. Spring context'i kurarken eksik/çift bean, çözülemeyen bağımlılık gibi hataları erken (fail-fast) bildirir; bu, üretimde sürpriz yaşamamanı sağlar." }
          ]
        }
      ]
    },
    /* ---- DI ---- */
    {
      nav: "Dependency Injection", eyebrow: "Spring · DI",
      title: "Dependency Injection: Üç Yöntem ve Tuzaklar",
      sub: "Bağımlılıkların nesneye <b>dışarıdan verilmesi</b>. Spring üç yol sunar; üretimde <b>constructor injection</b> önerilir.",
      blocks: [
        {
          type: "table",
          headers: ["Yöntem", "Bağımlılık", "Test", "`final`?", "Öneri"],
          rows: [
            ["**Constructor**", "Zorunlu", "En kolay", "Evet", "✅ Önerilen"],
            ["Setter", "Opsiyonel", "Orta", "Hayır", "Bazen"],
            ["Field (`@Autowired`)", "Gizli", "Zor", "Hayır", "❌ Kaçın"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Constructor injection (en iyi)", code: `@Service
class UrunServisi {
    private final UrunDeposu depo;
    UrunServisi(UrunDeposu depo) {   // @Autowired gereksiz (tek ctor)
        this.depo = depo;
    }
}` }
          ],
          right: [
            { type: "code", cap: "@Qualifier / @Primary ile ayrım", code: `@Component @Primary class Eposta implements Bildirimci {}
@Component("sms") class Sms implements Bildirimci {}

AcilServis(@Qualifier("sms") Bildirimci b) { ... } // SMS seçilir` }
          ]
        },
        {
          type: "qa", items: [
            { q: "Neden field injection (`@Autowired private`) kötü?", a: "Bağımlılıkları gizler (sınıf dışından görünmez), `final` yapamazsın, Spring olmadan test edemezsin ve döngüsel bağımlılığı maskeler. **Constructor** hepsini çözer." },
            { q: "Circular dependency (A↔B) ile nasıl başa çıkarım?", a: "En iyisi tasarımı düzeltmek (ortak mantığı 3. bir bean'e çıkarmak). Geçici çözüm: `@Lazy`, setter injection veya `ObjectProvider`. Constructor injection bunu başlangıçta yakalar — bu aslında iyi bir uyarıdır." },
            { q: "Aynı tipte iki bean varsa Spring hangisini seçer?", a: "Belirtmezsen hata verir. `@Primary` ile varsayılanı, `@Qualifier(\"ad\")` ile tam istediğini seçersin." }
          ]
        }
      ]
    },
    /* ---- Lifecycle & Scope ---- */
    {
      nav: "Lifecycle & Scope", eyebrow: "Spring · Bean Yaşam Döngüsü",
      title: "Bean Yaşam Döngüsü ve Scope",
      sub: "Bir bean: oluşturulma → enjeksiyon → başlatma → kullanım → yok edilme. <b>Scope</b>, bir tanımdan kaç örnek üretileceğini belirler.",
      blocks: [
        {
          type: "table",
          headers: ["Scope", "Örnek", "Tipik Kullanım", "Destroy callback"],
          rows: [
            ["**singleton** (varsayılan)", "1 / container", "Durumsuz servis, repository", "✅ Çalışır"],
            ["**prototype**", "Her istekte yeni", "Durumlu, kısa ömürlü", "❌ Spring yönetmez"],
            ["request (web)", "Her HTTP isteği", "İstek-bazlı veri", "✅ İstek bitince"],
            ["session (web)", "Her oturum", "Kullanıcı/sepet verisi", "✅ Oturum bitince"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Lifecycle callback'leri", code: `@Component
class Havuz {
    @PostConstruct void baslat() { /* kaynağı aç */ }
    @PreDestroy   void kapat()  { /* kaynağı kapat */ }
}
// Sıra: ctor → enjeksiyon → @PostConstruct
//       → kullanım → @PreDestroy (ctx.close())` }
          ],
          right: [
            { type: "callout", variant: "warn", icon: "🪤", text: "**Singleton içinde prototype tuzağı:** prototype bean'i ctor'da enjekte edersen yalnızca <b>bir kez</b> oluşur. Çözüm: `ObjectProvider<T>.getObject()` ile her çağrıda taze örnek." },
            { type: "callout", variant: "info", icon: "🔧", text: "Üç callback yolu: `@PostConstruct/@PreDestroy`, `InitializingBean/DisposableBean`, `@Bean(initMethod/destroyMethod)`." }
          ]
        },
        {
          type: "qa", items: [
            { q: "Singleton bean thread-safe mi?", a: "Spring onu tek örnek yapar ama **thread güvenliğini garanti etmez**. Singleton'da paylaşılan mutable durum tutarsan kendin senkronize etmelisin. En iyisi singleton servisleri **durumsuz** tutmaktır." },
            { q: "Prototype bean'in `@PreDestroy`'u neden çalışmaz?", a: "Çünkü Spring prototype örneğini verdikten sonra **takip etmez** (kim sahip, belli değil). Temizliği çağıran kod yapmalı; ya da `ObjectProvider`/destroy çağrısını sen yönetmelisin." },
            { q: "Web'de `request`/`session` scope'u nasıl kullanırım?", a: "İstek başına izole veri (ör. o anki kullanıcı/trace bilgisi) için. Singleton'a enjekte ederken `@Scope(proxyMode=TARGET_CLASS)` proxy kullanılır ki her istekte doğru örnek bağlansın." }
          ]
        }
      ]
    },
    /* ---- Transaction ---- */
    {
      nav: "Transaction · Temel", eyebrow: "Spring · Transaction · 1/5",
      title: "Transaction Yönetimi: ACID Garantisi",
      sub: "Bir işlem çoğu zaman tek SQL değildir (para transferi: düş + ekle). <b>Ya hepsi ya hiçbiri</b> (atomiklik). Spring bunu bildirimsel `@Transactional` ile çözer.",
      blocks: [
        {
          type: "code", cap: "Bildirimsel transaction", code: `@Service
class TransferServisi {
    @Transactional   // metot başında tx başlar, sonunda commit
    public void transfer(String kimden, String kime, int tutar) {
        jdbc.update("UPDATE hesap SET bakiye = bakiye - ? WHERE ad = ?", tutar, kimden);
        if (tutar > limit) throw new KuralIhlali();   // → HEPSİ rollback
        jdbc.update("UPDATE hesap SET bakiye = bakiye + ? WHERE ad = ?", tutar, kime);
    }
}` },
        {
          type: "split",
          left: [
            { type: "bullets", title: "Propagation (yayılım)", items: ["`REQUIRED` (varsayılan) — varsa katıl, yoksa başlat", "`REQUIRES_NEW` — her zaman yeni tx (dışın rollback'i içi etkilemez)", "`NESTED` — savepoint, kısmi rollback", "`SUPPORTS / NOT_SUPPORTED / NEVER`"] }
          ],
          right: [
            { type: "bullets", title: "Isolation (yalıtım)", items: ["`READ_COMMITTED` — çoğu DB varsayılanı", "`REPEATABLE_READ` — MySQL varsayılanı", "`SERIALIZABLE` — en katı (lock → yavaş)", "Trade-off: dirty/non-repeatable/phantom read"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "`@Transactional` aynı sınıftan çağrılınca neden çalışmıyor?", a: "Spring proxy-tabanlıdır. `this.txMethod()` proxy'yi **atlar** (self-invocation), tx başlamaz. Çözüm: metodu başka bir bean'e taşı ya da context'ten alınmış proxy üzerinden çağır." },
            { q: "Hangi exception'da rollback olur?", a: "Varsayılan: yalnızca **unchecked** (`RuntimeException`). Checked exception'da rollback istiyorsan `@Transactional(rollbackFor = Exception.class)`." },
            { q: "Salt-okunur sorgularda ne yapmalıyım?", a: "`@Transactional(readOnly = true)` ver — Hibernate dirty-checking'i kapatır, sürücüye optimizasyon ipucu gider. Uzun süren tx'lerden kaçın (lock tutar). Detay için sonraki slayt." }
          ]
        }
      ]
    },
    /* ---- Transaction öznitelikleri ---- */
    {
      nav: "Transaction · @Transactional", eyebrow: "Spring · Transaction · 2/5",
      title: "@Transactional Öznitelikleri: readOnly ve Diğerleri",
      sub: "`@Transactional` yalnızca \"aç / commit / rollback\" değildir; öznitelikleriyle <b>davranışı ince ayar</b> yaparsın.",
      blocks: [
        {
          type: "code", cap: "Beş öznitelik — örneklerle", code: `// 1) readOnly — salt-okuma: Hibernate dirty-checking KAPANIR, flush yok → hızlı
@Transactional(readOnly = true)
public List<Urun> listele() { return repo.findAll(); }

// 2) rollbackFor — checked exception'da DA geri al (varsayılan: sadece RuntimeException)
@Transactional(rollbackFor = Exception.class)
public void disaAktar() throws IOException { ... }

// 3) noRollbackFor — bu exception'da geri ALMA, commit'i koru
@Transactional(noRollbackFor = BildirimHatasi.class)
public void siparisVer() { ... }

// 4) propagation — yeni BAĞIMSIZ tx; dışın rollback'i bunu etkilemez (ör. audit log)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void denetimKaydet(Log l) { repo.save(l); }

// 5) isolation + timeout — en katı yalıtım, 10 sn'de bitmezse rollback
@Transactional(isolation = Isolation.SERIALIZABLE, timeout = 10)
public void kritikIslem() { ... }` },
        {
          type: "table",
          headers: ["Öznitelik", "Ne yapar", "Tipik değer"],
          rows: [
            ["**readOnly**", "Salt-okuma optimizasyonu; dirty-checking & flush yok", "`true` (tüm getir/listele)"],
            ["**rollbackFor**", "Geri alınacak exception'ları genişletir", "`Exception.class`"],
            ["**noRollbackFor**", "Bu exception'da commit'i koru", "`BildirimHatasi.class`"],
            ["**propagation**", "İç içe tx davranışı", "`REQUIRED` / `REQUIRES_NEW`"],
            ["**isolation**", "Eşzamanlı görünürlük seviyesi", "`READ_COMMITTED` … `SERIALIZABLE`"],
            ["**timeout**", "Saniye sınırı; aşılırsa rollback", "`10`"]
          ]
        },
        {
          type: "callout", variant: "tip", icon: "⚡",
          text: "**Neden `readOnly = true` önemli?** Hibernate salt-okuma tx'inde nesneleri dirty-checking için izlemez ve sonda flush yapmaz → <b>daha az bellek + daha az CPU</b>. Ayrıca bazı kurulumlar bunu görünce sorguyu <b>okuma replikasına</b> yönlendirebilir. Tüm listeleme/getirme servis metotlarında kullan."
        },
        {
          type: "qa", items: [
            { q: "`readOnly = true` veriye yazmayı gerçekten engeller mi?", a: "Hibernate üzerinden değişiklikleri flush etmez (pratikte yazma olmaz), ama bir **güvenlik kilidi değildir** — düz JDBC/native sorgu yine yazabilir. Amacı koruma değil, **performans** ve niyeti belirtmektir." },
            { q: "Checked exception neden varsayılan rollback yapmaz?", a: "Eski EJB geleneği: unchecked (`RuntimeException`) = beklenmeyen hata → rollback; checked = öngörülen durum → commit. İstemiyorsan `rollbackFor = Exception.class` ile değiştir." },
            { q: "`REQUIRES_NEW`'i ne zaman kullanmalıyım?", a: "Dış işlem geri alınsa bile **kalıcı olması gereken** yan kayıtlarda: audit/denetim logu, hata kaydı, sayaç. Yeni bağımsız tx açar. Dikkat: ayrı bağlantı kullanır; aşırı kullanım bağlantı havuzunu yorar." }
          ]
        }
      ]
    },
    {
      nav: "Transaction · Distributed", eyebrow: "Spring · Transaction · 3/5",
      title: "Dağıtık Transaction: 2PC vs Saga",
      sub: "Tek DB'nin ötesine geçince (DB + mesaj kuyruğu, çok servis) basit ACID yetmez. İki temel yaklaşım vardır.",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Saga (mikroserviste tercih)", items: ["İşi yerel transaction'lara böl; her adım commit eder", "Başarısızlığı **telafi (compensating)** transaction ile geri al", "Gevşek bağlılık, ölçeklenir", "Bedeli: **eventual consistency** (anlık değil)"] },
          neg: { title: "2PC / XA (zor)", items: ["Koordinatör: \"hazır mısın?\" → hepsi evet → commit", "Güçlü tutarlılık ama **bloklar** (yavaş katılımcı hepsini bekletir)", "Koordinatör çökerse kaynaklar kilitli kalır", "\"in-doubt\" tx, karmaşık recovery"] }
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat (Saga):** Sipariş → Stok rezerve → Ödeme → Kargo. Ödeme reddedilirse, ileri adımlar yerine <b>telafi</b> çalışır: stok rezervasyonu geri alınır, sipariş iptal edilir. Her servis kendi DB'sini yönetir; tutarlılık olaylarla zamanla sağlanır."
        },
        {
          type: "split",
          left: [
            { type: "bullets", title: "Saga türleri", items: ["**Orchestration** — merkezi koordinatör akışı yönetir (net ama merkezi)", "**Choreography** — servisler olayları dinler, kendi adımını yapar (gevşek ama takibi zor)"] }
          ],
          right: [
            { type: "bullets", title: "Yardımcı desenler", items: ["**Outbox** — DB + olay yayını atomikliği", "**Idempotency** — mesaj tekrarına dayanıklılık", "Araçlar: Kafka/RabbitMQ, Debezium (CDC), Resilience4j"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "Neden basitçe her yerde 2PC kullanmıyoruz?", a: "2PC senkron kilit tutar ve tek bir yavaş/çöken katılımcı tüm işlemi bloklar; bulut/mikroservis ölçeğinde kullanılabilirliği düşürür. Saga, tutarlılığı biraz gevşetip (eventual) ölçek ve dayanıklılık kazandırır." },
            { q: "Eventual consistency kullanıcıyı rahatsız etmez mi?", a: "Tasarımla yönetilir: \"Siparişiniz alındı, ödeme onaylanıyor\" gibi ara durumlar gösterilir. Anlık tutarlılık şart olan yerlerde (tek hesap içi bakiye) yine tek-DB transaction kullanılır." },
            { q: "Outbox pattern tam olarak neyi çözer?", a: "DB'ye yazma ile mesaj yayınlamayı **atomik** yapamazsın (ikisi farklı sistem). Outbox: olayı aynı DB transaction'ında bir tabloya yazarsın, ayrı bir süreç onu okuyup mesaj kuyruğuna güvenle iletir." }
          ]
        }
      ]
    },
    /* ---- Saga Detay & Örnek ---- */
    {
      nav: "Transaction · Saga Örnek", eyebrow: "Spring · Transaction · 4/5",
      title: "Saga Deseni: Detay ve Örnekler",
      sub: "Saga = uzun bir işlemi, her biri kendi DB'sinde commit eden <b>yerel transaction zincirine</b> bölmek. Bir adım patlarsa, önceki adımlar <b>telafi (compensation)</b> işlemleriyle geri alınır.",
      blocks: [
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Senaryo — Sipariş:** ① Stok rezerve → ② Ödeme tahsil → ③ Kargo oluştur. ③ patlarsa <b>ters sırada telafi</b>: ödeme iade → stok rezervasyonu serbest. Her servis kendi DB'sini yönetir; tek bir global transaction yoktur."
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Orchestration — merkezi koordinatör" },
            { type: "code", cap: "Akışı tek yer yönetir, telafiyi tetikler", code: `class SiparisSaga {
  void calistir(Siparis s) {
    var stok = stokServisi.rezerveEt(s);     // adım 1 (commit)
    try {
      var odeme = odemeServisi.tahsilEt(s);  // adım 2 (commit)
      try {
        kargoServisi.olustur(s);             // adım 3
      } catch (Exception e) {
        odemeServisi.iadeEt(odeme);          // TELAFİ 2
        stokServisi.birak(stok);             // TELAFİ 1
        throw e;
      }
    } catch (Exception e) {
      stokServisi.birak(stok);               // TELAFİ 1
      throw e;
    }
  }
}` }
          ],
          right: [
            { type: "heading", text: "Choreography — olay tabanlı, koordinatörsüz" },
            { type: "code", cap: "Her servis olayı dinler, kendi adımını + olay yayar", code: `SiparisOlusturuldu
   → Stok:  rezerve et  → StokRezerveEdildi
StokRezerveEdildi
   → Odeme: tahsil et   → OdemeAlindi | OdemeReddedildi
OdemeReddedildi                        // telafi tetiklenir
   → Stok:  rezervasyonu geri al
OdemeAlindi
   → Kargo: gonderi olustur → Gonderildi

// Spring: @KafkaListener ile her servis ilgili olayı dinler` }
          ]
        },
        {
          type: "twocol",
          pos: { title: "Orchestration ne zaman?", items: ["Akış karmaşık, adım sırası net olmalı", "Merkezî izleme/yönetim isteniyorsa", "Tek yerden \"sürecin neresindeyiz?\" görünürlüğü", "Dezavantaj: koordinatör merkezî bağımlılık"] },
          neg: { title: "Choreography ne zaman?", items: ["Servisler gevşek bağlı olsun, tek nokta olmasın", "Olay-tabanlı (Kafka) mimari zaten varsa", "Yeni servis eklemek kolay (olayı dinler)", "Dezavantaj: akışı uçtan uca izlemek zor"] }
        },
        {
          type: "qa", items: [
            { q: "Telafi (compensation) işlemi tam olarak nedir?", a: "Önceki bir adımın etkisini **mantıksal olarak geri alan** yeni bir işlemdir — DB rollback değil! Ör. \"ödemeyi iade et\", \"rezervasyonu serbest bırak\". Çünkü o adım zaten commit edilmiştir; geri almak için yeni bir iş yaparsın." },
            { q: "Geri alınamayan adımlar (gönderilen e-posta) için ne yapılır?", a: "Üç yol: **(1)** geri alınamaz adımı en sona koy (her şey başarılıysa çalışsın), **(2)** ileri telafi uygula (düzeltici bildirim gönder), **(3)** adımı geç-bağla (önce taslak, onay gelince kesinleştir)." },
            { q: "Saga'da kısmi başarısızlığı nasıl güvene alırım?", a: "Her adım ve telafi **idempotent** olmalı (tekrar çağrı yan etki yapmamalı) ve olaylar **Outbox** ile güvenli yayınlanmalı. Böylece mesaj tekrarı/yeniden deneme veriyi bozmaz." }
          ]
        }
      ]
    },
    /* ---- Eventual Consistency ---- */
    {
      nav: "Transaction · Eventual Consistency", eyebrow: "Spring · Transaction · 5/5",
      title: "Eventual Consistency (Nihai Tutarlılık)",
      sub: "Dağıtık sistemde bir güncellemeden sonra servisler/replikalar <b>kısa süre tutarsız</b> olabilir; ama yeni güncelleme gelmezse hepsi <b>eninde sonunda aynı duruma yakınsar</b>. Saga'nın doğal sonucudur.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Strong vs Eventual" },
            { type: "bullets", items: ["**Strong (güçlü):** herkes anında en güncel veriyi görür (tek DB, banka hesabı içi bakiye)", "**Eventual (nihai):** geçici fark olur, zamanla yakınsar (mikroservis, replika, önbellek)", "**Neden mecbur?** CAP teoremi: ağ bölünmesinde (P) aynı anda hem tam tutarlılık (C) hem erişilebilirlik (A) olmaz → dağıtık sistem genelde **A+P** seçer = eventual"] }
          ],
          right: [
            { type: "heading", text: "Zaman çizelgesi (örnek)" },
            { type: "code", cap: "Sipariş sonrası birkaç yüz ms", code: `t0  Sipariş alındı        → durum: "ONAYLANIYOR"
t0  (stok henüz düşmedi, fatura yok — TUTARSIZ an)
t1  StokRezerveEdildi olayı işlendi
t2  OdemeAlindi olayı işlendi
t3  Fatura kesildi, kargo oluştu
t3  Tüm servisler aynı görüşte → "ONAYLANDI" (YAKINSADI)` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Bir e-ticarette sipariş verince \"ödemeniz işleniyor\" görürsün; stok sayısı bir an eski kalabilir; banka havalesi \"pending\" görünür sonra \"completed\" olur; sosyal medyada beğeni sayısı saniyelerce gecikir. Hepsi <b>eventual consistency</b>'dir — hata değil, tasarım."
        },
        {
          type: "bullets", title: "Güvenli kılan desenler",
          items: [
            "**Outbox** — DB yazımı + olay yayını atomik (kayıp/çift olay yok)",
            "**Idempotency** — aynı olayı ikinci kez işleme (olay id'si ile)",
            "**Retry + Dead Letter** — geçici hatada yeniden dene, kalıcıda kenara ayır",
            "**Versiyonlama / son-yazan-kazanır** — çakışan güncellemeleri çöz",
            "**UX tasarımı** — ara durumları göster (\"işleniyor\"), kullanıcıyı bilgilendir"
          ]
        },
        {
          type: "qa", items: [
            { q: "Eventual consistency veri kaybı mı demek?", a: "Hayır. Veri kaybolmaz; sadece tüm kopyaların **aynı değeri göstermesi anlık değil, kısa bir gecikmeyle** olur. Yeni değişiklik durduğunda sistem tutarlı hâle yakınsar." },
            { q: "Ne zaman strong, ne zaman eventual seçmeliyim?", a: "Tek bir kaynak içinde **anlık doğruluk şartsa** (hesap bakiyesi, stok son 1 adet yarışı) strong/tek-DB transaction. Servisler arası iş akışında (sipariş→ödeme→kargo) eventual + Saga ölçek ve dayanıklılık verir." },
            { q: "Kullanıcı eski/tutarsız veri görürse ne yaparım?", a: "Tasarımla yönet: ara durum göster (\"onaylanıyor\"), kritik ekranlarda **read-your-writes** (kendi yazdığını hemen gör) garantisi ver, ve nihai durumu (başarılı/başarısız) bildirim/polling ile ilet." }
          ]
        }
      ]
    },
    /* ---- Web MVC ---- */
    {
      nav: "Web MVC", eyebrow: "Spring · Web",
      title: "Spring Web MVC Framework",
      sub: "HTTP isteklerini işleyip yanıt üreten olgun çatı. Merkezi: <b>DispatcherServlet</b> (Front Controller) — tüm istekler tek kapıdan geçer, uygun controller'a yönlendirilir.",
      blocks: [
        {
          type: "code", cap: "REST Controller", code: `@RestController
@RequestMapping("/api/urunler")
class UrunController {
    private final UrunServisi servis;
    UrunController(UrunServisi s) { this.servis = s; }

    @GetMapping("/{id}")
    ResponseEntity<Urun> getir(@PathVariable Long id) {
        return ResponseEntity.ok(servis.bul(id));
    }
    @PostMapping
    ResponseEntity<Urun> kaydet(@RequestBody @Valid UrunDto dto) {
        return ResponseEntity.status(201).body(servis.kaydet(dto));
    }
}` },
        {
          type: "split",
          left: [
            { type: "bullets", title: "Request binding", items: ["`@PathVariable` — URL yolundan (`/urun/{id}`)", "`@RequestParam` — query string (`?sayfa=2`)", "`@RequestBody` — JSON gövde (Content-Type şart)", "`@RequestHeader` — HTTP başlığı"] }
          ],
          right: [
            { type: "bullets", title: "İstek akışı (DispatcherServlet)", items: ["İstek → DispatcherServlet (tek kapı)", "HandlerMapping → doğru controller metodu", "Parametre binding → iş mantığı", "`@RestController` → JSON; `@Controller` → view (Thymeleaf)"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "`@Controller` ile `@RestController` farkı?", a: "`@Controller` view adı döndürür (sunucu-render HTML). `@RestController` = `@Controller` + `@ResponseBody`; dönüş nesnesini doğrudan JSON/XML gövdesine yazar (REST API)." },
            { q: "Spring Boot'ta `@EnableWebMvc` kullanmalı mıyım?", a: "Hayır — Boot'un MVC auto-configuration'ını **devre dışı bırakır** ve hazır varsayılanları (message converter, content negotiation) kaybedersin. Sadece tam manuel kontrol istediğinde, bilerek kullanılır." },
            { q: "DispatcherServlet tam olarak ne yapar?", a: "Front Controller'dır: tüm HTTP isteklerini tek noktadan alır, doğru handler'ı bulur (HandlerMapping), argümanları bağlar, sonucu uygun biçime (JSON/HTML) çevirir ve yanıtı döndürür. Tüm MVC akışının merkezidir." }
          ]
        }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ ---------------- */
    {
      nav: "Bölüm Özeti · Spring", eyebrow: "Bölüm 3 · Kapanış",
      title: "Spring — Aklında Kalsın",
      sub: "Spring bir sihir değil; sıkı bağlılık acısına verilmiş mühendislik cevabı. Çekirdek fikirler:",
      blocks: [
        {
          type: "recap",
          title: "Ne öğrendik?",
          items: [
            "**IoC = kontrolü çerçeveye devret.** Nesneleri sen `new`'lemezsin, container kurar ve bağlar. **DI**, bunun bağımlılıklar özelindeki uygulamasıdır.",
            "**Constructor injection tercih et.** Bağımlılıklar görünür, `final` olur, Spring'siz test edilir; field injection (`@Autowired private`) bunları gizler.",
            "**Bean = container'ın yönettiği nesne.** `@Component`/`@Bean` ile tanımlanır, `ApplicationContext` içinde yaşar; hataları başlangıçta (fail-fast) yakalar.",
            "**Scope & yaşam döngüsü:** Varsayılan `singleton` (tek örnek). `@PostConstruct`/`@PreDestroy` ile kurulum/temizlik kancalarına bağlanırsın.",
            "**`@Transactional` = ya hep ya hiç.** Metot bir proxy ile sarılır; başarıda commit, hatada rollback. Dağıtık dünyada Saga deseni devreye girer.",
            "**Web MVC:** Tüm istekler tek kapıdan (DispatcherServlet) geçer; `@RestController` JSON döndürür, `@Controller` HTML view."
          ]
        },
        {
          type: "callout", variant: "key", icon: "🔑",
          text: "**Köprü:** Spring güçlü ama kurulumu (bean tarifleri, sunucu, bağımlılık sürümleri) elle yorucudur. Sıradaki bölüm tam da bunu çözüyor: **Spring Boot** — \"aynı Spring, ama kurulumu senin yerine yapan.\""
        }
      ]
    }
  ]
});
