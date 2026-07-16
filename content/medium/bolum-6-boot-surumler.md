# Spring Boot Sürüm Analizi: 1.x'ten 4.x'e ve javax → jakarta Kırılması

*Java & Spring serisi — Bölüm 6/6*

---

[[LINKS]]

Serinin **son bölümü**. [Bölüm 5](https://medium.com/p/1b5bb4afccc7)'te Spring ile Boot'un aynı takımın iki oyuncusu olduğunu gördük. Şimdi geriye tek bir soru kalıyor — ve bu soru, çalışan sistemi olan herkesin er ya da geç yüzleşmek zorunda kaldığı sorudur:

**"Çalışıyor, dokunmasak olmaz mı?"**

Olmaz. Nedenini ve nasıl güvenle yükselteceğini konuşalım.

---

## Her Boot sürümü neyin üstüne kurulu?

Spring Boot bağımsız bir ada değildir: her büyük sürümü bir **Spring Framework kuşağına** ve bir **Java tabanına** yaslanır.

[[IMG:p6-versions]]

Bu tablo aslında bir bağımlılık zinciri anlatıyor: **Boot 3.x → Spring 6 → Java 17**; **Boot 4.x → Spring 7 → Jackson 3**. Yani Boot'u yükseltmek, çoğu zaman JVM'i de yükseltmek demektir. ([Bölüm 2](https://medium.com/p/cf5ac82fdbb8)'de anlattığımız Java sürüm geçişi tam da bu yüzden bu bölümün ön koşuludur.)

---

## En büyük kırılma: 2.x → 3.x (`javax` → `jakarta`)

Spring Boot tarihinin en sancılı geçişi budur ve sebebi Spring bile değildir.

Oracle, Java EE'yi Eclipse Foundation'a devrettiğinde `javax` isim alanını (namespace) veremedi — marka hakkı. Jakarta EE 9 ile **tüm `javax.*` paketleri `jakarta.*` oldu**:

```java
// ÖNCE
import javax.persistence.Entity;
import javax.servlet.http.HttpServletRequest;
import javax.validation.constraints.NotNull;

// SONRA
import jakarta.persistence.Entity;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotNull;
```

Bu **kod değişikliği değil, paket adı değişikliğidir** — ama her yeri etkiler: senin kodunu, kullandığın **her üçüncü parti kütüphaneyi** ve onların bağımlılıklarını.

Üstüne eklenen diğer kırılmalar:

* **Java 17 zorunlu taban** oldu (Boot 3, Java 8/11 ile çalışmaz).
* **`WebSecurityConfigurerAdapter` kaldırıldı** — Spring Security lambda-DSL'e geçti.
* **Hibernate 6** sorgu ve şema üretiminde davranış farkları getirdi.
* Bazı property'ler yeniden adlandırıldı; `trailing slash` eşleştirme davranışı değişti.

### İyi haber: bunu elle yapmıyorsun

**OpenRewrite** (veya Spring Boot Migrator) import ve bağımlılık dönüşümlerinin büyük çoğunluğunu otomatik yapar. Sana kalan iş:

1. Üçüncü parti kütüphanelerin **jakarta-uyumlu sürümlerini** bulmak,
2. Davranış farklarını **testlerle** yakalamak.

---

## Spring Boot 4.0 (Kasım 2025) ne getirdi?

Boot 4.0, **Spring Framework 7** üzerine kuruludur. Baseline yine Java 17'dir (yani JVM geçişi gerekmez), Java 25'e kadar test edilir.

### API versiyonlama (yerleşik)

Belki de en pratik yenilik. Artık endpoint'leri sürümlemek için elle path/header hilelerine gerek yok:

```java
@GetMapping(value = "/urunler", version = "1.0")
List<UrunV1> v1() { ... }

@GetMapping(value = "/urunler", version = "2.0")
List<UrunV2> v2() { ... }
```

`v1` ve `v2` yan yana yaşar. Mobil ve web istemcilerini **kırmadan** kademeli geçirir, eskisini zamanı gelince kaldırırsın. Bu, API evrimini bir "büyük patlama" olmaktan çıkarır.

### Yerleşik dayanıklılık

```java
@Retryable(maxAttempts = 3)      // artık Spring core'da (Spring Retry bağımlılığı gerekmez)
@ConcurrencyLimit(10)            // eşzamanlı çağrı sınırı
public Sonuc disServis() { ... }
```

### JSpecify null-safety

```java
import org.jspecify.annotations.Nullable;

@Nullable Kullanici bul(Long id);   // IDE ve derleyici null analizi yapabilir
```

Standart `@Nullable`/`@NonNull` anotasyonları; Kotlin ile de uyumlu.

### Jackson 3

Yeni namespace (`tools.jackson`), daha hızlı, daha güvenli varsayılanlar. Boot 3 → 4 geçişindeki **ana iş kalemi** budur.

---

## "Çalışan sürümde kalsam olmaz mı?"

Olmaz — ve sebebi konfor değil, risk:

* **Güvenlik yaması yok.** Boot 2.x'in OSS desteği bitti. Yeni bir açık çıktığında **yaması gelmeyecek**.
* **Kütüphane uyumu kopar.** Kullandığın kütüphanelerin yeni sürümleri yeni Boot/Java tabanını hedefler; bir noktada sıkışırsın.
* **Borç faiziyle birikir.** Bugün 2.7 → 3.x bir hafta sürerken, üç yıl sonra 2.x → 4.x bir çeyrek sürer.
* **Ekip ve topluluk.** Eski sürümde çalışan geliştirici bulmak ve StackOverflow'da cevap bulmak zorlaşır.

Yükseltme bir **bakım borcudur** ve tüm borçlar gibi ertelendikçe pahalılaşır.

---

## Güvenli Yükseltme Zinciri

[[IMG:p6-upgrade]]

Adım adım:

1. **Boot 2.7'ye çık** (köprü sürüm). Her şey çalışır durumda kalır; deprecation uyarılarını temizlersin.
2. **Java 17'ye geç.** ([Bölüm 2](https://medium.com/p/cf5ac82fdbb8)'deki `jdeps`/`jdeprscan` taramaları burada işe yarar.)
3. **Boot 3.x'e atla.** OpenRewrite ile `javax → jakarta`; üçüncü parti sürümlerini güncelle.
4. **Boot 4.x'i planla.** Jackson 3 ve Spring 7 API uyarlamaları.

Her halkada:

* **Derle + tüm testleri koştur.** Güçlü otomatik test kapsamı burada altın değerindedir.
* **Release Notes / Migration Guide oku** — kaldırılan ve değişen API listesi orada.
* **Bağımlılık sürümlerini elle zorlama**, BOM'a bırak.
* **Canary ile kademeli yayınla**, rollback planı hazır olsun.

*"Büyük bir 2.x monolitim var, nereden başlayayım?"* — Tek seferde "big bang" yerine: önce Java 17 + Boot 2.7 (her şey çalışır), sonra otomatik dönüşüm + **modül modül** test, sonra 3.x. Mümkünse kritik modülleri ayır, feature-flag ve canary ile yayına al.

---

## Bölüm Özeti — Aklında Kalsın

* **Her Boot sürümü bir Spring kuşağına ve Java tabanına yaslanır:** Boot 3.x → Spring 6 + Java 17; Boot 4.x → Spring 7 + Jackson 3.
* **En büyük kırılma 2.x → 3.x:** tüm `javax.*` → `jakarta.*`. Kod değil, **namespace** değişimi — ama her yeri etkiler.
* **Yükseltmenin getirisi:** güvenlik yamaları, performans, yeni yetenekler (Virtual Threads, GraalVM Native, RestClient, API versiyonlama).
* **Otomatikleştir:** `javax → jakarta` için **OpenRewrite**.
* **Zincir:** 2.7 → Java 17 → 3.x → 4.x; her halkada test, sonra canary.

---

## Serinin Sonu: Altı Bölümde Ne Yaptık?

1. **[Java Çekirdek](https://medium.com/p/f52bdfe5408e)** — thread'ler, üç klasik tuzak, Virtual Threads, reflection/proxy ve JVM'in motoru.
2. **[Java Sürüm Evrimi](https://medium.com/p/cf5ac82fdbb8)** — 8'den 25'e dil nasıl değişti, geçişte ne kırılır.
3. **[Spring Framework](https://medium.com/p/d2fc48834423)** — IoC'nin çözdüğü acı, `@Transactional`'ın tuzakları, Saga ve eventual consistency.
4. **[Spring Boot](https://medium.com/p/56828329e6e6)** — auto-config, isteğin yolculuğu, JPA fetch stratejisi, proxy tuzağı, dayanıklılık.
5. **[Spring vs Spring Boot](https://medium.com/p/1b5bb4afccc7)** — "Spring'i öğren, Spring Boot ile uygula."
6. **Spring Boot Sürümleri** — bu yazı.

Bu seriyi yazarken kendime tuttuğum pusula şuydu: **her konuda "nedir / nereden gelir / nasıl kullanılır" sorusuna cevap ver, ve nerede kırıldığını sakla.** Çünkü bir teknolojiyi gerçekten bilmek, çalıştığı hâlini ezberlemek değil; **çalışmadığı anı açıklayabilmektir**.

Bir sonraki adım senin: küçük bir Boot projesi kur (REST + JPA + Security), sonra bir mikroservis ikilisi ekle (Gateway/Eureka veya Kafka). Slaytlar ve yazılar harita; **yol, pratiktir**.

[[SERIES]]
