# AI Sunum Stüdyosu

> **Konuyu ver, profesyonel sunumu hazır al.**
> AI içeriği ve akışı üretir; tasarımı Slide Engine üretir. Bu ayrım ürünün temelidir.

## Akış

```
Konu / PDF / DOCX
        │
        ▼
  Metin çıkarma  (tarayıcıda — lib/sunum/extract.ts, lib/ats/parse yeniden kullanılır)
        │
        ▼
  Seyreltme       (lib/sunum/chunk.ts → condense)
        │
        ▼
  TEK yapısal AI çağrısı  (lib/sunum/ai/ollama.ts, JSON Schema ile kısıtlı)
        │  ↳ AKIŞ: slaytlar yazıldıkça yayımlanır (ai/stream.ts) → üretim ekranı
        ▼
  Normalize      (lib/sunum/ai/normalize.ts → sıkı `Presentation` modeli)
        │
        ▼
  Kalite denetimi (lib/sunum/decide/* — ölçüm + Jev ya da yerel sezgi)
        │
        ├──────────────────────────┐
        ▼                          ▼
  React renderer             PPTX renderer
  components/sunum/          lib/sunum/export/pptx.ts
        │                          │
        ├── ekran / editör         └── .pptx
        └── yazdırma → PDF
```

Aynı `Presentation` JSON'u üç tüketicinin de tek kaynağıdır; PDF ve PPTX için ayrı
içerik üretilmez.

## İki AI katmanı, iki farklı iş

| | Üretim | Karar |
|---|---|---|
| **Ne yapar** | İçerik ve akış yazar | Tipli karar verir (seçim / puan / evet-hayır) |
| **Motor** | Ollama + açık ağırlıklı model | Jev (TypeSafe AI) → Vercel AI Gateway → yerel sezgi |
| **Nerede** | `lib/sunum/ai/` | `lib/sunum/decide/` |
| **Zorunlu mu** | Hayır — yoksa `outline.ts` taslak çıkarır | Hayır — yoksa `decide/local.ts` devreye girer |

**Jev metin üretmez.** "System One" modeli olarak yalnızca `choice` / `score` /
`noul` döndürür ve bir çağrıda onlarca soruyu paralel yanıtlar (70–500 ms). Bu
yüzden sunumu ÜRETMEZ; sunumu DENETLER:

* **görsel niyet (§12)** — bu içeriğin doğal biçimi grafik mi, süreç mi, alıntı mı?
* **yoğunluk** — bu slayt arka sıradan okunur mu?
* **netlik** — başlık ve ana mesaj bu hedef kitle için ne kadar net?

Ölçülebilir her şey (karakter sayısı, madde sayısı, kontrast oranı, şablon
tekrarı) modele hiç sorulmaz; deterministik olarak hesaplanır.

> **Gizlilik:** Jev açıkken slayt METNİ harici bir servise gider. Bu yüzden
> arayüzde varsayılan KAPALIDIR ve açıklaması bunu net söyler. Anahtar yalnızca
> sunucuda durur (`/api/decide` proxy'si), tarayıcıya hiçbir koşulda gitmez.

## Dosya haritası

| Yol | Sorumluluk |
|---|---|
| `types.ts` | Alan modeli (`Presentation`, `Slide` ayrık birleşimi) |
| `schema.ts` | Zod şemaları, uzunluk sınırları, Ollama'ya verilen JSON Schema |
| `themes.ts` | 12 tema + doğrulanmış grafik paleti (React ve PPTX ortak) |
| `templates.ts` | Şablon kayıtları, boş slayt üretimi, tip dönüşümü |
| `chunk.ts` | Metin temizleme, chunk'lama, bütçeye seyreltme |
| `outline.ts` | AI'sız deterministik taslak (yedek yol) |
| `store.ts` | `PresentationRepository` + localStorage gerçekleştirimi |
| `extract.ts` | PDF/DOCX → metin (tarayıcıda) |
| `api-guard.ts` | Aynı köken, opsiyonel anahtar, hız sınırı, gövde sınırı |
| `ai/provider.ts` | `AiProvider` arayüzü, timeout/retry/önbellek |
| `ai/ollama.ts` | Ollama gerçekleştirimi (yapısal çıktı) |
| `ai/prompts.ts` | İstem metinleri (TR/EN) |
| `ai/normalize.ts` | Gevşek AI çıktısı → sıkı model (güven sınırı) |
| `ai/client.ts` | Tarayıcı taşıyıcısı: sunucu ↔ doğrudan ↔ yerel taslak |
| `ai/server.ts` | Sunucu tarafı tek örnek sağlayıcı |
| `ai/providers.ts` | Sağlayıcı kataloğu (anahtarsız / yerel / kendi anahtarın) |
| `ai/connection.ts` | Bağlantı tercihi ve OTOMATİK BAĞLANMA |
| `ai/openai-chat.ts` | OpenAI uyumlu istemci (katalogdaki her uzak sağlayıcı) |
| `ai/catalog-client.ts` | Canlı model listesi |
| `ai/models.ts` | Yerel model kataloğu, sıralama ve otomatik seçim |
| `coach.ts` | Sunum koçu: hazırlık denetimi, süre planı, istek takibi |
| `ai/stream.ts` | Akıştan tamamlanmış slaytları çıkarma, SSE okuma, kesilen JSON onarımı |
| `components/sunum/SunumGlyph.tsx` | 30 satır içi SVG simge (harici ikon paketi yok) |
| `ai/install.ts` | Platform tanıma, Ollama kurulum tarifleri, servis yoklama, model çekme |
| `transform.ts` | Slayt dönüşümleri (maddeler → grafik / süreç / istatistik, bölme) |
| `draft.ts` | Açılış ekranı → sihirbaz niyet devri |
| `decide/types.ts` | Karar modeli (Jev tel formatıyla birebir) |
| `decide/jev.ts` | Jev gerçekleştirimi (yalnızca sunucu) |
| `decide/local.ts` | Aynı soruları yanıtlayan yerel sezgi motoru |
| `decide/questions.ts` | Soru seti ve yanıt okuma |
| `decide/quality.ts` | Bulgular, puan ve otomatik düzeltmeler |
| `ai/deep.ts` | Çok geçişli üretim: plan → slayt başına genişletme, hız ayarı |
| `retrieve.ts` | Kaynak dokümandan slayt başına ilgili bölümü seçer (deterministik) |
| `decide/gateway.ts` | Jev yoksa aynı kararları üreten gateway motoru |
| `decide/client.ts` | Tarayıcı tarafı: yerel varsayılan, Jev opsiyonel |
| `export/pptx.ts` | PptxGenJS çıktısı |
| `export/browser.ts` | İndirme ve yazdırma yardımcıları |
| `ui-text.ts` | Arayüz metinleri (TR/EN) |

Arayüz: `components/sunum/**`, sayfalar: `app/sunum/**`, API: `app/api/{ai,presentation}/**`.

## Bağlantı — kurulum gerekmez

**Uygulama ilk açılışta bir modele BAĞLI gelir.** Kullanıcıdan kurulum, kayıt ya
da API anahtarı istenmez. Karar sırası (`ai/connection.ts` → `resolveConnection`):

1. Kayıtlı bir tercih varsa o kullanılır — kullanıcının seçimi her zaman kazanır.
2. Yoksa yerel Ollama kısaca yoklanır (1.2 sn). Kuruluysa seçilir: ücretsiz,
   sınırsız ve veri cihazdan çıkmaz.
3. Ollama yoksa anahtarsız ücretsiz sağlayıcıya bağlanılır.

Seçim kalıcı olarak kaydedilir; ikinci açılışta yeniden yoklama yapılmaz.

### Sağlayıcı kataloğu (`ai/providers.ts`)

| Sınıf | Sağlayıcı | Anahtar | Gizlilik | Not |
|---|---|---|---|---|
| `keyless` | **Pollinations · GPT-OSS 20B** | gerekmez | sağlayıcıya gider | Varsayılan. Kurulumsuz. |
| `local` | **Ollama** | gerekmez | cihazda kalır | Kuruluysa otomatik tercih edilir |
| `byok`* | **Vercel AI Gateway** | sunucuda (`AI_GATEWAY_API_KEY`) | sağlayıcıya gider | Tek anahtarla 390+ model. Anahtar sunucudaysa kullanıcı hiçbir şey girmez. |
| `byok` | OpenRouter | ücretsiz anahtar | sağlayıcıya gider | `:free` modeller (Qwen dâhil) ücretsiz |
| `byok` | Groq | ücretsiz anahtar | sağlayıcıya gider | Çok hızlı |
| `byok` | Cerebras | ücretsiz anahtar | sağlayıcıya gider | Qwen 3, Llama 3.3 |
| `byok` | Hugging Face | ücretsiz anahtar | sağlayıcıya gider | 130+ açık ağırlıklı model |
| `byok` | Chutes | ücretsiz katman | sağlayıcıya gider | Qwen 3, DeepSeek, GLM, Kimi |
| `byok` | Google Gemini | ücretsiz anahtar | sağlayıcıya gider | OpenAI uyumlu ucu kullanılır |
| `byok` | Mistral | ücretsiz anahtar | sağlayıcıya gider | Açık ağırlıklı Mistral modelleri |
| `byok` | Together AI | ücretsiz kota | sağlayıcıya gider | Qwen / Llama / DeepSeek |
| `byok` | NVIDIA NIM | ücretsiz anahtar | sağlayıcıya gider | En geniş açık ağırlıklı katalog |
| `byok` | DeepSeek | ücretli anahtar | sağlayıcıya gider | Çok ucuz, uzun bağlam |
| `byok` | OpenAI | ücretli anahtar | sağlayıcıya gider | — |
| `byok` | Özel | isteğe bağlı | sağlayıcıya gider | OpenAI uyumlu her adres |

\* Gateway tek istisnadır: sunucuda `AI_GATEWAY_API_KEY` varsa istek **sunucudan**
gider (`transportFor` → `server`, `isServerAllowed` → `true`) ve kullanıcının
tarayıcısına anahtar girmesi gerekmez. Kullanıcı kendi anahtarını girerse doğrudan
tarayıcıdan çağrılır. Ücretsiz katmanların kesilme/kota sorunu en kolay buradan
çözülüyor: anahtarı almak için Vercel panelinde `~/connect` sayfasından AI Gateway
bağlanır, üretilen değer proje ortam değişkenine yazılır.

### Kurulum sihirbazı (`ai/install.ts` + `ModelInstaller.tsx`)

"ollama pull qwen3:8b" komutu, terminale aşina olmayan kullanıcı için bir duvar.
Sihirbaz bu duvarı üçe bölüp ikisini tamamen otomatikleştiriyor:

| Adım | Otomasyon |
|---|---|
| **1. Ollama kurulumu** | Tarayıcıdan program kurulamaz — bu bir sandbox sınırı. Yapılan: işletim sistemi tanınır (`detectPlatform`) ve **indirme düğmesi** verilir; kullanıcı normal bir kurulum sihirbazı çalıştırır. Terminal komutu yalnızca isteyene, ikincil seçenek olarak duruyor. |
| **2. Servisi başlatma** | **Otomatik, düğmeyle.** `POST /api/ai/local/serve` süreci SUNUCUDAN başlatır. Tarayıcı bir programı çalıştıramaz ama bu uygulamanın sunucusu kullanıcının kendi makinesinde koştuğu için `ollama serve`i o başlatabiliyor. Terminal komutu yalnızca sunucu yolu kullanılamadığında (uzak barındırma) son çare olarak açılır. |
| **3. Model indirme** | **Tamamen otomatik.** `POST /api/pull` akışı ayrıştırılıp GERÇEK bayt ilerlemesiyle çubuk çizilir, iptal edilebilir, bitince model seçilir. |

### CORS: sihirbazın sessiz düşmanı

Tarayıcıdan `localhost:11434`e yapılan istek Ollama'nın CORS kısıtına takılıyor ve
ancak `OLLAMA_ORIGINS` ayarlıysa çalışıyor. Bu, sihirbazı üç ayrı yerden
vuruyordu ve hepsinin belirtisi aynıydı: **kurulum bittiği anda ekran otomatik
koldan terminal koluna geri düşüyor.**

Üçü de aynı desenle çözüldü — önce doğrudan yol, başarısızsa BU SİTENİN SUNUCUSU
(sunucuda CORS yoktur, yeni uç: `/api/ai/local`):

| Nerede | Belirti |
|---|---|
| `ai/client.ts` → `probeAi` | Sağlık kontrolü başarısız → panel servisi "kapalı" sanıyor → sihirbaz terminal koluna düşüyor |
| `ai/catalog-client.ts` → `ollamaModels` | Model listesi boş → "Model listesi alınamadı" |
| `ai/install.ts` → `pullModel` | İndirme hiç başlamıyor, "Ollama'ya ulaşılamadı" |
| `ai/install.ts` → `waitForOllama` | "Kurdum, kontrol et" hiç ilerlemiyor |
| `ai/client.ts` → `transportOrder` | Model kurulsa bile ÜRETİM yapılamıyor |

Yerel sağlayıcı artık `isServerAllowed` tarafından da kabul ediliyor ve taşıyıcı
sırası `['direct', 'server']` — yani model kurulduktan sonra ÜRETİM de sunucu
üzerinden sürebiliyor. Sunucu tarafında yerel sağlayıcı OpenAI uyumlu istemciyle
değil, Ollama gerçekleştirimiyle kurulur (`ai/server.ts`); adres yine istemciden
değil `OLLAMA_BASE_URL`den gelir. Kendi anahtarını taşıyan sağlayıcılarda böyle
bir yedek YOKTUR — anahtar bu sitenin sunucusuna hiçbir koşulda gönderilmez.

`/api/ai/local` istemciden ADRES almaz: hedef sunucunun kendi `OLLAMA_BASE_URL`
değeridir, istemciden yalnızca biçim denetiminden geçen model adı gelir. İndirme
yanıtı NDJSON olarak olduğu gibi geçirilir, böylece ilerleme gerçek bayt
sayısıyla akmaya devam eder.

Ölçüldü (CORS izni OLMAYAN bir Ollama ile): tarayıcının ön kontrolü (`OPTIONS`)
engelleniyor, ~20 ms sonra sunucu üzerinden `POST /api/pull` gidiyor, akış
tamamlanıyor, kurulu model listesi tazeleniyor ve bağlantı o modele geçiyor.
Ekran otomatik kolda kalıyor, "Ollama'ya ulaşılamadı" hatası çıkmıyor.

### Giriş noktası

Sihirbazın giriş noktası SEÇİLİ SAĞLAYICIDAN BAĞIMSIZDIR. Bir süre yalnızca
Ollama seçiliyken görünüyordu ve varsayılan sağlayıcı anahtarsız uzak servise
çevrilince pratikte hiç ortaya çıkmadı: Ollama'sı olmayan kullanıcı tam da o
sihirbazı arıyor ama ona ulaşmak için önce sağlayıcıyı elle değiştirmesi
gerekiyordu. Sihirbaz açılırken taslak sağlayıcı yerele çevrilir; böylece panelin model
listesi ve çevrimiçi durumu Ollama'yı anlatır ve sihirbaz tek bir kod yolundan
çalışır. Kaydetmez — kullanıcı vazgeçerse eski seçimi yerinde kalır.

Ayrıca `waitForOllama` servisi arka planda yoklar: kullanıcı başka bir pencerede
kurulumu yaparken sayfa açık kalır ve servis göründüğü an akış **kendiliğinden**
devam eder — "tamam" demeye gerek yok. Yerel sağlayıcı seçiliyken servise
ulaşılamıyorsa sihirbaz kendiliğinden açılır.

Hata kutusu KENDİ başlatma düğmesini taşır. Önce yalnızca metin vardı ve
"aşağıdaki başlat düğmesini dene" diyordu; oysa o düğme yalnızca "Ollama
bulunamadı" kolunda basılıyordu. Servis ayakta sanılıp indirme başarısız
olduğunda kullanıcı OLMAYAN bir düğmeye yönlendiriliyordu.

Her iki uç da birden fazla loopback adresi dener (`127.0.0.1`, `localhost`,
`[::1]`): Ollama makineye göre IPv4'e ya da IPv6'ya bağlanabiliyor ve yalnızca
birine bakmak "ulaşılamadı" hatası üretiyordu. Kullanıcı `OLLAMA_BASE_URL`
verdiyse yalnızca o denenir.

`/api/ai/local/serve` sınırları: komut SABİT (`ollama serve`), istemciden hiçbir
argüman alınmaz; yalnızca hedef adres loopback olduğunda çalışır; süreç
`detached` başlatılıp `unref` edilir. Barındırılan bir dağıtımda `ollama` ikilisi
yoktur ve durum "kurulu değil" olarak raporlanıp arayüz 1. adıma yönlendirir.

`OLLAMA_ORIGINS` adımı KALDIRILDI: istekler artık sunucu üzerinden de
geçebildiği için tarayıcı CORS izni zorunlu değil.

Yüzde hesabı EN BÜYÜK katmanın ilerlemesine bakar (model boyutunun neredeyse
tamamı ağırlık dosyasıdır); böylece küçük katmanlar çubuğu geri götürmez.

Model listesi mümkün olduğunda **canlı** çekilir (`ai/catalog-client.ts`);
OpenRouter'da ücretsiz modeller başa alınır ve "yalnızca ücretsiz" filtresi vardır.

### Anahtar ve yol kuralları

* **Kullanıcının API anahtarı bu sitenin sunucusuna GÖNDERİLMEZ.** `byok` ve
  `local` sağlayıcılar yalnızca tarayıcıdan doğrudan çağrılır; anahtar
  localStorage'da durur ve yalnızca sağlayıcının kendi adresine gider.
* `keyless` sağlayıcılar önce bu sitenin sunucusundan (`/api/ai/*`) çağrılır;
  sunucu ulaşamazsa tarayıcı doğrudan dener (CORS'ları açık).
* Sunucu istemciden yalnızca bir **ön ayar kimliği** kabul eder, taban adres ya da
  anahtar kabul etmez (`isServerAllowed`) — keyfi hedefe istek atılamaz (SSRF).

### Yerel model (en gizli seçenek)

```bash
# 1) Ollama kur:  https://ollama.com
# 2) Bir model çek (katalogdakilerin hepsi ücretsiz ve açık ağırlıklı)
ollama pull qwen3:8b

# 3) Tarayıcıdan bağlanmak için CORS'u aç
OLLAMA_ORIGINS=* ollama serve
```

Kurulu modeller arasından bu iş için en uygunu otomatik seçilir
(`ai/models.ts` → `pickModel`). Sıralama ölçütü sohbet kalitesi değil **yapısal
çıktı başarımı**: şemaya sadık küçük bir model, serbest yazan büyük bir modelden
daha kullanışlı.

### Zayıf sağlayıcılara karşı dayanıklılık

Ücretsiz katmanlar iki şekilde zorlar; ikisi de ele alınır:

* **Şemayı zorlamama.** `response_format` kabul edilir ama uygulanmaz. Bu yüzden
  istem yapıyı kendisi taşır (alan kuralı + biçim örneği), AI şemasında genel
  amaçlı alan adı bırakılmaz (`verdict` → `comparisonVerdict`) ve çıktı
  `normalize.ts` içinde onarılır. Başlıktan ibaret "kabuk" slaytlar elenir.
* **Çıktı kesilmesi.** Anonim katman yanıtı sabit bir token bütçesinde kesiyor.
  İstem o bütçeye göre kısalığa ayarlanır (`compact`), düşünme modeli düşük
  eforda çalıştırılır ve kesilen yanıttan tamamlanmış slaytlar kurtarılır
  (`stream.ts` → `salvageDraft`). 6 slayt yerine 4 slayt gelir; boş ekran gelmez.
  Tek slayt üretiminde deste kurtarması işe yaramaz (kurtarılacak tam slayt yok);
  orada `stream.ts` → `repairTruncatedJson` kesilen nesneyi kapatır. Anahtar/değer
  ayrımı yapan bir durum makinesi yalnızca **tam bir değerin** bittiği yeri
  işaretler, sonra açık parantez yığınını kapatır — kuyruğu regexle kırpmak geçerli
  değerleri de sildiği için bilinçli olarak regex kullanılmaz. Onarılamayan girdi
  `null` döner ve hata olarak raporlanır. İstem ayrıca alan sırasını zorlar
  (`type` → `title` → içerik → `highlight`), böylece kesilen yanıtta bile slaytın
  kimliği sağ kalır; başlık yine yoksa kullanıcının yazdığı yönerge başlık olur.
* **Kota dolması.** HTTP 402/429 "ücretsiz kota doldu" olarak raporlanır; sunum
  yerel taslaktan üretilir ve editörde kullanıcıya ne yapabileceği yazılır.

### Jev (karar katmanı) — isteğe bağlı

```bash
# .env.local
TYPESAFE_API_KEY=...        # 1. tercih: gerçek Jev
AI_GATEWAY_API_KEY=...      # 2. tercih: gateway üzerindeki bir model Jev'i taklit eder
# ikisi de yoksa → yerel sezgi motoru
```

`/api/decide` → `pickEngine()` bu sırayı uygular ve GET yanıtında hangi motorun
açık olduğunu (`source: 'jev' | 'gateway'`) bildirir; arayüz derin analiz kutusunu
buna göre etkinleştirir. `decide/gateway.ts` aynı `choice`/`score`/`noul` karar
modelini `chat/completions` + `json_schema` ile üretir, yani karar katmanının geri
kalanı (sorular, bulgular, otomatik düzeltmeler) değişmeden çalışır. Hiçbiri yoksa
`/api/decide` "kullanılamaz" döner, derin analiz kutusu kapalı ve devre dışı kalır,
kalite kontrolü yerel motorla çalışmaya devam eder.

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Sunucunun bağlanacağı Ollama adresi |
| `SUNUM_AI_MODEL` | `qwen3:8b` | Kullanılacak model |
| `SUNUM_AI_TEMP` | `0.35` | Üretim sıcaklığı |
| `SUNUM_API_TOKEN` | *(boş)* | Tanımlanırsa `/api/ai/*`, `/api/decide` ve export ucu `Authorization: Bearer` ister |
| `AI_GATEWAY_API_KEY` | *(boş)* | Vercel AI Gateway. Tanımlıysa gateway sağlayıcısı sunucudan çalışır ve karar katmanının 2. tercihi olur |
| `AI_GATEWAY_DECISION_MODEL` | `alibaba/qwen-3-32b` | Karar katmanının kullandığı gateway modeli |
| `TYPESAFE_API_KEY` | *(boş)* | Jev karar katmanı. Tanımsızsa `AI_GATEWAY_API_KEY`, o da yoksa yerel sezgi motoru kullanılır |
| `TYPESAFE_MODEL` | `jev-latest` | Jev model kimliği |

### Vercel'de fonksiyon süresi (`maxDuration`)

Her `/api/ai/*` rotası `export const maxDuration = 60` bildirir. Bu değer
**yalnızca Vercel dağıtımında** anlamlıdır; `next dev`, `next start` ve kendi
kendine barındırmada yok sayılır — yani yerel modelle dakikalarca süren bir
üretimi kısaltmaz.

60, **Hobby planının üst sınırıdır**. Daha büyük bir değer derlemeyi durdurur:

```
Builder returned invalid maxDuration value for Serverless Function "api/ai/local".
Serverless Functions must have a maxDuration between 1 and 60 for plan hobby.
```

Pro/Enterprise'da 300'e kadar çıkılabilir. Planı yükselttiysen ilgili rotalardaki
sayıyı büyütmek yeterli; Next.js bu ayarı **sabit sayı** olarak ister, değişken
ya da içe aktarılmış bir sabit kabul etmez, bu yüzden her dosyada ayrı yazılır.

Hobby'de kalırken dikkat edilecek nokta: barındırılan sağlayıcıda tek bir slayt
60 saniyeyi aşarsa Vercel isteği 504 ile keser. Bu durum `http` hatası olarak
yeniden denenebilir sayılır, dolayısıyla üretim boş slayta düşmez — ama çok uzun
desteler için yerel model ya da daha hızlı bir sağlayıcı tercih edilmelidir.

## Kullanıcı beklentileri ve sunum koçu

### Beklentiler (`requirements`)

Sihirbazın 3. adımında kullanıcı sunumdan ne beklediğini KENDİ CÜMLELERİYLE
yazar ("grafiklerle destekle", "her bölümde örnek ver", "kaynakça slaytı ekle").
Hazır rozetler boş sayfa sorununu çözer. Bu metin:

* isteme en sonda eklenir (modeller son talimatı daha güçlü uygular),
* sunumla birlikte saklanır,
* AI önbellek anahtarına girer (farklı beklenti → farklı sunum),
* koç panelinde **satır satır denetlenir**.

### Sunum koçu (`coach.ts`)

Kalite panelinden farkı: orası SLAYTA bakar, burası SUNUMU YAPACAK KİŞİYE.
Tamamen deterministiktir — AI çağrısı yapmaz.

| Ne | Nasıl |
|---|---|
| **İstek denetimi** | Her istek satırı yapısal bir koşula bağlanır: "grafik" → chart slaytı var mı, "kaynakça" → destede o kelime geçiyor mu. Doğrulanamayan istek "elle kontrol et" olarak işaretlenir — asla "karşılandı" sayılmaz. |
| **Tek tıkla düzeltme** | Karşılanmamış istek uygun tipte bir slayta dönüşür. Metin aranarak denetlenen isteklerde eklenen slaytın BAŞLIĞI da tohumlanır (ör. "Kaynakça"), yoksa denetim yine "yok" derdi. |
| **Süre planı** | Slayt başına konuşma süresi (130 kelime/dk + slayt başına 6 sn pay). Konuşmacı notu varsa SÜREYİ O belirler — sunucu slaytı okumaz, notu anlatır. Hedeften %25 sapma uyarı üretir. |
| **Tamamlama istekleri** | Sunan adı, tarih/bağlam, konuşmacı notu, vurgu cümlesi, kapanış slaytı, yer tutucu görsel, düz grafik. |
| **AI ile toplu doldurma** | Eksik konuşmacı notları ve vurgu cümleleri mevcut refine komutlarıyla, SIRAYLA (paralel değil — ücretsiz sağlayıcılar hız sınırına takılıyor), ilerleme göstererek ve iptal edilebilir biçimde yazdırılır. |

## Görsel yoğunluk ve vurgu

* `visual`: `clean` · `modern` · `bold`. Dekoratif katmanları (ışıma, renk lekesi,
  ızgara dokusu) ve sahneleme animasyonunun gücünü ayarlar. **İÇERİĞİ değiştirmez.**
  Dekor `::before`/`::after` ile içeriğin ALTINA çizilir; metin kontrastı düşmez.
* `highlight`: slayttan akılda kalması gereken tek cümle. AI üretir, kullanıcı
  düzenler, şablon onu içerikten ayrı bir vurgu bandında gösterir — PPTX çıktısında da.
* `example`: içeriğin gerçek hayattaki karşılığı. Kendi bandında, içerikten görsel
  olarak ayrı durur; PPTX'te de sol kenarında vurgu çizgisi olan bir blok olur.
* `icon`: başlık rozetindeki konu simgesi (bkz. "Konu simgeleri").

PPTX'te iki bant da slaydın altına sabitlenir ve gövde kutularının yüksekliği
bantlara göre daralır (`export/pptx.ts` → `measureBottom()` → `Ctx.bodyBottom`);
aksi hâlde yoğun bir slaytta metin bandın üstüne biniyordu.

## Görsel slayt kotası

Ücretsiz modellerin doğal eğilimi her slaytı madde listesi yapmaktır; "görsel
olsun" demek yetmiyor. Bu yüzden görsellik istemde **sayısal bir kota** olarak
yazılır (`ai/prompts.ts` → `visualSlideQuota`):

```
kota = max(2, min(6, round((slaytSayısı - 2) / 2)))
```

Kotayla birlikte üç kural gider: hangi tiplerin görsel saydığı (`chart`,
`statistics`, `timeline`, `process`, `architecture`, `comparison`), görsel
slaytlarda `bullets` YAZILMAMASI, ve uydurulmuş kaynak/sayı verilmemesi. Biçim
örneği (`SHAPE_EXAMPLE`) karşılaştırma, zaman çizelgesi ve mimari slaytlarını da
içerir — model bir tipin alanlarını görmediğinde o tipi hiç denemiyor. Ölçülen
etki: 8 slaytlık bir destede görsel slayt sayısı 1–2'den **5**'e çıktı.

Kotanın tutmadığı durumlar için ikinci bir güvenlik ağı var: koç paneli
`visualizableSlides` ile madde listesine sıkışmış slaytları bulur ve
"Slaytları AI ile görselleştir" tek tuşla onları `toChart` / `toTimeline` /
`toStats` / `toComparison` / `toArchitecture` komutlarıyla dönüştürür.

## Hedef kitle artık sorulmuyor

Sihirbazda bir "Hedef Kitle" adımı vardı ve kaldırıldı: aynı konuda seçime göre
belirgin biçimde farklı — ve çoğu zaman daha SIĞ — desteler üretiyordu. "Üst
yönetim" seçilince model teknik ayrıntıyı, "müşteri" seçilince sayıları atıyordu.
Kullanıcının istediği şey hiçbirinde tam çıkmıyordu.

Yerine `professional` kitlesi eklendi ve varsayılan yapıldı; istemdeki karşılığı
"hiçbir ayrıntıyı eleme, terimi kullan ama ilk geçtiğinde tanımla, sayıyı ve
mekanizmayı birlikte ver". Alan KORUNDU: eski desteler kendi kitlesini taşımaya
devam ediyor, slayt başına iyileştirme komutları ve koç paneli onu okuyor.

Sihirbaz böylece 4 adımdan 3'e indi: İçerik · Ayarlar · Tasarım.

## Girdi kaynağı ve AI'nın rolü — kullanıcı seçer

"Metin yapıştırdım ama AI onu yeniden yazdı" ile "dosyamı aynen slayda dönüştür"
bambaşka iki beklenti. Sistem bunu tahmin etmeye çalışırsa ikisinden birini
mutlaka yanlış yapıyor. Bu yüzden `GenerationRequest.sourceMode` sihirbazın ilk
adımında AÇIKÇA seçiliyor (`types.ts` → `SOURCE_MODES`):

| Mod | Girdi | AI |
|---|---|---|
| `topic-ai` | tek cümlelik konu | içeriği baştan sona yazar |
| `text-only` | yapıştırılan metin | **hiç çağrılmaz** |
| `text-ai` | yapıştırılan metin | yeniden düzenler, başlıklandırır, görselleştirir |
| `doc-only` | yüklenen dosya | **hiç çağrılmaz** |
| `doc-ai` | yüklenen dosya | bölüm bölüm çözümleyip yazar |

`usesAi(mode)` false ise `ai/client.ts` bağlantıyı hiç kurmaz ve doğrudan
`buildLocal` çağırır. Dönen sonuçta `usedFallback: false` olur — bu bir yedek yol
değil, İSTENEN yoldur; editörde "AI'ya ulaşılamadı" uyarısı çıkmamalı.

Aynı `buildLocal` AI'ya ulaşılamadığında da kullanılıyor; ayrımı çağıran yapıyor,
çünkü aynı çıktı bir durumda istenen sonuç, diğerinde tesellidir.

### AI'sız yolun kalitesi

Kullanıcı artık bu yolu bilerek seçebildiği için `outline.ts` çıktısı da
denetlendi ve iki gerçek hata bulundu:

* **Sabit satır sarmalı cümleleri parçalıyordu.** Metin satır satır cümleye
  bölündüğü için `"… %13 arttı. Artışın"` satırından `"Artışın"` diye tek
  kelimelik bir parça çıkıyor, büyük harfle başladığı için BAŞLIK sanılıyor ve
  slayda gerçek başlık ("Olumlu bulgular") yerine o yazılıyordu. `unwrapLines`
  sarmalı geri alıyor: bir satır cümle noktalamasıyla bitmiyorsa ve sonraki satır
  küçük harfle başlıyorsa ikisi birleştirilir. Gerçek başlıklar etkilenmez, çünkü
  onları izleyen satır büyük harfle başlar. İkinci savunma: satır İÇİNDE tek
  kelimelik başlık artık kabul edilmiyor.
* **İki "Sonuç" başlığı yan yana düşüyordu.** Çoğu raporun son bölümü zaten bir
  sonuç bölümü; ona bir de kapanış slaytı eklenince başlık tekrar ediyordu. Son
  bölüm kapanışa denk geliyorsa artık DÖNÜŞTÜRÜLÜYOR — başlık tekrar etmiyor,
  kaynağın kendi sonuç cümleleri de kaybolmuyor.

## Üretim derinliği — tek geçiş mi, çok geçiş mi

Ücretsiz sağlayıcıların çıktı bütçesi ≈1500 token. Tek çağrıda üretimde bu bütçe
TÜM desteye bölünüyor: 7 slaytlık bir destede slayt başına ~130 karakter kalıyor.
Kaynak doküman verilse bile aynı tavan geçerli — belgeden gelen ayrıntı bütçeye
sığmıyor. Bu, "sunum yeterince detaylı değil" şikâyetinin tek ve gerçek sebebi.

`GenerationRequest.depth` iki yol sunar (`ai/deep.ts`):

| | `fast` | `deep` (varsayılan) |
|---|---|---|
| Çağrı | 1 | 1 plan + slayt başına 1 |
| Süre | ~30 sn | birkaç dakika |
| Ölçülen içerik | 904 karakter | **2657 karakter** |
| Örnekli slayt | 0 | 4 / 7 |
| Kaynaktan tutan sayı | 7 / 12 | **10 / 17** |

**1. PLAN** — tek küçük çağrı. Yalnızca tip + başlık + tek cümlelik görev tanımı
(≈300 token), en dar bütçede bile tamamı gelir. İçerik yazılmaz.

**2. GENİŞLETME** — slayt başına bir çağrı. Her slayt bütçenin TAMAMINI kendine
kullanır; maddeler etiket değil 12–22 kelimelik cümle olur, `example` sığar.

### Uzun destelerde plan çökmesi — ve her slaydın yer tutucuya dönmesi

Kullanıcı şunu bildirdi: slayt sayısı büyütülünce deste "Bu maddeyi kendi notunla
doldur" yazan, hepsi birbirinin aynı slaytlarla geliyor. O metin `outline.ts`
içindeki yer tutucu — yani üretim tamamen YEREL TASLAĞA düşüyordu.

Zincir şuydu: plan çağrısı geçersiz JSON döndürüyor → derin üretim tamamen
iptal oluyor → tek geçişli yol da başarısız oluyor → `buildLocal` devreye girip
kaynaksız iskeletle her slaydı aynı yer tutucuyla dolduruyor.

Ölçüldü (Ollama + `qwen3:14b`): 8 slayt 47 sn'de, 16 slayt 81 sn'de sorunsuz;
**25 slaytta 177 sn sonra "Model geçerli JSON döndürmedi"**.

Üç ayrı sebep vardı, üçü de kapatıldı:

| Sebep | Düzeltme |
|---|---|
| Plan çıktı bütçesi SABİT 1200 token; 25 slaytlık plan sığmıyor ve JSON ortasından kesiliyor | `prompts.ts` → `planBudget(slideCount)`: satır başına ~110 token + pay |
| Şemadaki `minItems` modeli o sayıya ulaşana kadar yazmaya zorluyor; pencere dolunca çıktı bozuluyor | `minItems` kaldırıldı — sayı istemde söyleniyor, eksik kalırsa `alignToFramework` deterministik tamamlıyor |
| Ollama'nın varsayılan bağlam penceresi 4096 | `num_ctx` istem + çıktı bütçesine göre açıkça veriliyor (8192–16384) |

Düzeltmelerden sonra: **25 slayt → 25 öge, 132 sn, kapanışla bitiyor.**

Dördüncü ve en önemli savunma: **plan çökse bile üretim çökmez.** `deep.ts` →
`fallbackPlan` standardın bölüm listesinden deterministik bir plan kuruyor ve
içerik yine slayt başına AI ile yazılıyor. Sınandı (plan her zaman hata verecek
şekilde): 12 slayt, 11 gerçek AI çağrısı, **0 yer tutucu slayt**, yapı doğru.

### Yerel modelde zamanlama

Yerel modeller bulut modellerinden kat kat yavaş: ölçüldü, 14B bir model tek
slaytı 40–90 saniyede yazıyor ve 5 slaytlık bir deste ~4,5 dakika sürüyor.
Slayt çağrısının zaman aşımı bu yüzden 60 sn'den **180 sn**'ye çıkarıldı — eski
değer sık sık devreye girip kullanıcıya "AI bağlantısı koptu" gibi görünüyordu,
oysa model hâlâ yazıyordu. Zaman aşımı artık yeniden denenebilir hatalar
arasında (hız sınırı ve geçici HTTP hatalarıyla birlikte): yerelde ilk çağrı
modeli belleğe yüklediği için uzun sürüyor, ikincisi hızlı dönüyor.

Derin üretim başarısız olursa tek geçişli yola düşülür: yarım deste göstermektense
hızlı ama sığ bir deste üretmek daha iyi.

### Kaynak doküman slayt slayt işlenir

`retrieve.ts` → `SourceIndex` dokümanı bloklara böler ve her slayda YALNIZCA
ilgili bölümü verir. Yöntem deterministik: sözcük örtüşmesi + nadirlik ağırlığı
(sadeleştirilmiş IDF), gömme yok, ek model çağrısı yok, hepsi cihazda.

Tüm belgeyi her çağrıya koymak iki şeyi birden bozuyordu: bütçeyi yiyor ve
modelin odağını dağıtıyor — "metro doluluk oranı" slaytına 2030 yatırım tablosunu
vermek modeli slaytın konusundan uzaklaştırıyor. Seçilen bloklar kaynaktaki
SIRAYI korur; puana göre sıralamak metni anlamsız bir kolaj yapıyordu.

### Zayıf modeli içerik yazmaya zorlamak

Ölçüldü: genişletme çağrısında model 7 slaytın 6'sında yalnızca
`{"type": "...", "title": "..."}` döndürdü — içerik alanı hiç gelmedi.

Çözüm istem değil ŞEMA: tip plandan bilindiği için `aiSlideJsonSchema(…, type)`
o tipin içerik alanını `required` yapıyor (`content`→`bullets`, `chart`→`chart`,
`timeline`/`process`→`steps`, `architecture`→`layers`, `comparison`→`left`+`right`).
Aynı mantık `example` için de uygulanıyor (`SlideRequest.wantExample`). Sonuç:
313 → 2657 karakter, 0 → 4 örnekli slayt.

### Hız sınırı: kendini ayarlayan aralık

Ücretsiz sağlayıcılar arka arkaya gelen istekleri reddediyor — 6 genişletme
çağrısı peş peşe gönderildiğinde ALTISI birden 402/429 döndü. `ai/deep.ts` →
`Pacer` sabit gecikme yerine kendini ayarlıyor: sınıra takılınca aralık iki
katına çıkar, sorunsuz çağrıdan sonra kademeli düşer. Aynı slayt 4 kez denenir
ve bekleme kullanıcıya SÖYLENİR (`GenerateEvent` → `kind: 'wait'`); 20 saniye
duran bir ekran sebebi yazılmazsa "kilitlendi" sanılıyor.

Hiç başarılamayan slayt boş bırakılmaz: planın görev tanımı maddeye çevrilir,
kullanıcı slaytın ne anlatması gerektiğini görür ve koç panelinden tamamlatır.

## Konu modu — kaynak doküman yokken derinlik ve örnek

Kullanıcı yalnızca bir konu yazdığında (dosya yüklemediğinde) modelin varsayılan
davranışı konuyu başlık seviyesinde geçmek oluyor: doğru ama içi boş maddeler
("X önemlidir"). `ai/prompts.ts` → `depthRules` bunu hedefliyor:

* Her madde NE / NEDEN / NASIL sorularından birine cevap vermeli.
* Deste boyunca derinleşme: önce tanım ve sınır, sonra bileşenler, gerçek
  işleyiş, tıkanma noktaları ve çözümler.
* Kapak ve kapanış dışındaki her slaytta **`example`** alanı: adı geçen bir ürün,
  kurum, olay ya da dinleyicinin kendi gününden bir senaryo.
* Dürüstlük kuralı: uydurma istatistik ve uydurma kaynak adı yasak; yaygın
  bilinen yuvarlak değerler "yaklaşık" diye işaretlenerek kullanılır.

Kaynak metin varsa bu blok kullanılmaz — orada doğruluk ölçütü kaynağın kendisidir.

### Standart İSTEMLE değil, çıktı üzerinde uygulanır

İstem standardın bölümlerini ve slayt sayılarını söylüyor ama zayıf modeller ona
uymuyor: bölüm atlıyor, sırayı değiştiriyor, altı bölümlük iskeleti üç slaytta
bitiriyor. Kullanıcı açısından sonuç "standardı seçtim, hiçbir şey değişmedi".

`frameworks.ts` → `alignToFramework` planı üretildikten SONRA iskelete hizalıyor:
beklenen bölüm listesi tek doğruluk kaynağı, modelin başlık ve görev tanımları o
iskelete oturuyor. Model iyi çalıştıysa kendi metinleri korunuyor; kaytardıysa
eksik bölümler bölüm adından dolduruluyor.

Tip seçiminde modelin tercihi korunur — tek istisna generic `content`, yani
modelin tembel varsayılanı: bölüm görsel bir tip bekliyorsa oraya yükseltilir.
Ters yönde zorlama YAPILMAZ, çünkü verisi olmayan bir slaytı grafiğe çevirmek boş
grafik üretiyor.

Ayrıca bölüm adı görev tanımının başına eklenir; genişletme adımı hangi bölümü
yazdığını bilmezse iki bölüm aynı şeyi anlatıyor.

Ölçüldü: modelin yalnızca 2 gövde slaytı ürettiği bir planda 7 slaytlık iskelet
sıra ve tip korunarak tamamlandı; model düzgün çalıştığında kendi başlıkları
değişmeden kaldı; slayt sayısı bölüm sayısından azken bölümler doğru elendi.

### Dar bütçeli sağlayıcılarda örnek ikinci geçişe kayar

Ölçüm: Pollinations'ın 1500 token'lık bütçesinde deste üretirken örnek istemek
sonucu **kötüleştiriyor** — model ya örneği hiç yazmıyor ya da 8 slaytlık desteyi
5'te bırakıyor. Bu yüzden `compact` modda örnek istemden ve biçim örneğinden
düşer; deste tamamlanır (ölçülen: 8/8 slayt, 4 görsel), örnekler Koç panelindeki
**"Eksik örnekleri AI ile yaz"** ile slayt başına bir çağrıyla doldurulur — orada
bütçe fazlasıyla yeterli.

### Üst-veri komutlarında iki savunma

`notes`, `highlight` ve `example` komutları slaydın METNİNİ değiştirmemeli.
Zayıf modeller bu talimatı "hiçbir şey yazma" diye okuyup yalnızca
`{type, title}` döndürebiliyor. İki katman bunu karşılıyor:

1. **Şema zorlaması** — `aiSlideJsonSchema('example')` o alanı `required` yapar
   (`ai/prompts.ts` → `metaField` komuttan alan adını türetir). Şemayı uygulayan
   sağlayıcılarda alan garanti gelir; ölçüldü, boş dönen çağrı dolu döner hâle geldi.
2. **İçerik koruması** — `ai/client.ts` → `applyRefine` bu komutlarda modelin
   dönüşünden YALNIZCA o alanı alır, slaydın geri kalanını olduğu gibi bırakır.
   Koruma çağıranda değil burada durur ki her çağıran aynı güvencede olsun.

## Konu simgeleri

Her slaytın başlığının yanında konuyla ilgili bir rozet çizilir (`SlideHead` →
`SunumGlyph`). Katalog 30 simgedir (`types.ts` → `SLIDE_GLYPHS`).

Bu, AI'ya tasarım yaptırmak DEĞİLDİR: model yalnızca anlamsal bir etiket seçer
("money", "lock", "growth"); rozetin rengine, boyutuna ve biçimine tema ile şablon
karar verir. Model etiketi atlarsa ya da geçersiz bir ad verirse
`ai/normalize.ts` → `GLYPH_HINTS` slaydın METNİNDEN (başlık + alt başlık +
maddeler + vurgu) deterministik olarak çıkarır — yalnızca başlıktan değil, çünkü
"Riskler" gibi tek kelimelik başlıklar ipucu vermiyor. Kalıp sırası önemlidir:
dar kalıplar üstte durur ("veri tabanı" → `database`, `chart` değil).

Kullanıcı simgeyi İçerik sekmesinden değiştirebilir; tip dönüşümünde simge, örnek
ve vurgu taşınır (`templates.ts` → `convertSlideType`).

## Konudan tek slayt ekleme

Deste üretimi tek çağrıdır, ama kullanıcı sonradan "bu konuda bir grafik slaytı
ekle" diyebiliyor. Bu yol destenin tamamını yeniden üretmez:

`SlideRail` → "AI ile slayt ekle" (yönerge + tip) → `ai/client.ts` →
`generateSlide` → `/api/ai/slide` (anahtarsız/gateway) ya da doğrudan sağlayıcı →
`normalizeSlide` → desteye eklenir.

`slideRequestSchema` yönergeyle birlikte sunum başlığını, konuyu, hedef kitleyi,
tonu ve **var olan slayt başlıklarını** gönderir; böylece model destede zaten
anlatılmış bir şeyi tekrar yazmaz. Tip `auto` bırakılırsa içeriğin doğal biçimini
model seçer.

## Slayt görselleri — her slaytta

Görsel bir slayt TİPİ değil, `SlideBase.media` ile her slaytın bir ÖZELLİĞİdir.

Önce yalnızca `image` tipinde vardı ve bu pratikte "hiç yok" demekti: istemdeki
görsel kotası `chart`/`statistics`/`timeline`/`process`/`architecture`/`comparison`
tiplerini sayıyor, `image` tipini saymıyor — yani AI o tipi neredeyse hiç
üretmiyordu ve kullanıcı hiçbir slayda görsel ekleyemiyordu.

### Üç yerleşim, hepsi ölçü motoruyla uyumlu

| Yerleşim | Yeri | Gövdeden aldığı alan |
|---|---|---|
| `background` | İçeriğin arkasında, tam sayfa + perde | 0 |
| `band` | Gövdenin altında tam genişlik şerit | `MEDIA_BAND_H` |
| `inset` | Sağa yaslı küçük çerçeve | `MEDIA_INSET_H` |

Yer kaplayan ikisi `parts.tsx` → `mediaHeight` ile `bodyHeight`ten düşülür;
düşülmezse metin görselin üstüne biner — bantlarda yaşanan hatanın aynısı.
40 slaytlık stres destesinde üç yerleşimin de taşması ölçüldü: **sıfır**.

**Yan yana (sol/sağ) yerleşim bilinçli olarak YOK.** O, gövdenin GENİŞLİĞİNİ
değiştirir; şablonların satır kestirimi ise sabit genişliğe (`CONTENT_W`) dayanıyor
ve 39 ayrı yerde kullanılıyor. Ölçemediğim bir yerleşimi göndermek, taşan metin
demek. Gerçek yan yana düzen isteyen kullanıcı "Görsel" slayt tipini seçiyor;
orada genişlik doğru hesaplanıyor.

Perde (`.sn-media-scrim`) rengini TEMADAN alır, sabit siyah/beyaz değil — böylece
zemin görseli hangi temada olursa olsun metin kontrastı korunuyor.

### Tarayıcıdan düzenleme

`SlideMediaEditor`: yerleşim, çerçeveye oturma (doldur/sığdır), odak noktası ve
yakınlaştırma. Odak ve yakınlaştırma doğrudan MANİPÜLASYONLA ayarlanır —
kullanıcı görseli sürükler, tekerlekle yakınlaştırır. Sayı kutusuna "%42" yazmak
kimsenin istediği şey değil; kırpmayı gözle görerek ayarlamak PowerPoint'te de
böyle çalışıyor.

Görsel, iyileştirme (refine) ve tip dönüşümünde korunur: ikisi de onu siliyordu —
"metni kısalt" demek slayttaki görseli yok ediyordu.

## PPTX çıktısında kaymalar

Kullanıcı "pptx olarak çıktı alırken metinlerde kaymalar oluyor" dedi. Kök neden
tek bir eksik dönüşümdü: **px ↔ pt hiç yapılmamıştı.**

Ekran 1280×720 px, PPTX 10×5,625 inç → 128 px = 1 inç, yani punto = px × 0,5625.
Eski kod punto değerlerini px'le aynı büyüklük sanıp elle seçmişti:

| Öge | Ekran | Dosyada | Fark |
|---|---|---|---|
| Madde | 22 px (12,4 pt) | 16 pt | **+%29** |
| Başlık | 40 px (22,5 pt) | 26 pt | +%16 |
| Alt başlık | 18 px (10,1 pt) | 13 pt | +%28 |

Ölçülen etki: 8 maddeli bir slaytta her madde iki satıra sarıyor ve **2,28 inç**
taşma oluşuyordu. Punto kademelerinin EŞİKLERİ de farklıydı (64/42 karakter ↔
ekranda 84/52), yani aynı başlık iki ortamda farklı kademeye düşüyordu.

Yanında dört sorun daha vardı:

* **Kutu yükseklikleri sabitti**, içerikten ölçülmüyordu. 130 karakterlik bir
  örnek bandı üç satıra çıkınca 0,22 inç vurgu bandının üstüne biniyordu.
* **`valign`/`margin`/`lineSpacing` verilmemişti.** PptxGenJS `valign` yokken
  `anchor="ctr"` yazıyor — metin dikeyde ortalanıp ekrandaki üst hizadan
  kayıyordu. `margin` verilmeyince PowerPoint varsayılanı her kutunun metin
  sütununu 0,194 inç daraltıyordu. Satır aralığı verilmeyince her satır %20
  fazla yer alıyordu.
* **Alt rezerv ölçüm değil sabit toplamıydı** ve bantların gerçekte çizildiği
  yerle uyuşmuyordu; görsel şeridi 1,66 inç sayılıyordu, gerçekte 1,84 inç.
* **Kapak/alıntı/kapanış dikey konumları sabitti**; ekranda ortalanan bu bloklar
  üç satırlık bir başlıkta alt başlığın üstüne oturuyordu.

Çözüm: ekranın yerleşim ölçü motoru PPTX'e birebir portlandı (aynı `CHAR_RATIO`,
aynı kademe tabloları), tüm metin tek bir `putText()` kapısından geçiyor
(`margin: 0`, zorunlu `valign`, açık satır aralığı) ve her kutu içerikten
ölçülüyor. PPTX kırpamadığı için son çare kırpma değil KÜÇÜLTME: punto, iç
boşluk ve satır aralığı 0,4 katına kadar iniyor, sığmayan listeler iki kolona
bölünüyor.

Doğrulama, üretilen .pptx'in XML'i okunarak yapıldı (kutu koordinatları, punto,
satır aralığı, girinti): azami yoğun 195 slayt × 2756 metin kutusunda **0 sınır
dışı, 0 üst üste binme**; normal yoğunlukta 12 tema × TR/EN'de üçü de 0. En uç
koordinat 9,438 / 10 inç ve 5,188 / 5,625 inç — hiçbir kutu kenar boşluğunu
aşmıyor. Ben de bağımsız olarak 39 şablon × 3 biçimle gerçek bir dosya ürettim:
713 KB, hatasız.

## Üretimde iki ekran: düşünme ve ilerleme

Yerel modelde bir slayt 40–90 saniye sürüyor ve o sürede ilerleme kartı hiç
değişmiyordu; kullanıcı "takıldı mı?" diye bakıyordu. Kartın İÇİNDE küçük bir
gösterge de yetmedi. Bu yüzden model düşünme anı KENDİ ekranını alıyor.

Döngü (ölçüldü, 3 slaytlık gerçek üretim):

```
0,2 s    DÜŞÜNME 0/3   ← plan çağrısı da model düşünmesidir, kapsama alındı
57,9 s   POPUP   1/3   ← yanıt geldi, ilerleme kartına DEVİR
59,8 s   DÜŞÜNME 1/3   ← sıradaki çağrı (kart ~1,9 sn görünür kaldı)
…
137,7 s  POPUP   3/3   ← son yanıt
138,5 s  POPUP         ← son kontroller
→ EDİTÖR
```

Düşünme ekranı `position: fixed` ve zemini OPAK (`rgb(var(--c-page))`) — arkadaki
kart görünmez, gerçekten ayrı bir ekrandır. Yarı saydam bir perde denendi ve
"ayrı ekran" hissi vermedi.

Devir penceresi (`MODEL_WAIT_RESUME_MS`) bir süre TAHMİNİ değil: yanıt gelince
kullanıcı yeni slaydın oturduğunu ve sayacın ilerlediğini görsün diye bırakılan
paydır. 900 ms denendi, kart göz kırpması gibi geçti; 1900 ms'de görünür oldu.
Model zaten slayt başına dakikalar harcadığı için üretimi yavaşlatmıyor.

**Sahte ilerleme yok:** düşünme ekranındaki hiçbir hareket bir orana bağlı değil
(dönen yaylar, nabız, dalga — hepsi sabit hızlı ve belirsiz). Yüzde, kalan süre
ya da dolan çubuk yalnızca devredilen ilerleme kartında var ve orada da
tamamlanan slayt olaylarından türüyor.

Hız sınırı beklemesinde düşünme ekranı GÖSTERİLMEZ: orada geri sayımlı ayrı bir
kart var ve iki gösterge üst üste gelirse hangisinin ne anlattığı kayboluyor.

## Metin biçimi — Word benzeri araç çubuğu

`SlideBase.textStyle` kullanıcının slayda uyguladığı biçimi taşır: yazı tipi,
punto ÇARPANI (0,7–1,35), kalın/italik/altı çizili, hizalama, renk rolü ve satır
aralığı. Araç çubuğu İçerik sekmesinde (`TextToolbar.tsx`).

**Renk ve yazı tipi serbest DEĞİL**, temanın rollerine bağlı: `default`,
`accent` (`--sn-accent`), `muted` (`--sn-fg2`) — gradyan zeminde ise `--sn-on-hero`
türevleri. Böylece kullanıcı biçim değiştirirken temanın kontrast garantisi
bozulmuyor ve PPTX çıktısı ekranla aynı kalıyor.

Biçim CSS değişkenlerine çevrilip `.sn-slide` KÖKÜNDE basılıyor. Kökte olması
şart: kapak, alıntı ve gradyan kapanış şablonları başlığı kendileri çiziyor ve
ortak `SlideHead` parçasını kullanmıyor — yalnızca orada basılsaydı o üç
şablonda biçim hiç uygulanmazdı (ölçüldü).

### Ölçü motoru punto çarpanını biliyor

Punto büyütmek satır sayısını artırır, yani taşma riskidir. `parts.tsx` →
`textFactor(slide) = max(1, scale² × lineHeight)` ve `bodyHeight` bu çarpana
bölünüyor. **Kare** olmasının nedeni: punto s katına çıkınca satıra sığan
karakter 1/s'e düşer, satır sayısı ~s katı olur, yükseklik = satır × punto →
alan s² büyür.

Ölçüldü (11 slaytlık yoğun deste, 8 madde + uzun başlık + iki bant):
punto 1,35'te slayt kutusundan taşma **0 px**, gövde kırpılması **0 px**.
Motor güncellenmeseydi aynı koşulda 45 px kırpılma olacaktı.

Uç durumlarda (satır aralığı ≥1,5 ya da ~190 karakterlik 8 madde) kademe
merdiveni tükeniyor ve içerik fizik olarak sığmıyor; o hâlde bile hiçbir öge
slayt kutusundan çıkmıyor, `overflow: hidden` güvenlik ağı içeride kırpıyor.

Slayt üzerinde düzenlemede `Ctrl/Cmd+B/I/U` engelleniyor: tarayıcı `<b>/<i>/<u>`
düğümü üretiyor, kaydetme yalnızca `textContent` okuduğu için o biçim odak
kaybında sessizce kayboluyordu.

## Slaytın üzerinde doğrudan düzenleme

Kullanıcı sağ paneldeki alanlara gitmeden slaydın KENDİ ÜZERİNDE başlığa, alt
başlığa, bir maddeye, örneğe ya da vurguya tıklayıp yazabiliyor
(`slides/edit.tsx`). Sağ panel kaldırılmadı; ikisi aynı veriyi düzenliyor ve
anında birbirini güncelliyor.

Düzenlenebilirlik 12 slayt bileşenine tek tek eklenmedi; React bağlamı olarak
`parts.tsx` içindeki ortak parçalara (`SlideHead`, `Bullets`, bantlar) verildi —
böylece TÜM şablonlar aynı anda düzenlenebilir oldu ve yeni bir şablon eklendiğinde
unutulması mümkün değil. Bağlam yokken (sunum modu, yazdırma, küçük resimler)
hiçbir ek düğüm ya da olay oluşmaz.

**Metnin tek sahibi React'tir** ve değişiklik yalnızca ODAK KAYBINDA yukarı
bildirilir. Kullanıcı yazarken `value` prop'u değişmediği için her yeniden render
aynı çocuğu üretir, React DOM'a dokunmaz, imleç yerinde kalır.

> Denenip elenen yol: metni `useEffect` + `textContent` ile elle yazmak. O zaman
> DOM'un iki sahibi oluyor ve düğüm bayatlıyor — ölçüldü: depoda yeni değer,
> DOM'da eski metin, sonra alanlar tamamen boş. `dangerouslySetInnerHTML` ile
> alt ağacı React'e kapatmak da işe yaramadı.

Yapıştırma düz metne indirilir: aksi hâlde slayda harici yazı tipi ve renk sızar
ve tasarım sistemi delinir. `Enter` düzenlemeyi bitirir (satır sonu eklemez),
boşaltılan bir madde listeden düşer. Düzenlemeler geri al/yinele geçmişine girer.

## Slayt görselleri — AI ile üretim

MVP'de "ücretli görsel üretim API'si yok" kuralı duruyor; ücretsiz ve ANAHTARSIZ
olan var: Pollinations image (`lib/sunum/ai/images.ts`). Doğrulandı — `image/jpeg`,
`access-control-allow-origin: *`, `x-auth-status: unauthenticated`.

**Tarayıcıdan doğrudan çağrılamıyor.** Ölçüldü: aynı adres sunucudan `200` ve
gerçek bir JPEG dönerken tarayıcıdan `403` dönüyor — sağlayıcı `Origin` başlığına
bakıp reddediyor. Başlıksız istek `500`, tarayıcı `User-Agent`'ı ile `402`.
Bu yüzden istek `/api/ai/image` üzerinden SUNUCUDAN gidiyor; anahtarsız
sağlayıcılar için modülün zaten uyguladığı kuralın aynısı.

SSRF sınırı: uç istemciden ADRES almaz, yalnızca istem metni alır; adresi rota
kendisi kurar.

Anonim tarife ayrıca kotalı: servis sık sık `402`/`429` döndürüyor. Hem rota hem
istemci üç deneme yapıyor (0 / 2,5 / 6 sn) ve dönen gövdeyi `content-type` + en az
1 KB boyutla doğruluyor — `402`'nin 2 baytlık JSON'u asla görsel sanılmıyor.

Sağlayıcının REDDİ ile sunucunun ULAŞILAMAMASI ayrı ele alınıyor: rota yoksa
(`404`, statik dağıtım) tarayıcı doğrudan dener; sağlayıcı reddettiyse denemez,
çünkü tarayıcı yolu zaten `403` alacak ve o sırada kota bilgisi kaybolur.
Kullanıcıya "kota doldu, biraz sonra dene" ile "üretilemedi" ayrı gösteriliyor —
ikisi farklı eylem gerektiriyor.

**Şema sınırı korunuyor:** slayt yalnızca `data:` URL kabul eder, harici adres
render EDİLMEZ. Üretilen görsel canvas'ta küçültülüp JPEG'e çevriliyor
(1280/0,72 → 1024/0,62 → 800/0,55 → 640/0,5 kademeleri). Ölçülen tipik boyut
**30–65 bin karakter**, `LIMITS.imageDataUrl` (800.000) sınırının %4–8'i —
localStorage kotası için önemli.

**GIF canvas'a sokulmaz**, çünkü canvas yalnızca ilk kareyi çizer ve animasyon
ölür; GIF ham olarak okunur ve yalnızca boyutu denetlenir. Hareketli görsel AI ile
ÜRETİLEMİYOR (ücretsiz sağlayıcıda yok) — arayüz bunu `t.media.animatedNote` ile
açıkça söylüyor, kullanıcı kendi GIF'ini yükleyebiliyor.

## Editörde geri alma

Editördeki her değişiklik 600 ms sonra localStorage'a yazılıyordu ve eski hâle
dönmenin yolu yoktu — bu, kullanıcıyı denemekten alıkoyuyor ("AI ile yeniden yaz"a
basmaya çekiniyor). `PresentationEditor` artık 40 adımlık bir geçmiş yığını tutuyor.

Yığın yalnızca BELLEKTE (sekme ömrü kadar); diske yazılan şey her zaman güncel hâl.
Tüm mutasyonlar tek bir `patch()` kapısından geçtiği için geçmişe girmeyen bir
değişiklik kalmıyor.

Klavye: `⌘/Ctrl+Z` geri, `⌘/Ctrl+Shift+Z` (ya da `Ctrl+Y`) ileri, `↑`/`↓` slayt
gezinme. Kısayollar odak bir metin alanındayken DEVRE DIŞI — kullanıcı başlık
yazarken `⌘Z`'nin slaytı geri alması değil, yazdığı harfi geri alması beklenir.

## Performans kararları

* `fast` derinlikte sunum başına **tek** AI çağrısı. `deep` derinlikte bilinçli
  olarak N+1 çağrı yapılır — derinliğin bedeli budur ve kullanıcı sihirbazda
  hangisini istediğini seçer.
* Üretim ekranındaki ilerleme **gerçek**: akış yanıtı ayrıştırılıp tamamlanan
  slaytlar yayımlanır (`ai/stream.ts`). Sahte yüzde çubuğu yoktur.
* Kalite denetimi varsayılan olarak yereldir ve ağ çağrısı yapmaz; Jev açıkken
  tüm destenin soruları tek çağrıda (12 slaytlık partiler hâlinde) gider.
* Üretim sonucu süreç içi önbellekte tutulur (aynı girdi tekrar üretilmez).
* Uzun dokümanlar modele gitmeden önce deterministik olarak seyreltilir.
* `pptxgenjs` yalnızca indirme anında dinamik import edilir (~1 MB).
* Yazdırma kopyası yalnızca yazdırma anında monte edilir.
* Editör değişiklikleri 600 ms gecikmeyle kaydedilir.

## Bilinçli sınırlar

* **Veritabanı yok.** Projede hesap/DB katmanı bulunmuyor; sunumlar CV Stüdyosu
  ve ATS Analiz ile aynı şekilde cihazda (localStorage) saklanıyor. Erişim
  `PresentationRepository` arayüzünden geçtiği için ileride DB eklemek tek dosyalık iş.
* **Hız sınırı süreç içi.** Çok örnekli dağıtımda paylaşımlı sayaç gerekir.
* **Görsel üretimi yok.** Görseller ikon/şekil/SVG tabanlı üretilir ya da kullanıcı
  kendi görselini yükler. Slaytlar yalnızca `data:` URL kabul eder.
* **PPTX gradyanı** ince şeritlerle taklit edilir (PptxGenJS gradyan zemini desteklemez).
* **Kontrast kontrolü** tema kataloğuna karşı bir regresyon koruması. On iki
  temanın hepsi ölçüldü ve eşikleri geçiyor: gövde metni 15,5–18,9:1, panel üstü
  14,3–17,2:1, soluk metin 6,4–9,4:1, vurgu zemini üstündeki metin 4,9–16,4:1.
  Ölçüm sırasında var olan bir tema (`warm-sand`) vurgu zemini üstünde 4,0:1 ile
  AA eşiğinin (4,5) ALTINDA çıktı; turuncusu koyulaştırılarak 5,3:1'e çekildi.
* **Animasyonlar** yalnızca sunum modunda ve üretim önizlemesinde oynar; editörde
  kapalıdır — her tuş vuruşunda yeniden oynayan slayt düzenlemeyi imkânsız kılar.
  `prefers-reduced-motion` tümünü kapatır. Ek paket kullanılmadı, hepsi CSS.
* **Grafikler PPTX'te** PowerPoint'in kendi grafik nesnesi olarak gelir; ekrandaki
  SVG ile birebir aynı çizim değildir, veri aynıdır.
