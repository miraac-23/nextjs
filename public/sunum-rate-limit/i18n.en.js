/* Rate Limit & Kota — İngilizce sözlük (OTOMATİK ANAHTARLANDI).
   Anahtar: bloğun DÜZ METNİ (Türkçe) · Değer: İngilizce HTML.
   Sözlükte olmayan blok Türkçe kalır — bkz. /deck-i18n.js */
(function () {
  var D = {};
  function t(k, v) { D[k] = v; }

  t(`RATE LIMIT & KOTA · ÖĞRETİCİ SUNUM`,
    `<span class="dotlogo"></span> RATE LIMIT & QUOTA · TEACHING DECK`);
  t(`Vaka Çalışması · Araştırma · Mimari Tasarım · Çalışan Uygulama`,
    `Case Study · Research · Architecture Design · Working Implementation`);
  t(`Yüksek TrafikliRate Limit & KotaYönetim Platformu`,
    `High-Traffic<br><span class="grad-text">Rate Limit &amp; Quota</span><br>Management Platform`);
  t(`Bir API/SaaS altyapısına gelen her isteğin; kullanıcı, kurum, uygulama, servis, endpoint ve API anahtarı boyutlarında tek merkezden denetlendiği — limit veya kota aşıldığında isteğin downstream servise hiç ulaşmadan kesildiği uçtan uca bir platform.`,
    `An end-to-end platform where <b>every request</b> hitting an API/SaaS stack is governed <b>from a single place</b> across the user, organization, application, service, endpoint and API-key dimensions — and where an exceeded limit or quota cuts the request off <b>before it ever reaches</b> the downstream service.`);
  t(`Paylaşılan altyapıda istek trafiği sınırsız, dağınık ve ölçülemez. Her servis kendi limitini ayrı uygular; tek müşteri kapasitenin tamamını tüketebilir, satılan kullanım hakkı teknik tarafta sayılamaz, suistimal kapıdan geçer.`,
    `On shared infrastructure, request traffic is <b>unbounded, scattered and unmeasurable</b>. Every service enforces its own limit; a single customer can drain the entire capacity, the usage rights you sold cannot be counted on the technical side, and abuse walks straight through the door.`);
  t(`İstek yolundaki tek karar noktası: altı boyutta eşleşen kural tek atomik adımda değerlendirilir; istek ya geçer ya da kapıda 429 ile kesilir — sıcak yolda p99 7,1 ms.`,
    `<b>One decision point</b> on the request path: the rule matching across six dimensions is evaluated in <b>a single atomic step</b>; the request either passes or is cut off at the gate with <span class="chip-mono">429</span> — <b>p99 7.1 ms</b> on the hot path.`);
  t(`Spring Cloud Gatewaykararın uygulandığı kapı Redis + Luaatomik sayaç ve karar PostgreSQLkural ve bakiyede kaynak doğruluk Kafka + Debeziumkayıpsız kural yayılımı (CDC) Elasticsearchistek izleri ve analitik Prometheus / Grafanametrik, panel ve uyarı Reactkural ve kota yönetim arayüzü`,
    `<span class="t"><span class="tn"><svg><use href="#i-spring"/></svg>Spring Cloud Gateway</span><em>the gate where the decision lands</em></span> <span class="t"><span class="tn"><svg><use href="#i-db"/></svg>Redis + Lua</span><em>atomic counter and decision</em></span> <span class="t"><span class="tn"><svg><use href="#i-layers"/></svg>PostgreSQL</span><em>source of truth for rules and balances</em></span> <span class="t"><span class="tn"><svg><use href="#i-stream"/></svg>Kafka + Debezium</span><em>lossless rule propagation (CDC)</em></span> <span class="t"><span class="tn"><svg><use href="#i-search"/></svg>Elasticsearch</span><em>request traces and analytics</em></span> <span class="t"><span class="tn"><svg><use href="#i-chart"/></svg>Prometheus / Grafana</span><em>metrics, dashboards and alerts</em></span> <span class="t"><span class="tn"><svg><use href="#i-react"/></svg>React</span><em>rule and quota management UI</em></span>`);
  t(`Sorun ne, çözüm ne?`,
    `What is the problem, what is the solution?`);
  t(`Sorun — Paylaşılan bir API altyapısında istek trafiği tek elden yönetilmiyor: her servis kendi limitini ayrı uygular, kurum ve kullanıcı bazında merkezî bir denetim ve ölçüm yoktur. Çözüm — İsteği downstream servise ulaşmadan tek noktada ve altı boyutta değerlendiren merkezî bir Rate Limit & Kota Yönetimi Middleware'i araştırdık, tasarladık ve çalışan bir uygulamayla ölçerek doğruladık.`,
    `<b>Problem —</b> On a shared API stack, request traffic is not governed from one place: every service enforces its own limit, and there is no central control or measurement per organization and user. <b>Solution —</b> We researched, designed and validated — with a working implementation and real measurements — a central <b>Rate Limit &amp; Quota Management Middleware</b> that evaluates the request at <b>a single point</b> across <b>six dimensions</b> before it reaches the downstream service.`);
  t(`İstek`,
    `Request`);
  t(`gelen çağrı`,
    `incoming call`);
  t(`Kullanıcı Kurum Uygulama Servis Endpoint API anahtarı`,
    `<span class="int-dim" data-d="0"><svg><use href="#i-users"/></svg>User</span> <span class="int-dim" data-d="1"><svg><use href="#i-layers"/></svg>Organization</span> <span class="int-dim" data-d="2"><svg><use href="#i-react"/></svg>Application</span> <span class="int-dim" data-d="3"><svg><use href="#i-catalog"/></svg>Service</span> <span class="int-dim" data-d="4"><svg><use href="#i-target"/></svg>Endpoint</span> <span class="int-dim" data-d="5"><svg><use href="#i-key"/></svg>API key</span>`);
  t(`değerlendiriliyor…`,
    `evaluating…`);
  t(`ya da`,
    `or`);
  t(`Araştırmaİhtiyaç ve kullanım senaryoları; beş rate-limit algoritmasının karşılaştırılması; hız limiti ile kotanın ayrı iki eksen olduğunun tespiti.`,
    `<b>Research</b><span>Requirements and usage scenarios; a comparison of five rate-limit algorithms; establishing that <b>rate limiting</b> and <b>quota</b> are two separate axes.</span>`);
  t(`Mimari tasarımKararın Redis'te tek atomik Lua ile verilmesi; kuralın PostgreSQL'de tutulup CDC ile kayıpsız yayılması; overdraft'lı kota cüzdanı; arıza duruşu ve gözlemlenebilirlik.`,
    `<b>Architecture design</b><span>Making the decision in Redis with a single atomic Lua script; storing rules in PostgreSQL and propagating them losslessly via CDC; an overdraft-capable quota wallet; failure posture and observability.</span>`);
  t(`Örnek uygulama & doğrulamaUçtan uca çalışan sistem; gerçek testler, canlı ölçüm (p99 7,1 ms) ve bu sunumda elle denenebilir demolarla kanıt.`,
    `<b>Reference implementation &amp; validation</b><span>An end-to-end working system; real tests, live measurement (<b>p99 7.1 ms</b>) and hands-on demos in this deck as proof.</span>`);
  t(`Tek cümlede: Dağınık, ölçülemeyen ve kötüye kullanıma açık istek trafiğini kullanıcı · kurum · uygulama · servis · endpoint · API anahtarı boyutlarında tek merkezden yöneten; araştırıp tasarladığımız ve çalışan bir uygulamayla ölçerek doğruladığımız bir middleware.`,
    `<b>In one sentence:</b> a middleware that governs scattered, unmeasurable and abuse-prone request traffic from one place across the <b>user · organization · application · service · endpoint · API key</b> dimensions — researched, designed, and <b>validated by measuring a working implementation</b>.`);
  t(`Bu platform neye çözüm oluyor?`,
    `What does this platform solve?`);
  t(`Binlerce müşterinin aynı altyapıyı paylaştığı bir API/SaaS sağlayıcısında istek trafiği sınırlanmadığında dört şey aynı anda bozulur: kapasite adaleti, gelir ölçümü, güvenlik ve servis kararlılığı. Soldaki iki şerit korumasız ile korumalı durumun farkını canlı gösterir; sağdaki eşleme her sorunun hangi mekanizmayla çözüldüğünü verir.`,
    `At an API/SaaS provider where thousands of customers share the same infrastructure, leaving request traffic unbounded breaks four things at once: <b>capacity fairness</b>, <b>revenue measurement</b>, <b>security</b> and <b>service stability</b>. The two lanes on the left show the unprotected vs. protected difference live; the mapping on the right tells you which mechanism solves each problem.`);
  t(`Korumasızakıyor…`,
    `<span class="wl-tag">Unprotected</span><span class="wl-state" data-state>flowing…</span>`);
  t(`Servis`,
    `Service`);
  t(`Sınır yok: her istek servise ulaşıyor; tek müşteri kapasiteyi tüketiyor → yük %100 → çöküş`,
    `No limit: every request reaches the service; a single customer drains the capacity → load <b>100%</b> → <b>collapse</b>`);
  t(`Korumalıstabil`,
    `<span class="wl-tag">Protected</span><span class="wl-state" data-state>stable</span>`);
  t(`Kural aşılınca fazlası kapıda 429 ile kesiliyor → yük dengede → servis ayakta`,
    `Once the rule is exceeded the surplus is cut at the gate with <b>429</b> → load stays balanced → <b>the service stays up</b>`);
  t(`Kapasite adaleti yok — gürültülü komşuTek müşterinin toplu işi paylaşılan kapasiteyi tüketiyor; diğer tüm müşteriler yavaşlıyor.`,
    `<b>No capacity fairness — the noisy neighbour</b><span>One customer's batch job drains the shared capacity; every other customer slows down.</span>`);
  t(`subject bazlı adil pay · GCRA`,
    `fair share per subject · GCRA`);
  t(`Gelir ölçülemiyorSözleşmede "aylık 1M çağrı" var; teknik tarafta tüketimi sayan, biten hakkı kesen ve faturalayan mekanizma yok.`,
    `<b>Revenue cannot be measured</b><span>The contract says "1M calls per month", but on the technical side nothing counts consumption, cuts off an exhausted allowance or bills for it.</span>`);
  t(`birim tüketim · faturalanır`,
    `unit consumption · billable`);
  t(`Suistimal engellenemiyorBrute-force ve kötüye kullanım saniyede binlerce istekle geçiyor; ayrı adımlı sayaç yarış koşulunda yanılıyor.`,
    `<b>Abuse cannot be stopped</b><span>Brute-force and misuse walk through at thousands of requests per second; a multi-step counter gets it wrong under a race condition.</span>`);
  t(`Redis + Lua · p99 7,1 ms`,
    `Redis + Lua · p99 7.1 ms`);
  t(`Servis kararlılığı bozuluyorSınırsız trafik alt servisleri boğuyor; tek bir aşırı yük zincirleme arızaya dönüşüyor.`,
    `<b>Service stability breaks down</b><span>Unbounded traffic chokes the downstream services; a single overload turns into a cascading failure.</span>`);
  t(`gateway'de dur · hiç ulaşmaz`,
    `stop at the gateway · never arrives`);
  t(`Tek cümlede: Platform, "kim · nerede · ne kadar sürede · ne kadar" isteyebilir sorusunu her isteğin geçtiği tek noktada, hızlı ve atomik biçimde cevaplar; böylece paylaşılan altyapı adil kalır, ticari kullanım ölçülüp faturalanır, suistimal kapıda durur ve aşırı yük downstream servise hiç ulaşmaz.`,
    `<b>In one sentence:</b> the platform answers "<b>who · where · in what window · how much</b> may they ask for" at <b>the single point every request passes through</b>, fast and atomically — so shared infrastructure stays fair, commercial usage is measured and billed, abuse stops at the gate, and overload <b>never reaches</b> the downstream service.`);
  t(`Problem — neden böyle bir sisteme ihtiyaç var?`,
    `Problem — why is such a system needed?`);
  t(`Gerçek dünyadaki 6 somut sıkıntı ve iki farklı ihtiyaç ekseni.`,
    `Six concrete real-world pains and two distinct axes of need.`);
  t(`Kavramlar — ortak dili öğrenelim`,
    `Concepts — let's learn the shared vocabulary`);
  t(`Subject, scope, pencere, maliyet, counterKey. Sonrası kolay.`,
    `Subject, scope, window, cost, counterKey. The rest is easy.`);
  t(`Motor nasıl çalışır? — animasyonlu`,
    `How does the engine work? — animated`);
  t(`Algoritmalar, atomiklik, yarış koşulu, Redis anahtar yapısı.`,
    `Algorithms, atomicity, race conditions, Redis key structure.`);
  t(`Teknolojiler — hangisi nerede, neden?`,
    `Technologies — which one where, and why?`);
  t(`Redis, Kafka, PostgreSQL, Elasticsearch, Prometheus.`,
    `Redis, Kafka, PostgreSQL, Elasticsearch, Prometheus.`);
  t(`Ürün — kota, dönemler, dayanıklılık, güvenlik`,
    `Product — quota, periods, resilience, security`);
  t(`Canlı senaryolar ve gerçek ölçümler.`,
    `Live scenarios and real measurements.`);
  t(`Uygulamalı & kanıt — elinizle deneyin`,
    `Hands-on &amp; proof — try it yourself`);
  t(`İnteraktif hız-limiti ve kota demoları; çalıştırdığımız gerçek testler.`,
    `Interactive rate-limit and quota demos; the real tests we ran.`);
  t(`1 · Problem`,
    `1 · Problem`);
  t(`Neden ihtiyaç var?`,
    `Why is it needed?`);
  t(`Vakayı somutlaştıralım. Her servis kendi limitini ayrı ayrı, birbirinden habersiz uyguluyordu. Bu dağınıklık, üretimde altı somut problem doğuruyordu — her biri ayrı bir olayın kök nedeni.`,
    `Let's make the case concrete. Every service enforced its own limit separately, unaware of the others. That fragmentation produced <b>six concrete problems</b> in production — each one the root cause of its own incident.`);
  t(`Tutarsız uygulama`,
    `Inconsistent enforcement`);
  t(`Her ekip kendi çözümünü yazıyor; hata gövdeleri ve header'lar standart değil.`,
    `Every team writes its own solution; error bodies and headers are not standardised.`);
  t(`Ölçekte anlamsızlaşma`,
    `Meaningless at scale`);
  t(`In-memory limit pod sayısıyla çarpılıyor: "dakikada 100" fiilen "1000" oluyor.`,
    `An in-memory limit gets multiplied by the pod count: "100 per minute" effectively becomes "1000".`);
  t(`Gürültülü komşu`,
    `Noisy neighbour`);
  t(`Tek kurumun toplu işi paylaşılan kaynağı tüketip herkesi etkiliyor.`,
    `One organization's batch job drains the shared resource and affects everyone.`);
  t(`Kotanın karşılığı yok`,
    `The quota has no technical counterpart`);
  t(`Satış "aylık 1M çağrı" satıyor; teknik tarafta ölçüp kesen mekanizma yok.`,
    `Sales sells "1M calls per month"; on the technical side nothing measures or enforces it.`);
  t(`Görünürlük eksik`,
    `Visibility is missing`);
  t(`"X kurumu bu ay ne tüketti?" sorusunun cevabı yok; kapasite varsayımla.`,
    `"What did organization X consume this month?" has no answer; capacity planning runs on guesswork.`);
  t(`Değişiklik yavaş`,
    `Changes are slow`);
  t(`Bir limiti değiştirmek kod + PR + deploy: ortalama 2 gün. Olay anında imkânsız.`,
    `Changing a limit means code + PR + deploy: two days on average. Impossible during an incident.`);
  t(`Ortak payda: altı problemin dördü (P1–P3, P6) sistemi korumak, ikisi (P4–P5) ticari ölçüm ihtiyacıdır. Çözüm, dağınık limitleri tek, merkezi ve atomik bir karar noktasında toplamaktır — sonraki slaytlar bunu adım adım kurar.`,
    `<b>The common thread:</b> four of the six problems (P1–P3, P6) are about <b>protecting the system</b>, two (P4–P5) about <b>commercial measurement</b>. The solution is to gather the scattered limits into <b>one central, atomic</b> decision point — the next slides build exactly that, step by step.`);
  t(`2 · Kavramlar`,
    `2 · Concepts`);
  t(`Önce ortak dili öğrenelim`,
    `First, the shared vocabulary`);
  t(`Bir kural tek bir soruya cevap verir: kime · nerede · ne kadar sürede · ne kadar? Bu beş kavramı somut örnekleriyle oturtun — sunumun geri kalanı bunların üstüne kurulu.`,
    `A rule answers a single question: <b>for whom</b> · <b>where</b> · <b>in what window</b> · <b>how much</b>? Anchor these five concepts with concrete examples — the rest of the deck is built on them.`);
  t(`Limitin bağlandığı kimlik. Aynı istek birden çok subject'e aynı anda uyabilir — hem kurum, hem o kurumdaki kullanıcı ayrı ayrı sayılır.`,
    `The identity the limit is bound to. One request can match <b>several</b> subjects at once — the organization and the user inside it are counted separately.`);
  t(`Kuralın vurduğu hedefin genişliği: tüm sistem, tek servis ya da tek endpoint. Çakışırsa en özgül eşleşen kural kazanır.`,
    `How wide the rule reaches: the whole system, a single service, or a single endpoint. On a clash, the <b>most specific matching</b> rule wins.`);
  t(`global · tümüsvc:paymentPOST /v1/transfers`,
    `global · everything<br>svc:payment<br>POST /v1/transfers`);
  t(`Sayacın sıfırlanma ritmi. Hız limitinde saniye/dakika; kotada gün/ay ya da cüzdanda süresiz birikir.`,
    `The rhythm at which the counter resets. <b>Seconds/minutes</b> for rate limits; <b>days/months</b> for quotas, or it accrues <b>indefinitely</b> in a wallet.`);
  t(`1s · 1m · 1h1d · 1mo∞ · cüzdan`,
    `1s · 1m · 1h<br>1d · 1mo<br>∞ · wallet`);
  t(`Bir isteğin kaç birim yediği. Hafif okuma 1, ağır dışa-aktarım 20 sayar — pahalı işler hakkı/kotayı çok daha hızlı eritir.`,
    `How many units a request <b>eats</b>. A light read counts 1, a heavy export counts 20 — expensive work burns the allowance/quota far faster.`);
  t(`Sayacın neyi ölçtüğünün kimliği — kuralın değil. Plan/fiyat değişse, hatta kural silinip yeniden yazılsa bile birikmiş tüketim aynı anahtarda korunur.`,
    `The identity of <b>what</b> the counter measures — not of the rule. Even if the plan or price changes, or the rule is deleted and rewritten, <b>accrued consumption is preserved under the same key.</b>`);
  t(`Hepsi tek cümlede: "tenant:acme'nin (kime) POST /v1/transfers üzerinde (nerede) 1 dakikada (ne kadar sürede) en fazla 60 istek (ne kadar) hakkı var; her ağır istek 10 sayar (maliyet)." Bir kural işte bu beş parçanın birleşimidir — sunumun geri kalanı, bu cümlenin milyonlarca istekte nasıl hızlı ve doğru uygulandığıdır.`,
    `<b>All of it in one sentence:</b> "<b>tenant:acme</b> (for whom) is allowed at most <b>60 requests</b> (how much) on <b>POST /v1/transfers</b> (where) <b>per minute</b> (in what window); each heavy request counts <b>10</b> (cost)." A rule is exactly the combination of those five parts — the rest of the deck is how that sentence gets enforced <b>fast and correctly</b> across millions of requests.`);
  t(`İki farklı eksen, tek motor`,
    `Two different axes, one engine`);
  t(`En kritik kavram: hız limiti ve kota birbirine benzer ama tamamen farklıdır. Aşağıdaki iki canlı sayaç aynı anda ilerliyor — farkı kendi gözünüzle izleyin.`,
    `The most critical concept: <b>rate limit</b> and <b>quota</b> look alike but are entirely different. The two live counters below run side by side — watch the difference for yourself.`);
  t(`Hız Limiti`,
    `Rate Limit`);
  t(`Rate Limit · GCRA · burst 10, 30/dk`,
    `Rate Limit · GCRA · burst 10, 30/min`);
  t(`Kova zamanla kendiliğinden dolar (jeton üretilir)`,
    `The bucket refills <b>by itself over time</b> (tokens are minted)`);
  t(`Biterse birkaç saniye bekleyince yeniden açılır`,
    `If it runs out, <b>waiting a few seconds</b> reopens it`);
  t(`Faturalanmaz · hiçbir koşulda aşılamaz`,
    `Not billed · <b>can never be exceeded</b>`);
  t(`Amaç: altyapıyı ve komşuları korumak`,
    `Goal: <b>protect</b> the infrastructure and the neighbours`);
  t(`canlı sayaç10 / 10 jeton`,
    `<span class="ax-cap">live counter</span><span class="ax-bal" id="axRateBal">10 / 10 tokens</span>`);
  t(`vs`,
    `<span>vs</span>`);
  t(`Kota (Cüzdan)`,
    `Quota (Wallet)`);
  t(`Quota · OVERDRAFT_QUOTA · toplam tüketim`,
    `Quota · OVERDRAFT_QUOTA · total consumption`);
  t(`Yalnız kota yüklenince dolar — zaman doldurmaz`,
    `It only refills when <b>quota is topped up</b> — time does not refill it`);
  t(`Bitince erişim durur · yükleme/satın alma gerekir`,
    `When it runs out access stops · a <b>top-up/purchase</b> is required`);
  t(`Faturalanır · bir kez eksiye düşebilir (kod 5)`,
    `Billable · may go negative <b>once</b> (code 5)`);
  t(`Amaç: ticari tüketim ve gelir`,
    `Goal: <b>commercial consumption</b> and revenue`);
  t(`canlı sayaç100.000 birim`,
    `<span class="ax-cap">live counter</span><span class="ax-bal" id="axQuotaBal">100,000 units</span>`);
  t(`200 · Quota-Remaining: 100.000`,
    `200 · Quota-Remaining: 100,000`);
  t(`Günlük hayattan: Hız limiti = otoyol hız sınırı. Aşamazsın; yavaşlarsan yola devam edersin. Kimse sana "ekstra hız hakkı" satmaz — amaç herkesi ve altyapıyı korumaktır.`,
    `<b>From everyday life:</b> a rate limit is a <b>highway speed limit</b>. You cannot exceed it; slow down and you carry on. Nobody sells you "extra speed" — the goal is to protect everyone and the road itself.`);
  t(`Günlük hayattan: Kota = ön ödemeli kontör. Bitince yükleyene kadar çekmez; harcadığın kadar ödersin; acil bir konuşma için bir kez küçük bir borca (aşım) izin verilebilir.`,
    `<b>From everyday life:</b> a quota is <b>prepaid credit</b>. When it runs out nothing goes through until you top up; you pay for what you use; and for one urgent call a small debt (overdraft) may be allowed <b>once</b>.`);
  t(`429 aldığınızda kim kesti? Yanıt başlığı söyler. X-Quota-Remaining: 0 geldiyse kota bitti — kullanıcıya "kota satın al" dersiniz; beklemek işe yaramaz. RateLimit-Remaining: 0 + Retry-After: 3 geldiyse hız limiti — "3 saniye sonra otomatik tekrar dene". İstemci bu iki başlığa bakıp doğru tepkiyi seçer; bu ayrım tüm sistemin anahtarıdır.`,
    `<b>Got a 429 — who cut you off? The response header tells you.</b> If <span class="chip-mono">X-Quota-Remaining: 0</span> came back, the <b>quota</b> is exhausted — tell the user to "buy more quota"; waiting will not help. If <span class="chip-mono">RateLimit-Remaining: 0</span> + <span class="chip-mono">Retry-After: 3</span> came back, it is the <b>rate limit</b> — "retry automatically in 3 seconds". The client picks the right reaction from these two headers; that distinction is the key to the whole system.`);
  t(`3 · Motor`,
    `3 · Engine`);
  t(`Üç düzlem, tek istek yolu`,
    `Three planes, one request path`);
  t(`Karar veren yol (data plane) hızlı ve DB'siz; kural yöneten yol (control plane) ayrı; analitik yol asenkron. Hiçbiri diğerini yavaşlatmaz — bu ayrım tasarımın temelidir.`,
    `The deciding path (data plane) is fast and database-free; the rule-managing path (control plane) is separate; the analytics path is asynchronous. None slows the others down — that separation is the foundation of the design.`);
  t(`Data Plane · istek yolu (hızlı, DB'siz)`,
    `Data Plane · request path (fast, no DB)`);
  t(`Control Plane · kural yönetimi`,
    `Control Plane · rule management`);
  t(`Analitik Plane · asenkron`,
    `Analytics Plane · asynchronous`);
  t(`Bir istek nasıl değerlendirilir?`,
    `How is a request evaluated?`);
  t(`Reaktif filtre, kimlik doğrulamadan sonra ama yönlendirmeden önce çalışır. Amaç: istek downstream servise ulaşmadan kararı vermek.`,
    `The reactive filter runs after authentication but before routing. The goal: decide before the request reaches the downstream service.`);
  t(`1 · Bağlam çıkar`,
    `1 · Extract context`);
  t(`tenant · user · endpoint · maliyet`,
    `tenant · user · endpoint · cost`);
  t(`2 · Kural eşleştir`,
    `2 · Match the rule`);
  t(`bellek içi indeks · kilitsiz`,
    `in-memory index · lock-free`);
  t(`3 · Redis kararı`,
    `3 · Redis decision`);
  t(`tek atomik Lua çağrısı`,
    `a single atomic Lua call`);
  t(`4 · İzin / Kes`,
    `4 · Allow / Cut off`);
  t(`200 · veya 429/503/403`,
    `200 · or 429/503/403`);
  t(`İstek yolunda retry yoktur. Redis timeout verirse doğrudan yedek plana (fallback) düşülür. Retry, zaten yüklü Redis'e ek yük bindirip kısmi bir yavaşlamayı tam kesintiye çevirirdi.`,
    `<b>There is no retry on the request path.</b> If Redis times out we fall straight through to the fallback. A retry would pile more load onto an already-loaded Redis and turn a partial slowdown into a full outage.`);
  t(`Beş algoritma — neden tek değil?`,
    `Five algorithms — why not just one?`);
  t(`Kota takvim sıfırlaması ister; hız limiti pürüzsüz burst kontrolü ister — tek algoritma ikisini birden iyi yapamaz. Beşini canlı mini-görsellerle kıyaslayalım, sonra altta gerçekte hangisini, neden seçtiğimizi görelim.`,
    `A quota wants calendar resets; a rate limit wants smooth burst control — no single algorithm does both well. Let's compare all five with live mini-visuals, then see below <b>which one we actually picked and why</b>.`);
  t(`takvim`,
    `calendar`);
  t(`Sabit pencere sayacı; süre dolunca sıfırdan başlar.`,
    `A fixed-window counter; it restarts from zero when the window elapses.`);
  t(`Basit, ucuz, takvimle uyumlu Sınırda 2× patlama tuzağı`,
    `<span class="al-plus"><svg><use href="#i-check"/></svg>Simple, cheap, calendar-friendly</span> <span class="al-minus"><svg><use href="#i-x"/></svg>The <b>2× burst</b> trap at the boundary</span>`);
  t(`Uygun: uzun kotalar (günlük / aylık)`,
    `Good for: <b>long quotas</b> (daily / monthly)`);
  t(`Ağırlıklı kayan pencere; son 1 dakikayı sürekli değerlendirir (önceki dilim × kalan oran + mevcut).`,
    `A weighted sliding window; it continuously evaluates <b>the last minute</b> (previous slice × remaining ratio + current).`);
  t(`Sınır patlaması yok, pürüzsüz Daha çok bellek / hesap`,
    `<span class="al-plus"><svg><use href="#i-check"/></svg>No boundary burst, smooth</span> <span class="al-minus"><svg><use href="#i-x"/></svg>More memory / computation</span>`);
  t(`Uygun: API anahtarı hız limiti · sıkı SLA`,
    `Good for: <b>API-key rate limits</b> · strict SLAs`);
  t(`Kova sabit hızda dolar; her istek 1 jeton harcar.`,
    `The bucket refills at a fixed rate; each request spends <b>1 token</b>.`);
  t(`Burst'e izin verir, sezgisel İki durum tutar (jeton + zaman)`,
    `<span class="al-plus"><svg><use href="#i-check"/></svg>Allows bursts, intuitive</span> <span class="al-minus"><svg><use href="#i-x"/></svg>Keeps two pieces of state (tokens + time)</span>`);
  t(`Uygun: adil kullanım, yedek`,
    `Good for: <b>fair use</b>, fallback`);
  t(`Token Bucket'ın tek-değerli hali: teorik varış zamanı (TAT).`,
    `The single-value form of Token Bucket: theoretical arrival time (TAT).`);
  t(`En ucuz, pürüzsüz akış Sezgisel değil, kavraması zor`,
    `<span class="al-plus"><svg><use href="#i-check"/></svg>Cheapest, smooth flow</span> <span class="al-minus"><svg><use href="#i-x"/></svg>Not intuitive, harder to grasp</span>`);
  t(`Uygun: yüksek hacimli hız limiti`,
    `Good for: <b>high-volume rate limiting</b>`);
  t(`−100 · kilit`,
    `<span class="al-ov-fill"></span><span class="al-ov-neg">−100 · locked</span>`);
  t(`Özel kota cüzdanı; bakiye pozitifken geçer, bir kez eksiye düşebilir.`,
    `A purpose-built quota wallet; it passes while the balance is positive and may go negative <b>once</b>.`);
  t(`Yarım iş yok — atomik biter Uygulamaya özel, standart değil`,
    `<span class="al-plus"><svg><use href="#i-check"/></svg>No half-done work — it finishes atomically</span> <span class="al-minus"><svg><use href="#i-x"/></svg>Application-specific, not a standard</span>`);
  t(`Uygun: ticari kota / cüzdan (kod 5)`,
    `Good for: <b>commercial quota / wallet</b> (code 5)`);
  t(`Hız limiti GCRAToken Bucket GCRA — pürüzsüz akış, burst 10 · 30/dk. Ani yığılmayı düzeltir; Fixed Window'un pencere-sınırı tuzağı yok. Gerektiğinde Token Bucket devreye girer.`,
    `<span class="al-axis"><svg style="color:var(--info)"><use href="#i-bolt"/></svg>Rate limit</span> <span class="al-pick"><span class="al-chip pri">GCRA</span><span class="al-chip alt">Token Bucket</span></span> <span class="al-rz"><b>GCRA</b> — smooth flow, <b>burst 10 · 30/min</b>. It irons out sudden pile-ups and has none of Fixed Window's boundary trap. Token Bucket steps in when needed.</span>`);
  t(`Kota cüzdanı OVERDRAFT_QUOTA · kod 5 Bakiye bir kez eksiye düşmeye izin verir → yarım iş üretmez: işlem bütün biter, sonra keser. Kesin ticari doğruluk.`,
    `<span class="al-axis"><svg style="color:var(--violet)"><use href="#i-wallet"/></svg>Quota wallet</span> <span class="al-pick"><span class="al-chip pri">OVERDRAFT_QUOTA · code 5</span></span> <span class="al-rz">Lets the balance go negative <b>once</b> → it <b>never produces half-done work</b>: the operation completes in full, then it cuts off. Exact commercial correctness.</span>`);
  t(`API anahtarı limiti SLIDING_WINDOW Ağırlıklı kayan pencere — API anahtarı başına 20/dk. Pencere-sınırı yığılması olmadan pürüzsüz sınır. Önce gölgede ölçüldü, sonra ENFORCE'a alındı. Canlı doğrulandı: 25 istek → tam 20 geçti · 5 kesildi (429).`,
    `<span class="al-axis"><svg style="color:var(--info)"><use href="#i-chart"/></svg>API-key limit</span> <span class="al-pick"><span class="al-chip pri">SLIDING_WINDOW</span></span> <span class="al-rz"><b>Weighted sliding window</b> — <b>20/min</b> per API key. A smooth limit with no boundary pile-up. Measured in shadow mode first, then switched to ENFORCE. <b>Verified live:</b> 25 requests → exactly <b>20 passed · 5 cut off (429)</b>.</span>`);
  t(`Takvim kotaları Fixed Window Günlük / haftalık / aylık yenilenir. Dönem-dilimli anahtar doğal sıfırlar; uzun pencerede sınır etkisi ihmal edilebilir.`,
    `<span class="al-axis"><svg style="color:var(--good)"><use href="#i-clock"/></svg>Calendar quotas</span> <span class="al-pick"><span class="al-chip alt">Fixed Window</span></span> <span class="al-rz">Renews daily / weekly / monthly. A <b>period-sliced key</b> resets it naturally; over a long window the boundary effect is negligible.</span>`);
  t(`3 · Motor · Algoritma`,
    `3 · Engine · Algorithm`);
  t(`Token Bucket — canlı`,
    `Token Bucket — live`);
  t(`Kova sabit hızda jetonla dolar; kapasitesi burst ile sınırlıdır. Her istek bir jeton harcar. Jeton varsa geçer, yoksa reddedilir. Bu, kısa patlamalara izin verirken sürekli aşırı yükü keser.`,
    `The bucket fills with tokens <b>at a fixed rate</b>; its capacity is bounded by <b>burst</b>. Each request spends one token. If a token is available it passes, otherwise it is rejected. This allows short bursts while cutting off sustained overload.`);
  t(`kapasite: 5`,
    `capacity: 5`);
  t(`Kova dolu (5 jeton) — istekler geçer`,
    `<span class="pin ok"><svg><use href="#i-check"/></svg></span>Bucket full (5 tokens) — requests pass`);
  t(`5 istek arka arkaya → hepsi geçer, kova boşalır`,
    `<span class="pin ok"><svg><use href="#i-check"/></svg></span>5 requests back to back → all pass, the bucket empties`);
  t(`6. istek → jeton yok, reddedilir (429)`,
    `<span class="pin no"><svg><use href="#i-x"/></svg></span>6th request → no token, <b>rejected (429)</b>`);
  t(`Zaman geçti → kova yeniden doldu → tekrar geçer`,
    `<span class="pin ok"><svg><use href="#i-check"/></svg></span>Time passed → the bucket refilled → it passes again`);
  t(`Neden "burst" iyi bir şey? Gerçek istemciler düzgün aralıklarla değil, kümeler halinde istek atar. Token Bucket kısa yığılmaya izin verir ama ortalama hızı korur — kullanıcı deneyimi ile koruma arasında denge.`,
    `<b>Why is "burst" a good thing?</b> Real clients do not send requests at even intervals — they send them in clusters. Token Bucket permits short pile-ups while preserving the average rate: a balance between user experience and protection.`);
  t(`Fixed Window ve gizli tuzağı`,
    `Fixed Window and its hidden trap`);
  t(`"Dakikada 100" için her dakikayı sıfırlayan bir sayaç basit görünür. Ama pencere sınırında tehlikeli bir durum vardır. Aşağıdan kendiniz istek gönderin — tuzağın canlı oluştuğunu görün.`,
    `A counter that resets every minute for "100 per minute" looks simple. But there is a dangerous situation at the <b>window boundary</b>. Send requests yourself below — watch the trap form live.`);
  t(`Her tıkta 20 istek`,
    `<span><b id="fwBatchLbl">20</b> requests per click</span> <input type="range" id="fwBatch" min="5" max="40" step="5" value="20" class="fw-range">`);
  t(`sınır penceresi · 1 sn`,
    `<span class="fw-zonelbl">boundary window · 1 s</span>`);
  t(`Pencere 1 · limit 100`,
    `<span class="wl">Window 1 · limit 100</span>`);
  t(`Pencere 2 · limit 100`,
    `<span class="wl">Window 2 · limit 100</span>`);
  t(`sıfırlama`,
    `<span class="bl">reset</span>`);
  t(`Pencere 1 sayacı0 / 100`,
    `<span>Window 1 counter</span><span class="fw-mval" id="fwV1">0 / 100</span>`);
  t(`Sınır penceresinde geçen`,
    `Passed within the boundary window`);
  t(`1 saniyelik aralıkta kabul edilen toplam istek`,
    `Total requests accepted within a one-second interval`);
  t(`Pencere 2 sayacı0 / 100`,
    `<span>Window 2 counter</span><span class="fw-mval" id="fwV2">0 / 100</span>`);
  t(`Her pencere kendi limitini (100) doğru uygular — ama sıfırlama anına yığılan istekler iki ayrı pencereye bölünür. 1 saniyelik aralıkta 200 istek geçer: fiili tepe yük, limitin 2 katı.`,
    `Each window enforces its own limit (100) correctly — but requests piled up <b>around the reset moment</b> split across two separate windows. <b>200 requests</b> pass within a one-second interval: the effective peak is <b>twice</b> the limit.`);
  t(`Çözüm: Kısa pencerelerde Token Bucket / GCRA (kayan, sınır problemi yok) kullanılır. Fixed Window ise yalnızca uzun kotalarda (günlük/aylık) tercih edilir — orada takvim sıfırlaması gerekli, sınır etkisi ihmal edilebilir.`,
    `<b>The fix:</b> use Token Bucket / GCRA for short windows (sliding, no boundary problem). Fixed Window is reserved for <b>long quotas</b> (daily/monthly) — there a calendar reset is required and the boundary effect is negligible.`);
  t(`3 · Motor · Atomiklik`,
    `3 · Engine · Atomicity`);
  t(`En sinsi hata: yarış koşulu`,
    `The sneakiest bug: the race condition`);
  t(`İki ayrı istek — aynı isteğin tekrarı değil, iki farklı istemciden (ör. aynı hesabı kullanan iki cihaz) gelen iki bağımsız istek — tam olarak aynı milisaniyede aynı sayaca vurursa ne olur? Yolu kendiniz seçin, A ve B'yi aynı anda tetikleyin, farkı canlı görün.`,
    `<b>Two separate requests</b> — not a retry of the same one, but two independent requests <b>from two different clients</b> (say two devices on the same account) — hit the same counter in exactly <b>the same millisecond</b>. What happens? Pick the path yourself, fire A and B simultaneously, and see the difference live.`);
  t(`İstek A — 1. istemci aynı anda · aynı sayaç İstek B — 2. istemci (farklı, bağımsız istek)`,
    `<span class="rl-item"><i class="rl-dot a"></i><b>Request A</b> — client 1</span> <span class="rl-vs">same instant · same counter</span> <span class="rl-item"><i class="rl-dot b"></i><b>Request B</b> — client 2 (a different, independent request)</span>`);
  t(`AGET sayaç → 99 okur`,
    `<span class="tt a">A</span>GET counter → reads <b>99</b>`);
  t(`BGET sayaç → 99 okur (A daha yazmadan)`,
    `<span class="tt b">B</span>GET counter → reads <b>99</b> (before A has written)`);
  t(`A99 < 100 → geçir, SET 100`,
    `<span class="tt a">A</span>99 &lt; 100 → allow, SET 100`);
  t(`B99 < 100 → geçir, SET 100`,
    `<span class="tt b">B</span>99 &lt; 100 → allow, SET 100`);
  t(`✗Sonuç: 101 — ikisi de geçti, limit aşıldı!`,
    `<span class="tt">✗</span>Result: <b>101</b> — both passed, the limit was exceeded!`);
  t(`yolu seç ve gönder`,
    `pick a path and send`);
  t(`ALua: oku+kontrol+yaz tek parça`,
    `<span class="tt a">A</span>Lua: read+check+write as <b>one unit</b>`);
  t(`A99 → 100, geçer`,
    `<span class="tt a">A</span>99 → 100, passes`);
  t(`BB ancak A bitince başlar (sıraya girer)`,
    `<span class="tt b">B</span>B only starts once A finishes (it queues)`);
  t(`B100 → limit dolu, reddedilir`,
    `<span class="tt b">B</span>100 → limit reached, <b>rejected</b>`);
  t(`✓Sonuç: 100 — biri geçti, biri kesildi`,
    `<span class="tt">✓</span>Result: <b>100</b> — one passed, one was cut off`);
  t(`Neden Lua? A ve B iki bağımsız istektir; naif yolda ikisi de "99 gördüm, yer var" der çünkü A henüz yazmamışken B okur. Redis Lua script'ini tek atomik birim çalıştırır — B, A bitene kadar bekler. Testte doğrulandı: 500 eş zamanlı istek → tam olarak 250 geçti, ne bir eksik ne bir fazla.`,
    `<b>Why Lua?</b> A and B are two <b>independent</b> requests; on the naive path both say "I saw 99, there is room" because B reads before A has written. Redis runs a Lua script as a single atomic unit — B waits until A is done. Verified in testing: <b>500 concurrent requests → exactly 250 passed</b>, not one more, not one less.`);
  t(`3 · Motor · Redis`,
    `3 · Engine · Redis`);
  t(`Bir Redis anahtarının anatomisi`,
    `Anatomy of a Redis key`);
  t(`Sayaçlar Redis'te yaşar. Anahtarın her parçasının bir görevi var. Bir örnek seçin, sonra parçaların üstüne gelin — her parçanın ne işe yaradığını okuyun.`,
    `The counters live in Redis. Every part of the key has a job. Pick an example, then <b>hover over the parts</b> — read what each one does.`);
  t(`Bir parçanın üstüne gelin`,
    `Hover over a part`);
  t(`Fare ile (veya klavyeyle sekerek) yukarıdaki parçaları gezin — her birinin görevi ve neden orada olduğu burada belirir.`,
    `Move through the parts above with the mouse (or by tabbing) — what each one does and why it is there appears here.`);
  t(`Cluster'da aynı öznenin tüm anahtarlarını aynı slot'a düşürür → tek atomik script hepsine erişebilir.`,
    `In a cluster it lands all keys of the same subject <b>in the same slot</b> → one atomic script can touch all of them.`);
  t(`counterKey, ruleId değil`,
    `counterKey, not ruleId`);
  t(`Sayaç "ne ölçtüğünü" söyler. Müşteri plan değiştirse bile tüketim korunur — sayaç sıfırlanmaz.`,
    `The counter states "what it measures". Even when the customer changes plan, <b>consumption is preserved</b> — the counter is not reset.`);
  t(`Pencere dilimi`,
    `Window slice`);
  t(`Takvim pencerelerinde (aylık) anahtara gömülür: 202607. Cüzdanda ve GCRA'da yoktur — süresizdir.`,
    `For calendar windows (monthly) it is embedded in the key: <span class="chip-mono">202607</span>. It is absent for wallets and GCRA — those never expire.`);
  t(`4 · Teknoloji · Redis`,
    `4 · Technology · Redis`);
  t(`Redis — kararın verildiği yer`,
    `Redis — where the decision is made`);
  t(`Her istek Redis'te tek atomik Lua çağrısıyla, milisaniyenin altında karara dönüşür. Neden PostgreSQL değil? Aynı özneye eş zamanlı UPDATE'ler serileşir (~10k tps tavan). Redis'te ölçtük: EVALSHA ~19µs. Aşağıda bir isteğin karara dönüşünü izleyin.`,
    `Every request turns into a decision in Redis with <b>a single atomic Lua call</b>, in under a millisecond. Why not PostgreSQL? Concurrent UPDATEs against the same subject serialise (~10k tps ceiling). We measured it in Redis: <span class="chip-mono">EVALSHA ~19µs</span>. Watch a request become a decision below.`);
  t(`gelen istekEVALSHA a3f9 rl:{t:acme}:q.api:202607 →`,
    `<span class="rds-tag">incoming request</span><span class="rds-cmd">EVALSHA a3f9 rl:{t:acme}:q.api:202607 →</span>`);
  t(`toplam süre0 µs`,
    `<span>total time</span><b id="rdsUs">0 µs</b>`);
  t(`-- sayacı oku local u = redis.call('GET', KEYS[1])`,
    `<span class="rc">-- read the counter</span> local u = redis.call('GET', KEYS[1])`);
  t(`-- limiti kontrol et if u >= limit then return DENY end`,
    `<span class="rc">-- check the limit</span> if u &gt;= limit then return <span class="rr">DENY</span> end`);
  t(`-- tüketimi işle redis.call('INCR', KEYS[1])`,
    `<span class="rc">-- record the consumption</span> redis.call('INCR', KEYS[1])`);
  t(`-- pencereyi taze tut redis.call('PEXPIRE', KEYS[1], win)`,
    `<span class="rc">-- keep the window fresh</span> redis.call('PEXPIRE', KEYS[1], win)`);
  t(`-- kararı döndür return ALLOW, limit - u`,
    `<span class="rc">-- return the decision</span> return <span class="rg">ALLOW</span>, limit - u`);
  t(`ALLOW · kalan 7 · yarış koşulu imkânsız`,
    `<span class="rds-check"><svg><use href="#i-check"/></svg></span>ALLOW · 7 remaining · race condition impossible`);
  t(`Atomik & mikro-saniye`,
    `Atomic &amp; microsecond-scale`);
  t(`Lua script tek komut gibi çalışır; ortada başka istek araya giremez → yarış koşulu yok. İstek yolu bloklanmaz.`,
    `The Lua script runs like a single command; no other request can slip in between → <b>no race condition</b>. The request path is never blocked.`);
  t(`AOF — para kalıcı kalır`,
    `AOF — money stays durable`);
  t(`Cüzdan bakiyesi para karşılığıdır. appendonly yes ile restart'ta bakiye korunur (test: 850 → restart → 850).`,
    `A wallet balance is money. With <span class="chip-mono">appendonly yes</span> the balance <b>survives</b> a restart (tested: 850 → restart → 850).`);
  t(`Hash-tag → slot sabitleme`,
    `Hash tag → slot pinning`);
  t(`{t:acme} öznenin tüm anahtarlarını aynı slot'a düşürür; tek Lua script cluster'da hepsine dokunabilir.`,
    `<span class="chip-mono">{t:acme}</span> lands all of the subject's keys <b>in the same slot</b>; one Lua script can touch all of them across the cluster.`);
  t(`İki hızlı yol daha: acil kural değişikliği ratelimit:invalidate Pub/Sub kanalıyla <100ms tüm node'lara ulaşır; tekrar koruması ise SET NX ile 24 saatlik idempotency deposunda tutulur — DB'ye sıfır yük.`,
    `<b>Two more fast paths:</b> an emergency rule change reaches every node in &lt;100 ms over the <span class="chip-mono">ratelimit:invalidate</span> Pub/Sub channel; replay protection lives in a 24-hour idempotency store via <span class="chip-mono">SET NX</span> — zero load on the database.`);
  t(`4 · Teknoloji · Kafka + Debezium`,
    `4 · Technology · Kafka + Debezium`);
  t(`Kayıpsız kural yayılımı (CDC)`,
    `Lossless rule propagation (CDC)`);
  t(`Admin bir kota yüklediğinde bu değişiklik gateway'e nasıl kaybetmeden ulaşır? Zincir boyunca paketi ve biriken gecikmeyi izleyin — uçtan uca ~35ms.`,
    `When an admin tops up a quota, how does that change reach the gateway <b>without being lost</b>? Follow the packet and the accumulating latency along the chain — <b>~35 ms</b> end to end.`);
  t(`uçtan uca gecikme0 ms`,
    `<span>end-to-end latency</span><b id="cdcTimer">0 ms</b>`);
  t(`Admin`,
    `Admin`);
  t(`kota yükle`,
    `top up quota`);
  t(`UPDATE + outbox(tek transaction)`,
    `UPDATE + outbox<br>(one transaction)`);
  t(`WAL okur`,
    `reads the WAL`);
  t(`rules.v1(compacted)`,
    `rules.v1<br>(compacted)`);
  t(`bellek indeksi~35ms`,
    `in-memory index<br><b>~35 ms</b>`);
  t(`NE — Outbox + CDC`,
    `WHAT — Outbox + CDC`);
  t(`Kural yazılırken aynı transaction'da bir outbox satırı düşer. Debezium PostgreSQL WAL'ini okuyup bu satırı Kafka'ya taşır.`,
    `When a rule is written, an <span class="chip-mono">outbox</span> row is inserted in <b>the same transaction</b>. Debezium reads the PostgreSQL WAL and carries that row to Kafka.`);
  t(`NEDEN — ikili yazım yok`,
    `WHY — no dual write`);
  t(`"DB'ye yaz + Kafka'ya yaz" iki ayrı işlem atomik olamaz — biri düşer, tutarsızlık doğar. Outbox tek transaction ile bunu imkânsız kılar → kayıpsız.`,
    `"Write to the DB + write to Kafka" as two separate operations <b>cannot be atomic</b> — one fails and inconsistency follows. The outbox makes that impossible with a single transaction → <b>lossless</b>.`);
  t(`NASIL — kendi consumer group'u`,
    `HOW — its own consumer group`);
  t(`rules.v1 compacted topic; her gateway kendi group'uyla tüm kuralları alır → yerel bellek indeksi, karar anında ağ turu yok.`,
    `<span class="chip-mono">rules.v1</span> is a compacted topic; every gateway takes all rules <b>with its own group</b> → a local in-memory index, and <b>no</b> network round trip at decision time.`);
  t(`Neden compacted topic? Kafka her ruleId için yalnız en son değeri saklar. Yeni açılan (veya çöküp dönen) bir gateway topic'i baştan okuyarak tüm kuralların güncel halini yeniden inşa eder — geçmiş olay yığınını değil. Durum kaybı yok, yeniden yayın gerekmez.`,
    `<b>Why a compacted topic?</b> Kafka keeps only the <b>latest</b> value per <span class="chip-mono">ruleId</span>. A newly started gateway (or one returning from a crash) reads the topic from the beginning and rebuilds the current state of every rule — not the historical event pile. No state is lost and no re-publish is needed.`);
  t(`Kafka — olay omurgası`,
    `Kafka — the <span class="grad-text">event backbone</span>`);
  t(`Bu platformda Kafka üç işi aynı anda yapar: kuralları tüm gateway'lere yayar, her isteğin izini analitiğe akıtır ve kota eşikleri aşılınca canlı olay üretir. Üretici olayı yazar, tüketiciler kendi hızında okur — kimse kimseyi beklemez.`,
    `In this platform Kafka does <b>three jobs</b> at once: it broadcasts rules to every gateway, streams each request's trace into analytics, and emits a <b>live event</b> when quota thresholds are crossed. The producer writes the event, consumers read at their own pace — nobody waits for anybody.`);
  t(`Producer — yazar`,
    `Producer — writes`);
  t(`Gateway Ausage üretir`,
    `Gateway A<small>produces usage</small>`);
  t(`Gateway Busage üretir`,
    `Gateway B<small>produces usage</small>`);
  t(`Adminkural + eşik olayı`,
    `Admin<small>rule + threshold events</small>`);
  t(`compact · CDC ~35 ms`,
    `compact · CDC <span class="kf-badge" id="kfBadge">~35 ms</span>`);
  t(`son değer / ruleIdrule#42 · 30/dk`,
    `<span class="kf-pn">latest value / ruleId</span><span class="kf-val" id="kfRulesVal">rule#42 · 30/min</span>`);
  t(`compact · istisna / override`,
    `compact · exception / override`);
  t(`son değer / keytenant:acme → +2×`,
    `<span class="kf-pn">latest value / key</span><span class="kf-val">tenant:acme → +2×</span>`);
  t(`6 partition · 7 gün · her istek`,
    `6 partitions · 7 days · every request`);
  t(`her zaman P2`,
    `always P2`);
  t(`YENİ · CANLI %80/%100 eşiği`,
    `<span class="kf-live">NEW · LIVE</span> 80%/100% threshold`);
  t(`eşik olayı— bekliyor —`,
    `<span class="kf-pn">threshold event</span><span class="kf-val" id="kfQVal">— waiting —</span>`);
  t(`Consumer group — okur`,
    `Consumer group — reads`);
  t(`Tüm Gateway'lerkendi random group → tam kopya`,
    `All gateways<small>own random group → a full copy</small>`);
  t(`ES indexerkendi group`,
    `ES indexer<small>its own group</small>`);
  t(`Eşik izleyicisabit paylaşımlı group`,
    `Threshold watcher<small>fixed shared group</small>`);
  t(`Downstreambildirim / otomasyon`,
    `Downstream<small>notification / automation</small>`);
  t(`Topic & Partition`,
    `Topic &amp; partition`);
  t(`usage.v1 6 partition'a bölünür. Bölme = paralellik: aynı anahtar tek partition'a düşer, farklı anahtarlar farklı partition'lara → 6 tüketici eşzamanlı çalışır.`,
    `<span class="chip-mono">usage.v1</span> is split into 6 partitions. Partitioning = parallelism: the same key always lands on one partition, different keys on different partitions → 6 consumers run concurrently.`);
  t(`Consumer group`,
    `Consumer group`);
  t(`Her gateway kendi rastgele UUID group'u → herkes TÜM kuralları alır. Eşik izleyici sabit group → iş partition'lara paylaştırılır, olay bir kez işlenir.`,
    `Every gateway uses <b>its own random UUID group</b> → each one receives ALL rules. The threshold watcher uses a <b>fixed group</b> → work is shared across partitions and each event is processed once.`);
  t(`Offset & sıra`,
    `Offset &amp; ordering`);
  t(`Her group kaldığı offset'i saklar; çöküp dönünce kaldığı yerden okur — olay kaybolmaz. Aynı anahtar hep aynı partition → sıralama garanti.`,
    `Every group stores the <span class="chip-mono">offset</span> it reached; after a crash it resumes from there — no event is lost. The same key always maps to the same partition → ordering is guaranteed.`);
  t(`Compact vs delete`,
    `Compact vs delete`);
  t(`rules/overrides compact: her anahtarın son değeri kalıcı → yeni gateway state'i baştan kurar. usage delete: 7 gün sonra silinir.`,
    `<span class="chip-mono">rules</span>/<span class="chip-mono">overrides</span> use <b>compact</b>: the latest value per key is retained → a new gateway rebuilds its state from scratch. <span class="chip-mono">usage</span> uses <b>delete</b>: removed after 7 days.`);
  t(`NE`,
    `WHAT`);
  t(`Servisler arası dayanıklı olay omurgası — üretici olayı diske yazar, tüketiciler kendi hızında okur.`,
    `A <b>durable event backbone</b> between services — the producer writes the event to disk, consumers read at their own pace.`);
  t(`NEDEN`,
    `WHY`);
  t(`Dayanıklı & tekrar-oynatılabilir · çok-tüketicili (tek olay → ES + izleyici + downstream) · gevşek bağlı (üretici tüketiciyi bilmez) · asenkron → istek yolu yavaşlamaz.`,
    `Durable &amp; <b>replayable</b> · multi-consumer (one event → ES + watcher + downstream) · loosely coupled (the producer does not know the consumer) · asynchronous → the request path never slows down.`);
  t(`NASIL`,
    `HOW`);
  t(`Çözer: ikili-yazım tutarsızlığı, senkron bağımlılık, kayıp olay. Kota %80/%100 → quota-events.v1 → otomasyon dinler.`,
    `It solves: dual-write inconsistency, synchronous coupling, lost events. Quota at <b>80%/100%</b> → <span class="chip-mono">quota-events.v1</span> → automation listens.`);
  t(`dayanıklı tekrar-oynatılabilir çok-tüketicili`,
    `<span class="pill good"><svg><use href="#i-shield"/></svg>durable</span> <span class="pill info"><svg><use href="#i-repeat"/></svg>replayable</span> <span class="pill violet"><svg><use href="#i-users"/></svg>multi-consumer</span>`);
  t(`4 · Teknoloji · Depolar`,
    `4 · Technology · Data stores`);
  t(`Üç depo, üç farklı iş`,
    `Three stores, three different jobs`);
  t(`Aynı olay gibi görünür ama tek bir karar üç ayrı soruya cevap verir. İzleyin — bir DENY olayı üç depoya farklı amaçlarla dağılıyor.`,
    `It looks like the same event, but a single decision answers three separate questions. Watch a <b>DENY event</b> fan out to three stores <b>for different purposes</b>.`);
  t(`karar olayı429 DENY · tenant=globex · endpoint=/v1/pay · rule=OVERDRAFT · 12ms`,
    `<span class="st-evt-tag">decision event</span><span class="st-evt-body">429 <b>DENY</b> · tenant=<i>globex</i> · endpoint=<i>/v1/pay</i> · rule=<i>OVERDRAFT</i> · 12ms</span>`);
  t(`PostgreSQL — Kaynak Doğruluk`,
    `PostgreSQL — Source of Truth`);
  t(`Ne: Kural, müşteri, fatura, denetim satırı.Neden: ACID + kalıcı — faturalamanın tek doğru kaynağı.`,
    `<b>What:</b> rules, customers, invoices, audit rows.<br><b>Why:</b> ACID + durable — the <b>single source of truth</b> for billing.`);
  t(`yüksek doğruluk · düşük hacim`,
    `high accuracy · low volume`);
  t(`Elasticsearch — Analitik`,
    `Elasticsearch — Analytics`);
  t(`Ne: Her isteğin tam kararı; kim / ne kadar / hangi endpoint.Neden: Yüksek kardinalite — tenant × endpoint kırılımı burada aranır.`,
    `<b>What:</b> the full decision for every request; who / how much / which endpoint.<br><b>Why:</b> <b>high cardinality</b> — the tenant × endpoint breakdown is queried here.`);
  t(`tüm etiketler serbest · milyonlarca doküman`,
    `all labels are free-form · millions of documents`);
  t(`Prometheus — Operasyon`,
    `Prometheus — Operations`);
  t(`Ne: Sistem sağlıklı mı, ne kadar hızlı, ne kadar kesiyor.Neden: Düşük kardinalite — sadece sabit etiketler.`,
    `<b>What:</b> is the system healthy, how fast is it, how much is it rejecting.<br><b>Why:</b> <b>low cardinality</b> — fixed labels only.`);
  t(`ADR-011 · tenantId etiket DEĞİL`,
    `ADR-011 · tenantId is NOT a label`);
  t(`Neden tenantId Prometheus'ta etiket değil? (ADR-011) Etiket olsaydı 5.000 tenant × 1.200 endpoint = milyonlarca ayrı zaman serisi doğar ve Prometheus çöker. O kırılım Elasticsearch'e aittir; genel p99 ise gerçek-zamanlı olmadığı için Elasticsearch'e değil Prometheus'a sorulur. Her soru doğru depoya.`,
    `<b>Why is tenantId not a Prometheus label? (ADR-011)</b> As a label it would produce 5,000 tenants × 1,200 endpoints = millions of separate time series and Prometheus would collapse. That breakdown belongs to Elasticsearch; the overall p99, being non-real-time in ES, is asked of Prometheus instead. <b>Every question to the right store.</b>`);
  t(`4 · Teknoloji · Elasticsearch + Kibana`,
    `4 · Technology · Elasticsearch + Kibana`);
  t(`Her isteğin izi — Elasticsearch analitiği`,
    `Every request's trace — Elasticsearch analytics`);
  t(`ratelimit.usage.v1 topic'inden gelen her istek bir kullanım olayına dönüşür ve toplu (_bulk) indekslenir. Prometheus'un taşıyamadığı yüksek kardinaliteli soru burada cevaplanır: kim, ne zaman, hangi endpoint'te, neden kesildi?`,
    `<b>Every request</b> arriving from the <span class="chip-mono">ratelimit.usage.v1</span> topic becomes a usage event and is indexed in batches (<span class="chip-mono">_bulk</span>). The <b>high-cardinality</b> question Prometheus cannot carry is answered here: <i>who, when, on which endpoint, and why were they cut off?</i>`);
  t(`ratelimit.usage.v1 her istek → bir olay`,
    `<span class="es-topic"><span class="es-dot"></span><svg class="es-ti"><use href="#i-stream"/></svg>ratelimit.usage.v1</span> <span class="es-phead-note">every request → one event</span>`);
  t(`_bulk tamponu 0 / 500`,
    `<span><span class="chip-mono">_bulk</span> buffer</span> <span class="es-buf-cnt" id="esBufCnt">0 / 500</span>`);
  t(`toplu indeksleme → Elasticsearch`,
    `bulk indexing → Elasticsearch`);
  t(`indekslenen belge · 0 belge/sn`,
    `documents indexed · <span id="esRps">0</span> docs/s`);
  t(`Kibana · :5601 canlı pano`,
    `<span class="es-topic kb"><svg class="es-ti"><use href="#i-chart"/></svg>Kibana · :5601</span> <span class="es-phead-note">live dashboard</span>`);
  t(`globex · 429 · son 1s → 0 eşleşen belge`,
    `<b>globex</b> · 429 · last 1s → <b class="es-qres-n" id="esQresN">0</b> matching documents`);
  t(`NE — olay ambarı`,
    `WHAT — the event warehouse`);
  t(`Her kararın tam bağlamı tek belgede: tenant, endpoint, karar (ALLOW/DENY/SHADOW), kural, gecikme, zaman. Günlük index (ratelimit-usage-*), milyonlarca doküman.`,
    `The <b>full context</b> of every decision in a single document: tenant, endpoint, decision (<span class="chip-mono">ALLOW/DENY/SHADOW</span>), rule, latency, timestamp. A daily index (<span class="chip-mono">ratelimit-usage-*</span>), millions of documents.`);
  t(`NEDEN — yüksek kardinalite`,
    `WHY — high cardinality`);
  t(`Tenant × endpoint = milyonlarca kırılım. Prometheus'ta etiket olsa çöker (ADR-011). ES ters-indeksle tam-metin + terms/date agregasyonuyu saniyede döndürür — serbest sorgu.`,
    `Tenant × endpoint = millions of breakdowns. As a Prometheus label it would collapse (ADR-011). With its inverted index, ES returns <b>full-text plus terms/date aggregations</b> in a second — <b>ad-hoc querying</b>.`);
  t(`NASIL — bulk + Kibana`,
    `HOW — bulk + Kibana`);
  t(`Consumer olayları tamponlar, _bulk ile toplu yazar (tek tek değil → yüksek verim). Kibana (:5601) bu index üzerinde pano, filtre ve alarm kurar.`,
    `The consumer buffers events and writes them in batches with <span class="chip-mono">_bulk</span> (not one by one → high throughput). Kibana (<span class="chip-mono">:5601</span>) builds dashboards, filters and alerts on that index.`);
  t(`Prometheus "ne kadar?", Elasticsearch "kim ve neden?" Bir müşteri "dün 14:00–15:00 arası neden kesildim?" diye sorduğunda Prometheus'un genel decisions_total sayacı yetmez — o sadece toplam sayar. ES'te tenantId:"globex" AND decision:"DENY" sorgusu tam o pencereyi, tam o kuralı, tam o endpoint'i geri getirir. Denetim, kök-neden ve iş analitiği bu depoya ait.`,
    `<b>Prometheus answers "how much?", Elasticsearch answers "who and why?"</b> When a customer asks "why was I cut off between 14:00 and 15:00 yesterday?", Prometheus's aggregate <span class="chip-mono">decisions_total</span> counter is not enough — it only counts totals. In ES the query <span class="chip-mono">tenantId:"globex" AND decision:"DENY"</span> brings back exactly that window, exactly that rule, exactly that endpoint. <b>Auditing, root-cause and business analytics belong to this store.</b>`);
  t(`4 · Teknoloji · Gözlemlenebilirlik`,
    `4 · Technology · Observability`);
  t(`Prometheus + Grafana — sistemin nabzı`,
    `Prometheus + Grafana — the system's <span class="grad-text">pulse</span>`);
  t(`Rolü net: düşük kardinaliteli operasyon metriği. Gateway /actuator/prometheus'u açar, Prometheus scrape eder (:9090), Grafana panolarda gösterir (:3001). Ucuz, sürekli, alarmlı. Ama tek bir kural var: tenantId etiket DEĞİL (ADR-011).`,
    `Its role is clear: <b>low-cardinality</b> operational metrics. The gateway exposes <span class="chip-mono">/actuator/prometheus</span>, Prometheus <b>scrapes</b> it (<span class="chip-mono">:9090</span>), Grafana renders the dashboards (<span class="chip-mono">:3001</span>). Cheap, continuous, alertable. With one rule: <b>tenantId is NOT a label</b> (ADR-011).`);
  t(`Gateway/actuator/prometheus scrape · 15s Prometheus:9090 · TSDB PromQL Grafana:3001 · pano + alarm`,
    `<span class="ob-node"><svg><use href="#i-gate"/></svg>Gateway<i>/actuator/prometheus</i></span> <span class="ob-flow"><em class="ob-scrape">scrape · 15s</em></span> <span class="ob-node info"><svg><use href="#i-db"/></svg>Prometheus<i>:9090 · TSDB</i></span> <span class="ob-flow"><em>PromQL</em></span> <span class="ob-node accent"><svg><use href="#i-gauge"/></svg>Grafana<i>:3001 · dashboards + alerts</i></span>`);
  t(`Rate-Limit · Operasyon CANLI :3001`,
    `<span class="ob-dots"><i></i><i></i><i></i></span> <span class="ob-ptitle"><svg class="ti"><use href="#i-gauge"/></svg>Rate-Limit · Operations</span> <span class="ob-live" id="obLive"><i></i>LIVE</span> <span class="ob-port">:3001</span>`);
  t(`(zirve %14)`,
    `(peak 14%)`);
  t(`izin/red oranı`,
    `allow/deny ratio`);
  t(`şimdi 4,0%`,
    `now <b id="obCur">4.0%</b>`);
  t(`0karar p99 (Grafana'da ölçüldü)`,
    `<span class="ob-sv"><span class="num" data-count="7.1" data-dec="1" data-suffix=" ms">0</span></span><span class="ob-sl">decision p99 (measured in Grafana)</span>`);
  t(`0yük testi debisi`,
    `<span class="ob-sv"><span class="num" data-count="1081" data-dec="0" data-suffix=" rps">0</span></span><span class="ob-sl">load-test throughput</span>`);
  t(`231→14msGC darboğazı · panoda görüldü`,
    `<span class="ob-sv">231<span class="ob-arr">→</span>14<em>ms</em></span><span class="ob-sl">GC bottleneck · spotted on the dashboard</span>`);
  t(`tenantId ETİKET olsaydı 5.000 tenant × 1.200 endpoint`,
    `<span class="ob-tag danger">if tenantId WERE a label</span> <span class="ob-formula">5,000 tenants × 1,200 endpoints</span>`);
  t(`0 aktif seri TSDB şişer → Prometheus çöker`,
    `<span class="ob-series"><b class="num" id="obSeries">0</b> active series</span> <span class="ob-verdict danger"><svg><use href="#i-x"/></svg>the TSDB balloons → Prometheus collapses</span>`);
  t(`tenantId etiketsiz — yalnız sabit etiketler {outcome, rule}`,
    `<span class="ob-tag good">without tenantId — fixed labels only</span> <span class="ob-formula">{outcome, rule}</span>`);
  t(`~120 seri ucuz · sürekli · alarmlanabilir`,
    `<span class="ob-series"><b>~120</b> series</span> <span class="ob-verdict good"><svg><use href="#i-check"/></svg>cheap · continuous · alertable</span>`);
  t(`p99 gecikme`,
    `p99 latency`);
  t(`Redis fallback`,
    `Redis fallback`);
  t(`Her soru doğru depoya. Prometheus zaman × metric × sabit-etiket tutar; tenant gibi milyon değerli bir kırılım eklersen seri sayısı patlar (yukarıda ~6 milyon). Bu yüzden "hangi tenant ne zaman kesildi?" sorusu Elasticsearch'e; "sistem şu an sağlıklı mı, p99 kaç, red oranı eşiği aştı mı?" sorusu Prometheus'a gider. GC darboğazını (231→14 ms) ve 1081 rps'i işte bu ucuz panoda gördük.`,
    `<b>Every question to the right store.</b> Prometheus keeps <b>time × metric × fixed labels</b>; add a million-valued breakdown like tenant and the series count explodes (~6 million above). So "which <i>tenant</i> was cut off and when?" goes to <b>Elasticsearch</b>, while "is the system healthy right now, what is p99, has the deny ratio crossed the threshold?" goes to <b>Prometheus</b>. We spotted the GC bottleneck (231→14 ms) and the 1081 rps on exactly this cheap dashboard.`);
  t(`5 · Ürün · Canlı senaryo`,
    `5 · Product · Live scenario`);
  t(`Kota cüzdanı — eksiye düşme`,
    `Quota wallet — going negative`);
  t(`1000 birim yüklü, 900 tüketilmiş → bakiye 100. Butonlarla cüzdanı siz oynatın: 200 birimlik istek bakiye pozitifken geçer, sizi -100'e düşürür; sonrası 429. Yükleyince erişim geri açılır.`,
    `1000 units granted, 900 consumed → balance 100. Drive the wallet yourself with the buttons: a <b>200-unit</b> request passes while the balance is positive and drops you to <b>−100</b>; everything after that is <b>429</b>. Top up and access reopens.`);
  t(`Kota cüzdanı · 1000 birim yüklü bakiye 100`,
    `<span class="lbl">Quota wallet · <b id="wal2Granted">1000</b> units granted</span> <span class="bal" id="wal2Bal">balance 100</span>`);
  t(`AŞIM`,
    `OVERDRAFT`);
  t(`tüketilen: 900 bakiye = yüklü − tüketilen`,
    `<span>consumed: <b id="wal2Used">900</b></span> <span>balance = granted − consumed</span>`);
  t(`Otomatik demo`,
    `<input type="checkbox" id="wal2Auto">Auto demo`);
  t(`① Bakiye 100`,
    `① Balance 100`);
  t(`bakiye > 0 → değerlendir`,
    `balance &gt; 0 → evaluate`);
  t(`② İstek GEÇER`,
    `② Request PASSES`);
  t(`③ Bakiye -100`,
    `③ Balance −100`);
  t(`④ Kota yükle`,
    `④ Top up quota`);
  t(`+1000 → bakiye 900`,
    `+1000 → balance 900`);
  t(`Neden geçiriyoruz? İsteği ortasında kesmek yarım iş (yarım transfer, yarım rapor) üretir. Aşım faturalandırılabilir; yarım iş faturalandırılamaz. Bu yüzden bakiye pozitifken istek tamamlanır (bir kez eksiye düşülebilir), sonrası kesilir. Bu davranış OVERDRAFT_QUOTA (kod 5) algoritmasıdır.`,
    `<b>Why do we let it through?</b> Cutting a request off midway produces half-done work (half a transfer, half a report). An overdraft can be billed; half-done work cannot. So while the balance is positive the request completes (it may go negative once) and everything after that is cut off. This behaviour is the <b>OVERDRAFT_QUOTA (code 5)</b> algorithm.`);
  t(`5 · Ürün · Kota modeli`,
    `5 · Product · Quota model`);
  t(`Ön ödemeli mi, her dönem yenilenen mi?`,
    `Prepaid, or renewed every period?`);
  t(`Tek düğme (kota modu) iki iş modelini de verir. Modu seçin, “Dönemi ilerlet” ile dönemleri atlayın: Ön Ödemeli cüzdan birikir, hiç sıfırlanmaz; Yenilenen kota her dönem başında el değmeden 0'a döner.`,
    `A single switch (quota mode) gives you both business models. Pick a mode and skip through periods with <b>“Advance period”</b>: the <b>Prepaid</b> wallet accrues and never resets; the <b>Renewing</b> quota returns to 0 at the start of every period with no intervention.`);
  t(`Otomatik`,
    `<input type="checkbox" id="per2Auto">Auto`);
  t(`Yenilenen sayaç anahtarı rl:{t:acme}:q.wallet:20260724 1. dönem`,
    `<span class="per2-key-lbl">Renewing counter key</span> <span class="chip-mono per2-keychip">rl:{t:acme}:q.wallet:<b id="per2Slice">20260724</b></span> <span class="per2-period" id="per2Period">period 1</span>`);
  t(`Ön Ödemeli`,
    `Prepaid`);
  t(`yenilenmez · birikir`,
    `never renews · accrues`);
  t(`tüketim birikir — dönem değişse de sıfırlanmaz`,
    `consumption <b>accrues</b> — it never resets, even across periods`);
  t(`Yenilenen · Günlük`,
    `Renewing · <span id="per2ModeLbl">Daily</span>`);
  t(`her dönem 0'a döner`,
    `returns to 0 each period`);
  t(`dönem sınırında sayaç 0'a döner — el değmeden yeni hak`,
    `at the period boundary the counter returns to <b>0</b> — a fresh allowance with no intervention`);
  t(`önceki dönem—`,
    `<span class="per2-slot-lbl">previous period</span><span class="per2-slot-key" id="per2Prev">—</span>`);
  t(`bu dönem20260724`,
    `<span class="per2-slot-lbl">current period</span><span class="per2-slot-key" id="per2Cur">20260724</span>`);
  t(`sonraki dönem20260725`,
    `<span class="per2-slot-lbl">next period</span><span class="per2-slot-key" id="per2Next">20260725</span>`);
  t(`Nasıl çalışır? Yenilenen kotada sayaç anahtarına dönem dilimi gömülür: …:q.wallet:20260724. Dönem değişince …:20260725 yeni bir anahtar doğar; eskisi TTL ile silinir → tüketim ekstra kod olmadan sıfırlanır. Haftalıkta ISO hafta (2026W30), aylıkta ay (202607) dilimi kullanılır. Ön ödemelide dilim yoktur; anahtar sabittir, hiç sıfırlanmaz.`,
    `<b>How does it work?</b> For a renewing quota the <b>period slice</b> is embedded in the counter key: <span class="chip-mono">…:q.wallet:<b>20260724</b></span>. When the period rolls over, <span class="chip-mono">…:20260725</span> is born as a new key and the old one is removed by TTL → consumption resets <b>with no extra code</b>. Weekly uses the ISO week (<span class="chip-mono">2026W30</span>), monthly uses the month (<span class="chip-mono">202607</span>). Prepaid has no slice; the key is fixed and never resets.`);
  t(`5 · Ürün · Dayanıklılık`,
    `5 · Product · Resilience`);
  t(`Redis çökerse ne olur?`,
    `What happens if Redis goes down?`);
  t(`Fail-open ve fail-closed ikili bir seçim değildir. Her kural kendi politikasını taşır. Redis'i "düşürüp" üç farklı sonucu izleyelim.`,
    `Fail-open and fail-closed are not a binary choice. Every rule carries its own policy. Let's "kill" Redis and watch three different outcomes.`);
  t(`Redis çalışıyor — kararlar normal veriliyor`,
    `<b>Redis is up</b> — decisions are made normally`);
  t(`Adil kullanım, genel koruma. Kesinti gürültülü komşudan kötüdür.`,
    `Fair use, general protection. An outage is worse than a noisy neighbour.`);
  t(`Güvenlik (login) ve ücretli kota. Brute-force penceresi açılmamalı.`,
    `Security (login) and paid quota. A brute-force window must never open.`);
  t(`Global limiti pod sayısına böl, yerel kova uygula. Kritik downstream'i korur.`,
    `Divide the global limit by the pod count and apply a local bucket. It protects critical downstreams.`);
  t(`Üçüncü yol neden önemli? "Hiç limitleme" ile "her şeyi kes" arasında bir orta yol. Devre kesici, Redis'in "yaşayan ölü" halini (yavaş ama cevap veren) bile erken yakalar — p99 bütçesini korur.`,
    `<b>Why does the third path matter?</b> It is a middle ground between "no limiting at all" and "cut everything". The circuit breaker catches even Redis's "walking dead" state (slow but still answering) early — protecting the p99 budget.`);
  t(`Kota sistemi çökerse hesaplar ne olur?`,
    `If the quota system crashes, what happens to the balances?`);
  t(`Redis para değil hız tutar. Tüketim her 30 sn PostgreSQL'e checkpoint'lenir. Redis tüm veriyi kaybetse bile müşteri bedava kota kazanamaz — sayaç checkpoint'ten geri kurulur. Senaryoyu aşağıda siz yürütün.`,
    `Redis holds <b>speed, not money</b>. Consumption is <b>checkpointed</b> to PostgreSQL every <b>30 s</b>. Even if Redis loses all its data, the customer <b>cannot earn free quota</b> — the counter is rebuilt from the checkpoint. <b>Run the scenario yourself</b> below.`);
  t(`durum · normal`,
    `state · normal`);
  t(`hızlı karar`,
    `fast decision`);
  t(`her 30 sn · checkpoint`,
    `every 30 s · checkpoint`);
  t(`dayanıklı gerçek · dönem 20260724`,
    `durable truth · period 20260724`);
  t(`Normal: Redis karar veriyor, checkpoint her 30 sn tazeleniyor.`,
    `<b>Normal:</b> Redis is deciding, the checkpoint refreshes every 30 s.`);
  t(`6 eş zamanlı`,
    `6 concurrent`);
  t(`Atomik taban · max(mevcut, 30) 30 idempotent · doğru`,
    `<span class="rc-cmp-lbl">Atomic floor · <span class="chip-mono">max(current, 30)</span></span> <span class="rc-cmp-val" id="rcFloorVal">30</span> <span class="rc-cmp-tag good">idempotent · correct</span>`);
  t(`INCRBY 30 olsaydı · ×6 30 şişme · yanlış`,
    `<span class="rc-cmp-lbl">if it were <span class="chip-mono">INCRBY 30</span> · ×6</span> <span class="rc-cmp-val" id="rcIncrVal">30</span> <span class="rc-cmp-tag danger">inflation · wrong</span>`);
  t(`Redis'e ulaşılamıyor → ekranda son checkpoint "bayat" damgasıyla gösterilir. Uydurma değer yok; kullanıcı verinin gecikmeli olduğunu bilir.`,
    `<b>Redis is unreachable</b> → the last checkpoint is shown on screen stamped <b>"stale"</b>. No invented values; the user knows the data is lagging.`);
  t(`Redis veriyi kaybetti → "Uzlaşmayı çalıştır" kaybı fark eder ve checkpoint'ten geri yükler. 30 tüketim 30 kalır, 0 olmaz.`,
    `<b>Redis lost the data</b> → "Run reconciliation" notices the loss and restores from the checkpoint. A consumption of 30 stays <b>30</b>; it does not become 0.`);
  t(`idempotent`,
    `idempotent`);
  t(`Geri yükleme birden çok yoldan (gösterim + zamanlı iş) ve eş zamanlı tetiklenebilir. INCRBY olsaydı her çağrı değeri şişirirdi: 6 çağrı → 180. Bunun yerine atomik taban (floor) yazılır: max(mevcut, checkpoint). Kaç kez çalışırsa çalışsın sonuç 30. Çökme sonrası gelen yeni trafik değeri büyütmüşse o korunur — hiçbir tüketim kaybolmaz.`,
    `Restoration can be triggered from several places (the demo plus a scheduled job) and <b>concurrently</b>. With <span class="chip-mono">INCRBY</span> every call would inflate the value: 6 calls → <b style="color:var(--danger)">180</b>. Instead an atomic <b>floor</b> is written: <span class="chip-mono">max(current, checkpoint)</span>. However many times it runs, the result is <b style="color:var(--good)">30</b>. If new traffic after the crash already pushed the value higher, that value is kept — no consumption is ever lost.`);
  t(`5 · Ürün · Sağlamlaştırma`,
    `5 · Product · Hardening`);
  t(`Güvenlik & İdempotency`,
    `Security &amp; idempotency`);
  t(`Dört açık kapatıldı; hepsi Redis öncelikli — sıcak yol veritabanına yük bindirmez. İlk ikisini elinizle deneyin: para tam bir kez yazılır, IDOR saldırısı imzada reddedilir.`,
    `Four holes were closed, all of them <b>Redis-first</b> — the hot path never loads the database. <b>Try the first two yourself</b>: money is written exactly once, and an IDOR attack is rejected at the signature.`);
  t(`İdempotency — para tam bir kez`,
    `Idempotency — money exactly once`);
  t(`Kota yükleme / fatura · SET NX Redis kilidi · DB'ye sıfır yük`,
    `Quota top-up / invoice · a <span class="chip-mono">SET NX</span> Redis lock · zero load on the DB`);
  t(`Sahiplenen · SET NX = OK0`,
    `<span>Winner · <span class="chip-mono">SET NX = OK</span></span><b class="good" id="secOwn">0</b>`);
  t(`Yinelenen · yok sayıldı0`,
    `<span>Duplicates · ignored</span><b class="dim" id="secDup">0</b>`);
  t(`Cüzdana yazılan+0 TL`,
    `<span>Written to the wallet</span><b id="secAmount">+0 TL</b>`);
  t(`Portal IDOR → HMAC token`,
    `Portal IDOR → HMAC token`);
  t(`Parametre yok sayılır · imzalı token · doğrulama sıfır DB/Redis`,
    `The parameter is ignored · a signed token · verification touches neither DB nor Redis`);
  t(`token · payload`,
    `token · payload`);
  t(`HMAC-SHA256 imza`,
    `HMAC-SHA256 signature`);
  t(`200 OK · imza doğru — token içindeki kimlik kullanılır`,
    `200 OK · signature valid — the identity inside the token is used`);
  t(`Kural yönetimi Bearer token ile korunur (admin / readonly rolleri). Karşılaştırma MessageDigest.isEqual ile sabit zamanlı — token'ı harf harf tahmin ettiren zamanlama sızıntısı yok. Denetim aktörü artık istemciden gelmez, token'dan türetilir: dev modda bile sahtecilik imkânsız.`,
    `Rule management is protected by a Bearer token (<span class="chip-mono">admin</span> / <span class="chip-mono">readonly</span> roles). Comparison is <b>constant-time</b> via <span class="chip-mono">MessageDigest.isEqual</span> — no timing leak that would let the token be guessed character by character. The audit actor no longer comes from the client; it is <b>derived from the token</b>, so forgery is impossible even in dev mode.`);
  t(`Müşteri listesi eskiden her müşteri için ayrı kural sorgusu yapıyordu: 1 + N. Deterministik dönem-dilimli anahtar sayesinde kural DB'den yüklenmeden Redis'ten okunur. Artık 1 SQL + 1 Redis MGET: 1.000 müşteri için 1.001 sorgu → 2 gidiş. Sıcak yol veritabanını hiç görmez.`,
    `The customer list used to issue a separate rule query per customer: <b>1 + N</b>. Thanks to the deterministic period-sliced key, the value is read from Redis without loading the rule from the DB. It is now <b>1 SQL + 1 Redis MGET</b>: for 1,000 customers, <b>1,001 queries → 2 round trips</b>. The hot path never touches the database.`);
  t(`6 · Uygulamalı · Test rehberinden`,
    `6 · Hands-on · From the test guide`);
  t(`Elinizle deneyin — hız limiti`,
    `Try it yourself — rate limiting`);
  t(`Test rehberinin ilk kanıtı: aynı istek iki farklı porta. Butona basın — kova (burst 10) boşalınca 429 başlar. Gerçek kuralın simülasyonu: GCRA 30/dk, burst 10. Aşağıdaki her tıklama gerçek sistemdeki bir curl isteğine denktir.`,
    `The first proof from the test guide: <b>the same request against two different ports</b>. Press the button — once the bucket (burst <b>10</b>) drains, the 429s begin. A simulation of the real rule: GCRA 30/min, burst 10. Every click below is equivalent to one <span class="chip-mono">curl</span> request against the real system.`);
  t(`Gateway'i atla — doğrudan servis :8082 (limitsiz)`,
    `<input type="checkbox" id="rlBypass"> <span>Bypass the gateway — hit the service directly at <span class="chip-mono">:8082</span> (unlimited)</span>`);
  t(`0 × 2000 × 429port :8080 · gateway`,
    `<span class="ok"><b id="rlOk">0</b> × 200</span><span class="bad"><b id="rlBad">0</b> × 429</span><span class="port" id="rlPort">port :8080 · gateway</span>`);
  t(`Ne kanıtlıyor? Gateway (:8080) ilk 10 isteği geçirir, sonra 429 ile kenarda keser — downstream servise hiç yük binmez. "Gateway'i atla"yı işaretleyip aynı isteği doğrudan servise (:8082) gönderdiğinizde hepsi 200 döner: servisin kendi limitlemesi yoktur. Fark, limitlemenin nerede yapıldığını gösterir.`,
    `<b>What does it prove?</b> The gateway (:8080) lets the first 10 requests through, then cuts the rest off <b>at the edge</b> with 429 — the downstream service takes no load at all. Tick "bypass the gateway" and send the same requests straight to the service (:8082) and <b>all of them return 200</b>: the service has no limiting of its own. The difference shows you where the limiting happens.`);
  t(`6 · Uygulamalı · Kota rehberinden`,
    `6 · Hands-on · From the quota guide`);
  t(`Elinizle deneyin — kota senaryoları`,
    `Try it yourself — quota scenarios`);
  t(`Gerçek uygulama davranışını adım adım yürütün. Üstten bir senaryo seçin; "Sonraki adım" ile cüzdan bakiyesini canlı izleyin. Her adım ne olduğunu ve neden olduğunu anlatır — overdraft, haftalık yenilenme, çoklu servis maliyeti, idempotent yükleme ve başarısız çağrı iadesi.`,
    `Walk through the real application behaviour <b>step by step</b>. Pick a scenario at the top and follow the wallet balance live with "Next step". Each step explains <b>what</b> happened and <b>why</b> — overdraft, weekly renewal, multi-service cost, idempotent top-up and refunds for failed calls.`);
  t(`(overdraft)`,
    `(overdraft)`);
  t(`Bakiye pozitifken bir kez aşıma izin verilir; sonra 429. Eşik bildirimi, askıya alma ve iade de aynı akışta.`,
    `While the balance is positive one overdraft is allowed; after that, 429. Threshold notification, suspension and refunds are part of the same flow.`);
  t(`Başlamak için "Sonraki adım"a basın—`,
    `<span class="q-wname" id="qTitle">Press "Next step" to begin</span><span class="q-wbal" id="qBal">—</span>`);
  t(`yüklenen 0tüketilen 0`,
    `<span id="qGranted">granted 0</span><span id="qConsumed">consumed 0</span>`);
  t(`hazır`,
    `<span class="q-ev-dot"></span><span id="qEventTxt">ready</span>`);
  t(`Her adımda burada neden öyle davrandığını göreceksiniz.`,
    `At each step you will see <b>why</b> it behaved that way here.`);
  t(`İlerledikçe adımlar burada birikecek.`,
    `The steps will accumulate here as you go.`);
  t(`5 · Ürün · Ölçüm`,
    `5 · Product · Measurement`);
  t(`Sadece tasarım değil — çalışıyor`,
    `Not just a design — it runs`);
  t(`Hepsi çalışan sistem üzerinde, tek dizüstünde (Docker 8 CPU / 11 GB) ölçüldü.`,
    `All of it measured on the running system, on a single laptop (Docker, 8 CPU / 11 GB).`);
  t(`500 eş zamanlı istek`,
    `500 concurrent requests`);
  t(`tam olarak 250 geçti · limit korundu`,
    `exactly 250 passed · the limit held`);
  t(`Ek gecikme p99`,
    `Added latency p99`);
  t(`Sürdürülen rps`,
    `Sustained rps`);
  t(`Otomatik test`,
    `Automated tests`);
  t(`hepsi geçiyor`,
    `all passing`);
  t(`İlk yük testinde isteklerin %19'u 503 aldı. Redis sağlıklıydı (23µs) ama gateway JVM'inin GC duraklaması 231ms'ye çıkıyordu → timeout → devre kesici → fail-closed 503. Hata JVM ayarındaydı, sistemde değil.`,
    `On the first load test 19% of requests got a 503. Redis was healthy (23µs) but the gateway JVM's <b>GC pause reached 231 ms</b> → timeout → circuit breaker → fail-closed 503. The fault was in the JVM tuning, not in the system.`);
  t(`GC duraklama`,
    `GC pause`);
  t(`Reddedilen istek kotayı tüketmez — 20 başarısız denemeden sonra sayaç sabit.`,
    `A rejected request <b>does not consume quota</b> — after 20 failed attempts the counter is unchanged.`);
  t(`Redis kapalı + fail-closed → 503 (429 değil — hata istemcide değil).`,
    `Redis down + fail-closed → <b>503</b> (not 429 — the fault is not on the client side).`);
  t(`Redis restart → cüzdan bakiyesi korundu (AOF ile 850 → 850).`,
    `Redis restart → the wallet balance <b>survived</b> (850 → 850 thanks to AOF).`);
  t(`6 · Kanıt · Gerçek testler`,
    `6 · Proof · Real tests`);
  t(`Aşağıdaki her satır bu sistemde gerçekten koşturuldu; slaytlar ekran görüntüsü değil, ölçüm. Testleri çalıştır'a basın — satırlar sırayla yeşile dönsün, her biri kendi ölçüm rozetini göstersin.`,
    `Every line below was <b>actually executed</b> against this system; the slides are measurements, not screenshots. Press <b>Run the tests</b> — watch the rows turn green in order, each showing its own measurement badge.`);
  t(`0 / 12 geçti`,
    `0 / 12 passed`);
  t(`hazır`,
    `ready`);
  t(`500 eş zamanlı istek → tam 250 geçti (limit 250)250 / 250atomik`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">500 concurrent requests → <b>exactly 250</b> passed (limit 250)</span><span class="tr-badge">250 / 250</span><span class="tr-res">atomic</span>`);
  t(`Kayan pencere (SLIDING_WINDOW) API anahtarına 20/dk uyguladı → 25 istek: 20 geçti · 5 kesildi20 / 25sliding`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">The sliding window (SLIDING_WINDOW) applied <b>20/min</b> per API key → 25 requests: <b>20 passed · 5 cut off</b></span><span class="tr-badge">20 / 25</span><span class="tr-res">sliding</span>`);
  t(`Reddedilen istek kotayı tüketmedi (20 denemeden sonra sayaç sabit)0 sızmaiki-faz`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">A rejected request <b>did not consume</b> quota (counter unchanged after 20 attempts)</span><span class="tr-badge">0 leakage</span><span class="tr-res">two-phase</span>`);
  t(`Bakiye 100 · 200'lük istek geçti → -100, sonrası 429-100overdraft`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">Balance 100 · a 200-unit request passed → <b>−100</b>, everything after that 429</span><span class="tr-badge">-100</span><span class="tr-res">overdraft</span>`);
  t(`Kota %80'e ulaşınca tek eşik bildirimi gitti · %100'de erişim kesildi1 bildirimeşik`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">At 80% quota <b>exactly one</b> threshold notification was sent · at 100% access was cut</span><span class="tr-badge">1 notification</span><span class="tr-res">threshold</span>`);
  t(`%80 eşiği aşılınca Kafka olayı yayınlandı → ratelimit.quota-events.v1 (eşik ekrandan dinamik)quota-events.v1kafka`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">Crossing the 80% threshold published a <b>Kafka event</b> → <span class="chip-mono">ratelimit.quota-events.v1</span> (threshold configurable from the UI)</span><span class="tr-badge">quota-events.v1</span><span class="tr-res">kafka</span>`);
  t(`Admin'de kural değişti → gateway'e ~35 ms'de yayıldı (CDC zinciri)~35 msyayılım`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">A rule changed in the admin UI → propagated to the gateway in <b>~35 ms</b> (the CDC chain)</span><span class="tr-badge arrow">~35 ms</span><span class="tr-res">propagation</span>`);
  t(`Günlük yenilenen kota → anahtar …q.wallet:20260724, dönemle sıfırlanır20260724dönem`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">Daily renewing quota → key <span class="chip-mono">…q.wallet:20260724</span>, resets with the period</span><span class="tr-badge arrow">20260724</span><span class="tr-res">period</span>`);
  t(`Redis'ten sayaç silindi → checkpoint'ten 30 geri yüklendi (0 değil)30 ↺uzlaşma`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">The counter was deleted from Redis → <b>30</b> was restored from the checkpoint (not 0)</span><span class="tr-badge">30 ↺</span><span class="tr-res">reconciliation</span>`);
  t(`6 eş zamanlı geri yükleme → yine 30 (INCRBY olsa 180 olurdu)30 ≠ 180idempotent`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">6 concurrent restorations → still <b>30</b> (with INCRBY it would have been 180)</span><span class="tr-badge">30 ≠ 180</span><span class="tr-res">idempotent</span>`);
  t(`GC darboğazı bulundu: 231ms → 14ms, 5xx 125.100 → 0 · 1081 rps231→14 msyük`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">GC bottleneck found: <b>231 ms → 14 ms</b>, 5xx <b>125,100 → 0</b> · 1081 rps</span><span class="tr-badge arrow">231→14 ms</span><span class="tr-res">load</span>`);
  t(`Redis restart → AOF ile bakiye korundu (850 → 850)850 → 850kalıcılık`,
    `<span class="tr-ck"><span class="tr-spin"></span><svg class="tr-chk"><use href="#i-check"/></svg></span><span class="tr-txt">Redis restart → the balance <b>survived</b> thanks to AOF (850 → 850)</span><span class="tr-badge arrow">850 → 850</span><span class="tr-res">durability</span>`);
  t(`77 otomatik test · 7 uçtan uca senaryo · p99 7,1 ms · hepsi yeşil, 0 hata`,
    `<b>77</b> automated tests · <b>7</b> end-to-end scenarios · p99 <b>7.1 ms</b> · <span class="done-x">all green, 0 failures</span>`);
  t(`6 · Kanıt · Ne yaptık, neden, neyi çözdü`,
    `6 · Proof · What we did, why, what it solved`);
  t(`Her testin arkasındaki mantık`,
    `The reasoning behind each test`);
  t(`Testler rastgele değil: her biri gerçek bir başarısızlık modunu hedefler. Bir başlığa tıklayın — ne yaptık · neden bu mekanizma · neyi çözdü, ölçülen kanıt ve mekanizmanın canlı mini şeması açılsın.`,
    `The tests are not arbitrary: each targets a real failure mode. Click a heading — <b>what we did · why this mechanism · what it solved</b>, the measured evidence and a <b>live mini diagram of the mechanism</b> will open.`);
  t(`Yarış koşulu · atomiklik`,
    `Race condition · atomicity`);
  t(`500 istemci → tam 250`,
    `500 clients → exactly 250`);
  t(`Ne500 istemci tam aynı anda aynı sayaca vurdu.`,
    `<b>What</b><span>500 clients hit the same counter <em>at exactly the same moment</em>.</span>`);
  t(`NedenRedis + Lua: "oku-karşılaştır-yaz" tek atomik adımda çalışır. İki istek çekirdek içinde sıraya girer; uygulama katmanında kilit olsaydı ağ gidiş-gelişi yarışı açardı.`,
    `<b>Why</b><span>Redis + Lua: "read-compare-write" runs <em>in a single atomic step</em>. The two requests queue inside the engine; with an application-level lock the network round trip would have opened the race.</span>`);
  t(`ÇözdüFazladan geçiş (251+) imkânsız → gelir ve koruma sızmaz.`,
    `<b>Solved</b><span>An extra pass (251+) is <em>impossible</em> → neither revenue nor protection leaks.</span>`);
  t(`Lua · atomik`,
    `Lua · atomic`);
  t(`sayaç99/100`,
    `<span class="td2-ctrl">counter</span><span class="td2-ctrv">99</span><span class="td2-ctrm">/100</span>`);
  t(`Overdraft · tek seferlik aşım`,
    `Overdraft · a single allowed overrun`);
  t(`NeBakiye 100 iken 200'lük tek istek geldi.`,
    `<b>What</b><span>A single 200-unit request arrived while the balance was 100.</span>`);
  t(`Nedenİki-fazlı değerlendir-uygula: isteği ortada kesmek yarım iş (yarım transfer) üretir; bakiye pozitifken iş tamamlanır, aşım faturalanır.`,
    `<b>Why</b><span>A two-phase <em>evaluate-then-apply</em>: cutting the request off midway produces half-done work (half a transfer); while the balance is positive the work completes and the overdraft is billed.</span>`);
  t(`Çözdüİş biter, aşım faturalanır, sonraki istekler kesilir — "yarım transfer" sorunu yok.`,
    `<b>Solved</b><span>The work finishes, the overdraft is billed, subsequent requests are cut off — no "half transfer" problem.</span>`);
  t(`bakiye100gelen: 200`,
    `<span class="td2-wlbl">balance</span><b class="td2-wnum">100</b><span class="td2-wreq">incoming: 200</span>`);
  t(`AŞIM −100sonraki → 429`,
    `<span class="td2-wneg">OVERDRAFT −100</span><span class="td2-wstamp">next → 429</span>`);
  t(`İdempotency · para işlemleri`,
    `Idempotency · money operations`);
  t(`50 istek → 1 sahiplenir`,
    `50 requests → 1 wins`);
  t(`Ne50 eş zamanlı kota yükleme, aynı Idempotency-Key.`,
    `<b>What</b><span>50 concurrent quota top-ups with the <em>same</em> Idempotency-Key.</span>`);
  t(`NedenRedis SET NX: anahtarı yalnız ilk gelen kurar, DB'ye hiç gitmeden tam bir kez sahiplenme; diğer 49 "zaten var" alır.`,
    `<b>Why</b><span>Redis <em>SET NX</em>: only the <em>first</em> arrival sets the key — exactly-once ownership without touching the DB; the other 49 get "already exists".</span>`);
  t(`ÇözdüÇift tıklama / retry kotayı iki kez doldurmaz — müşteri iki kez faturalanmaz.`,
    `<b>Solved</b><span>A double click or retry never tops the quota up twice — the customer is not billed twice.</span>`);
  t(`1 sahiplendi ✓49 → "zaten var"`,
    `<span class="td2-nxwin">1 won ✓</span><span class="td2-nxlose">49 → "already exists"</span>`);
  t(`Uzlaşma · çökme kurtarma`,
    `Reconciliation · crash recovery`);
  t(`silindi → 30 (0 değil)`,
    `deleted → 30 (not 0)`);
  t(`NeRedis sayacı silindi; 6 eş zamanlı geri yükleme tetiklendi.`,
    `<b>What</b><span>The Redis counter was deleted; 6 concurrent restorations were triggered.</span>`);
  t(`NedenPostgreSQL checkpoint dayanıklı gerçektir; geri yükleme idempotent taban = max(mevcut, checkpoint), INCRBY değil.`,
    `<b>Why</b><span>The PostgreSQL <em>checkpoint</em> is the durable truth; restoration uses an <em>idempotent floor</em> = max(current, checkpoint), not INCRBY.</span>`);
  t(`ÇözdüVeri kaybında müşteri bedava kota kazanmaz; çift-geri-yükleme değeri şişirmez.`,
    `<b>Solved</b><span>Data loss never earns the customer free quota, and a double restore never inflates the value.</span>`);
  t(`geri yükleme = max(mevcut, 30) · ×6 → yine 30`,
    `restore = <b>max(current, 30)</b> · ×6 → still <span class="td2-ckres">30</span>`);
  t(`Dönemsel kota · oto-sıfırlama`,
    `Periodic quota · auto-reset`);
  t(`anahtar :20260724`,
    `key :20260724`);
  t(`NeGünlük yenilenen kota tanımlandı; gün değişince sayaç sıfırlanmalı.`,
    `<b>What</b><span>A daily renewing quota was defined; the counter must reset when the day rolls over.</span>`);
  t(`NedenDönem-dilimli anahtar: sıfırlamayı zamanlanmış iş değil, anahtar tasarımı yapar. Gün dönümünde anahtar değişir, yeni anahtar 0'dan başlar.`,
    `<b>Why</b><span>A <em>period-sliced key</em>: the reset is done by <em>key design</em>, not by a scheduled job. At midnight the key changes and the new key starts from 0.</span>`);
  t(`ÇözdüGün/hafta/ay başında tüketim ekstra kod ve yarış olmadan sıfırlanır; eski anahtar TTL ile silinir.`,
    `<b>Solved</b><span>At the start of a day/week/month consumption resets <em>with no extra code and no race</em>; the old key is removed by TTL.</span>`);
  t(`tüketim 0/2000:00 · yeni dönem`,
    `<span class="td2-perval">consumption <b class="td2-pernum">0</b>/20</span><span class="td2-pertick"><svg><use href="#i-clock"/></svg>00:00 · new period</span>`);
  t(`Yük testi · gerçek darboğaz`,
    `Load test · the real bottleneck`);
  t(`Nek6 ile 1081 rps sürdürüldü; isteklerin %19'u 503 aldı.`,
    `<b>What</b><span>1081 rps was sustained with k6; 19% of requests got a 503.</span>`);
  t(`Neden"Çalışıyor" demek yetmez, ölçtük: suçlu Redis değildi (~23µs), gateway JVM'inin GC duraklamasıydı. G1GC ayarıyla düzeldi.`,
    `<b>Why</b><span>Saying "it works" is not enough — we <em>measured</em>: the culprit was not Redis (~23µs) but the gateway JVM's <em>GC pause</em>. Tuning G1GC fixed it.</span>`);
  t(`ÇözdüGC 231ms → 14ms; 5xx 125.100 → 0. Hata JVM'deydi, tasarımda değil.`,
    `<b>Solved</b><span>GC 231 ms → 14 ms; 5xx 125,100 → 0. The fault was in the JVM, not the design.</span>`);
  t(`231msönce`,
    `<span class="td2-gch"></span><em class="td2-gcv">231ms</em><small>before</small>`);
  t(`6 · Kanıt · Teknoloji seçimi`,
    `6 · Proof · Technology choices`);
  t(`Neyi neden kullandık?`,
    `What did we use, and why?`);
  t(`Her parça tek bir işi en iyi yaptığı için burada. Bir teknolojiye tıklayın — ne olduğunu, neden seçtiğimizi, neyi çözdüğünü ve bu uygulamada tam olarak nerede çalıştığını canlı bir mini animasyonla açalım.`,
    `Each piece is here because it does <b>one job</b> best. Click a technology and we will open <b>what it is, why we chose it, what it solves and exactly where it runs in this implementation</b> — with a live mini animation.`);
  t(`RedisKarar verir · µs Karar`,
    `<span class="wt2-chip-ico"><svg><use href="#i-db"/></svg></span> <span class="wt2-chip-txt"><b>Redis</b><i>Decides · µs</i></span> <span class="wt2-chip-role">Decision</span>`);
  t(`PostgreSQLHatırlar · ACID Gerçek`,
    `<span class="wt2-chip-ico"><svg><use href="#i-layers"/></svg></span> <span class="wt2-chip-txt"><b>PostgreSQL</b><i>Remembers · ACID</i></span> <span class="wt2-chip-role">Truth</span>`);
  t(`Kafka + DebeziumDuyurur · ~35 ms Yayılım`,
    `<span class="wt2-chip-ico"><svg><use href="#i-stream"/></svg></span> <span class="wt2-chip-txt"><b>Kafka + Debezium</b><i>Announces · ~35 ms</i></span> <span class="wt2-chip-role">Propagation</span>`);
  t(`Elasticsearch + KibanaAçıklar · analitik Analitik`,
    `<span class="wt2-chip-ico"><svg><use href="#i-search"/></svg></span> <span class="wt2-chip-txt"><b>Elasticsearch + Kibana</b><i>Explains · analytics</i></span> <span class="wt2-chip-role">Analytics</span>`);
  t(`Prometheus + GrafanaNabız tutar · p99 Nabız`,
    `<span class="wt2-chip-ico"><svg><use href="#i-gauge"/></svg></span> <span class="wt2-chip-txt"><b>Prometheus + Grafana</b><i>Takes the pulse · p99</i></span> <span class="wt2-chip-role">Pulse</span>`);
  t(`Spring Cloud GatewayUygular · tek nokta Uygulayıcı`,
    `<span class="wt2-chip-ico"><svg><use href="#i-shield"/></svg></span> <span class="wt2-chip-txt"><b>Spring Cloud Gateway</b><i>Enforces · single point</i></span> <span class="wt2-chip-role">Enforcer</span>`);
  t(`Karar`,
    `Decision`);
  t(`Tek cümlede: Redis karar verir, PostgreSQL hatırlar, Kafka duyurur, Elasticsearch açıklar, Prometheus nabız tutar, Gateway uygular. Altı parça, altı ayrı iş — hiçbiri diğerinin işini yapmaz.`,
    `<b>In one sentence:</b> <span class="wt2-s-redis">Redis decides</span>, <span class="wt2-s-pg">PostgreSQL remembers</span>, <span class="wt2-s-kafka">Kafka announces</span>, <span class="wt2-s-es">Elasticsearch explains</span>, <span class="wt2-s-prom">Prometheus takes the pulse</span>, <span class="wt2-s-gw">the Gateway enforces</span>. Six pieces, six separate jobs — none of them does another's work.`);
  t(`Özet · Öğrenme Yolculuğu`,
    `Recap · The Learning Journey`);
  t(`Bu sunumda kavramsal olarak nerelerden geçtik?`,
    `Where did we travel <span class="grad-text">conceptually</span> in this deck?`);
  t(`Ürünü bir yana bırakıp yolculuğa kavram düzeyinde bakalım: bir problemden yola çıkıp, algoritmadan atomikliğe, dağıtık mimariden ürün davranışına altı durakta hangi teorik konuları işledik.`,
    `Setting the product aside, let's look at the journey <b>at the concept level</b>: starting from a problem and moving through algorithms, atomicity, distributed architecture and product behaviour — which theoretical topics we covered at each of the six stops.`);
  t(`Problem & Kavramlar`,
    `Problem &amp; Concepts`);
  t(`Neden hız sınırlama ve kotaya ihtiyaç var; birbirine benzeyip aslında ayrışan iki eksen ve bir kuralın anatomisi.`,
    `Why rate limiting and quotas are needed; the <b>two axes</b> that look alike but genuinely differ, and the anatomy of a rule.`);
  t(`hız limiti ↔ kotasubjectscopepenceremaliyetcounterKey`,
    `<span class="sm2-tag">rate limit ↔ quota</span><span class="sm2-tag">subject</span><span class="sm2-tag">scope</span><span class="sm2-tag">window</span><span class="sm2-tag">cost</span><span class="sm2-tag">counterKey</span>`);
  t(`Algoritmalar`,
    `Algorithms`);
  t(`Sayaç ailesi ve her birinin doğru kullanım anı — klasik sınır tuzağından pürüzsüz kadansa.`,
    `The counter family and <b>when each one is the right choice</b> — from the classic boundary trap to a smooth cadence.`);
  t(`Atomiklik & Anahtar`,
    `Atomicity &amp; the Key`);
  t(`Yarış koşulunu tek atomik adımda çözmek ve sayacın kimliğini —kuralın değil— tasarlamak.`,
    `Solving the race condition <b>in a single atomic step</b>, and designing the identity of the counter — not of the rule.`);
  t(`race conditiontek atomik Luaanahtar anatomisidönem-dilimli anahtar`,
    `<span class="sm2-tag">race condition</span><span class="sm2-tag">single atomic Lua</span><span class="sm2-tag">key anatomy</span><span class="sm2-tag">period-sliced key</span>`);
  t(`Dağıtık Mimari`,
    `Distributed Architecture`);
  t(`Her bileşene tek bir sorumluluk: karar, kaynak doğruluk, kayıpsız yayılım, analitik ve metrik.`,
    `<b>One responsibility</b> per component: decision, source of truth, lossless propagation, analytics and metrics.`);
  t(`Redis · kararPostgreSQL · doğrulukKafka/Debezium · CDCElasticsearchPrometheus/Grafana`,
    `<span class="sm2-tag">Redis · decision</span><span class="sm2-tag">PostgreSQL · truth</span><span class="sm2-tag">Kafka/Debezium · CDC</span><span class="sm2-tag">Elasticsearch</span><span class="sm2-tag">Prometheus/Grafana</span>`);
  t(`Ürün Davranışı`,
    `Product Behaviour`);
  t(`Kotanın ticari yüzü ve arıza anındaki duruşu — güven, tutarlılık ve doğru anda haber verme.`,
    `The commercial face of quota and its <b>posture during failure</b> — trust, consistency and telling you at the right moment.`);
  t(`overdraft cüzdanön ödemeli ↔ yenilenenfail-open/closed/degradedcheckpoint uzlaşmasıidempotencyeşik olayları`,
    `<span class="sm2-tag">overdraft wallet</span><span class="sm2-tag">prepaid ↔ renewing</span><span class="sm2-tag">fail-open/closed/degraded</span><span class="sm2-tag">checkpoint reconciliation</span><span class="sm2-tag">idempotency</span><span class="sm2-tag">threshold events</span>`);
  t(`Kanıt & Yöntem`,
    `Proof &amp; Method`);
  t(`Kavramların lafta kalmadığı yer: gerçek testler, canlı ölçümler ve elle denenebilir demolarla doğrulama.`,
    `Where the concepts stop being <b>just talk</b>: validation through real tests, live measurements and hands-on demos.`);
  t(`gerçek testlercanlı ölçümdenenebilir demolar`,
    `<span class="sm2-tag">real tests</span><span class="sm2-tag">live measurement</span><span class="sm2-tag">hands-on demos</span>`);
  t(`Tek cümlede ne öğrendik: Bir kuralı beş kavrama indirgeyip (kime · nerede · ne kadar sürede · ne kadar), doğru algoritmayla ve tek atomik adımda uygulayıp; her dağıtık bileşene tek bir iş vererek — sistemi koruyan hız limitini ve geliri taşıyan kotayı aynı motorda hızlı, doğru ve dayanıklı biçimde yönetmeyi.`,
    `<b>What we learned, in one sentence:</b> reduce a rule to five concepts (<b>for whom · where · in what window · how much</b>), enforce it with the right algorithm <b>in a single atomic step</b>, and give each distributed component exactly one job — and you can govern both the <b>rate limit</b> that protects the system and the <b>quota</b> that carries the revenue in the same engine: fast, correct and resilient.`);
  t(`10 / 10 token`,
    `10 / 10 tokens`);
  t(`7,1 ms`,
    `7.1 ms`);
  t(`p50: 0,21 ms`,
    `p50: 0.21 ms`);
  t(`Tüm slaytlar`,
    `All slides`);
  t(`Başa dön`,
    `Back to start`);
  t(`Başa dön (Home)`,
    `Back to start (Home)`);
  t(`Tüm slaytlar (O)`,
    `All slides (O)`);
  t(`Önceki`,
    `Previous`);
  t(`Sonraki`,
    `Next`);
  t(`Kapat`,
    `Close`);
  t(`Kapat`,
    `<svg><use href="#i-x"/></svg> Close`);
  t(`←→ gezin · O tüm slaytlar · Home başa dön · F tam ekran · R tekrar`,
    `<kbd>←</kbd><kbd>→</kbd> navigate · <kbd>O</kbd> all slides · <kbd>Home</kbd> back to start · <kbd>F</kbd> fullscreen · <kbd>R</kbd> replay`);

  t(`Çözüm`,
    `Solution`);
  t(`Sorun`,
    `Problem`);
  t(`Vaka Çalışması · Problem ve Çözüm`,
    `Case Study · Problem and Solution`);
  t(`İzin ver`,
    `Allow`);
  t(`Limit/Kota → kes`,
    `Limit/Quota → cut off`);
  t(`Sıcak yol · her istekte`,
    `Hot path · on every request`);
  t(`Gateway filtresi`,
    `Gateway filter`);
  t(`200 · geç`,
    `200 · pass`);
  t(`Arka plan · isteği bloklamaz`,
    `Background · never blocks the request`);
  t(`Başlangıç · İş Gerekçesi`,
    `Introduction · Business Case`);
  t(`Hız limiti`,
    `Rate limit`);
  t(`Kota / cüzdan`,
    `Quota / wallet`);
  t(`Kapıda kesme`,
    `Cut off at the gate`);
  t(`Yol haritası`,
    `Roadmap`);
  t(`Altı durakta ilerleyeceğiz. Her durak, bir öncekinin üzerine inşa edilir.`,
    `We will move through six stops. Each one builds on the last.`);
  t(`İstemci her serviste farklı 429 görüyor`,
    `The client sees a different 429 from every service`);
  t(`10 pod → limit 10 katına çıkıyor`,
    `10 pods → the limit becomes 10×`);
  t(`1 müşteri → tüm kapasite, herkes yavaş`,
    `1 customer → the whole capacity, everyone slows down`);
  t(`Tüketim sayılmıyor → faturalanamıyor`,
    `Consumption is not counted → it cannot be billed`);
  t(`Kapasite planı tahmine dayanıyor`,
    `Capacity planning runs on guesswork`);
  t(`Değişiklik süresi ~2 gün, olayda geç`,
    `A change takes ~2 days — too late during an incident`);
  t(`İstemci`,
    `Client`);
  t(`Redis · atomik sayaç`,
    `Redis · atomic counter`);
  t(`Eşik bildirimleri`,
    `Threshold notifications`);
  t(`kullandık`,
    `we used`);
  t(`Peki gerçekte biz ne seçtik — neden?`,
    `So what did we actually choose — and why?`);
  t(`Pencere 1 sonuna gönder`,
    `Send to the end of window 1`);
  t(`Pencere 2 başına gönder`,
    `Send to the start of window 2`);
  t(`Tuzağı oynat`,
    `Play the trap`);
  t(`Sıfırla`,
    `Reset`);
  t(`Yol seçimi`,
    `Choose a path`);
  t(`A ve B'yi aynı anda gönder`,
    `Send A and B at the same time`);
  t(`Naif: GET → kontrol → SET (3 ayrı adım)`,
    `Naive: GET → check → SET (3 separate steps)`);
  t(`Atomik: tek Lua çağrısı (bölünmez)`,
    `Atomic: a single Lua call (indivisible)`);
  t(`Örnek anahtar`,
    `Example key`);
  t(`Aylık kota`,
    `Monthly quota`);
  t(`Cüzdan (süresiz)`,
    `Wallet (no expiry)`);
  t(`Hız limiti (GCRA)`,
    `Rate limit (GCRA)`);
  t(`Lua · bölünmez blok`,
    `Lua · indivisible block`);
  t(`· sıra korunur`,
    `· ordering preserved`);
  t(`örnek kullanım olayı belgesi`,
    `a sample usage-event document`);
  t(`En çok reddedilen endpoint (top-5 · terms agg)`,
    `Most-rejected endpoints (top 5 · terms agg)`);
  t(`eşik %10`,
    `threshold 10%`);
  t(`ALARM · red oranı > %10`,
    `ALERT · deny ratio &gt; 10%`);
  t(`Kardinalite patlaması —`,
    `Cardinality explosion —`);
  t(`İstek gönder (200 birim)`,
    `Send a request (200 units)`);
  t(`Kota yükle (+1000)`,
    `Top up quota (+1000)`);
  t(`Bakiye pozitifti; iş tamamlanır.`,
    `The balance was positive; the work completes.`);
  t(`· EKSİDE`,
    `· NEGATIVE`);
  t(`Sonraki her istek kesilir.`,
    `Every subsequent request is cut off.`);
  t(`Erişim açılır, geçmiş tüketim silinmez.`,
    `Access reopens; past consumption is not erased.`);
  t(`Günlük`,
    `Daily`);
  t(`Haftalık`,
    `Weekly`);
  t(`Aylık`,
    `Monthly`);
  t(`Dönemi ilerlet`,
    `Advance period`);
  t(`Redis'i çökert`,
    `Crash Redis`);
  t(`Uzlaşmayı çalıştır`,
    `Run reconciliation`);
  t(`Redis · canlı sayaç`,
    `Redis · live counter`);
  t(`geri yükleme çağrısı — hepsi aynı checkpoint tabanını (30) yazıyor`,
    `restore calls — all of them write the same checkpoint floor (30)`);
  t(`İki tehlike, iki doğru cevap`,
    `Two dangers, two correct answers`);
  t(`Geri yükleme neden`,
    `Why restoration is`);
  t(`50 eş zamanlı YÜKLE`,
    `50 concurrent TOP-UPs`);
  t(`Çift tıkla (retry)`,
    `Double click (retry)`);
  t(`Kendi token'ınla eriş`,
    `Access with your own token`);
  t(`ile başkasını dene`,
    `try someone else with`);
  t(`DB'ye minimum gidiş — N+1 çözümü`,
    `Minimum round trips to the DB — the N+1 fix`);
  t(`İstek Gönder`,
    `Send a request`);
  t(`15 İstek — otomatik`,
    `15 requests — automatic`);
  t(`Son yanıt`,
    `Last response`);
  t(`Kota senaryosu seç`,
    `Pick a quota scenario`);
  t(`Eksiye düşme`,
    `Going negative`);
  t(`Haftalık yenilenme`,
    `Weekly renewal`);
  t(`Çoklu servis maliyeti`,
    `Multi-service cost`);
  t(`İdempotent yükleme`,
    `Idempotent top-up`);
  t(`Başarısız çağrı iadesi`,
    `Refund for a failed call`);
  t(`Sonraki adım`,
    `Next step`);
  t(`Baştan`,
    `Restart`);
  t(`Adım adım detay`,
    `Step-by-step detail`);
  t(`Olay & bildirim akışı`,
    `Event &amp; notification flow`);
  t(`Ölçülen bir darboğaz ve çözümü`,
    `A measured bottleneck and its fix`);
  t(`Testleri çalıştır`,
    `Run the tests`);
  t(`Kanıt: 500 eş zamanlı → tam`,
    `Proof: 500 concurrent → exactly`);
  t(`geçti, ne bir eksik ne fazla`,
    `passed — not one more, not one less`);
  t(`İki istek → tek Lua → sıralı karar`,
    `Two requests → one Lua → serialised decision`);
  t(`Kanıt: 200 OK +`,
    `Proof: 200 OK +`);
  t(`, ardından 429`,
    `, then 429`);
  t(`Cüzdan 100 → 200'lük istek → -100 → kilit`,
    `Wallet 100 → a 200-unit request → −100 → locked`);
  t(`Kanıt: 50 eş zamanlı istekte tam`,
    `Proof: across 50 concurrent requests exactly`);
  t(`yükleme sahiplendi`,
    `top-up won`);
  t(`Kanıt: 6 çağrı → yine`,
    `Proof: 6 calls → still`);
  t(`Redis çöker → PG checkpoint tabanı geri yükler`,
    `Redis crashes → the PG checkpoint floor restores it`);
  t(`Kanıt: yeni gün → yeni anahtar doğdu, tüketim`,
    `Proof: a new day → a new key was born, consumption`);
  t(`'landı`,
    `reset`);
  t(`Gün dönümü → anahtar döner → sayaç 0`,
    `Midnight → the key rolls over → counter 0`);
  t(`Kanıt: p99`,
    `Proof: p99`);
  t(`· 1081 rps sürdürüldü`,
    `· 1081 rps sustained`);
  t(`GC duraklaması 231→14 ms · 5xx → 0`,
    `GC pause 231→14 ms · 5xx → 0`);

  window.DECK_EN = D;
})();
