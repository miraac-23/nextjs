# Hibernate / JPA Taslak Dokumani

> TKGM TAKBIS — golge (`tr.com.test.golge.*`) veri katmani standartlari
> Hedef kitle: backend gelistirici, kod review yapan, kod revizyonu yapan muhendis
> Surum dogrulamasi (bu dokuman yazilirken, taraf'in cozdugu gercek bagimlilik zinciri): `golge-data-orm-entity` **1.8.1**, `golge-data-orm-jpa` **1.8.1**, `golge-data-orm-mapper` **1.8.1**, `golge-data-orm-liquibase` **1.3.1**, Java **21**, Spring Boot 3.x (Jakarta EE), Hibernate + Envers, QueryDSL, PostgreSQL/PostGIS.
> Bu surumler `taraf-api/build.gradle` -> `takbis-provider-parent:1.3.8` -> `ekosistem-parent:1.6.1` -> `golge-parent:1.8.1` BOM zinciri ile pinlenir (`golge-parent:1.8.1` POM'unda `golge-data-orm-entity/jpa/mapper/web-starter`=`1.8.1`, `golge-data-orm-liquibase`=`1.3.1`). taraf build dosyalarinda surum override'i yoktur. Cache'de `1.9.0`/`1.4.0` jar'lari bulunsa da taraf bunlari cozmez. API imzalari 1.8.1'de aynidir (`int version`, `boolean active`, `LocalDateTime` audit alanlari javap ile dogrulandi); teknik iddialar gecerli kalir.
> Referans servis: `taraf` (`taraf-api/server`). Sema yonetimi: merkezi `takbis-metadata` reposu (Liquibase).

---

## 1. Amac & Kapsam

Bu dokuman TAKBIS mikroservislerinde **Hibernate / JPA veri katmaninin** nasil yazilacagina dair STANDART ve taslagi tanimlar. Kod review ve kod revizyonu sirasinda referans olarak kullanilir. Her standart icin:

- **(a) NEDEN onemli** — hangi hatayi/maliyeti onler,
- **(b) review'da NASIL TESPIT edilir** — neye bakilir, hangi grep/sinyal,
- **(c) NASIL DUZELTILIR** — mumkun oldugunda before/after kod.

Kapsam: entity mapping, iliskiler & fetch (N+1), sorgulama (Spring Data turetilmis metot + QueryDSL golge generator + native + DTO projeksiyon), transaction & oturum yonetimi, Envers audit, Liquibase migration, MapStruct mapper, optimistic/pessimistic locking, batch islem, PostGIS/geometri ve `equals/hashCode` tuzaklari.

Kapsam disi: REST controller / Feign kontrati (bkz. ayri controller dokumani), guvenlik anotasyonlari, Elasticsearch arama datasource detayi (sadece JPA tarafi anlatilir).

---

## 2. Arka plan / Mimari ozet

### 2.1 golge entity hiyerarsisi (jar: golge-data-orm-entity 1.8.1, javap ile dogrulandi) — Yasak: /@Id\b/

```
GolgeBaseEntity<ID>                       // id + isNew sozlesmesi (Persistable)
  └─ GolgeGenericEntity<ID>               // int version; Boolean active;   (UUID/herhangi ID icin)
       ├─ GolgeGenericAuditEntity<ID>     // + createdDate/updatedDate (LocalDateTime), createdBy/updatedBy
       └─ ...
  └─ GolgeEntity extends GolgeGenericEntity<Long>   // ID = Long sabit
       └─ GolgeAuditEntity                // Long-ID + audit alanlari
```

`javap` ciktisindan dogrulanmis kritik gercekler:

- `GolgeGenericEntity<ID>` icinde **`int version`** ve **`Boolean active`** alanlari vardir (mantiksal silme = `active=false`).
- `GolgeGenericAuditEntity<ID>` audit alanlari **`java.time.LocalDateTime`** tipindedir (`createdDate`, `updatedDate`, `createdBy`, `updatedBy`). `GolgeAuditEntityStructure<LocalDateTime>` implement eder.
- `GolgeEntity` sabit olarak `GolgeGenericEntity<Long>` genisletir — ID tipi `Long`. UUID id istiyorsan `GolgeGenericEntity`/`GolgeGenericAuditEntity` zincirini kullan.
- Sabit kolon adlari `GolgeEntityConstraint` icindedir: `ID_FIELD_COLUMN`, `VERSION_FIELD_COLUMN`, `CREATED_DATE_FIELD_COLUMN`, `UPDATED_DATE_FIELD_COLUMN`, `CREATED_BY_FIELD_COLUMN`, `UPDATED_BY_FIELD_COLUMN`, `ACTIVE_FIELD_COLUMN`, `ACTIVE_FIELD`, `SEQUENCE_GENERATOR_NAME`.

### 2.2 Uygulama base entity (taraf ornegi — dogrulanmis) — Yasak: /(private|protected)\s+[A-Za-z<>,\s]*\s(createdBy|createdDate|updatedBy|updatedDate|version)\s*;/

`taraf-api/server/.../entity/base/TarafAuditEntity.java`:

```java
@NoArgsConstructor
@SuperBuilder(toBuilder = true)
@Data
@EqualsAndHashCode(callSuper = true)
@Audited
@AuditOverride(forClass = GolgeGenericAuditEntity.class)
@MappedSuperclass
@AttributeOverrides({
  @AttributeOverride(name = "active",      column = @Column(name = "aktif",             nullable = false)),
  @AttributeOverride(name = "version",     column = @Column(name = "versiyon",          nullable = false)),
  @AttributeOverride(name = "createdDate", column = @Column(name = "olusturma_tarihi",  updatable = false, nullable = false)),
  @AttributeOverride(name = "updatedDate", column = @Column(name = "guncelleme_tarihi", nullable = false)),
  @AttributeOverride(name = "createdBy",   column = @Column(name = "olusturan",         updatable = false, nullable = false)),
  @AttributeOverride(name = "updatedBy",   column = @Column(name = "guncelleyen",       nullable = false)),
})
public abstract class TarafAuditEntity extends GolgeGenericAuditEntity<UUID> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = ID_FIELD_COLUMN, updatable = false, nullable = false)
    private UUID id;

    @Override
    public boolean isNew() { return Objects.isNull(getId()); }
}
```

Kalip: **her servis kendi `<Servis>AuditEntity` base'ini** golge audit entity'sinden tureterek olusturur; golge'nin Ingilizce alan adlarini `@AttributeOverrides` ile Turkce kolon adlarina (`aktif`, `versiyon`, `olusturma_tarihi`...) cevirir. Domain entity'leri (`Taraf`, `GercekKisi`...) bu base'i extend eder.

### 2.3 Repository / service / mapper katmanlari (golge sozlesmesi) — Yasak: /extends\s+(JpaRepository|CrudRepository|PagingAndSortingRepository)\s*</

| Katman | golge tipi | taraf ornegi |
|---|---|---|
| Repository | `GolgeGenericJpaRepository<E, ID>` | `GercekKisiOperationalRepository extends GolgeGenericJpaRepository<GercekKisi, UUID>` |
| Operasyon servisi | `GolgeGenericOperationService<ID, DTO>` | `GercekKisiOperationalService` |
| Arama servisi | `GolgeGenericSearchService` / elle QueryDSL | `GercekKisiSearchService` |
| Mapper | `GolgeGenericMapstructMapper<ID, DTO, E>` | `GercekKisiMapper` |
| Dinamik sorgu | `GolgeQueryGeneratorImpl<QD, EPB>` | `GercekKisiQueryGeneratorImpl` |

### 2.4 Sema yonetimi (Liquibase) — merkezi repo — Yasak: /(CREATE|ALTER|DROP)\s+(TABLE|INDEX|SEQUENCE)\b/

KRITIK: Liquibase changelog'lari **servis reposunda degil**, ayri **`takbis-metadata`** reposunda tutulur (orn. `takbis-metadata/taraf/`). golge `GolgeLiquibaseProperties` icinde **`git`** alani vardir (`javap` dogruladi) — changelog'lar git'ten cekilerek uygulanir. `taraf-api/server/src/main/resources` altinda Liquibase changelog YOKTUR; sadece `script/dev-seed-kisi.sql` (gelistirme seed) bulunur. Bu, "sema = tek merkezi kaynak" prensibini uygular.

---

## 3. Standartlar & Konvansiyonlar — Yasak: /@Table\s*\(\s*name\s*=\s*"/

### 3.1 Entity mapping konvansiyonu — Yasak: /@Column\s*\(\s*name\s*=\s*"/

#### 3.1.1 golge base entity'yi extend et (kendi base'in uzerinden)

**NEDEN:** id, `version` (optimistic lock), `active` (soft delete), audit alanlari (`createdBy/Date`, `updatedBy/Date`) ve Envers entegrasyonu golge tarafindan tek noktadan saglanir. Tekrar tanimlamak tutarsizlik ve audit kaybi yaratir.

**✅ Dogru** (`GercekKisi`, dogrulanmis):

```java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity
@Table(name = TABLE_NAME)                  // TABLE_NAME = "kisi", *Constraint'ten
@DynamicUpdate
@EqualsAndHashCode(callSuper = true)
@Inheritance(strategy = InheritanceType.JOINED)
public class GercekKisi extends TarafAuditEntity { ... }
```

**❌ Yanlis:** `@Entity public class GercekKisi { @Id Long id; ... }` — golge base'i extend etmez, audit/version/active alanlari yok, `@Audited` yok.

**Review'da tespit:** Bir `@Entity` sinifi `<Servis>AuditEntity` / golge base'ini extend etmiyorsa flag'le.

#### 3.1.2 Lombok kombinasyonu: `@SuperBuilder` + `@EqualsAndHashCode(callSuper = true)`

**NEDEN:**
- `@SuperBuilder(toBuilder = true)` — kalitim zincirindeki tum alanlar builder'a dahil olur; `toBuilder()` mevcut nesneden turetip degistirmeye imkan verir. Sade `@Builder` super alanlari atlar -> id/audit set edilmez.
- `@EqualsAndHashCode(callSuper = true)` — base'teki `id` esitlikten haric tutulmaz; `callSuper=false` (Lombok default) base alanlarini gozardi eder ve **yanlis esitlik** uretir.

**Review'da tespit:** `@SuperBuilder` yokken `@Builder` kullanimi; `@EqualsAndHashCode` uzerinde `callSuper` belirtilmemesi (uyari) veya `callSuper=false`.

**Duzeltme (before/after):**

```java
// ❌ before
@Builder
@EqualsAndHashCode
public class GercekKisi extends TarafAuditEntity { ... }

// ✅ after
@SuperBuilder(toBuilder = true)
@EqualsAndHashCode(callSuper = true)
public class GercekKisi extends TarafAuditEntity { ... }
```

#### 3.1.3 `@DynamicUpdate`

**NEDEN:** UPDATE deyiminde yalnizca **degisen kolonlar** yer alir. Cok kolonlu entity'lerde gereksiz UPDATE'leri, gereksiz index yazimini ve `@Version` yarismasini azaltir; ozellikle `@OptimisticLock` ve kismi guncellemelerde net fayda saglar.

**Review'da tespit:** Genis entity'lerde `@DynamicUpdate` yoksa oner. (taraf'ta TUM entity'lerde mevcut — standart budur.)

#### 3.1.4 `@Inheritance(strategy = InheritanceType.JOINED)`

**NEDEN:** taraf domaininde `Taraf` ust tablo, `GercekKisi`/`TuzelKisi` alt tablolar gibi normalize bir model kullanilir. JOINED stratejisi her sinifa ayri tablo + FK ile baglar; `SINGLE_TABLE`'in genis null kolon israfini onler, veri butunlugunu korur.

**Dikkat:** JOINED, sorguda JOIN maliyeti getirir. Cok derin hiyerarside performansi olcun. taraf'ta `GercekKisi`/`Taraf` ayni `JOINED` ile isaretlenmis olsa da gercek FK iliskisi `taraf_ref` kolonu uzerinden kuruluyor (asagi bkz. 3.1.6) — kalitim ile yabanci anahtar iliskisini karistirma.

#### 3.1.5 `*Constraint` sinifi: kolon adi / boyut / index sabitleri

**NEDEN:** Kolon adlari ve boyutlar tek bir `final` sabit sinifinda toplanir; entity, mapper, QueryDSL ve gerektiginde native sorgu **ayni sabiti** kullanir. "Magic string" kolon adlarini ve entity ile DB arasinda boyut tutarsizligini onler.

**✅ Dogru** (`GercekKisiConstraint`, dogrulanmis):

```java
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class GercekKisiConstraint {
    public static final String TABLE_NAME = "kisi";
    public static final String ADI_COLUMN = "adi";
    public static final String SOYADI_COLUMN = "soyadi";
    ...
    public static final int ADI_MAX_SIZE = 60;
    public static final int SOYADI_MAX_SIZE = 60;
    public static final int VERGI_NO_MAX_SIZE = 10;
}
```

Entity'de:

```java
@Size(max = ADI_MAX_SIZE, message = "{adi.maxSize}")
@NotNull(message = "{adi.is.empty}")
@Column(name = GercekKisiConstraint.ADI_COLUMN)
private String adi;
```

**❌ Yanlis:** `@Column(name = "adi")` ve `@Size(max = 60)` — dogrudan literal; DDL ile senkron kalmasi garanti degil.

**Review'da tespit:** Entity icinde `@Column(name = "...")` literal string; `@Size(max = <sayi>)` literal sayi. `*Constraint` sinifi yoksa veya kullanilmiyorsa flag'le.

> Not (gercek kod kokusu — `GercekKisiConstraint`): dosyada kullanilmayan `import org.bouncycastle...NHSecretKeyProcessor` var. Review'da gereksiz/yanlis import temizlenmeli.

#### 3.1.6 i18n validation mesajlari

**NEDEN:** Hata mesajlari koda gomulmez; `{anahtar}` ile mesaj kaynagindan (`messages/validation-messages*.properties`) cozulur. Coklu dil (tr/en) ve tutarli mesaj yonetimi saglar.

**✅ Dogru:** `@NotNull(message = "{adi.is.empty}")`, `@Size(max = ADI_MAX_SIZE, message = "{adi.maxSize}")`.
Mesaj dosyalari: `taraf-api/server/src/main/resources/messages/validation-messages_tr.properties` (+ `_en`, default). Hata mesajlari icin ayri `error-messages*.properties`.

**❌ Yanlis:** `@NotNull(message = "Adi bos olamaz")` — sabit Turkce metin, i18n disi.

**Review'da tespit:** `message = "..."` icinde `{...}` yerine duz metin.

#### 3.1.7 ID uretimi ve tip tutarliligi (gercek TODO'lar)

taraf kodunda zaten isaretlenmis iki konu standart olarak benimsenmelidir:

- **ID stratejisi:** `@GeneratedValue(strategy = GenerationType.IDENTITY)` UUID ile kullaniliyor; DDL'de `id uuid default gen_random_uuid()` ile DB tarafi uretiyor. UUID icin `GenerationType.UUID` veya uygulama tarafi uretimi degerlendir (batch insert ve "her insertte ekstra select" maliyeti acisindan). taraf base entity'de bu zaten `TODO [ONERI-PERFORMANS]` olarak not edilmis.
- **Tarih tipi tutarliligi:** `GercekKisi.dogumTarihi/olumTarihi` legacy `java.util.Date`, `Taraf.gecerlilikBaslangic` ise `java.time.Instant`. Standart: yeni kodda **`java.time`** (`LocalDate`/`LocalDateTime`/`Instant`). Audit alanlari golge'de `LocalDateTime`'dir. taraf'ta `TODO [ONERI-TUTARLILIK]` ile not edilmis.
- **Isimlendirme tutarliligi:** Ayni kavram (Taraf'a referans) `GercekKisi`'de `tarafId`, `TuzelKisi`'de `tarafRef` adlandirilmis. Tek isim (`tarafRef`) standardi benimsenmeli (gercek TODO).

**Review'da tespit:** Yeni entity'de `java.util.Date`; ayni kavrama farkli alan adi.

---

### 3.2 Iliskiler & fetch (N+1) — Yasak: /@(ManyToOne|OneToOne)(?![^\n]*LAZY)/

#### 3.2.1 Iki yaklasim: skaler FK kolonu vs. JPA iliski anotasyonu

taraf domaini iliskiyi cogunlukla **skaler UUID kolon** ile tutar (JPA iliski nesnesi yerine):

```java
// GercekKisi
@Column(name = GercekKisiConstraint.TARAF_REF_COLUMN)
private UUID tarafId;
```

DDL tarafinda gercek FK kisiti vardir (`takbis-metadata/taraf/.../taraf_..._foreign_key_ddl.sql`):

```sql
alter table taraf.kisi add constraint fk_kisi_taraf
  foreign key(taraf_ref) references taraf.taraf(id)
  on update restrict on delete restrict;
```

**NEDEN bu kalip:** Mikroservis sinirlarinda ve QueryDSL/DTO projeksiyon agirlikli kodda skaler ref, lazy proxy ve yanlislikla yuklenen graf riskini ortadan kaldirir; join'i sorguda **acikca** kurarsin (bkz. 3.3.3). Maliyeti: JPA cascade/navigasyon kolayligindan vazgecilir.

`@ManyToOne`/`@OneToMany` iliskileri ise `basvuru` gibi servislerde yogun kullanilir (dogrulanmis ornekler).

#### 3.2.2 LAZY varsayilan — `@ManyToOne`/`@OneToOne`'da acikca LAZY yaz

**NEDEN:** JPA varsayilani `@ManyToOne` ve `@OneToOne` icin **EAGER**'dir. EAGER, her sorguda gereksiz JOIN/SELECT ureterek N+1 ve buyuk graf yuklemesine yol acar.

**✅ Dogru** (`basvuru` — `IslemTanim`, dogrulanmis):

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "kategori_id")
private Kategori kategori;

@OneToMany(mappedBy = "islemTanim", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
@Builder.Default
private Set<IslemBelge> belgeler = new LinkedHashSet<>();   // koleksiyonlar Set olarak tutulur
```

**❌ Yanlis:** `@ManyToOne` (fetch belirtmeden) -> EAGER.

**Review'da tespit:** `@ManyToOne`/`@OneToOne` satirinda `fetch = FetchType.LAZY` yoksa flag'le.
grep: `grep -rn "@ManyToOne\|@OneToOne" <servis>/.../entity | grep -v LAZY`

#### 3.2.3 N+1 tespiti ve cozumu — `JOIN FETCH` / `@EntityGraph`

**NEDEN:** Lazy koleksiyon listede dolasilirsa her eleman icin ek SELECT (N+1) cikar. Cozum: tek sorguda iliskiyi getirmek.

**Cozum A — `@EntityGraph`** (`islem-yonetimi` — dogrulanmis):

```java
@EntityGraph(attributePaths = {"secenekList"})
List<IslemOzellikTanim> findAllByActiveIsTrue();
```

**Cozum B — `JOIN FETCH`** (`basvuru` — dogrulanmis):

```java
@Query("SELECT t FROM IslemTanim t " +
       "LEFT JOIN FETCH t.kural " +
       "LEFT JOIN FETCH t.kategori k " +
       "LEFT JOIN FETCH k.ustKategori " +
       "WHERE t.aktif = true ORDER BY t.domain, t.sira")
List<IslemTanim> findAllWithDetay();
```

**Review'da tespit:** Servis metodu lazy koleksiyon/iliski uzerinde donguyle dolasiyor ve repository tarafinda `@EntityGraph`/`JOIN FETCH` yok; loglarda ayni SELECT'in tekrari.

**Uyari:** Tek sorguda **birden fazla koleksiyonu** `JOIN FETCH` etmek kartezyen carpima (`MultipleBagFetchException`) yol acar. Bu durumda `@EntityGraph` ile birden cok koleksiyonu cekme yerine ayri sorgu / `Set` kullan veya `@BatchSize` degerlendir. `JOIN FETCH` + `Pageable` birlikte kullanildiginda Hibernate sayfalamayi bellekte yapar (uyari verir) — sayfalama gereken yerde DTO projeksiyon tercih et.

#### 3.2.4 Cascade — dikkatli kullan

**NEDEN:** `CascadeType.ALL` + `orphanRemoval = true` parent silindiginde/koleksiyondan cikarildiginda cocuklari da siler. Yanlis kapsamda DELETE patlamasi veya istenmeyen veri kaybi olur. Yalnizca gercek "owning + lifecycle" iliskisinde kullan (`IslemTanim` -> alt belge/validasyon listeleri gibi).

**Review'da tespit:** `@ManyToOne` tarafinda `cascade = CascadeType.ALL` (genelde yanlis — many tarafi lifecycle sahibi degildir); paylasilan referansta `orphanRemoval = true`.

---

### 3.3 Sorgulama — Yasak: /(SELECT|select)\s+\*\s+(FROM|from)\s/

golge repository (`GolgeGenericJpaRepository<E, ID>`) `GolgeGenericJpaSearchRepository`'yi genisletir ve `javap` ile dogrulanan **QueryDSL `Predicate` imzalarini** sunar: `findAll(Predicate)`, `findAll(Predicate, Pageable)`, `findOne(Predicate)`, `count(Predicate)`, `exists(Predicate)`, ayrica `getReferenceById`, `getById`, `findById`, `findAllById`, `findBy(...FluentQuery...)`. Yazma tarafi (`GolgeGenericJpaRepository`): `save/saveAndFlush/saveAll/saveAllAndFlush`, `update/updateAndFlush/updateAll/updateAllAndFlush`, `deleteById/delete/deleteAll/deleteAllInBatch/deleteAllByIdInBatch`, `flush`.

#### 3.3.1 Spring Data turetilmis metot (derived query)

**NEDEN:** Basit, statik kriterler icin en az kod. Metot adindan sorgu uretilir.

**✅ Dogru:**

```java
public interface GercekKisiOperationalRepository extends GolgeGenericJpaRepository<GercekKisi, UUID> {
    Optional<GercekKisi> findByTcKimlikNoAndActiveTrue(Long tcKimlikNo);
    boolean existsByVergiNoAndActiveTrue(String vergiNo);
}
```

**Review'da tespit:** Asiri uzun, okunamaz metot adi (`findByAAndBAndCOrderByD...`) -> `@Query` veya QueryDSL'e tasimayi oner. `active` filtresi unutulmussa (soft delete) flag'le.

#### 3.3.2 QueryDSL — golge generator ile dinamik arama (TERCIH EDILEN kalip)

golge `GolgeQueryGeneratorImpl<QD extends GolgeQueryDto, EPB extends EntityPathBase>` (`javap` dogruladi) `preparePredicate(BooleanBuilder, QD, EPB)` soyut metodunu sunar; `generate(...)` icinde `BooleanBuilder` -> `Predicate` uretir ve golge filtre DTO'larini (string/boolean/datetime) otomatik isler.

**NEDEN:** Frontend'ten gelen dinamik kriter DTO'su ile tip-guvenli (Q-sinifi) predicate kurmak; null/bos kriterleri sessizce atlamak.

**✅ Dogru** (`GercekKisiQueryGeneratorImpl`, dogrulanmis):

```java
@Component(value = "gercekKisiQueryGenerator")
public class GercekKisiQueryGeneratorImpl
        extends GolgeQueryGeneratorImpl<GercekKisiSearchByTanitimNoQueryDto, QGercekKisi> {

    @Override
    protected void preparePredicate(BooleanBuilder builder,
                                    GercekKisiSearchByTanitimNoQueryDto dto,
                                    QGercekKisi gercekKisi) {
        if ("TCKN".equals(dto.getTanitimNoTipi()) || "YKN".equals(dto.getTanitimNoTipi())) {
            builder.and(gercekKisi.tcKimlikNo.eq(Long.valueOf(dto.getTanitimNo())));
        } else if ("VN".equals(dto.getTanitimNoTipi())) {
            builder.and(gercekKisi.vergiNo.eq(dto.getTanitimNo()));
        }
        builder.and(gercekKisi.active.isTrue());   // soft-delete filtresi her zaman
    }
}
```

Q-siniflari (`QGercekKisi`, `QKisiEngel`) golge gradle plugin (`golgeHibernate { querydsl { enabled = true } }`, `server/build.gradle` dogrulandi) tarafindan derleme aninda uretilir — elle yazilmaz, `build/generated` altinda olusur.

**Review'da tespit / kokular:**
- `preparePredicate`'te `active.isTrue()` filtresi eksik (pasif kayitlar donuyor).
- "magic string" tip kodlari (`"TCKN"`, `"VN"`) — gercek TODO'da isaretlenmis; enum'a tasinmali.
- `Long.valueOf(...)` `NumberFormatException` kontrolsuz — gecersiz girdi 500 doner.

#### 3.3.3 Elle QueryDSL + DTO projeksiyon (`Projections.constructor`)

**NEDEN:** Entity'yi tamamen yuklemeden, yalnizca gereken kolonlari DTO'ya cekmek — bellek ve N+1 acisindan en verimli okuma. Sayfalama gereken raporlarda tercih edilir.

**✅ Dogru** (`KisiEngelSearchServiceImpl`, dogrulanmis):

```java
@Service
@Transactional(transactionManager = "searchTransactionManager", readOnly = true)
public class KisiEngelSearchServiceImpl implements KisiEngelSearchService {
    @PersistenceContext private EntityManager entityManager;

    @Override
    public List<KisiEngelDto> getKisiEngel(UUID kisiRef) {
        QKisiEngel kisiEngel = QKisiEngel.kisiEngel;
        QGercekKisi gercekKisi = QGercekKisi.gercekKisi;
        JPAQueryFactory queryFactory = new JPAQueryFactory(entityManager);
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(gercekKisi.id.eq(kisiRef));
        builder.and(kisiEngel.active.eq(Boolean.TRUE));

        return queryFactory.select(Projections.constructor(KisiEngelDto.class,
                        kisiEngel.id, kisiEngel.engelTip, kisiEngel.aciklama, kisiEngel.durum))
                .from(kisiEngel)
                .join(gercekKisi).on(gercekKisi.id.eq(kisiEngel.kisiRef))  // skaler ref uzerinden JOIN
                .where(builder.getValue())
                .fetch();
    }
}
```

Dikkat: skaler `kisiRef` kolonu uzerinden `join(...).on(...)` ile iliski sorguda kurulur (JPA iliski nesnesi olmadan). Bu, taraf'in skaler-ref kalibiyla tutarli.

**Review'da tespit:** `Projections.constructor(...)` parametre sirasi DTO constructor'i ile birebir eslesmek zorundadir; sira/tip kaymasi sessiz yanlis veri uretir. DTO'da `@AllArgsConstructor` ve alan sirasi degisirse projeksiyon kirilir — birlikte gozden gecir.

#### 3.3.4 Native sorgu

golge `GolgeJpaNativeRepository` (dahili) `GolgeNativeQueryPredicate` ile native sorgu sunar (`get/find/findAll/findAll+Pageable`). Native sorgu yalnizca QueryDSL/JPQL ile ifade edilemeyen (DB-ozel fonksiyon, PostGIS operatoru, karmasik analitik) durumlarda kullanilir.

**Review'da tespit:** Saf CRUD/filtre icin native SQL kullanimi (gereksiz) — turetilmis metot veya QueryDSL'e tasin. Native string icinde elle string birlestirme (SQL injection riski) -> parametre bind kullan.

---

### 3.4 Transaction & oturum — Yasak: /\.set(CreatedBy|CreatedDate|UpdatedBy|UpdatedDate)\s*\(/

#### 3.4.1 Okuma servislerinde `readOnly = true` + dogru `transactionManager`

**NEDEN:** Coklu datasource var (ana + **search** datasource — golge `SearchJpaRepositoriesConfiguration`). Okuma servisleri `readOnly=true` ile dirty-checking ve gereksiz flush'i kapatir (performans), ve dogru `transactionManager`'a baglanmazsa yanlis baglanti/transaction'a duser.

**✅ Dogru** (dogrulanmis): `@Transactional(transactionManager = "searchTransactionManager", readOnly = true)` arama servis impl'lerinde sinif duzeyinde.

**Review'da tespit:** Arama servisinde `@Transactional` yok veya `readOnly` belirtilmemis; coklu datasource ortaminda `transactionManager` adi belirtilmemis.

#### 3.4.2 Yazma servislerinde transaction siniri

**NEDEN:** Yazma islemleri tek atomik transaction icinde olmali; `@Transactional` servis (impl) katmaninda olmali, repository veya controller'da degil. Birden cok repository cagrisi ayni transaction'da commit/rollback olmali.

**Review'da tespit:** Composite yazma (`addGercekKisi(GercekKisiCompositeDto)` gibi cok-entity'li akis) `@Transactional` ile sarilmamissa -> kismi yazma/tutarsizlik riski.

#### 3.4.3 `LazyInitializationException` ve `flush`/`clear`

**NEDEN:** Transaction kapandiktan sonra lazy alana erismek `LazyInitializationException` firlatir. Servis cikis noktasinda entity'yi degil **DTO** don (mapper ile) -> oturum kapaninca proxy erisimi olmaz.

**Review'da tespit:** Servis metodu **entity** donuyor (DTO yerine) ve cagiran tarafta lazy alan kullaniliyor. Cozum: transaction icinde mapper ile DTO'ya cevir.

`flush()`/`saveAndFlush()`/`updateAndFlush()`: golge repository'de mevcuttur; ID'ye/DB tetikleyicisine hemen ihtiyac varsa veya buyuk batch'te bellek baski yonetimi icin kullanilir (bkz. 3.8). Gereksiz `saveAndFlush` her cagrida senkron flush -> performans kaybi; sadece gerektiginde kullan.

#### 3.4.4 prePersist / auditor

golge `GolgeGenericEntityListener.prePersist(...)` ve `GolgeJpaAuditorAwareImpl` (jar'da mevcut) `createdBy/createdDate` vb. otomatik doldurur. **Elle** `setCreatedBy/setCreatedDate` cagirma — auditor mekanizmasini ezersin.

**Review'da tespit:** Servis kodunda elle `setCreatedDate(now())` / `setCreatedBy(...)`.

---

### 3.5 Audit (Envers) — Yasak: /"[A-Za-z_]+_aud"/

**NEDEN:** Tapu domaininde "kim ne zaman degistirdi" yasal zorunluluktur. Envers degisiklik tarihcesini ayri `_aud` tablolarinda tutar.

**Kurulum (taraf base — dogrulanmis):**

```java
@Audited
@AuditOverride(forClass = GolgeGenericAuditEntity.class)
@MappedSuperclass
public abstract class TarafAuditEntity extends GolgeGenericAuditEntity<UUID> { ... }
```

- `@Audited` -> entity tarihce tablosuna (`<tablo>_aud`) yazilir.
- `@AuditOverride(forClass = GolgeGenericAuditEntity.class)` -> base'teki audit alanlarinin denetim davranisini ayarlar.

**Denetim sorgusu:** golge `GolgeGenericJpaEnversAuditRepository<E, ID>` Spring Data `RevisionRepository<E, ID, Long>`'i genisletir (`javap` dogruladi). Tarihce sorgusu icin repository bu arayuzu de extend etmelidir:

```java
public interface GercekKisiAuditRepository
        extends GolgeGenericJpaRepository<GercekKisi, UUID>,
                GolgeGenericJpaEnversAuditRepository<GercekKisi, UUID> {
}
// kullanim: findRevisions(id), findLastChangeRevision(id) -> Revision<Long, GercekKisi>
```

**Review'da tespit:** Yasal/denetlenmesi gereken entity'de `@Audited` yok; `@Audited` olmayan iliskili alan denetlenen entity'de `@NotAudited` ile isaretlenmeden birakilmis (Envers mapping hatasi); elle audit kolonu yazma.

---

### 3.6 Migration (Liquibase) — Yasak: /(hbm2ddl|ddl-auto|ddl_auto)/

#### 3.6.1 Merkezi konum ve dosya/changeset hiyerarsisi

**NEDEN:** Sema tek otorite reposunda (`takbis-metadata`) versiyonlanir; servisler bunu git uzerinden (golge `GolgeLiquibaseProperties.git`) uygular. Boylece sema, kod tarafindan `ddl-auto` ile DEGIL, controlu changeset'lerle degisir.

**Gercek hiyerarsi (`takbis-metadata/taraf/`, dogrulanmis):**

```
changelog-latest.xml          -> include changelog-v_1_0_1.xml
changelog-v_1_0_1.xml         -> include changelog-v_1_0_0.xml ; includeAll ./v_1_0_1
changelog-v_1_0_0.xml         -> includeAll ./v_1_0_0
v_1_0_0/
  taraf_101_init.sql                       (schema + rol + grant)
  taraf_1775835418_table_ddl.sql           (create table)
  taraf_1775835419_table_comment.sql
  taraf_1775835420_column_comment.sql
  taraf_1775835421_table_constraint_ddl.sql (PK + CHECK)
  taraf_1775835422_table_index_ddl.sql      (index)
  taraf_1775835423_table_foreign_key_ddl.sql (FK)
v_1_0_1/
  taraf_1776062937.sql                     (ALTER: drop not null, type change)
```

Kalip: surum bazli `changelog-v_x_y_z.xml` zincirleme `include` eder; her surum klasoru `includeAll` ile alinir. **Calistirma sirasi onemli** -> DDL once tablo, sonra comment, sonra constraint, sonra index, en son FK. Yeni degisiklik **yeni dosyaya** (yeni surum klasoru) eklenir; eski changeset DUZENLENMEZ.

#### 3.6.2 `formatted sql` changeset konvansiyonu

**✅ Dogru** (dogrulanmis):

```sql
-- liquibase formatted sql

--changeset ttiryaki:1775835418-1
create table taraf.taraf ( id uuid default gen_random_uuid() not null, ... );

--changeset aacehan:1776062937-1
ALTER TABLE taraf.kisi ALTER COLUMN tc_kimlik_no DROP NOT NULL;
```

Kurallar:
- Dosya basinda `-- liquibase formatted sql`.
- Her changeset `--changeset <yazar>:<id>` ile baslar; **id benzersiz ve sirali** (epoch/numerik + `-n` alt sira). `<yazar>` = gercek kullanici (orn. `ttiryaki`, `aacehan`).
- Coklu deyim icermesi gereken PL/pgSQL bloklarinda `splitStatements:false` (orn. `taraf_101_init.sql` `do $$ ... $$`).
- Sema her zaman acikca nitelenir: `taraf.kisi` (search_path'e guvenme).

#### 3.6.3 Rollback ve "semaya elle mudahale karsiti"

**NEDEN:** Liquibase ileri-yonlu uygulanir; geri alinabilirlik icin riskli/yikici changeset'lere `rollback` blogu eklenmeli. **DB'ye elle DDL atmak** Liquibase `DATABASECHANGELOG` ile kod arasinda kalici tutarsizlik (drift) yaratir — yasaktir.

**Review'da tespit:**
- Var olan changeset'in **icerigi degistirilmis** (Liquibase checksum hatasi verir; uretimi bozar) -> her degisiklik YENI changeset.
- `DROP`/`ALTER ... DROP NOT NULL` gibi yikici degisiklikte `rollback` yok.
- PR'da DDL ama `takbis-metadata` changeset'i yok (elle DB mudahalesi sinyali).
- `spring.jpa.hibernate.ddl-auto` `validate`/`none` disinda (orn. `update`) — **yasak**; sema yalnizca Liquibase ile degisir.

---

### 3.7 Mapper (MapStruct) — Yasak: /@Mapper\b(?!\s*\([^)]*nullValuePropertyMappingStrategy)/

**NEDEN:** Entity <-> DTO donusumu elle yazilirsa hata/eksik alan riski yuksek. MapStruct derleme aninda tip-guvenli mapper uretir. golge `GolgeGenericMapstructMapper<ID, DTO, E>` standart metotlari sunar (`javap` dogruladi): `convertEntityToDto`, `convertDtoToEntity`, `mapToEntity(DTO, E)`, liste/set donusumleri, `convertDtoIdToEntityId`.

**✅ Dogru** (`GercekKisiMapper`, dogrulanmis):

```java
@Mapper(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface GercekKisiMapper
        extends GolgeGenericMapstructMapper<UUID, GercekKisiDto, GercekKisi> {
}
```

**Null stratejisi — `NullValuePropertyMappingStrategy.IGNORE`:**
- **NEDEN:** Kismi guncellemede (`mapToEntity(dto, entity)`) DTO'da `null` gelen alanlar **mevcut entity degerini SILMEZ**; sadece dolu alanlar guncellenir. `@DynamicUpdate` ile birlikte gercek "patch" davranisi verir. IGNORE olmadan null alanlar entity'yi null'a ezer (veri kaybi).

**Review'da tespit:**
- `@Mapper(...)` uzerinde `nullValuePropertyMappingStrategy = IGNORE` yokken `mapToEntity` ile guncelleme yapiliyor (null ezme riski).
- golge generic mapper yerine elle `new Dto(...)` donusumu (bakim maliyeti, eksik alan).
- Composite donusumlerde ayri `*CompositeMapper` (taraf'ta `GercekKisiCompositeMapper` var) — coklu entity'li DTO'lar bunlarla ele alinir.

---

### 3.8 Locking — Yasak: /PESSIMISTIC_(WRITE|READ|FORCE_INCREMENT)/

#### 3.8.1 Optimistic lock (`@Version`) — VARSAYILAN

**NEDEN:** golge base entity'de **`int version`** alani vardir (`GolgeGenericEntity`, taraf'ta `versiyon` kolonu). Hibernate her UPDATE'te `version`'i kontrol/artirir; eszamanli iki guncelleme yarisirsa ikincisi `OptimisticLockException` / `ObjectOptimisticLockingFailureException` alir. Veri kaybini (lost update) sessizce engeller.

**Tespit ve ele alinis (`islem-yonetimi` — dogrulanmis):**

```java
@ExceptionHandler({ ObjectOptimisticLockingFailureException.class, OptimisticLockException.class })
public ResponseEntity<GolgeErrorDetail> handleOptimisticLock(Exception ex) { ... }
```

`fen-kayit` icinde de iliskili kontrolde `ObjectOptimisticLockingFailureException` aciklayici mesajla firlatiliyor.

**Review'da tespit:** `version` kolonu/`AttributeOverride`'i kaldirilmis veya `nullable=true`; eszamanli guncellenen kaynakta optimistic lock istisnasinin **kullaniciya anlamli** ceviriliyor olmasi (yoksa ham 500). DTO'da `version` tasinmiyorsa client gonderdigi versiyon eski olur -> her zaman catisma; DTO version round-trip'ini kontrol et.

#### 3.8.2 Pessimistic lock — yalnizca gercek kritik bolgede

**NEDEN:** `@Lock(LockModeType.PESSIMISTIC_WRITE)` satiri DB satir kilidi alir; yuksek catisma/finansal tutarlilik gereken dar bolge icin uygundur. Genis kapsamda kullanmak deadlock ve throughput dususu yaratir. Varsayilan optimistic'tir; pessimistic istisnadir ve gerekce ister.

**Review'da tespit:** Genis okuma/yazma metodunda gereksiz `PESSIMISTIC_WRITE`; lock + uzun transaction kombinasyonu.

---

### 3.9 Batch insert / update — Yasak: /(for\s*\([^)]*\)|forEach\s*\()[^\n]*(\.save\s*\(|::save\b)/

**NEDEN:** Cok kayitli yazmada tek tek `save` N adet round-trip uretir. golge repository **toplu** metotlar sunar (`javap` dogruladi): `saveAll`, `saveAllAndFlush`, `updateAll`, `updateAllAndFlush`, `deleteAllInBatch`, `deleteAllByIdInBatch`.

**Standart:**
- Toplu yazmada `saveAll(list)` kullan; ara flush gerekiyorsa `saveAllAndFlush`.
- Toplu silmede `deleteAllInBatch` / `deleteAllByIdInBatch` (tek DELETE) tercih et; `deleteAll(list)` her kayit icin SELECT+DELETE uretebilir.
- Hibernate JDBC batch icin `hibernate.jdbc.batch_size` ve sirali insert/update (`order_inserts`, `order_updates`) ayarlari aktif olmali. **ID stratejisi `IDENTITY` ise JDBC batch insert DEVRE DISI kalir** (Hibernate her insert sonrasi generated key'i okumak zorunda) — bu yuzden buyuk batch insert'lerde `SEQUENCE`/`UUID` uretimi tercih edilir (taraf base'indeki `TODO [ONERI-PERFORMANS]` tam da bunu isaret eder).
- Cok buyuk dongulerde periyodik `flush()` + `clear()` (golge base impl `EntityManager` tasir) ile birinci seviye cache sismesini onle.

**Review'da tespit:** Dongude tek tek `repository.save(...)`; `IDENTITY` id ile buyuk batch insert beklentisi; `deleteAll(collection)` ile buyuk silme.

---

### 3.10 PostGIS / geometri — Yasak: /private\s+String\s+[a-zA-Z]*[Gg]eom/

**NEDEN:** Kadastro verisi geometriktir. golge/Hibernate Spatial + PostGIS ile `org.locationtech.jts.geom.Geometry` JPA alani DB `geometry` kolonuna eslenir.

**✅ Gercek ornek** (`fen-kayit` — `KadastralAlan`, dogrulanmis):

```java
import org.locationtech.jts.geom.Geometry;

@Column(name = GEOM_COLUMN)
private Geometry geom;

@Column(name = GEOM_SRID_COLUMN)
private Integer geomSrid;

@Column(name = GEOM_TIP_COLUMN)
private String geomTip;

public void setGeom(Geometry geom) {
    this.geom = geom;
    setGeomSrid(geom.getSRID());
    setGeomTip(geom.getGeometryType());
}
```

Standartlar:
- Geometri tipi **JTS `Geometry`** (vendor-bagimsiz). `geom` + tureyen `srid`/`tip` birlikte tutuluyor.
- SRID acik yonetilir; karistirilirsa mekansal sorgu/yansitma hatali olur.
- Mekansal sorgular (`ST_Intersects`, `ST_Within`...) genelde native/`@Query` ile (bkz. fen-kayit geometry operasyonlari).

**Review'da tespit:** Geometri alaninda SRID set edilmiyor; `Geometry` yerine `String`/WKT tutulup elle parse ediliyor; mekansal filtreyi Java tarafinda yapma (DB'de `ST_*` yerine).

---

### 3.11 Entity equals/hashCode tuzagi — Yasak: /@EqualsAndHashCode(?!\.)(?!\s*\([^)]*callSuper)/

**NEDEN:** golge base entity'lerde `equals/hashCode` Lombok ile uretilir. taraf base entity `@Data` + `@EqualsAndHashCode(callSuper = true)` kullanir; bu **`id` dahil tum alanlar** uzerinden esitlik uretir.

**Tuzaklar ve standart:**
- **Mutable id riski:** `@GeneratedValue` ile id INSERT'ten **sonra** atanir. Entity bir `HashSet`/`Map`'e id atanmadan (null) eklenip sonra kaydedilirse `hashCode` degisir -> koleksiyon bozulur. Standart: yeni (kaydedilmemis) entity'leri hash tabanli koleksiyonlarda tutmaktan kacin; gerekirse `id`-bazli stabil `hashCode` (sabit) kullan.
- **`@Data` koleksiyonlarda dikkat:** `@Data`/`callSuper=true` butun alanlari (lazy iliski dahil) `equals/hashCode/toString`'e katarsa lazy proxy yuklenmesi veya `LazyInitializationException`/`StackOverflow` (cift yonlu iliski) olusabilir. taraf entity'leri cogunlukla **skaler ref** tuttugu icin bu risk dusuk; ama `@ManyToOne`/`@OneToMany` ekleyen entity'lerde iliski alanlarini `equals/hashCode/toString` disina al (`@EqualsAndHashCode.Exclude`, `@ToString.Exclude`).
- `callSuper = true` mutlaka belirtilmeli (base `id`/audit alanlari icin) — Lombok aksi halde uyarir ve yanlis esitlik uretir.

**Review'da tespit:**
- `@EqualsAndHashCode` uzerinde `callSuper` yok / `false`.
- Cift yonlu `@OneToMany`/`@ManyToOne` entity'de iliski alani `@ToString.Exclude`/`@EqualsAndHashCode.Exclude` ile haric tutulmamis.
- Kaydedilmemis entity'lerin `Set`/`Map` anahtari olarak kullanilmasi.

---

## 4. Sik Hatalar & Anti-pattern'ler (before/after) — Yasak: /@Builder\b(?!\.)/

| # | Anti-pattern | Sonuc | Duzeltme |
|---|---|---|---|
| 1 | `@Builder` (super degil) kalitimli entity'de | id/audit builder'a girmez | `@SuperBuilder(toBuilder = true)` |
| 2 | `@EqualsAndHashCode` (callSuper'siz) | base id esitlikte yok | `@EqualsAndHashCode(callSuper = true)` |
| 3 | `@ManyToOne` fetch'siz | EAGER, N+1 | `@ManyToOne(fetch = FetchType.LAZY)` |
| 4 | Lazy koleksiyonu dongude gezme | N+1 | `@EntityGraph` / `JOIN FETCH` |
| 5 | Servis **entity** donuyor | `LazyInitializationException` | DTO don (MapStruct) |
| 6 | `@Column(name="adi")` literal | DDL ile drift | `*Constraint` sabiti |
| 7 | `message = "duz metin"` | i18n disi | `message = "{anahtar}"` |
| 8 | `mapToEntity` + IGNORE'suz mapper | null ezme/veri kaybi | `nullValuePropertyMappingStrategy = IGNORE` |
| 9 | Var olan changeset'i duzenleme | Liquibase checksum hatasi | Yeni changeset / yeni surum klasoru |
| 10 | Elle DB DDL / `ddl-auto=update` | sema drift | Liquibase changeset (`takbis-metadata`), `ddl-auto=validate` |
| 11 | `preparePredicate`'te `active` filtresi yok | pasif kayit doner | `builder.and(q.active.isTrue())` |
| 12 | Optimistic lock istisnasi ham 500 | kotu UX | `@ExceptionHandler(ObjectOptimisticLockingFailureException...)` |
| 13 | Dongude tek tek `save` (`IDENTITY` id) | batch insert kapali, N round-trip | `saveAll` + SEQUENCE/UUID id, periyodik `flush/clear` |
| 14 | Cift yonlu iliski `toString`/`equals`'te | StackOverflow / lazy yukleme | `@ToString.Exclude` / `@EqualsAndHashCode.Exclude` |
| 15 | `Projections.constructor` sira/tip kaymasi | sessiz yanlis veri | DTO ctor sirasi ile birebir esle |
| 16 | Geometride SRID set edilmiyor | hatali mekansal sorgu | `setGeom`'da SRID/tip turet |

---

## 5. Hizli Referans

**Entity iskeleti (UUID, audit, soft-delete):**

```java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@SuperBuilder(toBuilder = true)
@Entity @Table(name = TABLE_NAME)
@DynamicUpdate
@EqualsAndHashCode(callSuper = true)
@Inheritance(strategy = InheritanceType.JOINED)
public class Foo extends <Servis>AuditEntity {
    @Size(max = AD_MAX_SIZE, message = "{ad.maxSize}")
    @NotNull(message = "{ad.is.empty}")
    @Column(name = FooConstraint.AD_COLUMN)
    private String ad;
}
```

**Repository:** `interface FooRepository extends GolgeGenericJpaRepository<Foo, UUID> {}`
**Mapper:** `@Mapper(nullValuePropertyMappingStrategy = IGNORE) interface FooMapper extends GolgeGenericMapstructMapper<UUID, FooDto, Foo> {}`
**Dinamik sorgu:** `extends GolgeQueryGeneratorImpl<FooQueryDto, QFoo>` + `preparePredicate(...)` (her zaman `active.isTrue()`).
**Okuma servisi:** `@Transactional(transactionManager = "searchTransactionManager", readOnly = true)`.
**Audit sorgusu:** repository `... , GolgeGenericJpaEnversAuditRepository<Foo, UUID>` (RevisionRepository).
**Batch:** `saveAll` / `saveAllAndFlush` / `deleteAllInBatch`; buyuk insert'te id stratejisi `IDENTITY` olmasin.
**Migration:** `takbis-metadata/<servis>/v_x_y_z/<servis>_<id>.sql`, `-- liquibase formatted sql` + `--changeset <yazar>:<id>`, DDL sirasi: table -> comment -> constraint -> index -> FK. `ddl-auto=validate`.

**Yararli grep'ler (review):**

```bash
# EAGER iliski riski
grep -rn "@ManyToOne\|@OneToOne" <servis>/.../entity | grep -v LAZY
# literal kolon adi
grep -rn '@Column(name *= *"' <servis>/.../entity
# i18n disi mesaj
grep -rn 'message *= *"[^{]' <servis>/.../entity
# ddl-auto kontrol
grep -rn "ddl-auto" <servis>/.../resources
# active filtresi olmayan generator
grep -rL "active" <servis>/.../generator
```

---

## 6. Ilgili dosyalar & capraz-link

**Incelenen gercek kaynaklar (iddialar bunlara dayanir):**

- Entity & base: `taraf/taraf-api/server/src/main/java/tr/gov/tkgm/takbis/taraf/server/entity/GercekKisi.java`, `.../entity/Taraf.java`, `.../entity/base/TarafAuditEntity.java`, `.../entity/constraint/GercekKisiConstraint.java`
- Repository: `.../repository/operational/GercekKisiOperationalRepository.java`
- Mapper: `.../mapper/GercekKisiMapper.java`
- Servis: `.../service/GercekKisiSearchService.java`, `.../service/GercekKisiOperationalService.java`, `.../service/impl/KisiEngelSearchServiceImpl.java`, `.../service/impl/TarafOperationalServiceImpl.java`
- QueryDSL: `.../generator/GercekKisiQueryGeneratorImpl.java`; `server/build.gradle` (`golgeHibernate { querydsl { enabled = true } }`, `mapstruct { enabled = true }`)
- Liquibase (merkezi): `takbis-metadata/taraf/changelog-latest.xml`, `.../changelog-v_1_0_0.xml`, `.../changelog-v_1_0_1.xml`, `.../v_1_0_0/taraf_101_init.sql`, `.../taraf_1775835418_table_ddl.sql`, `.../taraf_1775835421_table_constraint_ddl.sql`, `.../taraf_1775835422_table_index_ddl.sql`, `.../taraf_1775835423_table_foreign_key_ddl.sql`, `.../v_1_0_1/taraf_1776062937.sql`
- Iliski/N+1 ornekleri: `basvuru/.../admin/entity/IslemTanim.java`, `basvuru/.../admin/repository/IslemTanimRepository.java`, `islem-yonetimi/.../repository/IslemOzellikTanimRepository.java`
- Locking: `islem-yonetimi/.../controller/IslemBpmnOperationalRestController.java`, `fen-kayit/.../service/impl/IslemFenKayitServiceImpl.java`
- PostGIS: `fen-kayit/.../entity/KadastralAlan.java`
- golge jar (taraf'in cozdugu surumler, javap/unzip ile dogrulandi): `golge-data-orm-entity-1.8.1`, `golge-data-orm-jpa-1.8.1`, `golge-data-orm-mapper-1.8.1`, `golge-data-orm-liquibase-1.3.1` (BOM zinciri: `takbis-provider-parent:1.3.8` -> `ekosistem-parent:1.6.1` -> `golge-parent:1.8.1`)

**Dogrulanan kritik sinif/imza:**
`GolgeGenericEntity` (`int version`, `Boolean active`), `GolgeGenericAuditEntity` (audit alanlari `LocalDateTime`), `GolgeEntityConstraint` (kolon adi sabitleri), `GolgeGenericJpaRepository` / `GolgeGenericJpaSearchRepository` (QueryDSL `Predicate` + batch metotlari), `GolgeQueryGeneratorImpl.preparePredicate`, `GolgeGenericMapstructMapper`, `GolgeGenericJpaEnversAuditRepository extends RevisionRepository`, `GolgeLiquibaseProperties.git`.

**Capraz-link (diger review dokumanlari):**
- Controller / Feign kontrati dokumani — `*RestClient` implements eden controller, `@PreAuthorize`, DTO sozlesmesi.
- DTO & mapper dokumani (varsa) — Composite DTO ve `*CompositeMapper`.
- Guvenlik dokumani — `@GolgeSecureEndpoint`, IY_* rol desenleri.
