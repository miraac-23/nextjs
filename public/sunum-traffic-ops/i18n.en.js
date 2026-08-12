/* Trafik Polisi Operasyon ve Takip Sistemi — İngilizce sözlük.
   Anahtar: bloğun DÜZ METNİ (Türkçe) · Değer: İngilizce HTML.
   Sözlükte olmayan blok Türkçe kalır — bkz. /deck-i18n.js

   ÜRETİLMİŞTİR: scratchpad/i18n/build_traffic_en.py
   Anahtarlar index.html'den otomatik çıkarıldığı için elle yazım hatası
   nedeniyle eşleşmeyen anahtar oluşmaz. Metin değişirse script yeniden
   çalıştırılmalıdır. */
(function () {
  var D = {};
  function t(k, v) { D[k] = v; }

  /* Slayt blokları */
  t(`Trafik Polisi Operasyon ve Takip Sistemi — Sunum`,
    `Traffic Police Operations & Tracking System — Deck`);
  t(`TRAFİK POLİSİ OPERASYON VE TAKİP SİSTEMİ`,
    `TRAFFIC POLICE OPERATIONS & TRACKING SYSTEM`);
  t(`Sahayı Gören,Doğru GörevlendirenOperasyon Merkezi`,
    `Seeing the Field,<br><span class="grad-text">Dispatching Correctly</span><br>An Operations Centre`);
  t(`240 trafik polisinin konumu saniyeler içinde değişirken; olayın nerede olduğunu, en yakın uygun ekibin kim olduğunu ve o ekibin gerçekten müsait olup olmadığını tek ekranda cevaplayan; görevlendirmeyi iki operatör aynı anda denese bile tutarlı tutan sistem.`,
    `While the positions of 240 traffic officers change every few seconds, this system answers three questions <b>on a single screen</b> — where the incident is, which nearby unit is suitable, and whether that unit is genuinely available — and keeps dispatch consistent <b>even when two operators act at the same instant</b>.`);
  t(`Java 21 · Spring Boot 3.4 PostgreSQL 16 · Flyway Redis 7 Apache Kafka SSE React 18 · MUI · RTK Query`,
    `<span class="t"><svg><use href="#i-spring"/></svg>Java 21 · Spring Boot 3.4</span><span class="t"><svg><use href="#i-db"/></svg>PostgreSQL 16 · Flyway</span><span class="t"><svg><use href="#i-layers"/></svg>Redis 7</span><span class="t"><svg><use href="#i-stream"/></svg>Apache Kafka</span><span class="t"><svg><use href="#i-bolt"/></svg>SSE</span><span class="t"><svg><use href="#i-code"/></svg>React 18 · MUI · RTK Query</span>`);
  t(`32 slayt · 4 aşama 10 canlı sahne 7 elle denenebilir demo Ölçülerek doğrulandı`,
    `<span class="pill b"><svg><use href="#i-layers"/></svg>32 slides · 4 stages</span><span class="pill a"><svg><use href="#i-play"/></svg>10 live scenes</span><span class="pill c"><svg><use href="#i-target"/></svg>7 hands-on demos</span><span class="pill g"><svg><use href="#i-check"/></svg>Verified by measurement</span>`);
  t(`Dört aşamada: sahadan ölçeğe`,
    `Four stages: from the field to scale`);
  t(`Önce sistemin ne işe yaradığını görürüz. Sonra onu ayakta tutan mimari kararlara ineriz. Ardından "iki operatör aynı anda ne yaparsa ne olur" sorusuyla yüzleşiriz. En sonunda sistemi bugünkünün on katı yüke hazırlayan kararları tartışırız. Soldaki renkli şerit her an hangi aşamada olduğunuzu söyler.`,
    `First we see what the system is for. Then we go down to the architectural decisions that hold it up. Next we face the question "what happens when two operators act at the same time". Finally we discuss the decisions that prepare the system for ten times today's load. The coloured rail on the left always tells you which stage you are in.`);
  t(`1 · OPERASYON Problem, roller, uçtan uca akış ve ekranlar`,
    `<span class="pin"><i></i></span><span class="lvname">1 · OPERATIONS</span><span class="lvdesc">Problem, roles, end-to-end flow and screens</span>`);
  t(`2 · MİMARİ Paket düzeni, sözleşme, veri modeli, indeksler`,
    `<span class="pin"><i></i></span><span class="lvname">2 · ARCHITECTURE</span><span class="lvdesc">Package layout, contracts, data model, indexes</span>`);
  t(`3 · DOĞRULUK Yarış koşulu, kilitleme, sürüm kontrolü, güvenlik`,
    `<span class="pin"><i></i></span><span class="lvname">3 · CORRECTNESS</span><span class="lvdesc">Race conditions, locking, versioning, security</span>`);
  t(`4 · ÖLÇEK SSE, Kafka, virtual thread, idempotency, hız sınırı`,
    `<span class="pin"><i></i></span><span class="lvname">4 · SCALE</span><span class="lvdesc">SSE, Kafka, virtual threads, idempotency, rate limiting</span>`);
  t(`Kod tabanı`,
    `Codebase`);
  t(`Java dosyası`,
    `Java files`);
  t(`Arayüz`,
    `Frontend`);
  t(`TypeScript dosyası`,
    `TypeScript files`);
  t(`Test`,
    `Tests`);
  t(`otomatik test (49+8+34)`,
    `automated tests (49+8+34)`);
  t(`Veri`,
    `Data`);
  t(`günlük konum satırı`,
    `location rows per day`);
  t(`Aşama 1`,
    `<span class="lvbadge lv1"><span class="lvdot"></span>Stage 1</span>`);
  t(`Operasyon: sistem ne yapıyor?`,
    `Operations: what does the system do?`);
  t(`Kod yazmadan önce cevaplanması gereken soru: bir trafik operasyon merkezinde gün nasıl geçiyor ve hangi an kritik?`,
    `The question to answer before writing any code: what does a day look like in a traffic operations centre, and which moment is critical?`);
  t(`Telsizle yürüyen görevlendirmenin ürettiği somut hatalar`,
    `The concrete mistakes produced by dispatching over the radio`);
  t(`Üç rol, üç farklı yetki sınırı`,
    `Three roles, three different permission boundaries`);
  t(`Konum bildiriminden görevlendirmeye uçtan uca akış`,
    `The end-to-end flow from a location report to dispatch`);
  t(`Operatörün gerçekten baktığı ekran`,
    `The screen the operator actually looks at`);
  t(`Operasyon canlı sahne`,
    `<span class="lvbadge lv1"><span class="lvdot"></span>Operations</span><span class="ihint pulse"><svg><use href="#i-play"/></svg> live scene</span>`);
  t(`Ekip nerede? Müsait mi? — telsizde cevabı yok`,
    `Where is the unit? Is it available? — the radio has no answer`);
  t(`Aşağıdaki sahne gerçek bir vardiyayı temsil ediyor: solda olaylar birikiyor, sağda ekipler sahada. Operatör kimin nerede olduğunu bilmediği için görevlendirmeyi tahminle yapıyor.`,
    `The scene below represents a real shift: incidents pile up on the left, units are in the field on the right. Because the operator does not know who is where, dispatch is done <b>by guesswork</b>.`);
  t(`0 hatalı görevlendirme`,
    `0 faulty dispatches`);
  t(`Çift görevlendirme`,
    `Double dispatch`);
  t(`Aynı ekip iki ayrı olaya yönlendirilir. İkinci olay ekip gelmediği için bekler; kimse fark etmez.`,
    `The same unit is sent to two separate incidents. The second incident waits because the unit never arrives; nobody notices.`);
  t(`Yanlış ekip seçimi`,
    `Wrong unit chosen`);
  t(`Olaya 12 km uzaktaki ekip gönderilirken 800 m ötedeki müsait ekip beklemede kalır.`,
    `A unit 12 km away is sent to the incident while an available unit 800 m away keeps waiting.`);
  t(`Geriye dönük iz yok`,
    `No historical trail`);
  t(`"Bu ekip saat 14:20'de neredeydi?" sorusunun cevabı hiçbir yerde tutulmaz.`,
    `"Where was this unit at 14:20?" — the answer is not kept anywhere.`);
  t(`Problem bir yazılım problemi değil, bir görünürlük problemi. Operatörün elinde konum yok, durum yok, geçmiş yok. Sistemin ilk işi karar vermek değil; karar verebilmek için gereken üç bilgiyi aynı anda göstermek.`,
    `<b>The problem is not a software problem, it is a visibility problem.</b> The operator has no position, no status, no history. The system's first job is not to decide; it is <b>to show the three pieces of information needed to decide, at the same time.</b>`);
  t(`Üç soru, tek ekranda, canlı`,
    `Three questions, one screen, live`);
  t(`Sistem yeni bir iş akışı dayatmaz. Operatörün zaten sorduğu üç soruyu, sayfa yenilemeden güncellenen tek bir ekranda cevaplar.`,
    `The system does not impose a new workflow. It answers the three questions the operator already asks, on a single screen that updates without a page reload.`);
  t(`Olay nerede?`,
    `Where is the incident?`);
  t(`Olay, öncelik rengiyle haritaya düşer. Konumu, türü ve açılış zamanı kayıt altındadır.`,
    `The incident lands on the map in its priority colour. Its position, type and opening time are recorded.`);
  t(`Kaza · tıkanıklık · ihlal · yol çalışması`,
    `Accident · congestion · violation · roadworks`);
  t(`Dört öncelik seviyesi`,
    `Four priority levels`);
  t(`En yakın uygun ekip kim?`,
    `Which nearby unit is suitable?`);
  t(`Sahadaki tüm personel harita üzerinde. İşaretçi rengi görev durumunu gösterir.`,
    `All field personnel are on the map. The marker colour shows duty status.`);
  t(`Konum 3 saniyede bir güncellenir`,
    `Position refreshes every 3 seconds`);
  t(`Geçmiş rota sorgulanabilir`,
    `Past routes can be queried`);
  t(`Gerçekten müsait mi?`,
    `Is it genuinely available?`);
  t(`Görevlendirme anında kilitle doğrulanır. Meşgul bir ekip ikinci bir olaya atanamaz.`,
    `Verified with a lock at the moment of dispatch. A busy unit cannot be assigned to a second incident.`);
  t(`Veritabanı seviyesinde garanti`,
    `Guaranteed at database level`);
  t(`Kritik olay öncelik devralabilir`,
    `A critical incident can preempt`);
  t(`Tasarımın omurgası: "müsait mi?" sorusunun cevabı ekranda gösterilen bir bilgi değil, görevlendirme anında veritabanının zorladığı bir kural. Ekranda gördüğünüz eskimiş olabilir; kural eskiyemez.`,
    `<b>The backbone of the design:</b> the answer to "is it available?" is not a value shown on the screen, it is <b>a rule the database enforces</b> at the moment of dispatch. What you see on screen may be stale; the rule cannot go stale.`);
  t(`Üç rol, keskin sınırlar`,
    `Three roles, sharp boundaries`);
  t(`Yetki kontrolü uç nokta seviyesinde yapılır ve API sözleşmesinin görünür parçasıdır. Yeni bir uç nokta eklendiğinde yetki kuralı yazılmadıysa bu, sözleşme dosyasında gözle görülür.`,
    `Authorization is checked at endpoint level and is a visible part of the API contract. If a new endpoint is added without an authorization rule, that is plain to see in the contract file.`);
  t(`Rol`,
    `Role`);
  t(`Personel`,
    `Personnel`);
  t(`Olay`,
    `Incident`);
  t(`Görevlendirme`,
    `Dispatch`);
  t(`Görüntüleme`,
    `Viewing`);
  t(`sistem yöneticisi`,
    `system administrator`);
  t(`Oluştur · Güncelle · Pasifleştir`,
    `Create · Update · Deactivate`);
  t(`Tam yetki`,
    `Full access`);
  t(`Tümü`,
    `All`);
  t(`merkez operatörü`,
    `centre operator`);
  t(`Yazamaz`,
    `Cannot write`);
  t(`Oluştur · Güncelle`,
    `Create · Update`);
  t(`Ata · Kaldır · Durum değiştir`,
    `Assign · Remove · Change status`);
  t(`izleyici`,
    `viewer`);
  t(`sözleşme`,
    `contract`);
  t(`Neden anotasyonlar arayüzde? Bir uç noktanın yolu, yetkisi, doğrulaması ve ne yaptığı tek dosyada okunur. Controller sınıfı yalnızca @Override içerir; iş kuralı oraya sızdırmak yapının kendisiyle çelişir. Spring MVC'nin arayüzdeki anotasyonları işlediği varsayılmadı: her parametre tipi çalışan sisteme karşı ayrı ayrı denendikten sonra sekiz controller'ın tamamına uygulandı.`,
    `<b>Why are the annotations on the interface?</b> An endpoint's path, authorization, validation and behaviour are read in a single file. The controller class contains only <span class="chip-mono">@Override</span>; leaking business rules into it would contradict the structure itself.<br><br> It was <b>not assumed</b> that Spring MVC honours annotations declared on an interface: every parameter type was tested individually against the running system before the pattern was applied to all eight controllers.`);
  t(`Operasyon canlı akış`,
    `<span class="lvbadge lv1"><span class="lvdot"></span>Operations</span><span class="ihint pulse"><svg><use href="#i-play"/></svg> live flow</span>`);
  t(`Konum bildiriminden görevlendirmeye`,
    `From a location report to dispatch`);
  t(`Aynı olay, altı durakta izleniyor. Her durak farklı bir teknolojiye denk geliyor; sunumun geri kalanı bu durakları tek tek açacak.`,
    `The same event is followed through six stops. Each stop maps to a different technology; the rest of the deck opens them one by one.`);
  t(`1 · Konum bildirimi`,
    `1 · Location report`);
  t(`Operatörün baktığı ekran`,
    `The screen the operator looks at`);
  t(`Aşağıdaki pano canlı çalışıyor: işaretçiler hareket ediyor, başka bir operatörün açtığı olay bildirim olarak düşüyor. Ekran tasarımı MUI v6 üzerine kurulu; renk kodlaması tüm ekranlarda aynı.`,
    `The dashboard below is running live: markers move and an incident opened by another operator arrives as a notification. The UI is built on MUI v6; the colour coding is identical across all screens.`);
  t(`localhost:3000/dashboard`,
    `<span class="dotr"></span><span class="dotr"></span><span class="dotr"></span><span class="url">localhost:3000/dashboard</span>`);
  t(`Yeni olay`,
    `New incident`);
  t(`Aktif olay`,
    `Active incidents`);
  t(`Müsait`,
    `Available`);
  t(`Görevde`,
    `On duty`);
  t(`Kritik`,
    `Critical`);
  t(`Aktif olaylar`,
    `Active incidents list`);
  t(`Zincirleme kazaEVT-2026-001042 · D-100 KRİTİK`,
    `<span class="pr" style="background:var(--danger)"></span><span class="txt"><span class="tt">Multi-vehicle collision</span><span class="ts">EVT-2026-001042 · D-100</span></span><span class="bd" style="color:var(--danger);border-color:rgba(248,113,113,.4)">CRITICAL</span>`);
  t(`Şerit ihlaliEVT-2026-001041 · E-5 YÜKSEK`,
    `<span class="pr" style="background:var(--warn)"></span><span class="txt"><span class="tt">Lane violation</span><span class="ts">EVT-2026-001041 · E-5</span></span><span class="bd" style="color:var(--warn);border-color:rgba(251,191,36,.4)">HIGH</span>`);
  t(`Yoğun trafikEVT-2026-001039 · Sahil yolu ORTA`,
    `<span class="pr" style="background:var(--accent)"></span><span class="txt"><span class="tt">Heavy traffic</span><span class="ts">EVT-2026-001039 · Coast road</span></span><span class="bd" style="color:var(--accent);border-color:rgba(79,141,255,.4)">MEDIUM</span>`);
  t(`Yol çalışmasıEVT-2026-001036 · Merkez DÜŞÜK`,
    `<span class="pr" style="background:var(--t3)"></span><span class="txt"><span class="tt">Roadworks</span><span class="ts">EVT-2026-001036 · City centre</span></span><span class="bd" style="color:var(--t3);border-color:var(--line-2)">LOW</span>`);
  t(`Canlı harita`,
    `Live map`);
  t(`İşaretçi rengi görev durumu, olay rengi öncelik. Renkler TypeScript sabitlerinde tutulur — canvas bağlamı CSS değişkeni çözemez.`,
    `Marker colour is duty status, incident colour is priority. Colours live in TypeScript constants — a canvas context cannot resolve CSS variables.`);
  t(`İstatistik kartları`,
    `Statistic cards`);
  t(`Ağır toplama sorguları Redis üzerinde 30 saniye önbelleklenir.`,
    `Heavy aggregate queries are cached in Redis for 30 seconds.`);
  t(`Personel ekranı`,
    `Personnel screen`);
  t(`240+ kayıt sayfalı listede. Arama girişi geciktirilir, her tuş vuruşunda istek gitmez.`,
    `240+ records in a paginated list. Search input is debounced; a request is not sent on every keystroke.`);
  t(`Canlı bildirim`,
    `Live notifications`);
  t(`Başka bir operatörün işlemi bu ekrana da düşer. Sayfa yenilemesi yoktur.`,
    `Another operator's action also lands on this screen. There is no page refresh.`);
  t(`Aşama 2`,
    `<span class="lvbadge lv2"><span class="lvdot"></span>Stage 2</span>`);
  t(`Mimari: sistemi ne taşıyor?`,
    `Architecture: what carries the system?`);
  t(`Ekranın arkasında hangi kararlar var? Bu aşamada paket düzeninden indeks seçimine kadar her karar gerekçesiyle birlikte.`,
    `Which decisions sit behind the screen? In this stage every decision — from package layout to index choice — comes with its rationale.`);
  t(`Teknoloji yığını ve neden bu bileşenler`,
    `The technology stack and why these components`);
  t(`İş alanına göre paketleme`,
    `Packaging by domain`);
  t(`Günde 7 milyon satırı taşıyan veri modeli`,
    `A data model carrying 7 million rows a day`);
  t(`Doğru indeks olmadan çalışmayan sorgular`,
    `Queries that do not work without the right index`);
  t(`Her bileşen bir soruna karşılık geliyor`,
    `Every component answers a specific problem`);
  t(`Projede "ileride lazım olur" diye eklenip kapalı bırakılmış bileşen yok. Her biri çalışır durumda ve neyi çözdüğü ölçülebilir.`,
    `There is no component in this project that was added "in case we need it later" and left switched off. Each one is running and what it solves is measurable.`);
  t(`Virtual thread, record ve sealed interface desteği. Güvenlik, veri erişimi ve izleme tek yapılandırma altında.`,
    `Virtual threads, records and sealed interfaces. Security, data access and observability under one configuration.`);
  t(`Tablo bölümleme, pg_trgm ve BRIN indeks çekirdekte. Ek ürün gerekmedi.`,
    `Table partitioning, <span class="chip-mono">pg_trgm</span> and BRIN indexes are in the core. No extra product was needed.`);
  t(`Tek thread'li yürütme atomik Lua script'e imkân verir. Dört ayrı iş için kullanılıyor.`,
    `Single-threaded execution makes atomic Lua scripts possible. Used for four separate jobs.`);
  t(`Düzensiz ve yüksek hacimli konum akışını veritabanından ayıran tampon.`,
    `A buffer that separates the irregular, high-volume location stream from the database.`);
  t(`Tek yönlü akış için WebSocket'ten az parça: HTTP üzerinde çalışır, yeniden bağlanma protokolde tanımlı.`,
    `Fewer moving parts than WebSocket for a one-way stream: it runs over HTTP and reconnection is defined by the protocol itself.`);
  t(`Sunucu durumu RTK Query önbelleğinde, istemci durumu Redux slice'ta. İki kaynak birbirine kopyalanmaz.`,
    `Server state lives in the RTK Query cache, client state in a Redux slice. The two sources are never copied into each other.`);
  t(`Değerlendirildi, kullanılmadı`,
    `Evaluated, not used`);
  t(`PostGIS — coğrafi ihtiyaç indeksli enlem/boylam aralık sorgusuyla karşılanıyor. Poligon içi arama gerekirse eklenmeli.`,
    `<b>PostGIS</b> — the geographic need is met by an indexed latitude/longitude range query. It should be added if polygon search becomes necessary.`);
  t(`WebSocket — akış tek yönlü. Çift yönlü iletişim gerekmediği için ek karmaşıklık.`,
    `<b>WebSocket</b> — the stream is one-way. Extra complexity, since two-way communication is not required.`);
  t(`Elasticsearch — arama, ad ve sicil üzerinde alt dize araması. pg_trgm ayrı küme işletmeden karşılıyor.`,
    `<b>Elasticsearch</b> — search is a substring match over name and badge number. <span class="chip-mono">pg_trgm</span> covers it without operating a separate cluster.`);
  t(`Redis'in dört işi`,
    `The four jobs of Redis`);
  t(`Önbellek — dashboard istatistikleri, 30 sn`,
    `<b>Cache</b> — dashboard statistics, 30 s`);
  t(`Pub/Sub — SSE yayınlarının örnekler arası dağıtımı`,
    `<b>Pub/Sub</b> — distributing SSE broadcasts across instances`);
  t(`Hız sınırı — token bucket sayaçları (Lua)`,
    `<b>Rate limiting</b> — token bucket counters (Lua)`);
  t(`Idempotency — tekrarlanan isteklerin tespiti`,
    `<b>Idempotency</b> — detecting repeated requests`);
  t(`Dördünü tek bileşenle karşılamak, işletim yükünü dört ayrı ürüne dağıtmaktan düşük tutuyor.`,
    `Covering all four with a single component keeps the operational burden lower than spreading them across four separate products.`);
  t(`Mimari katmanlara tıklayın`,
    `<span class="lvbadge lv2"><span class="lvdot"></span>Architecture</span><span class="ihint"><svg><use href="#i-target"/></svg> click the layers</span>`);
  t(`Teknik katmana göre değil, iş alanına göre`,
    `By domain, not by technical layer`);
  t(`Katman bazlı paketlemede tek bir özellik değişikliği beş ayrı klasöre dokunmayı gerektirir. Burada bir özelliğin tüm parçaları tek ağaç altında.`,
    `With layer-based packaging, a single feature change requires touching five separate folders. Here every part of a feature sits under one tree.`);
  t(`com.trafficops security/ kimlik doğrulama, JWT, yetkilendirme police/ personel yönetimi organization/ birim, takım, referans veri event/ trafik olayları assignment/ olay – personel görevlendirmesi location/ konum bildirimi ve Kafka ingest'i realtime/ SSE yayını ve Redis pub/sub dashboard/ istatistikler common/ hata, idempotency, hız sınırı Her feature paketi aynı iskelete sahiptir: client/ API sözleşmesi (arayüz) controller/ sözleşmenin gerçekleştirimi service/ iş kuralı arayüzü service/impl/ iş kuralı gerçekleştirimi repository/ veri erişimi entity/ JPA varlıkları dto/ istek/yanıt nesneleri (record)`,
    `<span class="tk">com.trafficops</span>
  <span class="tn" data-k="security">security/</span>      <span class="tc">authentication, JWT, authorization</span>
  <span class="tn" data-k="police">police/</span>        <span class="tc">personnel management</span>
  <span class="tn" data-k="org">organization/</span>  <span class="tc">unit, team, reference data</span>
  <span class="tn" data-k="event">event/</span>         <span class="tc">traffic incidents</span>
  <span class="tn" data-k="assignment">assignment/</span>    <span class="tc">incident – officer dispatch</span>
  <span class="tn" data-k="location">location/</span>      <span class="tc">location reporting and Kafka ingest</span>
  <span class="tn" data-k="realtime">realtime/</span>      <span class="tc">SSE broadcast and Redis pub/sub</span>
  <span class="tn" data-k="dashboard">dashboard/</span>     <span class="tc">statistics</span>
  <span class="tn" data-k="common">common/</span>        <span class="tc">errors, idempotency, rate limiting</span>

<span class="tc">Every feature package shares the same skeleton:</span>
  <span class="tn" data-k="client">client/</span>        <span class="tc">API contract (interface)</span>
  <span class="tn" data-k="controller">controller/</span>    <span class="tc">implementation of the contract</span>
  <span class="tn" data-k="service">service/</span>       <span class="tc">business rule interface</span>
  <span class="tn" data-k="impl">service/impl/</span>  <span class="tc">business rule implementation</span>
  <span class="tn" data-k="repo">repository/</span>    <span class="tc">data access</span>
  <span class="tn" data-k="entity">entity/</span>       <span class="tc">JPA entities</span>
  <span class="tn" data-k="dto">dto/</span>          <span class="tc">request/response objects (record)</span>`);
  t(`Bir pakete tıklayın. Her paketin ne barındırdığı ve neden ayrı durduğu burada açılır.`,
    `<b>Click a package.</b> What each package holds and why it stands apart opens up here.`);
  t(`Bağımlılık yönü tek taraflı. Controller servise, servis repository'ye bağlıdır; ters yön yoktur. Bunun somut karşılığı konum ingest'i: LocationIngestChannel arayüzünün Kafka ve doğrudan-yazma olmak üzere iki gerçekleştirimi var. Hangisinin çalışacağı tek bir ortam değişkeniyle belirleniyor, çağıran kod hiç değişmiyor.`,
    `<b>The dependency direction is one-way.</b> The controller depends on the service, the service on the repository; never the reverse. The concrete example is location ingest: the <span class="chip-mono">LocationIngestChannel</span> interface has two implementations, Kafka and direct-write. Which one runs is decided by a single environment variable, and the calling code does not change at all.`);
  t(`Dokuz tablo, tek kritik ilişki`,
    `Nine tables, one critical relationship`);
  t(`Model küçük. Zorluk tablo sayısında değil, event_assignments üzerindeki tek kuralda: bir personelin aynı anda yalnızca bir aktif görevlendirmesi olabilir.`,
    `The model is small. The difficulty is not in the number of tables but in the single rule on <span class="chip-mono">event_assignments</span>: an officer can have only one active assignment at a time.`);
  t(`Tablo`,
    `Table`);
  t(`İçerik`,
    `Contents`);
  t(`İlişki`,
    `Relationship`);
  t(`Not`,
    `Note`);
  t(`Kullanıcı, rol, şifre özeti`,
    `User, role, password hash`);
  t(`Organizasyon hiyerarşisi`,
    `Organisational hierarchy`);
  t(`birim → takım → personel`,
    `unit → team → officer`);
  t(`Referans verisi migration'da`,
    `Reference data in the migration`);
  t(`Sicil, ad, rütbe, görev durumu`,
    `Badge number, name, rank, duty status`);
  t(`Ada göre trigram indeks`,
    `Trigram index on the name`);
  t(`Plaka, tip, zimmet`,
    `Plate, type, assignment`);
  t(`Kod, tür, öncelik, durum, konum`,
    `Code, type, priority, status, position`);
  t(`Sürüm alanı ile korunur`,
    `Protected by a version field`);
  t(`Rol, durum, zaman damgaları`,
    `Role, status, timestamps`);
  t(`olay ⟷ personel`,
    `incident ⟷ officer`);
  t(`Kısmi UNIQUE indeks burada`,
    `The partial UNIQUE index lives here`);
  t(`Enlem, boylam, hız, yön, zaman`,
    `Latitude, longitude, speed, heading, time`);
  t(`Aylık bölümlenmiş tablo`,
    `Monthly partitioned table`);
  t(`demo kurulumunda`,
    `in the demo setup`);
  t(`Konum aralığı`,
    `Reporting interval`);
  t(`bildirim sıklığı`,
    `report frequency`);
  t(`Günlük büyüme`,
    `Daily growth`);
  t(`konum satırı`,
    `location rows`);
  t(`Bu hacim tek parça bir tabloda birkaç ay dayanır. Sonra sorgular değil, önce bakım işlemleri yavaşlar: VACUUM uzar, indeks belleğe sığmaz, eski veriyi silmek saatler sürer. Sonraki slayt bunun çözümü.`,
    `<b>In a single unpartitioned table this volume survives a few months.</b> Then it is not queries that slow down first, it is <b>maintenance work</b>: VACUUM takes longer, indexes no longer fit in memory, deleting old data takes hours. The next slide is the answer to that.`);
  t(`Mimari sorguyu çalıştırın`,
    `<span class="lvbadge lv2"><span class="lvdot"></span>Architecture</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> run the query</span>`);
  t(`17 bölüm, sorgu yalnızca birine bakıyor`,
    `17 partitions, the query reads only one`);
  t(`police_locations tablosu recorded_at sütununa göre aylık RANGE bölümlerine ayrılmış. Aşağıda iki sorguyu karşılaştırın.`,
    `The <span class="chip-mono">police_locations</span> table is split into monthly RANGE partitions on the <span class="chip-mono">recorded_at</span> column. Compare the two queries below.`);
  t(`hazır`,
    `ready`);
  t(`Zaman filtreli sorgu, planlama aşamasında ilgisiz bölümleri eler. Gerçek sistemde EXPLAIN çıktısı bunu doğruladı: 17 bölümün 16'sı elendi (Subplans Removed: 16).`,
    `<b>A time-filtered query</b> eliminates irrelevant partitions during planning. On the real system the <span class="chip-mono">EXPLAIN</span> output confirmed it: 16 of 17 partitions were removed (<span class="chip-mono">Subplans Removed: 16</span>).`);
  t(`Bölüm eleme`,
    `Partition pruning`);
  t(`"Son 24 saatin rotası" sorgusu yalnızca ilgili ayın bölümünü okur.`,
    `The "last 24 hours of the route" query reads only the partition for the relevant month.`);
  t(`Ucuz arşivleme`,
    `Cheap archiving`);
  t(`Eski veriyi silmek milyonlarca satırlık DELETE değil, tek bir DROP TABLE. Saniyeler sürer, tablo şişmez.`,
    `Deleting old data is not a <span class="chip-mono">DELETE</span> over millions of rows but a single <span class="chip-mono">DROP TABLE</span>. It takes seconds and does not bloat the table.`);
  t(`Küçük indeks`,
    `Small indexes`);
  t(`Her bölüm kendi indeksini taşır; indeksler bellekte tutulabilir boyutta kalır.`,
    `Each partition carries its own index; indexes stay small enough to be held in memory.`);
  t(`Mimari yarışı başlatın`,
    `<span class="lvbadge lv2"><span class="lvdot"></span>Architecture</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> start the race</span>`);
  t(`Aramanın çalışması indeks tipine bağlı`,
    `Whether search works depends on the index type`);
  t(`Operatör personel adının ortasından arama yapar: LIKE '%yılmaz%'. Standart B-tree indeksi bu deseni kullanamaz. Aşağıda iki plan yan yana koşuyor.`,
    `Operators search from the middle of a name: <span class="chip-mono">LIKE '%yilmaz%'</span>. A standard B-tree index <b>cannot</b> use this pattern. Two plans run side by side below.`);
  t(`İndeks`,
    `Index`);
  t(`Alan`,
    `Field`);
  t(`Neden bu tip`,
    `Why this type`);
  t(`B-tree (bileşik)`,
    `<b>B-tree (composite)</b>`);
  t(`Hem "son konum" hem "rota geçmişi" sorgusunu tek indeksle karşılar.`,
    `Serves both the "last position" and the "route history" query with a single index.`);
  t(`ad, sicil no`,
    `name, badge number`);
  t(`Alt dize araması B-tree kullanamaz. Trigram indeksi olmadan her arama tam tablo taraması yapar.`,
    `A B-tree cannot serve a substring search. Without a trigram index every search does a full table scan.`);
  t(`Veri zamana göre sıralı eklendiği için B-tree'nin çok küçük bir kesri boyutunda benzer fayda verir.`,
    `Because data is appended in time order, it gives a comparable benefit at a tiny fraction of a B-tree's size.`);
  t(`Kısmi UNIQUE`,
    `<b>Partial UNIQUE</b>`);
  t(`İş kuralını uygulamaya değil veritabanına yaptırır. Sonraki aşamanın konusu.`,
    `Makes the <b>database</b> enforce the business rule instead of the application. The subject of the next stage.`);
  t(`Aşama 3`,
    `<span class="lvbadge lv3"><span class="lvdot"></span>Stage 3</span>`);
  t(`Doğruluk: iki operatör aynı anda`,
    `Correctness: two operators at the same time`);
  t(`Buraya kadar her şey tek kullanıcı varsayımıyla çalışıyordu. Şimdi ikinci operatör geliyor — ve aynı polisi farklı bir olaya atamaya çalışıyor.`,
    `Up to here everything worked on the assumption of a single user. Now a second operator arrives — and tries to assign the same officer to a different incident.`);
  t(`Kontrol-sonra-işlem yarışı ve ürettiği bozuk veri`,
    `The check-then-act race and the corrupt data it produces`);
  t(`Üç katmanlı savunma ve kilit sırası`,
    `Three layers of defence and lock ordering`);
  t(`Aynı kaydı iki kişi düzenlerse`,
    `When two people edit the same record`);
  t(`Kimlik, token rotasyonu ve SSE bileti`,
    `Identity, token rotation and the SSE ticket`);
  t(`Doğruluk kilidi açıp kapatın`,
    `<span class="lvbadge lv3"><span class="lvdot"></span>Correctness</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> toggle the lock</span>`);
  t(`Aynı polis, aynı anda, iki olay`,
    `The same officer, the same instant, two incidents`);
  t(`İki operatör aynı saniyede "ata" düğmesine basıyor. Kilit kapalıyken iki transaction da "personel müsait" cevabını okuyor ve ikisi de yazıyor.`,
    `Two operators press "assign" in the same second. With the lock off, both transactions read "officer available" and both write.`);
  t(`Kilit kapalıyken deneyin. İki transaction da uygunluk kontrolünden geçer; ikisi de yazar. Sonuç: bir polis iki olaya birden atanmış olur ve sahaya tek ekip gider.`,
    `<b>Try it with the lock off.</b> Both transactions pass the eligibility check; both write. The result: one officer ends up assigned to two incidents and only a single unit reaches the field.`);
  t(`Tek çözüm yeterli değil: üç katman`,
    `One solution is not enough: three layers`);
  t(`Her katman bir öncekinin atlanabileceği varsayımıyla eklenmiş. Üçüncüsü uygulamaya değil veritabanına dayanan nihai garanti.`,
    `Each layer was added assuming the previous one might be bypassed. The third is the final guarantee, resting on the database rather than the application.`);
  t(`Satır kilidi`,
    `Row lock`);
  t(`PESSIMISTIC_WRITE ile işlem başlarken olay ve personel satırları kilitlenir. İkinci transaction ilkinin bitmesini bekler ve güncel durumu okur.`,
    `With <span class="chip-mono">PESSIMISTIC_WRITE</span> the incident and officer rows are locked as the operation begins. The second transaction waits for the first to finish and reads the <b>current</b> state.`);
  t(`Sabit kilit sırası`,
    `Fixed lock ordering`);
  t(`Kilitler daima aynı sırayla alınır: önce olay, sonra personeller kimliğe göre artan sırada. Sıra sabit olmasaydı iki görevlendirme karşılıklı bekleyip kilitlenirdi.`,
    `Locks are always taken in the same order: the incident first, then officers in <b>ascending id</b> order. If the order were not fixed, two dispatches could wait on each other and deadlock.`);
  t(`Kısmi UNIQUE indeks`,
    `Partial UNIQUE index`);
  t(`Uygulama katmanındaki her kontrol bir hata sonucu atlansa bile veritabanı ikinci aktif görevlendirmeyi reddeder.`,
    `Even if every check in the application layer is bypassed through a bug, the database <b>rejects</b> a second active assignment.`);
  t(`nihai garanti`,
    `final guarantee`);
  t(`sabit sıra`,
    `fixed order`);
  t(`Görevlendirmede kötümser kilit doğru; ama kayıt düzenlemede her açılan formda satır kilitlemek sistemi kilitler. Burada iyimser kilitleme kullanılıyor.`,
    `A pessimistic lock is right for dispatch; but locking a row every time an edit form opens would freeze the system. Optimistic locking is used here.`);
  t(`Operatör A olayı açar, açıklamayı düzenler.`,
    `Operator A opens the incident and edits the description.`);
  t(`Operatör B aynı olayı açar, önceliği kritik yapar.`,
    `Operator B opens the same incident and raises the priority to critical.`);
  t(`A kaydeder. Ardından B kaydeder.`,
    `A saves. Then B saves.`);
  t(`B'nin yazdığı, A'nın değişikliğini sessizce siler. Kimse fark etmez.`,
    `<b>B's write silently erases A's change.</b> Nobody notices.`);
  t(`Kayıt okunurken sürüm numarası da alınır.`,
    `The version number is read together with the record.`);
  t(`A kaydeder, sürüm 4 → 5 olur.`,
    `A saves, the version goes 4 → 5.`);
  t(`B kaydetmeye çalışır; elindeki sürüm 4.`,
    `B tries to save; B holds version 4.`);
  t(`Çakışma hatası döner. Arayüz güncel veriyi yükler, B kararını yeniden verir.`,
    `<b>A conflict error is returned.</b> The UI reloads the current data and B makes the decision again.`);
  t(`İki kilit tipi, iki farklı soru. Kötümser kilit "bu satıra kimse dokunmasın" der ve çakışmayı önler — kısa, kritik işlemler için. İyimser kilit "dokunulduysa haberim olsun" der ve çakışmayı fark eder — kullanıcının form doldurduğu uzun aralıklar için. Görevlendirmede birincisi, düzenlemede ikincisi kullanılıyor.`,
    `<b>Two lock types, two different questions.</b> A pessimistic lock says "nobody may touch this row" and <b>prevents</b> the conflict — for short, critical operations. An optimistic lock says "let me know if it was touched" and <b>detects</b> the conflict — for the long gaps while a user fills in a form. Dispatch uses the first, editing the second.`);
  t(`Doğruluk parçalara tıklayın`,
    `<span class="lvbadge lv3"><span class="lvdot"></span>Correctness</span> <span class="ihint"><svg><use href="#i-target"/></svg> click the parts</span>`);
  t(`Kısa ömürlü erişim, dönen yenileme`,
    `Short-lived access, rotating refresh`);
  t(`Access token 15 dakika geçerli. Süresi dolduğunda arayüz kullanıcıya hissettirmeden yeniler ve başarısız isteği tekrarlar.`,
    `The access token is valid for 15 minutes. When it expires the UI renews it without the user noticing and retries the failed request.`);
  t(`İmza algoritması. Sunucu bu alana güvenmez; beklediği algoritmayı kendisi dayatır.`,
    `The signing algorithm. The server does not trust this field; it enforces the algorithm it expects.`);
  t(`Kullanıcı kimliği, rolü ve geçerlilik sonu. Şifreli değil, yalnızca imzalı — sır taşımaz.`,
    `User identity, role and expiry. Not encrypted, only signed — it carries no secrets.`);
  t(`Sunucu sırrıyla üretilir. Payload'daki tek bir karakter değişirse imza tutmaz.`,
    `Produced with the server secret. If a single character in the payload changes, the signature no longer matches.`);
  t(`15 dakika`,
    `15 minutes`);
  t(`Token çalınsa bile kullanım penceresi dar. Sunucuda oturum tutulmadığı için backend yatay ölçeklenebilir.`,
    `Even if the token is stolen the window of use is narrow. Because no session is kept on the server, the backend scales horizontally.`);
  t(`Rotasyon`,
    `Rotation`);
  t(`Her yenilemede eski refresh token geçersiz kılınır. Bir token ikinci kez kullanılırsa bu bir sızıntı işaretidir ve zincirin tamamı iptal edilir.`,
    `On every refresh the old refresh token is invalidated. If a token is used <b>a second time</b> that is a sign of leakage and the whole chain is revoked.`);
  t(`Özetle saklama`,
    `Stored as a hash`);
  t(`Refresh token'lar veritabanında SHA-256 özetiyle durur. Veritabanı okunsa bile doğrudan kullanılamaz.`,
    `Refresh tokens sit in the database as SHA-256 hashes. Even if the database is read they cannot be used directly.`);
  t(`Tarayıcı başlık gönderemiyorsa token nereye yazılır?`,
    `If the browser cannot send a header, where does the token go?`);
  t(`Tarayıcının EventSource API'si özel HTTP başlığı göndermeye izin vermez. Akışı açarken kimlik nasıl taşınacak?`,
    `The browser's <span class="chip-mono">EventSource</span> API does not allow custom HTTP headers. How is identity carried when opening the stream?`);
  t(`Tarayıcı geçmişine yazılır.`,
    `It is written into browser history.`);
  t(`Ters proxy ve sunucu erişim kayıtlarına düz metin olarak düşer.`,
    `It lands in reverse-proxy and server access logs in plain text.`);
  t(`Referrer başlığıyla üçüncü taraflara sızabilir.`,
    `It can leak to third parties through the Referrer header.`);
  t(`Süresi 15 dakika — bu süre boyunca tüm API için geçerli bir anahtar ortada dolaşır.`,
    `It is valid for 15 minutes — for that whole window a key valid for <b>the entire API</b> is floating around.`);
  t(`seçim`,
    `choice`);
  t(`POST /api/auth/stream-ticket normal başlıkla çağrılır.`,
    `<span class="chip-mono">POST /api/auth/stream-ticket</span> is called with a normal header.`);
  t(`Dönen bilet 60 saniye geçerli ve tek kullanımlık.`,
    `The returned ticket is valid for <b>60 seconds</b> and is <b>single-use</b>.`);
  t(`Yalnızca SSE uç noktası için geçerli; diğer API'lere kapı açmaz.`,
    `Valid only for the SSE endpoint; it opens no door to the other APIs.`);
  t(`Loglara düşse bile kullanılabilir ömrü çoktan bitmiş olur.`,
    `Even if it lands in the logs its usable lifetime is long gone.`);
  t(`Aşama 4`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Stage 4</span>`);
  t(`Ölçek: bugünün on katı yük`,
    `Scale: ten times today's load`);
  t(`Sistem çalışıyor. Peki tek sunucu yetmediğinde, saha cihazları toplu veri gönderdiğinde ve aynı istek üç kez ulaştığında ne oluyor?`,
    `The system works. But what happens when one server is not enough, when field devices send batched data, and when the same request arrives three times?`);
  t(`İkinci sunucu geldiğinde SSE nasıl bozulur`,
    `How SSE breaks once a second server appears`);
  t(`Konum akışını veritabanından ayırmak`,
    `Separating the location stream from the database`);
  t(`Thread başına bağlantı modelinin duvarı`,
    `The wall of the thread-per-connection model`);
  t(`Aynı isteğin ikinci kez gelmesi`,
    `The same request arriving a second time`);
  t(`Ani yükte kimin geçeceğine karar vermek`,
    `Deciding who gets through under a burst`);
  t(`Ölçek ikinci sunucuyu açın`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Scale</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> add a second server</span>`);
  t(`İkinci sunucu, sessizce bozulan yayın`,
    `A second server, a broadcast that breaks silently`);
  t(`Olay 1 numaralı örnekte oluşuyor. Ama operatörün SSE bağlantısı 2 numaralı örnekte — ve haberi olmuyor. Yük dengeleyici eklendiği gün ortaya çıkan, test ortamında görünmeyen hata.`,
    `The incident is created on instance 1. But the operator's SSE connection is on instance 2 — and never hears about it. A bug that surfaces the day a load balancer is added and is invisible in a test environment.`);
  t(`tek örnek`,
    `single instance`);
  t(`Tek sunucuda her şey çalışıyor gibi görünür. İkinci sunucuyu ekleyin, sonra Redis kapalıyken olay oluşturun.`,
    `On a single server everything appears to work. <b>Add the second server</b>, then create an incident with Redis switched off.`);
  t(`Yayını yapan örnek kendi mesajını da kanaldan geri alır — bu kasıtlı. Böylece "yerel yayın" ve "uzak yayın" diye iki ayrı kod yolu oluşmaz; tüm örnekler aynı yolu çalıştırır. Yerel geri dönüşün gecikmesi milisaniyenin altında. Davranış, ikinci bir container ayağa kaldırılarak doğrulandı.`,
    `<b>The publishing instance also receives its own message back from the channel — this is deliberate.</b> It prevents two separate code paths, "local broadcast" and "remote broadcast"; every instance runs the same path. The local round trip takes under a millisecond. The behaviour was verified by bringing up a second container.`);
  t(`Ölçek yükü artırın`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Scale</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> raise the load</span>`);
  t(`Saha cihazı 40 dakikalık veriyi bir anda gönderirse`,
    `What if a field device sends 40 minutes of data at once?`);
  t(`Konum bildirimi en yüksek hacimli uç nokta ve akışı düzensiz. Bağlantısı kopan bir cihaz yeniden bağlandığında biriken kayıtları toplu gönderir.`,
    `Location reporting is the highest-volume endpoint and its stream is irregular. When a device that lost connectivity reconnects, it sends the accumulated records in one batch.`);
  t(`normal yük`,
    `normal load`);
  t(`Saniyedeki konum bildirimi 120`,
    `Location reports per second <b id="kafkaRateL">120</b>`);
  t(`doğrudan · yanıt (model)`,
    `direct · response (model)`);
  t(`kafka · yanıt (model)`,
    `kafka · response (model)`);
  t(`meşgul db bağlantısı`,
    `busy db connections`);
  t(`tüketici gecikmesi`,
    `consumer lag`);
  t(`Sayılar 20 bağlantılık havuz ve ~18 ms'lik tek yazım varsayımıyla kurulmuş bir modeldir; ölçüm değildir.`,
    `The figures form a model built on a 20-connection pool and a ~18 ms single write; they are not measurements.`);
  t(`Dört karar, dört gerekçe`,
    `Four decisions, four rationales`);
  t(`Kafka'yı eklemek kolay; doğru yapılandırmak asıl iş. Aşağıdaki dört değer rastgele seçilmedi.`,
    `Adding Kafka is easy; configuring it correctly is the real work. The four values below were not chosen at random.`);
  t(`Parametre`,
    `Parameter`);
  t(`Değer`,
    `Value`);
  t(`Gerekçe`,
    `Rationale`);
  t(`Bölüm anahtarı`,
    `<b>Partition key</b>`);
  t(`Kafka sıralamayı yalnızca bölüm içinde garanti eder. Aynı personelin kayıtları aynı bölüme düşmezse rota sırası karışır ve harita geriye zıplar.`,
    `Kafka guarantees ordering only <b>within a partition</b>. If the records of the same officer do not land in the same partition, the route order is scrambled and the map jumps backwards.`);
  t(`Bölüm sayısı`,
    `<b>Partition count</b>`);
  t(`Tüketici sayısının (3) üzerinde tutuldu; yatay büyüme için topic'i yeniden oluşturmak gerekmez.`,
    `Kept above the consumer count (3); growing horizontally does not require recreating the topic.`);
  t(`Batch boyutu`,
    `<b>Batch size</b>`);
  t(`Tek tek yazım yerine toplu yazım. Veritabanına giden gidiş-dönüş sayısı iki mertebe azalır.`,
    `Batch writes instead of one-by-one. Round trips to the database drop by two orders of magnitude.`);
  t(`Onay modu`,
    `<b>Acknowledge mode</b>`);
  t(`Grup veritabanına yazılmadan offset ilerlemez. Tüketici çökerse grup yeniden okunur, veri kaybolmaz.`,
    `The offset does not advance until the group is written to the database. If a consumer crashes the group is read again and no data is lost.`);
  t(`Ölçülerek doğrulandı: 6 bölümlü topic, 3 tüketici, gecikme 0. 8 saniyede 96 yeni satır; elle gönderilen tek bir POST 202 dönüp verilen koordinatlarla veritabanında satır oluşturdu. İzleme için Kafka UI kurulu.`,
    `<b>Verified by measurement:</b> a topic with 6 partitions, 3 consumers, lag 0. 96 new rows in 8 seconds; a single manually sent POST returned 202 and produced a row in the database with the exact coordinates. Kafka UI is installed for monitoring.`);
  t(`Ve bir itiraf. Kafka yapılandırması uzun süre çalışmıyordu: güvenilen paket listesi bir paket taşımasından sonra eski adı gösteriyordu. Hata sessizdi — mesaj yazılıyor ama hiç işlenmiyordu. Bu, "hazır ama kapalı" bileşenlerin neden tehlikeli olduğunun somut örneği.`,
    `<b>And a confession.</b> The Kafka configuration <b>did not work</b> for a long time: the trusted package list still pointed at an old name after a package move. The failure was silent — messages were written but never processed. A concrete example of why "ready but switched off" components are dangerous.`);
  t(`Ölçek operatör sayısını artırın`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Scale</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> raise the operator count</span>`);
  t(`Açık kalan her bağlantı bir thread tutuyor`,
    `Every open connection holds a thread`);
  t(`SSE bağlantıları saatlerce açık kalır. Klasik platform thread havuzunda her açık bağlantı bir thread'i meşgul eder — ve o thread'in tek yaptığı beklemektir.`,
    `SSE connections stay open for hours. In a classic platform thread pool every open connection occupies a thread — and all that thread does is wait.`);
  t(`Eş zamanlı açık SSE bağlantısı 40`,
    `Concurrent open SSE connections <b id="vtNL">40</b>`);
  t(`Nerede bilinçli olarak kullanılmadı`,
    `Where it was deliberately not used`);
  t(`Virtual thread her yere serpiştirilecek bir hızlandırıcı değil. Dört yerde bilerek kullanılmadı; gerekçeleri kodda yorum olarak da yazılı.`,
    `Virtual threads are not an accelerator to sprinkle everywhere. They were deliberately left out in four places; the reasons are written as comments in the code as well.`);
  t(`JPA transaction içinde paralellik`,
    `Parallelism inside a JPA transaction`);
  t(`EntityManager thread'e bağlıdır. Transaction içindeki sorguları farklı thread'lere dağıtmak sessiz veri bozulması riski doğurur. Dashboard'un üç sorgusu tek transaction'da sırayla kalır.`,
    `<span class="chip-mono">EntityManager</span> is bound to a thread. Spreading the queries inside a transaction across different threads creates a risk of <b>silent data corruption</b>. The dashboard's three queries stay sequential in one transaction.`);
  t(`CPU yoğun işler`,
    `CPU-bound work`);
  t(`Virtual thread yalnızca bloke eden G/Ç sırasında taşıyıcı thread'i serbest bırakır. Hesaplama süresini kısaltmaz; çekirdek sayısı neyse odur.`,
    `A virtual thread releases its carrier thread only during <b>blocking I/O</b>. It does not shorten computation time; that is bounded by core count.`);
  t(`Konum simülatörü`,
    `The location simulator`);
  t(`60 eş zamanlı yazma çağrısı bağlantı havuzunu doldurup gerçek operatör isteklerini geciktirirdi. Simülatör bilerek sıralı bırakıldı.`,
    `60 concurrent write calls would fill the connection pool and delay <b>real operator requests</b>. The simulator was deliberately left sequential.`);
  t(`synchronized blokları`,
    `<span class="chip-mono">synchronized</span> blocks`);
  t(`Java 21'de synchronized içindeki virtual thread taşıyıcıya sabitlenir (pinning) ve kazanç kaybolur. Bu yüzden eş zamanlı koleksiyonlar tercih edildi.`,
    `In Java 21 a virtual thread inside <span class="chip-mono">synchronized</span> is <b>pinned</b> to its carrier and the benefit is lost. Concurrent collections were preferred for this reason.`);
  t(`Ve sert bir sınır: veritabanı bağlantı havuzu üst sınır olmaya devam eder. Binlerce virtual thread bağlantı isterse aynı anda yalnızca havuz boyutu kadarı gerçek bağlantı alır. Virtual thread veritabanı işlem kapasitesini artırmaz; yalnızca bekleyen isteğin maliyetini düşürür.`,
    `<b>And a hard limit:</b> the database connection pool remains the ceiling. If thousands of virtual threads ask for a connection, only as many as the pool size get a real one at a time. Virtual threads do <b>not</b> increase database throughput; they only lower the cost of a waiting request.`);
  t(`Ölçek düğmeye hızlıca iki kez basın`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Scale</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> press the button twice quickly</span>`);
  t(`Operatör çift tıklarsa sahaya iki ekip gider`,
    `A double click sends two units to the field`);
  t(`HTTP'de POST doğası gereği tekrarlanabilir değildir. Ağ zaman aşımı sonrası istemci tekrarı da aynı sonucu doğurur: iki olay kaydı, iki görevlendirme.`,
    `In HTTP, POST is not repeatable by nature. A client retry after a network timeout produces the same result: two incident records, two dispatches.`);
  t(`Idempotency-Key: KAPALI`,
    `Idempotency-Key: OFF`);
  t(`Anahtar kapalıyken düğmeye üst üste basın. Her basış yeni bir olay kaydı üretir.`,
    `<b>Press the button repeatedly with the key off.</b> Every press creates a new incident record.`);
  t(`Durum`,
    `Case`);
  t(`Davranış`,
    `Behaviour`);
  t(`İlk istek`,
    `<b>First request</b>`);
  t(`Anahtar rezerve edilir, istek işlenir, yanıt saklanır.`,
    `The key is reserved, the request is processed, the response is stored.`);
  t(`Aynı anahtar, tamamlanmış`,
    `<b>Same key, completed</b>`);
  t(`Saklanan yanıt döner + Idempotent-Replay: true`,
    `The stored response is returned + <span class="m">Idempotent-Replay: true</span>`);
  t(`Aynı anahtar, işleniyor`,
    `<b>Same key, in progress</b>`);
  t(`409 — istemci kısa süre sonra tekrar dener.`,
    `<span class="no">409</span> — the client retries shortly.`);
  t(`Aynı anahtar, farklı gövde`,
    `<b>Same key, different body</b>`);
  t(`409 — gövdenin SHA-256 özeti tutmuyor.`,
    `<span class="no">409</span> — the SHA-256 hash of the body does not match.`);
  t(`Redis erişilemiyor`,
    `<b>Redis unreachable</b>`);
  t(`İstek işlenir (fail-open).`,
    `The request is processed (fail-open).`);
  t(`Gövdenin özeti saklanır`,
    `The body hash is stored`);
  t(`Aynı anahtar farklı gövdeyle gelirse sessizce yanlış yanıt dönmek yerine hata verilir. Yanlış yanıt, yanıt vermemekten tehlikelidir.`,
    `If the same key arrives with a different body an error is returned instead of silently returning the wrong response. <b>A wrong answer is more dangerous than no answer.</b>`);
  t(`İki ayrı TTL`,
    `Two separate TTLs`);
  t(`Rezervasyon kilidi kısa, saklanan yanıt uzun ömürlü. Sunucu işin ortasında durursa anahtar 24 saat asılı kalmaz.`,
    `The reservation lock is short-lived, the stored response long-lived. If the server stops mid-operation the key does not hang around for 24 hours.`);
  t(`Anahtar arayüzde sabit`,
    `The key is stable in the UI`);
  t(`Anahtar form açıldığında üretilir ve başarıya kadar değişmez. Her tıklamada yenilenseydi çift tıklama iki farklı anahtar üretir, koruma hiç çalışmazdı. Bir testle korunuyor.`,
    `The key is generated when the form opens and <b>does not change until success</b>. If it were renewed on every click, a double click would produce two different keys and the protection would never work. It is guarded by a test.`);
  t(`Ölçek ani yük gönderin`,
    `<span class="lvbadge lv4"><span class="lvdot"></span>Scale</span> <span class="ihint pulse"><svg><use href="#i-play"/></svg> send a burst</span>`);
  t(`Kova dolu başlar, saniyede damlar`,
    `The bucket starts full and drips per second`);
  t(`Her istek kovadan bir token alır. Kova boşsa istek 429 ile reddedilir. Kova sabit hızda yeniden dolar.`,
    `Every request takes a token from the bucket. If the bucket is empty the request is rejected with <span class="chip-mono">429</span>. The bucket refills at a fixed rate.`);
  t(`Sayaç neden Lua script'i içinde?`,
    `Why is the counter inside a Lua script?`);
  t(`Token bucket "oku → hesapla → yaz" adımlarından oluşur. Bu üç adım ayrı Redis komutlarıyla yapılırsa iki eş zamanlı istek aynı eski değeri okur ve ikisi de geçer.`,
    `A token bucket consists of the steps "read → compute → write". If those three steps are done with separate Redis commands, two concurrent requests read the same stale value and <b>both get through</b>.`);
  t(`atomik`,
    `atomic`);
  t(`Neden token bucket, kayan pencere değil?`,
    `Why a token bucket and not a sliding window?`);
  t(`Bağlantısı kopan saha cihazı biriken konumları toplu gönderir. Kayan pencere bu meşru ani yükü reddederdi. Token bucket kapasite kadar burst'ü kabul edip yalnızca sürdürülebilir ortalamayı sınırlar.`,
    `A field device that lost connectivity sends its accumulated positions in one batch. A sliding window would reject that <b>legitimate</b> burst. A token bucket accepts a burst up to capacity and limits only the sustainable average.`);
  t(`Redis düşerse ne olur?`,
    `What happens if Redis goes down?`);
  t(`İstek geçirilir (fail-open). Hız sınırı uygulamanın kendisi değil bir koruma katmanıdır; acil durum merkezinde tüm trafiği reddetmek korumasız çalışmaktan ağır bir sonuçtur.`,
    `The request is <b>let through</b> (fail-open). Rate limiting is a protection layer, not the application itself; in an emergency centre, rejecting all traffic is a heavier outcome than running unprotected.`);
  t(`Sıfır dolum hızı yazılırsa`,
    `If a refill rate of zero is configured`);
  t(`Uygulama açılışta hata verir. Aksi hâlde sıfıra bölme sonsuz değer üretir ve sistem sessizce limitsiz çalışır — en tehlikeli hata tipi budur.`,
    `The application fails to start with a clear error. Otherwise the division by zero produces an infinite value and the system runs <b>silently</b> unlimited — the most dangerous kind of failure.`);
  t(`Limitler koddan değil, ortam dosyasından`,
    `Limits come from the environment file, not from code`);
  t(`Üç kuralın tamamı yeniden derleme gerektirmeden değiştirilebilir. Aynı değişkenler Docker kurulumunda da geçerli.`,
    `All three rules can be changed without recompiling. The same variables apply to the Docker setup as well.`);
  t(`# capacity=10 iken 14 giris denemesi $ for i in $(seq 14); do curl -s -o /dev/null \\ -w "%{http_code} " -X POST .../api/auth/login; done 401 401 401 401 401 401 401 401 401 401 429 429 429 429 # 11. istegin yaniti X-RateLimit-Limit: 10 X-RateLimit-Remaining: 0 X-RateLimit-Reset: 1786393693 Retry-After: 4 { "status": 429, "code": "RATE_LIMIT_EXCEEDED", "message": "Istek hizi siniri asildi..." }`,
    `<span class="dim"># 14 login attempts with capacity=10</span> <span class="hl">$ for i in $(seq 14); do curl -s -o /dev/null \\ -w "%{http_code} " -X POST .../api/auth/login; done</span> <span class="er">401 401 401 401 401 401 401 401 401 401</span> <span class="ok">429 429 429 429</span> <span class="dim"># response of the 11th request</span> X-RateLimit-Limit: <span class="hl">10</span> X-RateLimit-Remaining: <span class="hl">0</span> X-RateLimit-Reset: <span class="hl">1786393693</span> Retry-After: <span class="hl">4</span> { <span class="ok">"status"</span>: 429, <span class="ok">"code"</span>: "RATE_LIMIT_EXCEEDED", <span class="ok">"message"</span>: "Rate limit exceeded..." }`);
  t(`Arayüz bu yanıtı tanır ve kullanıcıya teknik kod yerine anlaşılır bir mesaj gösterir. İlk 10 isteğin 401 dönmesi beklenen davranış — kasıtlı olarak yanlış şifre gönderildi.`,
    `The UI recognises this response and shows the user a readable message instead of a technical code. The first 10 requests returning <span class="chip-mono">401</span> is expected — a deliberately wrong password was sent.`);
  t(`Yapılmayanlar ve nedenleri`,
    `What was not done, and why`);
  t(`Bir mimari sunumunun en değerli kısmı, kapsam dışında bırakılanları da söylemesidir. Aşağıdakiler eksik değil, bilinçli sınır.`,
    `The most valuable part of an architecture deck is that it also states what was left out of scope. The items below are not gaps, they are deliberate boundaries.`);
  t(`Konu`,
    `Topic`);
  t(`Mevcut durum`,
    `Current state`);
  t(`Önerilen adım`,
    `Suggested step`);
  t(`Yük testi`,
    `<b>Load testing</b>`);
  t(`Darboğazlar analizle bulunup giderildi, çözümlerin çalıştığı ölçüldü. Hedef ölçekte yük testi koşulmadı.`,
    `Bottlenecks were found and removed through analysis and the solutions were measured as working. No load test was run at the target scale.`);
  t(`Üretim öncesi konum uç noktası için yük testi`,
    `A load test for the location endpoint before production`);
  t(`Kafka topolojisi`,
    `<b>Kafka topology</b>`);
  t(`KRaft modunda tek broker.`,
    `A single broker in KRaft mode.`);
  t(`En az üç broker, replikasyon faktörü 3`,
    `At least three brokers, replication factor 3`);
  t(`Hatalı mesajlar`,
    `<b>Failing messages</b>`);
  t(`Sürekli başarısız mesaj yeniden deneme sonrası atlanır.`,
    `A message that keeps failing is skipped after the retries.`);
  t(`Ayrı hata topic'i (dead letter) ve inceleme akışı`,
    `A separate dead letter topic and a review flow`);
  t(`Hız sınırı kuralları`,
    `<b>Rate limit rules</b>`);
  t(`Üç kural koda tanımlı; değerleri ortam değişkeninden.`,
    `Three rules defined in code; their values come from environment variables.`);
  t(`Kural tanımının veritabanından yönetilmesi, rol bazlı kota`,
    `Managing rule definitions from the database, role-based quotas`);
  t(`Bölüm yönetimi`,
    `<b>Partition management</b>`);
  t(`Aylık bölümler migration ile oluşturulur.`,
    `Monthly partitions are created by a migration.`);
  t(`Zamanlanmış görev veya pg_partman`,
    `A scheduled job or <span class="m">pg_partman</span>`);
  t(`İzleme`,
    `<b>Observability</b>`);
  t(`Actuator metrikleri açık.`,
    `Actuator metrics are exposed.`);
  t(`Merkezî metrik toplama ve alarm`,
    `Central metric collection and alerting`);
  t(`Performans iddiası yok. Bu sunumda "şu kadar hızlandı" biçiminde bir cümle geçmiyor. Söylenen şu: darboğazlar doğru tespit edildi, çözümler uygulandı ve çalıştıkları ölçülerek gösterildi. Sayısal iyileşme iddiası için yük testi gerekir; o yapılmadı.`,
    `<b>No performance claim.</b> There is no sentence of the form "it got X times faster" in this deck. What is claimed is this: the bottlenecks were correctly identified, the solutions were applied and <b>they were shown to work by measurement.</b> A numerical improvement claim would require a load test; that was not done.`);
  t(`Dört aşamada ne kurduk?`,
    `What did we build in four stages?`);
  t(`1 · Operasyon`,
    `1 · Operations`);
  t(`Görünürlük problemi. Üç soru tek ekranda, canlı olarak cevaplanıyor.`,
    `A visibility problem. Three questions answered on one screen, live.`);
  t(`2 · Mimari`,
    `2 · Architecture`);
  t(`İş alanına göre paketleme, sözleşme arayüzleri, bölümlenmiş konum tablosu, doğru indeks tipi.`,
    `Packaging by domain, contract interfaces, a partitioned location table, the right index type.`);
  t(`3 · Doğruluk`,
    `3 · Correctness`);
  t(`Yarış koşuluna karşı üç katman, sabit kilit sırası, iyimser kilitleme, kısa ömürlü kimlik.`,
    `Three layers against the race condition, fixed lock ordering, optimistic locking, short-lived identity.`);
  t(`4 · Ölçek`,
    `4 · Scale`);
  t(`Redis pub/sub, Kafka tamponu, virtual thread, idempotency ve Lua ile atomik hız sınırı.`,
    `Redis pub/sub, the Kafka buffer, virtual threads, idempotency and an atomic rate limit with Lua.`);
  t(`Tek cümlede: Sahayı canlı gösteren, görevlendirmeyi veritabanı seviyesinde tutarlı tutan ve yükü uygulamanın kritik yolundan çıkaran bir operasyon merkezi kurmayı; her bileşeni çalıştığını ölçerek eklemeyi ve yapılmayanları da açıkça yazmayı.`,
    `<b>In one sentence:</b> building an operations centre that shows the field live, keeps dispatch consistent at database level and takes load off the application's critical path; adding every component only after <b>measuring that it works</b>, and stating plainly what was not done.`);
  t(`91 otomatik test 17 bölüm · 4 indeks tipi 3 katmanlı eşzamanlılık savunması Redis'in 4 işi 6 bölümlü topic · 3 tüketici`,
    `<span class="pill a"><svg><use href="#i-check"/></svg>91 automated tests</span> <span class="pill b"><svg><use href="#i-db"/></svg>17 partitions · 4 index types</span> <span class="pill c"><svg><use href="#i-lock"/></svg>3-layer concurrency defence</span> <span class="pill d"><svg><use href="#i-layers"/></svg>Redis's 4 jobs</span> <span class="pill g"><svg><use href="#i-stream"/></svg>6-partition topic · 3 consumers</span>`);
  t(`Tüm slaytlar`,
    `All slides`);
  t(`←→ gezin · O tüm slaytlar · Home başa · F tam ekran · R tekrar`,
    `<kbd>←</kbd><kbd>→</kbd> navigate · <kbd>O</kbd> all slides · <kbd>Home</kbd> start · <kbd>F</kbd> fullscreen · <kbd>R</kbd> replay`);

  /* Çalışma anında üretilen metinler (deck.js · tpl) */
  t(`{0} slayt · 4 aşama`,
    `{0} slides · 4 stages`);
  t(`{0} hatalı görevlendirme`,
    `{0} faulty dispatches`);
  t(`EKİP-{0}`,
    `UNIT-{0}`);
  t(`{0} görev`,
    `{0} assignments`);
  t(`çalışıyor…`,
    `running…`);
  t(`Zaman filtreli sorgu. Planlayıcı WHERE recorded_at >= now() - interval '24 hours' koşulunu görüp ilgisiz bölümleri planlama aşamasında eler. Gerçek sistemde EXPLAIN çıktısı bunu doğruladı: Subplans Removed: 16.`,
    `<b>Time-filtered query.</b> The planner sees the <span class='chip-mono'>WHERE recorded_at >= now() - interval '24 hours'</span> condition and eliminates irrelevant partitions <b>during planning</b>. On the real system the <span class='chip-mono'>EXPLAIN</span> output confirmed it: <span class='chip-mono'>Subplans Removed: 16</span>.`);
  t(`Filtresiz sorgu. Zaman koşulu olmadığı için planlayıcı hiçbir bölümü eleyemez ve 17 bölümün tamamını tarar. Bölümleme burada fayda sağlamaz — hatta 17 ayrı tarama planı yönetmek ek maliyettir. Bölümlemenin faydası, sorguların bölüm anahtarını içermesine bağlıdır.`,
    `<b>Unfiltered query.</b> With no time condition the planner cannot eliminate any partition and scans <b>all 17 partitions</b>. Partitioning brings no benefit here — managing 17 separate scan plans is in fact extra cost. The benefit of partitioning depends on queries carrying the partition key.`);
  t(`okunan bölüm: {0} / 17 · elenen: 0`,
    `partitions read: {0} / 17 · pruned: 0`);
  t(`bitti`,
    `done`);
  t(`{0} satır okundu`,
    `{0} rows read`);
  t(`{0} satır…`,
    `{0} rows…`);
  t(`Satır kilidi: AÇIK`,
    `Row lock: ON`);
  t(`Satır kilidi: KAPALI`,
    `Row lock: OFF`);
  t(`tutarlı`,
    `consistent`);
  t(`veri bozuldu`,
    `data corrupted`);
  t(`Kilit açıkken: B, A'nın transaction'ı bitene kadar bekler ve güncel durumu okur. Personelin artık meşgul olduğunu görür; görevlendirme reddedilir ve operatöre başka bir ekip seçmesi gerektiği söylenir. Bekleme milisaniyeler sürer — kullanıcı fark etmez.`,
    `<b>With the lock on:</b> B waits until A's transaction finishes and reads the <b>current</b> state. It sees the officer is now busy; the dispatch is rejected and the operator is told to pick another unit. The wait takes milliseconds — the user does not notice.`);
  t(`Kilit kapalıyken: iki transaction da aynı anda "personel müsait" cevabını okudu, ikisi de kural kontrolünden geçti ve ikisi de yazdı. Sonuç: bir polis iki olaya birden atanmış görünüyor. Sahaya tek ekip gidiyor, ikinci olay ekip geldiğini sanarak bekliyor. Bu, kodda hiçbir hata mesajı üretmeyen sessiz bir veri bozulmasıdır.`,
    `<b>With the lock off:</b> both transactions read "officer available" at the same moment, both passed the rule check and both wrote. The result: <b>one officer appears assigned to two incidents</b>. A single unit reaches the field while the second incident waits, believing a unit is on the way. This is a silent data corruption that produces no error message anywhere in the code.`);
  t(`rastgele sıra`,
    `random order`);
  t(`Sırayı bozup dene`,
    `Break the order and try`);
  t(`Sabit sıraya dön`,
    `Back to fixed order`);
  t(`iki örnek · redis açık`,
    `two instances · redis on`);
  t(`iki örnek · redis kapalı`,
    `two instances · redis off`);
  t(`Tek sunucuya dön`,
    `Back to one server`);
  t(`İkinci sunucuyu ekle`,
    `Add a second server`);
  t(`Redis pub/sub: AÇIK`,
    `Redis pub/sub: ON`);
  t(`Redis pub/sub: KAPALI`,
    `Redis pub/sub: OFF`);
  t(`Tek sunucuda sorun görünmez. Olay aynı örnekte oluşuyor ve aynı örneğe bağlı istemcilere gidiyor. Geliştirme ortamında her şey doğru çalışır — bu yüzden hata üretime kadar fark edilmez.`,
    `<b>On a single server the problem is invisible.</b> The incident is created on the same instance and goes to clients connected to that same instance. In a development environment everything works correctly — which is why the bug is not noticed until production.`);
  t(`Redis pub/sub açık. Yayın kanala yazılıyor ve tüm örnekler aboneyken kendi istemcilerine iletiyor. Yayını yapan örnek kendi mesajını da geri alır — böylece "yerel" ve "uzak" diye iki ayrı kod yolu oluşmaz.`,
    `<b>Redis pub/sub is on.</b> The broadcast is written to the channel and <b>every instance</b>, being subscribed, forwards it to its own clients. The publishing instance receives its own message back too — so there are never two separate code paths, "local" and "remote".`);
  t(`Redis kapalı. Olay 1 numaralı örnekte oluştu; yalnızca ona bağlı istemciler haberdar oldu. 2 numaralı örneğe bağlı operatörün ekranı sessizce eskiyor. Hata mesajı yok, log yok — sadece güncellenmeyen bir harita.`,
    `<b>Redis is off.</b> The incident was created on instance 1; only the clients attached to it were informed. The screen of the operator on instance 2 <b>goes stale silently</b>. No error, no log — just a map that stops updating.`);
  t(`zaman aşımı`,
    `timeout`);
  t(`sınırda`,
    `at the limit`);
  t(`aşırı yük`,
    `overloaded`);
  t(`Normal yükte iki yol da çalışır. Bu, mimari kararların en tehlikeli anıdır: doğrudan yazımın sorunu bu koşulda görünmez. Yükü artırın.`,
    `<b>Under normal load both paths work.</b> This is the most dangerous moment for architectural decisions: under this condition the problem with direct writes is <b>invisible</b>. Raise the load.`);
  t(`Bağlantı havuzu doldu. Doğrudan yazımda istekler artık bağlantı beklemeye başlıyor. Kafka yolunda yanıt süresi değişmedi; çünkü istek veritabanına hiç dokunmuyor.`,
    `<b>The connection pool is full.</b> With direct writes, requests now start waiting for a connection. On the Kafka path the response time has not changed, because the request never touches the database.`);
  t(`Kritik fark burada. Doğrudan yazımda konum bildirimleri havuzun tamamını tutuyor ve operatörün olay oluşturma isteği de aynı kuyruğa giriyor — yani saha cihazının burst'ü operasyon merkezini yavaşlatıyor. Kafka yolunda ani yük topic'te birikir (tüketici gecikmesi artar), veritabanı sabit hızda yazmaya devam eder ve operatör isteklerinin yanıt süresi etkilenmez.`,
    `<b>Here is the critical difference.</b> With direct writes the location reports hold the entire pool and <b>the operator's own incident-creation request joins the same queue</b> — meaning a field device's burst slows down the operations centre. On the Kafka path the burst accumulates in the topic (consumer lag rises), the database keeps writing at a steady rate and the response time of operator requests is <b>unaffected</b>.`);
  t(`virtual thread`,
    `virtual threads`);
  t(`platform havuzu`,
    `platform pool`);
  t(`Havuz yetiyor. {0} açık bağlantı, 200'lük havuzun {1}%'ini tutuyor. Bu thread'lerin tek yaptığı beklemek — ama yine de her biri ~1 MB yığın alanı ayırıyor.`,
    `<b>The pool is sufficient.</b> {0} open connections hold {1}% of the 200-thread pool. All these threads do is wait — yet each one still reserves about 1 MB of stack.`);
  t(`Havuz doluyor. {0} bağlantı 200'lük havuzun neredeyse tamamını tutuyor. Yeni bir normal API isteği geldiğinde ona verilecek thread kalmayabilir — SSE bağlantıları sıradan istekleri aç bırakır.`,
    `<b>The pool is filling up.</b> {0} connections hold almost the entire 200-thread pool. When a new <b>ordinary API request</b> arrives there may be no thread left for it — SSE connections starve regular requests.`);
  t(`Havuz tükendi. {0} bağlantı için yalnızca 200 thread var. Fazlası kuyrukta bekliyor: operatör giriş yapamıyor, harita açılmıyor. Sunucunun CPU'su boşta — darboğaz işlem gücü değil, thread sayısı.`,
    `<b>The pool is exhausted.</b> There are only 200 threads for {0} connections. The rest wait in the queue: operators cannot log in, the map does not open. The server's CPU is idle — <b>the bottleneck is not compute, it is thread count.</b>`);
  t(`Her bağlantı kendi virtual thread'inde. {0} bağlantı, JVM'in birkaç taşıyıcı (carrier) thread'i üzerinde çalışıyor. Bloke eden G/Ç sırasında taşıyıcı serbest kalır. Yığın maliyeti kilobayt mertebesinde; 10.000 bağlantı da aynı modelle taşınır. Sınır: veritabanı bağlantı havuzu hâlâ 20 — virtual thread yazma kapasitesini artırmaz.`,
    `<b>Every connection sits on its own virtual thread.</b> {0} connections run on a handful of the JVM's carrier threads. During blocking I/O the carrier is released. The stack cost is on the order of kilobytes; 10,000 connections are carried by the same model. <b>The limit:</b> the database connection pool is still 20 — virtual threads do not raise write capacity.`);
  t(`{0} taşıyıcı thread · {1} virtual thread bunların üzerinde`,
    `{0} carrier threads · {1} virtual threads on top of them`);
  t(`{0} / 200 thread meşgul`,
    `{0} / 200 threads busy`);
  t(`· {0} istek kuyrukta`,
    `  ·  {0} requests queued`);
  t(`{0} bağlantı taşınıyor`,
    `{0} connections carried`);
  t(`{0} bağlantı bekliyor`,
    `{0} connections waiting`);
  t(`Idempotency-Key: AÇIK`,
    `Idempotency-Key: ON`);
  t(`Anahtarı kapat`,
    `Turn the key off`);
  t(`Anahtarı aç`,
    `Turn the key on`);
  t(`Anahtar açık. Düğmeye üst üste basın: ilk istek kaydı oluşturur, sonrakiler aynı yanıtı döndürür.`,
    `<b>The key is on.</b> Press the button repeatedly: the first request creates the record, the rest return the same response.`);
  t(`Tekrar isteği yakalandı. Aynı anahtar Redis'te idem:{0} olarak zaten kayıtlı. Yeni kayıt oluşturulmadı; ilk isteğin yanıtı Idempotent-Replay: true başlığıyla döndü. İstemci için sonuç aynı, veritabanı için tek satır.`,
    `<b>A repeat request was caught.</b> The same key is already recorded in Redis as <span class='chip-mono'>idem:{0}</span>. No new record was created; the first request's response was returned with the <span class='chip-mono'>Idempotent-Replay: true</span> header. For the client the outcome is identical, for the database it is a single row.`);
  t(`İlk istek. Anahtar rezerve edildi, olay oluşturuldu ve yanıt saklandı. Şimdi tekrar basın.`,
    `<b>First request.</b> The key was reserved, the incident created and the response stored. Now press again.`);
  t(`{0}. kayıt oluşturuldu. Anahtar olmadığı için sunucu bu isteğin daha önce geldiğini bilemez. Operatörün çift tıklaması, sahaya iki ekip gönderilmesi demek.`,
    `<b>Record {0} created.</b> Without a key the server cannot know this request arrived before. An operator double-clicking means two units sent to the field.`);
  t(`{0} kayıt`,
    `{0} records`);
  t(`ilk kayıt`,
    `first record`);
  t(`TEKRAR — istenmeyen`,
    `REPEAT — unwanted`);
  t(`Kural: {0}`,
    `Rule: {0}`);
  t(`kapasite {0} · {1}/sn`,
    `capacity {0} · {1}/s`);
  t(`{0} Kova dolu başlar. Her istek bir token alır; kova boşsa istek 429 ile reddedilir ve Retry-After başlığı döner.`,
    `<b>{0}</b> The bucket starts full. Every request takes a token; if the bucket is empty the request is rejected with <span class='chip-mono'>429</span> and a <span class='chip-mono'>Retry-After</span> header is returned.`);
  t(`{0} istek geçti, {1} istek reddedildi. Kova boşaldığı an sunucu 429 döndürüyor ve Retry-After: {2} ile ne zaman tekrar denenebileceğini söylüyor. İstek downstream'e hiç ulaşmıyor — veritabanı bu yükü hiç görmüyor.`,
    `<b>{0} requests passed, {1} were rejected.</b> The moment the bucket empties the server returns <span class='chip-mono'>429</span> and states when to retry with <span class='chip-mono'>Retry-After: {2}</span>. The request never reaches downstream — the database <b>never sees</b> this load.`);
  t(`{0} istek geçti. Kovada {1} token kaldı. Kapasite kadar ani yük tolere edilir; sürdürülebilir hızı belirleyen dolum oranıdır.`,
    `<b>{0} requests passed.</b> {1} tokens left in the bucket. A burst up to capacity is tolerated; the refill rate is what sets the sustainable pace.`);
  t(`+{0} token/sn`,
    `+{0} tokens/s`);
  t(`kapasite {0}`,
    `capacity {0}`);
  t(`refill {0}/sn`,
    `refill {0}/s`);
  t(`Saha cihazı`,
    `Field device`);
  t(`1 · Konum bildirimi. Cihaz konumu gönderir. İstek doğrudan veritabanına yazılmaz; Kafka topic'ine bırakılır ve 202 Accepted anında döner. Böylece cihaz veritabanı yazımını beklemez.`,
    `<b>1 · Location report.</b> The device sends its position. The request is not written straight to the database; it is dropped onto a Kafka topic and <span class='chip-mono'>202 Accepted</span> returns immediately. The device therefore never waits for the database write.`);
  t(`6 bölüm · anahtar=policeId`,
    `6 partitions · key=policeId`);
  t(`2 · Tampon. Bölüm anahtarı policeId olduğu için aynı personelin kayıtları aynı bölüme düşer ve sıra korunur. Ani yük burada birikir, veritabanına yansımaz.`,
    `<b>2 · Buffer.</b> Because the partition key is <span class='chip-mono'>policeId</span>, records of the same officer land in the same partition and their order is preserved. A burst accumulates here and does not reach the database.`);
  t(`Tüketici`,
    `Consumer`);
  t(`500'lük batch`,
    `batches of 500`);
  t(`3 · Toplu yazma. Üç tüketici 500'lük gruplar hâlinde okur ve tek transaction'da yazar. Onay modu BATCH: grup yazılmadan offset ilerlemez.`,
    `<b>3 · Batch write.</b> Three consumers read in groups of 500 and write within a single transaction. Acknowledge mode <span class='chip-mono'>BATCH</span>: the offset does not advance until the group is written.`);
  t(`aylık bölümlü tablo`,
    `monthly partitioned table`);
  t(`4 · Kalıcı kayıt. Satır, ayına ait bölüme yazılır. Rota sorgusu daha sonra yalnızca ilgili bölümü okuyacak.`,
    `<b>4 · Durable record.</b> The row is written to the partition for its month. The route query will later read only the relevant partition.`);
  t(`tüm örneklere yayın`,
    `broadcast to all instances`);
  t(`5 · Yayın. Değişiklik Redis kanalına yazılır; tüm backend örnekleri aboneyken kendi SSE istemcilerine iletir. Operatör sayfayı yenilemez.`,
    `<b>5 · Broadcast.</b> The change is written to the Redis channel; every backend instance, being subscribed, forwards it to its own SSE clients. The operator never refreshes the page.`);
  t(`Operatör`,
    `Operator`);
  t(`harita güncellenir`,
    `the map updates`);
  t(`6 · Ekran. İşaretçi yeni konuma kayar. Bu noktadan sonra operatör görevlendirme yapar — ve oradaki asıl zorluk 3. aşamanın konusu.`,
    `<b>6 · Screen.</b> The marker slides to the new position. From here the operator dispatches — and the real difficulty there is the subject of stage 3.`);
  t(`Giriş uç noktası — IP bazlı, kaba kuvvete karşı bilinçli olarak sıkı.`,
    `Login endpoint — IP based and deliberately strict against brute force.`);
  t(`Konum bildirimi — saha cihazının toplu gönderimini tolere edecek kadar geniş.`,
    `Location reporting — wide enough to tolerate a field device sending a batch.`);
  t(`Diğer tüm /api/** uçları.`,
    `All other /api/** endpoints.`);
  t(`security/ — Kimlik doğrulama, JWT üretimi ve doğrulaması, refresh token rotasyonu, SSE bileti ve yetkilendirme yapılandırması. Diğer feature paketleri buraya bağımlı değildir; yetki kuralları kendi sözleşmelerinde durur.`,
    `<b>security/</b> — Authentication, JWT issuing and validation, refresh token rotation, the SSE ticket and authorization configuration. Other feature packages do not depend on it; authorization rules live in their own contracts.`);
  t(`police/ — Personel yönetimi. Sicil, rütbe, görev durumu, takım ve araç ilişkisi. Personel arama sorguları burada; trigram indeksinin karşılığı bu paketin repository'sinde.`,
    `<b>police/</b> — Personnel management. Badge number, rank, duty status, team and vehicle relations. Personnel search queries live here; the trigram index belongs to this package's repository.`);
  t(`organization/ — Birim ve takım hiyerarşisi ile referans veriler. Nadiren değişen bu veri Redis'te önbelleklenir; önbellek anotasyonu controller'da değil servis metodunda durur.`,
    `<b>organization/</b> — Unit and team hierarchy plus reference data. This rarely changing data is cached in Redis; the cache annotation sits on the service method, not on the controller.`);
  t(`event/ — Trafik olayının yaşam döngüsü: açılış, güncelleme, durum geçişleri. Olay güncellemeleri sürüm alanıyla korunur.`,
    `<b>event/</b> — The lifecycle of a traffic incident: opening, updating, status transitions. Incident updates are protected by a version field.`);
  t(`assignment/ — Projenin en kritik iş kuralı burada: bir personel aynı anda tek aktif görevlendirmeye sahip olabilir. Kötümser kilit, sabit kilit sırası ve öncelik devri kuralları bu pakette.`,
    `<b>assignment/</b> — The most critical business rule of the project lives here: an officer can hold only one active assignment at a time. Pessimistic locking, fixed lock ordering and preemption rules are in this package.`);
  t(`location/ — Konum bildirimi, geçmiş sorgusu ve Kafka ingest'i. LocationIngestChannel arayüzünün iki gerçekleştirimi (kafka / direct) burada yaşar.`,
    `<b>location/</b> — Location reporting, history queries and Kafka ingest. The two implementations of the <span class='chip-mono'>LocationIngestChannel</span> interface (kafka / direct) live here.`);
  t(`realtime/ — SSE bağlantı kayıtları, yayın ve Redis pub/sub abone yapılandırması. Yayın virtual thread'lerle eş zamanlı yapılır; yavaş bir istemci diğerlerini bekletmez.`,
    `<b>realtime/</b> — SSE connection registry, broadcasting and Redis pub/sub subscriber configuration. Broadcasts run concurrently on virtual threads; a slow client does not hold up the others.`);
  t(`dashboard/ — Operasyon istatistikleri. Ağır toplama sorguları 30 saniyelik Redis önbelleği arkasında.`,
    `<b>dashboard/</b> — Operational statistics. Heavy aggregate queries sit behind a 30-second Redis cache.`);
  t(`common/ — Feature'lara ait olmayan ortak yapı: tek tip hata yanıtı ve ErrorCode sözlüğü, idempotency aspect'i, hız sınırı filtresi ve Lua script'i, thread yapılandırması.`,
    `<b>common/</b> — Shared structure that belongs to no feature: the uniform error response and <span class='chip-mono'>ErrorCode</span> dictionary, the idempotency aspect, the rate limit filter and its Lua script, thread configuration.`);
  t(`client/ — API sözleşmesi. Yol, HTTP metodu, parametre anotasyonları, yetki kuralı ve Javadoc burada. Controller'ı okumadan uç noktanın ne yaptığı anlaşılır.`,
    `<b>client/</b> — The API contract. Path, HTTP method, parameter annotations, authorization rule and Javadoc live here. What an endpoint does is clear without reading the controller.`);
  t(`controller/ — Sözleşmenin gerçekleştirimi. Yalnızca @Override ve servis çağrısı içerir; iş kuralı barındırmaz.`,
    `<b>controller/</b> — The implementation of the contract. It contains only <span class='chip-mono'>@Override</span> and a service call; it holds no business rules.`);
  t(`service/ — İş kuralı arayüzü. Controller somut sınıfa değil bu soyutlamaya bağımlıdır.`,
    `<b>service/</b> — The business rule interface. The controller depends on this abstraction rather than on a concrete class.`);
  t(`service/impl/ — İş kuralı gerçekleştirimi. Transaction sınırları, kilitleme ve doğrulamalar burada.`,
    `<b>service/impl/</b> — The business rule implementation. Transaction boundaries, locking and validation live here.`);
  t(`repository/ — Veri erişimi. Liste sorguları entity grafiği yerine projeksiyon DTO'su döndürür; N+1 problemi böyle önlenir.`,
    `<b>repository/</b> — Data access. List queries return projection DTOs instead of an entity graph; this is how the N+1 problem is avoided.`);
  t(`entity/ — JPA varlıkları. Eskiden domain adındaydı; paket adı, içindekinin ne olduğunu doğrudan söylesin diye değiştirildi.`,
    `<b>entity/</b> — JPA entities. It used to be called <span class='chip-mono'>domain</span>; the package was renamed so that its name says directly what it holds.`);
  t(`dto/ — İstek ve yanıt nesneleri. Java 21 record tipiyle yazıldıkları için değişmezdirler ve eşitlik/hash davranışı ücretsiz gelir.`,
    `<b>dto/</b> — Request and response objects. Written as Java 21 <span class='chip-mono'>record</span> types, so they are immutable and equality/hash behaviour comes for free.`);

  /* Canvas etiketleri (sahnelerde fillText ile çizilenler) */
  t(`1 · Doğrudan veritabanına yazma`,
    `1 · Writing straight to the database`);
  t(`2 · Kafka üzerinden toplu yazma`,
    `2 · Batch writing through Kafka`);
  t(`3 SSE bağlantısı`,
    `3 SSE connections`);
  t(`6 bölüm · batch 500`,
    `6 partitions · batch 500`);
  t(`AŞAMA 1 · OPERASYON`,
    `STAGE 1 · OPERATIONS`);
  t(`AŞAMA 2 · MİMARİ`,
    `STAGE 2 · ARCHITECTURE`);
  t(`AŞAMA 3 · DOĞRULUK`,
    `STAGE 3 · CORRECTNESS`);
  t(`AŞAMA 4 · ÖLÇEK`,
    `STAGE 4 · SCALE`);
  t(`B-tree indeksi '%...%' desenini kullanamaz; planlayıcı onu atlar`,
    `a B-tree index cannot use the '%...%' pattern; the planner skips it`);
  t(`ELENDİ`,
    `PRUNED`);
  t(`Ekip-14 görevde`,
    `Unit-14 on duty`);
  t(`GELEN OLAYLAR`,
    `INCOMING INCIDENTS`);
  t(`Görevlendirme yapıldı`,
    `Dispatch completed`);
  t(`GİRİŞ`,
    `INTRO`);
  t(`KURAL`,
    `RULE`);
  t(`KİLİTLENME — T1, T2'nin tuttuğunu bekliyor; T2 de T1'inkini`,
    `DEADLOCK — T1 waits on what T2 holds; T2 waits on T1's`);
  t(`Olay kapatıldı`,
    `Incident closed`);
  t(`Operatör A · EVT-1042`,
    `Operator A · EVT-1042`);
  t(`Operatör B · EVT-1043`,
    `Operator B · EVT-1043`);
  t(`PLATFORM THREAD HAVUZU (200)`,
    `PLATFORM THREAD POOL (200)`);
  t(`Redis Lua script'i bu üç adımı bölünmeden yapar: oku → hesapla → yaz`,
    `the Redis Lua script performs these three steps without interruption: read → compute → write`);
  t(`SAHADAKİ EKİPLER`,
    `UNITS IN THE FIELD`);
  t(`SON İSTEKLER`,
    `RECENT REQUESTS`);
  t(`SORGU`,
    `QUERY`);
  t(`Seq Scan — indekssiz tam tablo taraması`,
    `Seq Scan — full table scan, no index`);
  t(`TARANIYOR`,
    `SCANNING`);
  t(`TARAYICI`,
    `BROWSER`);
  t(`VIRTUAL THREAD MODELİ`,
    `VIRTUAL THREAD MODEL`);
  t(`WHERE full_name ILIKE '%yılmaz%' · 240.000 satır`,
    `WHERE full_name ILIKE '%smith%' · 240,000 rows`);
  t(`Yeni olay: EVT-2026-001043`,
    `New incident: EVT-2026-001043`);
  t(`anahtar: IP`,
    `key: IP`);
  t(`anahtar: kullanıcı`,
    `key: user`);
  t(`aynı ekip birden fazla olayda`,
    `the same unit on more than one incident`);
  t(`aynı sorgu, aynı veri — fark yalnızca indeks tipi`,
    `same query, same data — the only difference is the index type`);
  t(`bağlantı kuyruğu`,
    `connection queue`);
  t(`bir sorgu çalıştırın`,
    `run a query`);
  t(`burada durdu`,
    `stopped here`);
  t(`cihaz`,
    `device`);
  t(`devre dışı`,
    `disabled`);
  t(`doğrudan`,
    `direct`);
  t(`event_assignments: 1 AKTİF satır — kural korundu`,
    `event_assignments: 1 ACTIVE row — the rule held`);
  t(`event_assignments: 2 AKTİF satır — aynı police_id`,
    `event_assignments: 2 ACTIVE rows — same police_id`);
  t(`görevde`,
    `on duty`);
  t(`haberi yok`,
    `never hears about it`);
  t(`henüz kayıt yok`,
    `no records yet`);
  t(`her iki transaction da kilitleri id'ye göre artan sırada alır`,
    `both transactions take locks in ascending id order`);
  t(`her istek bir bağlantı tutar`,
    `every request holds a connection`);
  t(`istek topic'e yazılır, 202 döner`,
    `the request is written to the topic, 202 returns`);
  t(`konum bildirimi → tampon → toplu yazma → kalıcı kayıt → yayın → ekran`,
    `location report → buffer → batch write → durable record → broadcast → screen`);
  t(`kural kontrolü`,
    `rule check`);
  t(`kısmi UNIQUE indeks olmasaydı bu satır yazılırdı`,
    `without the partial UNIQUE index this row would have been written`);
  t(`müsait`,
    `available`);
  t(`oku: müsait mi?`,
    `read: available?`);
  t(`okunan bölüm: 1 / 17 · elenen: 16`,
    `partitions read: 1 / 17 · pruned: 16`);
  t(`olay her zaman BACKEND-1'de oluşuyor`,
    `the incident is always created on BACKEND-1`);
  t(`operatör`,
    `operator`);
  t(`satır okundu`,
    `rows read`);
  t(`satır…`,
    `rows…`);
  t(`sıra farklı: T1 → 7, 11 · T2 → 11, 7`,
    `different order: T1 → 7, 11 · T2 → 11, 7`);
  t(`token`,
    `tokens`);
  t(`token/sn`,
    `tokens/s`);
  t(`trigram indeksi alt dize aramasını destekler; yalnızca eşleşen satırlar okunur`,
    `the trigram index supports substring search; only matching rows are read`);
  t(`tüm bağlantılar taşınıyor`,
    `all connections are carried`);
  t(`veritabanı durumu: bekleniyor`,
    `database state: pending`);
  t(`zaman →`,
    `time →`);
  t(`çubuk hızları temsilîdir; ölçülmüş süre değildir`,
    `bar speeds are illustrative; they are not measured timings`);
  t(`⏸ satır kilidi bekleniyor (PESSIMISTIC_WRITE)`,
    `⏸ waiting on the row lock (PESSIMISTIC_WRITE)`);

  /* Çıplak metin düğümleri (ikon + metin barındıran kutular) */
  t(`1 istek`,
    `1 request`);
  t(`14 istek birden`,
    `14 requests at once`);
  t(`Akışın açılışı`,
    `Opening the stream`);
  t(`Atomiklik`,
    `Atomicity`);
  t(`Bileşenler`,
    `Components`);
  t(`Bölüm eleme (partition pruning)`,
    `Partition pruning`);
  t(`Doğrudan yazma vs Kafka tamponu`,
    `Direct write vs Kafka buffer`);
  t(`Dürüstlük bölümü`,
    `The honesty section`);
  t(`Eş zamanlı görevlendirme`,
    `Concurrent dispatch`);
  t(`Filtresiz sorgu`,
    `Unfiltered query`);
  t(`Kapat`,
    `Close`);
  t(`Kilit sırası ve kilitlenme`,
    `Lock ordering and deadlock`);
  t(`Kural: LOGIN`,
    `Rule: LOGIN`);
  t(`Küçük ama önemli karar`,
    `A small but important decision`);
  t(`Kısa ömürlü akış bileti`,
    `A short-lived stream ticket`);
  t(`Nasıl okunmalı`,
    `How to read this`);
  t(`Olay oluştur`,
    `Create an incident`);
  t(`Olay oluşturma denemesi`,
    `Incident creation attempt`);
  t(`Platform thread havuzu vs virtual thread`,
    `Platform thread pool vs virtual threads`);
  t(`Savunma`,
    `Defence`);
  t(`Sistemin sözü`,
    `What the system promises`);
  t(`Sürüm kontrolü olmadan`,
    `Without version control`);
  t(`Sıfırla`,
    `Reset`);
  t(`Sınırlar`,
    `Boundaries`);
  t(`Tam tarama vs trigram GIN`,
    `Full scan vs trigram GIN`);
  t(`Token bucket · kural:`,
    `Token bucket · rule:`);
  t(`Token'ı URL'e koymak`,
    `Putting the token in the URL`);
  t(`Vardiya simülasyonu`,
    `Shift simulation`);
  t(`Veri modeli`,
    `Data model`);
  t(`Yapılandırma`,
    `Configuration`);
  t(`Yarışı başlat`,
    `Start the race`);
  t(`Yayının örnekler arası dağıtımı`,
    `Distributing the broadcast across instances`);
  t(`Yetkilendirme`,
    `Authorization`);
  t(`Zaman filtreli sorgu`,
    `Time-filtered query`);
  t(`ile`,
    `with`);
  t(`Özet`,
    `Recap`);
  t(`İki operatör aynı anda atasın`,
    `Let both operators assign at once`);
  t(`İstek yolu`,
    `Request path`);
  t(`İyimser kilitleme`,
    `Optimistic locking`);
  t(`İşletim`,
    `Operations`);

  /* Öznitelikler (title / aria-label) */
  t(`Aynı isteğin tekrarlandığında oluşan kayıt sayısını gösteren animasyon`,
    `Animation showing how many records are created when the same request is repeated`);
  t(`Başa dön`,
    `Back to start`);
  t(`Başa dön (Home)`,
    `Back to start (Home)`);
  t(`Kilit sırası sabit ve rastgele olduğunda oluşan durumu gösteren animasyon`,
    `Animation showing what happens with fixed versus random lock ordering`);
  t(`Konum bildiriminin Kafka üzerinden veritabanına, oradan SSE ile operatör ekranına ulaşmasını gösteren animasyon`,
    `Animation showing a location report travelling through Kafka to the database and on to the operator screen over SSE`);
  t(`Konum bildirimlerinin doğrudan veritabanına yazılması ile Kafka üzerinden toplu yazılmasının karşılaştırması`,
    `Comparison of writing location reports straight to the database versus batching them through Kafka`);
  t(`Olayların biriktiği ve ekiplerin rastgele yönlendirildiği vardiya animasyonu`,
    `Shift animation where incidents pile up and units are dispatched at random`);
  t(`Platform thread havuzu ile virtual thread modelinin açık bağlantılar altındaki davranışı`,
    `Behaviour of the platform thread pool versus the virtual thread model under open connections`);
  t(`Redis pub/sub ile yayının tüm sunucu örneklerine dağıtılmasını gösteren animasyon`,
    `Animation showing a broadcast distributed to every server instance over Redis pub/sub`);
  t(`Sonraki`,
    `Next`);
  t(`Sorgunun yalnızca ilgili aylık bölümü okuduğunu gösteren animasyon`,
    `Animation showing the query reading only the relevant monthly partition`);
  t(`Tam tablo taraması ile trigram indeksinin karşılaştırıldığı yarış animasyonu`,
    `Race animation comparing a full table scan with a trigram index`);
  t(`Token bucket algoritmasının canlı çalışması`,
    `The token bucket algorithm running live`);
  t(`Tüm slaytlar (O)`,
    `All slides (O)`);
  t(`Önceki`,
    `Previous`);
  t(`İki transaction'ın aynı personeli aynı anda görevlendirmesini gösteren animasyon`,
    `Animation showing two transactions dispatching the same officer at the same moment`);
  t(`Şehir planı üzerinde dağınık duran ekiplerin bir olay noktasına yönlendirilmesini gösteren animasyon`,
    `Animation showing scattered units on a city plan being directed to an incident point`);

  /* Slayt başlıkları — nokta ipuçları ve genel bakış kartları */
  t(`Aşama 1 · Operasyon`,
    `Stage 1 · Operations`);
  t(`Aşama 2 · Mimari`,
    `Stage 2 · Architecture`);
  t(`Aşama 3 · Doğruluk`,
    `Stage 3 · Correctness`);
  t(`Aşama 4 · Ölçek`,
    `Stage 4 · Scale`);
  t(`Bilinen sınırlar`,
    `Known boundaries`);
  t(`Bu sunum nasıl ilerliyor?`,
    `How does this deck progress?`);
  t(`Hız sınırı — token bucket`,
    `Rate limiting — token bucket`);
  t(`Kafka yapılandırma kararları`,
    `Kafka configuration decisions`);
  t(`Kapak`,
    `Cover`);
  t(`Kayıt güncellemelerinde sürüm kontrolü`,
    `Version control on record updates`);
  t(`Kimlik ve token rotasyonu`,
    `Identity and token rotation`);
  t(`Konum ingest'i — Kafka`,
    `Location ingest — Kafka`);
  t(`Neden Lua`,
    `Why Lua`);
  t(`Operasyon panosu`,
    `Operations dashboard`);
  t(`Paket düzeni`,
    `Package layout`);
  t(`Problem — telsizle görevlendirme`,
    `The problem — dispatching by radio`);
  t(`Roller ve yetkiler`,
    `Roles and permissions`);
  t(`SSE bileti`,
    `The SSE ticket`);
  t(`Tablo bölümleme`,
    `Table partitioning`);
  t(`Teknoloji yığını`,
    `Technology stack`);
  t(`Uçtan uca akış`,
    `End-to-end flow`);
  t(`Virtual thread`,
    `Virtual threads`);
  t(`Virtual thread nerede kullanılmadı`,
    `Where virtual threads were not used`);
  t(`Yapılandırma ve ölçüm`,
    `Configuration and measurement`);
  t(`Yarış koşulu — çift görevlendirme`,
    `Race condition — double dispatch`);
  t(`Çok örnekli SSE dağıtımı`,
    `Multi-instance SSE distribution`);
  t(`Çözüm — üç soru, tek ekran`,
    `The solution — three questions, one screen`);
  t(`Üç katmanlı savunma`,
    `Three layers of defence`);
  t(`İndeks tasarımı`,
    `Index design`);

  window.DECK_EN = D;
})();
