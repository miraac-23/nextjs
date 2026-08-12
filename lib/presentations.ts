export type Presentation = {
  slug: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  cover: string
  badge: string
  /** public/ altındaki bağımsız sunum uygulamasının giriş noktası */
  embedUrl: string
  stats: { value: string; label: string }[]
  topics: string[]
}

export const presentations: Presentation[] = [
  {
    slug: 'java-spring-kapsamli-egitim',
    title: 'Java & Spring — Kapsamlı Eğitim Sunumu',
    subtitle: 'Çekirdek dilden üretim mikroservislerine',
    description:
      "Java çekirdeğinden JVM'in derinliklerine, Spring felsefesinden Spring Boot ile üretim mikroservislerine uzanan interaktif bir sunum. Her konuda kavram künyeleri (nedir / nereden gelir / nasıl kullanılır), günlük hayat benzetmeleri, tıkla-göster Soru–Cevap ve bölüm sonu özetleri.",
    tags: ['Java', 'JVM', 'Spring', 'Spring Boot', 'Mikroservis'],
    cover: 'from-amber-500/30 via-orange-500/20 to-cyan-600/30',
    badge: 'İnteraktif Sunum',
    embedUrl: '/sunum/index.html',
    stats: [
      { value: '6', label: 'Ana Bölüm' },
      { value: '110+', label: 'Konu' },
      { value: '8→25', label: 'Java Sürümü' },
    ],
    topics: [
      'Java Çekirdek & İleri',
      'Java Sürüm Analizi (8 → 25)',
      'Spring Framework',
      'Spring Boot',
      'Spring vs Spring Boot',
      'Spring Boot Sürüm Analizi',
    ],
  },
  {
    slug: 'rate-limit-kota-yonetimi',
    title: 'Rate Limit & Kota Yönetimi — Mimari Sunumu',
    subtitle: 'Yüksek trafikli istek kontrolü, uçtan uca',
    description:
      "İsteklerin kullanıcı, kurum, uygulama, servis, endpoint ve API anahtarı bazında tek noktada değerlendirildiği; limit aşıldığında isteğin downstream servise hiç ulaşmadan kesildiği bir platformun sıfırdan anlatımı. Token Bucket'tan yarış koşuluna, Redis + Lua atomikliğinden Kafka/Debezium ile kural yayılımına ve kota cüzdanına kadar her kavram canlı animasyonlarla; hız limiti ve kota senaryoları ise elle denenebilir demolarla gösteriliyor.",
    tags: ['Spring Cloud Gateway', 'Redis + Lua', 'Kafka + Debezium', 'PostgreSQL', 'Elasticsearch'],
    cover: 'from-cyan-500/30 via-indigo-500/20 to-violet-600/30',
    badge: 'İnteraktif Sunum',
    embedUrl: '/sunum-rate-limit/index.html',
    stats: [
      { value: '32', label: 'Slayt' },
      { value: '6', label: 'Karar Boyutu' },
      { value: '5', label: 'Algoritma' },
    ],
    topics: [
      'Vaka & Problem — neden gerekli?',
      'İki eksen: hız limiti vs kota',
      'Algoritmalar & canlı Token Bucket',
      'Atomiklik, yarış koşulu, anahtar anatomisi',
      'Redis · PostgreSQL · Kafka/CDC · Elasticsearch',
      'Kota cüzdanı, faturalama ve dayanıklılık',
      'Elle denenebilir demolar & ölçümler',
    ],
  },
  {
    slug: 'api-gateway-merkezi-trafik-yonetimi',
    title: 'API Gateway & Merkezi Trafik Yönetimi — Mimari Sunumu',
    subtitle: 'Temelden uzman seviyesine, dört aşamalı yolculuk',
    description:
      'Gateway nedir sorusundan üretim gerçeklerine ve ürün/custom gateway kararına uzanan, seviye seçtirmeyen — okuyucuyu Temel → Uygulama → İleri → Uzman aşamalarından yürüten bir sunum. Filtre zinciri, kimlik, kota, dayanıklılık ve gözlemlenebilirlik konuları canlı canvas animasyonlarıyla; devre kesici yarışı, dağıtım stratejileri ve topoloji senaryoları ise yan yana ölçülebilen etkileşimli sahnelerle anlatılıyor.',
    tags: ['API Gateway', 'Spring Cloud Gateway', 'Resilience4j', 'Circuit Breaker', 'Observability'],
    cover: 'from-emerald-500/30 via-sky-500/20 to-fuchsia-600/30',
    badge: 'İnteraktif Sunum',
    embedUrl: '/sunum-api-gateway/index.html',
    stats: [
      { value: '46', label: 'Slayt' },
      { value: '4', label: 'Aşama' },
      { value: '30+', label: 'Canlı Sahne' },
    ],
    topics: [
      'Vaka & problem — çapraz kesen görev tekrarı',
      'Temel: gateway, proxy/LB/mesh farkı, 16 durak',
      'Uygulama: rota, keşif, JWT, kota, versiyonlama',
      'İleri: timeout, devre kesici, yük atma, canary',
      'Resilience4j dekoratör zinciri & parametreler',
      'SPOF, blast radius, gözlem ve güvenlik',
      'Uzman: ürün manzarası, kıyaslama arenası',
      'Custom gateway, anti-pattern’ler ve PoC planı',
    ],
  },
  {
    slug: 'trafik-polisi-operasyon-takip-sistemi',
    title: 'Trafik Polisi Operasyon ve Takip Sistemi — Mimari Sunumu',
    subtitle: 'Sahayı canlı gören, görevlendirmeyi tutarlı tutan operasyon merkezi',
    description:
      "Trafik polislerinin konumunun saniyeler içinde değiştiği bir operasyon merkezinin sıfırdan anlatımı. Telsizle yürüyen görevlendirmenin ürettiği hatalardan başlayıp; aylık bölümlenmiş konum tablosuna, trigram indeksinin olmadığı yerde çöken aramaya, iki operatörün aynı polisi aynı anda atadığı yarış koşuluna ve onu üç katmanda çözen kilitleme stratejisine uzanıyor. Kafka tamponu, Redis pub/sub ile çok örnekli SSE, virtual thread, idempotency ve Redis + Lua token bucket canlı canvas sahneleriyle; bölüm eleme, indeks yarışı, çift görevlendirme ve hız sınırı ise elle denenebilir demolarla gösteriliyor.",
    tags: ['Java 21', 'Spring Boot', 'PostgreSQL', 'Redis + Lua', 'Apache Kafka', 'SSE', 'React + MUI'],
    cover: 'from-amber-500/30 via-blue-500/20 to-emerald-600/30',
    badge: 'İnteraktif Sunum',
    embedUrl: '/sunum-traffic-ops/index.html',
    stats: [
      { value: '32', label: 'Slayt' },
      { value: '4', label: 'Aşama' },
      { value: '10', label: 'Canlı Sahne' },
    ],
    topics: [
      'Vaka & problem — görünürlük olmadan görevlendirme',
      'Roller, uçtan uca akış ve operasyon panosu',
      'İş alanına göre paketleme ve client sözleşmeleri',
      'Aylık bölümlenmiş konum tablosu & bölüm eleme',
      'İndeks tipleri: B-tree, trigram GIN, BRIN, kısmi UNIQUE',
      'Yarış koşulu, satır kilidi, kilit sırası ve kilitlenme',
      'JWT rotasyonu, SSE bileti ve yetkilendirme',
      'Redis pub/sub ile çok örnekli SSE, Kafka ingest tamponu',
      'Virtual thread, idempotency ve Lua token bucket',
    ],
  },
]

export function getPresentation(slug: string): Presentation | undefined {
  return presentations.find((p) => p.slug === slug)
}
