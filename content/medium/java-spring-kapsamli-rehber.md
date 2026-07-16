# Java & Spring: Çekirdekten Üretim Mikroservislerine Kapsamlı Rehber

*Thread'lerin üç klasik tuzağından Virtual Threads'e, IoC'nin çözdüğü acıdan Saga desenine ve `javax → jakarta` kırılmasına kadar — bir Java geliştiricisinin zihinsel haritası.*

---

Java ve Spring öğrenirken en çok zorlandığım şey konuların zorluğu değildi; **dağınıklığıydı**. Bir yerde sözdizimi, başka bir yerde teori, bambaşka bir yerde "peki bu üretimde nasıl kırılıyor?" Parçalar tek tek anlaşılıyordu ama aralarındaki bağ kurulmuyordu.

Bu yazı, o bağı kurma denemem. Java'nın çekirdeğinden başlayıp JVM'in motoruna iniyor, Spring'in hangi acıyı çözdüğünü anlatıyor ve Spring Boot ile üretim mikroservislerine kadar gidiyor. Her konuda üç soruyu sormaya çalıştım: **Nedir? Nereden geldi? Nasıl kullanılır?**

Yazının sonunda, aynı içeriğin 110+ konuluk interaktif sunum hâline de link bırakıyorum — kod örnekleri, karşılaştırma tabloları ve tıkla-göster Soru–Cevap bölümleriyle.

---

## 1. Java Çekirdek: Eşzamanlılık, Proxy ve JVM

### Thread nedir, gerçekten?

Bir **process** (çalışan program) içinde, aynı belleği paylaşan birden çok bağımsız yürütme akışına **thread** denir. Çok çekirdekli bir işlemcide bu akışlar gerçekten aynı anda çalışır.

Buradaki en yaygın kafa karışıklığı **concurrency** (eşzamanlılık) ile **parallelism** (paralellik) arasında: Eşzamanlılık bir *tasarım* kararıdır — işleri sırayla değil, iç içe yönetmek. Paralellik ise bir *donanım* kazanımıdır — gerçekten aynı anda, birden çok çekirdekte çalışmak. Concurrency tek çekirdekte bile olur; parallelism olmaz.

Somut faydası şu: Bir e-ticaret ürün sayfası fiyat, yorum ve kargo servislerinden veri çekiyorsa, sırayla 300+300+300 = ~900 ms; paralel olarak ~300 ms (en yavaş servis kadar) sürer. Kullanıcı sayfayı üç kat hızlı görür.

Üretimde thread'i elle `new Thread()` ile oluşturmayız — her platform thread'i yaklaşık 1 MB stack ve bir OS kaydı demektir. Bunun yerine **havuz** kullanırız:

```java
ExecutorService havuz = Executors.newFixedThreadPool(10);
List<Future<Teklif>> sonuc = havuz.invokeAll(gorevler);
for (Future<Teklif> f : sonuc) kullan(f.get());
havuz.shutdown();
```

Küçük ama kritik bir ayrım: `Runnable` değer döndürmez, **`Callable<T>`** döndürür ve sonucu `Future<T>` ile alırsın. Bir diğeri: `t.run()` çağırırsan kod *aynı* thread'de çalışır — paralellik olmaz. Her zaman `t.start()`.

### Üç klasik tuzak

Paylaşılan duruma eşzamanlı erişim, yazılımın en zor hatalarını doğurur — çünkü çoğu zaman **tekrar üretmesi (reproduce) güçtür**.

**1) Yarış durumu (race condition).** `satilan++` atomik değildir; aslında "oku – artır – yaz" üç adımıdır. İki thread araya girerse sayaç kayar. Çözüm: `synchronized` ile kilit, ya da kilitsiz ve donanım destekli `AtomicInteger.incrementAndGet()`.

**2) Görünürlük (visibility).** Bir thread'in yazdığı değeri diğeri hiç görmeyebilir (CPU önbelleğinde bayat değer okur). `volatile` bunu çözer — ama **yalnızca görünürlüğü**, atomikliği değil. `volatile` bir `count++`'ı güvenli yapmaz.

**3) Deadlock.** İki thread karşılıklı olarak birbirinin kilidini bekler ve sonsuza kadar takılır. En yaygın çözüm sürpriz derecede basittir: **kilitleri her zaman aynı sırada al.** Yanında `tryLock(timeout)` ile süre sınırı koy. Teşhis için `jstack <pid>` thread dump'ında "Found one Java-level deadlock" satırını ararsın.

### Virtual Threads: Java 21'in devrimi

Platform thread pahalı olduğu için yıllarca "thread-per-request" modelinden kaçtık; reactive programlamaya (WebFlux) yöneldik — ölçek kazandık ama **okunabilirlikten** olduk.

**Virtual Thread**, JVM'in yönettiği hafif bir thread'dir. Milyonlarcasını açabilirsin; az sayıda platform thread ("carrier") üzerinde çoklanır. I/O'da bloklandığında carrier'dan **sökülür** (unmount), OS thread başka bir virtual thread'i çalıştırır.

```java
try (var es = Executors.newVirtualThreadPerTaskExecutor()) {
    es.submit(() -> isYap());  // milyonlarca olabilir
}
```

Rakamla: her isteği 3 servise HTTP çağrısı yapan bir API'de, 200'lük platform havuzu ~60 istek/sn taşırken, virtual thread'lerle aynı donanımda 1000+ istek/sn'ye çıkabilirsin.

Ama iki şeyi net anlamak gerekir:

- Virtual thread **daha hızlı değil, daha çok ölçeklenir**. Tek bir işin süresi aynıdır; kazanç, binlerce I/O-bekleyen işi az kaynakla yürütebilmektir.
- **CPU-bound işte faydası yoktur.** Şifreleme, görüntü işleme, ağır matematik — thread beklemediği için unmount avantajı doğmaz.

En bilinen tuzağı **pinning**'dir: `synchronized` bir blokta bloklanırsan (Java 21–23) virtual thread carrier'dan sökülemez ve ölçek kazancı buharlaşır. Çözüm sıcak yollardaki `synchronized`'ları `ReentrantLock`'a taşımaktır. (Java 24+ ile bu büyük ölçüde çözüldü.)

Bir de anti-pattern: **virtual thread'leri havuzlama.** Zaten ucuzlar; havuz mantığı pahalı kaynaklar içindir. Eşzamanlılığı sınırlaman gerekiyorsa havuz değil, `Semaphore` kullan.

Spring Boot 3.2+ tarafında geçiş tek satır:

```properties
spring.threads.virtual.enabled=true
```

### Structured Concurrency

Virtual thread'lerin gerçek gücü, alt görevleri **tek bir iş birimi** gibi yöneten yapısal eşzamanlılıkla açığa çıkar:

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var temel = scope.fork(() -> kullaniciServisi(id));
    var sipar = scope.fork(() -> siparisServisi(id));

    scope.join();
    scope.throwIfFailed();   // biri patlarsa diğeri otomatik iptal

    return new Profil(temel.get(), sipar.get());
}
```

Görevlerin ömrü koda bağlanır: blok bitmeden hepsi tamamlanır veya iptal olur. Sızan thread, unutulan iptal, parçalı hata yönetimi ortadan kalkar. "Yapısal" olmasının anlamı budur.

### Reflection ve Proxy: Spring'in "sihri"

Spring'i anlamak isteyen herkesin şu iki mekanizmayı bilmesi gerekir, çünkü çerçevenin tüm "sihri" bunların üzerine kuruludur.

**Reflection**, çalışma zamanında bir sınıfın yapısını keşfetmektir. Spring bir bean oluştururken constructor'ı reflection ile bulur, parametre tiplerine bakar ve uygun bean'leri enjekte eder. `@Autowired`, `@Entity`, `@Test` — hepsi RUNTIME anotasyon + reflection okumasıdır. (Bu yüzden framework anotasyonlarının `@Retention(RUNTIME)` olması *şarttır*.)

**Proxy**, gerçek nesnenin yerine geçen ve ona erişimi kontrol eden bir vekildir. Aynı arayüzü sunar, çağrıyı araya alır, öncesinde/sonrasında iş yapar:

```java
Servis proxy = (Servis) Proxy.newProxyInstance(
    gercek.getClass().getClassLoader(),
    new Class<?>[]{ Servis.class },
    (p, method, args) -> {                        // TÜM çağrılar buraya düşer
        long t0 = System.nanoTime();
        try { return method.invoke(gercek, args); }
        finally { log.info("{} {}ns", method.getName(), System.nanoTime() - t0); }
    });
```

Spring AOP, arayüz varsa **JDK dynamic proxy**, yoksa **CGLIB** (sınıf alt-tipi) üretir. `@Transactional`, `@Cacheable`, `@Async` tam olarak böyle çalışır. Hibernate'in lazy `@OneToMany` koleksiyonu da bir proxy'dir.

Bu bilgi teorik bir süs değil — birazdan göreceğimiz **self-invocation tuzağı**nı ancak bunu bilerek çözebilirsin.

### Records: değişmez veri taşıyıcıları

```java
public record Nokta(int x, int y) {}
```

Bu tek satır; constructor, accessor'lar, `equals`, `hashCode` ve `toString`'i otomatik verir — ve nesne değişmezdir. 30+ satırlık DTO sınıfları tarihe karıştı.

Ama en büyük riski az konuşulur: **sığ (shallow) değişmezlik.** Record'un referansı `final`'dır, ama içindeki mutable nesne (`List`, `Date`, dizi) dışarıdan değiştirilebilir. Record bir `Map` anahtarı olarak kullanılıyorsa, içindeki liste sonradan değişince `hashCode` kayar ve nesneyi **haritada bulamaz** hâle gelirsin. Çözüm compact constructor'da savunmacı kopya:

```java
public record Ekip(String ad, List<String> uyeler) {
    public Ekip {
        uyeler = List.copyOf(uyeler);   // dıştan değiştirilemez
    }
}
```

Bir de sınır: Record'u JPA `@Entity` yapma. JPA mutable nesne, argümansız constructor ve proxy ister; record immutable ve `final`'dır. Record'ları **DTO, projeksiyon ve API yanıtı** olarak kullan; entity için klasik sınıf tut.

### JVM: motorun kapağını açmak

**JDK ⊃ JRE ⊃ JVM.** JVM bytecode'u çalıştırır; JRE = JVM + standart kütüphaneler; JDK = JRE + geliştirme araçları. `.java` → (javac) → `.class` bytecode → (JVM) → çalıştırma. "Write once, run anywhere" tam olarak bu katmandan gelir: javac işletim sistemine değil, **JVM'e** özel bytecode üretir.

Bellek alanlarını bilmek, hataları okumayı öğretir:

- **Heap** (paylaşılan) — tüm nesneler ve diziler burada yaşar, GC burada çalışır. Dolarsa: `OutOfMemoryError`
- **Stack** (thread-özel) — metot çağrıları ve yerel değişkenler. Taşarsa: `StackOverflowError`
- **Metaspace** (paylaşılan) — sınıf meta-verileri. Dolarsa: `OutOfMemoryError`

Yani `StackOverflowError` bir **kod akışı** sorununa (genelde sonsuz özyineleme), `OutOfMemoryError` bir **bellek** sorununa işaret eder. İkisini karıştırmamak, hata ayıklamada yarı yolu kat etmek demektir.

**GC** (çöp toplayıcı) ulaşılamayan nesneleri otomatik temizler. Temelinde kuşaksal hipotez yatar: çoğu nesne genç yaşta ölür. Çoğu Spring Boot servisi için varsayılan **G1GC** doğru seçimdir; gecikme kritikse (finans, oyun) **ZGC** (<1 ms duraklama), saf throughput için (gece batch) **Parallel GC**.

Ve evet — **GC varken de bellek sızıntısı olur.** Sınırsız büyüyen `static` koleksiyon, kaldırılmayan listener, kapatılmayan stream: nesneler hâlâ "ulaşılabilir" olduğu için GC onları toplayamaz.

**JIT** ise sık çalışan ("hot") metotları çalışma anında makine koduna derler — yorumlamadan 10–100 kat hızlı. Bunun pratik sonucu: yeni ayağa kalkan bir mikroservis ilk birkaç saniye "yavaş" görünür (**warmup**). Load balancer'ların yeni instance'a trafiği kademeli vermesinin sebebi budur. Aynı sebeple, elle `System.nanoTime()` ile yaptığın mikro-benchmark'lar yanıltıcıdır — **JMH** kullan.

---

## 2. Java 8 → 25: Dil Nasıl Değişti?

Java 2017'den beri **6 ayda bir** sürüm çıkarıyor; her iki yılda biri LTS (uzun süreli destek) oluyor: 8, 11, 17, 21, 25. Üretimde genelde LTS seçilir.

**Java 8 (2014) — Fonksiyonel devrim.** Lambda, Stream API, `Optional`, `java.time`. Emir kipinden deklaratif koda geçiş:

```java
var r = urunler.stream()
    .filter(u -> u.kategori().equals("Elektronik"))
    .filter(u -> u.fiyat() > 1000)
    .map(u -> u.ad().toUpperCase())
    .toList();
```

Küçük bir uyarı: `Optional` **dönüş tipi** için tasarlandı. Entity alanı, metot parametresi veya koleksiyon elemanı olarak kullanmak önerilmez.

**Java 11 (2018) — Modern API.** Yerleşik HTTP Client (HTTP/2, async), `String.strip/isBlank/repeat`, `Files.readString`, tek dosya çalıştırma. Geçişin en sancılı yeri: JEP 320 ile Java EE/CORBA modülleri (JAXB, SOAP, `javax.annotation`) JDK'dan **kaldırıldı** — Java 8 kodu 11'de `NoClassDefFoundError` verebilir.

**Java 17 (2021) — Veri-odaklı programlama.** Records, sealed classes, text blocks, pattern matching. Kurumsal standart olmasının sebebi net: **Spring Boot 3, minimum Java 17 ister.**

**Java 21 (2023) — Eşzamanlılık devrimi.** Virtual Threads, pattern matching for switch (kalıcı), record patterns, sequenced collections, Generational ZGC.

```java
String s = switch (o) {
    case Kullanici(String ad, Adres(var sehir, var ulke)) -> ad + " @ " + sehir;
    case Integer i when i > 0 -> "pozitif: " + i;
    case null -> "bos";
    default -> "diger";
};
```

**Java 25 (2025) — Olgunlaşma.** Scoped Values kalıcılaştı, Module Import, Compact Source (`void main()`), Compact Object Headers. (Not: String Templates 21'de preview gelmiş, 23'te **geri çekilmişti** — 25'te yok. Üretimde kullanmayın.)

### Sürüm geçişi: gerçekte ne kırılır?

- **8 → 11:** Java EE modülleri kaldırıldı (JAXB, JAX-WS, `javax.annotation`) → eksik modülleri bağımlılık olarak ekle.
- **11 → 17:** Güçlü kapsülleme; `sun.*` iç API erişimi kapandı → iç API'ye dayanan kütüphaneleri güncelle.
- **17 → 21:** Çoğunlukla uyumlu; tek dikkat `synchronized` pinning → sıcak yolda `ReentrantLock`'u gözden geçir.

Strateji tek cümlede: **big bang değil, kademeli sıçra.** 8 → 11 → 17 → 21. Her adımda derle, tüm testleri koştur, `jdeps --jdk-internals` ve `jdeprscan --release 17` ile tara, bağımlılıkları BOM ile birlikte yükselt, üretime canary ile çık.

---

## 3. Spring: Hangi Acıyı Çözüyor?

Spring bir sihir değil; 2000'lerin başındaki kurumsal Java'nın (J2EE/EJB) karmaşasına ve **sıkı bağlılık (tight coupling)** acısına verilmiş bir mühendislik cevabıdır.

Acı şudur: Bir sınıf bağımlılığını içeride `new` ile yaratırsa, somut sınıflara mıhlanır.

```java
class SiparisServisi {
    private final MySqlDepo depo = new MySqlDepo();       // ❌
    // DB'yi PostgreSQL'e çevirmek = sınıfın İÇİNİ değiştirmek
    // Testte sahte (mock) veremezsin
}
```

**IoC (Inversion of Control)**, nesneleri oluşturma ve bağlama kontrolünü senden alıp container'a verir. **DI (Dependency Injection)** onun bağımlılıklar özelindeki en bilinen uygulamasıdır.

> Sanki priz gibi: Lamba kendi elektrik santralini kurmaz, duvardaki prize takılır. Santrali değiştirmek (MySQL → PostgreSQL) lambayı hiç ilgilendirmez.

### Constructor injection, her zaman

- **Constructor injection** — bağımlılık zorunlu ve görünür, alan `final` olabilir, test en kolay. ✅ Önerilen.
- **Setter injection** — opsiyonel bağımlılıklar için, bazen.
- **Field injection** (`@Autowired private`) — bağımlılık gizli, `final` olamaz, test zor. ❌ Kaçın.

Field injection neden kötü? Bağımlılıkları gizler (sınıf dışından görünmez), alanı `final` yapamazsın, Spring olmadan test edemezsin ve **döngüsel bağımlılığı maskeler**. Constructor injection bunların hepsini çözer — üstelik circular dependency'yi uygulama başlangıcında yakalar ki bu bir kusur değil, değerli bir uyarıdır.

### Bean yaşam döngüsü ve scope

Varsayılan scope **singleton**'dır: container başına tek örnek. Burada en sık yapılan hata şu varsayımdır: *"Spring singleton yönetiyorsa thread-safe'dir."* **Değildir.** Spring tek örnek olmasını garanti eder, thread güvenliğini değil. Singleton bean'de paylaşılan mutable durum tutuyorsan senkronizasyon senin sorumluluğundur. En iyisi: singleton servisleri **durumsuz** tut.

### `@Transactional`: ya hep ya hiç

```java
@Transactional
public void transfer(String kimden, String kime, int tutar) {
    jdbc.update("UPDATE hesap SET bakiye = bakiye - ? WHERE ad = ?", tutar, kimden);
    if (tutar > limit) throw new KuralIhlali();   // → HEPSİ rollback
    jdbc.update("UPDATE hesap SET bakiye = bakiye + ? WHERE ad = ?", tutar, kime);
}
```

Üç şeyi bilmeden `@Transactional` kullanmak, er ya da geç üretimde bir sürprizle tanışmak demektir:

**1) Self-invocation tuzağı.** Spring proxy tabanlıdır. Aynı sınıf içinden `this.txMethod()` çağırırsan **proxy'yi atlarsın** ve transaction hiç başlamaz. Çözüm: metodu başka bir bean'e taşımak. (Bölüm 1'deki proxy bilgisi tam olarak burada işe yarıyor.)

**2) Rollback kuralı.** Varsayılan olarak yalnızca **unchecked** (`RuntimeException`) hatalarda rollback olur. Checked exception'da rollback istiyorsan açıkça belirtmelisin: `@Transactional(rollbackFor = Exception.class)`.

**3) `readOnly = true`.** Tüm listeleme/getirme metotlarında kullan. Hibernate salt-okuma transaction'ında nesneleri dirty-checking için izlemez ve sonda flush yapmaz — daha az bellek, daha az CPU. (Bir güvenlik kilidi değildir; amacı performans ve niyet beyanıdır.)

### Dağıtık dünyada: 2PC değil, Saga

Tek veritabanının ötesine geçtiğinde (DB + mesaj kuyruğu, ya da çok servis) basit ACID yetmez.

**2PC/XA** güçlü tutarlılık verir ama **bloklar**: tek bir yavaş veya çöken katılımcı tüm işlemi bekletir, koordinatör çökerse kaynaklar kilitli kalır. Bulut ölçeğinde kullanılabilirliği düşürür.

**Saga** ise işi yerel transaction'lara böler; her adım kendi DB'sinde commit eder. Bir adım patlarsa, önceki adımlar **telafi (compensating) işlemleriyle** geri alınır:

> Sipariş → Stok rezerve → Ödeme tahsil → Kargo oluştur. Kargo patlarsa ters sırada telafi: ödeme iade → stok rezervasyonu serbest.

Buradaki kritik nokta şu: **telafi bir DB rollback değildir.** O adım zaten commit edilmiştir; geri almak için *yeni bir iş* yaparsın ("ödemeyi iade et", "rezervasyonu serbest bırak").

Saga'yı üretimde güvene alan iki desen var:

- **Outbox** — DB'ye yazmak ile mesaj yayınlamak atomik olamaz (iki farklı sistem). Olayı aynı transaction içinde bir tabloya yazarsın; ayrı bir süreç onu okuyup kuyruğa güvenle iletir. Kayıp olay yok.
- **Idempotency** — Her adım ve telafi, aynı olay ikinci kez geldiğinde yan etki üretmemeli. Mesaj tekrarı ve yeniden deneme veriyi bozmaz.

Bunun bedeli **eventual consistency**'dir (nihai tutarlılık): kısa bir süre servisler tutarsız görünür, sonra yakınsar. Bu bir hata değil, **tasarım**dır — "ödemeniz işleniyor" ekranı, bir an eski kalan stok sayısı, "pending" görünen havale hep budur. CAP teoremi gereği ağ bölünmesinde hem tam tutarlılık hem erişilebilirlik olmaz; dağıtık sistem genelde erişilebilirliği seçer.

Ne zaman hangisi? Tek kaynak içinde **anlık doğruluk şartsa** (hesap bakiyesi, son 1 adet stok yarışı) strong/tek-DB transaction. Servisler arası iş akışında (sipariş → ödeme → kargo) Saga + eventual consistency.

---

## 4. Spring Boot: Üretime Hazır

Boot'un tek cümlelik felsefesi: **"Yapılandırma yerine makul varsayımlar."** Auto-configuration + starter'lar + gömülü sunucu → `java -jar` ile çalışan tek uygulama.

`@SpringBootApplication` aslında üç anotasyonun birleşimidir: `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`.

Bu bölümde 45 konu var; burada en çok kan kaybettiren birkaçını seçiyorum.

### JPA: Lazy vs Eager ve N+1

Bu tek karar, hem performansı hem de Java dünyasının en sık karşılaşılan iki hatasını belirler.

- **Eager** yükleme, ilişkili veriyi her sorguda çeker — ihtiyacın olmasa bile. Kontrolsüz kullanıldığında yarım veritabanını belleğe taşır.
- **Lazy** yükleme (varsayılan ve doğru tercih) ise veriyi erişildiğinde çeker. Ama transaction kapandıktan sonra erişirsen meşhur **`LazyInitializationException`** ile tanışırsın.
- Döngü içinde lazy ilişkiye erişmek ise **N+1 sorgu problemi**ni doğurur: 1 sorgu listeyi getirir, sonra her eleman için 1 sorgu daha atılır. 100 sipariş = 101 sorgu.

Çözüm lazy'den kaçmak değil; ihtiyacı **önceden bildirmektir** — `JOIN FETCH` veya `@EntityGraph` ile tek sorguda topla.

### Proxy tuzağı, ikinci kez

`@Transactional`, `@Cacheable`, `@Async`, `@PreAuthorize` — hepsi bean'in etrafına sarılan bir **proxy** ile çalışır. Aynı sınıf içinden çağırırsan (`this.method()`) proxy devreye girmez ve anotasyon **sessizce hiçbir şey yapmaz**. Bu, Spring'de en sık "neden çalışmıyor?" dedirten davranıştır ve kaynağı bölüm 1'de anlattığımız proxy mekanizmasıdır.

### Güvenlik: JWT ve OAuth2

JWT, **imzalı bir kimlik kartıdır**. Login'de üretilir, her istekte `Authorization: Bearer <token>` ile taşınır; sunucu oturum tutmaz, sadece imzayı doğrular (stateless). Parolalar ise her zaman **BCrypt** ile saklanır.

Kurumsal dünyada Spring Security genellikle harici bir kimlik sağlayıcıyla (Keycloak, Auth0, Okta, Azure AD) **birlikte** kullanılır: kimliği IdP doğrular, Spring Security uygulamada yetkiyi uygular ve token'ı doğrulayan **Resource Server** olur.

### Dayanıklılık: dış çağrı = belirsizlik

Yavaş ya da çöken bir bağımlılık, tüm sistemini kilitleyebilir (**cascading failure**). Resilience4j beş deseni anotasyonla verir: **Circuit Breaker** (devre kesici), **Retry**, **Rate Limiter**, **Bulkhead** (bölmeli izolasyon), **Time Limiter**.

Kritik detay: her dış çağrının **zaman aşımı** olmalı. Timeout'suz bir HTTP çağrısı, sonsuza kadar bekleyen bir thread demektir.

İstemci tarafında bugünün tercihi **RestClient** (senkron, modern), **HTTP Interface** (deklaratif) veya **WebClient** (reactive). `RestTemplate` artık bakım modunda.

### Operasyon

Kalan parçalar da aynı Boot deseniyle gelir: **Actuator** (health, metrics, info), profiller (`dev`/`prod`) ve dışsal yapılandırma (`application.yml` + ortam değişkenleri) sayesinde **aynı jar her ortamda**; **Flyway** ile sürümlü şema migration; **Kafka** ile olay akışı; **Micrometer Tracing** ile bir isteğin Gateway → Sipariş → Ödeme → Kargo yolculuğunu uçtan uca izleme; **Docker/Buildpacks/Jib** ile imaj üretimi.

---

## 5. Spring vs Spring Boot

En sık sorulan soru ve en kısa cevabı: **Boot, Spring'in yerini almadı.** Onun üstünde çalışır — aynı IoC/DI, AOP, MVC çekirdeğini kullanır. Boot yalnızca kurulumu otomatikleştirir.

- **Yapılandırma:** Spring'de manuel (XML/Java config) → Boot'ta otomatik (auto-configuration).
- **Bağımlılık:** Spring'de tek tek + sürüm uyumu derdi → Boot'ta starter'lar + BOM.
- **Sunucu:** Spring'de harici Tomcat (WAR) → Boot'ta gömülü (`java -jar`).
- **Üretim araçları:** Spring'de elle ekle → Boot'ta Actuator, profil, metrik hazır.
- **Kontrol:** Spring'de tam manuel → Boot'ta makul varsayılan + istediğini geçersiz kılma.

"Boot config'i gizliyor, kontrolü kaybediyorum" korkusu yersizdir. Boot **opinionated'dır ama dayatmacı değildir**: bean tanımlamazsan varsayılan gelir; tanımlarsan **seninki kazanır** (`@ConditionalOnMissingBean`); istemediğin auto-config'i `exclude` edersin. `--debug` ile hangi otomatik yapılandırmanın neden uygulandığını rapor olarak görebilirsin. Sihir değil, şeffaf bir varsayılanlar katmanı.

Doğru zihniyet şu cümlede: **"Spring'i öğren, Spring Boot ile uygula."** Boot'un sihrini anlamak, altındaki Spring'i anlamaktır.

---

## 6. Spring Boot Sürümleri: 1.x → 4.x

Her Boot sürümü bir Spring kuşağına ve bir Java tabanına yaslanır.

- **Boot 2.x** (2018) — Spring 5 / Java 8–17. WebFlux, Micrometer, HikariCP. 🟡 OSS desteği bitti.
- **Boot 3.0** (2022) — Spring 6 / **Java 17+**. `javax → jakarta`, GraalVM Native (AOT). 🟢
- **Boot 3.2** (2023) — Java 17/21. **Virtual Threads**, RestClient. 🟢
- **Boot 4.0** (Kasım 2025) — **Spring 7** / Java 17–25. Jackson 3, JSpecify null-safety, yerleşik API versiyonlama ve `@Retryable`. 🟢 Güncel major.

**En büyük kırılma 2.x → 3.x'tir.** Jakarta EE 9 ile tüm `javax.*` paketleri `jakarta.*` oldu (`javax.persistence` → `jakarta.persistence`). Bu, senin kodunu **ve** tüm üçüncü parti kütüphaneleri etkiler. Üstüne Java 17 zorunlu taban oldu, `WebSecurityConfigurerAdapter` kaldırıldı, Hibernate 6 sorgu/şema farkları geldi.

İyi haber: bu dönüşümü elle yapmıyorsun — **OpenRewrite** (veya Spring Boot Migrator) import ve bağımlılık dönüşümlerinin çoğunu otomatik hallediyor.

Güvenli yükseltme zinciri: **2.7 (köprü) → Java 17 → 3.x → 4.x**, her halkada testler yeşil. Bağımlılık sürümlerini elle zorlama, BOM'a bırak. Canary ile kademeli yayınla, rollback planı hazır olsun.

Boot 4.0'ın öne çıkan yeniliği ise **yerleşik API versiyonlama**:

```java
@GetMapping(value = "/urunler", version = "1.0")
List<UrunV1> v1() { ... }

@GetMapping(value = "/urunler", version = "2.0")
List<UrunV2> v2() { ... }
```

v1 ve v2 yan yana yaşar; mobil ve web istemcilerini kırmadan kademeli geçirirsin.

Peki "çalışan sürümde kalsam olmaz mı?" Olmaz: eski sürüm **güvenlik yaması almaz** (Boot 2.x'in OSS desteği bitti). Açıklar kapanmaz, yeni kütüphaneler uyumsuzlaşır. Yükseltme bir bakım borcudur ve biriktikçe pahalılaşır.

---

## Toparlarsak

Bu yolculuğun bende bıraktığı birkaç cümle:

- **Java her sürümde "aynı işi daha az ve daha güvenli kodla" yazmanı sağladı.** Yeni sürüme geçmek sadece güncellik değil; daha az hata ve daha hızlı uygulama demektir.
- **Virtual Threads, ölçeği okunabilirlikten feragat etmeden geri getirdi.** Reactive ölmedi ama çoğu I/O-bound senaryoda artık zorunlu değil.
- **Spring'in "sihri" reflection ve proxy'dir.** Bunu bilen kişi, `@Transactional`'ın neden aynı sınıf içinden çalışmadığını bir dakikada çözer; bilmeyen günlerce arar.
- **Dağıtık sistemde tutarlılık bir tasarım kararıdır**, otomatik bir garanti değil. Saga, Outbox ve idempotency'yi bilerek seçersin.
- **"Spring'i öğren, Spring Boot ile uygula."**

---

## İnteraktif sunum

Bu yazıdaki her başlığın arkasında, kavram künyeleri (nedir / nereden gelir / nasıl kullanılır), günlük hayat benzetmeleri, kod karşılaştırmaları ve **tıkla-göster Soru–Cevap** bölümleriyle 110+ konuluk interaktif bir sunum var. Tamamen ücretsiz, tarayıcıda çalışıyor:

**🔗 [Java & Spring — Kapsamlı Eğitim Sunumu](https://www.miracguntogar.com/#sunumlar)**

Eksik bulduğunuz, derinleşmesini istediğiniz ya da farklı düşündüğünüz konuları yorumlarda paylaşın — sunum yaşayan bir belge, geri bildirimle büyüyor.

---

*Miraç Güntoğar — Fullstack Yazılım Geliştirici · Java · Spring Boot · React / Next.js*
