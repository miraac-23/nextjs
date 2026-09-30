This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## AI Sunum Stüdyosu

`/sunum` altındaki modül, konudan ya da yüklenen PDF/DOCX'ten otomatik sunum üretir
ve PPTX/PDF olarak indirir.

**Kurulum gerekmez.** Uygulama ilk açılışta anahtarsız ücretsiz bir modele
kendiliğinden bağlanır. Kullanıcı dilerse açılır menüden başka bir ücretsiz
modele geçer, yerel Ollama kullanır ya da kendi (ücretsiz veya ücretli) API
anahtarını girer — anahtar tarayıcıdan çıkmaz. Ollama kuruluysa gizlilik ve hız
için otomatik olarak o tercih edilir.

Ollama'yı ya da model indirmeyi bilmeyen kullanıcı için yerleşik bir **kurulum
sihirbazı** vardır: işletim sistemi tanınır, kopyalanabilir tek satırlık komut
verilir, servis arka planda yoklanır ve model indirme gerçek bayt ilerlemesiyle
otomatik yapılır.

Tek bir ortam değişkeni (`AI_GATEWAY_API_KEY`) tanımlanırsa **Vercel AI Gateway**
sunucu üzerinden devreye girer: kullanıcı tarayıcıya anahtar girmeden Qwen/Llama/
DeepSeek gibi güçlü modelleri seçebilir ve ücretsiz katmanların kota/kesilme
sorunu ortadan kalkar. Anahtar, Vercel panelinde projenin `~/connect` sayfasından
AI Gateway bağlanınca üretilir.

Sihirbazın ilk adımında **girdiyi ve AI'nın rolünü sen seçersin**: sadece konu +
AI, sadece metin (AI yok), metin + AI, sadece doküman (AI yok), doküman + AI.
"Sadece" modlarında hiçbir AI çağrısı yapılmaz; metin cihazda deterministik olarak
slaytlara bölünür.

Ayrıca **10 içerik standardı** arasından seçim yapılır (Klasik, Problem·Çözüm,
Hikâye, Piramit, SWOT, Vaka analizi, Akademik, Yatırımcı sunumu, Eğitim,
Değerlendirme). Seçtiğin standardın bölümleri ve her bölüme kaç slayt düşeceği
ekranda görünür; slayt sayısını değiştirdikçe dağılım canlı güncellenir.

Sihirbazda iki üretim derinliği var. **Derin araştırma** (varsayılan) önce
sunumun planını çıkarır, sonra her slaytı ayrı bir çağrıda yazar: maddeler tam
cümle olur, her slayta somut örnek girer ve yüklenen doküman slayt slayt, yalnızca
ilgili bölümüyle işlenir. Ölçülen fark: aynı istekte 904 karakter yerine 2657
karakter içerik. **Hızlı** tek çağrıyla yarım dakikada biter.

PDF, Word, TXT ve Markdown dosyaları kabul edilir; dosya cihazdan çıkmaz,
modele yalnızca çıkarılan metin gider.

Her slayda görsel konabilir — görsel bir slayt tipi değil, slaydın bir özelliği.
Üç yerleşim var: zemin (tam sayfa + okunabilirlik perdesi), alt şerit ve köşe
kutusu. Görsel anahtarsız ücretsiz bir servisle AI ile üretilebilir ya da kendi
dosyan (GIF dâhil) yüklenebilir; her zaman gömülü `data:` URL'e çevrilir, harici
adres render edilmez. Görselin odağı ve yakınlaştırması tarayıcıda sürüklenerek
ayarlanır.

Slaytın **üzerine tıklayıp doğrudan yazabilirsin**: başlık, alt başlık, maddeler,
örnek ve vurgu yerinde düzenlenir ve değişiklik anında sağ panele, küçük resme ve
geri alma geçmişine yansır. Editörde 12 tema, slayt tipi başına birden çok
şablon, geri al/yinele ve klavye kısayolları var.

Yalnızca bir konu yazıldığında (dosya yüklenmediğinde) modelden konuyu açması
istenir: tanım, işleyiş ve her slaytta **gerçek bir örnek**. Her slayt konusuna
uygun bir simge rozeti alır, sayısal içerik grafiğe/zaman çizelgesine dönüşür ve
sunum modunda sahnelenerek oynatılır. Uydurma istatistik ve uydurma kaynak adı
istemde açıkça yasaklanmıştır.

Hiçbir bağlantı kurulamazsa modül yine kullanılabilir: metinden deterministik bir
taslak çıkarılır, kullanıcı editörde düzenleyip indirebilir.

Sağlayıcı kataloğu, mimari ve ortam değişkenleri:
[`lib/sunum/README.md`](lib/sunum/README.md).

Slayt kalite kontrolü (görsel biçim önerisi, yoğunluk, netlik) varsayılan olarak
cihazda çalışır. İsteğe bağlı olarak **Jev** (TypeSafe AI System One) karar modeli
`TYPESAFE_API_KEY` ile devreye alınabilir — Jev metin üretmez, yalnızca tipli
karar döndürür. Jev anahtarı yoksa aynı kararlar `AI_GATEWAY_API_KEY` üzerinden
bir modele sorulur; o da yoksa cihazdaki sezgi motoru kullanılır.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
