# Spring Framework: IoC'den Saga'ya — Hangi Acıyı Çözüyor?

*Java & Spring serisi — Bölüm 3/6*

---

[[LINKS]]

Bu yazı, 6 bölümlük serinin **üçüncü parçası**. [Bölüm 1](https://medium.com/p/f52bdfe5408e)'de dilin motorunu (thread, proxy, JVM), [Bölüm 2](https://medium.com/p/cf5ac82fdbb8)'de sürüm evrimini gördük. Şimdi bu temelin üzerine kurulan devi ele alıyoruz.

Spring'i "anotasyon ezberi" olarak öğrenmek mümkün — ama işe yaramaz. Çünkü ilk beklenmedik davranışta (ki gelecek) elinde bir açıklama olmaz. Bu yüzden buradaki sıralama şu: **önce hangi acıyı çözdüğü, sonra nasıl çözdüğü, en sonda da nerede kırıldığı.**

---

## Spring nereden çıktı?

2000'lerin başında kurumsal Java (J2EE/EJB) inanılmaz karmaşıktı. Rod Johnson 2003'te bu karmaşaya bir alternatif olarak Spring'i yazdı. Martin Fowler de bu yaklaşımın adını koydu: **Dependency Injection**.

Çözdüğü acı şu: **sıkı bağlılık (tight coupling)**.

```java
class SiparisServisi {
    private final MySqlDepo depo = new MySqlDepo();        // ❌
    private final EpostaGonderici g = new EpostaGonderici();

    // DB'yi PostgreSQL'e çevirmek = sınıfın İÇİNİ değiştirmek
    // Testte sahte (mock) veremezsin
}
```

Bir sınıf bağımlılığını içeride `new` ile yaratırsa, somut sınıflara mıhlanır. Değiştirilemez, test edilemez, yeniden kullanılamaz hâle gelir.

[[IMG:p3-ioc]]

**IoC (Inversion of Control)**, nesneleri oluşturma ve birbirine bağlama kontrolünü **senden alıp container'a verir**. Adı buradan gelir: kontrol tersine döner. **DI (Dependency Injection)** ise IoC'nin bağımlılıklar özelindeki en bilinen uygulamasıdır.

> **Priz benzetmesi:** Lamba kendi elektrik santralini kurmaz — duvardaki prize takılır, elektrik dışarıdan gelir. Santrali değiştirmek (MySQL → PostgreSQL) lambayı hiç ilgilendirmez.

Gerçek hayattan: Bir ekip ödeme sağlayıcısını Stripe'tan Iyzico'ya çevirdi. Servis somut sınıfa değil `OdemeSaglayici` **arayüzüne** bağlı olduğu için, yalnızca yeni implementasyonu yazıp bean tanımını değiştirdiler — iş mantığı sınıflarına **hiç dokunmadılar**.

---

## Temel kavramlar: Bean ve Container

* **Bean** — container'ın oluşturup yönettiği nesne. Senin `SiparisServisi`'n bir bean'dir.
* **Container** (`ApplicationContext`) — bean'leri oluşturur, bağlar, yaşam döngülerini yönetir.
* **Config metadata** — "hangi bean'ler var?" tarifi: Java config (`@Configuration`/`@Bean`), anotasyonlar (`@Component`) veya (eski) XML.

Önemli bir güvence: Spring, context'i kurarken eksik veya çift bean, çözülemeyen bağımlılık gibi hataları **uygulama başlangıcında** (fail-fast) bildirir. Yani bu tür hatalar üretimde saat 3'te değil, `main` çalışır çalışmaz karşına çıkar.

---

## Dependency Injection: Üç yol, tek doğru cevap

[[IMG:p3-di]]

```java
@Service
class UrunServisi {
    private final UrunDeposu depo;

    UrunServisi(UrunDeposu depo) {   // tek constructor → @Autowired gereksiz
        this.depo = depo;
    }
}
```

**Field injection (`@Autowired private`) neden kötü?** Dört sebep:

1. Bağımlılıkları **gizler** — sınıfa dışarıdan bakınca neye ihtiyaç duyduğu görünmez.
2. Alanı `final` yapamazsın.
3. Spring olmadan (düz birim testinde) nesneyi kuramazsın.
4. **Döngüsel bağımlılığı maskeler.**

Son madde önemli: Constructor injection, A↔B döngüsünü **başlangıçta** yakalar ve uygulamayı ayağa kaldırmaz. Bu bir kusur değil, değerli bir uyarıdır — tasarımında bir sorun var demektir. Doğru çözüm ortak mantığı üçüncü bir bean'e çıkarmaktır; `@Lazy` ile susturmak değil.

Aynı tipte iki bean varsa: `@Primary` ile varsayılanı, `@Qualifier("ad")` ile tam istediğini seçersin.

---

## Bean Yaşam Döngüsü ve Scope

[[IMG:p3-lifecycle]]

```java
@Component
class Havuz {
    @PostConstruct void baslat() { /* kaynağı aç */ }
    @PreDestroy   void kapat()  { /* kaynağı kapat */ }
}
```

Burada iki tuzak var:

**1) "Singleton = thread-safe" değildir.** Spring tek örnek olmasını garanti eder, thread güvenliğini **değil**. Singleton bir bean'de paylaşılan mutable durum tutuyorsan senkronizasyon senin sorumluluğundur. En iyisi: singleton servisleri **durumsuz** tut.

**2) Singleton içinde prototype tuzağı.** Prototype bir bean'i constructor'da enjekte edersen yalnızca **bir kez** oluşur — her çağrıda yeni örnek beklersen hayal kırıklığına uğrarsın. Çözüm: `ObjectProvider<T>.getObject()`.

Ayrıca prototype bean'lerde `@PreDestroy` **çalışmaz**: Spring örneği verdikten sonra onu takip etmez, temizlik çağıranın sorumluluğundadır.

---

## `@Transactional`: Ya Hep Ya Hiç

Bir iş çoğu zaman tek bir SQL değildir. Para transferi: bir hesaptan düş, diğerine ekle. Ya ikisi de olur, ya hiçbiri.

```java
@Service
class TransferServisi {

    @Transactional   // metot başında tx başlar, sonunda commit
    public void transfer(String kimden, String kime, int tutar) {
        jdbc.update("UPDATE hesap SET bakiye = bakiye - ? WHERE ad = ?", tutar, kimden);
        if (tutar > limit) throw new KuralIhlali();      // → HEPSİ rollback
        jdbc.update("UPDATE hesap SET bakiye = bakiye + ? WHERE ad = ?", tutar, kime);
    }
}
```

Bu anotasyonu üç şeyi bilmeden kullanmak, er ya da geç üretimde bir sürprizle tanışmaktır.

### Tuzak 1: Self-invocation (proxy atlanır)

[Bölüm 1'de](https://medium.com/p/f52bdfe5408e) öğrendiğimiz proxy bilgisi tam olarak burada işe yarıyor: Spring proxy tabanlıdır. **Aynı sınıf içinden `this.txMethod()` çağırırsan proxy'yi atlarsın ve transaction hiç başlamaz.** Kod sessizce, transaction'sız çalışır.

Çözüm: metodu başka bir bean'e taşımak (temiz yol) veya bean'i kendine `@Lazy` ile enjekte edip `self.method()` demek.

### Tuzak 2: Rollback kuralı

Varsayılan olarak yalnızca **unchecked** (`RuntimeException`) hatalarda rollback olur. Checked exception'da Spring **commit eder**. Bu, eski EJB geleneğinden gelir: unchecked = beklenmeyen hata, checked = öngörülen durum.

İstemiyorsan açıkça belirt: `@Transactional(rollbackFor = Exception.class)`.

### Tuzak 3 (aslında bir fırsat): `readOnly = true`

Tüm listeleme/getirme metotlarında kullan:

```java
@Transactional(readOnly = true)
public List<Urun> listele() { return repo.findAll(); }
```

Hibernate salt-okuma transaction'ında nesneleri dirty-checking için **izlemez** ve sonda **flush yapmaz** → daha az bellek, daha az CPU. Bazı kurulumlar bunu görüp sorguyu okuma replikasına bile yönlendirir.

Yanlış anlaşılmasın: bu bir **güvenlik kilidi değildir** (düz JDBC ile yine yazabilirsin). Amacı performans ve niyet beyanıdır.

### Diğer öznitelikler

* **`propagation = REQUIRES_NEW`** — dış işlem geri alınsa bile **kalıcı olması gereken** yan kayıtlar için: audit logu, hata kaydı. Dikkat: ayrı bağlantı kullanır, aşırı kullanımı havuzu yorar.
* **`isolation`** — `READ_COMMITTED` (çoğu DB varsayılanı) → `SERIALIZABLE` (en katı, en yavaş).
* **`timeout`** — saniye sınırı; aşılırsa rollback.

---

## Dağıtık Dünya: Tek Transaction Yetmediğinde

Tek veritabanının ötesine geçtiğinde (DB + mesaj kuyruğu, ya da birden çok servis) `@Transactional` çaresizdir. `siparisRepo.save()` ile `odemeClient.tahsilEt()` **aynı transaction'da değildir**: ödeme patlarsa siparişin commit'i geri alınmaz.

İki yaklaşım var.

[[IMG:p3-2pc]]

**2PC/XA** güçlü tutarlılık verir ama **bloklar**: koordinatör "hazır mısınız?" diye sorar, herkes evet derse commit eder. Tek bir yavaş katılımcı tüm işlemi bekletir; koordinatör çökerse kaynaklar kilitli kalır. Bulut ölçeğinde kullanılabilirliği düşürür.

**Saga** ise işi **yerel transaction zincirine** böler. Her adım kendi veritabanında commit eder. Bir adım patlarsa, önceki adımlar **telafi (compensating) işlemleriyle** geri alınır.

[[IMG:p3-saga]]

### En kritik ayrım: telafi ≠ rollback

Telafi bir DB rollback'i **değildir**. O adım zaten commit edilmiştir. Geri almak için **yeni bir iş** yaparsın: "ödemeyi iade et", "rezervasyonu serbest bırak". Bu, tasarımı doğrudan etkiler — her adımın bir tersini yazılabilir olması gerekir.

Peki geri alınamayan adımlar (gönderilmiş bir e-posta)? Üç yol: (1) geri alınamaz adımı **en sona** koy, (2) **ileri telafi** uygula (düzeltici bildirim gönder), (3) adımı **geç bağla** (önce taslak, onay gelince kesinleştir).

### İki tür Saga

* **Orchestration** — merkezî bir koordinatör akışı yönetir ve telafiyi tetikler. Akış nettir, "sürecin neresindeyiz?" sorusu tek yerden cevaplanır. Bedeli: merkezî bağımlılık.
* **Choreography** — servisler olayları dinler, kendi adımını yapar, yeni olay yayar (Kafka). Gevşek bağlıdır, yeni servis eklemek kolaydır. Bedeli: akışı uçtan uca izlemek zorlaşır (dağıtık tracing şart olur).

### Saga'yı üretimde güvene alan iki desen

**Outbox.** DB'ye yazmakla mesaj yayınlamak **atomik olamaz** — ikisi farklı sistem. `save()` commit olup `send()` öncesi çökersen olay kaybolur.

```java
// ✓ Outbox: olayı AYNI transaction'da bir tabloya yaz
@Transactional
void siparisVer(Siparis s) {
    siparisRepo.save(s);
    outboxRepo.save(new Outbox("olaylar", olay));
}
// Ayrı bir yayıncı (poller veya Debezium/CDC) outbox'ı okuyup Kafka'ya güvenle iletir
```

**Idempotency.** Mesajlaşma "en az bir kez" teslim eder — aynı olay iki kez gelebilir. Her adım ve telafi, tekrar çağrıldığında yan etki üretmemelidir:

```java
@KafkaListener(topics = "odeme-olaylari")
void onOdeme(OdemeAlindi e) {
    if (islenmisRepo.existsById(e.olayId())) return;   // zaten işlendi → atla
    kargo.olustur(e.siparisId());
    islenmisRepo.save(new Islenmis(e.olayId()));
}
```

---

## Eventual Consistency: Hata Değil, Tasarım

Saga'nın doğal sonucu **nihai tutarlılık**tır: bir güncellemeden sonra servisler kısa süre tutarsız görünür, sonra yakınsar.

Bu bir bug değildir. Zaten günlük hayatta her yerdedir: "Ödemeniz işleniyor" ekranı, bir an eski kalan stok sayısı, önce "pending" sonra "completed" görünen havale, saniyelerce gecikmeli beğeni sayısı.

Teorik zorunluluk da var: **CAP teoremi** gereği ağ bölünmesinde (P) aynı anda hem tam tutarlılık (C) hem erişilebilirlik (A) olmaz. Dağıtık sistemler genelde A+P seçer — yani eventual consistency.

**Ne zaman hangisi?** Tek bir kaynak içinde anlık doğruluk şartsa (hesap bakiyesi, son 1 adet stok yarışı) → **strong/tek-DB transaction**. Servisler arası iş akışında (sipariş → ödeme → kargo) → **Saga + eventual**.

Kullanıcı deneyimini de tasarımın parçası yap: ara durumları göster ("onaylanıyor"), kritik ekranlarda **read-your-writes** garantisi ver, nihai sonucu bildirimle ilet.

---

## Web MVC: İsteğin Girdiği Kapı

```java
@RestController
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
}
```

Merkezde **DispatcherServlet** (Front Controller) vardır: tüm istekler tek kapıdan geçer, `HandlerMapping` doğru controller metodunu bulur, parametreler bağlanır, sonuç uygun biçime (JSON/HTML) çevrilir.

`@Controller` bir view adı döndürür (sunucu-render HTML). `@RestController` = `@Controller` + `@ResponseBody` — dönüş nesnesini doğrudan JSON gövdesine yazar.

---

## Bölüm Özeti — Aklında Kalsın

* **IoC = kontrolü çerçeveye devret.** Nesneleri sen `new`'lemezsin; container kurar ve bağlar. **DI**, bunun bağımlılıklar özelindeki uygulamasıdır.
* **Constructor injection tercih et.** Bağımlılıklar görünür olur, `final` olur, Spring'siz test edilir.
* **Singleton ≠ thread-safe.** Servisleri durumsuz tut.
* **`@Transactional` bir proxy'dir.** Self-invocation'da çalışmaz; varsayılan olarak yalnızca unchecked exception'da rollback yapar; okuma metotlarında `readOnly = true` kullan.
* **Dağıtıkta Saga.** Telafi bir rollback değil, **yeni bir iştir**. Outbox olayları kaybetmez, idempotency çift işlemeyi önler.
* **Eventual consistency bir tasarım kararıdır**, kusur değil.

---

## Sırada ne var?

**Bölüm 4: Spring Boot — Üretime Hazır.** Auto-configuration'ın gerçekte ne yaptığı, bir isteğin Filter → Interceptor → Controller yolculuğu, JPA'da lazy/eager ve N+1, ve dış çağrıları koruyan dayanıklılık desenleri.

[[SERIES]]
