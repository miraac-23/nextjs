# Spring Boot: Üretime Hazır — Auto-Config'den Dayanıklılığa

*Java & Spring serisi — Bölüm 4/6*

---

[[LINKS]]

Serinin **dördüncü ve en uzun bölümü**. [Bölüm 3](https://medium.com/p/d2fc48834423)'te Spring'in çekirdek felsefesini gördük: IoC, bean, `@Transactional`, Saga. Spring güçlüydü — ama kurulumu yorucuydu.

Spring Boot tam da bunu çözmek için doğdu. Bu bölümde onun felsefesini, bir isteğin uygulama içindeki yolculuğunu, üretimde en çok kan kaybettiren üç konuyu (JPA fetch stratejisi, proxy tuzağı, dış çağrı dayanıklılığı) ve operasyon araçlarını ele alıyoruz.

---

## Felsefe: "Yapılandırma yerine makul varsayımlar"

2000'lerde klasik Spring ile bir web projesi kurmak şöyleydi: Tomcat indir, XML yapılandır, bağımlılık sürümlerini elle eşleştir, WAR paketle, sunucuya deploy et. Saatler, bazen günler.

Spring Boot (2014) üç şeyle bunu dakikalara indirdi:

* **Auto-configuration** — classpath'e bakıp makul varsayılanları otomatik kurar
* **Starter'lar** — uyumlu bağımlılık kümeleri (`spring-boot-starter-web`) + BOM ile sürüm yönetimi
* **Gömülü sunucu** — `java -jar` ile çalışan tek, taşınabilir uygulama

```java
@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}
```

> **Eşyalı ev benzetmesi:** Klasik Spring boş bir ev kiralamaktır — mobilya, beyaz eşya, tesisat hepsini sen kurarsın. Spring Boot **eşyalı ev**dir: her şey makul kurulmuş gelir, sadece beğenmediğini değiştirirsin.

`@SpringBootApplication` aslında **üç anotasyonun birleşimidir**: `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`.

Buradan çıkan pratik kural: **ana sınıf kök pakette olmalı.** `@ComponentScan` oradan aşağıyı tarar. "Bean'im bulunamıyor" hatalarının en yaygın sebebi budur.

---

## Bir İsteğin Yolculuğu

Spring Boot'ta bir HTTP isteği, sen bir şey yazmadan önce birkaç katmandan geçer. Bu haritayı bilmek, "bu kontrolü nereye koymalıyım?" sorusunun cevabıdır.

[[IMG:p4-flow]]

### Filter — servlet seviyesi (en dış katman)

Filter, **DispatcherServlet'in dışındadır** ve her isteği sarar (Spring controller'ı olmayan istekler, statik dosyalar dâhil). Servlet standardının parçasıdır, Spring'e özel değildir.

```java
@Component
class TraceFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String traceId = UUID.randomUUID().toString();
        MDC.put("traceId", traceId);            // tüm loglara basılır
        res.setHeader("X-Trace-Id", traceId);
        try {
            chain.doFilter(req, res);           // sonraki katmana ilet
        } finally {
            MDC.clear();                        // her durumda temizle
        }
    }
}
```

Tipik kullanım: trace-id (korelasyon), CORS, gzip, güvenlik başlıkları. **Spring Security'nin kendisi de bir filter zinciridir.**

Kayıt için `@Component` yeterli görünür ama **tüm yollara** uygulanır ve sırasını kontrol edemezsin. URL deseni ve sıra gerekiyorsa `FilterRegistrationBean` kullan.

### Interceptor — Spring MVC seviyesi

Interceptor DispatcherServlet'in **içinde** çalışır ve kritik bir avantajı vardır: **hangi controller/metodun çağrıldığını bilir.**

* `preHandle` — controller'dan **önce**. `false` dönerse istek **kesilir** (yetkisiz isteği 401 ile burada durdurursun).
* `postHandle` — controller'dan sonra, view render'dan önce. **Hata olursa çağrılmaz.**
* `afterCompletion` — her şey bittikten sonra, **hata olsa bile**. Bu yüzden süre ölçümü ve temizlik için doğru yer burasıdır.

**Hangisini seçmeli?** Handler bilgisine ihtiyacın varsa Interceptor. Ham seviyede, Spring dışı kaynaklar dâhil her şeyi sarmalaman gerekiyorsa Filter.

---

## Katmanlı Mimari: Sorumluluk Dağılımı

* **`@RestController`** — HTTP'yi karşılar, DTO'ya çevirir. **İş mantığı içermez.**
* **`@Service`** — iş kuralları ve transaction sınırı burada.
* **`@Repository`** — veri erişimi; SQL/JPA detayını gizler.
* **DTO** — katmanlar arası taşıma; entity'yi dış dünyaya sızdırmaz.

İş mantığını controller'a yazarsan: test zorlaşır, yeniden kullanım imkânsızlaşır (yalnızca HTTP'den çağrılabilir), transaction sınırı bulanıklaşır. İş mantığı serviste toplanınca aynı "sipariş oluştur" kuralını hem REST controller, hem bir Kafka consumer, hem de zamanlanmış bir job çağırabilir.

**Entity'yi doğrudan JSON döndürme.** İç alanları (parola hash'i, ilişkiler) sızdırır, lazy-loading sorunları doğurur ve API'yi veritabanı şemasına bağlar. DTO kullan.

---

## Spring Data JPA: Kolaylığın Bedeli

Repository arayüzü yazarsın, Spring implementasyonu üretir:

```java
@Entity
class Gorev { @Id @GeneratedValue Long id; String baslik; boolean tamam; }

interface GorevRepo extends JpaRepository<Gorev, Long> {
    List<Gorev> findByTamamFalseAndUserId(Long userId);      // metot adından SQL

    @Query("select g from Gorev g where g.baslik like %:k%")
    List<Gorev> ara(String k);
}
```

Bu kolaylığın bir bedeli var ve fatura üretimde gelir.

### Lazy vs Eager: tek karar, iki meşhur hata

[[IMG:p4-fetch]]

**`LazyInitializationException`** — transaction kapandıktan sonra (controller'da veya JSON serileştirme sırasında) lazy bir ilişkiye erişirsin; proxy artık veritabanına gidemez.

**N+1 sorgu problemi** — 1 sorgu listeyi getirir, sonra döngüde her eleman için 1 sorgu daha atılır. 100 sipariş = **101 sorgu**.

Çözüm lazy'den kaçmak değil, **ihtiyacı önceden bildirmektir**:

```java
@Entity
class Siparis {
    @ManyToOne(fetch = FetchType.LAZY)   // EAGER varsayılanını ez
    Musteri musteri;

    @OneToMany(mappedBy = "siparis")     // zaten LAZY
    List<Kalem> kalemler;
}

// İhtiyaç anında TEK sorguda getir:
@Query("select s from Siparis s join fetch s.kalemler where s.id = :id")
Siparis detay(Long id);

// Alternatif (deklaratif): @EntityGraph(attributePaths = "kalemler")
```

Pratik kural: **tüm ilişkileri LAZY yap**, ihtiyaç duyduğun yerde `join fetch` / `@EntityGraph` / DTO projeksiyonu ile **bilinçli** çek.

Ve "open-session-in-view"e güvenme — `LazyInitializationException`'ı gizler ama yerine **gizli N+1** koyar.

### Hibernate: dirty checking

JPA bir **standart** (arayüz), Hibernate onun en yaygın **uygulamasıdır**. En çok şaşırtan davranışı şudur:

```java
@Transactional
public void zamYap(Long id) {
    Urun u = repo.findById(id).orElseThrow();   // managed (persistence context'te)
    u.setFiyat(u.getFiyat() * 1.2);             // sadece alanı değiştir
    // repo.save(u) YOK — yine de commit'te otomatik UPDATE çalışır
}
```

Persistence context, managed entity'nin yüklenme anındaki hâlini hatırlar; commit/flush'ta farkı görüp **otomatik UPDATE** üretir. Buna **dirty checking** denir.

Bu aynı zamanda `@Transactional(readOnly = true)`'nun neden performans kazandırdığını açıklar: salt-okuma tx'inde Hibernate bu izlemeyi ve flush'ı yapmaz.

---

## Anotasyonların Ardındaki Sihir: Proxy

[Bölüm 1](https://medium.com/p/f52bdfe5408e)'de proxy'nin ne olduğunu, [Bölüm 3](https://medium.com/p/d2fc48834423)'te `@Transactional`'ın bir proxy olduğunu gördük. Şimdi bunun doğurduğu, Spring'in **en sık "neden çalışmıyor?"** dedirten davranışına bakalım.

Spring, bean'i oluştururken onu bir proxy ile sarar. Kavramsal olarak şunu üretir:

```java
class SiparisServisi$$SpringProxy extends SiparisServisi {
    public void kaydet(Siparis s) {
        tx.begin();                                   // advice (önce)
        try { super.kaydet(s); tx.commit(); }         // gerçek metot
        catch (RuntimeException e) { tx.rollback(); throw e; }
    }
}
```

[[IMG:p4-selfinv]]

Bu tuzak `@Transactional`'a özel değil: **`@Cacheable`, `@Async`, `@PreAuthorize`** — hepsi aynı şekilde sessizce devre dışı kalır.

Ek sınırlar:

* **`final` sınıf/metot** CGLIB ile proxy'lenemez → advice hiç çalışmaz.
* **`private`/`protected`** metotlarda advice çalışmaz.
* **Constructor** içinde proxy henüz devrede değildir.

Spring Boot varsayılan olarak **CGLIB** kullanır (arayüz yazmadığın bean'lerde de proxy kurulabilsin diye).

---

## Caching, Async, Scheduling

```java
@Cacheable("urunler")                 // sonucu önbelleğe al
public Urun pahaliBul(Long id) { ... }

@Async                                // ayrı thread'de çalış
public CompletableFuture<Rapor> uret() { ... }

@Scheduled(cron = "0 0 3 * * *")      // her gece 03:00
public void geceBakim() { ... }
```

Döviz kuru her istekte dış API'den çekilirse yavaş ve pahalıdır → `@Cacheable` ile 60 saniye önbelleğe alınır. Kullanıcı e-posta gönderimini beklemesin → `@Async`. Gece raporu → `@Scheduled`.

Cache'i veri değişince `@CacheEvict` ile temizle. TTL istiyorsan Caffeine veya Redis gibi bir sağlayıcı gerekir; varsayılan basit cache TTL bilmez.

---

## Güvenlik: Filter Zinciri, JWT ve IdP

Spring Security bir **servlet filter zinciri** üzerine kuruludur. İki kavramı ayır: **authentication** ("kimsin?") ve **authorization** ("neye yetkilin var?").

```java
@Bean
SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
        .authorizeHttpRequests(a -> a
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .httpBasic(Customizer.withDefaults())
        .build();
}

@Bean PasswordEncoder enc() { return new BCryptPasswordEncoder(); }
```

**Parolayı neden hash'liyoruz, şifrelemiyoruz?** Hash tek yönlüdür — sunucunun bile düz parolayı bilmesine gerek yok. BCrypt ayrıca **salt** ekler ve **yavaştır**; bu, kaba kuvvet saldırısını pahalı hâle getirir.

**JWT**, imzalı bir kimlik kartıdır: login'de üretilir, her istekte `Authorization: Bearer <token>` ile taşınır, sunucu oturum tutmaz — yalnızca imzayı doğrular (stateless).

**Kurumsal gerçek:** Şirketlerde Spring Security genellikle harici bir **kimlik sağlayıcıyla (IdP)** birlikte kullanılır — Keycloak, Okta, Auth0, Microsoft Entra ID, AWS Cognito. Kimliği (login, MFA, SSO, parola politikası) IdP doğrular; uygulaman **OAuth2 Resource Server** olarak token'ı doğrular ve `@PreAuthorize` ile yetkiyi uygular.

Neden? Çünkü MFA, sosyal giriş, SSO, parola sıfırlama, hesap kilitleme, token rotasyonu, denetim kaydı… hepsini doğru ve güvenli yazmak zordur ve risklidir.

---

## Validation ve Tutarlı Hata Yanıtları

```java
record UrunDto(@NotBlank String ad, @Min(0) int fiyat, @Email String mail) {}

@RestControllerAdvice
class GlobalHata {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handle(MethodArgumentNotValidException e) {
        var pd = ProblemDetail.forStatus(400);       // RFC 7807
        pd.setDetail("Doğrulama hatası");
        return ResponseEntity.badRequest().body(pd);
    }
}
```

Ayrımı koru: **girdi (format) doğrulaması** controller'da `@Valid` ile; **iş kuralı doğrulaması** (bakiye yeter mi?) serviste. Bunlar farklı sorumluluklardır.

`ProblemDetail` (RFC 7807), istemciler için makine-okunur ve tutarlı bir hata formatı verir — Spring 6+ yerleşik destekler.

---

## Dış Çağrılar: Ağ = Belirsizlik

Bugünün istemci tercihi: **RestClient** (senkron, modern varsayılan), **HTTP Interface** (`@HttpExchange` — deklaratif, Feign'in native Spring hâli), **WebClient** (gerçekten reactive/streaming gerekiyorsa). `RestTemplate` **bakım modunda** — yeni kodda kullanma.

```java
RestClient client = RestClient.builder()
    .baseUrl("https://api.banka.com").build();

Urun u = client.get().uri("/urun/{id}", id)
    .retrieve()
    .onStatus(s -> s.is4xxClientError(), (req, res) -> { throw new YokHatasi(); })
    .body(Urun.class);
```

Not: **Virtual Threads** (Java 21+, Boot 3.2+) sayesinde "sırf eşzamanlılık için WebClient" gerekçesi büyük ölçüde ortadan kalktı. Bloklayan RestClient, virtual thread'lerle binlerce eşzamanlı çağrıda rahat ölçekleniyor.

### Dayanıklılık: bir bağımlılık seni düşürmesin

[[IMG:p4-resilience]]

En kritik kural: **her dış çağrının zaman aşımı olmalı.** Timeout'suz bir HTTP çağrısı, sonsuza kadar bekleyen bir thread demektir; thread'ler tükenir ve uygulaman düşer.

```java
@CircuitBreaker(name = "kargo", fallbackMethod = "yedek")
@Retry(name = "kargo")
public Kargo getir(Long id) {
    return client.get().uri("/{id}", id).retrieve().body(Kargo.class);
}

public Kargo yedek(Long id, Throwable t) { return Kargo.tahmini(); }
```

**Retry her zaman güvenli değildir!** Yalnızca **idempotent** çağrılarda (GET, veya idempotency-key ile korunan POST). Aksi hâlde retry **çift tahsilat** üretir.

---

## Operasyon: Actuator, Profiller, Test

**Actuator** üretimde gözünü açar: `/health` (Kubernetes liveness/readiness probe'larının kaynağı), `/metrics` (Micrometer → Prometheus/Grafana), `/info`.

*Liveness* = "uygulama ölü mü?" (ölüyse yeniden başlat). *Readiness* = "trafik alabilir mi?" (warmup bitmemişse trafiği kes ama öldürme).

**Yapılandırma dışarıdan gelir:** `application.yml` + ortam değişkenleri + profiller. Aynı jar dev, test ve prod'da çalışır. Öncelik sırası (yüksekten alçağa): komut satırı > ortam değişkeni > profil-yml > application.yml.

**Sırları (parola, API key) asla koda/git'e koyma.** Ortam değişkeni, Vault, K8s Secret veya şifreli Config Server.

**Test:** Slice testleri hızlı ve odaklıdır:

```java
@WebMvcTest(UrunController.class)      // sadece web katmanı
class UrunControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UrunServisi servis;

    @Test void getir_200() throws Exception {
        when(servis.bul(1L)).thenReturn(new Urun(1L, "Kalem"));
        mvc.perform(get("/api/urunler/1")).andExpect(status().isOk());
    }
}
```

Çoğu test slice olmalı; az sayıda kritik akış `@SpringBootTest` ile uçtan uca. Repository/SQL davranışı için **Testcontainers** ile gerçek veritabanı en güvenilir yoldur.

---

## Mikroservis ve Entegrasyon (kısa tur)

Boot'un geri kalanı aynı desenle gelir: **Flyway** (sürümlü şema migration), **Kafka** (olay akışı + Saga choreography), **Micrometer Tracing** (bir isteğin Gateway → Sipariş → Ödeme → Kargo yolculuğunu uçtan uca izleme), **API Gateway** (tek giriş kapısı), **Config Server** (merkezî yapılandırma), **Docker/Buildpacks/Jib** (imaj üretimi), **OpenAPI/Swagger** (otomatik, her zaman güncel API dokümanı).

Bunların her biri kendi başına bir yazı konusu — ve hepsinin interaktif, kod örnekli anlatımı [sunumda](https://www.miracguntogar.com/#sunumlar) mevcut.

---

## Bölüm Özeti — Aklında Kalsın

* **Felsefe:** "Yapılandırma yerine makul varsayımlar." Auto-config + starter + gömülü sunucu.
* **İstek akışı:** Filter (dış, handler bilmez) → DispatcherServlet → Interceptor (handler bilir) → Controller → Service → Repository.
* **JPA:** Tüm ilişkileri LAZY yap; ihtiyaç anında `join fetch`/`@EntityGraph` ile çek. N+1 ve `LazyInitializationException` buradan doğar.
* **Proxy tuzağı:** Aynı sınıf içinden çağrı (`this.method()`) `@Transactional`/`@Cacheable`/`@Async`'i **sessizce** devre dışı bırakır.
* **Dış çağrı:** Timeout **zorunlu**; circuit breaker + retry (yalnızca idempotent çağrıda).
* **Operasyon:** Actuator + profiller + dışsal konfigürasyon = aynı jar her ortamda.

---

## Sırada ne var?

**Bölüm 5: Spring vs Spring Boot.** "Boot, Spring'in yerini mi aldı?", "kontrolü kaybediyor muyum?" ve "hangisini ne zaman?" sorularının net cevapları.

[[SERIES]]
