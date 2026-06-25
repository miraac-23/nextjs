export const profile = {
  name: 'Miraç Güntoğar',
  role: 'Fullstack Yazılım Geliştirici',
  tagline: 'Java · Spring Boot · React / Next.js',
  location: 'Çankaya / Ankara',
  email: 'mirac.guntogar@gmail.com',
  phone: '+90 530 975 3423',
  birthYear: 1999,
  summary:
    'Ölçeklenebilir, sürdürülebilir ve kullanıcı odaklı sistemler geliştiren bir Fullstack mühendis. Java & Spring Boot tabanlı mikroservis mimarileri ile React & Next.js arayüzlerini bir araya getirerek modern, performanslı ve güvenli çözümler üretiyorum.',
  about: [
    'Yazılım mühendisliği alanında edindiğim bilgi ve tecrübeleri ölçeklenebilir, sürdürülebilir ve kullanıcı odaklı sistemler geliştirmek için kullanıyorum. Hem arka uç hem de ön uç teknolojilerinde güçlü bir Fullstack deneyime sahibim.',
    'Java ve Spring Boot tabanlı mikroservis mimarileri ile React ve Next.js kullanarak modern, performanslı ve kullanıcı dostu çözümler üretiyorum. TAKBİS gibi ulusal ölçekte kullanılan projelerde görev alarak CI/CD süreçleri, DevOps uyumluluğu ve modern yazılım metodolojileri konusunda derinleştim.',
    'Performans ve güvenlik odaklı sistemlerde sorumluluk almayı, mühendislik kültürü güçlü ekiplerle birlikte değer üretmeyi ve yeni teknolojilere hızla adapte olarak sürekli gelişmeyi hedefliyorum.',
  ],
}

export const socials = [
  { label: 'GitHub', href: 'https://github.com/miraac-23', handle: 'miraac-23', icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/', handle: 'miraç-güntoğar', icon: 'linkedin' },
  {
    label: 'Stack Overflow',
    href: 'https://stackoverflow.com/users/mirac-gundogar',
    handle: 'mirac-gundogar',
    icon: 'stackoverflow',
  },
  { label: 'E-posta', href: 'mailto:mirac.guntogar@gmail.com', handle: 'mirac.guntogar@gmail.com', icon: 'mail' },
]

export const stats = [
  { value: '4+', label: 'Yıl Deneyim' },
  { value: '4', label: 'Öne Çıkan Proje' },
  { value: 'Ulusal', label: 'Ölçekli Sistem' },
  { value: '3,35', label: 'Y. Lisans GANO' },
]

export type SkillGroup = { title: string; icon: string; items: string[] }

export const skillGroups: SkillGroup[] = [
  { title: 'Diller', icon: 'code', items: ['Java', 'Kotlin', 'JavaScript', 'TypeScript', 'SQL'] },
  {
    title: 'Arka Uç (Backend)',
    icon: 'server',
    items: ['Spring Boot', 'Spring Security', 'REST API', 'JWT', 'Mikroservis'],
  },
  { title: 'Ön Uç (Frontend)', icon: 'layout', items: ['React', 'Next.js', 'React Native', 'HTML / CSS'] },
  { title: 'Veritabanı & DevOps', icon: 'database', items: ['PostgreSQL', 'Docker', 'Git', 'CI/CD'] },
  {
    title: 'Yöntem & Kalite',
    icon: 'shield',
    items: ['Agile / Scrum', 'Jira', 'Confluence', 'Clean Code', 'SOLID'],
  },
]

export type Experience = {
  role: string
  company: string
  period: string
  current?: boolean
  points: string[]
}

export const experiences: Experience[] = [
  {
    role: 'Fullstack Yazılım Geliştirici',
    company: 'Türksat Uydu Haberleşme Kablo TV ve İşletme A.Ş.',
    period: 'Mar 2024 — Halen',
    current: true,
    points: [
      'Türkiye genelinde aktif kullanılan TAKBİS sisteminin modernizasyon sürecinde fullstack geliştirici olarak görev; gereksinim analizi ve mimari karar süreçlerine katkı.',
      "Java & Spring Boot ile ölçeklenebilir mikroservislerin ve RESTful API'lerin geliştirilmesi; JWT tabanlı güvenli kimlik doğrulama katmanlarının tasarımı.",
      'React & Next.js ile performanslı arayüzlerin geliştirilmesi ve PostgreSQL üzerinde karmaşık veri modellerinin tasarımı.',
      'Docker ile konteynerleştirme ve CI/CD entegrasyonu; Clean Code & SOLID prensipleriyle kod kalitesinin sağlanması, Jira & Confluence üzerinden Scrum süreci.',
    ],
  },
  {
    role: 'Fullstack Yazılım Geliştirici',
    company: 'MKK / Gabim A.Ş.',
    period: 'Haz 2022 — Mar 2024',
    points: [
      'TDUB için Üye Yönetim Sistemi (UYS) ve yabancı satış analizine yönelik TADEBIS raporlama uygulamasının fullstack geliştirilmesi.',
      'Java & Spring Boot ile arka uç servisleri, React & Next.js ile duyarlı arayüzler; PostgreSQL veri modelleme ve servisler arası entegrasyon mimarisi.',
      'Docker ile taşınabilir geliştirme ortamları, Git ile versiyon yönetimi ve Scrum süreçlerine aktif katkı.',
    ],
  },
  {
    role: 'Mobil Uygulama Geliştirici · Uzun Dönem Staj',
    company: 'Başarsoft',
    period: 'Eki 2021 — Oca 2022',
    points: [
      'Java & Kotlin ile native Android ve React Native ile hibrit mobil uygulamaların geliştirilmesi.',
      'UI/UX, performans optimizasyonu ve Git ile kod yönetimi konularında deneyim kazanımı.',
    ],
  },
  {
    role: 'Web Geliştirici · Staj',
    company: 'Baydaş Yazılım Bilişim',
    period: 'Eyl 2020 — Haz 2021',
    points: [
      'HTML & CSS ile statik/dinamik web arayüzlerinin ve prototiplerin geliştirilmesi.',
      'Responsive tasarım ve temel UI/UX prensipleri üzerine çalışma.',
    ],
  },
]

export type Project = {
  title: string
  subtitle: string
  description: string
  tags: string[]
  highlight?: boolean
}

export const projects: Project[] = [
  {
    title: 'TAKBİS Modernizasyonu',
    subtitle: 'Ulusal ölçekli tapu-kadastro sistemi',
    description:
      'Türkiye genelinde aktif kullanılan tapu-kadastro platformunun modernizasyonu. Spring Boot mikroservisleri ve React/Next.js arayüzleri ile yüksek hacimli, güvenlik odaklı bir sistem.',
    tags: ['Spring Boot', 'Mikroservis', 'Next.js', 'PostgreSQL', 'CI/CD'],
    highlight: true,
  },
  {
    title: 'UYS — Üye Yönetim Sistemi',
    subtitle: 'TDUB',
    description:
      'Üye süreçlerini baştan sona dijitalleştiren fullstack platform. JWT tabanlı güvenli kimlik doğrulama ve servisler arası entegrasyon mimarisi.',
    tags: ['Java', 'Spring Security', 'React', 'JWT'],
  },
  {
    title: 'TADEBIS',
    subtitle: 'Raporlama & Analiz',
    description:
      'Yabancı satış verilerinin analizi ve raporlanmasına yönelik uygulama. Karmaşık veri modelleri üzerinde performanslı raporlama altyapısı.',
    tags: ['Spring Boot', 'PostgreSQL', 'REST API', 'Next.js'],
  },
  {
    title: 'İK İzin Takip & Kullanıcı Yönetimi',
    subtitle: 'Kurumsal İç Sistem',
    description:
      'Sıfırdan tasarlanarak canlıya alınan kurumsal iç sistem. İnsan Kaynakları için izin takip akışı ve entegre kullanıcı yönetim modülü.',
    tags: ['Fullstack', 'React', 'Spring Boot', 'Docker'],
  },
]

export type Education = { degree: string; school: string; period: string; detail: string }

export const education: Education[] = [
  {
    degree: 'Yüksek Lisans — Yönetim Bilişim Sistemleri',
    school: 'Gazi Üniversitesi',
    period: '2024 — 2025',
    detail: 'GANO: 3,35 / 4,00',
  },
  {
    degree: 'Lisans — Bilgisayar Mühendisliği',
    school: 'Gazi Üniversitesi',
    period: '2018 — 2022',
    detail: 'GANO: 2,81 / 4,00',
  },
  {
    degree: 'Lise — Kernek Anadolu Lisesi',
    school: 'Malatya',
    period: '2012 — 2016',
    detail: 'Mezuniyet Puanı: 83 / 100',
  },
]

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  readingTime: string
  tag: string
  cover: string
  content: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'spring-boot-mikroservis-mimarisi',
    title: 'Spring Boot ile Ölçeklenebilir Mikroservis Mimarisi',
    excerpt:
      'Ulusal ölçekli bir sistemde mikroservisleri nasıl sınırlandırdığımı, servisler arası iletişimi ve dayanıklılık desenlerini anlatıyorum.',
    date: '2026-05-12',
    readingTime: '7 dk',
    tag: 'Backend',
    cover: 'from-cyan-500/30 to-blue-600/30',
    content: [
      'Mikroservis mimarisi, doğru sınırlarla kurgulandığında ekiplere bağımsız geliştirme ve dağıtım özgürlüğü verir. TAKBİS modernizasyonunda en çok zorlandığımız konu, servis sınırlarını domain odaklı (DDD) belirlemekti.',
      'Servisler arası iletişimde senkron REST çağrıları ile asenkron mesajlaşma arasındaki dengeyi kurmak kritikti. Kullanıcının anlık geri bildirim beklediği akışlarda REST, arka planda yürüyen iş süreçlerinde ise event tabanlı yaklaşım tercih ettik.',
      'Dayanıklılık için circuit breaker, timeout ve retry desenleri uyguladık. Bir servisin yavaşlaması tüm sistemi kilitlememeli; hata izolasyonu mikroservislerin en büyük vaadi ve en büyük sorumluluğudur.',
      'Sonuç olarak: küçük başlayın, sınırları veriyle doğrulayın ve gözlemlenebilirliği (logging, tracing, metrics) ilk günden mimariye dahil edin.',
    ],
  },
  {
    slug: 'jwt-ile-guvenli-kimlik-dogrulama',
    title: 'JWT ile Güvenli Kimlik Doğrulama Katmanı Tasarımı',
    excerpt:
      'Spring Security + JWT ile stateless kimlik doğrulama kurarken access/refresh token stratejisi ve yaygın güvenlik tuzakları.',
    date: '2026-04-03',
    readingTime: '6 dk',
    tag: 'Güvenlik',
    cover: 'from-violet-500/30 to-fuchsia-600/30',
    content: [
      'JWT, stateless kimlik doğrulama için güçlü bir araçtır; ancak yanlış kullanıldığında ciddi güvenlik açıkları doğurur. Temel kural: access token kısa ömürlü, refresh token ise güvenli saklanan ve döndürülebilir olmalı.',
      'Spring Security ile bir filtre zinciri kurarak gelen her isteğin token doğrulamasından geçmesini sağladık. İmza algoritması olarak HS256 yerine asimetrik RS256 tercih etmek, anahtar yönetimini esnekleştirir.',
      'En sık karşılaşılan hata, hassas verileri token payload içinde taşımaktır. JWT imzalıdır ama şifreli değildir; payload herkes tarafından okunabilir.',
      'Token iptali için bir blacklist veya kısa ömür + refresh rotasyonu stratejisi şarttır. Güvenlik, tek bir önlemle değil, katmanlı savunma ile sağlanır.',
    ],
  },
  {
    slug: 'nextjs-performans-optimizasyonu',
    title: "Next.js'te Gerçek Dünya Performans Optimizasyonu",
    excerpt:
      'Sunucu bileşenleri, görüntü optimizasyonu ve akıllı önbellekleme ile kullanıcı arayüzlerini nasıl hızlandırdığım.',
    date: '2026-02-18',
    readingTime: '5 dk',
    tag: 'Frontend',
    cover: 'from-emerald-500/30 to-teal-600/30',
    content: [
      'Performans bir özellik değil, kullanıcı deneyiminin temelidir. Next.js App Router ile sunucu bileşenlerini varsayılan tutmak, istemciye gönderilen JavaScript miktarını ciddi şekilde azaltır.',
      'Görüntüler genelde en büyük yük kaynağıdır. next/image ile otomatik boyutlandırma, modern formatlar ve lazy loading kullanmak ilk yükleme süresini dramatik biçimde iyileştirir.',
      'Veri çekiminde önbellekleme stratejisini bilinçli seçmek gerekir: statik içerik için tam önbellek, sık değişen veriler için revalidation, kullanıcıya özel veriler için ise dinamik render.',
      'Ölçmeden optimize etmeyin. Lighthouse ve Web Vitals metriklerini CI sürecine ekleyerek regresyonları erkenden yakalayın.',
    ],
  },
  {
    slug: 'docker-ci-cd-akisi',
    title: 'Docker ve CI/CD ile Sorunsuz Dağıtım Akışı',
    excerpt:
      'Konteynerleştirmeden otomatik dağıtıma; geliştirme ortamını üretime taşıyan tekrarlanabilir bir pipeline kurmak.',
    date: '2026-01-09',
    readingTime: '6 dk',
    tag: 'DevOps',
    cover: 'from-amber-500/30 to-orange-600/30',
    content: [
      '"Benim makinemde çalışıyordu" cümlesini tarihe gömmenin yolu konteynerleştirmedir. Docker ile uygulamayı, bağımlılıklarını ve çalışma ortamını tek bir taşınabilir imajda paketleriz.',
      'Çok aşamalı (multi-stage) build kullanmak, üretim imajını minimal ve güvenli tutar. Derleme araçları nihai imaja taşınmaz; yalnızca çalışması için gerekenler kalır.',
      'CI/CD pipeline; her commit’te test, build ve imaj üretimini otomatikleştirir. İnsan müdahalesi azaldıkça hata da azalır, dağıtım hızı artar.',
      'Hedef: kod birleştirildiği andan üretime ulaşana kadar her adımın tekrarlanabilir, izlenebilir ve geri alınabilir olması.',
    ],
  },
]
