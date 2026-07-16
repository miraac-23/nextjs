# Java Çekirdek: Eşzamanlılık, Proxy ve JVM'in Motoru

*Java & Spring serisi — Bölüm 1/6*

---

[[LINKS]]

Bu yazı, Java ve Spring'i baştan sona anlatan **6 bölümlük bir serinin ilk parçası**. Serinin tamamı: Java çekirdeği → Java sürüm evrimi → Spring → Spring Boot → Spring vs Boot → Boot sürüm analizi.

Bu bölümde dilin *motoruna* iniyoruz. Çünkü Spring'in ilerideki tüm "sihri" — `@Transactional`'ın neden bazen sessizce çalışmadığı, Hibernate'in lazy koleksiyonu nasıl doldurduğu, virtual thread'lerin neden her yerde işe yaramadığı — burada öğreneceğimiz üç mekanizmaya dayanıyor: **thread'ler, proxy'ler ve JVM**.

---

## Bölüm 1 — Eşzamanlılık: Aynı Anda Çalışmanın Bedeli

### Thread nedir, gerçekten?

Bir **process** (çalışan program) içinde, aynı belleği paylaşan birden çok bağımsız yürütme akışına **thread** denir. Her thread'in kendi *stack*'i vardır ama hepsi aynı *heap*'i paylaşır. Çok çekirdekli bir işlemcide bu akışlar gerçekten aynı anda çalışır.

Buradaki en yaygın kafa karışıklığını en baştan temizleyelim:

* **Concurrency (eşzamanlılık)** bir *tasarım* kararıdır: işleri sırayla değil, iç içe yönetmek. Tek çekirdekte bile olur — işler hızlıca bölünüp sırayla ilerler.
* **Parallelism (paralellik)** bir *donanım* kazanımıdır: işlerin fiziksel olarak aynı anda, farklı çekirdeklerde çalışması.

Concurrency olmadan parallelism olmaz; ama concurrency tek başına da anlamlıdır.

Somut faydası şu: Bir e-ticaret ürün sayfası fiyat, yorum ve kargo servislerinden veri çekiyorsa, sırayla 300 + 300 + 300 = **~900 ms**; paralel olarak **~300 ms** (en yavaş servis kadar) sürer. Kullanıcı sayfayı üç kat hızlı görür.

### Thread'i elle oluşturma: `new Thread()` neden yanlış?

Her platform thread'i yaklaşık **1 MB stack** ve bir işletim sistemi kaydı demektir. Oluşturmak ve yok etmek pahalıdır. Bu yüzden üretimde thread'leri tek tek yaratmayız, bir **havuzdan** kullanırız:

```java
ExecutorService havuz = Executors.newFixedThreadPool(10);

List<Callable<Teklif>> gorevler = ...;
List<Future<Teklif>> sonuc = havuz.invokeAll(gorevler);
for (Future<Teklif> f : sonuc) kullan(f.get());

havuz.shutdown();
havuz.awaitTermination(5, TimeUnit.SECONDS);
```

İki küçük ama kritik ayrım:

* `Runnable` değer **döndürmez**; `Callable<T>` döndürür ve sonucu `Future<T>` ile alırsın.
* `t.run()` çağırırsan kod **aynı** thread'de çalışır — paralellik olmaz. Yeni thread için her zaman `t.start()`.

Ve havuzu kapatırken: `shutdown()` nazik davranır (yeni iş almaz, mevcutları bitirir), `shutdownNow()` ise çalışanları kesmeye çalışır ve bekleyen kuyruğu geri verir.

### Üç klasik tuzak

Paylaşılan duruma eşzamanlı erişim, yazılımın **en zor hatalarını** doğurur. Zor olmalarının sebebi karmaşıklıkları değil, **tekrar üretilemez** olmalarıdır: testte geçer, üretimde ayda bir patlar.

[[IMG:p1-traps]]

**1) Yarış durumu (race condition).** `satilan++` tek bir işlem değildir; aslında "oku → artır → yaz" üç adımıdır. İki thread araya girerse sayaç kayar.

```java
// ❌ Güvensiz
if (satilan < TOPLAM) satilan++;

// ✓ 1) synchronized — basit kilit
synchronized void sat() { if (satilan < TOPLAM) satilan++; }

// ✓ 2) AtomicInteger — kilitsiz, donanım destekli
AtomicInteger satilan = new AtomicInteger();
satilan.incrementAndGet();
```

**2) Görünürlük (visibility).** Bir thread'in yazdığı değeri diğeri hiç görmeyebilir — CPU önbelleğinden bayat bir değer okur. `volatile` bunu çözer, **ama yalnızca görünürlüğü**:

```java
private volatile boolean calisiyor = true;   // her okuma güncel değeri görür
// volatile ATOMİKLİK vermez: count++ hâlâ güvensizdir
```

`volatile`'ın kilidin yerine geçtiğini sanmak, en pahalı yanlış anlamalardan biridir.

**3) Deadlock.** İki thread karşılıklı olarak birbirinin kilidini bekler ve sonsuza kadar takılır. Çözümü sürpriz derecede basittir: **kilitleri her zaman aynı sırada al.** Yanına `tryLock(timeout)` koy — alamazsan geri çekil, tekrar dene.

Teşhis: `jstack <pid>` çıktısında *"Found one Java-level deadlock"* satırını ararsın; hangi thread'in hangi kilidi beklediğini satır satır gösterir.

### `synchronized` mi `ReentrantLock` mu?

Basit karşılıklı dışlama için `synchronized` daha temizdir. `ReentrantLock`'a şu dördü gerektiğinde geç: `tryLock`, zaman aşımı, kesilebilir bekleme, veya birden çok `Condition`.

(Not: Virtual thread'lerle birlikte bu tercih bir de *performans* boyutu kazanıyor — birazdan göreceğiz.)

---

## Bölüm 2 — Virtual Threads: Java 21'in Sessiz Devrimi

### Neden gerekti?

Platform thread pahalı olduğu için yıllarca "her isteğe bir thread" (*thread-per-request*) modelinden kaçtık. Alternatif reactive programlamaydı (WebFlux): ölçek kazandık ama **okunabilirlikten olduk** — stack trace'ler anlamsızlaştı, debugger işe yaramaz oldu, `try/catch` yerine operatör zincirleri geldi.

**Virtual Thread**, bu ödünleşimi ortadan kaldırıyor.

[[IMG:p1-threads]]

Virtual thread, JVM'in yönettiği hafif bir thread'dir. Heap'te park edilir, stack'i dinamik büyür, milyonlarcası açılabilir. Az sayıda platform thread ("**carrier**") üzerinde çoklanır: virtual thread I/O'da bloklandığında carrier'dan **sökülür** (unmount), o OS thread'i başka bir virtual thread çalıştırır.

```java
try (var es = Executors.newVirtualThreadPerTaskExecutor()) {
    es.submit(() -> isYap());   // milyonlarca olabilir
}
```

Rakamla konuşalım: Her isteği 3 servise HTTP çağrısı yapan bir API'de, 200'lük bir platform havuzu ~60 istek/sn taşırken (her istek 300 ms boyunca bir thread'i bloklar), virtual thread'lerle aynı donanımda **1000+ istek/sn**'ye çıkabilirsin.

### İki yanlış anlama

**"Virtual thread daha hızlıdır."** Hayır. Tek bir işin süresi **aynıdır**. Kazanç hızda değil, **ölçekte**: binlerce I/O-bekleyen işi çok az kaynakla yürütebilmek.

**"Her yerde kullanmalıyım."** Hayır. **CPU-bound** işlerde (şifreleme, görüntü/video işleme, ağır matematik) thread zaten beklemez — unmount olmaz, kazanç sıfırdır. Orada sınırlı bir platform havuzu veya `ForkJoinPool`/`parallelStream` doğru araçtır.

### Pinning: en bilinen tuzak

Virtual thread `synchronized` bir blokta bloklanırsa (Java 21–23) carrier'dan **sökülemez** — buna **pinning** denir ve ölçek kazancını buharlaştırır.

* Çözüm: sıcak yollardaki `synchronized`'ları `ReentrantLock`'a taşı.
* Teşhis: `-Djdk.tracePinnedThreads=full` bayrağı veya JFR'nin `jdk.VirtualThreadPinned` olayı.
* İyi haber: Java 24+ ile `synchronized` kaynaklı pinning büyük ölçüde çözüldü.

Diğer tuzaklar: native/JNI çağrısında uzun bloklama yine pinler; ve milyonlarca thread × büyük `ThreadLocal` bağlamı ciddi bellek baskısı yaratır (çözüm: **Scoped Values**).

### Havuzlamayın

Bu bir anti-pattern: virtual thread'leri `newFixedThreadPool` gibi havuzlamak. Havuz mantığı **pahalı** kaynaklar içindir; virtual thread zaten ucuzdur. Doğru desen: "her göreve bir tane aç, bitince at." Eşzamanlılığı sınırlaman gerekiyorsa (örneğin downstream servisi korumak için) havuz değil, **`Semaphore`** kullan.

Spring Boot 3.2+ tarafında geçiş tek satır:

```properties
spring.threads.virtual.enabled=true
```

Bu satırla Tomcat ve `@Async` virtual thread kullanmaya başlar. Çoğu uygulamada başka kod değişikliği gerekmez.

### Structured Concurrency: asıl güç burada

Virtual thread'lerin gerçek gücü, alt görevleri **tek bir iş birimi** gibi yöneten yapısal eşzamanlılıkla açığa çıkar:

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var temel = scope.fork(() -> kullaniciServisi(id));   // paralel
    var sipar = scope.fork(() -> siparisServisi(id));     // paralel

    scope.join();            // ikisini de bekle
    scope.throwIfFailed();   // biri patlarsa → diğeri otomatik İPTAL

    return new Profil(temel.get(), sipar.get());
}
```

Görevlerin ömrü **koda bağlanır**: `try` bloğu bitmeden hepsi tamamlanır veya iptal olur. Sızan thread, unutulan iptal, parçalı hata yönetimi ortadan kalkar. "Yapısal" olmasının anlamı tam olarak budur.

### Peki CompletableFuture öldü mü?

Hayır — ama rolü daraldı. Sadece "birden çok servisi paralel çağır, sonuçları birleştir" istiyorsan, virtual thread + basit senkron kod (veya structured concurrency) daha okunur. `CompletableFuture`'ı **zengin async akışlar** için sakla: dönüştür-birleştir-zamanla, olay tabanlı pipeline'lar.

Kullanıyorsan üç tuzağı bil:

* `join()`/`get()` **bloklar** — zinciri sonuna kadar bloklamadan kur.
* Hata adımı koymazsan istisna **sessizce yutulur** → `exceptionally` / `handle` ekle.
* Bloklayan I/O'yu **ortak `ForkJoinPool.commonPool`**'da çalıştırma; kendi executor'ını ver. Aksi halde tüm uygulamanın `parallelStream`'leri de yavaşlar.

---

## Bölüm 3 — Reflection ve Proxy: Spring'in "Sihri"nin Kaynağı

Bu iki mekanizmayı bilmeyen bir geliştirici, Spring'i "sihir" olarak görür ve ilk beklenmedik davranışta çaresiz kalır. Bilen ise aynı sorunu bir dakikada çözer. Serinin en yüksek getirili bölümü burasıdır.

### Reflection

Reflection, **çalışma zamanında** bir sınıfın yapısını keşfetmek ve onunla etkileşmektir. Derleme anında bilmediğin tiplerle çalışabilirsin.

```java
@Retention(RetentionPolicy.RUNTIME)      // RUNTIME şart!
@Target(ElementType.FIELD)
@interface NotBlank {}

for (Field f : nesne.getClass().getDeclaredFields()) {
    if (f.isAnnotationPresent(NotBlank.class)) {
        f.setAccessible(true);
        if (((String) f.get(nesne)).isBlank())
            throw new IllegalArgumentException(f.getName() + " boş olamaz");
    }
}
```

Yukarıdaki 8 satır, aslında **mini bir doğrulama framework'ü**. Spring, Hibernate, Jackson ve JUnit'in yaptığı da özünde bundan ibarettir: Spring bir bean oluştururken constructor'ı reflection ile bulur, parametre tiplerine bakar ve uygun bean'leri enjekte eder.

Bu yüzden framework anotasyonlarının `@Retention(RUNTIME)` olması **şarttır** — `SOURCE` derlemede silinir, `CLASS` bytecode'da kalır ama çalışma zamanında okunamaz.

Bedeli: reflection yavaştır ve tip güvenliğini kaybettirir. Framework'ler bunu **başlangıçta bir kez** yapıp önbelleğe alır. Sen kendi sıcak döngünde kullanma.

### Proxy: vekil nesne

Proxy, gerçek nesnenin yerine geçen ve ona erişimi **kontrol eden** bir vekildir. Aynı arayüzü sunar, çağrıyı araya alır, öncesinde ve sonrasında iş yapar.

[[IMG:p1-proxy]]

Elle yazmak yerine JDK bunu çalışma zamanında üretebilir:

```java
Servis proxy = (Servis) Proxy.newProxyInstance(
    gercek.getClass().getClassLoader(),
    new Class<?>[]{ Servis.class },
    (p, method, args) -> {                        // TÜM çağrılar buraya düşer
        long t0 = System.nanoTime();
        try { return method.invoke(gercek, args); }
        finally { log.info("{} {}ns", method.getName(), System.nanoTime() - t0); }
    });

proxy.veriGetir(42);   // handler devreye girer → loglar → gerçek metot
```

İki tür vardır ve farkları ilerideki bölümlerde başımızı ağrıtacak:

* **JDK dynamic proxy** — arayüz **şart**tır; arayüzü uygular.
* **CGLIB** — arayüz gerekmez; hedef sınıfı **extend eder**. Bu yüzden `final` sınıf veya `final` metot **proxy'lenemez**. Spring Boot'un varsayılanı budur.

Şimdi ileriye dönük en önemli cümle: **Spring'de `@Transactional`, `@Cacheable`, `@Async` ve `@PreAuthorize` — hepsi bean'in etrafına sarılan bir proxy ile çalışır.** Hibernate'in lazy `@OneToMany` koleksiyonu da bir proxy'dir. Bölüm 3 ve 4'te bunun doğurduğu meşhur tuzağı (self-invocation) tam olarak çözebilecek durumda olacaksın.

---

## Bölüm 4 — Records ve Az Konuşulan Riski

Java 16'da kalıcılaşan record'lar, "sadece veri taşıyan" sınıfları tek satıra indirir:

```java
public record Nokta(int x, int y) {}
```

Bu tek satır; canonical constructor, accessor'lar (`x()`, `y()` — `getX()` değil), `equals`, `hashCode` ve `toString` üretir. Nesne **değişmezdir**, dolayısıyla doğal olarak thread-safe'dir ve `Map` anahtarı olarak güvenlidir.

Doğrulama ve normalizasyon için **compact constructor** kullanılır:

```java
public record Para(BigDecimal tutar, String birim) {
    public Para {
        if (tutar.signum() < 0) throw new IllegalArgumentException("negatif olamaz");
        birim = birim.toUpperCase();     // this.birim = ... gerekmez
    }
}
```

### En büyük risk: sığ değişmezlik

Record'un **referansları** `final`'dır — ama gösterdikleri nesne mutable olabilir:

```java
public record Ekip(String ad, List<String> uyeler) {
    public Ekip {
        uyeler = List.copyOf(uyeler);   // ✓ savunmacı kopya
    }
}
```

Kopya almazsan: dışarıdaki liste değişince record'un "değeri" ve `hashCode`'u kayar. Eğer bu record bir `HashMap` anahtarıysa, nesneyi **haritada bulamaz** hâle gelirsin. Bu, saatlerce aranan cinsten bir hatadır.

### Nerede kullanmamalı

* **JPA `@Entity`** olarak — JPA mutable nesne, argümansız constructor ve proxy ister; record immutable ve `final`'dır. Record'ları **DTO, projeksiyon ve API yanıtı** olarak kullan.
* Çok sayıda **opsiyonel alan** olduğunda (builder daha okunur).
* Kalıtım gereken hiyerarşilerde (record `final`'dır).

---

## Bölüm 5 — JVM: Motorun Kapağını Açmak

### JDK, JRE, JVM

**JDK ⊃ JRE ⊃ JVM.** JVM bytecode'u çalıştırır; JRE = JVM + standart kütüphaneler; JDK = JRE + geliştirme araçları (`javac`, `jar`, `jlink`…).

Akış: `.java` → (javac) → `.class` bytecode → (JVM) → çalıştırma.

"Write once, run anywhere" tam olarak bu katmandan gelir: `javac` işletim sistemine değil, **JVM'e** özel bytecode üretir; her platformun kendi JVM'i onu o platforma çevirir.

[[IMG:p1-jvm]]

### Bellek alanları — hata mesajlarını okumayı öğreten harita

* **Heap** (paylaşılan): tüm nesneler ve diziler. GC burada çalışır. Dolarsa `OutOfMemoryError`.
* **Stack** (thread-özel): metot çağrıları ve yerel değişkenler. Taşarsa `StackOverflowError`.
* **Metaspace** (paylaşılan): sınıf meta-verileri; native bellekte yaşar (Java 8'de PermGen'in yerini aldı).

Bu ayrım pratikte şunu söyler: `StackOverflowError` bir **kod akışı** sorunudur (genelde sonsuz özyineleme), `OutOfMemoryError` bir **bellek** sorunudur (çok nesne tutmak veya sızıntı). İkisini karıştırmamak, hata ayıklamada yarı yolu kat etmektir.

### Garbage Collection

GC, ulaşılamayan nesneleri otomatik temizler. Temelinde **kuşaksal hipotez** yatar: çoğu nesne genç yaşta ölür. Bu yüzden Young generation sık ve hızlı (Minor GC), Old generation seyrek ve yavaş (Full GC) toplanır.

[[IMG:p1-gc]]

Ve evet — **GC varken de bellek sızıntısı olur**. Sınırsız büyüyen bir `static` koleksiyon, kaldırılmayan bir listener, kapatılmayan bir stream: nesneler hâlâ "ulaşılabilir" olduğu için GC onları toplayamaz. `try-with-resources` kullan; cache'lerde `WeakReference` düşün.

Bir de klasik: `System.gc()` çağırma. O bir **öneridir**, garanti değil; genelde gereksiz bir Full GC tetikleyip zarar verir.

### JIT ve warmup

**JIT**, sık çalışan ("hot") metotları çalışma anında makine koduna derler — yorumlamadan 10–100 kat hızlı. Kademeli çalışır: Seviye 0 interpreter → C1 (hızlı derleme) → C2 (ağır optimizasyon: inlining, dead-code elimination, escape analysis).

Bunun iki pratik sonucu var:

1. **Yeni ayağa kalkan bir mikroservis ilk saniyelerde "yavaş" görünür** (warmup). Load balancer'ların yeni instance'a trafiği kademeli vermesinin sebebi budur.
2. **Elle yaptığın mikro-benchmark'lar yanıltıcıdır.** JIT ölçtüğün döngüyü optimize edip tamamen eleyebilir. `System.nanoTime()` ile değil, **JMH** ile ölç.

(GraalVM Native Image ise kodu **önceden** derler: warmup yok, başlangıç çok hızlı — serverless için ideal; karşılığında JIT'in çalışma-zamanı uyarlamalı tepe performansından feragat edebilirsin.)

---

## Bölüm Özeti — Aklında Kalsın

* **Thread = paylaşılan bellekte bağımsız iş şeridi.** Concurrency bir tasarım, parallelism bir donanım kazanımıdır. Üretimde `new Thread()` değil, **havuz**.
* **Üç klasik tuzak:** Race (atomik değil → `Atomic`/`synchronized`), Visibility (bayat okuma → `volatile`), Deadlock (kilit sırasını sabitle / `tryLock`).
* **Virtual Thread (Java 21) = ucuz thread.** Daha hızlı değil, daha çok **ölçeklenir**. I/O-bound'da ideal, CPU-bound'da faydasız. Havuzlama; `Semaphore` ile sınırla.
* **Reflection + Proxy = Spring'in sihri.** `@Transactional` bir proxy'dir. Bunu bilmek, ilerideki en sık hatayı (self-invocation) çözmeni sağlayacak.
* **Record = değişmez veri taşıyıcı** — ama **sığ** değişmez. Mutable bileşene savunmacı kopya al.
* **JVM:** Heap/Stack/Metaspace ayrımı hata mesajlarını okutur; GC belleği toplar (varsayılan G1), JIT sıcak kodu derler (warmup).

---

## Sırada ne var?

**Bölüm 2: Java Sürüm Evrimi — 8'den 25'e.** Lambda'nın getirdiği fonksiyonel devrimden pattern matching'e, sürüm geçişinde gerçekte nelerin kırıldığına (`javax.*` modüllerinin kaldırılması, güçlü kapsülleme) ve güvenli yükseltme stratejisine bakacağız.

[[SERIES]]
