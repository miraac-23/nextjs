# Spring Boot Code Review Dokümanı

> **Amaç:** Bu doküman, TKGM TAKBİS platformundaki Spring Boot (Java 21, Jakarta EE, `golge` framework) backend servislerinin **kod review** ve **kod revizyonu** sürecinde kullanılacak referans standardıdır.
> Her standart için **(a) NEDEN önemli**, **(b) review'da NASIL TESPİT edilir**, **(c) NASIL DÜZELTİLİR** (mümkün olduğunca before/after kod) verilmiştir.
> Tüm örnekler gerçek koddan alınmıştır; sınıf adları, anotasyonlar ve dosya yolları doğrulanmıştır.

---

## 1. Amaç & Kapsam

Bu doküman aşağıdaki katmanların review standartlarını kapsar:

| Bölüm | Katman | Ana kural (özet) |
|------|--------|------------------|
| 4 | Controller | İnce; `server` modülündeki `*RestClient` (`@RequestMapping`) arayüzünü `implements`; sadece DTO döner |
| 5 | Service | Arayüz + impl; `golge` generic service extend; `@Transactional` sınırı burada |
| 6 | Repository | `golge` JPA repository; native sorgu enjeksiyon karşıtı |
| 7 | DTO | `common` modülde; validation anotasyonları; Composite DTO |
| 8 | Mapper | MapStruct / `golge` mapper; null stratejisi; update mapping |
| 9 | Exception Handling | `golge` exception tipleri; `GolgeErrorDetail`; global handler |
| 10 | Validation | jakarta `@Valid`/`@Validated`; `*Constraint` + i18n mesaj |
| 11 | Transaction | propagation/readOnly/rollbackFor; self-invocation tuzağı |
| 12 | Ek Standartlar | constructor injection, Java 21 idiom, Kafka, config, güvenlik, Feign |

**Kapsam dışı:** Entity tasarımı, Liquibase, Elasticsearch indeksleme, frontend. (Ayrı dokümanlar.)

---

## 2. Arka Plan / Mimari Ozet

- **Stack:** Java 21, Spring Boot 3.x (Jakarta EE), Gradle multi-project. Kurum içi `golge` (gölge = shadow) framework: paket `tr.com.test.golge.*`. **golge framework sürümü:** Gradle cache'inde **hem 1.9.0 hem 1.8.1 mevcuttur**; aktif sürüm `taraf-api/gradle.properties`'te explicit değildir — `golge-spring-boot` plugin'inin yönettiği BOM (ekosistem/parent) üzerinden gelir. Bu doküman örnekleri cache'teki 1.9.0 jar'larından javap/unzip ile çıkarılmıştır; sürümü daima ilgili modülün BOM'undan doğrula. **Not:** `gradle.properties`'teki **plugin** sürümleri (`golgeSpringBootPluginVersion=1.7.2`, `golgeHibernatePluginVersion=1.7.0`, `golgeDevToolPluginVersion=1.2.2`) ile **framework modül** sürümleri (1.8.x/1.9.x) farklı şeylerdir; karıştırma.
- **Repo yerleşimi:** Her iş alanı `<ad>-api` üç alt-modülden oluşur:
  - **`client`** — `@FeignClient` ile işaretli **published Feign client** (`<Ad>FeignClient`, ör. `TarafFeignClient`, `IslemYonetimiFeignClient`, `BasvuruFeignClient`). JAR olarak publish edilir; **diğer servisler bunu bağımlılık alır**. Burası diğer servislerin çağırdığı, curated/sınırlı bir uç alt kümesidir.
  - **`common`** — paylaşılan DTO'lar (`golge-data-orm-dto` BOM).
  - **`server`** — çalıştırılabilir Spring Boot app. **`*RestClient` / `*SearchClient` server-tarafı REST arayüzleri buradadır** (`server/.../controller/`), `client` modülünde değil.
- **KRİTİK KONVANSİYON (iki ayrı kavram, karıştırma):**
  - **(a) Server `*RestClient` arayüzü** (`server/.../controller/` içinde, ör. `GercekKisiOperationalRestClient`): `@RequestMapping`/`@PostMapping`/`@GetMapping` ile **path/HTTP metot tanımlar**; `@FeignClient` **değildir**. Controller bu arayüzü `@Override` ile `implements` eder ve sadece gövdeyi yazar. Yani controller = bu **server-tarafı REST arayüzünün** implementasyonu.
  - **(b) Client `<Ad>FeignClient`** (`client/` içinde): `@FeignClient(name=..., url="${...}")` ile işaretli, **diğer servislerin bağımlılık aldığı gerçek published Feign client**. Ayrı bir sınıftır ve genellikle endpoint'lerin curated bir alt kümesini yayınlar; `(a)`'daki server arayüzüyle aynı sınıf değildir.
  - **Yanılgı uyarısı:** "Controller `client` modülündeki Feign arayüzünü implement eder" / "tek kontrat hem çağıran (Feign) hem sunan (controller) tarafından paylaşılır" **DOĞRU DEĞİLDİR**. Controller, `server` modülündeki `*RestClient` (`@RequestMapping`) arayüzünü implement eder; bu arayüz `client` modülündeki `@FeignClient` ile karıştırılmamalıdır. Çağıran ve sunan taraf ayrı arayüzler kullanır; path uyumu derleme zamanında değil, kontrat disiplini ile sağlanır.

**İncelenen referans servisler:**
- `taraf-api/server` — `tr.gov.tkgm.takbis.taraf.server.*` (doğrulanmış referans)
- `islem-yonetimi-api/server` — `tr.gov.tkgm.takbis.islemyonetimi.server.*`
- `basvuru-api/server` — `tr.gov.tkgm.takbis.portal.basvuru.server.*`

**Doğrulanan golge taban tipleri (javap çıktısı):**

```text
GolgeGenericOperationService<ID extends Serializable, GDTO extends GolgeBaseDto<?>>
  save / saveAll / update / updateAll / dynamicUpdate / dynamicUpdateAll / deleteById / deleteAllById

GolgeGenericOperationServiceImpl<ID, GDTO, GE extends GolgeBaseEntity<ID>,
                                 GMPPR extends GolgeGenericMapstructMapper<ID,GDTO,GE>,
                                 R extends GolgeGenericJpaRepository<GE,ID>>
  ctor(EntityManager, GMPPR mapper, R repository)
  public getEntityManager() / getMapper() / getRepository()

GolgeGenericSearchService<ID, GDTO, QDTO extends GolgeQueryDto>
  getById(ID) / queryList(QDTO) / queryPage(QDTO)

GolgeGenericJpaRepository<E extends Serializable, ID extends Serializable>
  extends GolgeGenericJpaSearchRepository<E,ID>
  save / saveAndFlush / update / deleteById / deleteAllByIdInBatch ...

GolgeGenericMapstructMapper<ID, DTO extends GolgeBaseDto<?>, E extends GolgeBaseEntity<ID>>
  DTO convertEntityToDto(E)
  E   convertDtoToEntity(DTO)
  void mapToEntity(DTO, E)            // in-place update mapping
  List/Set toplu dönüşümler

GolgeUncheckedException(RuntimeException)  -> getErrorDetail(): GolgeErrorDetail
GolgeCheckedException(Exception)           -> getErrorDetail(): GolgeErrorDetail
GolgeBusinessRuleException extends GolgeUncheckedException   // STATUS=400
GolgeResourceNotFoundException extends GolgeUncheckedException // STATUS=404
// tam ad: tr.com.test.golge.exception.model.GolgeErrorDetail  (model alt-paketi)
GolgeErrorDetail { int httpStatus; String code, type, cause, message;
                   Map<String,? extends Serializable> attributes; }  // @Builder
// tam ad: tr.com.test.golge.context.handler.GolgeContextExceptionHandler
GolgeContextExceptionHandler extends ResponseEntityExceptionHandler
  handleMethodArgumentNotValid / handleHandlerMethodValidationException /
  handleHttpMessageNotReadable / handleAllException
```

---

## 3. Standartlar & Konvansiyonlar — Hızlı İlkeler — Yasak: /(private|protected)\s+final\s+[A-Z][A-Za-z0-9]*ServiceImpl\s/

| # | İlke | Kural |
|---|------|-------|
| P1 | İnce controller | Controller'da iş mantığı yok; sadece servis çağırır + `ResponseEntity` sarar |
| P2 | DTO sınırı | API sınırından **asla entity dönme**; sadece DTO/record |
| P3 | Arayüz + impl | Service her zaman arayüz + impl; controller arayüze değil servise bağlanır |
| P4 | Transaction sınırı | `@Transactional` **service** katmanında; controller ve repository'de değil |
| P5 | Constructor injection | Field injection (`@Autowired` field) **yasak**; `final` + `@RequiredArgsConstructor` |
| P6 | golge exception | Hata fırlatırken `Golge*Exception` (veya proje türevi) + `GolgeErrorDetail` |
| P7 | i18n mesaj | Validation/iş kuralı mesajları `*Constraint` sabitleri + `{anahtar}` i18n |
| P8 | REST/Feign ayrımı | Controller, `server` modülündeki `*RestClient` (`@RequestMapping`) arayüzünü `implements` eder; `client` modülündeki `@FeignClient` ayrı, published client'tır — ikisi karıştırılmamalı |

---

## 4. Controller — Yasak: /@CrossOrigin\b/

### 4.1 Standart yapı — Yasak: /ResponseEntity\.status\s*\(\s*\d{3}\s*\)|new\s+ResponseEntity\s*</

Controller **ince** olmalı, aşağıdaki imzaya uymalı:

```java
// /home/kerim/repositories/taraf/taraf-api/server/src/main/java/.../controller/GercekKisiOperationalRestController.java
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('IY_KADASTRO_MUDURLUK_KULLANICISI')")
public class GercekKisiOperationalRestController implements GercekKisiOperationalRestClient {

    private final GercekKisiOperationalService gercekKisiOperationalService;

    @Override
    public ResponseEntity<UUID> addGercekKisi(GercekKisiCompositeDto gercekKisiCompositeDto) {
        GercekKisiDto gercekKisiDto = gercekKisiOperationalService.addGercekKisi(gercekKisiCompositeDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(gercekKisiDto.getTarafId());
    }
}
```

İlgili **server-tarafı REST arayüzü** (URL, HTTP metot, `@Valid` burada tanımlanır). Bu arayüz `server` modülündedir ve `@RequestMapping` taşır — `@FeignClient` **değildir**, `client` modülündeki published Feign client ile karıştırılmamalı:

```java
// /home/kerim/repositories/taraf/taraf-api/server/src/main/java/.../controller/GercekKisiOperationalRestClient.java
@RequestMapping("/api/kisiler")               // @FeignClient DEĞİL — server-tarafı REST arayüzü
public interface GercekKisiOperationalRestClient {
    @PostMapping(value = "/")
    ResponseEntity<UUID> addGercekKisi(@Valid @RequestBody GercekKisiCompositeDto gercekKisiCompositeDto);
}
```

Diğer servislerin bağımlılık aldığı **published Feign client ise ayrı bir sınıftır** (`client` modülünde, `@FeignClient` ile) ve genellikle curated/sınırlı bir uç alt kümesini yayınlar:

```java
// /home/kerim/repositories/taraf/taraf-api/client/src/main/java/.../client/TarafFeignClient.java
@FeignClient(name = "tarafFeignClient", url = "${taraf.service.url}")   // gerçek Feign kontratı
public interface TarafFeignClient {
    @PostMapping(value = "/taraf/{tarafRef}")
    ResponseEntity<TapuIslemKisiKimlikKontroluDto> getGercekKisiById(@PathVariable("tarafRef") UUID tarafRef);
    // ... (server'daki tüm uçların değil, curated bir alt kümesinin Feign imzaları)
}
```

**Konvansiyonlar:**
- `@RestController` + `@RequiredArgsConstructor` (constructor injection).
- `implements <Ad>RestClient` — `server` modülündeki (`server/.../controller/`) `@RequestMapping`'li REST arayüzü (`@FeignClient` değil). **Mapping anotasyonları arayüzde**, controller metodu `@Override`.
- Sınıf düzeyinde `@PreAuthorize("hasAuthority('IY_...')")` yetki.
- `ResponseEntity<T>` döner; **ekleme** uçlarında `HttpStatus.CREATED` + üretilen `id`.

#### NEDEN
İnce controller; iş mantığını test edilebilir servise iter, HTTP detayını (status, header) tek yerde tutar. Controller'ın `server` modülündeki `*RestClient` (`@RequestMapping`) arayüzünü implement etmesi, **route tanımını (path/HTTP metot/`@Valid`) controller gövdesinden ayırır** ve tek yerde toplar; metot imzası ile route arasındaki uyum derleme zamanında garanti edilir. (Bu arayüz, `client` modülündeki `@FeignClient`'tan ayrıdır; çağıran taraf published Feign client'ı kullanır, sunan taraf bu server arayüzünü implement eder.)

#### Review'da NASIL TESPİT edilir
- Controller içinde `if/for/try-catch`, repository çağrısı, MapStruct çağrısı, `EntityManager` → **iş mantığı sızması**.
- `implements *RestClient` yoksa veya mapping anotasyonları controller'a kopyalanmışsa → kontrat çift tanımı riski.
- Metot dönüş tipinde entity (`ResponseEntity<Taraf>`) → P2 ihlali.

#### NASIL DÜZELTİLİR

**Anti-pattern 1 — Entity dönmek (gerçek örnek):**

```java
// ❌ ÖNCE — /home/kerim/repositories/taraf/.../controller/TarafSearchRestController.java
public ResponseEntity<Taraf> getTarafByIdList(UUID id) {            // Taraf = ENTITY!
    Optional<Taraf> taraf = tarafSearchService.getTarafById(id);
    return taraf.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
}
```

```java
// ✅ SONRA — DTO dön, projeksiyon/mapper servis katmanında yapılsın
public ResponseEntity<TarafDto> getTarafById(UUID id) {
    return tarafSearchService.getTarafDtoById(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
}
```
> Entity dönmek; lazy-loading sorunları, Envers/audit alanlarının sızması, JSON döngüsü ve API'nin DB şemasına bağlanması demektir.

**Anti-pattern 2 — Hardcoded CORS (gerçek örnek):**

```java
// ❌ ÖNCE — /home/kerim/repositories/islem-yonetimi/.../controller/IslemRestController.java
@RestController
@CrossOrigin(origins = "http://localhost:5173")   // dev URL koda gömülü!
@PreAuthorize("hasAuthority('IY_KADASTRO_MUDURLUK_KULLANICISI')")
public class IslemRestController implements IslemRestClient { ... }
```

```java
// ✅ SONRA — CORS merkezi WebMvc/gateway konfigürasyonunda; origin profil/property'den
// configuration/WebConfig.java içinde CorsRegistry ile yönetilir; controller temiz kalır
@RestController
@PreAuthorize("hasAuthority('IY_KADASTRO_MUDURLUK_KULLANICISI')")
public class IslemRestController implements IslemRestClient { ... }
```

---

## 5. Service — Yasak: /new\s+RestTemplate\s*\(/

### 5.1 Standart yapı: arayüz + impl — Yasak: /new\s+[A-Z][A-Za-z0-9]*(ServiceImpl|RepositoryImpl)\s*\(/

Service her zaman **arayüz + implementasyon** ikilisidir. Operasyonel (yazma) servisler `golge` generic service'i extend eder:

```java
// .../service/GercekKisiOperationalService.java
public interface GercekKisiOperationalService extends GolgeGenericOperationService<UUID, GercekKisiDto> {
    GercekKisiDto addGercekKisi(@Valid @NotNull GercekKisiCompositeDto dto);
    GercekKisiDto saveOrUpdate(GercekKisiDto gercekKisiDto);
}
```

Impl, proje base impl'i üzerinden golge impl'e bağlanır (constructor injection):

```java
// .../service/impl/GercekKisiKimlikOperationalServiceImpl.java
@Service
public class GercekKisiKimlikOperationalServiceImpl
        extends TarafBaseOperationalServiceImpl<UUID, GercekKisiKimlikDto, GercekKisiKimlik,
                                                GercekKisiKimlikMapper, GercekKisiKimlikOperationalRepository>
        implements GercekKisiKimlikOperationalService {

    public GercekKisiKimlikOperationalServiceImpl(EntityManager entityManager,
            GercekKisiKimlikMapper mapper, GercekKisiKimlikOperationalRepository repository) {
        super(entityManager, mapper, repository);
    }
}
```

Search (okuma) servisleri sınıf düzeyinde `@Validated`:

```java
// .../service/GercekKisiSearchService.java
@Validated
public interface GercekKisiSearchService {
    Page<GercekKisiDto> getGercekKisiListePageByTanitimNo(GercekKisiSearchByTanitimNoQueryDto q);
    Optional<GercekKisiOzetDto> getGercekKisiOzetBilgiById(GercekKisiOzetBilgiByIdQueryDto q);
    ...
}
```

**Konvansiyonlar:**
- İş mantığı, koordinasyon (birden çok alt-servis çağrısı), iş kuralı kontrolü **servis katmanında**.
- `golge` `GolgeGenericOperationService` / `GolgeGenericSearchService` extend; CRUD'u tekrar yazmadan kullan.
- Proje base impl (`TarafBaseOperationalServiceImpl`) ortak `@Transactional` ve validation grup ayarlarını taşır.
- `@Validated` sınıf/arayüz düzeyinde → metot parametrelerindeki `@Valid @NotNull` etkinleşir.

#### NEDEN
Arayüz + impl ayrımı; controller'ın bağlandığı kontratla (server-tarafı `*RestClient` REST arayüzü) simetri sağlar, mock'lanabilir test verir, golge generic CRUD'u tekrar yazmamayı sağlar. İş mantığının servis katmanında olması, transaction sınırının doğru yere oturmasını (Bölüm 11) ve controller'ın ince kalmasını garantiler.

#### Review'da NASIL TESPİT edilir
- `@Service` sınıfı arayüz `implements` etmiyorsa → P3 ihlali (DI/test/mock zorlaşır).
- CRUD metotları elle yeniden yazılmışsa (golge `save`/`update` zaten var) → tekrar.
- Servis 8+ bağımlılık + 100+ satırlık tek metot → SRP/karmaşıklık (gerçek örnek aşağıda).

#### NASIL DÜZELTİLİR — yüksek karmaşıklık (gerçek örnek)

`GercekKisiOperationalServiceImpl.addGercekKisi` tek metotta taraf + kimlik + iletişim + vatandaşlık + fotoğraf + engel kaydını yapıyor (iç içe `if`'ler, kodda zaten `// TODO [SONAR-CRITICAL S3776]` notu var):

```java
// ✅ SONRA — alt adımlara böl; her blok kendi private metoduna
@Transactional(transactionManager = "transactionManager", rollbackFor = ServerException.class)
public GercekKisiDto addGercekKisi(@Valid @NotNull GercekKisiCompositeDto dto) {
    isKurallariniKontrolEt(dto);
    TarafDto taraf = saveTaraf(dto);
    GercekKisiDto kisi = saveGercekKisi(dto, taraf);
    if (kisi == null) return null;                 // erken dönüş, iç içe if'i azaltır
    saveKisiKimlikBilgileri(dto, kisi);
    saveTarafIletisimleri(dto, taraf, kisi);
    saveVatandaslik(dto, kisi);
    saveKisiFotograf(dto, kisi);
    saveKisiEngelVeIslemEhliyet(dto, kisi, taraf);
    return kisi;
}
```
> Her alt-adım ayrı, test edilebilir, bilişsel karmaşıklığı düşük private metot olur. `Objects.nonNull(...)` üçlü iç içe `if`'leri tek koşulda birleştir.

---

## 6. Repository — Yasak: /(SELECT|select)\s+\*\s+(FROM|from)\s/

### 6.1 Standart yapı — Yasak: /create(Native)?Query\s*\([^;]*"\s*\+\s*[A-Za-z_$]/

Repository, `golge` JPA repository arayüzünü extend eden bir Spring Data arayüzüdür:

```java
// /home/kerim/repositories/islem-yonetimi/.../repository/IslemRepository.java
@Repository
public interface IslemRepository extends GolgeGenericJpaRepository<Islem, UUID> { }
```

Türetilmiş sorgu metotları (derived query) tercih edilir:

```java
// /home/kerim/repositories/basvuru/.../repository/operational/BasvuruOperationalRepository.java
@Repository
public interface BasvuruOperationalRepository extends GolgeGenericJpaRepository<Basvuru, UUID> {
    Basvuru findByBasvuruNumarasi(Long basvuruNo);
}
```

**Konvansiyonlar:**
- `@Repository` + `GolgeGenericJpaRepository<Entity, ID>` (veya `GolgeJpaRepository`).
- Sorgu stratejisi sırası: (1) golge/Spring Data hazır metotları → (2) derived query (`findByX`) → (3) `@Query` JPQL → (4) son çare native query.
- Native query **zorunluysa** parametreler `:isim` ile **mutlaka parametrelendirilmeli** (string concatenation ile değer eklemek YASAK).

#### NEDEN
golge JPA repository; multi-datasource (search datasource), Envers audit ve soft-delete davranışını standartlaştırır. Parametrelendirilmiş sorgu **SQL injection**'ı önler; derived query ise yazım hatasını derleme/başlangıç zamanında yakalar.

#### Review'da NASIL TESPİT edilir
- Repository içinde iş mantığı / DTO dönüşümü → katman karışması.
- `createNativeQuery("... " + degisken + " ...")` ile **kullanıcı/dış girdi** birleştirme → **SQL injection riski**.
- `nativeQuery=true` ile `:param` yerine string interpolasyon → injection.

#### NASIL DÜZELTİLİR — native sorgu enjeksiyon karşıtı (gerçek örnek)

Dinamik **tablo/kolon adı** gerçekten gerektiğinde (parametre ile bağlanamaz), `islem-yonetimi`'deki çözüm referans alınmalı: `EntityManager` + **whitelist validator** + parametrelendirilmiş değerler.

```java
// /home/kerim/repositories/islem-yonetimi/.../islemtanimlari/repository/CascadeDeleteRepository.java
@Repository
@RequiredArgsConstructor
public class CascadeDeleteRepository {
    private final EntityManager entityManager;
    private final SqlIdentifierValidator sqlValidator;   // tanımlayıcı whitelist doğrulayıcı

    public void softDeleteByDirectFk(String table, String fkColumn, Long refId) {
        sqlValidator.validate(table, "softDeleteByDirectFk.table");     // ✅ identifier whitelist
        sqlValidator.validate(fkColumn, "softDeleteByDirectFk.fkColumn");
        entityManager.createNativeQuery(
                "UPDATE islem_yonetimi." + table + " SET aktif = false WHERE " + fkColumn + " = :ref")
            .setParameter("ref", refId)                 // ✅ DEĞER parametre ile bağlanır
            .executeUpdate();
    }
}
```

JPQL/native sorgularda **değer** daima `:param` ile:

```java
// /home/kerim/repositories/islem-yonetimi/.../islemtanimlari/repository/IslemTanimRepository.java
@Query(value = """
        WITH RECURSIVE tree AS ( ... )
        SELECT ... FROM islem_yonetimi.it_islem_tanim i JOIN tree t ON t.id = i.id
        WHERE i.id = :id
        """, nativeQuery = true)
List<Object[]> findByIdWithTree(Long id);            // ✅ değer parametrelendirilmiş
```

```java
// ❌ ASLA YAPMA
entityManager.createNativeQuery("UPDATE t SET aktif=false WHERE id = " + userInput);  // SQL injection
```
> **Kural:** Değerler her zaman `:param`; sadece tanımlayıcılar (tablo/kolon) zorunlulukta string'e girer ve **whitelist'ten geçirilir**.

---

## 7. DTO — Yasak: /@Data\b/

### 7.1 Standart yapı — Yasak: /(?<!@Valid\s)private\s+(List|Set)<\s*[A-Z][A-Za-z0-9]*Dto\s*>/

DTO'lar **`common`** modülde, golge base DTO'larından türer (Lombok ile):

```java
// /home/kerim/repositories/taraf/taraf-api/common/src/main/java/.../dto/TarafIletisimDto.java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder(toBuilder = true)
@JsonView(value = GolgeView.Base.class)
@EqualsAndHashCode(callSuper = false)
public class TarafIletisimDto extends TarafBaseAuditDto {

    @NotNull(message = "İletişim tipi boş olamaz")
    private Short iletisimTip;

    @NotBlank(message = "İletişim değeri boş olamaz")
    private String iletisimDeger;
    ...
}
```

**Composite DTO** — toplu/iç içe yazma işlemlerinde tek istekle birden çok varlık taşır; iç DTO'larda `@Valid` ile **cascade validation**:

```java
// .../common/dto/GercekKisiCompositeDto.java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder(toBuilder = true)
@JsonView(value = GolgeView.Base.class) @EqualsAndHashCode(callSuper = false)
public class GercekKisiCompositeDto extends TarafBaseDto {
    @Valid private GercekKisiDto gercekKisiDto;
    @Valid private List<GercekKisiKimlikDto> gercekKisiKimlikDto;
    private List<TarafIletisimDto> tarafIletisimDto;
    @Valid private GercekKisiVatandaslikDto gercekKisiVatandaslikDto;
    ...
}
```

**Konvansiyonlar:**
- DTO **`common`** modülde (servisler arası paylaşılır), entity asla.
- Lombok seti: `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder(toBuilder=true) @EqualsAndHashCode(callSuper=...)`.
- Bean Validation anotasyonları DTO alanında, mesajlar Türkçe (i18n için Bölüm 10).
- Composite DTO'da iç nesnelerde `@Valid` (yoksa cascade validation çalışmaz!).

#### record vs Lombok tartışması
- **Mevcut konvansiyon: Lombok.** Çünkü golge base DTO'ları (`TarafBaseDto`, `TarafBaseAuditDto`) **mutable** alanlar + `@SuperBuilder` kalıtım gerektirir; `record` final ve kalıtımsız olduğu için golge generic CRUD (`save`/`update` setter bekler) ile uyumsuzdur.
- **`record` ne zaman uygun:** Servisler arası **immutable** sorgu sonucu / projeksiyon / response-only DTO'larda (golge base'i extend etmeyen, setter gerektirmeyen). Yeni "query result" DTO'larda `record` tercih edilebilir.

#### NEDEN
DTO `common`'da olmaması, servisler arası kontrat paylaşımını imkânsızlaştırır. `@Valid` cascade olmadan iç koleksiyonlar **sessizce doğrulanmaz**. Teleskopik constructor'lar pozisyonel hata kaynağıdır.

#### Review'da NASIL TESPİT edilir
- Entity'nin Feign/REST sınırında DTO yerine geçmesi.
- Composite DTO'da iç DTO/List üzerinde `@Valid` eksikliği → cascade validation devre dışı.
- Aynı kavram için ikiz alanlar (`iletisimTip` + `iletisimTipi`, `ulke` + `ulkeKod`) → veri tutarsızlığı.
- Çok sayıda teleskopik constructor (gerçek örnek: `TarafIletisimDto`'da 6 adet) → builder varken gereksiz, hata-açık.

#### NASIL DÜZELTİLİR

```java
// ❌ ÖNCE — TarafIletisimDto'da 6 teleskopik constructor (pozisyonel, hataya açık)
public TarafIletisimDto(UUID id, Short iletisimTip, String iletisimDeger, Boolean aktif, ...16 param...) { ... }

// ✅ SONRA — @SuperBuilder zaten var; el-yapımı constructor'ları kaldır,
//            JPQL projeksiyonlarda constructor-expression yerine interface/record projeksiyon kullan
TarafIletisimDto.builder().id(id).iletisimTip(tip).iletisimDeger(deger).build();
```

---

## 8. Mapper — Yasak: /BeanUtils\.copyProperties\s*\(|new\s+ModelMapper\s*\(/

### 8.1 Standart yapı — Yasak: /@Mapper\b(?!\s*\([^)]*(componentModel|nullValuePropertyMappingStrategy))/

Mapper, MapStruct arayüzü olup golge generic mapper'ı extend eder:

```java
// /home/kerim/repositories/taraf/.../mapper/GercekKisiKimlikMapper.java
@Mapper(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface GercekKisiKimlikMapper
        extends GolgeGenericMapstructMapper<UUID, GercekKisiKimlikDto, GercekKisiKimlik> { }
```

`islem-yonetimi`'de aynı kontrat, açık Spring component model ile:

```java
// /home/kerim/repositories/islem-yonetimi/.../mapper/IslemMapper.java
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface IslemMapper extends GolgeGenericMapstructMapper<UUID, IslemDto, Islem> { }
```

`GolgeGenericMapstructMapper`'ın sağladığı kontrat (javap ile doğrulandı):

```text
DTO  convertEntityToDto(E)
E    convertDtoToEntity(DTO)
void mapToEntity(DTO, E)     // var olan entity'yi yerinde günceller (update mapping)
List/Set toplu dönüşümler
```

**Konvansiyonlar:**
- `@Mapper` + `GolgeGenericMapstructMapper<ID, Dto, Entity>` extend.
- **Null değer stratejisi:** `nullValuePropertyMappingStrategy = IGNORE` → partial/PATCH update'te DTO'daki `null` alanlar entity'nin mevcut değerini **ezmez** (özellikle `@DynamicUpdate` entity'lerle). Taraf'taki tüm mapper'lar bunu kullanır.
- **Update mapping:** Var olan entity'yi güncellerken `convertDtoToEntity` ile yeni nesne yaratıp kaydetmek yerine `mapToEntity(dto, managedEntity)` ile **managed entity üzerine** yaz (Envers/optimistic-lock/version korunur).
- `componentModel` tutarlı olmalı (golge plugin Spring component üretir; ek `@Mapper(componentModel=SPRING)` repo geneliyle tutarlı kullanılmalı).

#### NEDEN
MapStruct compile-time mapper üretir (reflection yok, hızlı, tip güvenli). `IGNORE` stratejisi olmadan partial update istekleri eksik alanları `null`'a çeker → **veri kaybı**. `mapToEntity` yerine `convertDtoToEntity` ile yeni entity kaydetmek detached/yeni satır, version sıfırlanması ve audit kopukluğu yaratır.

#### Review'da NASIL TESPİT edilir
- Elle `new Entity(); setX(dto.getX())...` dönüşümü (mapper varken) → tekrar, hata kaynağı.
- Update senaryosunda `convertDtoToEntity` + `save` kullanımı → mevcut entity'nin overwrite'i, version kaybı.
- Null stratejisi belirtilmeden partial update beklentisi → istemeden alan sıfırlama.

#### NASIL DÜZELTİLİR

```java
// ❌ ÖNCE — update'te yeni entity üretip kaydetmek (version/audit kopar)
GercekKisiKimlik e = mapper.convertDtoToEntity(dto);
repository.save(e);

// ✅ SONRA — managed entity'yi getir, üzerine yerinde map et
GercekKisiKimlik managed = repository.getById(dto.getId());
mapper.mapToEntity(dto, managed);     // IGNORE stratejisiyle null alanlar korunur
repository.update(managed);
```

---

## 9. Exception Handling — Yasak: /catch\s*\([^)]*\)\s*\{\s*\}/

### 9.1 golge exception tipleri ve ne zaman — Yasak: /throw\s+new\s+(RuntimeException|IllegalArgumentException|IllegalStateException|Exception)\s*\(/

| golge tipi | Tür | HTTP | Ne zaman |
|-----------|-----|------|----------|
| `GolgeBusinessRuleException` | Unchecked | 400 | İş kuralı ihlali (ör. zorunlu alan/kombinasyon hatası) |
| `GolgeResourceNotFoundException` | Unchecked | 404 | Kayıt bulunamadı |
| `GolgeUncheckedException` | Unchecked | (custom) | Proje türevi base; özel `GolgeErrorDetail` ile |
| `GolgeCheckedException` | Checked | (custom) | İmzayla yayılması gereken, çağıranı zorlayan hata |

Projeler kendi türevlerini `GolgeUncheckedException` üzerine kurar ve `GolgeErrorDetail`'i builder ile doldurur:

```java
// /home/kerim/repositories/taraf/.../exception/TarafBusinessRuleException.java
@NoArgsConstructor
public class TarafBusinessRuleException extends GolgeUncheckedException {
    private static final int STATUS = 400;
    public TarafBusinessRuleException(String code, String message) {
        super(GolgeErrorDetail.builder().code(code).message(message).httpStatus(STATUS).build());
    }
}
```

```java
// /home/kerim/repositories/basvuru/.../exception/BasvuruResourceNotFoundException.java
public class BasvuruResourceNotFoundException extends GolgeUncheckedException {
    private static final int STATUS = HttpStatus.NOT_FOUND.value();
    public BasvuruResourceNotFoundException(String code, String message) {
        super(GolgeErrorDetail.builder().code(code).message(message).httpStatus(STATUS).build());
    }
}
```

`GolgeErrorDetail`, ek bağlam (`attributes`) ve neden (`cause`) taşıyabilir (gerçek örnek — basvuru süreç hatası):

```java
// /home/kerim/repositories/basvuru/.../exception/BasvuruProcessException.java
public BasvuruProcessException(String code, String message, UUID basvuruId, String processInstanceId, Throwable cause) {
    super(GolgeErrorDetail.builder()
            .code(code).message(message).httpStatus(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .attributes(buildAttributes(basvuruId, processInstanceId))   // bağlam: basvuruId, processInstanceId
            .cause(cause.getMessage())
            .build(), cause);   // ✅ orijinal cause zincire eklenir
}
```

### 9.2 Global donus — GolgeContextExceptionHandler — Yasak: /catch\s*\([^)]*\)\s*\{[^}]*return\s+(null|Optional\.empty)/

golge, `ResponseEntityExceptionHandler` türevi global bir handler sağlar (javap ile doğrulandı): `handleMethodArgumentNotValid`, `handleHandlerMethodValidationException`, `handleHttpMessageNotReadable`, `handleAllException`. Bu sayede fırlatılan `Golge*Exception` ve validation hataları **standart JSON gövdesiyle** (`GolgeErrorDetail`) döner.

**Konvansiyon:** Servis iş kuralı hatasında **doğru tipi fırlat**; controller'da `try-catch` ile yutma. Proje bazlı `@RestControllerAdvice` gerekiyorsa (golge handler'ı yetmiyorsa) ayrı değerlendir — `BasvuruBusinessRuleException` üzerindeki `// TODO: Golge framework'ün @ControllerAdvice mekanizması incelenmeli (TAK-22512)` notu bu kararın açık olduğunu gösterir.

#### NEDEN
golge exception + `GolgeErrorDetail`; tüm servislerde **tutarlı hata gövdesi** (code/message/httpStatus/attributes) üretir; frontend tek formata göre yazılır. Exception yutmak (catch-log-return null) hatayı gizler, üst katman yanlış başarı varsayar.

#### Review'da NASIL TESPİT edilir
- `catch (Exception e) { log.error(...); return null; }` → **exception yutma** (anti-pattern).
- Genel `RuntimeException`/`IllegalArgumentException` fırlatma (golge tipi yerine) → standart gövde yok, yanlış HTTP status.
- `cause` aktarılmadan yeni exception fırlatma → stack trace kopar, debug zorlaşır.
- Controller'da iş kuralı `try-catch` → servisteki golge handler devre dışı kalır.

#### NASIL DÜZELTİLİR

```java
// ❌ ÖNCE — exception yutma
public GercekKisiDto getById(UUID id) {
    try { return repository.getById(id) ...; }
    catch (Exception e) { log.error("hata", e); return null; }   // çağıran null'ı başarı sanır
}

// ✅ SONRA — doğru golge tipini fırlat, cause'u koru
public GercekKisiDto getById(UUID id) {
    return repository.findById(id)
            .map(mapper::convertEntityToDto)
            .orElseThrow(() -> new TarafBusinessRuleException(
                    "TARAF-404", "Gerçek kişi bulunamadı: " + id));
}
```

---

## 10. Validation — Yasak: /import\s+javax\.validation\./

### 10.1 Katman bazlı doğrulama — Yasak: /(?<!@Valid\s)@RequestBody\b/

1. **API girişi** — controller'ın implement ettiği server-tarafı `*RestClient` (`@RequestMapping`) arayüzünde `@Valid @RequestBody`:
   ```java
   // server/.../controller/GercekKisiOperationalRestClient.java  (@RequestMapping arayüzü)
   ResponseEntity<UUID> addGercekKisi(@Valid @RequestBody GercekKisiCompositeDto dto);
   ```
2. **DTO alanları** — jakarta Bean Validation, mesajla:
   ```java
   @NotNull(message = "İletişim tipi boş olamaz") private Short iletisimTip;
   @NotBlank(message = "İletişim değeri boş olamaz") private String iletisimDeger;
   ```
3. **Service metodu** — sınıf/arayüzde `@Validated` + parametrede `@Valid @NotNull`:
   ```java
   // @Validated arayüz/impl + 
   GercekKisiDto addGercekKisi(@Valid @NotNull GercekKisiCompositeDto dto);
   ```
4. **Validation grupları** — golge `GolgeView.Merge` ile update senaryosu (proje base impl):
   ```java
   // TarafBaseOperationalServiceImpl
   @Validated(value = {Default.class, GolgeView.Merge.class})
   @Override public GDTO update(GDTO dto) { return super.update(dto); }
   ```

### 10.2 *Constraint sabit siniflari + i18n — Yasak: /@(Size|Column)\s*\([^)]*(max|length)\s*=\s*\d+/

Kolon adı / boyut sabitleri ayrı, `final`, private-constructor sınıflarda:

```java
// /home/kerim/repositories/taraf/.../entity/constraint/GercekKisiKimlikConstraint.java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class GercekKisiKimlikConstraint {
    public static final String TABLE_NAME = "kisi_kimlik";
    public static final String ADI_COLUMN = "adi";
    public static final int ADI_MAX_SIZE = 60;
    public static final int SERI_NO_MAX_SIZE = 20;
    ...
}
```

Bu sabitler entity `@Column(name=..., length=...)` ve DTO `@Size(max=...)` içinde tek kaynak olarak kullanılır. **i18n mesaj:** validation mesajları `{anahtar}` formatında, `messages/validation-messages*.properties` (tr/en) dosyalarından çözülür:

```properties
# /home/kerim/repositories/taraf/.../resources/messages/validation-messages_tr.properties
question.sentence.is.empty=Soru cumlesi bos olamaz.
```

```java
// ✅ i18n anahtarı — mesaj koda gömülmez, properties'ten gelir
@NotBlank(message = "{question.sentence.is.empty}")
private String soruCumlesi;
```

#### NEDEN
Katman bazlı validation; geçersiz veriyi en erken sınırda durdurur (controller), iş katmanında da güvence verir (`@Validated` + `@Valid`). `*Constraint` sabitleri DB şeması ↔ DTO ↔ entity arasında **tek doğruluk kaynağı** sağlar (boyut tutarsızlığını önler). `{anahtar}` i18n; mesajları çok dilli ve merkezi kılar.

#### Review'da NASIL TESPİT edilir
- Controller arayüzünde `@Valid` eksik → DTO doğrulanmaz.
- Servis `@Validated` değilse, metot parametre `@Valid @NotNull`'ları **çalışmaz** (proxy devreye girmez).
- Magic number `@Size(max = 60)` (sabit yerine) → boyut DB ile sapabilir.
- Hardcoded Türkçe mesaj (i18n `{anahtar}` yerine) → çok dil/merkezi yönetim yok.

#### NASIL DÜZELTİLİR

```java
// ❌ ÖNCE — magic number + gömülü mesaj
@Size(max = 60, message = "Ad 60 karakteri aşamaz") private String adi;

// ✅ SONRA — Constraint sabiti + i18n anahtarı
@Size(max = GercekKisiKimlikConstraint.ADI_MAX_SIZE, message = "{taraf.ad.maxSize}")
private String adi;
```

---

## 11. Transaction — Yasak: /import\s+(javax|jakarta)\.transaction\.Transactional/

### 11.1 Standart yapı — Yasak: /@Transactional(?!\s*\([^)]*transactionManager)/

`@Transactional` sınırı **servis katmanındadır** (controller/repository değil). golge proje base impl bunu sınıf düzeyinde tanımlar:

```java
// /home/kerim/repositories/taraf/.../service/impl/base/TarafBaseOperationalServiceImpl.java
@Transactional(transactionManager = "transactionManager")
public abstract class TarafBaseOperationalServiceImpl<...> extends GolgeGenericOperationServiceImpl<...> {
    @Validated(value = {Default.class, GolgeView.Merge.class})
    @Override public GDTO update(GDTO dto) { return super.update(dto); }
    ...
}
```

Çok adımlı atomik işlemde metot düzeyinde `rollbackFor`:

```java
// GercekKisiOperationalServiceImpl.addGercekKisi
@Transactional(transactionManager = "transactionManager", rollbackFor = ServerException.class)
public GercekKisiDto addGercekKisi(@Valid @NotNull GercekKisiCompositeDto dto) { ... }
```

**Konvansiyonlar:**
- `@Transactional` **servis** metot/sınıfında. Multi-datasource olduğundan **`transactionManager` adı açıkça verilmeli** (`transactionManager` vs search/replica datasource manager'ı). Yanlış manager → işlem yanlış DB'de.
- Salt-okuma servis/metotlarında `@Transactional(readOnly = true)` → Hibernate flush/dirty-check kapanır, performans + yanlışlıkla yazmayı engeller.
- Checked exception'da rollback için `rollbackFor` (varsayılan sadece `RuntimeException`'da rollback yapar).
- Toplu/composite yazma tek transaction içinde (kısmi kayıt = tutarsız veri).

#### NEDEN
Transaction sınırı serviste; çünkü iş birimi (ör. taraf + kimlik + iletişim) **atomik** olmalı. Controller'da olursa transaction HTTP'ye bağlanır; repository'de olursa her CRUD ayrı commit'lenir (kısmi kayıt). `readOnly` okuma yolunu hızlandırır. `rollbackFor`, checked exception'da kayıtların **geri alınmasını** sağlar.

#### Review'da NASIL TESPİT edilir
- `@Transactional` controller/repository'de → yanlış sınır.
- Self-invocation: aynı sınıf içinde `this.transactionalMetod()` çağrısı → **proxy atlanır, transaction başlamaz**.
- `private`/`final` metotta `@Transactional` → proxy uygulanamaz, sessizce etkisiz.
- Uzun transaction içinde HTTP/Feign çağrısı → DB connection uzun süre tutulur (havuz tükenir).
- Multi-datasource'ta `transactionManager` belirtilmemiş → yanlış DB'ye yazma/okuma.

#### NASIL DÜZELTİLİR

```java
// ❌ ÖNCE — self-invocation: addGercekKisi içinden this.saveKimlik() çağrısı,
//           saveKimlik üzerindeki @Transactional/yeni-propagation ETKİSİZ kalır
public GercekKisiDto addGercekKisi(...) { this.saveKimlik(dto); }
@Transactional(propagation = REQUIRES_NEW) public void saveKimlik(...) { ... }   // proxy atlandı!

// ✅ SONRA — ayrı bean'e taşı (proxy devreye girer) veya tek transaction tasarımı kullan
private final GercekKisiKimlikOperationalService kimlikService;   // ayrı bean
public GercekKisiDto addGercekKisi(...) { kimlikService.saveKimlik(dto); }  // ✅ proxy üzerinden
```

```java
// ✅ Okuma yolunda readOnly + doğru manager
@Transactional(transactionManager = "transactionManager", readOnly = true)
public Page<GercekKisiDto> getGercekKisiListePageByTanitimNo(...) { ... }
```

> **Uzun transaction karşıtı:** Feign/HTTP/Kafka publish çağrılarını transaction dışına al; sadece DB işlemini `@Transactional` içine koy. Dış çağrıyı `TransactionSynchronization`/`@TransactionalEventListener(AFTER_COMMIT)` ile commit sonrasına ertele.

---

## 12. Ek Standartlar — Yasak: /(password|Password|secret|Secret|apiKey|ApiKey)\s*=\s*"[^"]{3,}"/

### 12.1 SADECE constructor injection (field injection YASAK) — Yasak: /@Autowired\b/

**Kural:** Bağımlılıklar `private final` + constructor (Lombok `@RequiredArgsConstructor`) ile enjekte edilir. `@Autowired` **field** injection yasaktır.

**Gerçek anti-pattern (kodda zaten SONAR notu var):**

```java
// ❌ ÖNCE — /home/kerim/repositories/taraf/.../service/impl/GercekKisiVatandaslikSearchServiceImpl.java
// TODO [SONAR-MINOR] Field injection (@Autowired) yerine constructor injection
@Autowired
private TipDegerSearchService tipDegerSearchService;

// ✅ SONRA
private final TipDegerSearchService tipDegerSearchService;   // + sınıfa @RequiredArgsConstructor
```

**NEDEN:** field injection; `final` yapamaz (immutability yok), test'te mock enjekte etmek için reflection/Spring context gerekir, döngüsel bağımlılığı gizler, NPE riskini başlatma sırasına bağlar. Constructor injection bunların hepsini derleme/başlatma zamanında çözer.
**TESPİT:** `grep -rn "@Autowired" .../server/src/main` — field üzerinde her eşleşme bulgu. (`@PersistenceContext EntityManager` field kalabilir — istisna.)

### 12.2 Java 21 idiomları (eski API yerine) — Yasak: /new\s+Date\s*\(\s*\)|java\.util\.(Date|Calendar)\b|new\s+SimpleDateFormat\s*\(/

| Eski / kaçınılan | Modern Java 21 | Neden |
|------------------|----------------|-------|
| `java.util.Date`, `Calendar` | `java.time.*` (`LocalDate`, `LocalDateTime`, `Instant`, `OffsetDateTime`) | immutable, thread-safe, net semantik |
| `null` dönmek | `Optional<T>` + `orElseThrow(...)` | NPE'yi tipe taşır (bkz. `getGercekKisiOzetBilgiById` → `Optional`) |
| uzun `if-else if` zinciri | `switch` pattern matching / switch expression | okunur, exhaustive |
| açık tip tekrarı | yerel `var` (yalnızca tip aşikârsa) | gürültü azaltır; API imzasında kullanma |
| string birleştirme SQL/JSON | text block `"""..."""` | bkz. `IslemTanimRepository` recursive CTE |

```java
// ❌ ÖNCE
Date olusturma = new Date();                         // mutable, zaman dilimi belirsiz
if (tip == 1) {...} else if (tip == 2) {...} else {...}

// ✅ SONRA
OffsetDateTime olusturma = OffsetDateTime.now();
String sonuc = switch (tip) {
    case 1 -> "gercek";
    case 2 -> "tuzel";
    default -> throw new TarafBusinessRuleException("TARAF-TIP", "Bilinmeyen tip: " + tip);
};
```
> **TESPİT:** `grep -rn "new Date()\|java.util.Date" .../server/src/main` (gerçekte `taraf` entity/helper/mapper'da geçiyor). Audit alanlarında golge zaten `java.time` kullanır; iş kodunda da tutarlı ol.

### 12.3 Kafka (idempotency / ack) — Yasak: /enable\.idempotence"?\s*[:=,]\s*"?false|acks"?\s*[:=,]\s*"?[01]\b/

> Not: İncelenen üç serviste aktif Kafka producer/consumer bulunmadı; aşağıdaki kurallar platform standardı (golge Kafka + `ekosistem`) içindir. Kafka kullanan servislerde uygula.

- **Producer:** `acks=all` (veri kaybını önle), `enable.idempotence=true` (duplikasyonu önle), publish'i **commit sonrasına** ertele (uzun transaction içinde publish etme).
- **Consumer:** İşleyici **idempotent** olmalı (aynı mesaj iki kez gelebilir — at-least-once). Manuel `ack`/`AckMode.MANUAL` ile **iş başarıyla bittikten sonra** ack ver; başarısızsa ack verme (retry/DLT).
- Mesaj anahtarı (key) ile sıralama garantisi gereken kayıtları aynı partition'a yönlendir.

```java
// ✅ idempotent consumer + iş bitince ack
@KafkaListener(topics = "taraf-events", ackMode = MANUAL)
public void onEvent(TarafEvent e, Acknowledgment ack) {
    if (islendiMi(e.id())) { ack.acknowledge(); return; }   // idempotency kontrolü
    isle(e);
    ack.acknowledge();                                       // ✅ iş bitince ack
}
```

### 12.4 Config / profil — Yasak: /"https?:\/\/(localhost|127\.0\.0\.1)/

- Konfigürasyon **remote config server** üzerinden (Spring Cloud Config), `bootstrap.yml`'de `spring.cloud.config` + profil listesi:
  ```yaml
  # /home/kerim/repositories/taraf/.../resources/bootstrap.yml
  spring.cloud.config.profile: actuator,ekolog,jpa,swagger,web,security,keycloak,taraf,...
  ```
- **Sır/parametre koda gömülmez**; `${ENV_VAR:default}` placeholder ile dışarıdan gelir (port, app adı, config URL hep `${...}` ile).
- **Anti-pattern:** `@CrossOrigin(origins = "http://localhost:5173")` gibi ortam-özel değerlerin koda gömülmesi (bkz. Bölüm 4.1). Bunlar profile/property'ye taşınmalı.
- **TESPİT:** Koda gömülü URL/host/port/parola; `application*.yml` içinde düz metin sır.

### 12.5 Guvenlik anotasyon konvansiyonu — Yasak: /hasRole\s*\(|permitAll\b/

- Yetkilendirme: sınıf veya metot düzeyinde `@PreAuthorize("hasAuthority('IY_...')")`. Rol deseni **`IY_*`** (ör. `IY_KADASTRO_MUDURLUK_KULLANICISI`). Üç repoda da bu desen geçerli.
- golge güvenlik anotasyonları: `@GolgePublicEndpoint` (kimlik doğrulama gerektirmeyen uç), `@GolgeSecureEndpoint` (güvenli uç) — public uçlar **açıkça** işaretlenmeli; aksi halde varsayılan güvenli kabul edilir.
- Keycloak (OAuth2/JWT) ile entegre; yetki rolü token'dan gelir.
- **TESPİT:** Yazma uçlarında `@PreAuthorize` eksikliği → yetkisiz erişim. Public yapılmak istenen uçta golge public anotasyonu yoksa istem reddedilir; tam tersine hassas uca yanlışlıkla public anotasyon konması da bulgu.

### 12.6 REST arayuzu (server) vs published Feign client (client) — iki ayri kontrat — Yasak: /"Authorization"|HttpHeaders\.AUTHORIZATION/

Bu iki kavram sık karıştırılır; **aynı şey değildir**:

| | **(a) Server `*RestClient` / `*SearchClient`** | **(b) Client `<Ad>FeignClient`** |
|---|---|---|
| Modül | `server` (`server/.../controller/`) | `client` |
| Anotasyon | `@RequestMapping`/`@PostMapping`/`@GetMapping` | `@FeignClient(name=..., url="${...}")` |
| Rolü | Controller'ın `@Override` ile **implement ettiği** server-tarafı route arayüzü | Diğer servislerin bağımlılık aldığı **published Feign client** |
| Kapsam | Servisin tüm uçları | Genellikle **curated/sınırlı** uç alt kümesi |
| Örnek | `taraf-api/server/.../controller/GercekKisiOperationalRestClient.java` | `taraf-api/client/.../client/TarafFeignClient.java` |

- **Sunan taraf:** Controller, `server` modülündeki `*RestClient` (`@RequestMapping`) arayüzünü `implements` eder; path/HTTP metot/`@RequestBody`/`@Valid` **bu arayüzde** tanımlı, controller `@Override` ile sadece gövdeyi yazar (bkz. Bölüm 4).
- **Çağıran taraf:** Diğer servisler `client` modülündeki `@FeignClient`'a (`TarafFeignClient` / `IslemYonetimiFeignClient` / `BasvuruFeignClient` vb.) bağımlılık alır. Bu, server `*RestClient` ile **aynı arayüz değildir**; ayrı yazılır ve genelde uçların bir alt kümesini yayınlar.
- **Yanılgı:** "Tek `*RestClient` arayüzü hem Feign çağıran hem controller tarafından paylaşılır" / "`*RestClient`, `client` modülünde bir `@FeignClient`'tır" **doğru değildir**. `find` ile doğrulandı: `client` modülünde hiçbir `*RestClient` yoktur; hepsi `server/.../controller/`tedir ve `@FeignClient` taşımaz.
- Auth header propagasyonu golge `golge-feign-client` interceptor'ı ile otomatik (JWT taşınır) — elle header set etme.
- **REST semantiği:** Salt-okuma/idempotent listeleme uçları için `@GetMapping` tercih edilmeli; gerçek kodda `TipDegerClient`'ta listeleme uçları `@PostMapping` ile tanımlanmış (kodda `// TODO [ONERI-TUTARLILIK]` notu var) — review'da GET'e çevirme önerilir (cache'lenebilirlik + tutarlılık).
- **TESPİT:** Server `*RestClient` arayüzünde mapping anotasyonlarının arayüz yerine controller sınıfında tekrarlanması (kontrat çift tanımı); published `@FeignClient` ile server `*RestClient`'ın yanlışlıkla tek arayüz sanılması; bir server `@RequestMapping` arayüzüne yanlışlıkla `@FeignClient` eklenmesi.

---

## 13. Hızlı Referans (Checklist)

| ✅ | Kontrol |
|----|---------|
| ☐ | Controller ince; iş mantığı yok; `server` modülündeki `*RestClient` (`@RequestMapping`) `implements` (≠ `client` modülündeki `@FeignClient`); sadece DTO döner |
| ☐ | Ekleme ucu `HttpStatus.CREATED` + id döner |
| ☐ | Sınıf/metot düzeyinde `@PreAuthorize("hasAuthority('IY_...')")` |
| ☐ | Service arayüz + impl; golge generic service extend |
| ☐ | Service `@Validated`; parametrelerde `@Valid @NotNull` |
| ☐ | Repository `@Repository` + golge JPA repo; native sorgu parametrelendirilmiş |
| ☐ | Dinamik tablo/kolon adı whitelist validator'dan geçiyor |
| ☐ | DTO `common` modülde; Composite DTO iç nesnelerde `@Valid` |
| ☐ | Mapper golge generic mapper extend; `NullValuePropertyMappingStrategy.IGNORE`; update'te `mapToEntity` |
| ☐ | İş kuralı/404'te `Golge*Exception` + `GolgeErrorDetail`; exception yutulmuyor; `cause` korunuyor |
| ☐ | Validation mesajları `{anahtar}` i18n; boyutlar `*Constraint` sabitinden |
| ☐ | `@Transactional` serviste; `transactionManager` adı açık; okuma `readOnly`; checked için `rollbackFor`; self-invocation yok |
| ☐ | Tüm bağımlılıklar `private final` + constructor; `@Autowired` field yok |
| ☐ | `java.time` (Date değil); `Optional` (null değil); Feign auth elle set edilmiyor |
| ☐ | Ortam değerleri koda gömülü değil (`${ENV:default}` / config server) |

---

## 14. İlgili Dosyalar (gerçek, doğrulanmış)

**Controller / server-tarafı REST arayüzü:**
- `taraf-api/server/.../controller/GercekKisiOperationalRestController.java` (referans ince controller)
- `taraf-api/server/.../controller/GercekKisiOperationalRestClient.java` (server-tarafı REST arayüzü, `@RequestMapping`/`@PostMapping` — `@FeignClient` DEĞİL)
- `taraf-api/server/.../controller/TarafSearchRestController.java` (❌ entity döndürme anti-pattern)
- `taraf-api/server/.../controller/TipDegerClient.java` (server `@RequestMapping` arayüzü; GET/POST semantiği TODO)
- `islem-yonetimi-api/server/.../controller/IslemRestController.java` (❌ hardcoded `@CrossOrigin`)
- `basvuru-api/server/.../controller/impl/BasvuruSearchRestController.java`

**Published Feign client (client modülü, `@FeignClient` — server `*RestClient`'tan ayrı):**
- `taraf-api/client/.../client/TarafFeignClient.java`
- `islem-yonetimi-api/client/.../client/IslemYonetimiFeignClient.java`, `IslemFeignClient.java`
- `basvuru-api/client/.../client/BasvuruFeignClient.java`

**Service:**
- `taraf-api/server/.../service/GercekKisiOperationalService.java`, `GercekKisiSearchService.java`
- `taraf-api/server/.../service/impl/base/TarafBaseOperationalServiceImpl.java` (golge extend + `@Transactional` + validation grupları)
- `taraf-api/server/.../service/impl/GercekKisiOperationalServiceImpl.java` (composite yazma; SONAR S3776 TODO)
- `taraf-api/server/.../service/impl/GercekKisiVatandaslikSearchServiceImpl.java`, `TuzelKisiSearchServiceImpl.java` (❌ field injection)

**Repository:**
- `islem-yonetimi-api/server/.../repository/IslemRepository.java` (golge generic)
- `basvuru-api/server/.../repository/operational/BasvuruOperationalRepository.java` (derived query)
- `islem-yonetimi-api/server/.../islemtanimlari/repository/CascadeDeleteRepository.java` (EntityManager + `SqlIdentifierValidator` whitelist)
- `islem-yonetimi-api/server/.../islemtanimlari/repository/IslemTanimRepository.java` (`@Query` native, parametrelendirilmiş, text block)

**DTO:**
- `taraf-api/common/.../dto/GercekKisiCompositeDto.java` (Composite, `@Valid` cascade)
- `taraf-api/common/.../dto/TarafIletisimDto.java` (validation + ❌ teleskopik constructor'lar)

**Mapper:**
- `taraf-api/server/.../mapper/GercekKisiKimlikMapper.java`, `TarafMapper.java` (`IGNORE` stratejisi)
- `islem-yonetimi-api/server/.../mapper/IslemMapper.java` (`componentModel = SPRING`)

**Exception:**
- `taraf-api/server/.../exception/TarafBusinessRuleException.java`
- `basvuru-api/server/.../exception/BasvuruResourceNotFoundException.java`, `BasvuruBusinessRuleException.java`, `BasvuruProcessException.java`

**Validation / config:**
- `taraf-api/server/.../entity/constraint/GercekKisiKimlikConstraint.java`
- `taraf-api/server/.../resources/messages/validation-messages_tr.properties`
- `taraf-api/server/.../resources/bootstrap.yml`

**golge framework (jar — javap/unzip ile doğrulandı; cache'teki 1.9.0 jar'ları üzerinden, yanı sıra 1.8.1 de mevcut; aktif sürüm BOM'dan gelir):**
- `golge-web-starter` (`tr.com.test.golge.web.starter.service`): `GolgeGenericOperationService(Impl)`, `GolgeGenericSearchService(Impl)`
- `golge-data-orm-jpa`: `GolgeGenericJpaRepository`, `GolgeJpaNativeRepository`
- `golge-data-orm-mapper`: `GolgeGenericMapstructMapper`
- `golge-exception`: `tr.com.test.golge.exception.GolgeUncheckedException` / `GolgeBusinessRuleException` / `GolgeResourceNotFoundException` / `GolgeCheckedException`; `tr.com.test.golge.exception.model.GolgeErrorDetail` (model alt-paketi)
- `golge-context`: `tr.com.test.golge.context.handler.GolgeContextExceptionHandler`

**Çapraz-link:** Entity/Audit/Liquibase standartları, Frontend (mikro-frontend) review, Güvenlik (Keycloak/JWT) dokümanları ayrı tutulur; bu doküman backend Spring Boot katmanlarını kapsar.
