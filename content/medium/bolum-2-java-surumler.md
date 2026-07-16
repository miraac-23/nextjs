# Java Sürüm Evrimi: 8'den 25'e Dil Nasıl Değişti?

*Java & Spring serisi — Bölüm 2/6*

---

[[LINKS]]

Bu yazı, Java ve Spring'i baştan sona anlatan **6 bölümlük serinin ikinci parçası**. [Bölüm 1'de](https://medium.com/@mrc.gndgr.23/java-%C3%A7ekirdek-e%C5%9Fzamanl%C4%B1l%C4%B1k-proxy-ve-jvmin-motoru-f52bdfe5408e) dilin motorunu — thread'ler, proxy ve JVM — gördük. Şimdi o motorun **zaman içinde nasıl evrildiğine** bakıyoruz.

Bu bölüm iki soruya cevap veriyor: *Her LTS sürümü ne getirdi?* ve daha önemlisi: *Yükseltirken gerçekte ne kırılır?*

---

## Önce takvimi anlayalım: LTS nedir?

Java 2017'den beri **6 ayda bir** sürüm çıkarıyor. Her iki yılda bir çıkan sürüm **LTS** (Long-Term Support) oluyor: **8, 11, 17, 21, 25**.

Eskiden böyle değildi — Java 6'dan 7'ye geçiş yaklaşık 5 yıl sürmüştü. 2017'de "tren modeli" benimsendi: küçük, sık ve öngörülebilir sürümler.

> Sanki tren seferleri gibi: Her 6 ayda bir tren kalkar; kaçırırsan bir sonrakine binersin. LTS trenleri ise **uzun yol** içindir — yıllarca güvenlik ve bakım desteği garantilidir.

Pratik kural: **Üretimde LTS seç.** Ara sürümler (12–16, 18–20, 22–24) yeni özellikleri erken denemek isteyen ekipler içindir; yalnızca 6 ay destek alırlar.

[[IMG:p2-timeline]]

---

## Java 8 (2014) — Fonksiyonel Devrim

Java tarihinin en büyük paradigma değişimi. Nesne yönelimli + emir kipinden (*imperative*), **fonksiyonel + deklaratif** programlamaya geçiş.

### Stream API: "nasıl" değil, "ne"

```java
// ESKİ — imperatif döngü, geçici liste, gürültü
List<String> r = new ArrayList<>();
for (Urun u : urunler)
    if (u.kategori().equals("Elektronik") && u.fiyat() > 1000)
        r.add(u.ad().toUpperCase());

// YENİ — deklaratif, niyet-odaklı zincir
var r = urunler.stream()
    .filter(u -> u.kategori().equals("Elektronik"))
    .filter(u -> u.fiyat() > 1000)
    .map(u -> u.ad().toUpperCase())
    .toList();
```

Fark yalnızca satır sayısı değil: ikinci kod **ne istediğini** söylüyor, birincisi **nasıl yapılacağını**.

Ama bir efsaneyi düzeltelim: **Stream her zaman daha hızlı değildir.** Okunabilirlikte genelde kazanır; performansta basit tek döngülerde klasik `for` daha hızlı olabilir. Stream'in asıl gücü karmaşık dönüşüm zincirleri ve paralelleştirmedir.

### Java 8'in getirdikleri

* **Lambda** — davranışı veri gibi geçirmek: `(a, b) -> a + b`
* **Stream API** — `filter/map/reduce/collect` zinciri
* **Optional** — `null` yerine tip seviyesinde "değer olmayabilir"
* **java.time** — immutable, thread-safe tarih/saat
* **Default metotlar** — arayüzü kırmadan evirmek

### `Optional` hakkında en sık yapılan hata

`Optional` bir **dönüş tipi** olarak tasarlandı ("sonuç olmayabilir"). Entity alanı, metot parametresi veya koleksiyon elemanı olarak kullanmak **önerilmez** — serileştirme ve bellek sorunları çıkarır.

```java
// ESKİ: iç içe null kontrolü
if (k != null && k.getEmail() != null)
    System.out.println(k.getEmail().toUpperCase());

// YENİ: akıcı, niyet açık
bul(id).map(Kullanici::getEmail)
       .map(String::toUpperCase)
       .ifPresent(System.out::println);
```

### `java.time`: sessiz kahraman

Eski `Calendar` API'si ay indekslerini **0'dan** başlatıyordu — `c.set(2026, 5, 24)` Haziran değil, **Mayıs** demekti. Bankacılık uygulamalarında vade hesabı bu yüzden yıllarca bug üretti.

```java
LocalDate t = LocalDate.of(2026, 6, 24);          // net
LocalDate son = t.plusMonths(2).plusDays(10);      // immutable
long yas = ChronoUnit.YEARS.between(dogum, t);
```

Kural: veriyi **UTC** (`Instant`) sakla, kullanıcıya gösterirken zaman dilimine (`ZonedDateTime`) çevir.

---

## Java 11 (2018) — Modern Kütüphaneler

Java 8'den geçişin en yaygın hedefi. Dış kütüphane olmadan modern API'ler:

* **HTTP Client** — HTTP/2, async; artık OkHttp'ye gerek yok
* **String** — `strip()`, `isBlank()`, `lines()`, `repeat()`
* **Files.readString / writeString** — tek satır dosya I/O
* **Tek dosya çalıştırma** — `java Merhaba.java` (derleme adımı yok)

```java
HttpClient c = HttpClient.newHttpClient();
HttpResponse<String> r = c.send(
    HttpRequest.newBuilder(URI.create("https://api.com/data")).build(),
    BodyHandlers.ofString());
String body = r.body();
```

### İlk büyük kırılma buradadır (JEP 320)

Java 11 ile **Java EE ve CORBA modülleri JDK'dan kaldırıldı**: JAXB, JAX-WS (SOAP), `javax.annotation`…

Sonuç: sorunsuz derlenen Java 8 kodunuz Java 11'de `NoClassDefFoundError` ile çöker. Çözüm basittir ama bilmek gerekir — kaldırılan modülleri **bağımlılık olarak** projeye eklersiniz.

*"Neden 9 veya 10 değil de 11?"* — Çünkü 9 ve 10 yalnızca 6 ay destekli ara sürümlerdi. Kurumsal dünyada "8'den sonraki yeni temel" 11 oldu.

---

## Java 17 (2021) — Veri-Odaklı Programlama

Java 9–16 arasında biriken modern özelliklerin tek bir LTS pakette toplanması. Ve daha kritik olanı: **Spring Boot 3'ün minimum gereksinimi.**

```java
// Records — 30+ satır → 1 satır
public record Nokta(int x, int y) {}

// Text blocks — çok satırlı string
String json = """
    { "ad": "Ada", "yas": 30 }
    """;

// Sealed — kontrollü hiyerarşi
public sealed interface Sekil permits Daire, Kare {}
```

**Sealed + Records + Pattern matching** üçlüsü birlikte "cebirsel veri modelleme" yapmanı sağlar: derleyici, `switch`'te eksik bıraktığın dalı **yakalar**. Bu, çalışma zamanı hatalarını derleme zamanına taşımak demektir — bir dilin sunabileceği en değerli şeylerden biri.

Java 17'nin kurumsal standart olmasının sebebi nettir: **Spring Boot 3 ve Spring Framework 6, minimum Java 17 ister.** Bu bölümün ve [Bölüm 6'nın](#) kesiştiği nokta tam olarak burasıdır.

Bu geçişte kırılan şey ise **güçlü kapsülleme**dir: `sun.*` ve diğer JDK iç API'lerine erişim kapandı. Eski, iç API'lere dayanan kütüphaneler çalışmaz — güncellemek gerekir.

---

## Java 21 (2023) — Eşzamanlılık Devrimi

Virtual Threads tek başına bu sürümü tarihî yapar (detaylı anlatımı [Bölüm 1'de](https://medium.com/@mrc.gndgr.23/java-%C3%A7ekirdek-e%C5%9Fzamanl%C4%B1l%C4%B1k-proxy-ve-jvmin-motoru-f52bdfe5408e)).

Kalıcılaşan yenilikler:

* **Virtual Threads** ⭐ — milyonlarca hafif thread; thread-per-request geri döndü
* **Pattern matching for switch** — `when` guard'lı, null-güvenli
* **Record patterns** — iç içe record'ları bileşenlerine yıkma
* **Sequenced Collections** — her sıralı koleksiyonda `getFirst/getLast/reversed`
* **Generational ZGC** — milisaniye altı duraklama, büyük heap

```java
record Adres(String sehir, String ulke) {}
record Kullanici(String ad, Adres adres) {}

String s = switch (o) {
    case Kullanici(String ad, Adres(var sehir, var ulke)) -> ad + " @ " + sehir;
    case Integer i when i > 0 -> "pozitif: " + i;
    case null -> "boş";
    default -> "diğer";
};
```

Bu kod on yıl önceki Java'ya göre neredeyse başka bir dil.

### "Virtual Threads gelince reactive öldü mü?"

Hayır — ama çoğu I/O-bound senaryoda **gereksizleşti**. Basit senkron kodla reactive ölçeğini alabiliyorsan, operatör zincirlerine ve zor okunan stack trace'lere katlanmanın bir sebebi kalmıyor. Reactive hâlâ **backpressure**, **streaming** ve olay-tabanlı pipeline'larda değerlidir.

---

## Java 25 (2025) — Olgunlaşma

Preview'dan standarda geçişler. Virtual Threads + Scoped Values + Structured Concurrency üçlemesi tamamlanıyor.

* **Scoped Values** (kalıcı) — `ThreadLocal`'ın virtual-thread dostu halefi
* **Module Import** — `import module java.base;`
* **Compact Source / `void main()`** — öğrenme bariyerini düşürür
* **Compact Object Headers** — heap ve cache iyileşmesi

```java
void main() {                      // public class + static main gerekmez
    IO.println("Merhaba Dünya");
}
```

Bir uyarı: **String Templates** Java 21'de preview olarak geldi, 23'te **geri çekildi** ve 25'te yok. Üretimde kullanmayın.

`void main()` ve `import module` daha çok **öğrenme, prototip ve script** içindir. Büyük projelerde açık `public class` ve tekil import'lar okunabilirlik için tercih edilmeye devam ediyor.

---

## Peki gerçekte ne kazanıyoruz?

[[IMG:p2-gains]]

---

## Sürüm Geçişi: Gerçekte Ne Kırılır?

Bu bölümün en pratik kısmı burası. Yeni sürüme geçmek büyük kazanç sağlar (dil, performans, güvenlik) — ama her büyük adımın kendine özgü kırılmaları vardır.

[[IMG:p2-migration]]

### Kazanımlar

* **Dil:** lambda/Stream → records, sealed, pattern matching → virtual threads
* **Performans:** yeni GC'ler (G1/ZGC), JIT iyileştirmeleri, daha hızlı başlatma
* **Güvenlik:** aktif yamalar — eski LTS'in desteği bittiğinde açıklar **kapanmaz**
* **Modern API:** `java.time`, `HttpClient`, `Files`; daha az boilerplate

### Riskler

* **Kaldırılan API'ler** (`javax.*` modülleri) → `NoClassDefFoundError`
* **Davranış değişiklikleri** (GC, sayısal işlemler, tarih)
* **Üçüncü parti uyumu** — eski kütüphane yeni JDK'da çalışmayabilir
* **Build/araç güncellemesi** — Gradle/Maven, derleyici hedefi

### Geçiş öncesi tarama

Bunu elle yapmayın; JDK zaten iki araç veriyor:

```bash
# Kaldırılan JDK iç API kullanımını bul
jdeps --jdk-internals uygulama.jar

# Hedef sürümde kullanımdan kaldırılan API'leri tara
jdeprscan --release 17 uygulama.jar
```

### Strateji: big bang değil, kademeli

**8 → 11 → 17 → 21.** Her adımda: derle, **tüm testleri koştur**, `jdeps`/`jdeprscan` ile tara, bağımlılıkları BOM ile birlikte yükselt. CI'yı birden çok JDK sürümünde çalıştır. Üretime canary ile kademeli çık, geri dönüş planı hazır olsun.

Hedefin doğrudan 21 olsa bile ara duraklardan geçmek riski ciddi biçimde azaltır: kırılmaları erken ve küçük parçalar hâlinde yakalarsın.

---

## Bölüm Özeti — Aklında Kalsın

* **Java 8 (2014) — Fonksiyonel devrim:** Lambda, Stream, Optional, `java.time`. Emir kipinden deklaratif koda geçiş.
* **Java 11 (2018) — Modern API:** HTTP Client, `var`, yeni String API. İlk büyük kırılma: `javax.*` modülleri kaldırıldı.
* **Java 17 (2021) — Veri-odaklı:** Records, sealed, pattern matching, text blocks. **Spring Boot 3'ün tabanı.**
* **Java 21 (2023) — Eşzamanlılık devrimi:** Virtual Threads, pattern matching for switch, sequenced collections.
* **Java 25 (2025) — Olgunlaşma:** Scoped Values kalıcılaştı; String Templates **yok** (geri çekildi).
* **Geçiş kademeli olmalı:** 8 → 11 → 17 → 21; her adımda derle + test + `jdeps`/`jdeprscan`.

> **Tek cümle:** Java her sürümde "aynı işi daha az ve daha güvenli kodla" yazmanı sağladı. Yükseltmek sadece güncellik değil, **daha az hata ve daha hızlı uygulama** demektir.

---

## Sırada ne var?

**Bölüm 3: Spring Framework — IoC, Bean, Transaction ve Saga.** Spring'in hangi acıyı çözdüğünü, `@Transactional`'ın üç tuzağını ve dağıtık dünyada tutarlılığın nasıl bir *tasarım kararına* dönüştüğünü göreceğiz.

[[SERIES]]
