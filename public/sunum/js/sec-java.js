/* ================= BÖLÜM 1 — JAVA: ÇEKİRDEK & İLERİ ================= */
PRESENTATION.sections.push({
  cat: "java", icon: "☕", kicker: "Bölüm 1 · Java Çekirdek & İleri",
  title: "Java: Eşzamanlılık, JVM ve Tasarım",
  desc: "Dilin gücünü ortaya çıkaran ileri konular — derinlemesine, gerçek hayat örnekleriyle ve her konuda Soru–Cevap'la: çoklu iş parçacığı, virtual thread'ler, reflection, tasarım desenleri ve JVM motorunun iç mimarisi.",
  topics: ["Çoklu İş Parçacığı (4 slayt)", "CompletableFuture (Async)", "Virtual Threads (3 slayt)", "Reflection & Annotations", "Proxy (Dynamic Proxy)", "Design Patterns", "Records", "JDK/JRE/JVM", "JVM Mimarisi", "GC & JIT"],
  slides: [
    /* ---------------- ÇOKLU İŞ PARÇACIĞI ---------------- */
    {
      nav: "Çoklu İş Parçacığı · Giriş", eyebrow: "Eşzamanlılık · 1/4",
      title: "Çoklu İş Parçacığı ve Eşzamanlılık",
      sub: "Bir <b>process</b> (çalışan program) içinde, aynı belleği paylaşan birden çok bağımsız yürütme akışı (<b>thread</b>). Çok çekirdekli işlemcide işler gerçekten <b>aynı anda</b> çalışır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🧵", label: "Thread Nedir", text: "Process içinde bağımsız bir \"yürütme şeridi\". Aynı heap'i paylaşır, kendi stack'i vardır." },
            { ico: "⚖️", label: "Concurrency vs Parallelism", text: "<b>Eşzamanlılık</b>: işleri sırayla değil iç içe yönetmek. <b>Paralellik</b>: gerçekten aynı anda (çok çekirdek)." },
            { ico: "🎯", label: "Çözdüğü Sorun", text: "Bekleyen işleri (I/O) boşa beklememek; CPU'yu tam kullanmak; cevabı hızlandırmak." },
            { ico: "🏢", label: "Nerede", text: "Web sunucuları, mikroservisler, DB havuzları, paralel indirme, oyunlar, raporlama." }
          ]
        },
        {
          type: "callout", variant: "analogy", icon: "🍳",
          text: "**Sanki bir mutfak gibi:** Tek aşçı (tek thread) yemekleri tek tek yapar. Birden çok aşçı (thread) aynı mutfakta (paylaşılan bellek) aynı anda çalışır — ama aynı tencereye (paylaşılan veri) iki aşçı birden uzanırsa karışıklık çıkar. İşte eşzamanlılığın hem gücü hem tehlikesi buradan gelir."
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Bir e-ticaret ürün sayfası 3 servisten veri çeker — fiyat, yorumlar, kargo. <b>Sırayla</b> 300+300+300 = ~900ms; <b>paralel</b> thread'lerle ~300ms (en yavaş servis kadar). Kullanıcı 3 kat hızlı sayfa görür."
        },
        {
          type: "qa", items: [
            { q: "Concurrency ile parallelism aynı şey mi?", a: "Hayır. **Concurrency** tek çekirdekte bile olur (işler hızlıca sırayla bölünür); **parallelism** birden çok çekirdekte fiziksel aynı anlık çalışmadır. Concurrency bir tasarım, parallelism bir donanım kazanımıdır." },
            { q: "Her zaman thread eklersem hızlanır mı?", a: "Hayır. CPU çekirdeği kadar gerçek paralellik var; fazlası **bağlam değiştirme (context switch)** maliyeti getirir. I/O-bekleyen işlerde çok thread işe yarar, saf hesaplamada çekirdek sayısı kadar idealdir." }
          ]
        }
      ]
    },
    {
      nav: "Çoklu İş Parçacığı · Oluşturma", eyebrow: "Eşzamanlılık · 2/4",
      title: "Thread Nasıl Oluşturulur?",
      sub: "Elle `Thread`'den modern `ExecutorService` havuzuna. Üretimde neredeyse her zaman <b>havuz</b> kullanılır — thread oluşturmak pahalıdır.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Temel: Runnable + Thread" },
            {
              type: "code", cap: "start() yeni thread'de çalışır (run() değil!)", code:
                `Runnable is = () -> {
    System.out.println(Thread.currentThread().getName());
    sonuc.put("satis", servisCagir());   // işi yap
};
Thread t = new Thread(is, "satis-thread");
t.start();   // YENİ thread başlat
t.join();    // bitene kadar BEKLE`
            },
            { type: "callout", variant: "warn", icon: "⚠️", text: "`t.run()` çağırırsan kod **aynı** thread'de çalışır — paralellik olmaz! Her zaman `start()`." }
          ],
          right: [
            { type: "heading", text: "Üretim: ExecutorService havuzu" },
            {
              type: "code", cap: "Havuzu yeniden kullan, sonuçları topla", code:
                `ExecutorService havuz = Executors.newFixedThreadPool(10);
List<Callable<Teklif>> gorevler = ...;
List<Future<Teklif>> sonuc = havuz.invokeAll(gorevler);
for (Future<Teklif> f : sonuc) kullan(f.get());
havuz.shutdown();
havuz.awaitTermination(5, TimeUnit.SECONDS);`
            },
            { type: "callout", variant: "tip", icon: "💡", text: "`Runnable` değer döndürmez; **`Callable<T>`** döndürür ve `Future<T>` ile sonucu alırsın." }
          ]
        },
        {
          type: "qa", items: [
            { q: "Neden her iş için `new Thread()` yapmıyoruz?", a: "Her platform thread'i ~1MB stack + OS kaydı demektir; oluşturma/yıkma pahalıdır. **Havuz** sınırlı sayıda thread'i yeniden kullanır, ani yük altında sistemi korur (kuyruğa alır)." },
            { q: "`shutdown()` ile `shutdownNow()` farkı ne?", a: "`shutdown()` yeni iş almaz ama mevcut işleri bitirir (nazik). `shutdownNow()` çalışanları kesmeye çalışır ve bekleyen kuyruğu döndürür (acil)." }
          ]
        }
      ]
    },
    {
      nav: "Çoklu İş Parçacığı · Tuzaklar", eyebrow: "Eşzamanlılık · 3/4",
      title: "Üç Klasik Tuzak: Race, Visibility, Deadlock",
      sub: "Paylaşılan duruma eşzamanlı erişim <b>en zor hataları</b> doğurur — çünkü çoğu zaman tekrar üretmesi (reproduce) güçtür.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Yarış Durumu (Race Condition)" },
            {
              type: "code", cap: "İki thread aynı anda 'oku-artır-yaz' yaparsa", code:
                `// ❌ Güvensiz: satilan++ atomik değil
if (satilan < TOPLAM) satilan++;

// ✓ 1) synchronized — basit kilit
synchronized void sat() { if (satilan < TOPLAM) satilan++; }

// ✓ 2) AtomicInteger — kilitsiz, donanım destekli
AtomicInteger satilan = new AtomicInteger();
satilan.incrementAndGet();`
            }
          ],
          right: [
            { type: "heading", text: "Görünürlük (Visibility) — volatile" },
            {
              type: "code", cap: "Bir thread'in yazdığını diğeri görmeyebilir", code:
                `// Her okumanın GÜNCEL değeri görmesini sağlar
private volatile boolean calisiyor = true;

// volatile sadece görünürlüğü çözer;
// 'kontrol + artır' gibi bileşik işlemleri DEĞİL`
            },
            { type: "heading", text: "Deadlock (Kilitlenme)" },
            { type: "bullets", items: ["İki thread karşılıklı birbirinin kilidini bekler → sonsuza kadar takılır", "**Kaçın:** kilitleri her zaman <b>aynı sırada</b> al; `tryLock(timeout)` ile süre sınırı koy"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "`synchronized` yerine ne zaman `ReentrantLock`?", a: "`tryLock`, zaman aşımı, kesilebilir bekleme, adil (fair) sıralama veya birden çok koşul (`Condition`) gerektiğinde. Basit karşılıklı dışlama için `synchronized` daha temizdir." },
            { q: "`volatile` kilidin yerine geçer mi?", a: "Hayır. `volatile` yalnızca **görünürlüğü** garantiler (en güncel değeri okursun), **atomikliği** değil. `count++` gibi bileşik işlemler için yine `synchronized`/`Atomic` gerekir." },
            { q: "Deadlock'u nasıl teşhis ederim?", a: "`jstack <pid>` thread dump'ında \"Found one Java-level deadlock\" satırını arar; hangi thread'in hangi kilidi beklediğini gösterir. JConsole/VisualVM de otomatik tespit eder." },
            { q: "Deadlock'u nasıl çözerim / önlerim?", a: "**1) Kilit sırası:** tüm thread'ler kilitleri *aynı global sırada* alsın (en yaygın çözüm). **2) `tryLock(timeout)`:** belirli süre bekleyip alamayınca geri çekil + tekrar dene (kilitlenme kırılır). **3) Kilit kapsamını daralt:** mümkün olduğunca kısa tut, iç içe kilitten kaçın. **4) Tek kilide indir:** birden çok kilit yerine tek koordinasyon noktası. **5) Kilitsiz yapılar:** `Atomic*`, `ConcurrentHashMap`, immutable nesneler ile kilidi tamamen ortadan kaldır." }
          ]
        }
      ]
    },
    {
      nav: "Çoklu İş Parçacığı · Araçlar", eyebrow: "Eşzamanlılık · 4/4",
      title: "Eşzamanlı Koleksiyonlar, ForkJoin ve CompletableFuture",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Thread-safe koleksiyonlar" },
            { type: "bullets", items: ["`ConcurrentHashMap` — segment/iç kilitleme, yüksek performans", "`CopyOnWriteArrayList` — yazınca kopyalar; okuma-ağırlıklıda ideal", "`BlockingQueue` — producer/consumer deseni (kuyruk dolu/boşken bloklar)"] },
            { type: "heading", text: "CompletableFuture — async zincir" },
            {
              type: "code", cap: "İki çağrıyı paralel yapıp birleştir", code:
                `CompletableFuture<Double> fiyat = supplyAsync(() -> fiyatCek());
CompletableFuture<Double> vergi = supplyAsync(() -> vergiCek());
double toplam = fiyat.thenCombine(vergi, Double::sum).join();`
            }
          ],
          right: [
            { type: "heading", text: "ForkJoinPool — böl & yönet" },
            { type: "bullets", items: ["Büyük işi alt parçalara böler, sonuçları birleştirir", "**Work-stealing**: boştaki thread, meşgulün kuyruğundan iş çalar", "`parallelStream()` arkada bunu kullanır — CPU-bound işler için"] },
            {
              type: "code", cap: "Paralel stream (CPU-bound)", code:
                `long toplam = sayilar.parallelStream()
    .filter(n -> asalMi(n))
    .mapToLong(Long::valueOf)
    .sum();`
            }
          ]
        },
        {
          type: "table",
          headers: ["Yöntem", "En iyi olduğu yer", "Dikkat"],
          rows: [
            ["ExecutorService", "Genel görev havuzu", "Thread sayısını ayarla"],
            ["CompletableFuture", "Async zincir / fan-out", "Karışık stack trace"],
            ["parallelStream", "CPU-bound veri işleme", "I/O'da kullanma (havuzu tıkar)"],
            ["**Virtual Threads**", "I/O-bound, çok bağlantı", "CPU-bound'a faydasız"]
          ]
        },
        {
          type: "qa", items: [
            { q: "`parallelStream()` her zaman daha mı hızlı?", a: "Hayır. Küçük veri veya I/O içeren işlerde ortak `ForkJoinPool`'u tıkar ve **yavaşlatır**. Yalnızca büyük, bağımsız, CPU-yoğun işlerde kazandırır." },
            { q: "`Future.get()` ile `CompletableFuture` farkı?", a: "`Future.get()` **bloklar** (beklersin). `CompletableFuture` sonucu **bloklamadan zincirlemene** (`thenApply/thenCombine`) ve hata yönetmene (`exceptionally`) izin verir." }
          ]
        }
      ]
    },

    /* ---------------- COMPLETABLEFUTURE ---------------- */
    {
      nav: "CompletableFuture · Temel", eyebrow: "Eşzamanlılık · Async · 1/2",
      title: "CompletableFuture: Asenkron Programlama",
      sub: "\"İleride tamamlanacak\" bir sonucu (veya hatayı) temsil eder; <b>bloklamadan</b> üzerine işlem zincirler, birleştirir ve hata yönetirsin. Java 8 ile geldi, callback cehennemini azaltır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "⏳", label: "Nedir", text: "Gelecekte tamamlanacak bir sonucun temsili. Sonuç hazır olunca üstüne tanımladığın adımlar tetiklenir." },
            { ico: "🔗", label: "Future'dan Farkı", text: "`Future.get()` <b>bloklar</b>; CompletableFuture <b>zincirlenir</b> (`thenApply`), birleştirilir, hata yönetilir." },
            { ico: "⚡", label: "Ne İşe Yarar", text: "Bağımsız I/O çağrılarını <b>paralel</b> başlatıp sonuçları birleştirme; reaktif olmadan async akış." },
            { ico: "🏢", label: "Nerede", text: "Mikroservis fan-out (çok servisten paralel veri), bağımsız I/O işleri, arka plan işleme." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Başlat → Dönüştür → Tüket" },
            { type: "code", cap: "supplyAsync / thenApply / thenAccept", code: `CompletableFuture
  .supplyAsync(() -> kullaniciCek(id))      // arka planda başlat (ForkJoinPool)
  .thenApply(k -> k.adi().toUpperCase())    // sonucu DÖNÜŞTÜR (yeni değer)
  .thenAccept(ad -> System.out.println(ad)) // sonucu TÜKET (yan etki)
  .join();                                  // (gerekirse) sonu bekle` }
          ],
          right: [
            { type: "heading", text: "thenCompose vs thenCombine" },
            { type: "code", cap: "Zincirle (compose) / Birleştir (combine)", code: `// thenCompose — bir async sonucu SONRAKİ async'e besle (flatMap gibi)
cf.thenCompose(k -> supplyAsync(() -> siparisleriniCek(k.id())));

// thenCombine — İKİ bağımsız async sonucu birleştir
var fiyat = supplyAsync(() -> fiyatCek());
var vergi = supplyAsync(() -> vergiCek());
double toplam = fiyat.thenCombine(vergi, Double::sum).join();` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat (fan-out):** Bir ürün sayfası fiyat, yorum ve kargo servislerini <b>aynı anda</b> `supplyAsync` ile başlatır; üç sonucu `thenCombine`/`allOf` ile birleştirip tek yanıtta döner. Sırayla 900ms olan iş ~300ms'e iner."
        },
        {
          type: "qa", items: [
            { q: "`thenApply` ile `thenCompose` farkı?", a: "`thenApply` sonucu **düz bir değere** dönüştürür (`map` gibi). `thenCompose` sonucu **başka bir CompletableFuture'a** zincirler (`flatMap` gibi) — yani bir async işin sonucunu sonraki async işe beslersin. İç içe `CompletableFuture<CompletableFuture<T>>` oluşmasını engeller." },
            { q: "`thenAccept`, `thenApply`, `thenRun` ne zaman?", a: "**`thenApply`** değer döndürür (dönüştür). **`thenAccept`** değeri alır ama döndürmez (tüket/yan etki). **`thenRun`** değeri bile almaz, sadece \"bitince şunu çalıştır\" der." }
          ]
        }
      ]
    },
    {
      nav: "CompletableFuture · Hata & Birleştirme", eyebrow: "Eşzamanlılık · Async · 2/2",
      title: "Hata Yönetimi, Birleştirme ve Tuzaklar",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Hata yönetimi" },
            { type: "code", cap: "exceptionally / handle", code: `cf.thenApply(this::isle)
  .exceptionally(ex -> {            // hatayı yakala + yedek değer dön
      log.warn("hata", ex);
      return varsayilan();
  })
  .thenAccept(System.out::println);

// handle(sonuc, ex) → hem başarı hem hata TEK yerde
cf.handle((sonuc, ex) -> ex != null ? yedek() : sonuc);` }
          ],
          right: [
            { type: "heading", text: "Çoklu birleştirme + kendi havuzun" },
            { type: "code", cap: "allOf / anyOf / executor", code: `// Hepsi bitince:
CompletableFuture.allOf(cf1, cf2, cf3).join();
// İlk biten kazanır:
CompletableFuture.anyOf(cf1, cf2).join();

// Ortak ForkJoinPool yerine KENDİ havuzun (I/O için önemli):
CompletableFuture.supplyAsync(() -> isYap(), benimExecutorum);
cf.thenApplyAsync(this::isle, benimExecutorum);` }
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Tuzaklar:** ① `join()/get()` <b>bloklar</b> — zinciri sonuna kadar bloklamadan kur. ② Hata adımı koymazsan istisna <b>sessizce yutulur</b> → `exceptionally`/`handle` ekle. ③ Bloklayan I/O'yu **ortak `ForkJoinPool.commonPool`**'da çalıştırma (tüm uygulamayı yavaşlatır) → kendi executor'ını ver. ④ `thenApply` çağıran thread'de, `thenApplyAsync` ayrı thread'de çalışır."
        },
        {
          type: "callout", variant: "tip", icon: "🧵",
          text: "**Virtual Threads ilişkisi (Java 21+):** Sadece \"paralel I/O ölçeği\" istiyorsan, artık virtual thread'lerle <b>basit senkron kod</b> aynı sonucu daha okunur verir. CompletableFuture ise hâlâ <b>karmaşık async pipeline</b> (dönüştür-birleştir-zamanla, olay akışı) kurmak için değerlidir."
        },
        {
          type: "qa", items: [
            { q: "`exceptionally`, `handle`, `whenComplete` farkı?", a: "**`exceptionally`** yalnızca hata olunca çalışır, yedek değer döner. **`handle`** hem başarı hem hatayı alır ve **yeni bir değer** döndürür (dönüşüm yapabilir). **`whenComplete`** sonucu/ hatayı görür ama **değiştirmez** (loglama/temizlik için)." },
            { q: "Neden ortak `ForkJoinPool` tehlikeli?", a: "`supplyAsync` varsayılan olarak JVM-genelinde paylaşılan `commonPool`'u kullanır (boyutu ~çekirdek sayısı). Orada **bloklayan I/O** yaparsan havuz tükenir ve tüm `parallelStream`/CompletableFuture işleri yavaşlar. I/O için **ayrı, uygun boyutlu executor** ver." },
            { q: "CompletableFuture mı, virtual threads mi?", a: "Çoğu \"birden çok servisi paralel çağır\" senaryosunda **virtual threads + basit kod** (veya Structured Concurrency) daha okunur. CompletableFuture'ı, sonuçları **dönüştürüp birleştiren, zamanlayan, olay-tabanlı** zengin async akışlar için seç." }
          ]
        }
      ]
    },

    /* ---------------- VIRTUAL THREADS ---------------- */
    {
      nav: "Virtual Threads · Nedir", eyebrow: "Java 21+ · 1/3",
      title: "Virtual Threads (Sanal İş Parçacıkları)",
      sub: "JVM'in yönettiği, OS thread'i kadar pahalı <b>olmayan</b> hafif thread'ler. Milyonlarcası, az sayıda platform thread (\"carrier\") üzerinde çoklanır. <b>Thread-per-request</b> modelini geri getirir.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🪶", label: "Nedir", text: "Heap'te park edilebilen hafif thread. Milyonlarca açabilirsin; stack'i dinamik büyür." },
            { ico: "🎯", label: "Çözdüğü Sorun", text: "Platform thread ~1MB → birkaç bin tavanı. Reactive ise karmaşık/okunması zor." },
            { ico: "🔁", label: "Mount/Unmount", text: "I/O'da bloklayınca carrier'dan <b>sökülür</b>; OS thread başka virtual thread'i çalıştırır." },
            { ico: "✍️", label: "Kazanç", text: "<b>Basit senkron kod</b> yaz, reactive ölçeğini al. Debugger, stack trace, try/catch çalışır." }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Her isteği 3 servise HTTP çağrı yapan bir API. <b>Platform (havuz 200):</b> ~60 istek/sn (her istek 300ms thread'i bloklar). <b>Virtual:</b> 50.000 istek aynı anda gelir, her biri I/O'da unmount olur → aynı donanımda <b>1000+ istek/sn</b>."
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Eski — sabit havuz darboğazı" },
            { type: "code", cap: "201. uzun istek kuyruğa girer", code: `ExecutorService es =
    Executors.newFixedThreadPool(200);` }
          ],
          right: [
            { type: "heading", text: "Yeni — her göreve bir virtual thread" },
            { type: "code", cap: "Java 21+ (kalıcı)", code: `try (var es =
    Executors.newVirtualThreadPerTaskExecutor()) {
    es.submit(() -> isYap());  // milyonlarca olabilir
}` }
          ]
        },
        {
          type: "qa", items: [
            { q: "\"Carrier thread\" tam olarak nedir?", a: "Virtual thread'i fiilen çalıştıran **platform (OS) thread**'dir. Varsayılan sayısı CPU çekirdeği kadardır. Virtual thread I/O'da bloklayınca carrier serbest kalır ve başka virtual thread'i taşır." },
            { q: "Virtual thread her zaman platform thread'den hızlı mı?", a: "Hayır — daha hızlı değil, daha **çok ölçeklenir**. Tek bir işin hızı aynıdır; kazanç, binlerce I/O-bekleyen işi az kaynakla yürütebilmektir." }
          ]
        }
      ]
    },
    {
      nav: "Virtual Threads · Pinning", eyebrow: "Java 21+ · 2/3",
      title: "Pinning, Havuzlamama ve Karşılaştırma",
      sub: "Virtual thread'in en bilinen tuzağı <b>pinning</b> (sabitlenme): carrier'dan sökülemeyince ölçek kazancı kaybolur.",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Doğru kullanım", items: ["Spring Boot 3.2+: tek satır `spring.threads.virtual.enabled=true`", "**Havuzlama yok** — her görev için yeni virtual thread aç", "Downstream'i korumak için eşzamanlılığı `Semaphore` ile sınırla", "Mevcut bloklayan kütüphaneler (JDBC, HTTP) uyumlu"] },
          neg: { title: "Tuzaklar", items: ["`synchronized` blokta bloklama → pin (Java 21–23). Çözüm: `ReentrantLock`", "Native/JNI çağrısında bloklama → pin", "**CPU-bound** işte fayda yok (unmount olmaz)", "Ağır `ThreadLocal` × milyon thread = bellek baskısı → **Scoped Values**"] }
        },
        {
          type: "bullets", title: "❌ Virtual Thread'i NEREDE KULLANMAMALI",
          items: [
            "**CPU-bound işler** (şifreleme, görüntü/video işleme, ağır matematik): thread beklemez, unmount avantajı yok → kazanç sıfır. Doğrusu: sınırlı platform havuzu veya `ForkJoinPool`/`parallelStream`.",
            "**`synchronized` ağırlıklı eski kod** (Java 21–23): bloklarken carrier'ı pinler. Önce `ReentrantLock`'a taşı, sonra geç.",
            "**Native/JNI veya Foreign-Memory çağrılarında uzun bloklama**: carrier pinlenir, ölçek kaybolur.",
            "**Büyük `ThreadLocal` bağlamı taşıyan kod**: milyonlarca thread × büyük veri = ciddi bellek baskısı → `Scoped Values` kullan.",
            "**Tek/az görevli, kısa işler**: kazanç yok, gereksiz karmaşıklık — düz `Thread` veya doğrudan çağrı yeter.",
            "**Havuz olarak** (`newFixedThreadPool` gibi sınırlayıp havuzlama): anti-pattern. Eşzamanlılığı sınırlaman gerekiyorsa havuz değil `Semaphore` kullan."
          ]
        },
        {
          type: "table",
          headers: ["Kriter", "Platform", "**Virtual**", "Reactive"],
          rows: [
            ["Ölçek", "Birkaç bin", "**Milyonlar**", "Çok yüksek"],
            ["Kod karmaşıklığı", "Düşük (senkron)", "**Düşük (senkron)**", "Yüksek (operatör)"],
            ["Debugger / stack", "Çalışır", "**Çalışır**", "Zor"],
            ["I/O-bound", "Verimsiz", "**⭐ İdeal**", "Verimli"],
            ["CPU-bound", "Verimli", "Faydasız", "Faydasız"]
          ]
        },
        {
          type: "qa", items: [
            { q: "Pinning'i nasıl fark ederim?", a: "JVM bayrağı `-Djdk.tracePinnedThreads=full` ile pin olan yığını loglarsın; ya da JFR `jdk.VirtualThreadPinned` olayını izlersin. Java 24+ ile `synchronized` kaynaklı pinning büyük ölçüde çözüldü." },
            { q: "Virtual thread'leri neden havuzlamamalıyım?", a: "Çünkü zaten ucuzlar — havuzlamak ters etki yapar, sınırlama getirir. Havuz mantığı pahalı kaynaklar içindir; virtual thread'te \"her göreve bir tane aç, bitince at\" doğru desendir." },
            { q: "Mevcut Spring uygulamamı taşımak kod değişikliği ister mi?", a: "Çoğu zaman hayır. Boot 3.2+'da `spring.threads.virtual.enabled=true` yeter; Tomcat ve `@Async` virtual thread kullanır. Sadece sıcak yollardaki `synchronized`'ları `ReentrantLock`'a çevirmeyi gözden geçir (Java 21–23'te)." }
          ]
        }
      ]
    },
    {
      nav: "Virtual Threads · Structured Concurrency", eyebrow: "Java 21+ · 3/3",
      title: "Structured Concurrency & Scoped Values",
      sub: "Virtual thread'lerin gerçek gücü, alt görevleri <b>tek bir iş birimi</b> gibi yöneten yapısal eşzamanlılıkla açığa çıkar.",
      blocks: [
        {
          type: "code", cap: "Alt görevler birlikte başlar, biri patlarsa hepsi iptal", code:
            `try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var temel  = scope.fork(() -> kullaniciServisi(id));   // paralel
    var sipar  = scope.fork(() -> siparisServisi(id));     // paralel

    scope.join();                 // ikisini de bekle
    scope.throwIfFailed();        // biri hata verdiyse fırlat (diğeri iptal)

    return new Profil(temel.get(), sipar.get());
}`
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Scoped Values (ThreadLocal yerine)" },
            {
              type: "code", cap: "Immutable, virtual-thread dostu bağlam", code:
                `static final ScopedValue<User> AKTIF = ScopedValue.newInstance();

ScopedValue.where(AKTIF, user).run(() -> {
    // bu blok ve fork'ları AKTIF.get() ile user'a erişir
});  // blok bitince otomatik temizlenir`
            }
          ],
          right: [
            { type: "bullets", title: "Neden önemli", items: ["Alt görevlerde **otomatik iptal** ve hata yayılımı", "Bağlamı (user, traceId) **parametre taşımadan** aktar", "Milyonlarca thread'te `ThreadLocal`'ın bellek/temizlik derdi yok", "Java 21–25'te **preview**; API olgunlaşıyor"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "Structured concurrency normal `ExecutorService`'ten farkı ne?", a: "Görevlerin **ömrü koda bağlanır**: try-with-resources bloğu bitmeden hepsi tamamlanır/iptal olur. Sızan thread, unutulan iptal, parçalı hata yönetimi ortadan kalkar — \"yapısal\" budur." },
            { q: "Scoped Values neden ThreadLocal'den iyi?", a: "Değiştirilemez (immutable) olduğu için güvenli paylaşılır, blok bitince otomatik temizlenir (sızıntı yok) ve milyonlarca virtual thread'te çok daha hafiftir." }
          ]
        }
      ]
    },

    /* ---------------- REFLECTION & ANNOTATIONS ---------------- */
    {
      nav: "Reflection & Annotations", eyebrow: "Meta-programlama",
      title: "Reflection ve Annotations",
      sub: "Reflection: çalışma zamanında bir sınıfın yapısını keşfetme ve onunla etkileşme. Annotations: koda eklenen meta-veri. İkisi birlikte Spring, Hibernate, Jackson, JUnit'in \"sihrinin\" altında yatar.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔍", label: "Nedir", text: "Derleyici zamanında bilinmeyen tip bilgisine <b>çalışma zamanında</b> erişim." },
            { ico: "🛠️", label: "Ne İşe Yarar", text: "DI, otomatik doğrulama, JSON serileştirme gibi <b>genel-amaçlı</b> framework davranışları." },
            { ico: "🌱", label: "Nerede", text: "Spring `@Autowired`, Jackson JSON, JUnit `@Test`, Hibernate `@Entity`." },
            { ico: "⚠️", label: "Bedeli", text: "Yavaş, tip güvenliği kaybolur, refactor'da string-tabanlı adlar kırılır." }
          ]
        },
        {
          type: "code", cap: "Mini doğrulama framework'ü — reflection + annotation", code:
            `@Retention(RetentionPolicy.RUNTIME)      // RUNTIME şart!
@Target(ElementType.FIELD)
@interface NotBlank {}

for (Field f : nesne.getClass().getDeclaredFields()) {
    if (f.isAnnotationPresent(NotBlank.class)) {
        f.setAccessible(true);
        if (((String) f.get(nesne)).isBlank())
            throw new IllegalArgumentException(f.getName() + " boş olamaz");
    }
}`
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Spring bir bean'i oluştururken constructor'ı reflection'la bulur, parametre tiplerine bakar ve uygun bean'leri enjekte eder. `@Autowired`, `@Entity`, `@Test` — hepsi RUNTIME anotasyon + reflection okumasıdır."
        },
        {
          type: "qa", items: [
            { q: "Reflection neden yavaş; kaçınmalı mıyım?", a: "Erişim denetimi ve dinamik çözümleme normal çağrıdan yavaştır. Framework'ler bunu **başlangıçta bir kez** yapıp önbelleğe alır. Kendi sıcak döngünde kullanma; çerçeve-tarzı genel kod için uygundur." },
            { q: "`@Retention` seviyeleri ne işe yarar?", a: "`SOURCE` (derlemede silinir, ör. `@Override`), `CLASS` (bytecode'da var ama runtime'da yok), `RUNTIME` (reflection okuyabilir). Framework anotasyonları **RUNTIME** olmalı." },
            { q: "Reflection'a alternatif var mı?", a: "Evet: derleme-zamanı **annotation processing** (compile-time güvenlik, ör. MapStruct, Dagger) ve `MethodHandles` (reflection'dan hızlı). Modern framework'ler ikisini de kullanır." }
          ]
        }
      ]
    },

    /* ---------------- PROXY ---------------- */
    {
      nav: "Proxy · Desen & Türler", eyebrow: "Java · Proxy · 1/2",
      title: "Proxy: Bir Nesnenin Vekili",
      sub: "Proxy, gerçek nesnenin yerine geçen ve ona erişimi <b>kontrol eden</b> bir \"vekil\"dir. Aynı arayüzü sunar; çağrıları araya alıp gerçek nesneye iletir, öncesinde/sonrasında iş yapar.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🎭", label: "Nedir", text: "Gerçek nesneyle <b>aynı arayüzü</b> sunan, çağrıları araya alıp hedefe ileten vekil." },
            { ico: "🎯", label: "Ne İşe Yarar", text: "Erişim kontrolü, tembel yükleme, loglama/ölçüm, cache, güvenlik — <b>nesneyi değiştirmeden</b>." },
            { ico: "🗂️", label: "Türler", text: "Virtual (lazy), Protection (yetki), Remote (uzak), Smart/Logging (araya iş)." },
            { ico: "🌱", label: "Nerede", text: "Spring AOP, Hibernate lazy loading, RMI/uzak çağrı, mock framework'ler." }
          ]
        },
        {
          type: "code", cap: "Statik proxy — aynı arayüz, araya iş ekler", code: `interface Servis { String veriGetir(int id); }

class GercekServis implements Servis {
    public String veriGetir(int id) { return "veri-" + id; }
}

class LoglayanProxy implements Servis {
    private final Servis hedef;
    LoglayanProxy(Servis h) { this.hedef = h; }
    public String veriGetir(int id) {
        long t0 = System.nanoTime();
        try { return hedef.veriGetir(id); }              // gerçek çağrı
        finally { log.info("veriGetir({}) {}ns", id, System.nanoTime() - t0); }
    }
}`
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Hibernate, lazy `@OneToMany` için gerçek koleksiyon yerine bir **proxy** koyar; sen erişince DB'den yükler. Spring'de `@Transactional` bir metodu bir <b>proxy</b> sarar. \"Sihir\" dediğimiz şeyin altında hep proxy vardır."
        },
        {
          type: "qa", items: [
            { q: "Proxy ile Decorator farkı ne?", a: "Yapıları benzer (ikisi de aynı arayüzü sarar), **niyetleri** farklı: Decorator nesneye **yeni davranış/özellik ekler**; Proxy ise **erişimi kontrol eder** (lazy, yetki, uzak, loglama). Aynı kalıp, farklı amaç." },
            { q: "Statik proxy'nin dezavantajı nedir?", a: "Her arayüz ve her metot için **elle** proxy sınıfı yazmak gerekir — tekrar ve bakım yükü. Çözüm: çalışma zamanında üretilen **dinamik proxy** (sonraki slayt)." }
          ]
        }
      ]
    },
    {
      nav: "Proxy · JDK Dynamic Proxy", eyebrow: "Java · Proxy · 2/2",
      title: "JDK Dynamic Proxy: Çalışma Zamanında Vekil",
      sub: "Her arayüz için elle proxy yazmak yerine, JDK çalışma zamanında <b>dinamik</b> bir proxy üretir. Tüm çağrılar tek bir `InvocationHandler`'a düşer (reflection tabanlı).",
      blocks: [
        {
          type: "code", cap: "Proxy.newProxyInstance + InvocationHandler", code: `Servis gercek = new GercekServis();

Servis proxy = (Servis) Proxy.newProxyInstance(
    gercek.getClass().getClassLoader(),
    new Class<?>[]{ Servis.class },            // proxy'lenecek arayüz(ler)
    (p, method, args) -> {                     // InvocationHandler — TÜM çağrılar buraya
        long t0 = System.nanoTime();
        try { return method.invoke(gercek, args); }   // reflection ile gerçek çağrı
        finally { log.info("{} {}ns", method.getName(), System.nanoTime() - t0); }
    });

proxy.veriGetir(42);   // handler devreye girer → loglar + gerçek metot`
        },
        {
          type: "twocol",
          pos: { title: "Güçlü yönleri", items: ["Tek `InvocationHandler`'da **tüm metotlar** — çapraz kesen ilgiler tek yerde (log, tx, güvenlik)", "Elle proxy sınıfı yazmaya gerek yok", "Framework'lerin (Spring AOP, mock) temelidir"] },
          neg: { title: "Sınırlar", items: ["**Yalnızca arayüzler** için (interface şart)", "Sınıf-tabanlı için **CGLIB/ByteBuddy** gerekir", "Reflection maliyeti (küçük; framework'ler önbelleğe alır)"] }
        },
        {
          type: "callout", variant: "info", icon: "🌱",
          text: "**Spring bağlantısı:** Spring AOP, arayüz varsa **JDK dynamic proxy**, yoksa **CGLIB** (sınıf alt-tipi) üretir. `@Transactional`/`@Cacheable`/`@Async` tam olarak böyle çalışır — bkz. Spring Boot · Spring Proxy (AOP)."
        },
        {
          type: "qa", items: [
            { q: "Dynamic proxy tam olarak nasıl çalışıyor?", a: "`Proxy.newProxyInstance` çalışma zamanında, verdiğin arayüzleri uygulayan bir sınıf üretir. O proxy'nin **her metot çağrısı** `InvocationHandler.invoke(proxy, method, args)`'a yönlenir; sen orada araya iş ekleyip `method.invoke(hedef, args)` ile gerçek nesneye iletirsin." },
            { q: "İlgili sınıfın arayüzü yoksa ne olur?", a: "JDK dynamic proxy **çalışmaz** (interface şart). O zaman **CGLIB** veya **ByteBuddy** ile hedef sınıfın bir **alt-tipi** (subclass) üretilir; metotlar override edilerek araya girilir. Spring bunu otomatik seçer." }
          ]
        }
      ]
    },

    /* ---------------- DESIGN PATTERNS ---------------- */
    {
      nav: "Design Patterns · Giriş", eyebrow: "Tasarım Desenleri",
      title: "Design Patterns: Adlandırılmış Çözümler",
      sub: "Desenler kopyala-yapıştır kod değil; tekrar eden problemlere verilmiş, denenmiş <b>fikirlerdir</b>. Probleme göre uyarlanır; her yere serpiştirilmez.",
      blocks: [
        {
          type: "table",
          headers: ["Kategori", "Amaç", "Örnek Desenler"],
          rows: [
            ["**Yaratımsal** (Creational)", "Nesne oluşturmayı yönetir", "Singleton, Factory, Builder"],
            ["**Yapısal** (Structural)", "Nesneleri bir araya getirir", "Adapter, Decorator, Facade"],
            ["**Davranışsal** (Behavioral)", "Nesneler arası iletişimi düzenler", "Strategy, Observer, Command"]
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🌱",
          text: "**Spring = desenlerin büyük uygulaması:** Bean'ler → <b>Singleton</b>, Context → <b>Factory</b>, `@EventListener` → <b>Observer</b>, AOP proxy'leri → <b>Proxy/Decorator</b>, `RestClient.builder()` → <b>Builder</b>."
        },
        {
          type: "qa", items: [
            { q: "Desenleri ezberlemeli miyim?", a: "Hayır, **problemi** tanımayı öğren. \"Aynı kararı çok yerde veriyorum\" → Strategy; \"nesneyi adım adım kuruyorum\" → Builder. Desen, çözümün adıdır; önce ihtiyaç doğmalı." },
            { q: "Aşırı desen kullanımı zararlı mı?", a: "Evet — gereksiz soyutlama (over-engineering) kodu okunmaz yapar. Desen, gerçek bir değişkenliği/karmaşıklığı yalıttığında değerlidir; yoksa basit kod daha iyidir." }
          ]
        }
      ]
    },
    {
      nav: "Design Patterns · Örnekler", eyebrow: "Tasarım Desenleri · Kod",
      title: "Builder · Strategy · Observer · Decorator",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Builder — esnek/okunaklı kuruluş" },
            { type: "code", cap: "Opsiyonel alanları zincirle", code: `Araba a = new Araba.Builder()
    .marka("Toyota").model("Corolla")
    .renk("kirmizi").build();` },
            { type: "heading", text: "Strategy — algoritmayı dışarı al" },
            { type: "code", cap: "if/else yığını yerine takılabilir kural", code: `siparis.setKargo(new HedefKargo());   // veya new AEKargo()
double ucret = siparis.kargoHesapla();
// Lambda/functional interface ile neredeyse bedava` }
          ],
          right: [
            { type: "heading", text: "Observer — değişince haber ver" },
            { type: "code", cap: "Spring: ApplicationEvent + @EventListener", code: `stok.abone(new MusteriBildirimi());
stok.degistir("Laptop", 5);  // tüm aboneler bilgilendirilir` },
            { type: "heading", text: "Decorator — çalışma zamanı özellik" },
            { type: "code", cap: "Java I/O bunun ta kendisi", code: `var in = new BufferedReader(new FileReader("x.txt"));
// FileReader'a tampon davranışı eklendi (sınıf değişmeden)` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat (Strategy):** Bir ödeme servisi — kredi kartı, havale, kapıda ödeme. Her birini ayrı `OdemeStratejisi` yaparsan, yeni yöntem eklemek mevcut kodu <b>değiştirmeden</b> bir sınıf eklemekten ibaret olur (Open/Closed)."
        },
        {
          type: "qa", items: [
            { q: "Strategy ile basit `if/else` arasında ne zaman seçim yaparım?", a: "Seçenekler az ve sabitse `if/else`/`switch` yeterli. Seçenekler büyüyor, sık değişiyor veya runtime'da takılıp çıkıyorsa Strategy (her biri ayrı sınıf) bakımı kolaylaştırır." },
            { q: "Singleton neden bazen \"anti-pattern\" sayılır?", a: "Global durum yaratır, test edilmesi zorlaşır, gizli bağımlılık kurar. Spring'de bunu sen yazmazsın — container bean'i singleton yönetir, sen constructor'dan enjekte alırsın; bu güvenli biçimdir." }
          ]
        }
      ]
    },

    /* ---------------- RECORDS ---------------- */
    {
      nav: "Records · Temel", eyebrow: "Java 16+ · Records · 1/3",
      title: "Records: Değişmez Veri Taşıyıcıları",
      sub: "Java 16'da kalıcılaşan record'lar, \"sadece veri taşıyan\" sınıfları <b>tek satıra</b> indirir: constructor, accessor, `equals`, `hashCode`, `toString` <b>otomatik</b> üretilir ve nesne <b>değişmezdir</b> (immutable).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "📦", label: "Nedir", text: "Yalnızca veri taşıyan, <b>değişmez</b> sınıf. Alanları `final`; boilerplate otomatik gelir." },
            { ico: "🤖", label: "Otomatik Üretilen", text: "Canonical constructor, accessor'lar (`ad()`), `equals`/`hashCode` (değer eşitliği), `toString`." },
            { ico: "🎯", label: "Ne İşe Yarar", text: "DTO, value object, çoklu dönüş, map key — <b>boilerplate'siz</b>, niyet açık." },
            { ico: "🏢", label: "Nerede", text: "REST DTO, domain value object, olay (event) nesnesi, konfigürasyon kaydı." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Öncesi vs Sonrası", code: `// ESKİ: 30+ satır (alanlar, ctor, getter, equals, hashCode, toString)
public final class Nokta {
    private final int x, y;
    public Nokta(int x, int y) { this.x = x; this.y = y; }
    public int x() { return x; }
    public int y() { return y; }
    // + equals + hashCode + toString ...
}

// YENİ: tek satır — hepsi HAZIR
public record Nokta(int x, int y) {}` }
          ],
          right: [
            { type: "code", cap: "Kullanım", code: `var n = new Nokta(3, 4);
int a = n.x();                 // 3  (getX değil → x())
System.out.println(n);         // Nokta[x=3, y=4]

// Değer eşitliği (identity değil):
new Nokta(3, 4).equals(new Nokta(3, 4));   // true
// Map key olarak güvenli (hashCode/equals hazır):
Map<Nokta, String> m = new HashMap<>();` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** REST API DTO'ları için ideal — `record UrunDto(String ad, int fiyat) {}` bir satırda immutable, eşitliği ve `toString`'i hazır bir veri nesnesi verir. Jackson bunu doğrudan JSON'a çevirir; eskiden Lombok `@Value`/getter yığını gerekiyordu."
        },
        {
          type: "qa", items: [
            { q: "Record ile normal sınıf farkı nedir?", a: "Record **değişmez** (final alanlar), **veri-odaklı**dır ve boilerplate'i (ctor/accessor/equals/hashCode/toString) derleyici üretir. Normal sınıf mutable olabilir, davranış-odaklıdır ve bunları elle yazarsın. Record \"veri\", sınıf \"davranış\" içindir." },
            { q: "Accessor neden `x()` — `getX()` değil?", a: "Record'lar JavaBean `getX()` kuralını değil, alan adıyla eşleşen **bileşen accessor**'ı (`x()`) kullanır. Bu, record'ların \"veri bileşeni\" felsefesine uygundur ve pattern matching ile uyumludur." }
          ]
        }
      ]
    },
    {
      nav: "Records · Doğrulama & Pattern", eyebrow: "Java 16+ · Records · 2/3",
      title: "Compact Constructor, Record Patterns ve Sınırlar",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Compact constructor — doğrulama & normalize" },
            { type: "code", cap: "Alan atamaları otomatik yapılır", code: `public record Para(BigDecimal tutar, String birim) {
    public Para {                       // compact ctor
        if (tutar.signum() < 0)
            throw new IllegalArgumentException("negatif olamaz");
        birim = birim.toUpperCase();    // normalize (this.birim = ... gerekmez)
    }
    public boolean pozitifMi() {        // ek metot eklenebilir
        return tutar.signum() > 0;
    }
    static Para sifir(String b) { return new Para(BigDecimal.ZERO, b); }
}` }
          ],
          right: [
            { type: "heading", text: "Record patterns (Java 21) — yıkım" },
            { type: "code", cap: "İç içe bileşenlere doğrudan eriş", code: `record Adres(String sehir, String ulke) {}
record Kullanici(String ad, Adres adres) {}

if (o instanceof Kullanici(String ad, Adres(var sehir, var ulke)))
    System.out.println(ad + " @ " + sehir);   // iç içe deconstruction

String s = switch (o) {
    case Kullanici(var ad, var adres) -> ad + " / " + adres.sehir();
    default -> "?";
};` }
          ]
        },
        {
          type: "twocol",
          pos: { title: "Yapabilirsin", items: ["Compact ctor ile **doğrulama/normalize**", "**Ek metot** ve `static` fabrika metotları", "**Interface implement** etme", "`static` alanlar", "İç içe **record patterns** ile yıkım (Java 21)"] },
          neg: { title: "Kısıtlar / Kullanma", items: ["**Instance alanı EKLENEMEZ** (sadece bileşenler)", "**Mutable değil** — kalıcı durum tutan nesneler için uygun değil", "`extends` **edilemez/edemez** (implicitly `final`, `Record`'u genişletir)", "JPA `@Entity` için **tartışmalı** (mutable/proxy ister) — DTO/projeksiyonda kullan"] }
        },
        {
          type: "qa", items: [
            { q: "Record'a doğrulama/metot ekleyebilir miyim?", a: "Evet. **Compact constructor** ile giriş doğrulaması ve normalizasyon yapılır (alan atamaları otomatik). Ayrıca normal ve `static` metotlar, `static` alanlar eklenebilir. Eklenemeyen tek şey **ek instance alanı**dır." },
            { q: "Record'u JPA `@Entity` yapabilir miyim?", a: "Genelde **hayır/önerilmez** — JPA mutable, argümansız ctor ve proxy'ler ister; record immutable ve final'dir. Record'ları **DTO, projeksiyon ve API yanıtı** olarak kullan; entity için klasik sınıf tut." },
            { q: "Record mı, Lombok `@Data` mı?", a: "Çoğu değişmez veri nesnesi için **record** daha iyidir: dile ait, ek araç yok, gerçekten immutable ve pattern matching ile uyumlu. Mutable nesne, builder veya zengin JavaBean gereken yerlerde Lombok/klasik sınıf hâlâ işe yarar." }
          ]
        }
      ]
    },
    {
      nav: "Records · Kullanım, Artı/Eksi & Risk", eyebrow: "Java 16+ · Records · 3/3",
      title: "Records: Nerede? Avantaj, Dezavantaj ve Risk",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Nerede KULLANILMALI", items: ["**DTO** — REST istek/yanıt gövdeleri", "**Value object** — para, koordinat, aralık, kimlik", "**Çoklu dönüş değeri** (tuple yerine)", "**Map/Set anahtarı** (equals/hashCode hazır)", "**Event/mesaj** ve konfigürasyon kayıtları", "**Pattern matching** ile işlenen veri modelleri"] },
          neg: { title: "Nerede KAÇINILMALI", items: ["**Mutable durum** gereken nesneler", "**JPA `@Entity`** (mutable/argümansız ctor/proxy ister)", "**Kalıtım/genişletme** gereken hiyerarşiler", "Çok sayıda **opsiyonel alan** (builder daha okunur)", "**JavaBean** (`getX/setX`) bekleyen eski framework'ler", "**Kimlik (identity)** eşitliği gereken nesneler"] }
        },
        {
          type: "twocol",
          pos: { title: "Avantajları", items: ["Az boilerplate — niyet (veri) açık", "**Gerçek immutability** → doğal **thread-safe**", "Doğru `equals`/`hashCode`/`toString` bedava", "**Pattern matching** ve record patterns uyumu", "Daha az hata yüzeyi (setter yok)"] },
          neg: { title: "Dezavantajları", items: ["**Esnek değil** — immutable, sonradan değiştirilemez", "**Instance alanı / kalıtım yok**", "Bazı **ORM / eski framework** uyumsuzluğu", "Çok alanlı record'da **builder yok** → okunması zor", "Bileşen ekleme/çıkarma **API'yi kırar**"] }
        },
        {
          type: "callout", variant: "warn", icon: "🚨",
          text: "**En büyük risk — \"sığ (shallow) değişmezlik\":** Record referansı `final`'dır ama içindeki **mutable nesne** (`List`, `Date`, dizi) dışarıdan değiştirilebilir. Gerçek değişmezlik için compact ctor'da **savunmacı kopya** (`List.copyOf`) ya da immutable tipler kullan."
        },
        {
          type: "code", cap: "Riski kapat — savunmacı kopya", code: `public record Ekip(String ad, List<String> uyeler) {
    public Ekip {
        uyeler = List.copyOf(uyeler);   // dıştan değiştirilemez kopya
    }
}
// Aksi halde: dışarıdaki liste değişince record'ın "değeri" ve hashCode'u kayar
// → Map anahtarı olarak kullanılıyorsa bulunamaz hâle gelir!`
        },
        {
          type: "qa", items: [
            { q: "Record gerçekten tamamen değişmez mi?", a: "Hayır — **sığ (shallow) immutable**'dır. Bileşen referansları değişmez ama gösterdiği nesne mutable olabilir (`List`, dizi, `Date`). Derin değişmezlik için compact ctor'da **savunmacı kopya** al veya immutable koleksiyon/tip kullan." },
            { q: "Ne zaman record yerine class/builder tercih ederim?", a: "**Mutable** durum, **kalıtım**, **davranış-ağırlıklı** tasarım ya da **çok sayıda opsiyonel alan** (builder okunurluğu) gerektiğinde. Record \"veri\" içindir; iş mantığı ve değişkenlik varsa klasik sınıf daha uygundur." },
            { q: "Mutable bileşen neden Map anahtarında tehlikeli?", a: "Record'ın `hashCode`/`equals`'ı bileşenlerine dayanır. Bir bileşen (ör. içindeki liste) sonradan değişirse hashCode değişir; nesneyi `HashMap`'te **bulamaz** hâle gelirsin. Bu yüzden anahtar olarak kullanılan record'lar tam immutable olmalı." }
          ]
        }
      ]
    },

    /* ---------------- JVM ---------------- */
    {
      nav: "JDK / JRE / JVM", eyebrow: "Java Platformu",
      title: "JDK vs JRE vs JVM",
      sub: "Kapsam ilişkisi: <b>JDK ⊃ JRE ⊃ JVM</b>. JVM bytecode'u çalıştırır; JRE = JVM + standart kütüphaneler; JDK = JRE + geliştirme araçları (javac, jar, javadoc...).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "⚙️", label: "JVM", text: "Platformdan bağımsız <b>bytecode'u çalıştıran</b> soyut makine. Tek başına dağıtılmaz." },
            { ico: "📦", label: "JRE", text: "JVM + standart kütüphaneler (java.*, javax.*). Sadece <b>çalıştırma</b>; derleyici yok." },
            { ico: "🧰", label: "JDK", text: "JRE + geliştirme araçları. Kod yazmak, <b>derlemek</b>, paketlemek için gerekli." },
            { ico: "🔄", label: "Akış", text: "`.java` → (javac/JDK) → `.class` bytecode → (JVM) → çalıştırma." }
          ]
        },
        {
          type: "table",
          headers: ["İhtiyaç", "Gereken"],
          rows: [
            ["Java kodu yazıp **derlemek**", "**JDK** (javac şart)"],
            ["Hazır uygulamayı **çalıştırmak**", "JRE (veya JDK)"],
            ["Üretim sunucusu (küçük imaj)", "`jlink` ile minimal özel runtime"]
          ]
        },
        {
          type: "qa", items: [
            { q: "Üretimde JDK mı JRE mi kuralım?", a: "Java 11+ ile Oracle ayrı JRE sunmuyor. Konteynerde imajı küçültmek için `jlink`/`jpackage` ile sadece gereken modülleri içeren özel runtime üretmek yaygındır." },
            { q: "Bytecode neden \"her yerde çalışır\"?", a: "javac, OS'a değil JVM'e özel **bytecode** üretir. Her platformun kendi JVM'i bu ortak bytecode'u o platforma çevirir — \"bir kez yaz, her yerde çalıştır\" budur." }
          ]
        }
      ]
    },
    {
      nav: "JVM Mimarisi", eyebrow: "JVM İçi",
      title: "JVM Mimarisi: Üç Ana Bileşen",
      sub: "Bytecode JVM'de üç aşamadan geçer: <b>1) Class Loader</b> (yükleme) → <b>2) Runtime Data Areas</b> (bellek) → <b>3) Execution Engine</b> (yürütme).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "📥", label: "Class Loader", text: "Bootstrap → Platform → Application hiyerarşisi. <b>Lazy</b> (ihtiyaç olunca) yükler." },
            { ico: "🧠", label: "Execution Engine", text: "Interpreter (yavaş başlar) + JIT (hot kodu makine koduna derler) + GC." }
          ]
        },
        {
          type: "table",
          headers: ["Bellek Alanı", "Paylaşım", "Amaç", "Hata"],
          rows: [
            ["**Heap**", "Paylaşılan", "Tüm nesneler, diziler — GC burada çalışır", "OutOfMemoryError"],
            ["**Stack**", "Thread-özel", "Metot çağrıları, yerel değişkenler", "StackOverflowError"],
            ["**Metaspace**", "Paylaşılan", "Sınıf meta-verileri", "OutOfMemoryError"],
            ["PC Register", "Thread-özel", "Aktif bytecode komut adresi", "—"],
            ["Native Method Stack", "Thread-özel", "JNI (yerel) çağrılar", "StackOverflowError"]
          ]
        },
        {
          type: "qa", items: [
            { q: "`StackOverflowError` ile `OutOfMemoryError` farkı?", a: "İlki **stack** taşmasıdır — genelde sonsuz/çok derin özyineleme. İkincisi **heap** (veya Metaspace) dolmasıdır — çok nesne tutmak ya da sızıntı. Biri kod akışı, diğeri bellek sorunu işaret eder." },
            { q: "Metaspace nedir, PermGen'e ne oldu?", a: "Metaspace sınıf meta-verisini tutar ve native bellekte yaşar (Java 8'de PermGen'in yerini aldı). Çok dinamik sınıf üreten uygulamalarda `-XX:MaxMetaspaceSize` ile sınırlanabilir." }
          ]
        }
      ]
    },
    {
      nav: "Garbage Collectors", eyebrow: "JVM · Bellek Yönetimi",
      title: "Garbage Collection: Türler ve Seçim",
      sub: "GC, ulaşılamayan nesneleri otomatik temizler (Mark & Sweep). Temelinde <b>kuşaksal hipotez</b> yatar: çoğu nesne genç yaşta ölür — Young gen sık/hızlı (Minor GC), Old gen nadir/yavaş (Full GC) toplanır.",
      blocks: [
        {
          type: "table",
          headers: ["GC", "Hedef", "Latency", "Throughput", "Ne Zaman"],
          rows: [
            ["**G1GC** (varsayılan)", "Dengeli", "Düşük-Orta", "Yüksek", "Genel amaçlı, web servisi"],
            ["**ZGC**", "Ultra-düşük gecikme", "**<1ms**", "Biraz düşük", "Finans, gerçek zamanlı, büyük heap"],
            ["**Shenandoah**", "Ultra-düşük gecikme", "**<10ms**", "Biraz düşük", "Latency-kritik"],
            ["**Parallel**", "Throughput", "Yüksek", "**Çok yüksek**", "Batch, veri ambarı"],
            ["Serial", "Tek thread", "Yüksek", "Düşük", "Gömülü, tek çekirdek"]
          ]
        },
        {
          type: "code", cap: "GC seçimi (JVM flag)", code: `java -XX:+UseG1GC   -Xmx4G MyApp   # dengeli (varsayılan)
java -XX:+UseZGC    -Xmx4G MyApp   # düşük gecikme
java -XX:+UseParallelGC -Xmx4G ... # throughput
-XX:MaxGCPauseMillis=200           # pause hedefi (G1)` },
        {
          type: "qa", items: [
            { q: "GC'yi elle tetiklemeli miyim (`System.gc()`)?", a: "Hayır. `System.gc()` yalnızca bir **öneridir**, garanti değildir ve genelde zararlıdır (gereksiz Full GC). JVM ne zaman toplayacağını senden iyi bilir." },
            { q: "Web uygulamam için hangi GC?", a: "Çoğu Spring Boot servisi için varsayılan **G1GC** doğru seçimdir. Gecikme kritikse (finans, oyun) ZGC/Shenandoah; saf throughput (gece batch) için Parallel GC." },
            { q: "GC varken bellek sızıntısı olur mu?", a: "Evet! Sınırsız büyüyen `static` koleksiyon, kaldırılmayan listener, kapatılmayan stream → nesneler hâlâ \"ulaşılabilir\" olduğundan GC toplayamaz. `try-with-resources` ve cache'lerde `WeakReference` kullan." }
          ]
        }
      ]
    },
    {
      nav: "JIT Derleyici", eyebrow: "JVM · Performans",
      title: "JIT Derleyici ve Warmup",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔥", label: "JIT Nedir", text: "Sık çalışan (\"hot\") metotları çalışma anında <b>makine koduna</b> derler — yorumlamadan 10–100× hızlı." },
            { ico: "🌡️", label: "Warmup", text: "İlk çağrılar yavaş (interpreter) → 1000+ çağrıda hızlı (C2). Benchmark'ta **JMH** kullan." },
            { ico: "🪜", label: "Tiered", text: "Seviye 0 interpreter → 1–3 C1 (hızlı) → 4 C2 (ağır optimizasyon)." },
            { ico: "✨", label: "Optimizasyon", text: "Inlining, dead-code elimination, loop unrolling, escape analysis." }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Yeni başlayan bir mikroservis ilk birkaç saniye \"yavaş\" görünür (warmup). Bu yüzden load balancer'lar yeni instance'a trafiği kademeli verir; benchmark ölçümünde ilk turları (warmup) saymazsın."
        },
        {
          type: "qa", items: [
            { q: "Neden mikro-benchmark'larım yanıltıcı sonuç veriyor?", a: "JIT, ölçtüğün döngüyü optimize edip (hatta tamamen) eleyebilir; warmup'ı saymazsan da yanılırsın. **JMH** (Java Microbenchmark Harness) bu tuzakları yönetir — elle `System.nanoTime()` ile ölçme." },
            { q: "AOT/GraalVM Native Image JIT'i ortadan kaldırır mı?", a: "Native Image kodu **önceden** (AOT) derler; warmup yok, başlangıç çok hızlı (mikroservis/serverless için ideal). Karşılığında JIT'in çalışma-zamanı uyarlamalı optimizasyonlarından (tepe throughput) feragat edebilirsin." }
          ]
        }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ ---------------- */
    {
      nav: "Bölüm Özeti · Java", eyebrow: "Bölüm 1 · Kapanış",
      title: "Java Çekirdek — Aklında Kalsın",
      sub: "Bu bölümde dilin motorunu ve eşzamanlılık araçlarını gördük. Tek cümlelik özetler:",
      blocks: [
        {
          type: "recap",
          title: "Ne öğrendik?",
          items: [
            "**Thread = paylaşılan bellekte bağımsız iş şeridi.** Concurrency bir tasarım, parallelism donanım kazanımı. Üretimde elle `new Thread()` değil, **havuz** (`ExecutorService`) kullan.",
            "**Eşzamanlılığın 3 klasik tuzağı:** Race (atomik değil → `Atomic`/`synchronized`), Visibility (bayat okuma → `volatile`), Deadlock (kilit sırasını sabitle / `tryLock`).",
            "**Virtual Thread (Java 21) = ucuz thread.** Milyonlarca I/O-bekleyen işi, bloklayan basit kodla ölçekle. CPU-bound işe faydası yok.",
            "**JDK/JRE/JVM:** JDK geliştirir (derleyici+araçlar), JRE çalıştırır, JVM `.class` bytecode'unu yorumlar/derler. \"Write once, run anywhere\" bu katmandan gelir.",
            "**JVM motoru:** GC belleği otomatik toplar (varsayılan G1), JIT sıcak metotları makine koduna derler (warmup). Sen algoritmaya odaklan, motor çalışsın.",
            "**Reflection & Proxy** çalışma anında sınıfı görmeyi/sarmalamayı sağlar — Spring'in sihrinin (DI, `@Transactional`) altındaki mekanizma budur."
          ]
        },
        {
          type: "callout", variant: "key", icon: "🔑",
          text: "**Köprü:** Buraya kadar Java'nın *kendisini* öğrendik. Bundan sonra bu temelin üzerine kurulan iki dev geliyor — sürüm sürüm Java'nın nasıl geliştiği, sonra da bu dille üretim yazmayı kolaylaştıran **Spring**."
        }
      ]
    }
  ]
});
