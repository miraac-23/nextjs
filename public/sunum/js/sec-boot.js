/* ================= BÖLÜM 4 — SPRING BOOT (03-spring-boot tüm konular) ================= */
PRESENTATION.sections.push({
  cat: "boot", icon: "🚀", kicker: "Bölüm 4 · Spring Boot",
  title: "Spring Boot: Üretime Hazır",
  desc: "",
  topics: ["Temeller & Web", "Veri & Güvenlik", "Operasyon & Test", "Mikroservis & Cloud", "Mesajlaşma & Entegrasyon", "Dağıtım & Araçlar"],
  slides: [
    /* 00 */
    {
      nav: "00 · Spring Boot Nedir", eyebrow: "Spring Boot · 00",
      title: "Spring Boot Nedir ve İlk Uygulama",
      sub: "\"Yapılandırma yerine makul varsayımlar.\" Auto-configuration + starter'lar + gömülü sunucu → `java -jar` ile çalışır.",
      blocks: [
        { type: "lead", text: "2000'lerde klasik Spring güçlüydü ama **kurulumu ağırdı**: sayfalarca XML, elle bağımlılık-sürüm eşleştirme, harici Tomcat kurulumu... Basit bir uygulamayı ayağa kaldırmak bazen günler alırdı. **Spring Boot (2014)** tam da bu yükü kaldırmak için doğdu: *\"akıllı varsayılanları sen koy, geliştirici yalnızca iş mantığını yazsın.\"*" },
        {
          type: "framework", items: [
            { ico: "🌱", label: "Nedir", text: "Spring'in <b>üzerine kurulu</b> kolaylık katmanı. Rakibi değil — onu hızlandıran, üretime hazır hâle getiren çerçeve." },
            { ico: "⚙️", label: "Ne İş Yapar", text: "<b>Auto-config + starter + gömülü sunucu</b> ile kurulumu otomatikleştirir; `java -jar` ile çalışan tek, taşınabilir uygulama verir." },
            { ico: "🤔", label: "Neden Ortaya Çıktı", text: "Klasik Spring'in <b>XML/boilerplate, sürüm-uyumu ve sunucu kurulumu</b> yükünü azaltıp geliştiriciyi iş mantığına odaklamak için." },
            { ico: "✅", label: "Neye Çözüm Oldu", text: "\"Bağımlılık cehennemi\", uzun kurulum ve dağıtım zorluğunu <b>dakikalara</b> indirdi; tekrar eden altyapı kodunu sildi." }
          ]
        },
        { type: "code", cap: "3 anotasyonu birleştiren giriş noktası", code: `@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}` },
        { type: "callout", variant: "analogy", icon: "🏠", text: "**Sanki eşyalı ev gibi:** Klasik Spring, boş bir ev kiralamaktır — mobilya, beyaz eşya, tesisat hepsini sen kurarsın (güçlü ama yorucu). Spring Boot, <b>eşyalı ev</b>dir: her şey makul kurulmuş gelir, sadece beğenmediğini değiştirirsin. İşte \"auto-configuration\" budur — hazır ama üzerine yazılabilir varsayılanlar." },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Eskiden bir web projesi kurmak için Tomcat indir, XML yapılandır, bağımlılık sürümlerini elle eşle (saatler) gerekirdi. Bugün `start.spring.io`'dan iskelet + `bootRun` → dakikalar içinde çalışan REST servisi." },
        { type: "qa", items: [
          { q: "`@SpringBootApplication` neyi birleştirir?", a: "`@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`. Yani: yapılandırma sınıfıdır, auto-config'i açar ve ana sınıfın bulunduğu paketten aşağısını tarar." },
          { q: "Ana sınıf nerede olmalı?", a: "**Kök pakette** (en üstte). `@ComponentScan` oradan aşağıyı tarar; alt paketteki bean'ler bulunmazsa genelde sebep budur." }
        ] }
      ]
    },
    /* 01 */
    {
      nav: "01 · REST API", eyebrow: "Spring Boot · 01",
      title: "REST API Geliştirme",
      sub: "HTTP metotlarını (GET/POST/PUT/DELETE) ve durum kodlarını <b>semantik</b> kullanarak kaynak-odaklı API'ler.",
      blocks: [
        { type: "code", cap: "Doğru durum kodu + Location başlığı", code: `@PostMapping("/urunler")
ResponseEntity<Urun> olustur(@RequestBody Urun u) {
    Urun k = servis.kaydet(u);
    return ResponseEntity.created(URI.create("/urunler/" + k.id())).body(k); // 201
}
@DeleteMapping("/urunler/{id}")
ResponseEntity<Void> sil(@PathVariable Long id) {
    servis.sil(id); return ResponseEntity.noContent().build();   // 204
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir mobil uygulama backend'i — `GET /siparisler` listeler, `POST` 201+Location döner, bulunamayan kaynak 404 verir. Doğru durum kodları, istemci ekibinin hata yönetimini standartlaştırır." },
        { type: "qa", items: [
          { q: "PUT mu PATCH mı kullanmalıyım?", a: "**PUT** kaynağın tamamını değiştirir (idempotent — tam temsil gönderirsin). **PATCH** kısmi günceller (sadece değişen alanlar). Tek alan güncellemede PATCH daha doğrudur." },
          { q: "200, 201, 204 ne zaman?", a: "200 OK (genel başarı/gövdeli), 201 Created (yeni kaynak + Location), 204 No Content (başarı ama gövde yok, ör. silme/güncelleme)." }
        ] }
      ]
    },
    /* 02 */
    {
      nav: "02 · Spring Data JPA", eyebrow: "Spring Boot · 02 · 1/3",
      title: "Spring Data JPA",
      sub: "ORM (Hibernate) ile nesneleri tablolara eşle; repository arayüzleriyle sorguyu <b>neredeyse kod yazmadan</b> hallet.",
      blocks: [
        { type: "code", cap: "Türetilmiş sorgu — gövde yok", code: `@Entity class Gorev { @Id @GeneratedValue Long id; String baslik; boolean tamam; }

interface GorevRepo extends JpaRepository<Gorev, Long> {
    List<Gorev> findByTamamFalseAndUserId(Long userId);   // metot adından SQL
    @Query("select g from Gorev g where g.baslik like %:k%")
    List<Gorev> ara(String k);
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir görev yönetim uygulamasında \"kullanıcının tamamlanmamış görevleri\" sorgusu tek satır metot imzası. Ama bir listede her görevin etiketlerini ayrı sorgularsan **N+1** patlar — `join fetch` ile tek sorguya indir." },
        { type: "qa", items: [
          { q: "Lazy ve Eager yükleme farkı?", a: "**Lazy** ilişkili veriyi ihtiyaç anında çeker (varsayılan `@OneToMany`); **Eager** hemen çeker. Lazy daha verimlidir ama tx dışında erişirsen `LazyInitializationException` alırsın." },
          { q: "N+1 sorgu problemi nedir, nasıl çözülür?", a: "Ana sorgu + her satır için ek sorgu = N+1 sorgu. `@Query`'de `join fetch`, `@EntityGraph` veya batch-size ile tek/az sorguya indirilir." }
        ] }
      ]
    },
    /* 02b — Lazy/Eager */
    {
      nav: "02 · JPA · Lazy/Eager", eyebrow: "Spring Boot · 02 · 2/3",
      title: "Lazy vs Eager Yükleme (Fetch Stratejisi)",
      sub: "İlişkili veri <b>ne zaman</b> çekilir? Bu tek karar, hem performansı hem de en sık karşılaşılan hatayı doğrudan belirler.",
      blocks: [
        {
          type: "table",
          headers: ["İlişki", "Varsayılan", "Anlamı"],
          rows: [
            ["`@OneToMany`", "**LAZY**", "Koleksiyon ilk erişimde çekilir"],
            ["`@ManyToMany`", "**LAZY**", "Koleksiyon ilk erişimde çekilir"],
            ["`@ManyToOne`", "**EAGER**", "Ana sorguyla birlikte hemen çekilir"],
            ["`@OneToOne`", "**EAGER**", "Ana sorguyla birlikte hemen çekilir"]
          ]
        },
        {
          type: "twocol",
          pos: { title: "LAZY (tembel)", items: ["İlişkiye **ilk erişildiğinde** ayrı sorgu (proxy üzerinden)", "Gereksiz veri çekmez → verimli, tercih edilen varsayılan", "Risk: tx kapandıktan sonra erişim → `LazyInitializationException`"] },
          neg: { title: "EAGER (hevesli)", items: ["İlişkiyi **hemen, ana sorguyla** çeker", "Kolay ama çoğu zaman gereksiz veri + join şişmesi", "Çoklu eager ilişki → **N+1** ve kartezyen patlama"] }
        },
        {
          type: "code", cap: "Kontrol: LAZY yap, ihtiyaç olunca join fetch ile çek", code: `@Entity class Siparis {
  @ManyToOne(fetch = FetchType.LAZY)     // EAGER varsayılanını ez
  Musteri musteri;
  @OneToMany(mappedBy = "siparis")        // zaten LAZY
  List<Kalem> kalemler;
}
// İhtiyaç anında TEK sorguda getir:
@Query("select s from Siparis s join fetch s.kalemler where s.id = :id")
Siparis detay(Long id);
// Alternatif (deklaratif): @EntityGraph(attributePaths = "kalemler")`
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**En sık hata — `LazyInitializationException`:** tx bittikten sonra (controller'da veya JSON serileştirmede) lazy ilişkiye erişmek → proxy DB'ye gidemez. **Çözüm:** veriyi tx içindeyken `join fetch`/`@EntityGraph` ile çek ya da **DTO projeksiyonu** kullan. \"open-session-in-view\"e güvenme — gizli N+1 üretir."
        },
        {
          type: "qa", items: [
            { q: "Pratikte ne yapmalıyım — hep LAZY mi?", a: "Evet, pratik kural: **tüm ilişkileri LAZY** yap (`@ManyToOne`/`@OneToOne` dâhil, `fetch = LAZY`), sonra ihtiyaç duyduğun yerde `join fetch`/`@EntityGraph`/DTO ile **bilinçli** çek. Böylece ne gereksiz veri, ne de sürpriz `LazyInitializationException` olur." },
            { q: "`join fetch` ile `@EntityGraph` farkı ne?", a: "İkisi de ilişkiyi tek sorguda getirir. `join fetch` JPQL içinde, sorguya özel yazılır. `@EntityGraph` deklaratiftir — repository metoduna anotasyonla eklenir, JPQL'i değiştirmeden. Tercih okunabilirliğe göre." }
          ]
        }
      ]
    },
    /* 02c — Hibernate */
    {
      nav: "02 · JPA · Hibernate", eyebrow: "Spring Boot · 02 · 3/3",
      title: "Hibernate Özeti: ORM'in Kalbi",
      sub: "JPA bir <b>standart (arayüz)</b>; Hibernate onun en yaygın <b>uygulamasıdır</b> (ORM motoru). Spring Data JPA çoğunlukla Hibernate üzerinde çalışır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🗺️", label: "ORM Nedir", text: "Nesne ↔ tablo eşleme. SQL yazmadan entity'lerle çalışırsın; Hibernate SQL'i üretir." },
            { ico: "🧠", label: "Persistence Context", text: "1. seviye cache: tx içinde yönetilen entity'leri tutar; aynı id ikinci kez DB'ye gitmez." },
            { ico: "✨", label: "Dirty Checking", text: "Managed entity'de alan değişince flush'ta <b>otomatik UPDATE</b> üretir — `save()` çağırmasan bile." },
            { ico: "🔁", label: "Entity Durumları", text: "transient → managed → detached → removed. Yalnızca <b>managed</b> durumda değişiklik izlenir." }
          ]
        },
        {
          type: "code", cap: "Dirty checking — save() yok ama UPDATE var", code: `@Transactional
public void zamYap(Long id) {
    Urun u = repo.findById(id).orElseThrow();   // managed (persistence context'te)
    u.setFiyat(u.getFiyat() * 1.2);             // sadece alanı değiştir
    // repo.save(u) YOK — yine de tx commit'inde otomatik UPDATE çalışır
}`
        },
        {
          type: "bullets", title: "Önemli kavramlar (özet)",
          items: [
            "**Flush:** bekleyen değişikliklerin DB'ye SQL olarak gönderilmesi (genelde commit'te otomatik).",
            "**1. seviye cache:** persistence-context ile sınırlı, her zaman açık. **2. seviye cache:** uygulama genelinde, opsiyonel (Ehcache/Redis) — sık okunan, seyrek değişen referans verisi için.",
            "**Lazy proxy:** Hibernate, lazy ilişki için gerçek nesne yerine proxy koyar; erişilince yükler.",
            "**`@Transactional` ile çalış:** persistence context tx ömrü boyunca yaşar; dışında entity 'detached' olur (dirty checking durur)."
          ]
        },
        {
          type: "qa", items: [
            { q: "JPA ile Hibernate aynı şey mi?", a: "Hayır. **JPA** Java'nın ORM **standardıdır** (arayüzler/anotasyonlar: `@Entity`, `EntityManager`). **Hibernate** bu standardı **uygulayan** kütüphanedir (en yaygın). Kodu JPA'ya yazarsan sağlayıcı teorik olarak değiştirilebilir." },
            { q: "Neden `save()` çağırmadan veri güncellendi?", a: "**Dirty checking** sayesinde. Persistence context, managed entity'nin yüklenme anındaki hâlini hatırlar; commit/flush'ta farkı tespit edip otomatik UPDATE üretir. Managed bir entity'yi değiştirmek yeterlidir." },
            { q: "2. seviye cache'i her zaman açmalı mıyım?", a: "Hayır — yalnızca **sık okunan, seyrek değişen** veride (ülke/şehir, kategoriler) kazandırır. Sık değişen veride tutarsızlık riski ve karmaşıklık getirir; ölçüp öyle aç." }
          ]
        }
      ]
    },
    /* 03 */
    {
      nav: "03 · Validation & Hata", eyebrow: "Spring Boot · 03",
      title: "Validation ve Exception Handling",
      sub: "Gelen isteği Bean Validation ile doğrula; hataları global `@RestControllerAdvice` ile tutarlı JSON'a çevir.",
      blocks: [
        { type: "code", cap: "@Valid + global handler", code: `record UrunDto(@NotBlank String ad, @Min(0) int fiyat, @Email String mail) {}

@RestControllerAdvice
class GlobalHata {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ProblemDetail> handle(MethodArgumentNotValidException e) {
      var pd = ProblemDetail.forStatus(400);  // RFC 7807
      pd.setDetail("Doğrulama hatası"); return ResponseEntity.badRequest().body(pd);
  }
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Kayıt formunda boş ad veya geçersiz e-posta gelince, her controller'da tekrar tekrar `if` yazmak yerine `@Valid` + tek `@RestControllerAdvice` tüm API'ye <b>tutarlı</b> hata yanıtı verir." },
        { type: "qa", items: [
          { q: "Doğrulamayı controller'da mı serviste mi yapmalıyım?", a: "Girdi (format) doğrulaması controller'da `@Valid` ile; **iş kuralı** doğrulaması (ör. bakiye yeter mi) serviste. İkisi farklı sorumluluktur." },
          { q: "ProblemDetail nedir?", a: "RFC 7807 standardı hata gövdesi (`type`, `title`, `status`, `detail`). Spring 6+ yerleşik destekler; istemciler için makine-okunur, tutarlı hata formatı sağlar." }
        ] }
      ]
    },
    /* 04 */
    {
      nav: "04 · Spring Security", eyebrow: "Spring Boot · 04 · 1/2",
      title: "Spring Security",
      sub: "Kimlik doğrulama (authentication) + yetkilendirme (authorization). Parolayı <b>BCrypt</b> ile sakla; rol/izin bazlı erişim. Servlet <b>filter zinciri</b> üzerine kuruludur.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "⛓️", label: "Filter Chain", text: "Her istek güvenlik <b>filter zincirinden</b> geçer; kimlik ve yetki burada uygulanır (`SecurityFilterChain`)." },
            { ico: "🪪", label: "Authentication", text: "`AuthenticationManager` → `AuthenticationProvider` → `UserDetailsService` ile \"kimsin?\" doğrulanır." },
            { ico: "🚦", label: "Authorization", text: "URL bazlı (`requestMatchers`) + metot bazlı (`@PreAuthorize`) yetki denetimi." },
            { ico: "🔒", label: "Parola", text: "BCrypt/Argon2 ile <b>salt'lı hash</b>; düz metin asla saklanmaz." }
          ]
        },
        { type: "code", cap: "SecurityFilterChain (modern yapı)", code: `@Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http
      .authorizeHttpRequests(a -> a
         .requestMatchers("/api/admin/**").hasRole("ADMIN")
         .anyRequest().authenticated())
      .httpBasic(Customizer.withDefaults())
      .build();
}
@Bean PasswordEncoder enc() { return new BCryptPasswordEncoder(); }` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir yönetim panelinde `/admin/**` yalnızca ADMIN rolüne; `/api/**` her giriş yapmış kullanıcıya açık. Parolalar BCrypt ile saklandığından DB sızsa bile düz metin parola ele geçmez." },
        { type: "qa", items: [
          { q: "Authentication ile authorization farkı?", a: "**Authentication** \"kimsin?\" (giriş/kimlik doğrulama). **Authorization** \"neye yetkilin var?\" (rol/izin denetimi). Önce kimlik, sonra yetki." },
          { q: "Neden parolayı hash'liyoruz, şifrelemiyoruz?", a: "Hash tek yönlüdür (geri çözülemez) — sunucunun bile düz parolayı bilmesine gerek yok. BCrypt ayrıca **salt** ekler ve yavaştır, bu da kaba kuvvet saldırısını zorlaştırır." },
          { q: "Metot seviyesinde yetki nasıl verilir?", a: "`@EnableMethodSecurity` + `@PreAuthorize(\"hasRole('ADMIN')\")` veya sahiplik kontrolü `@PreAuthorize(\"#userId == authentication.principal.id\")`. URL kuralının yetmediği ince yetkilendirmede kullanılır." }
        ] }
      ]
    },
    /* 04b — Kurumsal Alternatifler */
    {
      nav: "04 · Security · Alternatifler", eyebrow: "Spring Boot · 04 · 2/2",
      title: "Kurumsal Alternatifler: Harici Kimlik Sağlayıcılar (IdP)",
      sub: "Şirketlerde Spring Security \"yerine\" değil, çoğunlukla <b>birlikte</b> kullanılır: kimliği harici bir sağlayıcı doğrular, Spring Security uygulamada yetkiyi uygular.",
      blocks: [
        { type: "lead", text: "Önemli ayrım: Spring Security uygulama-içi bir **güvenlik çerçevesidir**. Kurumlarda *kimlik doğrulamanın kendisi* (login, MFA, SSO, kullanıcı yönetimi) genelde ayrı bir **Kimlik Sağlayıcıya (IdP)** OAuth2/OIDC ile devredilir; Spring Security ise **OAuth2 Resource Server** olarak token'ı doğrulayıp `@PreAuthorize` ile yetki uygular." },
        {
          type: "table",
          headers: ["Alternatif", "Tür", "Öne çıkan"],
          rows: [
            ["**Keycloak**", "Açık kaynak, self-hosted IdP", "Tam kontrol, SSO/OIDC, ücretsiz"],
            ["**Spring Authorization Server**", "Resmi OAuth2/OIDC sunucusu", "Spring ekosistemiyle tam uyum"],
            ["**Okta**", "SaaS (kurumsal IAM)", "Kurumsal SSO/yönetişim standardı"],
            ["**Auth0**", "SaaS (IDaaS)", "Hızlı kurulum, geniş entegrasyon"],
            ["**Microsoft Entra ID** (Azure AD)", "Kurumsal SaaS", "Microsoft/Office ekosistemi, SSO"],
            ["**AWS Cognito**", "AWS-yerel SaaS", "AWS ile entegre, ucuz başlangıç"],
            ["**Ory** (Hydra/Kratos)", "Açık kaynak, API-first", "Bulut-yerel, modüler"]
          ]
        },
        {
          type: "twocol",
          pos: { title: "Harici IdP'nin artıları", items: ["Güvenliğin zor kısmını (MFA, SSO, parola politikası, sosyal giriş, token yönetimi) uzmanına devret", "Standart protokoller (OAuth2/OIDC/SAML) → birlikte çalışabilirlik", "Merkezî kullanıcı yönetimi + denetim/uyumluluk (audit, compliance, KVKK/GDPR)", "Daha az güvenlik kodu = daha küçük açık yüzeyi; SaaS'ta dakikalar içinde kurulum"] },
          neg: { title: "Eksileri / dikkat", items: ["SaaS'ta **kullanıcı başına maliyet** ve **vendor lock-in**", "Self-hosted (Keycloak/Ory) → ciddi **operasyon yükü** (HA, yedek, yama)", "OIDC akışlarının öğrenme eğrisi; yanlış yapılandırma riski", "**IdP'ye bağımlılık**: sağlayıcı/erişim düşerse giriş durur"] }
        },
        {
          type: "callout", variant: "real", icon: "🏢",
          text: "**Pratik kurumsal mimari:** Kimlik = harici IdP (Keycloak / Okta / Entra ID) + Uygulama = Spring Security <b>Resource Server</b> (JWT/OIDC doğrula, `@PreAuthorize` ile yetkilendir). Küçük/orta projede düz Spring Security + kendi JWT'in yeterli; ölçek, SSO ve uyumluluk gerekince IdP'ye geçilir."
        },
        {
          type: "qa", items: [
            { q: "Harici IdP kullanınca Spring Security'yi tamamen bırakır mıyım?", a: "Genelde hayır. IdP **kimliği** doğrular (login/MFA/SSO); ama uygulama içi **yetki uygulamasını** (endpoint koruma, metot güvenliği, rol→izin) yine Spring Security (Resource Server) yapar. İkisi farklı katmandır, birlikte çalışır." },
            { q: "Keycloak mı, Okta/Auth0 mı, Entra ID mı?", a: "**Self-hosted + tam kontrol + ücretsiz** istiyorsan Keycloak (ama işletme yükü sende). **Sıfır-operasyon + kurumsal destek/SLA** istiyorsan SaaS: Okta/Auth0. Zaten **Microsoft** ekosistemindeysen Entra ID, **AWS**'deysen Cognito doğal seçimdir." },
            { q: "Kendi JWT login'imi yazmak yerine neden IdP?", a: "MFA, sosyal giriş, SSO, parola sıfırlama, hesap kilitleme, token rotasyonu, denetim kaydı… hepsini doğru ve güvenli yazmak zordur ve risklidir. IdP bunları **hazır, test edilmiş ve uyumlu** sunar; sen iş mantığına odaklanırsın." }
          ]
        }
      ]
    },
    /* 05 */
    {
      nav: "05 · Caching/Async/Scheduling", eyebrow: "Spring Boot · 05",
      title: "Caching, Async ve Scheduling",
      sub: "Pahalı işlemi önbelleğe al, uzun işi arka plana at, periyodik görevi zamanla. Hepsi proxy-tabanlı.",
      blocks: [
        { type: "code", cap: "Üç anotasyon", code: `@Cacheable("urunler")                 // sonucu cache'le
public Urun pahaliBul(Long id) { ... }

@Async                                // ayrı thread'de çalış
public CompletableFuture<Rapor> uret() { ... }

@Scheduled(cron = "0 0 3 * * *")      // her gece 03:00
public void geceBakim() { ... }` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Döviz kuru her istekte dış API'den çekilince yavaş ve maliyetli. `@Cacheable` ile 60 sn önbelleğe alınır; gece raporu `@Scheduled` ile otomatik üretilir; e-posta `@Async` ile kullanıcıyı bekletmeden gider." },
        { type: "qa", items: [
          { q: "Neden `@Cacheable`/`@Async` aynı sınıftan çağrılınca çalışmaz?", a: "Transaction'la aynı sebep: **proxy self-invocation**. Aynı bean içinde `this.cachedMethod()` proxy'yi atlar. Metodu başka bean'e taşı." },
          { q: "Cache'i ne zaman temizlerim?", a: "Veri değişince `@CacheEvict` ile. Ayrıca TTL (zaman aşımı) için Caffeine/Redis gibi sağlayıcı kullanırsın; varsayılan basit cache TTL bilmez." }
        ] }
      ]
    },
    /* 05b — Spring Proxy (AOP) */
    {
      nav: "Spring Proxy (AOP) · Nasıl Çalışır", eyebrow: "Spring Boot · AOP Proxy · 1/2",
      title: "Spring Proxy: Anotasyonların Ardındaki Sihir",
      sub: "Spring; `@Transactional`, `@Cacheable`, `@Async`, `@PreAuthorize` gibi davranışları bean'in etrafına bir <b>proxy sararak</b> uygular. Metodu çağırırsın → önce proxy araya girer (advice) → sonra gerçek metot.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🎁", label: "Nasıl", text: "Bean oluşurken Spring onu bir <b>proxy</b> ile sarar (AOP). Çağrı: proxy → advice → gerçek metot." },
            { ico: "🧩", label: "Neyi Sağlar", text: "`@Transactional` (tx), `@Cacheable` (cache), `@Async` (ayrı thread), `@PreAuthorize` (yetki)." },
            { ico: "🔀", label: "İki Tür", text: "<b>JDK dynamic proxy</b> (arayüz) veya <b>CGLIB</b> (sınıf alt-tipi)." },
            { ico: "💡", label: "Neden Önemli", text: "\"Sihir\" değil — çalışma-zamanı proxy'si + araya giren advice. (Bkz. Java · Proxy.)" }
          ]
        },
        {
          type: "code", cap: "Spring'in ürettiği proxy (kavramsal)", code: `@Service
class SiparisServisi {
    @Transactional
    public void kaydet(Siparis s) { repo.save(s); }
}

// Spring çalışma zamanında (kavramsal olarak) şunu üretir:
class SiparisServisi$$SpringProxy extends SiparisServisi {
    public void kaydet(Siparis s) {
        tx.begin();                                  // advice (önce)
        try { super.kaydet(s); tx.commit(); }        // gerçek metot
        catch (RuntimeException e) { tx.rollback(); throw e; }
    }
}`
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Controller `siparisServisi.kaydet(s)` çağırır ama aslında **proxy'yi** çağırır. Proxy transaction'ı açar, gerçek `kaydet`'i işletir, başarılıysa commit / hata varsa rollback yapar. Sen tek bir `@Transactional` yazdın; gerisini proxy hallediyor."
        },
        {
          type: "qa", items: [
            { q: "`@Transactional` neden bir proxy ile çalışıyor?", a: "Çünkü transaction açma/commit/rollback, iş metodundan **ayrı bir çapraz kesen ilgidir**. Spring bunu koda gömmek yerine metodu bir proxy ile sarar; böylece iş mantığın temiz kalır, davranış dışarıdan eklenir (AOP)." },
            { q: "Bu proxy'yi ben mi oluşturuyorum?", a: "Hayır — Spring container, bean'i oluştururken ilgili anotasyonları görüp otomatik sarar. Sen sadece anotasyonu koyarsın; proxy üretimi ve advice zincirini framework yönetir." }
          ]
        }
      ]
    },
    /* 05c — JDK vs CGLIB & self-invocation */
    {
      nav: "Spring Proxy · JDK vs CGLIB & Tuzaklar", eyebrow: "Spring Boot · AOP Proxy · 2/2",
      title: "JDK vs CGLIB ve Self-Invocation Tuzağı",
      blocks: [
        {
          type: "table",
          headers: ["", "JDK Dynamic Proxy", "CGLIB"],
          rows: [
            ["Gereksinim", "**Arayüz** şart", "Arayüz gerekmez"],
            ["Nasıl", "Arayüzü uygular", "Sınıfı **extend** eder (alt-tip)"],
            ["Sınır", "Sadece arayüz metotları", "`final` sınıf/metot **proxy'lenemez**"],
            ["Spring Boot", "Arayüz + ayar", "**Varsayılan** (proxyTargetClass=true)"]
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Self-invocation tuzağı (en sık hata):** Aynı sınıf içinden `this.method()` çağrısı **proxy'yi atlar** → `@Transactional`/`@Cacheable`/`@Async` **devreye girmez**. Çünkü çağrı proxy üzerinden değil, doğrudan gerçek nesne üzerinden gider."
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Sorun — iç çağrı proxy'yi atlar", code: `@Service
class A {
    @Transactional
    public void dis() {
        this.ic();          // ❌ proxy ATLANIR → yeni tx AÇILMAZ
    }
    @Transactional(propagation = REQUIRES_NEW)
    public void ic() { ... }
}` }
          ],
          right: [
            { type: "code", cap: "Çözüm — başka bean veya self-injection", code: `// 1) ic()'yi ayrı bir bean'e taşı, onu enjekte et
class A { private final B b; void dis() { b.ic(); } }

// 2) veya kendini proxy olarak enjekte et
@Service
class A {
    @Autowired @Lazy A self;
    void dis() { self.ic(); }   // ✓ proxy üzerinden
}` }
          ]
        },
        {
          type: "bullets", title: "Diğer tuzaklar",
          items: [
            "**`final` metot/sınıf** CGLIB ile proxy'lenemez → advice çalışmaz",
            "**`private`/`protected`** metotlarda advice çalışmaz — `public` olmalı",
            "**Constructor** içinde proxy henüz devrede değildir",
            "Proxy'nin performans etkisi **ihmal edilebilir** (framework önbellekler)"
          ]
        },
        {
          type: "qa", items: [
            { q: "Self-invocation'ı nasıl çözerim?", a: "Ya ilgili metodu **başka bir bean'e** taşıyıp onu enjekte edersin (temiz yol), ya da bean'i **kendine `@Lazy` ile enjekte edip** (`self.method()`) proxy üzerinden çağırırsın. Amaç: çağrının proxy'den geçmesini sağlamak." },
            { q: "Neden `final` sınıf/metot sorun çıkarır?", a: "CGLIB proxy'si hedef **sınıfı extend edip metotları override** ederek araya girer. `final` bir sınıf extend edilemez, `final` metot override edilemez → proxy o metodu saramaz, advice çalışmaz." },
            { q: "Spring Boot neden CGLIB'i varsayılan yapıyor?", a: "Arayüz olmadan da (sadece `@Service` sınıfı) proxy kurulabilsin ve davranış tutarlı olsun diye. Böylece arayüz yazmadığın bean'lerde de `@Transactional` vb. çalışır." }
          ]
        }
      ]
    },
    /* 06 */
    {
      nav: "06 · Actuator", eyebrow: "Spring Boot · 06",
      title: "Actuator ve Üretim İzleme",
      sub: "Health, metrics, info endpoint'leri + özel `HealthIndicator`'lar ile uygulamayı üretimde izle ve yönet.",
      blocks: [
        { type: "framework", items: [
          { ico: "❤️", label: "/health", text: "UP/DOWN; Kubernetes liveness/readiness probe'larının kaynağı." },
          { ico: "📊", label: "/metrics", text: "Micrometer: Counter, Timer, Gauge → Prometheus/Grafana." },
          { ico: "ℹ️", label: "/info", text: "Sürüm, build, git bilgisi." },
          { ico: "🩺", label: "HealthIndicator", text: "DB, kuyruk, dış servis için özel sağlık kontrolü." }
        ] },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Kubernetes, `/actuator/health/readiness` DOWN dönen pod'a trafik göndermez; Prometheus `/metrics`'ten istek süresi ve hata oranını toplar, eşik aşılınca alarm üretir." },
        { type: "qa", items: [
          { q: "Actuator endpoint'leri güvenli mi?", a: "Hassas olanlar (`/env`, `/heapdump`) varsayılan kapalı/korumalıdır. Üretimde Spring Security ile koru ve yalnızca gerekli endpoint'leri `management.endpoints.web.exposure.include` ile aç." },
          { q: "liveness ile readiness farkı?", a: "**Liveness** \"uygulama ölü mü?\" (ölüyse yeniden başlat). **Readiness** \"trafik alabilir mi?\" (warmup/DB hazır değilse trafiği kes ama öldürme)." }
        ] }
      ]
    },
    /* 07 */
    {
      nav: "07 · Test", eyebrow: "Spring Boot · 07",
      title: "Test: Birim, Web, Entegrasyon",
      sub: "JUnit 5 + Mockito + MockMvc + slice testleri ile doğruluğu otomatik garanti et.",
      blocks: [
        { type: "code", cap: "Katmana göre test dilimi", code: `@WebMvcTest(UrunController.class)   // sadece web katmanı
class UrunControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UrunServisi servis;     // servisi sahtele
    @Test void getir_200() throws Exception {
        when(servis.bul(1L)).thenReturn(new Urun(1L,"Kalem"));
        mvc.perform(get("/api/urunler/1")).andExpect(status().isOk());
    }
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** CI pipeline'da her PR'da yüzlerce test koşar. `@DataJpaTest` repository'yi gerçek (H2/Testcontainers) DB'ye karşı sınar; `@WebMvcTest` controller'ı hızlı, izole test eder — hatalar üretime gitmeden yakalanır." },
        { type: "qa", items: [
          { q: "`@SpringBootTest` ile slice testleri (`@WebMvcTest`) ne zaman?", a: "Slice testleri hızlı ve odaklıdır (sadece ilgili katman). `@SpringBootTest` tüm context'i kaldırır — yavaş ama uçtan uca entegrasyon doğrular. Çoğu test slice, az sayıda kritik akış full olmalı." },
          { q: "Testte gerçek DB mi mock mu?", a: "Repository/SQL davranışı için **gerçek** (Testcontainers ile gerçek PostgreSQL) en güvenilirdir. Servis birim testinde repository'yi **mock**'larsın." }
        ] }
      ]
    },
    /* 08 */
    {
      nav: "08 · Dağıtık Transaction & Saga", eyebrow: "Spring Boot · 08 · 1/2",
      title: "Dağıtık Transaction ve Saga (Uygulama)",
      sub: "Mikroserviste birden çok servis/DB'ye yayılan işlemlerde tutarlılık. <b>Yerel `@Transactional` yetmez</b> — Saga ile çözülür.",
      blocks: [
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Neden yerel `@Transactional` çalışmaz:** tek tx yalnızca <b>kendi DB'ni</b> kapsar. `siparisRepo.save()` + `odemeClient.tahsilEt()` (başka servis) aynı tx'te değildir; ödeme patlarsa siparişin commit'i geri alınmaz. 2PC/XA bunu kapsar ama bloklar ve ölçeklenmez → Saga."
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Orchestration — merkezi koordinatör" },
            { type: "code", cap: "Akışı tek servis yürütür + telafiyi tetikler", code: `@Service
class SiparisSaga {
  void calistir(Siparis s) {
    var rez = stokClient.rezerveEt(s);     // @FeignClient / RestClient
    try {
      var odeme = odemeClient.tahsilEt(s);
      try {
        kargoClient.olustur(s);
      } catch (Exception e) {
        odemeClient.iadeEt(odeme.id());    // TELAFİ 2
        stokClient.birak(rez.id());        // TELAFİ 1
        throw e;
      }
    } catch (Exception e) {
      stokClient.birak(rez.id());          // TELAFİ 1
      throw e;
    }
  }
}` }
          ],
          right: [
            { type: "heading", text: "Choreography — olay tabanlı (Kafka)" },
            { type: "code", cap: "Her servis olayı dinler + yeni olay yayar", code: `// Sipariş servisi olay yayar
kafka.send("siparis-olaylari",
           new SiparisOlusturuldu(s.id()));

// Stok servisi dinler → rezerve eder → yeni olay
@KafkaListener(topics = "siparis-olaylari")
void onSiparis(SiparisOlusturuldu e) {
    stok.rezerveEt(e.siparisId());
    kafka.send("stok-olaylari",
               new StokRezerveEdildi(e.siparisId()));
}

// Ödeme reddedilirse: Stok 'OdemeReddedildi'
// olayını dinler → rezervasyonu TELAFİ eder` }
          ]
        },
        {
          type: "qa", items: [
            { q: "Orchestration mı choreography mi seçmeliyim?", a: "Akış karmaşık ve merkezî kontrol/izleme istiyorsan **orchestration** (bir koordinatör servis). Servisler gevşek bağlı olsun, tek nokta olmasın istiyorsan **choreography** (olay yayını) — ama akışı uçtan uca izlemek zorlaşır (tracing şart)." },
            { q: "Telafi (compensation) her zaman mümkün mü?", a: "Çoğu işlemde evet (iade, iptal, serbest bırak). Geri alınamayanlarda (gönderilen e-posta) **ileri telafi** (düzeltici bildirim) veya adımı en sona / onaya bağlama tasarlanır." }
          ]
        }
      ]
    },
    /* 08b — Üretimde güvene alma */
    {
      nav: "08 · Saga · Outbox & Idempotency", eyebrow: "Spring Boot · 08 · 2/2",
      title: "Saga'yı Üretimde Güvene Almak",
      sub: "Saga'nın çalışması için iki şart: olaylar <b>kaybolmamalı</b> (Outbox) ve <b>çift işlenmemeli</b> (Idempotency). Sonuç: eventual consistency.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Outbox — DB + olay yayını atomik" },
            { type: "code", cap: "DB ile Kafka iki ayrı sistem; arada çökme = kayıp/çift", code: `// ❌ tx dışı yayın — risk
@Transactional
void siparisVer(Siparis s) {
    siparisRepo.save(s);
    kafka.send("olaylar", olay);   // kayıp/çift riski
}

// ✓ Outbox: olayı AYNI tx'te tabloya yaz
@Transactional
void siparisVer(Siparis s) {
    siparisRepo.save(s);
    outboxRepo.save(new Outbox("olaylar", olay));
}
// Ayrı yayıncı (poller veya Debezium/CDC)
// outbox'ı okuyup Kafka'ya güvenle iletir` }
          ],
          right: [
            { type: "heading", text: "Idempotency — tekrara dayan" },
            { type: "code", cap: "\"En az bir kez\" teslimde çift işlemeyi önle", code: `@KafkaListener(topics = "odeme-olaylari")
void onOdeme(OdemeAlindi e) {
    if (islenmisRepo.existsById(e.olayId()))
        return;                     // zaten işlendi → atla
    kargo.olustur(e.siparisId());
    islenmisRepo.save(new Islenmis(e.olayId()));
}` },
            { type: "bullets", title: "Yardımcı araçlar", items: ["**Debezium** (CDC) — outbox tablosunu Kafka'ya akıtır", "**Axon / Eventuate** — hazır saga durum yönetimi", "**Resilience4j** — retry + circuit breaker", "**Kafka** — kalıcı olay log'u + consumer group"] }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Eventual consistency (mikroserviste):** Sipariş anında \"ONAYLANIYOR\" görünür; stok rezerve, ödeme, kargo olayları işlendikçe birkaç yüz ms içinde \"ONAYLANDI\"ya <b>yakınsar</b>. Kullanıcıya ara durumu göster — anlık tutarlılık beklentisi kurma."
        },
        {
          type: "qa", items: [
            { q: "Outbox neden gerekli, `@Transactional` + `kafka.send()` yetmez mi?", a: "DB ve Kafka **iki ayrı sistem**; ikisini tek atomik tx yapamazsın (XA hariç — pahalı/kırılgan). `save` commit olup `send` öncesi çökersen olay kaybolur; tersi durumda çift gider. Outbox olayı DB tx'ine dahil eder, ayrı yayıncı güvenle iletir." },
            { q: "Çift işlemeyi (duplicate) nasıl kesin önlerim?", a: "**Idempotency:** her olaya benzersiz id ver, işlenenleri bir tabloda tut ve tekrarı atla. Ek olarak DB'de `unique constraint` veya idempotency-key ile yan etkiyi (çift tahsilat gibi) garanti altına al." },
            { q: "Saga'yı elle mi yazayım, framework mü kullanayım?", a: "Basit, az adımlı akışta **elle** (orchestrator + outbox + idempotency) yeterli ve şeffaftır. Çok adımlı, uzun-ömürlü, timeout/retry/telafi durumu karmaşıksa **Axon/Eventuate** gibi framework durum makinesini ve dayanıklılığı hazır verir." }
          ]
        }
      ]
    },
    /* 09 */
    {
      nav: "09 · Runners", eyebrow: "Spring Boot · 09",
      title: "Runners (Başlangıç Görevleri)",
      sub: "Uygulama ayağa kalkınca <b>bir kez</b> çalışması gereken işler: seed data, cache warm-up, bağlantı kontrolü.",
      blocks: [
        { type: "code", cap: "CommandLineRunner / ApplicationRunner", code: `@Component @Order(1)
class SeedRunner implements CommandLineRunner {
    private final RolRepo repo;
    SeedRunner(RolRepo r){ this.repo = r; }
    public void run(String... args) {
        if (repo.count()==0) repo.saveAll(List.of(new Rol("ADMIN"), new Rol("USER")));
    }
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Yeni ortama deploy edilen uygulama ilk açılışta varsayılan rolleri, admin kullanıcısını ve referans verileri (şehirler, kategoriler) yükler — böylece sistem boş gelmez." },
        { type: "qa", items: [
          { q: "`CommandLineRunner` ile `ApplicationRunner` farkı?", a: "İkisi de başlangıçta çalışır; `CommandLineRunner` ham `String[]` argüman alır, `ApplicationRunner` ayrıştırılmış `ApplicationArguments` alır. İşlev aynı, parametre biçimi farklı." },
          { q: "Şema/veri migration'ı runner'da mı yapmalıyım?", a: "Veri tohumlama küçükse runner uygun. Şema değişikliği ve sürümlü veri için **Flyway/Liquibase** doğrudur — sürümlenir, tekrar çalıştırılabilir ve takım genelinde tutarlıdır." }
        ] }
      ]
    },
    /* 10 */
    {
      nav: "10 · Katmanlı Mimari", eyebrow: "Spring Boot · 10",
      title: "Servis Bileşenleri ve Katmanlı Mimari",
      sub: "Her katmanın tek sorumluluğu: <b>Controller</b> (sunum) → <b>Service</b> (iş mantığı) → <b>Repository</b> (veri).",
      blocks: [
        { type: "framework", items: [
          { ico: "🌐", label: "@RestController", text: "HTTP'yi karşılar, DTO'ya çevirir; iş mantığı içermez." },
          { ico: "⚙️", label: "@Service", text: "İş kuralları + transaction sınırı burada." },
          { ico: "🗄️", label: "@Repository", text: "Veri erişimi; SQL/JPA detayını gizler." },
          { ico: "📦", label: "DTO", text: "Katmanlar arası taşıma; entity'yi dış dünyaya sızdırmaz." }
        ] },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** İş mantığı serviste toplandığında, aynı \"sipariş oluştur\" kuralını hem REST controller hem bir Kafka consumer hem de bir scheduled job çağırabilir — kod tekrarı olmaz, tek yerden değişir." },
        { type: "qa", items: [
          { q: "İş mantığı controller'a yazılırsa ne olur?", a: "Test zorlaşır, yeniden kullanım imkânsızlaşır (sadece HTTP'den çağrılır), transaction sınırı bulanıklaşır. İş mantığı **her zaman serviste** olmalı; controller ince kalmalı." },
          { q: "Entity'yi doğrudan JSON dönmek sakıncalı mı?", a: "Evet — iç alanları (parola hash, ilişkiler) sızdırır, lazy-loading sorunları doğurur ve API'yi DB şemasına bağlar. **DTO** kullan." }
        ] }
      ]
    },
    /* 11 */
    {
      nav: "11 · Interceptor", eyebrow: "Spring Boot · 11",
      title: "Interceptor (HandlerInterceptor)",
      sub: "Spring MVC seviyesinde, isteğin controller'a <b>gitmeden önce</b> ve döndükten <b>sonra</b> araya giren kanca. Filter'dan farkı: hangi controller/metodun çağrıldığını <b>bilir</b>.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🚦", label: "preHandle", text: "Controller'dan <b>ÖNCE</b>. `false` dönerse istek <b>kesilir</b> (yetki/doğrulama burada); `true` → devam." },
            { ico: "🎨", label: "postHandle", text: "Controller'dan <b>SONRA</b>, view render'dan önce. `ModelAndView`'a dokunabilirsin (REST'te az kullanılır). Hata olursa <b>çağrılmaz</b>." },
            { ico: "🧹", label: "afterCompletion", text: "Her şey bittikten <b>SONRA</b> (view dâhil, hata olsa bile). Temizlik, süre ölçümü, hata loglama — `Exception` parametresi gelir." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "1) Örnek — kimlik + süre ölçen interceptor" },
            { type: "code", cap: "preHandle ile yetkisizi 401 ile KES", code: `@Component
class AuthInterceptor implements HandlerInterceptor {
  public boolean preHandle(HttpServletRequest req,
        HttpServletResponse res, Object handler) {
    String key = req.getHeader("X-API-KEY");
    if (!apiKeyServisi.gecerli(key)) {
      res.setStatus(401);          // Unauthorized
      return false;                // controller HİÇ çalışmaz
    }
    req.setAttribute("t0", System.nanoTime());
    return true;                   // devam
  }
  public void afterCompletion(HttpServletRequest req,
        HttpServletResponse res, Object h, Exception e) {
    long ms = (System.nanoTime()
        - (long) req.getAttribute("t0")) / 1_000_000;
    log.info("{} {} → {} ({} ms)", req.getMethod(),
        req.getRequestURI(), res.getStatus(), ms);
  }
}` }
          ],
          right: [
            { type: "heading", text: "2) Kaydet — yol desenleriyle" },
            { type: "code", cap: "WebMvcConfigurer ile hangi yollara uygulanacağını seç", code: `@Configuration
class WebConfig implements WebMvcConfigurer {
  private final AuthInterceptor auth;
  WebConfig(AuthInterceptor auth) { this.auth = auth; }

  @Override
  public void addInterceptors(InterceptorRegistry r) {
    r.addInterceptor(auth)
     .addPathPatterns("/api/**")            // bunlara uygula
     .excludePathPatterns("/api/public/**"); // bunları hariç tut
  }
}` },
            { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Süre ölçümü, API-key denetimi, istek sayacı, dil/tenant belirleme, audit log — bunları her controller'a yazmak yerine <b>tek interceptor</b> tüm `/api/**` isteklerini kapsar." }
          ]
        },
        {
          type: "table",
          headers: ["", "Interceptor", "Filter"],
          rows: [
            ["Seviye", "Spring MVC (DispatcherServlet **içi**)", "Servlet container (**dışı**)"],
            ["Handler bilgisi", "**Var** (hangi controller/metot)", "Yok"],
            ["Erişim", "`ModelAndView`, handler", "Ham request/response"],
            ["Tipik kullanım", "Auth, süre, audit, tenant", "CORS, trace-id, sıkıştırma, güvenlik başlığı"]
          ]
        },
        {
          type: "qa", items: [
            { q: "`preHandle` `false` dönerse ne olur?", a: "İstek **kesilir** — controller hiç çalışmaz, `postHandle`/diğer interceptor'lar atlanır. Yanıtı (status + gövde) interceptor içinde **sen** yazmalısın (ör. 401/403)." },
            { q: "`postHandle` ile `afterCompletion` farkı?", a: "`postHandle` controller başarıyla döndükten sonra, view'dan önce çağrılır ve **hata olursa çağrılmaz**. `afterCompletion` her durumda (hata dâhil) en sonda çalışır — bu yüzden **temizlik ve süre ölçümü** için doğru yerdir." },
            { q: "Interceptor mı Filter mı kullanmalıyım?", a: "Controller/handler bilgisine ihtiyaç varsa (hangi metot, hangi `@RequestMapping`) **Interceptor** (MVC-aware). Tüm istekleri ham seviyede, statik dosyalar ve Spring dışı kaynaklar dâhil sarmak gerekiyorsa **Filter**. Güvenlik için ikisi de kullanılır (Spring Security filter'dır)." }
          ]
        }
      ]
    },
    /* 12 */
    {
      nav: "12 · Servlet Filter", eyebrow: "Spring Boot · 12",
      title: "Servlet Filter",
      sub: "Servlet konteyneri seviyesinde, DispatcherServlet'in <b>dışında</b>, <b>her</b> isteği (Spring controller'ı olmasa bile, statik dosyalar dâhil) sarmalayan ara katman. Servlet standardının parçasıdır — Spring'e özel değildir.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🧱", label: "Nedir", text: "Java Servlet standardının ara katmanı. Her HTTP isteği, DispatcherServlet'e ulaşmadan <b>önce</b> filter zincirinden geçer." },
            { ico: "🔗", label: "doFilter", text: "`chain.doFilter()` isteği bir sonrakine iletir. Öncesi = istek işleme, sonrası = yanıt işleme. <b>Çağırmazsan istek kesilir.</b>" },
            { ico: "♻️", label: "Yaşam Döngüsü", text: "`init()` (bir kez) → `doFilter()` (her istek) → `destroy()` (kapanışta)." },
            { ico: "🔢", label: "Sıra", text: "Birden çok filter zincir oluşturur; sırayı `@Order` veya `FilterRegistrationBean.setOrder()` belirler." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "1) Örnek — trace-id ekleyen filter" },
            { type: "code", cap: "Her isteğe korelasyon kimliği (OncePerRequestFilter önerilir)", code: `@Component
class TraceFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest req,
        HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
    String traceId = UUID.randomUUID().toString();
    MDC.put("traceId", traceId);             // tüm loglara basılır
    res.setHeader("X-Trace-Id", traceId);    // yanıta da ekle
    try {
      chain.doFilter(req, res);              // sonraki katmana ilet
    } finally {
      MDC.clear();                           // her durumda temizle
    }
  }
}` }
          ],
          right: [
            { type: "heading", text: "2) Kaydet — yol + sıra kontrolü" },
            { type: "code", cap: "FilterRegistrationBean ile url pattern ve order", code: `@Bean
FilterRegistrationBean<TraceFilter> traceReg(TraceFilter f) {
    var reg = new FilterRegistrationBean<>(f);
    reg.addUrlPatterns("/api/*");   // hangi yollara
    reg.setOrder(1);                // küçük = önce çalışır
    return reg;
}` },
            { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** trace-id ile mikroservis isteğini uçtan uca izleme, güvenlik başlıkları (`X-Frame-Options`), yanıtı gzip'leme, karakter kodlaması, istek/yanıt gövdesini loglama. <b>Spring Security de bir filter zinciridir.</b>" }
          ]
        },
        {
          type: "callout", variant: "info", icon: "➡️",
          text: "**İstek akış sırası:** Filter(ler) → <b>DispatcherServlet</b> → Interceptor(lar) → Controller → (yanıtta ters sırayla geri). Yani filter en dıştaki katmandır; bir isteği daha controller'a varmadan reddedebilir."
        },
        {
          type: "qa", items: [
            { q: "Filter ile Interceptor sırası nedir?", a: "Filter daha **dışta**dır: önce tüm filter'lar çalışır, sonra DispatcherServlet, sonra interceptor'lar, sonra controller. Yanıtta ters sırayla geri dönülür." },
            { q: "`@Component` ile mi `FilterRegistrationBean` ile mi kaydetmeliyim?", a: "`@Component` filter'ı otomatik kaydeder ama **tüm yollara** uygular ve sırasını kontrol etmek zordur. URL deseni ve `order` kontrolü gerekiyorsa **`FilterRegistrationBean`** kullan (önerilen)." },
            { q: "`OncePerRequestFilter` neden tercih edilir?", a: "Spring'in yardımcı taban sınıfıdır; bir isteğin (forward/include/async sırasında) filter mantığının **birden çok kez** çalışmasını önler ve `HttpServletRequest`/`Response`'a hazır erişim verir. Spring'de filter yazarken `Filter`'ı ham implemente etmek yerine bunu genişlet." }
          ]
        }
      ]
    },
    /* 13 */
    {
      nav: "13 · CORS", eyebrow: "Spring Boot · 13",
      title: "CORS Desteği",
      sub: "Tarayıcının Same-Origin Policy'sini aşıp farklı köken (domain/port) JavaScript isteklerine izin verme.",
      blocks: [
        { type: "code", cap: "Global CORS yapılandırması", code: `@Configuration
class CorsConfig implements WebMvcConfigurer {
    public void addCorsMappings(CorsRegistry r) {
        r.addMapping("/api/**")
         .allowedOrigins("https://app.ornek.com")
         .allowedMethods("GET","POST","PUT","DELETE");
    }
}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** React frontend `localhost:3000`'de, Spring backend `8080`'de. Tarayıcı çapraz-köken isteği engeller; CORS yapılandırması olmadan istekler \"CORS error\" ile düşer. Yapılandırma ile yalnızca güvenilen origin'e izin verilir." },
        { type: "qa", items: [
          { q: "`allowedOrigins(\"*\")` güvenli mi?", a: "Halka açık, kimlik taşımayan API'lerde olabilir; ama `*` ile `allowCredentials(true)` **birlikte yasaktır** ve kimlik taşıyan API'de tehlikelidir. Belirli origin listele." },
          { q: "Preflight (OPTIONS) isteği nedir?", a: "Tarayıcı, asıl istekten önce \"bu çapraz-köken isteğe izin var mı?\" diye OPTIONS gönderir. Sunucu izin başlıklarıyla yanıtlarsa asıl istek gider." }
        ] }
      ]
    },
    /* 14 */
    {
      nav: "14 · Configuration", eyebrow: "Spring Boot · 14",
      title: "Application Properties ve Yapılandırma",
      sub: "Uygulamayı `application.yml` + ortam değişkenleri + profillerden <b>dışarıdan</b> yapılandır.",
      blocks: [
        { type: "code", cap: "Tip-güvenli yapılandırma", code: `# application-prod.yml
odeme:
  zaman-asimi: 5s
  yeniden-deneme: 3

@ConfigurationProperties("odeme")
record OdemeConfig(Duration zamanAsimi, int yenidenDeneme) {}` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Aynı jar dev, test ve prod'da çalışır; her ortam kendi DB URL'sini ve sırlarını **ortam değişkeninden** alır (kodu değiştirmeden). Profil (`--spring.profiles.active=prod`) doğru ayar setini seçer." },
        { type: "qa", items: [
          { q: "Sırları (parola, API key) nereye koymalıyım?", a: "**Asla koda/git'e değil.** Ortam değişkeni, Vault, K8s Secret veya Config Server (şifreli). Kodda yalnızca anahtar adı bulunur." },
          { q: "Ayar önceliği nasıl?", a: "Yüksekten alçağa: komut satırı argümanı > ortam değişkeni > profil-yml > application.yml > `@Value` varsayılanı. Üstteki alttakini ezer." }
        ] }
      ]
    },
    /* 15 */
    {
      nav: "15 · Logging", eyebrow: "Spring Boot · 15",
      title: "Logging (Günlükleme)",
      sub: "SLF4J API + Logback ile yapılandırılmış, seviyeli, izlenebilir günlükleme.",
      blocks: [
        { type: "code", cap: "Parametreli (tembel) log", code: `private static final Logger log = LoggerFactory.getLogger(UrunServisi.class);

log.info("Ürün bulundu: id={}, ad={}", id, ad);   // {} ile, string birleştirme YOK
log.debug("Detay payload: {}", buyukNesne);        // DEBUG kapalıysa hiç hesaplanmaz` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Üretimde seviye INFO; bir hata araştırırken belirli paketi runtime'da DEBUG'a çekersin (Actuator/Boot Admin ile). JSON loglama + `traceId` (MDC), mikroservislerde tek isteğin tüm loglarını birbirine bağlar." },
        { type: "qa", items: [
          { q: "Neden `\"x=\" + deger` yerine `\"x={}\", deger`?", a: "Parametreli biçim, log seviyesi kapalıysa string'i **hiç oluşturmaz** (performans) ve enjeksiyon/biçim hatalarını azaltır. Üretimde önemli fark yaratır." },
          { q: "Log seviyeleri sırası?", a: "TRACE < DEBUG < INFO < WARN < ERROR. Seçtiğin seviye ve üstü yazılır; üretimde genelde INFO, sorun ararken DEBUG." }
        ] }
      ]
    },
    /* 16 */
    {
      nav: "16 · REST Tüketimi", eyebrow: "Spring Boot · 16 · 1/2",
      title: "REST Tüketimi: İstemci Seçenekleri",
      sub: "Başka API'leri çağırıp yanıtı işle. Bugün topluluk dört yola yöneliyor: <b>RestClient</b>, <b>HTTP Interface</b>, <b>WebClient</b>, (Spring Cloud) <b>OpenFeign</b>. RestTemplate ise <b>bakım modunda</b>.",
      blocks: [
        {
          type: "table",
          headers: ["İstemci", "Tür", "Durum", "Ne zaman"],
          rows: [
            ["**RestClient**", "Senkron, akıcı", "✅ Modern varsayılan (Boot 3.2+)", "Bloklayan kod, çoğu servis çağrısı"],
            ["**HTTP Interface** (`@HttpExchange`)", "Deklaratif (native Spring)", "✅ Önerilen", "Temiz, test edilebilir istemci arayüzü"],
            ["**WebClient**", "Reaktif, non-blocking", "Aktif", "WebFlux stack, streaming, backpressure"],
            ["**OpenFeign** (Spring Cloud)", "Deklaratif", "🟡 Yaygın ama yavaşlıyor", "Mevcut Eureka/Feign ekosistemi"],
            ["**RestTemplate**", "Senkron, eski", "🟡 Bakım modu", "Legacy kod (yeni projede kullanma)"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "RestClient — akıcı, hata yönetimli" },
            { type: "code", cap: "Topluluğun yeni senkron varsayılanı", code: `RestClient client = RestClient.builder()
    .baseUrl("https://api.banka.com").build();

Urun u = client.get().uri("/urun/{id}", id)
    .retrieve()
    .onStatus(s -> s.is4xxClientError(),
        (req, res) -> { throw new YokHatasi(); })
    .body(Urun.class);` }
          ],
          right: [
            { type: "heading", text: "HTTP Interface — deklaratif (Feign'in native Spring hâli)" },
            { type: "code", cap: "Arayüz tanımla, Spring implementasyonu üretsin", code: `interface UrunIstemci {
    @GetExchange("/urun/{id}")
    Urun getir(@PathVariable Long id);
}
// RestClient (veya WebClient) ile bağla:
var factory = HttpServiceProxyFactory
    .builderFor(RestClientAdapter.create(restClient))
    .build();
UrunIstemci istemci = factory.createClient(UrunIstemci.class);` }
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🧭",
          text: "**Topluluk önerisi (özet):** Yeni senkron kodda **RestClient**; birden çok endpoint'i temiz tutmak için onun üzerine **HTTP Interface (`@HttpExchange`)**. Gerçekten reaktif/streaming gerekiyorsa **WebClient**. Feign yeni projede önerilmiyor; native HTTP Interface ileriye dönük yol. RestTemplate'i yeni kodda kullanma."
        },
        {
          type: "qa", items: [
            { q: "RestTemplate öldü mü?", a: "Resmen \"deprecated\" değil ama **bakım modunda** — yeni özellik almıyor. Mevcut kodda çalışmaya devam eder; **yeni kodda RestClient** (senkron) veya WebClient (reaktif) kullan." },
            { q: "HTTP Interface (`@HttpExchange`) ile OpenFeign farkı?", a: "İkisi de deklaratif istemci (arayüz yazarsın, implementasyon üretilir). `@HttpExchange` **Spring'in yerleşik** özelliğidir (ek bağımlılık yok, RestClient/WebClient ile çalışır). Feign Spring Cloud'a aittir ve momentum kaybediyor; yeni projede HTTP Interface tercih edilir." }
          ]
        }
      ]
    },
    /* 16b — Üretimde REST tüketimi */
    {
      nav: "16 · REST · Dayanıklılık", eyebrow: "Spring Boot · 16 · 2/2",
      title: "Üretimde REST Tüketimi: Dayanıklılık & Pratikler",
      sub: "Dış çağrı = ağ = belirsizlik. Yavaş/çöken bir bağımlılık <b>tüm sistemini kilitleyebilir</b>. Bu yüzden her dış çağrı korunmalı.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "⏱️", label: "Timeout", text: "Connect + read zaman aşımı <b>zorunlu</b>. Yoksa thread sonsuza bekler, havuz dolar, uygulama düşer." },
            { ico: "🔁", label: "Retry + Breaker", text: "Geçici hatada **Resilience4j** retry; sürekli hatada circuit breaker açılıp <b>fallback</b> döner." },
            { ico: "🏊", label: "Connection Pool", text: "Apache HttpClient / Reactor Netty ile bağlantı havuzu; her çağrıda yeni bağlantı açma." },
            { ico: "📊", label: "Observability", text: "RestClient/WebClient **Micrometer** ile otomatik izlenir: süre, hata oranı, trace yayılımı." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Zaman aşımı + dayanıklılık" },
            { type: "code", cap: "Resilience4j ile sarmala", code: `RestClient client = RestClient.builder()
  .baseUrl("https://api.kargo.com")
  .requestFactory(ClientHttpRequestFactoryBuilder.detect()
      .build(ClientHttpRequestFactorySettings.defaults()
          .withConnectTimeout(Duration.ofSeconds(2))
          .withReadTimeout(Duration.ofSeconds(5))))
  .build();

@CircuitBreaker(name = "kargo", fallbackMethod = "yedek")
@Retry(name = "kargo")
public Kargo getir(Long id) {
    return client.get().uri("/{id}", id).retrieve().body(Kargo.class);
}
public Kargo yedek(Long id, Throwable t) { return Kargo.tahmini(); }` }
          ],
          right: [
            { type: "callout", variant: "real", icon: "🧵", text: "**Virtual Threads etkisi (Java 21+ / Boot 3.2+):** Sanal thread'lerle <b>bloklayan</b> RestClient binlerce eşzamanlı çağrıda rahat ölçeklenir. Yani \"sırf eşzamanlılık için WebClient\" gerekçesi büyük ölçüde ortadan kalktı — WebClient'ı artık <b>gerçekten</b> streaming/backpressure gerektiğinde kullan." },
            { type: "bullets", title: "En iyi pratikler", items: ["Her dış çağrıya **timeout + circuit breaker**", "DTO'ya bağla, sağlayıcının ham modeline değil", "Hataları `onStatus` ile anlamlı exception'a çevir", "Idempotent olmayan çağrıda (ödeme) **retry'a dikkat** (idempotency key)", "Sırrı/anahtarı başlıkta, koda gömme"] }
          ]
        },
        {
          type: "qa", items: [
            { q: "2025+ topluluğunda RestClient mi WebClient mi öneriliyor?", a: "Senkron (klasik MVC) uygulamalarda **RestClient** + virtual threads baskın öneri. WebClient'ı yalnızca reaktif stack (WebFlux), **streaming** (SSE, büyük akış) veya gerçek **backpressure** ihtiyacında seç. \"Eşzamanlılık için reactive\" gerekçesi virtual thread'lerle zayıfladı." },
            { q: "Her dış çağrıya circuit breaker şart mı?", a: "Kritik bağımlılıklarda **evet** (ödeme, kargo, 3. parti). Çok stabil iç servislerde en azından **timeout + retry** olmalı. Amaç: bir bağımlılığın çökmesi senin servisini de düşürmesin (cascading failure)." },
            { q: "Retry her zaman güvenli mi?", a: "Sadece **idempotent** çağrılarda (GET, ya da idempotency-key ile korunan POST). Aksi halde retry **çift işlem** (çift tahsilat) yaratır. Yalnızca geçici hatalarda (timeout, 503) ve sınırlı sayıda dene." }
          ]
        }
      ]
    },
    /* 17 */
    {
      nav: "17 · Dosya İşleme", eyebrow: "Spring Boot · 17",
      title: "Dosya İşleme (Upload/Download)",
      sub: "`MultipartFile` ile yükleme, `Resource`/`byte[]` ile indirme; boyut ve güvenlik denetimi.",
      blocks: [
        { type: "code", cap: "Yükleme + indirme", code: `@PostMapping("/yukle")
String yukle(@RequestParam MultipartFile dosya) throws IOException {
    if (dosya.getSize() > 5_000_000) throw new CokBuyuk();
    Files.copy(dosya.getInputStream(), hedefYolu(dosya)); return "ok";
}
@GetMapping("/indir/{ad}")
ResponseEntity<Resource> indir(@PathVariable String ad) { ... } // Content-Disposition: attachment` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Profil fotoğrafı, fatura PDF'i, CSV import. Üretimde dosyalar sunucu diskine değil **nesne deposuna (S3/GCS)** yazılır; MIME tipi doğrulanır ve dosya adı temizlenir (path traversal saldırısına karşı)." },
        { type: "qa", items: [
          { q: "Yüklenen dosyayı sunucu diskine yazmak güvenli mi?", a: "Ölçeklenmez (çok sunucuda paylaşılmaz) ve risklidir. Üretimde **S3/GCS** gibi nesne deposu kullan; dosya adını sen üret, kullanıcının verdiği adı doğrudan kullanma." },
          { q: "Büyük dosyalarda dikkat?", a: "`spring.servlet.multipart.max-file-size` ile sınır koy, stream'le (belleğe tüm dosyayı yükleme), ve mümkünse doğrudan-yükleme (presigned URL) ile backend'i baypas et." }
        ] }
      ]
    },
    /* 18 */
    {
      nav: "18 · i18n", eyebrow: "Spring Boot · 18",
      title: "Uluslararasılaştırma (i18n)",
      sub: "Mesajları dil paketlerine (`messages_tr.properties`, `messages_en.properties`) çıkararak çok dilli uygulama.",
      blocks: [
        { type: "code", cap: "MessageSource + Locale", code: `# messages_tr.properties
hosgeldin=Merhaba {0}, hoş geldin!
# messages_en.properties
hosgeldin=Hello {0}, welcome!

String m = messageSource.getMessage("hosgeldin", new Object[]{ad}, locale);` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Aynı uygulama TR ve EN kullanıcıya kendi dilinde hata mesajı ve arayüz metni gösterir. Dil, `Accept-Language` başlığından veya kullanıcı tercihinden (`LocaleResolver`) belirlenir; metin kodda değil dosyada durur." },
        { type: "qa", items: [
          { q: "Dil nasıl belirleniyor?", a: "`LocaleResolver` ile: `Accept-Language` başlığı, oturum/çerez veya `?lang=tr` parametresi. Kullanıcı tercihini çerez/DB'de saklayıp her istekte uygulamak yaygındır." }
        ] }
      ]
    },
    /* 20 */
    {
      nav: "20 · OAuth2 & JWT", eyebrow: "Spring Boot · 20 · 1/2",
      title: "JWT: Yapı, Üretim ve Doğrulama",
      sub: "JWT = <b>imzalı</b> kimlik kartı. Login'de üretilir, her istekte `Authorization: Bearer` ile taşınır, sunucu <b>oturum tutmaz</b> — sadece imzayı doğrular (stateless).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🏷️", label: "Header", text: "İmza algoritması + tip. Ör. `{ alg: HS256, typ: JWT }`." },
            { ico: "📦", label: "Payload (claims)", text: "`sub` (kim), `exp` (bitiş), roller... <b>İmzalı ama şifresiz</b> — herkes okur, kimse değiştiremez. Sır koyma!" },
            { ico: "🔏", label: "Signature", text: "Gizli/özel anahtarla imza. Tek harf değişse imza tutmaz → <b>değiştirilemezlik</b>." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "1) Üretim (login sonrası)" },
            { type: "code", cap: "jjwt ile imzalı token", code: `String token = Jwts.builder()
    .subject(kullanici)
    .claim("rol", "ADMIN")
    .expiration(new Date(now + 3600_000))   // 1 saat
    .signWith(KEY).compact();
// İstemci saklar, her istekte:
// Authorization: Bearer <token>` }
          ],
          right: [
            { type: "heading", text: "2) Doğrulama (her istekte, filter)" },
            { type: "code", cap: "Bearer'ı çöz, imzayı doğrula, kimliği kur", code: `@Component
class JwtFilter extends OncePerRequestFilter {
  protected void doFilterInternal(HttpServletRequest req,
        HttpServletResponse res, FilterChain chain) throws ... {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")) {
      try {
        Claims c = Jwts.parser().verifyWith(KEY).build()
            .parseSignedClaims(h.substring(7)).getPayload();
        var auth = new UsernamePasswordAuthenticationToken(
            c.getSubject(), null,
            List.of(new SimpleGrantedAuthority("ROLE_" + c.get("rol"))));
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (JwtException e) { res.setStatus(401); return; }
    }
    chain.doFilter(req, res);
  }
}` }
          ]
        },
        {
          type: "code", cap: "Stateless SecurityFilterChain — JWT filter'ı zincire ekle", code: `@Bean SecurityFilterChain chain(HttpSecurity http, JwtFilter jwt) throws Exception {
  return http
    .csrf(c -> c.disable())
    .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))   // oturum YOK
    .authorizeHttpRequests(a -> a
        .requestMatchers("/auth/**").permitAll()
        .anyRequest().authenticated())
    .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
    .build();
}`
        },
        {
          type: "qa", items: [
            { q: "JWT şifreli mi, içine ne koyabilirim?", a: "**İmzalı ama şifresiz** (Base64). İçeriği herkes okur, kimse değiştiremez. İçine parola/kişisel sır **koyma**; yalnızca kimlik (`sub`), roller ve `exp` koy." },
            { q: "Token çalınırsa? Nasıl iptal ederim?", a: "Stateless JWT süresi dolana dek geçerlidir, kolay iptal edilemez. Bu yüzden **kısa ömürlü access token + refresh token** kullanılır; acil iptal için kara liste / token-versiyonu eklenir. **HTTPS zorunlu.**" },
            { q: "Neden stateless (oturumsuz)?", a: "Sunucu oturum tutmadığı için API **yatay ölçeklenir** — istek hangi sunucuya düşerse düşsün token kendi kendini doğrular. SPA ve mobil uygulamalar için idealdir." }
          ]
        }
      ]
    },
    /* 20b — OAuth2 */
    {
      nav: "20 · OAuth2 · Roller & Akış", eyebrow: "Spring Boot · 20 · 2/2",
      title: "OAuth2 / OIDC: Roller, Akış ve Spring",
      sub: "OAuth2 bir <b>yetkilendirme protokolüdür</b> (OIDC üstüne kimlik ekler). Kimliği ayrı bir <b>sunucu</b> doğrular; uygulaman token'ı doğrulayan <b>Resource Server</b> olur.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🏛️", label: "Authorization Server", text: "Kimliği doğrular, token üretir (IdP: Keycloak/Okta/Entra ID veya Spring Authorization Server)." },
            { ico: "🛡️", label: "Resource Server", text: "Senin API'n. Gelen token'ın imza/issuer/exp'sini doğrular, yetkiyi uygular." },
            { ico: "📱", label: "Client", text: "Token isteyen uygulama (SPA, mobil, başka servis)." },
            { ico: "👤", label: "Resource Owner", text: "Kullanıcı — verisine erişim için izin veren kişi." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "bullets", title: "Authorization Code akışı (özet)", items: ["Kullanıcı Client'ta \"Giriş\"e tıklar → Auth Server'a yönlenir", "Orada giriş yapar (+MFA) → Client'a **code** döner", "Client, code'u **token** ile değiştirir (access + refresh)", "Client her istekte access token'ı API'ye taşır", "API (Resource Server) token'ı doğrular → erişim"] }
          ],
          right: [
            { type: "heading", text: "Spring = Resource Server (IdP token'ı doğrula)" },
            { type: "code", cap: "Kendi JWT'ini üretme — IdP'ninkini doğrula", code: `# application.yml
spring.security.oauth2.resourceserver.jwt
   .issuer-uri: https://idp.sirket.com/realms/app

@Bean SecurityFilterChain chain(HttpSecurity http) throws Exception {
  return http
    .authorizeHttpRequests(a -> a.anyRequest().authenticated())
    .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
    .build();   // imza + issuer + exp OTOMATİK doğrulanır
}` }
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🧭",
          text: "**Topluluk önerisi:** Kendi login/JWT altyapını sıfırdan yazmak yerine kimliği bir **IdP'ye** (Keycloak/Okta/Entra ID) veya **Spring Authorization Server**'a devret; uygulaman **Resource Server** olarak yalnızca token doğrulasın. MFA, refresh, sosyal giriş, token rotasyonu hazır ve güvenli gelir. (Bkz. Security · Alternatifler slaytı.)"
        },
        {
          type: "qa", items: [
            { q: "OAuth2 ile JWT'nin ilişkisi ne?", a: "Farklı şeyler ama birlikte çalışır. **OAuth2** token alma **protokolü**; **JWT** ise token'ın yaygın **formatı**. OAuth2 access token'ı çoğunlukla bir JWT'dir (ya da \"opaque\" — sunucuya sorulan). JWT tek başına da (OAuth2'siz) kullanılabilir." },
            { q: "Access token ile refresh token farkı?", a: "**Access token** kısa ömürlüdür (dk), her istekte taşınır. **Refresh token** uzun ömürlüdür, yalnızca yeni access token almak için Auth Server'a gönderilir. Böylece access çalınsa bile kısa sürede geçersiz olur." },
            { q: "Kendi JWT login'imi mi yazmalıyım, OAuth2/IdP mi?", a: "Küçük/tek uygulamada kendi JWT'in (1/2 slaytındaki gibi) yeterli ve basittir. **SSO, çok uygulama, sosyal giriş, MFA, kurumsal uyumluluk** gerekiyorsa OAuth2/OIDC + IdP doğru seçimdir — güvenliğin zor kısmını uzmanına bırakırsın." }
          ]
        }
      ]
    },
    /* 21 */
    {
      nav: "21 · Annotations", eyebrow: "Spring Boot · 21 · 1/2",
      title: "Anotasyonlar: Bean, DI ve Web",
      sub: "Spring'in \"yapılandırma yerine anotasyon\" felsefesinin temel yapı taşları. Hepsi <b>reflection ile çalışma zamanında</b> okunur (bkz. Reflection konusu).",
      blocks: [
        {
          type: "table",
          headers: ["Anotasyon", "Görevi"],
          rows: [
            ["`@Component` / `@Service` / `@Repository`", "Sınıfı bean yap (anlamsal etiketler; tarama ile bulunur)"],
            ["`@Configuration` + `@Bean`", "Java-config ile elle bean üret (3. parti sınıflar için ideal)"],
            ["`@Autowired`", "Bağımlılık enjekte et (tek constructor'da gereksiz)"],
            ["`@Qualifier` / `@Primary`", "Aynı tipte birden çok bean'i ayır"],
            ["`@Value`", "Property/SpEL ifadesi enjekte et"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Bean + DI örneği" },
            { type: "code", cap: "Tarama ve enjeksiyon", code: `@Service
class SiparisServisi {
  private final OdemeSaglayici odeme;
  // tek ctor → @Autowired gerekmez
  SiparisServisi(@Qualifier("iyzico") OdemeSaglayici o) {
    this.odeme = o;
  }
}
@Component("iyzico") class Iyzico implements OdemeSaglayici {}

@Configuration
class Config {
  @Bean RestClient restClient() { return RestClient.create(); }
}` }
          ],
          right: [
            { type: "heading", text: "Web (MVC) anotasyonları" },
            { type: "code", cap: "Eşleme + parametre bağlama", code: `@RestController
@RequestMapping("/api/urunler")
class UrunController {
  @GetMapping("/{id}")                       // GET /api/urunler/5
  Urun getir(@PathVariable Long id) { ... }

  @GetMapping                                // ?sayfa=2
  List<Urun> liste(@RequestParam(defaultValue="0") int sayfa) { ... }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)        // 201
  Urun ekle(@RequestBody @Valid UrunDto dto) { ... }
}` }
          ]
        },
        {
          type: "qa", items: [
            { q: "`@Component`, `@Service`, `@Repository` farkı?", a: "Üçü de bean tanımlar; ayrım **anlamsaldır** (okunabilirlik/katman niyeti). `@Repository` ayrıca DB istisnalarını Spring'in `DataAccessException`'ına çevirir. `@Service` iş mantığını işaret eder." },
            { q: "Anotasyonlar nasıl \"çalışıyor\" — sihir mi?", a: "Hayır. Spring başlangıçta **reflection** ile sınıfları tarar, anotasyonları (RUNTIME retention) okur ve buna göre bean üretir/enjekte eder/eşleme yapar. Anotasyon yalnızca meta-veridir; işi Spring'in altyapısı yapar." }
          ]
        }
      ]
    },
    /* 21b — Davranış/Config/Test anotasyonları */
    {
      nav: "21 · Annotations · Davranış", eyebrow: "Spring Boot · 21 · 2/2",
      title: "Anotasyonlar: Davranış, Config ve Test",
      sub: "Çapraz kesen davranışlar (transaction, cache, async), koşullu yapılandırma ve test — hepsi anotasyonla.",
      blocks: [
        {
          type: "table",
          headers: ["Anotasyon", "Görevi"],
          rows: [
            ["`@Transactional`", "Metodu tek transaction'da çalıştır (commit/rollback)"],
            ["`@Cacheable` / `@CacheEvict`", "Sonucu önbelleğe al / önbelleği temizle"],
            ["`@Async` / `@Scheduled`", "Arka planda çalıştır / zamanla (cron)"],
            ["`@Profile` / `@ConditionalOnMissingBean`", "Ortama/koşula göre bean aktive et"],
            ["`@ConfigurationProperties`", "`application.yml`'i tip-güvenli nesneye bağla"],
            ["`@Valid` + `@RestControllerAdvice`", "Girdi doğrula + global hata yönet"],
            ["`@PreAuthorize`", "Metot seviyesinde yetki denetimi"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Davranış anotasyonları", code: `@Service
class RaporServisi {
  @Transactional(readOnly = true)
  List<Rapor> listele() { ... }

  @Cacheable("kurlar")
  Kur kurGetir(String kod) { ... }

  @Async
  CompletableFuture<Void> mailGonder() { ... }

  @Scheduled(cron = "0 0 3 * * *")   // her gece 03:00
  void geceBakim() { ... }
}` }
          ],
          right: [
            { type: "code", cap: "Config & koşul", code: `@Profile("prod")          // sadece üretimde
@Component class GercekMail implements Mail {}

@Bean
@ConditionalOnMissingBean   // kullanıcı tanımlamadıysa
Mail varsayilanMail() { return new SahteMail(); }

@ConfigurationProperties("odeme")
record OdemeConfig(Duration zamanAsimi, int deneme) {}` }
          ]
        },
        {
          type: "callout", variant: "key", icon: "🧩",
          text: "**Meta-anotasyon — `@SpringBootApplication`:** tek başına üç anotasyonu birleştirir → `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`. Spring'de çoğu anotasyon böyle <b>başka anotasyonlardan bestelenir</b> (ör. `@RestController` = `@Controller` + `@ResponseBody`)."
        },
        {
          type: "tags", items: ["Test: `@SpringBootTest`", "`@WebMvcTest`", "`@DataJpaTest`", "`@MockBean`", "Etkinleştirme: `@EnableCaching`", "`@EnableAsync`", "`@EnableScheduling`", "`@EnableMethodSecurity`"] },
        {
          type: "qa", items: [
            { q: "Bu kadar anotasyon ezberlenir mi?", a: "Ezber değil — her biri bir niyeti ifade eder. **Kategorilere ayır** (bean tanımı, DI, web, davranış, config, test); mantığı kavrarsın, gerisi kullanımla yerleşir." },
            { q: "`@Transactional`/`@Cacheable`/`@Async` neden bazen çalışmıyor?", a: "Hepsi **proxy-tabanlıdır**: aynı sınıf içinden `this.method()` çağrısı proxy'yi atlar (self-invocation) → anotasyon devreye girmez. Metodu başka bean'e taşı veya enjekte edilmiş proxy üzerinden çağır." },
            { q: "Kendi anotasyonumu yazabilir miyim?", a: "Evet — birkaç anotasyonu tek bir **meta-anotasyonda** birleştirebilirsin (ör. `@Transactional + @Service` içeren özel `@TxServisi`). Ayrıca AOP ile kendi anotasyonuna davranış bağlayabilirsin (loglama, ölçüm)." }
          ]
        }
      ]
    },
    /* 22 */
    {
      nav: "22 · Gömülü Sunucu", eyebrow: "Spring Boot · 22",
      title: "Gömülü Sunucu (Tomcat Port & Ayarlar)",
      sub: "Varsayılan gömülü Tomcat (veya Jetty/Undertow) uygulamayı `.jar` olarak çalıştırır; ayrı sunucu kurmana gerek yok.",
      blocks: [
        { type: "code", cap: "application.yml sunucu ayarları", code: `server.port=9090
server.servlet.context-path=/app
server.tomcat.threads.max=200
server.shutdown=graceful   # nazik kapanış (mevcut istekleri bitir)` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Konteynerde her servis kendi gömülü sunucusuyla `java -jar` ile başlar; `graceful` shutdown sayesinde deploy/scale-down sırasında işlenen istekler yarıda kesilmez." },
        { type: "qa", items: [
          { q: "Tomcat, Jetty, Undertow hangisi?",
            a: "Tomcat varsayılan ve en yaygındır. Undertow düşük bellek/yüksek eşzamanlılıkta iyi olabilir. Çoğu uygulama için Tomcat'te kalmak doğrudur; starter değiştirerek geçilir." }
        ] }
      ]
    },
    /* 23 */
    {
      nav: "23 · Eureka Server", eyebrow: "Spring Boot · 23 · Cloud",
      title: "Eureka — Servis Keşfi (Server)",
      sub: "Mikroservisler dinamik ölçeklenirken birbirlerini <b>adres yazmadan</b> bulmasını sağlayan merkezi kayıt defteri.",
      blocks: [
        { type: "code", cap: "Eureka Server (8761)", code: `@EnableEurekaServer
@SpringBootApplication
class EurekaApp { ... }
# application.yml
eureka.client.register-with-eureka: false
eureka.client.fetch-registry: false` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Sipariş servisi 3 kopyaya ölçeklendi; IP'leri sürekli değişiyor. Eureka'ya kaydoldukları için diğer servisler onları \"siparis-servisi\" adıyla bulur; ölen kopya heartbeat kesilince otomatik listeden düşer." },
        { type: "qa", items: [
          { q: "Kubernetes varken Eureka'ya gerek var mı?", a: "K8s kendi servis keşfini (Service/DNS) sunar; orada Eureka genelde gereksizdir. Eureka, K8s dışı (VM/klasik) Spring Cloud ortamlarında veya istemci-tarafı yük dengeleme istenen yerlerde kullanılır." }
        ] }
      ]
    },
    /* 24 */
    {
      nav: "24 · Eureka · FeignClient", eyebrow: "Spring Boot · 24 · Cloud · 1/2",
      title: "FeignClient: Deklaratif Servis Çağrısı",
      sub: "Servisi `spring.application.name` ile kaydet; başka servisi <b>adıyla</b> çağır. Feign = REST istemcisini <b>arayüz yazarak</b> tanımlama (implementasyonu Spring üretir).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "📝", label: "Deklaratif", text: "Arayüz + anotasyon yazarsın; HTTP çağrı kodunu Feign üretir. Boilerplate yok." },
            { ico: "⚖️", label: "Eureka + LoadBalancer", text: "`name` → Eureka'dan canlı kopya listesi; istemci-tarafı load balancer birini seçer." },
            { ico: "🎫", label: "RequestInterceptor", text: "Her isteğe ortak başlık (JWT/trace-id) eklemek için merkezî nokta." },
            { ico: "🛟", label: "Dayanıklılık", text: "Resilience4j ile `fallback`, retry, circuit breaker entegre edilir." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Adıyla çağrı + fallback", code: `@FeignClient(name = "odeme-servisi",
             fallback = OdemeFallback.class)
interface OdemeIstemci {
    @GetMapping("/api/odeme/{id}")
    Odeme getir(@PathVariable Long id);
}
@Component
class OdemeFallback implements OdemeIstemci {
    public Odeme getir(Long id) { return Odeme.bilinmiyor(); }
}` }
          ],
          right: [
            { type: "code", cap: "Her isteğe token taşı (interceptor)", code: `@Bean
RequestInterceptor authRelay() {
    return template -> {
        var t = mevcutToken();             // gelen isteğin JWT'si
        template.header("Authorization", "Bearer " + t);
    };
}
# application.yml — Feign zaman aşımı
spring.cloud.openfeign.client.config.default.connectTimeout: 2000
spring.cloud.openfeign.client.config.default.readTimeout: 5000` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Sipariş servisi ödeme servisinin IP/portunu bilmez — yalnızca `odeme-servisi` adını çağırır. Eureka + load balancer isteği canlı kopyalardan birine yönlendirir; servis ölçeklenir/taşınırken kod değişmez."
        },
        {
          type: "qa", items: [
            { q: "Feign çağrısı başarısız olursa ne olur?", a: "`fallback` tanımlıysa yedek yanıt döner. Ayrıca **Resilience4j** (retry + circuit breaker) ile sarmalanmalı — aksi halde bir servisin çökmesi çağıranı da kilitler (cascading failure)." },
            { q: "Feign yük dengelemeyi nasıl yapıyor?", a: "**İstemci-tarafı** load balancing: Eureka'dan servisin tüm canlı kopyalarını alır, Spring Cloud LoadBalancer her çağrıda birini seçer (round-robin vb.). Ayrı bir load balancer cihazı gerekmez." }
          ]
        }
      ]
    },
    /* 24b — Güncel durum & alternatifler */
    {
      nav: "24 · Feign · Güncel Durum & Alternatifler", eyebrow: "Spring Boot · 24 · Cloud · 2/2",
      title: "Feign'in Bugünkü Durumu ve Alternatifleri",
      sub: "Feign hâlâ yaygın ama sektör yön değiştiriyor: Netflix yığını küçülüyor, Spring <b>native HTTP Interface</b>'e yöneliyor, Kubernetes/<b>service mesh</b> işi altyapıya taşıyor.",
      blocks: [
        {
          type: "callout", variant: "info", icon: "📰",
          text: "**Güncel yorum:** Netflix OSS yığını (Ribbon, Hystrix, orijinal Feign) <b>bakım/EOL</b>'de. Spring Cloud OpenFeign hâlâ <b>destekleniyor ve çok kullanılıyor</b>, ama Spring ekibi yeni kod için <b>Interface Clients / `@HttpExchange`</b>'i öneriyor. Büyük ölçekte ise keşif/yük-dengeleme/retry/mTLS giderek <b>Kubernetes + service mesh</b> (Istio/Linkerd) katmanına kayıyor."
        },
        {
          type: "table",
          headers: ["Alternatif", "Tür", "Ne zaman"],
          rows: [
            ["**HTTP Interface** (`@HttpExchange`)", "Deklaratif, native Spring", "✅ Yeni projede Feign yerine"],
            ["**RestClient** `@LoadBalanced`", "İmperatif, akıcı", "Basit, doğrudan çağrı"],
            ["**gRPC**", "Sözleşme-öncelikli, ikili", "Yüksek performans, servisler-arası"],
            ["**Async / Kafka**", "Olay-tabanlı", "Gevşek bağ, anlık yanıt gerekmiyorsa"],
            ["**Service Mesh** (Istio)", "Altyapı katmanı", "K8s'te keşif/retry/mTLS'i koddan çıkar"]
          ]
        },
        {
          type: "twocol",
          pos: { title: "Feign'in artıları", items: ["Çok az kod — temiz, okunabilir arayüz", "Eureka + load balancer + Resilience4j ile sıkı entegrasyon", "Olgun, geniş örnek/topluluk birikimi", "Mevcut Spring Cloud mikroservislerinde standart"] },
          neg: { title: "Eksileri / dikkat", items: ["Netflix yığınına ve **Spring Cloud sürüm uyumuna** bağımlı", "Momentum **native HTTP Interface**'e kayıyor", "Senkron/bloklayan; reaktif için ek WebClient gerekir", "K8s + service mesh varsa **katman tekrarı** olabilir"] }
        },
        {
          type: "code", cap: "Native alternatif — HTTP Interface + load balancing", code: `interface OdemeIstemci {
    @GetExchange("/api/odeme/{id}")
    Odeme getir(@PathVariable Long id);
}
// @LoadBalanced RestClient.Builder ile "odeme-servisi" adına çağrı:
var adapter = RestClientAdapter.create(
    loadBalancedBuilder.baseUrl("http://odeme-servisi").build());
var istemci = HttpServiceProxyFactory.builderFor(adapter).build()
    .createClient(OdemeIstemci.class);`
        },
        {
          type: "qa", items: [
            { q: "Feign öldü mü, mevcut projemden sökmeli miyim?", a: "Hayır — Spring Cloud OpenFeign **destekleniyor**; çalışan kodu sökmeye gerek yok. Ama **yeni** istemcilerde Spring'in native **HTTP Interface (`@HttpExchange`)**'ini tercih et; ileriye dönük yol orası." },
            { q: "Kubernetes kullanıyorsam Eureka + Feign'e gerek var mı?", a: "Çoğunlukla hayır. K8s'in kendi **servis keşfi (DNS/Service)** ve **service mesh** (Istio/Linkerd) yük dengeleme, retry, mTLS, circuit breaking'i **altyapıda** çözer. O zaman uygulama düz HTTP (RestClient/HTTP Interface) yapar, gerisini mesh halleder." },
            { q: "gRPC ne zaman REST/Feign yerine geçer?", a: "Servisler-arası **yüksek performans**, düşük gecikme, sıkı **sözleşme** (protobuf) ve streaming gerektiğinde. Dış/tarayıcı API'lerinde ve basit entegrasyonlarda REST hâlâ daha pratik ve yaygındır." }
          ]
        }
      ]
    },
    /* 25 */
    {
      nav: "25 · API Gateway", eyebrow: "Spring Boot · 25 · Cloud · 1/2",
      title: "API Gateway: Kavramlar ve Yapılandırma",
      sub: "Tüm istemcilerin <b>tek giriş kapısı</b>. İstekleri doğru servise yönlendirir; kimlik, hız sınırı, CORS, retry gibi <b>ortak işleri tek yerde</b> yapar — iç topoloji dışarı sızmaz.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🗺️", label: "Route", text: "Bir hedef (`uri`) + eşleşme + filtreler. `lb://servis` ile Eureka'dan yük-dengeli." },
            { ico: "🎯", label: "Predicate", text: "İsteğin bu route'a gidip gitmeyeceği: `Path`, `Method`, `Header`, `Host`..." },
            { ico: "🔧", label: "Filter", text: "İstek/yanıtı değiştir: başlık ekle, yol yaz, **rate-limit**, **circuit breaker**, auth." },
            { ico: "🧩", label: "Tek yerde", text: "Auth, CORS, hız sınırı, loglama, trace — her serviste tekrar yerine merkezde." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Çok route + filtreler (yaml)", code: `spring.cloud.gateway.routes:
  - id: siparis
    uri: lb://siparis-servisi          # Eureka'dan load-balanced
    predicates:
      - Path=/api/siparis/**
    filters:
      - StripPrefix=1
      - name: RequestRateLimiter        # Redis tabanlı hız sınırı
        args:
          redis-rate-limiter.replenishRate: 10
          redis-rate-limiter.burstCapacity: 20
      - name: CircuitBreaker
        args:
          name: siparisCB
          fallbackUri: forward:/fallback/siparis` }
          ],
          right: [
            { type: "code", cap: "Global kimlik filtresi (Java)", code: `@Bean
GlobalFilter authFilter() {
  return (exchange, chain) -> {
    String t = exchange.getRequest()
        .getHeaders().getFirst("Authorization");
    if (!gecerli(t)) {
      exchange.getResponse()
          .setStatusCode(HttpStatus.UNAUTHORIZED);
      return exchange.getResponse().setComplete();  // KES
    }
    return chain.filter(exchange);                    // devam
  };
}` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Mobil uygulama 10 mikroservisin adresini bilmez — yalnızca gateway'i bilir. Gateway token'ı doğrular, hız sınırı uygular, `/api/siparis/**`'ı sipariş servisine yönlendirir. Bir servis çökerse `fallbackUri` devreye girer."
        },
        {
          type: "qa", items: [
            { q: "Gateway ile load balancer farkı?", a: "Load balancer (L4) trafiği dağıtır. **API Gateway (L7)** ayrıca path/header'a göre yönlendirme, kimlik, hız sınırı, dönüştürme, toplama yapar — uygulama-farkında bir giriş katmanıdır." },
            { q: "Spring Cloud Gateway reaktif mi, bloklayan mı?", a: "Klasik sürüm **WebFlux (reaktif)** üzerinedir — yüksek eşzamanlılık için. Artık bir de **WebMVC sürümü** var (servlet + virtual threads) — reaktif öğrenmeden, bloklayan yığında gateway kurmak isteyenler için." }
          ]
        }
      ]
    },
    /* 25b — Çözümler, artı/eksi, riskler */
    {
      nav: "25 · Gateway · Çözümler & Riskler", eyebrow: "Spring Boot · 25 · Cloud · 2/2",
      title: "Önerilen Çözümler, Artı/Eksi ve Riskler",
      sub: "Gateway tek seçenek değil — Spring-native'den platform-seviyesine ve yönetilen buluta kadar bir yelpaze var. Doğru seçim <b>çalıştığın platforma</b> bağlı.",
      blocks: [
        {
          type: "table",
          headers: ["Çözüm", "Tür", "Ne zaman / yorum"],
          rows: [
            ["**Spring Cloud Gateway**", "Uygulama (Java)", "✅ Spring yığını; route'a özel iş mantığı/filtre gerekiyorsa"],
            ["**K8s Ingress (NGINX)**", "Platform", "Kubernetes'te basit yönlendirme/TLS için fiili standart"],
            ["**Traefik / Kong / APISIX**", "Özel gateway", "Eklenti ekosistemi, rate-limit, auth, gözlemlenebilirlik"],
            ["**AWS API GW / Azure APIM**", "Yönetilen bulut", "Sunucu yönetmeden, serverless/managed mimaride"],
            ["**Service Mesh** (Istio)", "Altyapı (sidecar)", "Servis-içi (east-west) trafik + mTLS; gateway'i tamamlar"]
          ]
        },
        {
          type: "twocol",
          pos: { title: "Artıları", items: ["Tek giriş: kimlik, CORS, hız sınırı, loglama **merkezde**", "İç topolojiyi gizler; istemci tek adres bilir", "Çapraz kesen işleri servislerden çıkarır (DRY)", "Yönlendirme/sürüm/canary trafiğini tek yerden yönetir"] },
          neg: { title: "Eksileri", items: ["Ekstra **ağ sıçraması** → gecikme", "Yeni işletilecek bileşen → operasyon yükü", "Yanlış yapılandırma tüm trafiği etkiler", "Aşırı iş mantığı gateway'i \"dağıtık monolit\" yapar"] }
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Riskler:** ① <b>Tek hata noktası (SPOF)</b> — birden çok kopya + sağlık kontrolü + otomatik ölçek şart. ② <b>Darboğaz</b> — tüm trafik buradan geçer; CPU/bağlantı limitlerini izle. ③ <b>Güvenlik yüzeyi</b> — gateway ele geçerse her şey açılır; sıkı yamala, en az yetki. ④ <b>Gizli kuplaj</b> — iş kuralını gateway'e gömme; o servisin işi."
        },
        {
          type: "callout", variant: "tip", icon: "🧭",
          text: "**Mantıklı varsayılan:** Kubernetes'tesin → kenarda **Ingress/Traefik** (TLS, basit yönlendirme) + gerekiyorsa **service mesh** (mTLS, retry). Route'a özel Java mantığı (token dönüşümü, response toplama, BFF) gerekiyorsa **Spring Cloud Gateway**. Tam yönetilen istiyorsan **bulut API GW**. Aşırı mühendislikten kaçın — küçük sistemde gateway şart değil."
        },
        {
          type: "qa", items: [
            { q: "Gateway'in tek-nokta riski nasıl yönetilir?", a: "Asla tek kopya çalıştırma: **birden çok replika + load balancer önünde + sağlık kontrolü + otomatik ölçek**. Durumsuz (stateless) tut ki herhangi bir kopya isteği karşılayabilsin. K8s'te bu otomatiktir." },
            { q: "BFF (Backend for Frontend) nedir, gateway mi?", a: "BFF, **her istemci tipine** (web/mobil) özel, o arayüze göre veri toplayan/şekillendiren bir gateway türüdür. Genel gateway tek/ortak kapıyken, BFF istemciye özel mantık (response birleştirme) taşır." },
            { q: "Küçük projede gateway şart mı?", a: "Hayır. Birkaç servisli sistemde gateway gereksiz karmaşıklık olabilir; basit reverse-proxy (NGINX) veya doğrudan çağrı yeter. Gateway, **çok servis + ortak çapraz-kesen ihtiyaç** doğunca anlam kazanır." }
          ]
        }
      ]
    },
    /* 26 */
    {
      nav: "26 · Config Server", eyebrow: "Spring Boot · 26 · Cloud",
      title: "Spring Cloud Config Server",
      sub: "Onlarca servisin yapılandırmasını <b>Git tabanlı tek merkezden</b> yönet.",
      blocks: [
        { type: "code", cap: "Config Server (8888)", code: `@EnableConfigServer
@SpringBootApplication
class ConfigApp { ... }
# Git deposundan ayarları sunar:
spring.cloud.config.server.git.uri: https://github.com/sirket/config-repo` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** 20 mikroservisin DB havuz boyutunu değiştirmek için 20 deploy yapmak yerine, Git'teki ortak `application.yml`'i güncellersin; `@RefreshScope` + `/actuator/refresh` ile servisler yeniden başlamadan yeni değeri alır." },
        { type: "qa", items: [
          { q: "Neden Git tabanlı?", a: "Yapılandırma da **kod gibi** sürümlenir: kim, ne zaman, neyi değiştirdi görünür; geri alınabilir (rollback) ve ortamlar (dev/prod) dal/dosya ile ayrılır." }
        ] }
      ]
    },
    /* 27 */
    {
      nav: "27 · Config Client", eyebrow: "Spring Boot · 27 · Cloud",
      title: "Config Client (Merkezi Ayarı Tüketme)",
      sub: "Servis, başlangıçta Config Server'dan ayarlarını çeker; `@RefreshScope` ile çalışırken yeniler.",
      blocks: [
        { type: "code", cap: "Config Server'a bağlan", code: `spring.config.import: "optional:configserver:http://localhost:8888"
# optional: → sunucu erişilemezse uygulama yine başlar` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir özellik bayrağını (feature flag) Config Server'da açtığında, Spring Cloud Bus tüm servislere yenileme olayı yayar; özellik anında, deploy'suz devreye girer." },
        { type: "qa", items: [
          { q: "`optional:` öneki neden önemli?", a: "Config Server geçici erişilemezse uygulamanın **yine de başlamasını** sağlar (zorunlu bağımlılık olmaktan çıkarır) — bu, dayanıklı bir başlangıç için kritiktir." }
        ] }
      ]
    },
    /* 28 */
    {
      nav: "28 · OpenAPI / Swagger", eyebrow: "Spring Boot · 28",
      title: "API Dokümantasyonu (OpenAPI / Swagger)",
      sub: "Controller'lardan <b>otomatik, her zaman güncel</b> API dokümanı üret ve Swagger UI'da gezilebilir/test edilebilir yap.",
      blocks: [
        { type: "code", cap: "springdoc-openapi", code: `// Bağımlılık eklemen yeter; ek anotasyon opsiyonel:
@Operation(summary = "Ürünü id ile getir")
@GetMapping("/{id}")
Urun getir(@PathVariable Long id) { ... }
// UI: /swagger-ui.html   ·   JSON: /v3/api-docs` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Frontend ve mobil ekipleri API'yi Swagger UI'dan keşfeder, canlı dener; OpenAPI JSON'dan istemci kodu (TypeScript/Kotlin) otomatik üretilir. Doküman koddan türediği için <b>asla bayatlamaz</b>." },
        { type: "qa", items: [
          { q: "Swagger UI'ı üretimde açık bırakmalı mıyım?", a: "Genelde hayır ya da kimlik arkasında. İç API'ler için faydalı; halka açık olduğunda yüzey alanını gösterir. Üretimde kapatmak/korumak yaygındır." }
        ] }
      ]
    },
    /* 29 */
    {
      nav: "29 · Boot Admin", eyebrow: "Spring Boot · 29",
      title: "Spring Boot Admin",
      sub: "Actuator verilerini (sağlık, metrik, log, env) görsel bir <b>panoda</b> toplayan yönetim aracı.",
      blocks: [
        { type: "code", cap: "Admin Server", code: `@EnableAdminServer
@SpringBootApplication
class AdminApp { ... }
// Servisler Eureka'dan otomatik keşfedilip izlenir` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir ekip tüm servislerin UP/DOWN durumunu, bellek/CPU metriklerini, canlı loglarını tek ekranda izler; çalışırken bir servisin log seviyesini DEBUG'a çekip sorunu canlı ayıklar." },
        { type: "qa", items: [
          { q: "Boot Admin ile Prometheus+Grafana arasında ne fark var?", a: "Boot Admin hafif, Spring-odaklı, hızlı kurulan bir panodur (anlık durum/log). Prometheus+Grafana zaman-serisi metrik, uzun saklama ve gelişmiş alarм için endüstri standardıdır; büyük sistemlerde ikincisi tercih edilir." }
        ] }
      ]
    },
    /* 30 */
    {
      nav: "30 · Dağıtık Tracing", eyebrow: "Spring Boot · 30 · Cloud · 1/2",
      title: "Dağıtık İzleme: Trace, Span ve Korelasyon",
      sub: "Bir isteğin Gateway → Sipariş → Ödeme → Kargo yolculuğunu <b>uçtan uca</b> izleyip \"nerede yavaşladı/hata verdi?\" sorusunu <b>kanıtla</b> cevapla.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🧵", label: "Trace", text: "Tek bir isteğin tüm yolculuğu. Benzersiz <b>traceId</b> ile işaretlenir." },
            { ico: "📍", label: "Span", text: "Trace içindeki bir iş birimi (bir servis/işlem). `spanId` + parent + süre + etiketler." },
            { ico: "📡", label: "Context Propagation", text: "traceId/spanId servisler arası taşınır — HTTP `traceparent` (W3C) ve Kafka başlıklarıyla." },
            { ico: "🎒", label: "Baggage", text: "Trace boyunca taşınan özel veri (ör. `userId`, `tenant`) — tüm span'lerde erişilir." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "heading", text: "Trace ağacı — darboğaz görünür olur" },
            { type: "code", cap: "Tek isteğin span ağacı", code: `Trace 4af2e1...           (traceId)
├─ gateway              12 ms
│  └─ siparis-servisi  240 ms   ← darboğaz!
│     ├─ odeme-servisi  90 ms
│     └─ kargo-servisi 150 ms   (DB bekledi)
` }
          ],
          right: [
            { type: "heading", text: "Kurulum + log korelasyonu" },
            { type: "code", cap: "Micrometer Tracing (Boot 3+) — yaml", code: `management.tracing.sampling.probability: 0.1   # %10 örnekle
management.zipkin.tracing.endpoint:
    http://zipkin:9411/api/v2/spans

# Loglara traceId/spanId OTOMATİK eklenir (MDC):
logging.pattern.level: "%5p [%X{traceId:-},%X{spanId:-}]"` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** \"Sipariş bazen 4 sn sürüyor\" şikâyeti. Trace ağacında darboğazın ödeme servisindeki dış banka çağrısı olduğu <b>net</b> görünür — tahmin değil, kanıt. Aynı `traceId` ile o isteğin <b>tüm servislerdeki logları</b> birbirine bağlanır."
        },
        {
          type: "qa", items: [
            { q: "Gözlemlenebilirliğin (observability) üç ayağı nedir?", a: "**Metrikler** (Micrometer — sayısal eğilimler: istek/sn, hata oranı), **Loglar** (SLF4J — olay detayı), **Trace'ler** (Micrometer Tracing — isteğin servis-servis yolculuğu). `traceId` üçünü birbirine bağlar." },
            { q: "Spring Cloud Sleuth'a ne oldu?", a: "Boot 3 ile **emekliye ayrıldı**; yerini **Micrometer Tracing** + Observation API aldı. Eski Sleuth bağımlılığını çıkar, `micrometer-tracing-bridge-*` ekle." }
          ]
        }
      ]
    },
    /* 30b — Araçlar, örnekleme, pratik */
    {
      nav: "30 · Tracing · Araçlar & Pratik", eyebrow: "Spring Boot · 30 · Cloud · 2/2",
      title: "Araçlar, Örnekleme ve Pratik",
      sub: "Micrometer Tracing bir <b>köprü</b> seçer (Brave/Zipkin veya OpenTelemetry), span'leri bir <b>backend</b>'e gönderir. Örnekleme ve bağlam taşıma doğru kurulmalı.",
      blocks: [
        {
          type: "table",
          headers: ["Backend / Araç", "Tür", "Yorum"],
          rows: [
            ["**Zipkin**", "Açık kaynak", "Basit, hızlı kurulum; başlangıç için ideal"],
            ["**Jaeger**", "CNCF, açık kaynak", "Olgun, ölçeklenir; Kubernetes ekosisteminde yaygın"],
            ["**Grafana Tempo**", "Açık kaynak", "Ucuz depolama; Grafana/Loki/Prometheus ile bütün"],
            ["**OpenTelemetry (OTel)**", "Standart + Collector", "✅ Satıcı-bağımsız; sektörün gittiği yön"],
            ["**Datadog / Honeycomb / New Relic**", "Ticari SaaS", "Yönetilen, zengin analiz; ücretli"]
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Köprü seçimi (bağımlılık)", code: `// Brave → Zipkin
implementation 'io.micrometer:micrometer-tracing-bridge-brave'
runtimeOnly  'io.zipkin.reporter2:zipkin-reporter-brave'

// veya OpenTelemetry (satıcı-bağımsız)
// micrometer-tracing-bridge-otel
// + opentelemetry-exporter-otlp` },
            { type: "code", cap: "Özel span — @Observed", code: `@Observed(name = "stok.kontrol")   // span + metrik üretir
public boolean kontrol(Long id) { ... }
// (ObservedAspect bean'i gerekir)` }
          ],
          right: [
            { type: "bullets", title: "Örnekleme (sampling) stratejisi", items: ["**Head-based** (`sampling.probability`): baştan %X örnekle — basit, ucuz", "**Tail-based** (OTel Collector): yalnızca **hatalı/yavaş** trace'leri sakla — daha akıllı", "Üretimde düşük oran (ör. %1–10); hata/incident'te artır"] },
            { type: "bullets", title: "En iyi pratikler", items: ["**Async'te bağlam taşı:** `@Async`/Kafka için instrumentation/context-propagation kur", "**OpenTelemetry** seç → satıcıya kilitlenme", "Span etiketine **PII/sır koyma**", "Trace'i log (`traceId`) + metrikle ilişkilendir"] }
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Maliyet & risk:** %100 örnekleme büyük sistemde <b>yüksek depolama + ağ + işlem maliyeti</b> ve gürültü demektir. Çözüm: düşük head-sampling ya da collector'da tail-sampling. Ayrıca trace verisi **hassas bilgi sızdırabilir** — etiketleri ve baggage'ı denetle."
        },
        {
          type: "qa", items: [
            { q: "Üretimde her isteği mi izlemeliyim?", a: "Hayır — bir **yüzdesini** örnekle (head-based) ya da collector'da **tail-based** ile sadece hatalı/yavaş olanları sakla. Tam izleme maliyetli ve gürültülüdür; örnekleme temsil için yeterlidir." },
            { q: "Brave/Zipkin mi OpenTelemetry mi seçmeliyim?", a: "Yeni sistemlerde **OpenTelemetry** öneriliyor — satıcı-bağımsız standart, hem trace hem metrik hem log için tek SDK/Collector, her backend'e (Jaeger/Tempo/Datadog) gönderebilirsin. Brave+Zipkin basit ve hızlı başlangıç için hâlâ iyi." },
            { q: "Async/Kafka çağrılarında trace kopuyor mu?", a: "Otomatik HTTP propagation çoğu senkron çağrıyı kapsar; ama `@Async`, executor ve Kafka'da bağlamın **elle/instrumentation ile** taşınması gerekir (Micrometer context-propagation, Kafka header'ları). Aksi halde trace o noktada kopar." }
          ]
        }
      ]
    },
    /* 31 */
    {
      nav: "31 · Docker İmajı", eyebrow: "Spring Boot · 31 · Dağıtım · 1/2",
      title: "Docker İmajı: Dockerfile Yöntemleri",
      sub: "Uygulamayı JDK, bağımlılık ve yapılandırmayla bir imaja paketle — her ortamda <b>aynı</b> çalışsın. Üç yol var: <b>Dockerfile</b>, <b>Buildpacks</b>, <b>Jib</b>. Bu slayt: Dockerfile.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Basit (tek aşama)" },
            { type: "code", cap: "Dockerfile — hızlı ama büyük imaj", code: `FROM eclipse-temurin:21-jre
COPY build/libs/app.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
# Önce: ./gradlew bootJar  → sonra: docker build -t app .` }
          ],
          right: [
            { type: "heading", text: "Çok aşamalı (multi-stage) — önerilen" },
            { type: "code", cap: "Derle + çalıştır ayrı → küçük, temiz imaj", code: `# 1) build aşaması (JDK)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN ./gradlew clean bootJar -x test

# 2) çalışma aşaması (sadece JRE)
FROM eclipse-temurin:21-jre
COPY --from=build /src/build/libs/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]` }
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🧱",
          text: "**Katmanlı (layered) jar:** Spring Boot jar'ı katmanlara ayırır — bağımlılıklar, snapshot'lar, uygulama. Dockerfile'da katmanları ayrı `COPY`'lersen, <b>sadece değişen kod katmanı</b> yeniden build edilir; bağımlılıklar cache'ten gelir → çok daha hızlı build/deploy."
        },
        {
          type: "code", cap: "Layered jar — katmanları ayrı kopyala (en verimli cache)", code: `FROM eclipse-temurin:21-jre AS build
COPY app.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract   # katmanlara ayır

FROM eclipse-temurin:21-jre
COPY --from=build dependencies/ ./          # nadiren değişir → cache
COPY --from=build spring-boot-loader/ ./
COPY --from=build application/ ./           # her build'de değişir
ENTRYPOINT ["java","org.springframework.boot.loader.launch.JarLauncher"]`
        },
        {
          type: "qa", items: [
            { q: "Neden tek aşama yerine çok aşamalı build?", a: "Tek aşamada JDK + kaynak + build araçları imajda kalır → **büyük ve güvenliksiz**. Çok aşamalıda derleme bir aşamada yapılır, sonuç jar yalnızca **küçük JRE** imajına kopyalanır — küçük, temiz, hızlı." },
            { q: "Neden `jdk` değil `jre` (hatta daha küçük) base?", a: "Çalıştırmak için JDK'ya (derleyici/araçlar) gerek yok; **JRE** veya daha da küçüğü (`jlink` ile özel runtime, distroless, Alpine) imajı küçültür, saldırı yüzeyini düşürür." }
          ]
        }
      ]
    },
    /* 31b — Buildpacks & Jib */
    {
      nav: "31 · Docker · Buildpacks & Jib", eyebrow: "Spring Boot · 31 · Dağıtım · 2/2",
      title: "Dockerfile'sız: Buildpacks & Jib + Pratik",
      sub: "Dockerfile yazmadan, güvenli ve optimize imaj üretmenin iki yolu — ve üretim için temel kurallar.",
      blocks: [
        {
          type: "split",
          left: [
            { type: "code", cap: "Cloud Native Buildpacks (Boot yerleşik)", code: `# Dockerfile YOK; Docker daemon gerekir
./gradlew bootBuildImage \\
    --imageName=ornek/app:1.0
# Otomatik: katmanlı, non-root, optimize, JVM ayarlı imaj` },
            { type: "code", cap: "Jib (Docker daemon GEREKMEZ)", code: `# Doğrudan registry'ye push; çok hızlı, reproducible
./gradlew jib --image=registry/ornek/app:1.0
# Yerel daemon'a: ./gradlew jibDockerBuild` }
          ],
          right: [
            { type: "table",
              headers: ["", "Kontrol", "Kolaylık", "Daemon"],
              rows: [
                ["**Dockerfile**", "Tam", "Düşük", "Gerekir"],
                ["**Buildpacks**", "Orta", "Yüksek", "Gerekir"],
                ["**Jib**", "Orta", "Yüksek", "Gerekmez"]
              ]
            },
            { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** \"Bende çalışıyor\" sorununun sonu — aynı imaj geliştiricide, CI'da ve Kubernetes'te birebir aynı. CI/CD'de Jib (daemonsuz) veya buildpacks ile imaj üretip registry'ye push edilir, K8s çeker." }
          ]
        },
        {
          type: "bullets", title: "Üretim için temel kurallar",
          items: [
            "**Küçük base** (jre / distroless / Alpine) → küçük imaj, az açık",
            "**Non-root kullanıcı** ile çalıştır (buildpacks/Jib bunu otomatik yapar)",
            "**`.dockerignore`** ile gereksiz dosyaları (`.git`, `build`) dışla",
            "**Katmanlı** yapı → bağımlılık cache'i; hızlı yeniden build",
            "**Sürümle etiketle** (`:1.0`), `:latest`'e güvenme",
            "**JVM container-aware** (Java 17+ otomatik); `-XX:MaxRAMPercentage` ile bellek sınırı"
          ]
        },
        {
          type: "code", cap: "Çalıştır — profil ve bellek ile", code: `docker run -p 8080:8080 \\
  -e SPRING_PROFILES_ACTIVE=prod \\
  -e JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75" \\
  ornek/app:1.0`
        },
        {
          type: "qa", items: [
            { q: "Dockerfile mı, Buildpacks mı, Jib mi?", a: "**Buildpacks** (`bootBuildImage`) sıfır-config, güvenli, optimize — çoğu Spring Boot uygulaması için ideal. **Jib** CI'da Docker daemon istemediği için pratiktir. Özel sistem bağımlılığı/ince kontrol gerekiyorsa **Dockerfile** (çok aşamalı)." },
            { q: "Neden `:latest` etiketi kötü?", a: "`latest` hangi sürüm olduğunu belirsiz kılar; rollback ve tekrar-üretilebilirlik (reproducibility) zorlaşır, iki ortam farklı imaj çalıştırabilir. **Anlamlı sürüm etiketi** (git sha / semver) kullan." },
            { q: "İmajı nasıl küçültürüm?", a: "JRE/distroless base, çok aşamalı build, gereksiz bağımlılıkları çıkar, `jlink` ile özel runtime, `.dockerignore`. Küçük imaj = hızlı çekme/dağıtım + daha az güvenlik açığı." }
          ]
        }
      ]
    },
    /* 32 */
    {
      nav: "32 · Apache Kafka", eyebrow: "Spring Boot · 32 · Mesajlaşma · 1/2",
      title: "Apache Kafka: Kavramlar ve Producer/Consumer",
      sub: "Yüksek hacimli <b>olay akışı</b> için asenkron mesajlaşma platformu. Producer olay yayınlar, consumer'lar <b>bağımsız</b> okur; mesajlar kalıcı saklanır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "📋", label: "Topic", text: "Olayların yazıldığı adlandırılmış akış (ör. `siparis-olaylari`)." },
            { ico: "🧩", label: "Partition", text: "Topic'i paralelleştirme birimi. <b>Sıra yalnızca partition içinde</b> garanti; anahtar (key) ile yönlendirilir." },
            { ico: "👥", label: "Consumer Group", text: "Aynı gruptaki consumer'lar partition'ları <b>paylaşır</b> (yük dengeleme); farklı gruplar aynı akışı ayrı okur." },
            { ico: "📍", label: "Offset", text: "Consumer'ın okuduğu konum; commit'lenir. Kalıcı log sayesinde geri sarıp tekrar okunabilir." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Producer — tipli olay yayını", code: `@Service
class SiparisYayinci {
  private final KafkaTemplate<String, SiparisOlayi> kafka;
  void yayinla(Siparis s) {
    // key = siparisId → aynı sipariş hep AYNI partition (sıra korunur)
    kafka.send("siparis-olaylari",
        s.id().toString(),
        new SiparisOlayi(s.id(), "OLUSTURULDU"));
  }
}` }
          ],
          right: [
            { type: "code", cap: "Consumer — @KafkaListener", code: `@KafkaListener(topics = "siparis-olaylari",
               groupId = "stok-servisi")
void dinle(SiparisOlayi olay) {
    stok.rezerveEt(olay.siparisId());
}
# application.yml
spring.kafka.consumer.group-id: stok-servisi
spring.kafka.consumer.auto-offset-reset: earliest` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Sipariş oluşunca <b>tek olay</b> yayınlanır; stok, fatura, bildirim ve analitik servisleri bunu <b>bağımsız</b> dinler (her biri kendi consumer group'u). Gönderen, alıcının o an ayakta olmasını beklemez — servisler gevşek bağlı, dayanıklı ve ölçeklenir olur."
        },
        {
          type: "qa", items: [
            { q: "Kafka ile RabbitMQ farkı?", a: "RabbitMQ klasik kuyruk/broker'dır (zengin yönlendirme; mesaj tüketilince gider). Kafka bir **olay log'u**dur: mesajlar kalıcı saklanır, birden çok tüketici grubu aynı akışı tekrar tekrar okuyabilir; çok yüksek throughput için tasarlanmıştır." },
            { q: "Partition neden var, kaç tane olmalı?", a: "Partition **paralelliği** sağlar: bir consumer group'ta en fazla partition sayısı kadar consumer aktif çalışır. Throughput için artırırsın; ama çok fazlası overhead ve sıra/rebalance karmaşıklığı getirir. Sıra önemli ise aynı varlığı aynı key ile gönder." }
          ]
        }
      ]
    },
    /* 32b — Kafka güvenilirlik */
    {
      nav: "32 · Kafka · Güvenilirlik", eyebrow: "Spring Boot · 32 · Mesajlaşma · 2/2",
      title: "Kafka: Güvenilirlik ve Hata Yönetimi",
      sub: "Dağıtık mesajlaşmada teslim garantileri, sıra, çift işleme ve hatalı mesaj yönetimi tasarımla çözülür.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "✅", label: "acks", text: "`acks=all` → mesaj tüm replikalara yazılmadan başarı sayılmaz (kayıpsızlık)." },
            { ico: "♻️", label: "Idempotent Producer", text: "`enable.idempotence=true` → yeniden gönderimde **çift kayıt** olmaz." },
            { ico: "🖐️", label: "Manuel ack", text: "İş bitince offset commit (`ack-mode: MANUAL`) → işlenmeden \"okundu\" sayılmaz." },
            { ico: "☠️", label: "Dead Letter Topic", text: "Sürekli hatalı mesajı ayrı topic'e gönder, akışı tıkama." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Hata yönetimi + retry + DLT", code: `@Bean
DefaultErrorHandler errorHandler(KafkaTemplate<?,?> t) {
  // 3 deneme, sonra .DLT topic'ine gönder
  var recoverer = new DeadLetterPublishingRecoverer(t);
  return new DefaultErrorHandler(recoverer,
      new FixedBackOff(1000L, 3));
}` },
            { type: "code", cap: "Idempotent tüketim (çift işlemeyi önle)", code: `@KafkaListener(topics = "odeme-olaylari")
void dinle(OdemeOlayi e) {
  if (islenmis.existsById(e.olayId())) return; // atla
  kargo.olustur(e.siparisId());
  islenmis.save(new Islenmis(e.olayId()));
}` }
          ],
          right: [
            { type: "callout", variant: "info", icon: "🔢", text: "**Sıra (ordering):** Kafka sırayı yalnızca **tek partition içinde** garanti eder. Bir varlığın (sipariş) tüm olaylarının sıralı işlenmesi gerekiyorsa, hepsini **aynı key** ile gönder → aynı partition." },
            { type: "callout", variant: "tip", icon: "🎯", text: "**Teslim garantileri:** varsayılan **en az bir kez** (at-least-once) → çift olabilir, idempotency ile çöz. **Tam bir kez** (exactly-once) Kafka transactions ile mümkündür ama maliyetlidir; çoğu sistemde at-least-once + idempotent tüketim tercih edilir." }
          ]
        },
        {
          type: "qa", items: [
            { q: "Aynı mesaj iki kez işlenirse ne yaparım?", a: "Kafka varsayılanı \"en az bir kez\"dir → tekrar olabilir. Tüketiciyi **idempotent** yaz (olay id'sini bir tabloda tut, tekrarı atla) ve yan etkiyi (çift tahsilat) `unique constraint`/idempotency-key ile garanti altına al." },
            { q: "Hatalı mesaj akışı tıkar mı?", a: "Doğru kurulmazsa evet — aynı mesaj sonsuz retry olabilir. **DefaultErrorHandler + DeadLetterPublishingRecoverer** ile N denemeden sonra mesajı `.DLT` topic'ine taşı; akış devam eder, hatalı mesajı ayrı incelersin." },
            { q: "Exactly-once gerçekten mümkün mü?", a: "Kafka **transactions** ile producer→broker→consumer zincirinde mümkündür ama karmaşık ve maliyetlidir. Pratikte çoğu ekip **at-least-once + idempotency** ile aynı sonucu daha basit elde eder." }
          ]
        }
      ]
    },
    /* 33 */
    {
      nav: "33 · WebSocket", eyebrow: "Spring Boot · 33 · Mesajlaşma · 1/2",
      title: "WebSocket: Gerçek Zamanlı İletişim",
      sub: "Tarayıcı–sunucu arasında <b>kalıcı, çift yönlü</b> kanal. REST'in \"sor-cevap al\" modelinin aksine sunucu, veri değişince istemciye mesaj <b>itebilir</b> (push).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔌", label: "WebSocket vs HTTP", text: "HTTP her istekte bağlantı açar; WebSocket <b>tek bağlantıyı açık tutar</b>, iki yönde anlık mesaj akar." },
            { ico: "📨", label: "STOMP", text: "WebSocket üstünde mesaj protokolü: hedef (destination), abonelik, gövde — yapılandırılmış mesajlaşma." },
            { ico: "📡", label: "Pub/Sub", text: "İstemciler bir konuya (`/konu/...`) abone olur; sunucu o konuya yayınlayınca <b>tüm aboneler</b> alır." },
            { ico: "🧩", label: "Bileşenler", text: "`@MessageMapping` (gelen), `@SendTo` (yayınla), `SimpMessagingTemplate` (her yerden it)." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Yapılandırma (STOMP + broker)", code: `@Configuration @EnableWebSocketMessageBroker
class WsConfig implements WebSocketMessageBrokerConfigurer {
  public void registerStompEndpoints(StompEndpointRegistry r) {
    r.addEndpoint("/ws").withSockJS();      // bağlantı noktası
  }
  public void configureMessageBroker(MessageBrokerRegistry r) {
    r.enableSimpleBroker("/konu");          // abonelik prefix'i
    r.setApplicationDestinationPrefixes("/app");  // gelen prefix
  }
}` }
          ],
          right: [
            { type: "code", cap: "Sohbet — gelen mesajı tüm abonelere yay", code: `@Controller
class SohbetController {
  @MessageMapping("/sohbet")       // istemci → /app/sohbet
  @SendTo("/konu/mesajlar")        // → tüm aboneler
  public Mesaj gonder(Mesaj m) {
    return new Mesaj(m.kullanici(), m.metin(), now());
  }
}` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Canlı sohbet, anlık bildirim, borsa/kripto fiyat akışı, canlı skor, işbirlikçi doküman (Google Docs), sürücü konum takibi. Veri değişince sunucu istemciyi <b>anında</b> günceller — sürekli sorgulamaya (polling) gerek kalmaz."
        },
        {
          type: "qa", items: [
            { q: "WebSocket mı SSE mi?", a: "**Çift yönlü** (sohbet, oyun, işbirliği) gerekiyorsa WebSocket. **Tek yönlü** sunucu→istemci akış (bildirim, canlı fiyat, ilerleme) yeterliyse **SSE** (Server-Sent Events) daha basit, HTTP dostu ve otomatik yeniden bağlanır." },
            { q: "SockJS neden var?", a: "Eski tarayıcı/proxy WebSocket'i desteklemezse **yedek** (fallback) taşıma sağlar (long-polling vb.). İstemci aynı API'yi kullanır; bağlantı şeffaf şekilde alternatife düşer." }
          ]
        }
      ]
    },
    /* 33b — WebSocket hedefli/ölçek */
    {
      nav: "33 · WebSocket · Hedefli & Ölçek", eyebrow: "Spring Boot · 33 · Mesajlaşma · 2/2",
      title: "Kişiye Özel Mesaj, Güvenlik ve Ölçek",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Belirli kullanıcıya (private) mesaj" },
            { type: "code", cap: "convertAndSendToUser", code: `@Service
class BildirimServisi {
  private final SimpMessagingTemplate ws;
  // herhangi bir yerden (REST, Kafka consumer, scheduler) it:
  void bildir(String kullanici, Bildirim b) {
    ws.convertAndSendToUser(
        kullanici, "/kuyruk/bildirim", b);  // sadece o kullanıcıya
  }
}` }
          ],
          right: [
            { type: "table",
              headers: ["Yöntem", "Yön", "Ne zaman"],
              rows: [
                ["**WebSocket**", "Çift yönlü", "Sohbet, oyun, işbirliği"],
                ["**SSE**", "Sunucu→istemci", "Bildirim, canlı fiyat, ilerleme"],
                ["**Polling**", "İstemci sorar", "Basit, seyrek güncelleme"]
              ]
            }
          ]
        },
        {
          type: "bullets", title: "Güvenlik ve ölçeklendirme",
          items: [
            "**Kimlik:** CONNECT anında doğrula (JWT'yi STOMP header'ında taşı); abonelikleri yetkiye göre kısıtla",
            "**Tek sunucu** `SimpleBroker` yeterli; **çok sunucuda** bağlantılar farklı node'lara düşer",
            "Çok-sunucu için **harici broker** (RabbitMQ/ActiveMQ STOMP) — `enableStompBrokerRelay` ile node'lar arası yayın",
            "Bağlantı sayısı ve mesaj boyutunu sınırla; ölü bağlantıları heartbeat ile düşür",
            "Tek yönlü ihtiyaçta WebSocket yerine **SSE** ile karmaşıklığı azalt"
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat (ölçek):** Bir bildirim sistemi 3 sunucuya ölçeklendi; kullanıcı A sunucu-1'e, onu tetikleyen olay sunucu-2'ye bağlı. `SimpleBroker` ile mesaj A'ya ulaşmaz. **RabbitMQ STOMP relay** ile tüm node'lar ortak broker üzerinden yayınlar → mesaj doğru sunucudaki kullanıcıya gider."
        },
        {
          type: "qa", items: [
            { q: "Çok sunucuda WebSocket nasıl ölçeklenir?", a: "Bağlantılar farklı sunuculara düşer; yerleşik `SimpleBroker` yalnızca kendi node'unu bilir. **Harici STOMP broker** (RabbitMQ/ActiveMQ) `enableStompBrokerRelay` ile kullanılır; tüm node'lar ortak broker üzerinden mesaj yayar." },
            { q: "WebSocket bağlantısını nasıl güvene alırım?", a: "Bağlantı (CONNECT) anında token doğrula (STOMP header'ında JWT), kullanıcıyı oturuma bağla; abonelik hedeflerini (`/konu/...`) yetkiye göre kısıtla. WebSocket CSRF'e tabi değildir ama **origin** kontrolü ve TLS (`wss://`) şarttır." }
          ]
        }
      ]
    },
    /* 34 */
    {
      nav: "34 · Batch", eyebrow: "Spring Boot · 34 · Toplu İşleme · 1/2",
      title: "Spring Batch: Toplu İşleme",
      sub: "Milyonlarca kaydı <b>chunk-oriented</b> (parça parça) ve <b>dayanıklı</b> işleyen çerçeve. Oku → işle → yaz; yarıda kalırsa kaldığı yerden devam eder.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🎬", label: "Job", text: "Çalıştırılabilir toplu iş. Bir veya çok <b>Step</b>'ten oluşur." },
            { ico: "🪜", label: "Step", text: "İşin bir aşaması. Chunk modeli: N oku → N işle → N yaz → <b>commit</b>." },
            { ico: "🔄", label: "Reader/Processor/Writer", text: "`ItemReader` (CSV/DB/kuyruk), `ItemProcessor` (dönüştür/doğrula), `ItemWriter` (DB/dosya)." },
            { ico: "💾", label: "JobRepository", text: "İlerlemeyi DB'de tutar → <b>yeniden başlatma</b>, idempotent devam, çift çalıştırmayı engelleme." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Job + Step (chunk)", code: `@Bean Job faturaJob(JobRepository repo, Step step) {
  return new JobBuilder("faturaJob", repo).start(step).build();
}
@Bean Step step(JobRepository repo, PlatformTransactionManager tx,
    ItemReader<Siparis> r, ItemProcessor<Siparis,Fatura> p,
    ItemWriter<Fatura> w) {
  return new StepBuilder("step", repo)
    .<Siparis, Fatura>chunk(500, tx)   // 500'lük parçalar, her parça commit
    .reader(r).processor(p).writer(w)
    .build();
}` }
          ],
          right: [
            { type: "bullets", title: "Gerçek hayatta nerede kullanılır?", items: [
              "**Gece raporları / fatura üretimi** (milyonlarca müşteri)",
              "**CSV/Excel içe-dışa aktarma** (toplu ürün, müşteri yükleme)",
              "**Veri migrasyonu** (eski sistemden yeniye)",
              "**Banka mutabakatı / gün sonu işlemleri**",
              "**ETL** (kaynak → temizle/dönüştür → veri ambarı)",
              "**Toplu e-posta/SMS** (kampanya gönderimi)"
            ] }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Gece 2 milyon satırlık CSV'yi DB'ye aktaran ETL işi 1.4 milyonda çöktü. JobRepository sayesinde iş yeniden başlatılınca <b>kaldığı yerden</b> devam eder — baştan başlamaz. İlerleme, hata yönetimi ve yeniden başlatma çerçeveden gelir."
        },
        {
          type: "qa", items: [
            { q: "Batch mı `@Scheduled` mı?", a: "Küçük periyodik iş için `@Scheduled` yeter. **Büyük hacim**, yeniden başlatılabilirlik, parça-parça commit, ilerleme takibi ve hata toleransı gerekiyorsa **Spring Batch**. İkisi birlikte de kullanılır: `@Scheduled` batch job'u tetikler." },
            { q: "Chunk boyutu (ör. 500) neye göre seçilir?", a: "Bellek ↔ commit sıklığı dengesi. Büyük chunk → az commit (hızlı) ama çok bellek ve hata olunca büyük rollback. Küçük chunk → güvenli ama yavaş. Genelde 100–1000 arası ölçülerek ayarlanır." }
          ]
        }
      ]
    },
    /* 34b — Batch dayanıklılık */
    {
      nav: "34 · Batch · Dayanıklılık & Paralel", eyebrow: "Spring Boot · 34 · Toplu İşleme · 2/2",
      title: "Hata Toleransı, Paralellik ve Tetikleme",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Hata toleransı — bozuk satır işi durdurmasın" },
            { type: "code", cap: "skip + retry", code: `new StepBuilder("step", repo)
  .<Siparis, Fatura>chunk(500, tx)
  .reader(r).processor(p).writer(w)
  .faultTolerant()
  .skipLimit(50).skip(ParseException.class)     // bozuk satırı ATLA
  .retryLimit(3)
  .retry(DeadlockLoserDataAccessException.class) // geçici hatada TEKRAR
  .build();` }
          ],
          right: [
            { type: "heading", text: "Paralellik — büyük işi böl" },
            { type: "bullets", items: [
              "**Multi-threaded step** — chunk'ları paralel thread'lerde işle",
              "**Partitioning** — veriyi aralıklara böl, her partition ayrı (hatta uzak) işlensin",
              "**Remote chunking** — işlemeyi worker'lara dağıt",
              "Sıra/yan etki varsa paralellikte dikkat (idempotent yaz)"
            ] },
            { type: "code", cap: "@Scheduled ile tetikle", code: `@Scheduled(cron = "0 0 2 * * *")     // her gece 02:00
void calistir() throws Exception {
  jobLauncher.run(faturaJob, new JobParametersBuilder()
    .addLocalDateTime("ts", LocalDateTime.now()).toJobParameters());
}` }
          ]
        },
        {
          type: "callout", variant: "tip", icon: "🔁",
          text: "**Yeniden başlatma:** Aynı `JobParameters` ile başarısız bir job <b>kaldığı yerden</b> devam eder; başarıyla biten job aynı parametrelerle <b>tekrar çalışmaz</b> (çift işleme önlenir). Bu yüzden parametreye benzersiz bir değer (tarih/çalıştırma id) eklenir."
        },
        {
          type: "qa", items: [
            { q: "İş yarıda çökerse veri tutarlılığı ne olur?", a: "Chunk modeli sayesinde her parça **kendi transaction'ında** commit edilir. Çöküşte yalnızca son (commit edilmemiş) chunk geri alınır; JobRepository en son başarılı konumu bildiğinden restart oradan devam eder." },
            { q: "Milyonlarca kaydı tek seferde belleğe almıyor mu?", a: "Hayır — `ItemReader` **akış (streaming)** mantığıyla kayıt kayıt okur, yalnızca bir chunk (ör. 500) bellekte tutulur, yazılınca bırakılır. Bu yüzden sabit bellekle çok büyük veri işlenebilir." }
          ]
        }
      ]
    },
    /* 35 */
    {
      nav: "35 · Flyway", eyebrow: "Spring Boot · 35 · Veri",
      title: "Flyway (Veritabanı Migration)",
      sub: "Şema değişikliklerini <b>sürümlü SQL dosyalarıyla</b> yönet; uygulama açılışında otomatik uygula.",
      blocks: [
        { type: "code", cap: "Sürümlü, sırayla çalışan SQL", code: `-- V1__ilk_sema.sql
CREATE TABLE kullanici (id BIGINT PRIMARY KEY, ad VARCHAR(100));
-- V2__telefon_ekle.sql
ALTER TABLE kullanici ADD COLUMN telefon VARCHAR(20);` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir geliştirici tabloya kolon ekledi; Flyway dosyasını commit'ledi. Diğer geliştiriciler ve tüm ortamlar (test/prod) pull alıp uygulamayı açınca migration <b>otomatik, aynı sırayla</b> uygulanır — el ile SQL çalıştırma kaosu biter." },
        { type: "qa", items: [
          { q: "Uygulanmış bir migration'ı değiştirebilir miyim?", a: "Hayır — Flyway checksum tutar; değiştirirsen hata verir. Düzeltme için **yeni** bir migration (`V3__...`) yazarsın. Bu, ortamlar arası tutarlılığı korur." },
          { q: "Flyway mı Liquibase mi?", a: "Flyway düz SQL'e yakın, basit ve yaygındır. Liquibase XML/YAML ile DB-bağımsız değişiklik ve rollback desteği sunar. İkisi de işi görür; ekip tercihi belirler." }
        ] }
      ]
    },
    /* 36 */
    {
      nav: "36 · E-posta", eyebrow: "Spring Boot · 36 · Entegrasyon",
      title: "E-posta Gönderme (JavaMailSender)",
      sub: "`spring-boot-starter-mail` ile düz ve HTML e-posta; Thymeleaf şablonu, ek ve gömülü görsel.",
      blocks: [
        { type: "code", cap: "HTML e-posta", code: `MimeMessage m = sender.createMimeMessage();
var h = new MimeMessageHelper(m, true, "UTF-8");
h.setTo(kullanici.mail()); h.setSubject("Hoş geldin");
h.setText(thymeleafIleUret("hosgeldin", model), true);   // HTML
sender.send(m);` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Kayıt onayı, parola sıfırlama, sipariş faturası. E-posta `@Async`/kuyruk ile gönderilir ki kullanıcı yanıtı beklemesin; üretimde SMTP yerine SendGrid/SES kullanılır (teslim oranı + ölçek)." },
        { type: "qa", items: [
          { q: "E-postayı senkron göndermek neden kötü?", a: "SMTP yavaş olabilir; HTTP isteğini bekletir, hatta SMTP düşerse isteği başarısız eder. **Asenkron** (kuyruk/`@Async`) gönderim, kullanıcı akışını e-postanın durumundan ayırır." }
        ] }
      ]
    },
    /* 37 */
    {
      nav: "37 · Resilience4j", eyebrow: "Spring Boot · 37 · Cloud · 1/2",
      title: "Dayanıklılık: Resilience4j Desenleri",
      sub: "Bir servisin çökmesinin diğerlerine yayılmasını (<b>cascading failure</b>) önleyen beş desen — anotasyonla uygulanır, hepsi birlikte çalışabilir.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔌", label: "Circuit Breaker", text: "Çöken servise çağrıyı keser, fallback döner; servis düzelince kendini açar." },
            { ico: "🔁", label: "Retry", text: "Geçici hatada (timeout/503) sınırlı sayıda yeniden dener (backoff ile)." },
            { ico: "🚪", label: "Rate Limiter", text: "Belirli sürede çağrı sayısını sınırlar (kendini/karşıyı koru)." },
            { ico: "🧱", label: "Bulkhead", text: "Eşzamanlı çağrıyı izole eder; bir bağımlılık tüm thread'leri yutmasın." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Desenleri birleştir (sıra önemli)", code: `@CircuitBreaker(name = "kargo", fallbackMethod = "yedek")
@Retry(name = "kargo")
@Bulkhead(name = "kargo")
@TimeLimiter(name = "kargo")   // CompletableFuture ile
public Kargo kargoBilgisi(Long id) {
    return kargoIstemci.getir(id);
}
public Kargo yedek(Long id, Throwable t) {
    return Kargo.tahmini();     // çöktüğünde makul yedek
}` }
          ],
          right: [
            { type: "code", cap: "Yapılandırma (yaml)", code: `resilience4j.circuitbreaker.instances.kargo:
  failure-rate-threshold: 50        # %50 hata → AÇ
  sliding-window-size: 20
  wait-duration-in-open-state: 10s  # 10s sonra YARI-AÇIK
resilience4j.retry.instances.kargo:
  max-attempts: 3
  wait-duration: 500ms` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Kargo servisi çöktü. Circuit breaker birkaç hatadan sonra \"devreyi açar\": artık o servise çağrı yapmaz, anında fallback (tahmini teslim) döner. Kargo arızası <b>tüm sipariş akışını kilitlemez</b>; servis düzelince devre kendini kapatır."
        },
        {
          type: "qa", items: [
            { q: "Circuit breaker'ın durumları (kapalı/açık/yarı-açık) nedir?", a: "**Kapalı:** çağrılar normal geçer. Hata oranı eşiği aşılınca **Açık:** çağrılar anında fallback'e gider (servise yük binmez). Bir süre sonra **Yarı-açık:** birkaç deneme çağrısı geçirilir; başarılıysa kapanır, değilse tekrar açılır." },
            { q: "Retry her zaman güvenli mi?", a: "Sadece **idempotent** işlemlerde. Ödeme gibi yan etkili çağrılarda dikkatli ol — yoksa çift çekim olur; idempotency anahtarı kullan. Yalnızca geçici hatalarda (timeout/503) ve sınırlı sayıda dene." }
          ]
        }
      ]
    },
    /* 37b — Resilience4j derinlik */
    {
      nav: "37 · Resilience4j · Derinlik", eyebrow: "Spring Boot · 37 · Cloud · 2/2",
      title: "Desen Sırası, Time Limiter ve Pratik",
      blocks: [
        {
          type: "code", cap: "Time Limiter — reaktif/async zaman aşımı", code: `@TimeLimiter(name = "banka")        // CompletableFuture döndürmeli
@CircuitBreaker(name = "banka", fallbackMethod = "yedek")
public CompletableFuture<Sonuc> sorgula(Long id) {
    return CompletableFuture.supplyAsync(() -> bankaIstemci.getir(id));
}
public CompletableFuture<Sonuc> yedek(Long id, Throwable t) {
    return CompletableFuture.completedFuture(Sonuc.bilinmiyor());
}`
        },
        {
          type: "callout", variant: "info", icon: "🔢",
          text: "**Sarmalama sırası (dıştan içe):** Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead → asıl çağrı. Yani önce devre <b>açık mı</b> bakılır; kapalıysa çağrı yapılır; hata olursa retry devreye girer. Yanlış sıra (ör. retry'ı circuit breaker'ın içine koymak) breaker'ı yanıltır."
        },
        {
          type: "twocol",
          pos: { title: "İyi pratikler", items: ["Her **dış/servis çağrısına** en az timeout + circuit breaker", "Anlamlı **fallback** (yedek veri, önbellek, kibar hata)", "Actuator + Micrometer ile breaker durumunu **izle/alarmla**", "Eşikleri gerçek trafiğe göre **ölç ve ayarla**"] },
          neg: { title: "Tuzaklar", items: ["Yan etkili çağrıda kontrolsüz **retry** → çift işlem", "Çok kısa `wait-duration` → breaker sürekli açılıp kapanır (flapping)", "Fallback'te ağır iş yapmak → fallback de çöker", "Her şeyi sarmalamak → gereksiz karmaşıklık/gecikme"] }
        },
        {
          type: "qa", items: [
            { q: "TimeLimiter'ı ne zaman kullanırım?", a: "Çağrının **belirli sürede** dönmesini zorlamak için. `CompletableFuture` (async) döndüren metoda uygulanır; süre aşılırsa iptal edilip fallback'e düşülür. Senkron çağrılarda bunun yerine istemci read-timeout'u kullanılır." },
            { q: "Hystrix'e ne oldu, Resilience4j mi kullanmalıyım?", a: "**Hystrix bakım modunda** (Netflix arşivledi). Modern standart **Resilience4j**'dir: hafif, fonksiyonel, modüler ve Micrometer ile entegre. Yeni projede Resilience4j." },
            { q: "Circuit breaker mı, sadece retry mi yeter?", a: "Retry **geçici** hatayı çözer ama servis **gerçekten çökmüşse** retry yükü artırır ve seni de kilitler. Circuit breaker bu durumda çağrıyı keser. İkisi birlikte: önce retry (geçici), ısrar ederse breaker (kalıcı)." }
          ]
        }
      ]
    },
    /* 38 */
    {
      nav: "38 · Başlangıç & Araçlar", eyebrow: "Spring Boot · 38 · Araçlar · 1/2",
      title: "Initializr, CLI ve Proje Başlatma",
      sub: "Bir Spring Boot projesine başlamanın yolları: web sihirbazı <b>Initializr</b>, komut satırı <b>CLI</b>, IDE şablonları ve geliştirme hızlandırıcı <b>DevTools</b>.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🧙", label: "Initializr", text: "`start.spring.io` — bağımlılık seç, Java/build aracı seç, iskeleti indir (dakikalar)." },
            { ico: "⌨️", label: "CLI", text: "`spring init` ile terminalden proje üret; hızlı denemeler için." },
            { ico: "🔥", label: "DevTools", text: "Kod değişince <b>otomatik yeniden başlat</b> + canlı reload; geliştirme hızı." },
            { ico: "🧩", label: "IDE", text: "IntelliJ / STS / VS Code şablonları Initializr'ı arka planda kullanır." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Initializr — curl ile iskelet", code: `curl https://start.spring.io/starter.zip \\
  -d dependencies=web,data-jpa,actuator \\
  -d javaVersion=21 \\
  -d type=gradle-project \\
  -o demo.zip` }
          ],
          right: [
            { type: "code", cap: "Spring Boot CLI", code: `# CLI ile proje üret
spring init --dependencies=web,data-jpa \\
            --build=gradle demo

spring --version` }
          ]
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Yeni bir mikroservis ihtiyacı doğunca `start.spring.io`'dan Web+JPA+Actuator seçilip 1 dakikada çalışan iskelet indirilir; DevTools ile geliştirme sırasında her kayıtta uygulama saniyeler içinde yenilenir."
        },
        {
          type: "qa", items: [
            { q: "DevTools üretimde kalsın mı?", a: "Hayır — sadece geliştirme içindir (otomatik restart, canlı reload). Üretim jar'ında otomatik devre dışıdır; yine de bağımlılığı `developmentOnly` kapsamında tutmak doğrudur." },
            { q: "Ana sınıf neden kök pakette olmalı?", a: "`@SpringBootApplication` üzerindeki `@ComponentScan` bulunduğu paketten **aşağıya** doğru tarar. Ana sınıf kökte değilse alt paketlerdeki bean'ler bulunamaz; en sık \"bean yok\" hatasının sebebi budur." }
          ]
        }
      ]
    },
    /* 38b — Bootstrapping akışı */
    {
      nav: "38 · Bootstrapping Akışı", eyebrow: "Spring Boot · 38 · Araçlar · 2/2",
      title: "Bootstrapping: Açılışta Ne Oluyor?",
      sub: "`SpringApplication.run()` çağrısından \"Started in X seconds\"a kadar geçen adımlar.",
      blocks: [
        {
          type: "code", cap: "Açılış adımları (sırayla)", code: `SpringApplication.run(App.class, args)
  │
  1. Environment hazırla     → properties + aktif profiller (dev/prod)
  2. ApplicationContext oluştur
  3. @ComponentScan          → bileşenleri (bean) bul
  4. Auto-configuration      → @Conditional ile makul bean'ler
  5. Bean'leri oluştur+enjekte → @PostConstruct
  6. Gömülü sunucuyu başlat  → Tomcat (8080)
  7. CommandLineRunner / ApplicationRunner çalıştır
  │
  → "Started App in 2.1 seconds"`
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "SpringApplication'ı özelleştir", code: `public static void main(String[] args) {
  var app = new SpringApplication(App.class);
  app.setBannerMode(Banner.Mode.OFF);     // banner kapat
  app.setAdditionalProfiles("prod");       // profil ekle
  app.addListeners(new BaslangicLogger()); // olay dinle
  app.run(args);
}` }
          ],
          right: [
            { type: "bullets", title: "Faydalı detaylar", items: [
              "**Profil:** `--spring.profiles.active=prod` ile ortam ayar setini seç",
              "**Lazy init:** `spring.main.lazy-initialization=true` → açılışı hızlandırır",
              "**ApplicationEvents:** `ApplicationReadyEvent`'te warm-up/seed yap",
              "**Actuator `/startup`** ile açılış adımlarının süresini incele"
            ] }
          ]
        },
        {
          type: "qa", items: [
            { q: "Auto-configuration nasıl \"karar veriyor\"?", a: "`@Conditional` ailesiyle: classpath'te ne var (`@ConditionalOnClass`), hangi bean tanımlı/değil (`@ConditionalOnMissingBean`), hangi property set (`@ConditionalOnProperty`). Sen bir bean tanımlarsan Boot kendi varsayılanını **geri çeker** — kontrol sende kalır." },
            { q: "Açılış neden yavaş, nasıl hızlandırırım?", a: "Çok bean/auto-config taraması, ağır `@PostConstruct` işleri veya bağlantı kurulumları. Çözüm: lazy init, gereksiz auto-config'i `exclude`, açılış işlerini erteleme, ve daha radikal: **GraalVM Native Image** (AOT) ile milisaniyelerde başlatma." }
          ]
        }
      ]
    },
    /* 39 */
    {
      nav: "39 · Build & Starters", eyebrow: "Spring Boot · 39 · Araçlar",
      title: "Build Sistemleri, Starter'lar ve Kod Yapısı",
      sub: "Maven/Gradle + starter'lar (bağımlılık kümeleri) + BOM ile <b>uyumlu sürüm yönetimi</b>.",
      blocks: [
        { type: "code", cap: "Tek starter → onlarca uyumlu bağımlılık", code: `// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
// Sürüm yazmazsın — Boot BOM uyumlu sürümleri yönetir` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Eskiden Spring MVC + Jackson + Tomcat sürümlerini elle eşlemek \"bağımlılık cehennemi\"ydi. `starter-web` tek satırla uyumlu seti getirir; sürüm çatışmaları büyük ölçüde ortadan kalkar." },
        { type: "qa", items: [
          { q: "BOM (Bill of Materials) nedir?", a: "Birbiriyle uyumlu bağımlılık sürümlerini tanımlayan bir liste. Boot'un BOM'u sayesinde sen sürüm yazmazsın; tüm starter'lar test edilmiş, uyumlu sürümlerle gelir." }
        ] }
      ]
    },
    /* 40 */
    {
      nav: "40 · WAR Dağıtımı", eyebrow: "Spring Boot · 40 · Dağıtım",
      title: "WAR Dağıtımı (Harici Tomcat)",
      sub: "Uygulamayı JAR yerine WAR paketleyip <b>harici</b> bir Tomcat'e dağıtma (legacy ortamlar).",
      blocks: [
        { type: "code", cap: "SpringBootServletInitializer", code: `public class App extends SpringBootServletInitializer {
    protected SpringApplicationBuilder configure(SpringApplicationBuilder b) {
        return b.sources(App.class);
    }
}
// build: 'war' plugin + providedRuntime 'spring-boot-starter-tomcat'` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bazı kurumsal ortamlar önceden kurulu, merkezî yönetilen bir Tomcat'e WAR dağıtımını zorunlu kılar. Modern tercih gömülü JAR (konteyner) olsa da Spring Boot WAR'ı da destekler." },
        { type: "qa", items: [
          { q: "JAR mı WAR mı?", a: "Modern/bulut/konteyner ortamı için **gömülü JAR** (`java -jar`) standarttır — basit, taşınabilir. WAR yalnızca mevcut harici sunucu altyapısı zorunluysa tercih edilir." }
        ] }
      ]
    },
    /* 41 */
    {
      nav: "41 · Thymeleaf", eyebrow: "Spring Boot · 41 · Web · 1/2",
      title: "Thymeleaf: Sunucu-Render HTML",
      sub: "Sunucuda tam HTML üretip tarayıcıya gönderen şablon motoru (JSP'nin halefi). Şablonlar <b>geçerli HTML</b>'dir — tasarımcı tarayıcıda doğrudan açabilir (natural templating).",
      blocks: [
        {
          type: "framework", items: [
            { ico: "📝", label: "th:text / th:utext", text: "Etiket içeriğini doldur. `th:text` <b>otomatik escape</b> eder (XSS koruması); `th:utext` ham HTML." },
            { ico: "🔁", label: "th:each", text: "Listede döngü: `th:each=\"u : ${urunler}\"`." },
            { ico: "🔀", label: "th:if / th:unless / th:switch", text: "Koşullu gösterim." },
            { ico: "🔣", label: "İfadeler", text: "`${...}` değişken · `*{...}` seçim · `@{...}` URL · `#{...}` i18n mesaj." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "Controller — view + model", code: `@Controller
class UrunWebController {
  @GetMapping("/urunler")
  String liste(Model model) {
    model.addAttribute("urunler", servis.hepsi());
    return "urunler";          // → templates/urunler.html
  }
}` }
          ],
          right: [
            { type: "code", cap: "Şablon — döngü, koşul, biçim, URL", code: `<table>
  <tr th:each="u : \${urunler}">
    <td th:text="\${u.ad}">Örnek</td>
    <td th:text="\${#numbers.formatDecimal(u.fiyat,1,2)}">0</td>
    <td th:if="\${u.stok == 0}">Tükendi</td>
    <td><a th:href="@{/urun/{id}(id=\${u.id})}">Detay</a></td>
  </tr>
</table>` }
          ]
        },
        {
          type: "qa", items: [
            { q: "Thymeleaf mı React/Vue (SPA) mı?", a: "İçerik-ağırlıklı, SEO önemli, basit etkileşimli sayfa/admin paneli için sunucu-render **Thymeleaf** hızlı ve yeterli. Zengin, durumlu, uygulama-benzeri arayüz için **SPA + REST/JSON**. Hibrit de mümkün (Thymeleaf + biraz JS)." },
            { q: "`th:text` ile `th:utext` farkı; güvenli mi?", a: "`th:text` değeri **otomatik HTML-escape** eder → XSS'e karşı güvenli (varsayılan kullan). `th:utext` ham HTML basar — yalnızca **güvendiğin** içerikte kullan." }
          ]
        }
      ]
    },
    /* 41b — Thymeleaf form & layout */
    {
      nav: "41 · Thymeleaf · Form & Layout", eyebrow: "Spring Boot · 41 · Web · 2/2",
      title: "Form Binding, Fragment ve Layout",
      blocks: [
        {
          type: "split",
          left: [
            { type: "heading", text: "Form — iki yönlü binding" },
            { type: "code", cap: "th:object + th:field", code: `<form th:action="@{/urunler}"
      th:object="\${urun}" method="post">
  <input th:field="*{ad}" />
  <input th:field="*{fiyat}" />
  <span th:if="\${#fields.hasErrors('ad')}"
        th:errors="*{ad}">hata</span>
  <button>Kaydet</button>
</form>` },
            { type: "code", cap: "Controller — GET form, POST kaydet", code: `@GetMapping("/yeni")
String form(Model m){ m.addAttribute("urun", new UrunForm()); return "form"; }

@PostMapping("/urunler")
String kaydet(@Valid @ModelAttribute UrunForm urun, BindingResult br){
  if (br.hasErrors()) return "form";
  servis.kaydet(urun);
  return "redirect:/urunler";       // PRG deseni
}` }
          ],
          right: [
            { type: "heading", text: "Fragment — tekrar kullanılabilir parça" },
            { type: "code", cap: "th:fragment / th:replace ile layout", code: `<!-- fragments/layout.html -->
<header th:fragment="ust">... ortak menü ...</header>

<!-- sayfa.html -->
<div th:replace="~{fragments/layout :: ust}"></div>
<main>... sayfa içeriği ...</main>` },
            { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Admin paneli (CRUD ekranları), kurumsal web sitesi, ve özellikle **e-posta HTML şablonları** Thymeleaf ile üretilir. Ortak başlık/menü/altbilgi fragment'le tek yerde tutulur; form hataları `th:errors` ile gösterilir." }
          ]
        },
        {
          type: "qa", items: [
            { q: "`${...}`, `*{...}`, `@{...}`, `#{...}` ne zaman?", a: "**`${}`** model değişkeni (`${urunler}`). **`*{}`** `th:object` üzerindeki alana kısa erişim (`*{ad}`). **`@{}`** context-aware URL (`@{/urun/{id}}`). **`#{}`** i18n mesaj anahtarı (`#{hosgeldin}`)." },
            { q: "Form sonrası neden `redirect:` dönüyoruz (PRG)?", a: "**Post-Redirect-Get** deseni: POST işlendikten sonra redirect dönülür ki kullanıcı sayfayı yenilediğinde form **tekrar gönderilmesin** (çift kayıt olmasın). Klasik web formlarının standardıdır." }
          ]
        }
      ]
    },
    /* 42 */
    {
      nav: "42 · HTTPS", eyebrow: "Spring Boot · 42 · Dağıtım · 1/2",
      title: "HTTPS / TLS Etkinleştirme",
      sub: "TLS trafiği <b>şifreler</b> (gizlilik) ve sunucu <b>kimliğini doğrular</b> (sertifika). HTTP düz metindir — parola/token ağ üzerinde okunabilir; üretimde HTTPS şarttır.",
      blocks: [
        {
          type: "framework", items: [
            { ico: "🔐", label: "TLS", text: "İstemci–sunucu arası şifreli kanal + sunucu kimliği. \"S\" (HTTPS) bundan gelir." },
            { ico: "🗝️", label: "Keystore", text: "Sunucunun özel anahtarı + sertifikası (PKCS12 `.p12` dosyası)." },
            { ico: "🏷️", label: "Sertifika", text: "Self-signed (geliştirme) veya CA imzalı (üretim, ör. Let's Encrypt)." },
            { ico: "🤝", label: "Handshake", text: "İstemci sertifikayı doğrular, oturum anahtarı üretilir, trafik şifrelenir." }
          ]
        },
        {
          type: "split",
          left: [
            { type: "code", cap: "1) Sertifika üret (geliştirme — self-signed)", code: `keytool -genkeypair -alias app \\
  -keyalg RSA -keysize 2048 \\
  -storetype PKCS12 \\
  -keystore keystore.p12 \\
  -validity 365` }
          ],
          right: [
            { type: "code", cap: "2) Spring Boot'ta etkinleştir (yaml)", code: `server.port: 8443
server.ssl.enabled: true
server.ssl.key-store: classpath:keystore.p12
server.ssl.key-store-type: PKCS12
server.ssl.key-store-password: \${SSL_PASS}   # ortam değişkeni!
server.ssl.key-alias: app` }
          ]
        },
        {
          type: "callout", variant: "warn", icon: "⚠️",
          text: "**Self-signed yalnızca geliştirme için:** tarayıcı \"güvenli değil\" uyarısı verir (CA imzalı değil). Üretimde **gerçek CA** (Let's Encrypt — ücretsiz) sertifikası kullan. Keystore parolasını **asla koda gömme** — ortam değişkeni/secret manager."
        },
        {
          type: "qa", items: [
            { q: "HTTP'yi HTTPS'e nasıl yönlendiririm?", a: "İkinci bir (HTTP/8080) Tomcat connector'ı eklenip `/...` istekleri 8443'e redirect edilir (Java config ile) — ya da daha pratik olarak yönlendirmeyi **reverse proxy/load balancer** yapar." },
            { q: "`.p12` (PKCS12) ile `.jks` farkı?", a: "İkisi de keystore formatı. **PKCS12** endüstri standardıdır (diller/araçlar arası taşınabilir), bugün önerilen. JKS Java'ya özgü eski formattır." }
          ]
        }
      ]
    },
    /* 42b — TLS üretim */
    {
      nav: "42 · TLS · Üretim & mTLS", eyebrow: "Spring Boot · 42 · Dağıtım · 2/2",
      title: "Üretimde TLS: Sonlandırma, Let's Encrypt, mTLS",
      blocks: [
        {
          type: "twocol",
          pos: { title: "Yaygın üretim deseni", items: ["TLS'i **load balancer / gateway / Ingress** sonlandırır", "Sertifika yönetimi **merkezî** (Let's Encrypt otomatik yenileme)", "Uygulama sade HTTP konuşur (iç ağ)", "Daha az yapılandırma, kolay sertifika rotasyonu"] },
          neg: { title: "Uçtan uca (E2E) TLS", items: ["İç bacakta da TLS gerekiyorsa uygulamada da etkinleştir", "Hassas/uyumluluk (PCI, sağlık) senaryoları", "Servis-servis arası **mTLS** (karşılıklı kimlik)", "Service mesh (Istio/Linkerd) mTLS'i otomatik sağlar"] }
        },
        {
          type: "callout", variant: "real", icon: "🌍",
          text: "**Gerçek hayat:** Çoğu mimaride Nginx/ALB/Ingress TLS'i sonlandırır; Let's Encrypt sertifikası 90 günde bir <b>otomatik yenilenir</b> (cert-manager). Kubernetes'te servisler arası şifreleme ve karşılıklı kimlik (<b>mTLS</b>) ise service mesh tarafından koddan bağımsız sağlanır."
        },
        {
          type: "bullets", title: "İyi pratikler",
          items: [
            "**TLS 1.2+ / 1.3**; zayıf şifre takımlarını (cipher) kapat",
            "**HSTS** başlığı ile tarayıcıyı HTTPS'e zorla",
            "Sertifikayı **otomatik yenile** (cert-manager / certbot); süresi dolan sertifika = kesinti",
            "Anahtar/parolayı **secret manager**'da tut (Vault, K8s Secret)",
            "Mümkünse TLS sonlandırmayı **kenara** (edge) taşı, uygulamayı sade tut"
          ]
        },
        {
          type: "qa", items: [
            { q: "TLS'i uygulamada mı load balancer'da mı sonlandırmalıyım?", a: "Çoğu üretimde **load balancer/gateway** sonlandırır (merkezî sertifika yönetimi, sade uygulama). Uçtan uca şifreleme veya uyumluluk gerekiyorsa iç bacakta da TLS kullanırsın." },
            { q: "mTLS (mutual TLS) nedir, ne zaman?", a: "Normal TLS'te yalnızca **sunucu** kimliğini kanıtlar; mTLS'te **istemci de** sertifikayla kimliğini kanıtlar (karşılıklı). Servisler-arası güven (zero-trust), B2B API'ler ve hassas iç trafikte kullanılır; service mesh bunu otomatikleştirir." }
          ]
        }
      ]
    },
    /* 43 */
    {
      nav: "43 · Twilio", eyebrow: "Spring Boot · 43 · Entegrasyon",
      title: "Twilio (SMS / İletişim)",
      sub: "SMS, WhatsApp, sesli arama gönderen bulut iletişim platformunun Spring entegrasyonu.",
      blocks: [
        { type: "code", cap: "SMS gönder", code: `Message.creator(
    new PhoneNumber(kime),       // +90...
    new PhoneNumber(gonderen),
    "Doğrulama kodunuz: 482913"
).create();` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** OTP (tek kullanımlık kod) ile 2FA, sipariş kargoya çıktı bildirimi, randevu hatırlatma. SMS asenkron gönderilir, hız sınırı uygulanır; API anahtarı ortam değişkeni/secret manager'dan okunur." },
        { type: "qa", items: [
          { q: "Doğrulama kodunu (OTP) nasıl güvenli yaparım?", a: "Kısa ömürlü (ör. 3 dk), tek kullanımlık, deneme sayısı sınırlı ve sunucuda hash'li sakla. SMS gecikmesine karşı yeniden gönderim ve hız sınırı (rate limit) ekle." }
        ] }
      ]
    },
    /* 44 */
    {
      nav: "44 · GCP", eyebrow: "Spring Boot · 44 · Cloud",
      title: "Spring Boot ve Google Cloud (GCP)",
      sub: "Uygulamayı GCP'ye dağıt ve bulut servislerini (Cloud SQL, Pub/Sub, Storage, Secret Manager) kullan.",
      blocks: [
        { type: "code", cap: "Cloud Run'a dağıtım", code: `./gradlew bootBuildImage          # konteyner imajı
gcloud run deploy --image gcr.io/proje/uygulama --platform managed` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Bir startup, sunucu yönetmeden Cloud Run'da (konteyner + otomatik ölçek, sıfıra kadar) servisini yayınlar; trafik artınca otomatik ölçeklenir, gece sıfırlanıp maliyet düşer. Sırlar Secret Manager'dan gelir." },
        { type: "qa", items: [
          { q: "Buluta bağımlı (vendor lock-in) olur muyum?", a: "Riski azaltmak için **standartlara** yaslan: JPA (veri), OpenTelemetry (gözlem), konteyner (taşınabilirlik). Spring Cloud GCP soyutlamaları kolaylık verir ama mümkün olduğunca taşınabilir API'lerde kal." }
        ] }
      ]
    },
    /* 45 */
    {
      nav: "45 · Google OAuth2", eyebrow: "Spring Boot · 45 · Güvenlik",
      title: "Google OAuth2 ile Giriş (Social Sign-In)",
      sub: "\"Google ile Giriş Yap\": OAuth2 Authorization Code akışıyla kullanıcı Google'da doğrulanır, sen parola tutmazsın.",
      blocks: [
        { type: "code", cap: "oauth2Login", code: `spring.security.oauth2.client.registration.google:
  client-id: GOOGLE_CLIENT_ID
  client-secret: GOOGLE_CLIENT_SECRET

http.oauth2Login(Customizer.withDefaults());` },
        { type: "callout", variant: "real", icon: "🌍", text: "**Gerçek hayat:** Kullanıcı \"Google ile Giriş\"e tıklar → Google'a yönlenir → orada doğrulanır → uygulamana kod döner → token alınır → oturum açılır. Sen kullanıcının <b>parolasını hiç görmezsin</b>; kayıt/şifre-unuttum yükü ortadan kalkar." },
        { type: "qa", items: [
          { q: "Sosyal giriş kullanırsam parola saklamam gerekmez mi?", a: "Doğru — kimlik doğrulamayı Google üstlenir, sen sadece dönen kimliği (e-posta/sub) kendi kullanıcına eşlersin. Parola saklama/sızma riski büyük ölçüde ortadan kalkar." },
          { q: "OAuth2 ile JWT birlikte mi çalışır?", a: "Evet — OAuth2 ile kimlik doğrulanır, ardından kendi API'lerin için JWT üretip stateless erişim verebilirsin. OAuth2 \"giriş\", JWT \"sonraki isteklerde kimlik taşıma\" işini görür." }
        ] }
      ]
    },

    /* ---------------- BÖLÜM ÖZETİ ---------------- */
    {
      nav: "Bölüm Özeti · Spring Boot", eyebrow: "Bölüm 4 · Kapanış",
      title: "Spring Boot — Aklında Kalsın",
      sub: "45 konuyu tek tek gezdik. Hepsinin altındaki ortak felsefe ve taşınacak fikirler:",
      blocks: [
        {
          type: "recap",
          title: "Ne öğrendik?",
          items: [
            "**Temel felsefe:** \"Yapılandırma yerine makul varsayımlar.\" Auto-configuration + starter'lar + gömülü sunucu → `java -jar` ile çalışan tek uygulama.",
            "**`@SpringBootApplication`** üç şeyi birleştirir: `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`. Ana sınıf kök pakette olmalı.",
            "**Web & Veri:** `@RestController` ile REST, doğru HTTP durum kodları; Spring Data JPA ile repository arayüzünden neredeyse kod yazmadan sorgu.",
            "**Güvenlik:** Spring Security zinciri, JWT ile stateless kimlik, OAuth2/social sign-in ile parola tutmadan giriş.",
            "**Operasyon:** Actuator (sağlık/metrik), profiller (`dev`/`prod`), dışsal konfigürasyon (`application.yml`, env) ile aynı jar her ortamda.",
            "**Mikroservis & entegrasyon:** Config, service discovery, gateway, mesajlaşma (Kafka), gözlemlenebilirlik — hepsi aynı Boot deseniyle."
          ]
        },
        {
          type: "callout", variant: "key", icon: "🔑",
          text: "**Tek cümlede:** Spring \"nasıl\"ı verir, Spring Boot \"hızlıca çalışır hâle getirmeyi\" ekler. Sıradaki bölüm ikisini yan yana koyup <b>ne zaman hangisi</b> sorusunu netleştiriyor."
        }
      ]
    }
  ]
});
