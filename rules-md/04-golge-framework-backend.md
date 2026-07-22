# Golge Framework — Backend Code Review Standartlari

> **Alt gorev 4** karsiligi. Kurum ici **golge** (golge = shadow) backend framework'u (`tr.com.test.golge.*` jar'lari) uzerine kurulu TKGM TAKBIS servislerinin code review'u ve revizyonu icin referans dokuman.
> Frontend (golge-ui + Module Federation) tarafi ayri dokumanda: [04-golge-framework-frontend.md](04-golge-framework-frontend.md) (alt gorev 9).
> **Kullanim:** Her standart icin (a) **NEDEN** onemli, (b) review'da **NASIL TESPIT** edilir, (c) **NASIL DUZELTILIR**. Iddialar jar icerigine (`javap -p`) ve gercek repo dosyalarina dayandirilmistir.

---
## 1. Amac & Kapsam

Bu dokuman, golge framework'un sundugu **hazir altyapiyi** (base entity/DTO/repository/service/controller hiyerarsisi, exception modeli, context/oturum, guvenlik, Feign auth propagasyonu, frontend bilesen/tema/router kutuphanesi, Module Federation kabugu) tanitir ve bu altyapinin **dogru kullanimini** denetleyen review kriterleri verir.

Temel ilke: **Framework zaten sagliyorsa elle yazma.** golge; CRUD, sayfalama, audit, soft-delete, validation view'lari, exception-to-HTTP donusumu, auth header propagasyonu gibi capraz-kesen islerin tamamini generic siniflarda saglar. Bunlari elle tekrar yazan her PR, review'da geri cevrilmelidir (bkz. Bolum A.8).

Dogrulanan kritik surumler (gradle cache, `/home/kerim/.gradle/caches/.../tr.com.test.golge`):

| Modul | Cache'te bulunan surumler | Bu dokumanda incelenen |
|---|---|---|
| golge-web-starter | 1.8.1, **1.9.0** | 1.9.0 |
| golge-data-orm-entity / -jpa / -dto / -mapper / -commons | 1.8.1, **1.9.0** | 1.9.0 |
| golge-exception | 1.8.1, **1.9.0** | 1.9.0 |
| golge-context | 1.8.1, **1.9.0** | 1.9.0 (`GolgeSessionAttributeHolder` SADECE 1.9.0'da var) |
| golge-security | 1.2.1, **1.3.0** | 1.3.0 |
| golge-security-cloud | 1.0.1, **1.1.0** | 1.1.0 |
| golge-feign-client | 1.0.1, **1.1.0** | 1.1.0 |
| golge-ui (frontend) | — | **1.16.10** (`taraf-web/node_modules/golge-ui`) |

> **Surum notu:** golge surumleri `ekosistem-parent` BOM'undan transitif gelir (`taraf/taraf-api/server/build.gradle` golge bagimliliklarinda **explicit surum yoktur**). Kesin surumu DAIMA ilgili repo'nun BOM'undan ve override'larindan dogrulayin (bkz. A.7).

---

## 2. Arka Plan / Mimari Ozet

golge, `ekosistem-parent` BOM uzerine kurulu, Spring Boot 3.x (Jakarta EE) / Java 21 tabanli bir "altyapi cercevesi"dir. Iki katmana ayrilir:

- **Backend jar'lari** (`tr.com.test.golge:*`): her `<ad>-api` projesinin `server` modulu bunlari bagimlilik alir. Calistirilabilir uygulama, golge'nin generic base siniflarini **extends/implements** ederek kendi domain'ini scaffold eder.
- **Frontend (`golge-ui`)**: React 18 + MUI 6 tabanli paylasilan bilesen/tema/router/e-imza/api kutuphanesi. Mikro-frontend'ler (`dis-portal-mf-shell` = host, `<ad>-web` = remote) bunu **singleton shared** olarak Module Federation uzerinden paylasir.

**KRITIK KONVANSIYON (her iki katmanda da):** server controller, `server` modulunun `controller/` paketinde tanimli `*RestClient` arayuzunu **IMPLEMENTS** eder. Bu `*RestClient` arayuzleri (dogrulandi: `taraf-api/server/.../server/controller/`'da 40+ adet) `@FeignClient` DEGIL — paylasilan **Spring MVC REST kontratlaridir** (`@RequestMapping` + `@JsonView(GolgeView.Base)`). Controller bu kontrati implement ederek REST mapping'lerini ve govdeyi ayirir. Feign cagri tarafi ayri bir kontrat olan `TarafFeignClient`'tir (`@FeignClient`, `taraf-api/client` modulunde). golge'nin generic controller'lari (`GolgeOperationalRestController` vb.) generic-CRUD kontratin hazir kismini saglar.

---

# BOLUM A — BACKEND (golge-* jarlar)

## A.1 Modul Haritasi

Her golge modulunun sorumlulugu. (Surumler cache'teki en guncel; gercek surumu BOM belirler.)

| Modul | Sorumluluk | Review'da onemli ic siniflar |
|---|---|---|
| **golge-data-orm-entity** | JPA base entity hiyerarsisi + Envers audit listener'lari + QueryDSL `Q*` uretimi | `GolgeBaseEntity`, `GolgeGenericEntity`, `GolgeEntity`, `GolgeGenericAuditEntity`, `GolgeAuditEntity`, `@GolgeReadOnlyEntity` |
| **golge-data-orm-dto** | DTO base hiyerarsisi (entity'nin ayna karsiligi) | `GolgeBaseDto<ID>`, `GolgeGenericDto<ID>`, `GolgeDto`, `query.GolgeQueryDto` |
| **golge-data-orm-mapper** | MapStruct entity<->DTO donusum sozlesmesi | `GolgeGenericMapstructMapper<ID,DTO,E>` |
| **golge-data-orm-jpa** | Repository base'leri, multi-datasource (search datasource), native sorgu, Envers revizyon repo | `GolgeGenericJpaRepository`, `GolgeJpaRepository`, `GolgeGenericJpaSearchRepository`, `GolgeJpaSearchRepository`, `audit.GolgeGenericJpaEnversAuditRepository` |
| **golge-data-orm-commons** | Repository markeri, native predicate, `GolgeView` (Base/Command/Persist/Merge/Query JSON view'lari) | `GolgeRepository<E>`, `GolgeNativeQueryPredicate`, `view.GolgeView` |
| **golge-data-orm-liquibase** | Liquibase entegrasyonu / changelog altyapisi | — |
| **golge-web-starter** | CRUD service + search service + REST controller generic'leri; tek auto-config ile devreye girer | `GolgeGenericOperationService(Impl)`, `GolgeGenericSearchService(Impl)`, `GolgeGenericOperationalRestController`, `GolgeGenericSearchRestController` + `*Structure` arayuzleri |
| **golge-exception** | Tipli is hatasi modeli | `GolgeUncheckedException`, `GolgeCheckedException`, `GolgeBusinessRuleException`, `GolgeResourceNotFoundException`, `model.GolgeErrorDetail` |
| **golge-context** | Uygulama context erisimi, oturum attribute holder, global exception handler | `holder.GolgeApplicationContextHolder`, `holder.GolgeSessionAttributeHolder`, `handler.GolgeContextExceptionHandler`, `aware.GolgeSessionAware` |
| **golge-security** | Method/endpoint guvenlik anotasyonlari, security context, granted-authority cozumlemesi, RestTemplate auth interceptor | `@GolgeSecureEndpoint`, `@GolgePublicEndpoint`, `context.GolgeSecurityContext`, `interceptor.GolgeSecurityAuthorizationRestClientInterceptor`, `@GolgeConditionalOnSecurityEnabled/Disabled` |
| **golge-security-cloud** | Bulut/mikroservis tarafi: Feign authority client + Feign auth interceptor | `interceptor.GolgeSecurityFeignClientInterceptor`, `client.GolgeSecurityGrantedAuthorityFeignClient` |
| **golge-feign-client** | Feign request interceptor altyapisi (auth header propagasyonu base'i) | `interceptor.GolgeFeignClientInterceptor` (abstract), `@GolgeFeignClientMethodExcludeInterceptor` |
| **golge-keycloak / -integration** | Keycloak OAuth2/JWT entegrasyonu | — |
| **golge-cache / -redis** | Cache soyutlamasi + Redis (sentinel) implementasyonu | — |
| **golge-configuration** | Tum auto-config'lerin extends ettigi `GolgeBaseConfiguration` | `GolgeBaseConfiguration` |
| **golge-swagger** | OpenAPI/Swagger entegrasyonu | — |
| **golge-util / -git / -test** | Yardimci util, git metadata, test altyapisi (`golge-test`) | — |

---

## A.2 Base Sinif Hiyerarsisi (Entity / DTO) — Yasak: /public\s+(boolean\s+equals|int\s+hashCode)\s*\(/

golge iki paralel hiyerarsi sunar: **entity** (DB tarafi) ve **DTO** (tasima tarafi). Ikisi de ayni `ID` tip parametresini ve ayni alan kumesini (version/active/audit) paylasir.

### Entity hiyerarsisi (`javap -p` ile dogrulanmis)

```
GolgeBaseEntity<ID extends Serializable>           // @MappedSuperclass; isNew(), equals/hashCode; Persistable<ID>
  └─ GolgeGenericEntity<ID>                          // + version (int, @Version, kolon OBJ_VERSION) + active (Boolean)
       ├─ GolgeEntity  (= GolgeGenericEntity<Long>)  // + Long id getter/setter; ID sabit Long
       └─ GolgeGenericAuditEntity<ID>                // + createdDate/updatedDate/createdBy/updatedBy (@CreatedDate/@CreatedBy ...)
GolgeAuditEntity (= GolgeEntity + audit alanlari)    // Long id'li audit'li varyant
```

| Base sinif | ID tipi | version+active | audit alanlari | Ne zaman? |
|---|---|---|---|---|
| `GolgeBaseEntity<ID>` | generic | ❌ | ❌ | Cok nadir; sadece optimistic-lock ve active'e ihtiyac yoksa. |
| `GolgeGenericEntity<ID>` | generic (orn. `UUID`) | ✅ | ❌ | UUID PK'li, audit istenmeyen entity. |
| `GolgeEntity` | sabit `Long` | ✅ | ❌ | Long PK'li, audit istenmeyen entity. |
| `GolgeGenericAuditEntity<ID>` | generic (orn. `UUID`) | ✅ | ✅ | **En yaygin** — UUID PK + olusturma/guncelleme izi. (taraf domaini bunu kullanir.) |
| `GolgeAuditEntity` | sabit `Long` | ✅ | ✅ | Long PK + audit. |

> `GolgeGenericEntity`'de `version` alani `OBJ_VERSION` kolonuna `@Version` ile maplenir (optimistic locking). `active` alani soft-delete icin kullanilir; golge `deleteById(id, softDelete=true)` ile bunu yonetir (bkz. A.3).

### Gercek kullanim — `taraf` domain base'i

`taraf/taraf-api/server/.../entity/base/TarafAuditEntity.java`:

```java
@NoArgsConstructor @SuperBuilder(toBuilder = true) @Data @EqualsAndHashCode(callSuper = true)
@Audited @AuditOverride(forClass = GolgeGenericAuditEntity.class)
@MappedSuperclass
@AttributeOverrides({                                  // golge kolon adlarini Turkce'ye cevirir
    @AttributeOverride(name = "active",      column = @Column(name = "aktif",            nullable = false)),
    @AttributeOverride(name = "version",     column = @Column(name = "versiyon",         nullable = false)),
    @AttributeOverride(name = "createdDate", column = @Column(name = "olusturma_tarihi", updatable = false, nullable = false)),
    @AttributeOverride(name = "updatedDate", column = @Column(name = "guncelleme_tarihi",nullable = false)),
    @AttributeOverride(name = "createdBy",   column = @Column(name = "olusturan",        updatable = false, nullable = false)),
    @AttributeOverride(name = "updatedBy",   column = @Column(name = "guncelleyen",      nullable = false)),
})
public abstract class TarafAuditEntity extends GolgeGenericAuditEntity<UUID> {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = ID_FIELD_COLUMN, updatable = false, nullable = false)
    private UUID id;
    @Override public boolean isNew() { return Objects.isNull(getId()); }
}
```

Somut entity (`GercekKisi.java`): `@Entity @Table @DynamicUpdate @Inheritance(JOINED) @SuperBuilder ... extends TarafAuditEntity`.

### DTO hiyerarsisi (entity'nin aynasi)

```
GolgeBaseDto<ID extends Serializable>            // isNew()
  └─ GolgeGenericDto<ID>                           // + version (Integer) + active (Boolean)
       └─ GolgeDto  (= GolgeGenericDto<Long>)      // + Long id
```

> **Kural:** Entity hangi seviyedeyse DTO da ayni seviyede olmali. `GolgeGenericAuditEntity<UUID>` -> DTO `GolgeGenericDto<UUID>` (orn. `GercekKisiDto extends GolgeGenericDto<UUID>`). Audit alanlari DTO'da audit hiyerarsisi olmadigi icin gerekiyorsa DTO'ya elle eklenir.

**Review kontrolleri (A.2):**
- ❌ Yeni entity `@MappedSuperclass`'li golge base'ini extend etmeden, ham `@Entity` + elle `id/version/createdDate` alanlari yaziyorsa: golge base'ine cevir.
- ❌ `equals/hashCode` elle yaziliyorsa: golge base'i + `@EqualsAndHashCode(callSuper = true)` zaten saglar; gereksiz/yanlis (proxy uyumsuzlugu) olabilir.
- ❌ `version`/`active` alanlari elle entity'ye eklenmis (golge base'inde zaten var): cift mapleme, `TarafEntity.java` icindeki TODO bunu acikca isaretliyor — tek kaynak birak.
- ❌ Audit alanlarini (`createdBy` vb.) elle `@PrePersist` ile dolduran kod: golge `@CreatedBy/@CreatedDate` + auditor-aware ile otomatik doldurur.

---

## A.3 Scaffold Akisi (entity → repository → service → controller) — Yasak: /(Optional<[^>]*>\s+findById\s*\(|boolean\s+existsById\s*\(|void\s+deleteById\s*\()/

golge'nin generic CRUD/search zinciri. Domain sinifi her katmanda golge generic'ini extend/implement eder ve tip parametrelerini doldurur.

### Tip parametreleri sozlugu

- `ID` — PK tipi (`UUID`, `Long`, ...).
- `GDTO`/`DTO` — `GolgeBaseDto` turevi DTO.
- `QDTO` — `GolgeQueryDto` turevi sorgu DTO'su (sayfalama/filtre).
- `GE`/`E` — `GolgeBaseEntity` turevi entity.
- `GMPPR` — `GolgeGenericMapstructMapper<ID,DTO,E>` mapper.
- `R` — repository (`GolgeGenericJpaRepository` / `...SearchRepository`).

### Katman 1 — Repository

`GolgeGenericJpaRepository<E, ID>` = yazma+okuma (save/update/delete + tum find). `GolgeGenericJpaSearchRepository<E, ID>` = sadece okuma (search datasource icin). Long PK kisayollari: `GolgeJpaRepository<E extends GolgeEntity>`, `GolgeJpaSearchRepository<E>`.

```java
// taraf: operational repo (yazma)
@Repository
public interface GercekKisiOperationalRepository extends GolgeGenericJpaRepository<GercekKisi, UUID> {}

// taraf: search repo (okuma; ek derived query metodu eklenebilir)
@Repository
public interface GercekKisiSearchRepository extends GolgeGenericJpaSearchRepository<GercekKisi, UUID> {
    boolean existsByTcKimlikNo(Long tcKimlikNo);
}
```

> `GolgeGenericJpaRepository` zaten su metodlari sunar: `save/saveAll/saveAndFlush`, `update/updateAll/updateAndFlush`, `deleteById/deleteAllById/deleteAllInBatch`, `flush`. `GolgeGenericJpaSearchRepository` ise `findById/getById/findAll(Predicate/Pageable/Example/Sort)/exists/count/findBy(...)` + QueryDSL `Predicate` overload'larini sunar. **Bunlari elle yazmayin.**

### Katman 2 — Mapper

```java
@Mapper(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface GercekKisiMapper extends GolgeGenericMapstructMapper<UUID, GercekKisiDto, GercekKisi> {}
```

`GolgeGenericMapstructMapper` su metodlari kontrat olarak verir: `convertEntityToDto`, `convertDtoToEntity`, `mapToEntity(dto,e)`, `convertEntityListToDtoList`/`convertDtoListToEntityList` (List+Set), `convertDtoIdToEntityId`. MapStruct impl'i build-time uretir.

### Katman 3 — Service

```java
// arayuz: golge generic operation service'i extend et, domain-ozel metod ekle
public interface GercekKisiOperationalService extends GolgeGenericOperationService<UUID, GercekKisiDto> {
    GercekKisiDto addGercekKisi(@Valid @NotNull GercekKisiCompositeDto dto);
}
```

`GolgeGenericOperationService<ID, GDTO>` sundugu metodlar (`javap`): `save/saveAll`, `update/updateAll`, `dynamicUpdate/dynamicUpdateAll`, `deleteById(id)`, `deleteById(id, boolean softDelete)`, `deleteAllById(list)`, `deleteAllById(list, boolean)`.

Impl, `GolgeGenericOperationServiceImpl<ID, GDTO, GE, GMPPR, R>`'i extend eder (5 tip parametresi: `EntityManager`, mapper, repository ctor'a verilir). taraf bunu bir ara base ile sarmis:

```java
@Transactional(transactionManager = "transactionManager")
public abstract class TarafBaseOperationalServiceImpl<ID extends Serializable, GDTO extends GolgeGenericDto<ID>,
        E extends GolgeGenericEntity<ID>, MPPR extends GolgeGenericMapstructMapper<ID,GDTO,E>,
        R extends GolgeGenericJpaRepository<E,ID>>
        extends GolgeGenericOperationServiceImpl<ID, GDTO, E, MPPR, R> {
    // update*/dynamicUpdate*: @Validated({Default.class, GolgeView.Merge.class}) ile override
}
```

Search service icin `GolgeGenericSearchService<ID, GDTO, QDTO>`: `getById(id)`, `queryList(qdto)`, `queryPage(qdto)`. Impl (`GolgeGenericSearchServiceImpl`) `QueryGenerator` + `EntityPathBase` (QueryDSL `Q*`) ile sorgu uretir.

### Katman 4 — Controller (`*Structure` arayuzlerinin rolu)

golge controller'i iki parcalidir:
- **`*RestStructure` arayuzu** — REST mapping anotasyonlarini tasir. `javap -v` ile dogrulandi: `GolgeGenericOperationalRestStructure`'da `save` -> `@PostMapping` + `@JsonView(GolgeView.Persist/Query)` + `@Validated({Default, GolgeView.Persist})`; `update` -> `@PutMapping` (+ `GolgeView.Merge`); `deleteById` -> `@DeleteMapping("/id/{id}")` + `@PathVariable`. Body parametreleri `@RequestBody @Valid @NotNull`.
- **`*RestController` sinifi** — Structure'i implement eder, service'i constructor'dan alir, govdesi `service.save(...)` cagrisina indirgenir.

```
GolgeGenericOperationalRestController<ID, GDTO, OS>  implements GolgeGenericOperationalRestStructure<ID, GDTO>
GolgeOperationalRestController<DTO, OS>  (= ...<Long, DTO, OS>)
GolgeGenericSearchRestController<ID, GDTO, QDTO, S>  implements GolgeGenericSearchRestStructure<...>
```

**Pratikte taraf** domain'i CRUD endpoint'lerini cogunlukla `server` modulunun `controller/` paketindeki paylasilan `*RestClient` REST kontrat arayuzu (Spring MVC: `@RequestMapping` + `@JsonView(GolgeView.Base)`, `@FeignClient` DEGIL) uzerinden tanimlar ve controller onu implement eder — golge generic controller'i base olarak da kullanilabilir. Ornek controller (gercek dosya `controller/impl/KorumaKarariRestController.java`):

```java
@RestController @RequiredArgsConstructor
@PreAuthorize("hasAuthority('IY_KADASTRO_MUDURLUK_KULLANICISI')")
public class KorumaKarariRestController implements KorumaKarariRestClient {   // server modulu controller/ paketindeki paylasilan REST kontrat arayuzu
    private final KorumaKarariOperationalService korumaKarariOperationalService;
    private final KorumaKarariSearchService korumaKarariSearchService;
    @Override public ResponseEntity<KorumaKarariDto> saveKorumaKarari(KorumaKarariDto r) { ... }
}
```

> **Not (kontrat ile Feign ayrimi):** `KorumaKarariRestClient` adina ragmen bir Spring MVC arayuzudur (`@RequestMapping("/api/koruma-karari")`, metodlar `@PostMapping` + `@JsonView(GolgeView.Base.class)`); `@FeignClient` anotasyonu YOKTUR. Servisler arasi cagri yapan asil Feign client `TarafFeignClient`'tir (`@FeignClient(name="tarafFeignClient")`, `taraf-api/client` modulunde). `client` modulunde hic `*RestClient` arayuzu yoktur (dogrulandi: `find` ile 0 sonuc; modulde yalniz `TarafFeignClient`, `EnableTarafFeignClient`, `TarafFeignClientConfiguration` var).

> **`GolgeView` (Base/Command/Persist/Merge/Query):** golge, JSON serializasyon ve Bean Validation gruplarini bu view'larla yonetir. View hiyerarsisi (`javap -p` ile dogrulandi): `Base` (kok) -> `Command extends Base` ve `Query extends Base`; `Persist extends Command`, `Merge extends Command`. `save` -> Persist grubu (id beklenmez), `update` -> Merge grubu (id zorunlu); `Base` ise hem yazma hem okuma cevaplarinda ortak gorunen en genis taban view'dir. Gercek taraf kodunda en yaygin kullanilan view `GolgeView.Base`'tir — paylasilan REST kontratlari yanit DTO'larini `@JsonView(GolgeView.Base.class)` ile isaretler (orn. `KorumaKarariRestClient`). Validation anotasyonlarinizi (`@NotNull(groups=...)`) bu view'lara gore tanimlayin; aksi halde update'te id dogrulamasi calismaz.

### Review kontrolleri (A.3)

- ❌ **Elle CRUD controller/service** (save/update/delete metodlarini elle yazan): golge generic'i kullan. (Bolum A.8.)
- ❌ Repository'de `findById`/`save`/`existsById` gibi metodlar **elle redeclare** edilmis: golge base'inde zaten var.
- ❌ Mapper elle `convertEntityToDto` impl'i yaziyor (interface yerine class): MapStruct `@Mapper` + golge interface'i ile build-time uretilmeli.
- ❌ Controller `@RequestMapping` path/HTTP method'larini elle veriyor ama golge `*Structure`'i da implement ediyor: cifte mapping cakismasi. Birini sec.
- ⚠️ Service impl'de `getMapper().convertDtoToEntity(...).save(...)` gibi golge `save()` yerine **dogrudan repository** cagrisi (`saveOrUpdate` ornegindeki gibi): audit/validation/`GolgeView` adimlarini atlayabilir; gerekce yoksa `super.save(dto)` tercih edilmeli.

---

## A.4 Exception Modeli ve Dogru Tip Secimi — Yasak: /throw\s+new\s+(RuntimeException|IllegalArgumentException|IllegalStateException|Exception)\s*\(/

`javap -p` ile dogrulanmis hiyerarsi:

```
RuntimeException
  └─ GolgeUncheckedException        (final GolgeErrorDetail errorDetail)
       ├─ GolgeBusinessRuleException        (ctor: String code, String message; STATUS sabit)
       └─ GolgeResourceNotFoundException    (ctor: String code, String message; STATUS=404 tipi)
Exception
  └─ GolgeCheckedException          (final GolgeErrorDetail errorDetail)
```

`GolgeErrorDetail` alanlari: `httpStatus (int)`, `code`, `type`, `cause`, `message`, `attributes (Map<String, ? extends Serializable>)` + Lombok `builder()`.

| Durum | Kullanilacak tip | HTTP |
|---|---|---|
| Is kurali ihlali (cinsiyet listede yok, ad < 2 hane, ...) | `GolgeBusinessRuleException(code, msg)` | 4xx (genelde 400/422) |
| Aranan kayit yok | `GolgeResourceNotFoundException(code, msg)` | 404 |
| Beklenmeyen ama checked akista | `GolgeCheckedException` | 5xx |
| Genel uncheck altyapi hatasi | `GolgeUncheckedException` | `errorDetail.httpStatus` |

Domain genelde kendi alt sinifini turetir (`taraf`: `TarafBusinessRuleException`, `TarafResourceNotFoundException`) ve sabit hata kodlarini (`ClientErrorCodes`) kullanir:

```java
throw new TarafBusinessRuleException(ClientErrorCodes.CINSIYET_1_3_ARASINDA_OLMALI);
throw new TarafResourceNotFoundException(TARAF_ERROR, "Aradiginiz kriterlerde kayitli kisi yok.");
```

### `GolgeContextExceptionHandler` (golge-context)

`ResponseEntityExceptionHandler` turevi global handler. Yakaladiklari (`javap`): `handleMethodArgumentNotValid`, `handleHandlerMethodValidationException`, `handleHttpMessageNotReadable`, `handleAllException`. Yani **Bean Validation hatalari (`@Valid`) ve tum exception'lar otomatik olarak `GolgeErrorDetail` JSON'una donusur.** `GolgeBusinessRuleException` icindeki `errorDetail` HTTP status'a maplenir.

### Review kontrolleri (A.4)

- ❌ Controller/service'te `try/catch` ile exception yakalanip elle `ResponseEntity.status(400).body(...)` donuluyor: golge handler zaten yapiyor; sadece dogru exception'i `throw` et.
- ❌ Genel `RuntimeException`/`IllegalArgumentException`/`Exception` firlatan is kurali: `GolgeBusinessRuleException`/`GolgeResourceNotFoundException`'a cevir — aksi halde 500 doner ve `errorDetail`/code istemciye gitmez.
- ❌ Mesaj string'i hardcode + her yerde tekrar: hata kodu sabitine (`ClientErrorCodes`) tasi (i18n + tek kaynak).
- ❌ `@ControllerAdvice` ile elle global handler yaziliyor: golge `GolgeContextExceptionHandler` ile cakisir; gerekmiyorsa kaldir.
- ⚠️ `catch (Exception e) { return null; }` veya yutulan exception: 404/400 yerine sessiz hata; firlat.

---

## A.5 Context / Oturum — Yasak: /GolgeApplicationContextHolder\.getBean\s*\(/

| API | Tip | Scope / Dikkat |
|---|---|---|
| `GolgeApplicationContextHolder` | static yardimci (`ApplicationContextAware`) | **Static** `getBean(...)`, `getApplicationName()`, `publishEvent(...)`. DI mumkunse onu tercih et; bean'i static cekmek son care. |
| `GolgeSessionAttributeHolder` | request/session-scoped bean (interface) | `setAttribute/getAttribute/removeAttribute/getAttributes`. **SADECE golge-context 1.9.0+'da var** (bkz. A.7). |
| `GolgeSessionAware` | bean | `getSessionId()`, `getUsername()`. |
| `GolgeContextAutoConfiguration` | auto-config | `golgeSessionAware`, `golgeSessionAttributeHolder`, `requestContextListener`, exception preparer bean'lerini saglar. |

> `GolgeSessionAttributeHolder` request kapsamli oturum verisi tutar; uzun yasayan singleton'a inject edilip alan olarak saklanirsa thread/istek karismasi olur. Inject edip **her cagriside** `getAttribute` ile oku; degeri field'a cache'leme.

### Review kontrolleri (A.5)
- ❌ `GolgeApplicationContextHolder.getBean(...)` constructor injection'in mumkun oldugu yerde kullanilmis: DI'a cevir (test edilebilirlik).
- ❌ `GolgeSessionAttributeHolder`'dan okunan deger singleton bean field'inda saklanmis: istekler arasi sizinti riski.
- ⚠️ Kod `GolgeSessionAttributeHolder` kullaniyorsa, BOM'un getirdigi golge-context surumunu dogrula (A.7).

---

## A.6 Guvenlik Anotasyonlari ve Feign Auth Propagasyonu — Yasak: /@RequestHeader\s*\([^)]*[Aa]uthorization|"Authorization"/

### Endpoint/method guvenligi (golge-security)

`javap -v` ile: `@GolgeSecureEndpoint` -> `@Target({METHOD, TYPE}) @Retention(RUNTIME) @Documented`; `@GolgePublicEndpoint` ayni sekilde `@Target({METHOD, TYPE})` (public/permit). Yani her ikisi de hem metoda hem sinifa uygulanabilir. Bunlar golge security expression altyapisi (handler: `tr.com.test.golge.security.handler.GolgeSecurityMethodSecurityExpressionHandler`; root'lar: `GolgeSecurityExpressionRoot` ve `GolgeMethodSecurityExpressionRoot`) ile calisir. Pratikte yetkilendirme cogunlukla Spring'in `@PreAuthorize("hasAuthority('IY_...')")`'i ile yapilir (rol deseni `IY_*`):

```java
@PreAuthorize("hasAuthority('IY_KADASTRO_MUDURLUK_KULLANICISI')")
```

`GolgeSecurityContext`: `getPermitUrlSet()`, `getPermitRequestMatcherList()` — permit (public) URL kumesini saglar. `@GolgeConditionalOnSecurityEnabled/Disabled` ile guvenlik acik/kapaliya gore kosullu bean tanimi yapilir.

### Feign / RestTemplate auth header propagasyonu

Bir servisten digerine cagri yapilirken **kullanici token'i otomatik tasinmali**. golge bunu interceptor'larla saglar:

- **Feign:** `GolgeFeignClientInterceptor` (abstract, `feign.RequestInterceptor`). Somut: `GolgeSecurityFeignClientInterceptor` (golge-security-cloud) — `doApply` icinde `GolgeSecurityAuthorizationHeaderAware`'den alinan Authorization header'ini RequestTemplate'e ekler. Auto-config: `GolgeFeignClientAutoConfiguration`.
- **RestTemplate:** `GolgeSecurityAuthorizationRestClientInterceptor` (`ClientHttpRequestInterceptor`).
- **Belirli metodu interceptor'dan haric tutmak:** `@GolgeFeignClientMethodExcludeInterceptor` (`@Target({TYPE, METHOD})`).

### Review kontrolleri (A.6)
- ❌ Feign client metoduna **elle** `@RequestHeader("Authorization") String token` parametresi eklenmis ve cagrida elle gecmis: golge interceptor zaten propagate ediyor; gereksiz/sizinti riski.
- ❌ Server-to-server cagride token kayboluyor (401): interceptor bean'i (golge-security-cloud) bagimliligi/aktifligi eksik olabilir — `GolgeSecurityFeignClientInterceptor` devrede mi kontrol et.
- ❌ Controller metodu yetkilendirmesiz (`@PreAuthorize` yok, `@GolgePublicEndpoint` da yok): bilincli public degilse aciktir.
- ⚠️ Public olmasi gereken endpoint icin elle SecurityConfig yazmak yerine `GolgeSecurityContext` permit mekanizmasi/`@GolgePublicEndpoint` kullan.

---

## A.7 Auto-configuration & BOM Surum Pinning Tuzaklari — Yasak: /(@SpringBootApplication|@EnableAutoConfiguration)\s*\([^)]*exclude/

golge modulleri Spring Boot auto-configuration ile devreye girer (`golge-web-starter` -> `GolgeWebStarterAutoConfiguration`, tek `AutoConfiguration.imports` girisi). Surumler **`ekosistem-parent` BOM'undan transitif** gelir.

### TUZAK: BOM pinned surum < gereken surum (gercek vaka)

`GolgeSessionAttributeHolder` golge-context **1.9.0** ile geldi; 1.8.1 jar'inda **yoktur** (dogrulandi: 1.8.1 jar'inda yalniz `GolgeSessionAware`/`GolgeSessionAwareImpl` var). Eger `ekosistem-parent` BOM golge-context'i 1.8.1'e pinliyorsa, `GolgeSessionAttributeHolder` kullanan kod **derlenmez/NoClassDefFoundError** verir.

**Gercek cozum — `basvuru/basvuru-api/build.gradle` (dogrulanmis):**

```gradle
dependencyManagement {
    imports { mavenBom "tr.com.test.ekosistem:ekosistem-parent:${ekosistemVersion}" }   // 1.6.1 -> golge-context 1.8.1 pinler
    dependencies {
        // ekosistem BOM 1.8.1'i pinler; AktifProfilProvider'in kullandigi
        // GolgeSessionAttributeHolder 1.9.0 ile geldi.
        dependency "tr.com.test.golge:golge-context:${golgeContextVersion}"   // golgeContextVersion=1.9.0
    }
}
```

### Review kontrolleri (A.7)
- ❌ `GolgeSessionAttributeHolder` (veya baska yeni golge API) kullanilmis ama BOM eski surumu pinliyor ve **override yok**: derleme/runtime hatasi. Cozum: ilgili modulu `dependencyManagement.dependencies` ile override et (yukaridaki desen).
- ⚠️ Build'de golge modulune **explicit surum** yazilmis (BOM'u baypas): tek modulu yukseltmek diger golge modulleriyle surum uyumsuzlugu yaratabilir (entity/jpa/web-starter ayni minor'da olmali — hepsi 1.9.0). Override'i sadece gercekten gereken modulle sinirla ve gerekce yorumu ekle.
- ⚠️ Auto-config'i elle `@Import` veya `exclude` ile devre disi birakan kod: golge'nin sagladigi handler/interceptor/bean'leri kapatabilir; gerekce sorgula.
- ✅ Beklenen desen: golge plugin surumleri (`golgeSpringBootPluginVersion=1.7.2` vb.) gradle.properties'te; golge **kutuphane** surumleri BOM'dan (override haric).

---

## A.8 ILKE: Framework Sagliyorken Elle Boilerplate Yazma — Yasak: /@(Rest)?ControllerAdvice\b|new\s+PageImpl\s*</

golge'nin generic zinciri **olmadan** elle yazilan her CRUD/sayfalama/exception-mapping/audit/auth kodu review'da geri cevrilmelidir. Hizli tarama icin:

| Anti-pattern (elle yazilmis) | golge karsiligi |
|---|---|
| Repository'de `Optional<X> findById(...)`, `X save(X)` elle redeclare | `GolgeGenericJpaRepository`/`...SearchRepository` zaten saglar |
| Service'te save/update/delete + dirty-check + version artirma | `GolgeGenericOperationService(Impl)` |
| Sayfalama: `PageRequest` + `count` + `PageImpl` elle | `GolgeGenericSearchService.queryPage(qdto)` + `GolgeQueryGenerator` |
| Controller'da `@PostMapping/@PutMapping/@DeleteMapping` elle | `*RestStructure` (golge mapping'leri + `@JsonView`/`@Validated` view'lari) |
| entity<->dto donusumu elle | `GolgeGenericMapstructMapper` |
| `@ControllerAdvice` global handler | `GolgeContextExceptionHandler` |
| audit alanlarini `@PrePersist`/`@PreUpdate` ile elle doldurma | golge audit entity + auditor-aware |
| Feign'e elle Authorization header | `GolgeSecurityFeignClientInterceptor` |

> Istisna: golge generic'i karsilamadigi **gercek domain mantigi** (orn. `addGercekKisi` composite kayit, Elasticsearch sorgusu, QueryDSL ile ozel filtre) elbette elle yazilir — ama bu kod bile golge `save()`/exception/transaction altyapisini cagirmali. Ornekteki `GercekKisiSearchServiceImpl` QueryDSL'i elle kullanir cunku ihtiyac genericin disindadir; yine de `TarafResourceNotFoundException` firlatir.

---

## 5. Hizli Referans

### Backend — golge base secimi
- UUID PK + audit -> `GolgeGenericAuditEntity<UUID>` / DTO `GolgeGenericDto<UUID>`.
- Long PK + audit -> `GolgeAuditEntity` / DTO `GolgeDto`.
- Yazma repo -> `GolgeGenericJpaRepository<E,ID>`; okuma -> `GolgeGenericJpaSearchRepository<E,ID>`.
- Service -> `GolgeGenericOperationService<ID,GDTO>` / `GolgeGenericSearchService<ID,GDTO,QDTO>`.
- Mapper -> `@Mapper interface X extends GolgeGenericMapstructMapper<ID,DTO,E>`.
- Hata -> `GolgeBusinessRuleException` (is kurali) / `GolgeResourceNotFoundException` (404); asla cIplak `RuntimeException`.
- Yetki -> `@PreAuthorize("hasAuthority('IY_...')")`; public -> `@GolgePublicEndpoint`.

### Backend — "kirmizi bayraklar"
Elle CRUD controller/service · elle `findById/save` redeclare · `@ControllerAdvice` global handler · elle audit doldurma · Feign'e elle Authorization · `GolgeApplicationContextHolder.getBean` (DI mumkunken) · BOM eski golge-context + `GolgeSessionAttributeHolder` (override yok).


---

## 6. Ilgili Dosyalar

**golge backend jar'lari** (`/home/kerim/.gradle/caches/modules-2/files-2.1/tr.com.test.golge/<modul>/<surum>/<hash>/<jar>`):
- golge-web-starter 1.9.0, golge-data-orm-entity/-jpa/-dto/-mapper/-commons 1.9.0, golge-exception 1.9.0, golge-context 1.9.0 (ve 1.8.1 — `GolgeSessionAttributeHolder` farki), golge-security 1.3.0, golge-security-cloud 1.1.0, golge-feign-client 1.1.0.

**Gercek backend kullanimi:**
- `/home/kerim/repositories/taraf/taraf-api/server/.../entity/base/TarafAuditEntity.java`, `.../entity/base/TarafEntity.java`, `.../entity/GercekKisi.java`
- `.../service/GercekKisiOperationalService.java`, `.../service/impl/GercekKisiOperationalServiceImpl.java`, `.../service/impl/base/TarafBaseOperationalServiceImpl.java`, `.../service/GercekKisiSearchService.java`, `.../service/impl/GercekKisiSearchServiceImpl.java`
- `.../repository/operational/GercekKisiOperationalRepository.java`, `.../repository/search/GercekKisiSearchRepository.java`, `.../mapper/GercekKisiMapper.java`, `.../controller/impl/KorumaKarariRestController.java`
- BOM override tuzagi: `/home/kerim/repositories/basvuru/basvuru-api/build.gradle` + `gradle.properties` (`golgeContextVersion=1.9.0`, `ekosistemVersion=1.6.1`)


**Frontend tarafi** (golge-ui + Module Federation) ayri dokumanda: [04-golge-framework-frontend.md](04-golge-framework-frontend.md).

**Capraz-link:** entity/DTO/MapStruct/Envers detaylari icin [03-hibernate-jpa-taslak.md](03-hibernate-jpa-taslak.md); Spring katmanlari icin [02-spring-boot-code-review.md](02-spring-boot-code-review.md); backend PR checklist'i [06-backend-checklist.md](06-backend-checklist.md).
