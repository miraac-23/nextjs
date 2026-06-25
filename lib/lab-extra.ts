// Hazırlanmakta olan ("yakında") konular. lib/lab.ts otomatik üretildiği için
// bu konular ayrı tutulur ve lib/portal.ts içinde birleştirilir (regen güvenli).
import type { LabExample } from './lab'

export type ComingSoonTopic = {
  id: string
  category: string
  slug: string
  title: string
  summary: string
  source: string
  readme: string
  examples: LabExample[]
  comingSoon: true
  planned: string[]
}

export const comingSoonCategory = {
  id: 'yakinda',
  label: 'Yakında',
  accent: 'from-fuchsia-400 to-pink-500',
  blurb: 'Hazırlanmakta olan yeni konular — içerik çok yakında eklenecek.',
}

export const comingSoonTopics: ComingSoonTopic[] = [
  {
    id: 'yakinda__multi-datasource',
    category: 'yakinda',
    slug: 'multi-datasource',
    title: 'Multi-DataSource (Çoklu Veri Kaynağı)',
    summary:
      'Tek bir Spring Boot uygulamasından birden fazla veritabanına (ör. PostgreSQL + Oracle) aynı anda bağlanma.',
    source: 'yakinda/multi-datasource',
    readme: '',
    examples: [],
    comingSoon: true,
    planned: [
      'Birden çok DataSource tanımı ve @Primary kullanımı',
      'Paket bazlı EntityManager / TransactionManager ayrımı',
      'Repository’lerin doğru veri kaynağına yönlendirilmesi',
      'Dağıtık işlemler ve dikkat edilmesi gerekenler',
    ],
  },
  {
    id: 'yakinda__react',
    category: 'yakinda',
    slug: 'react',
    title: 'React',
    summary:
      'Bileşen tabanlı modern arayüz geliştirme ve Spring Boot REST API’leri ile veri alışverişi.',
    source: 'yakinda/react',
    readme: '',
    examples: [],
    comingSoon: true,
    planned: [
      'JSX, bileşenler, props ve state',
      'Hook’lar: useState, useEffect, useMemo',
      'Bileşen kompozisyonu ve liste render’ı',
      'REST API tüketimi (fetch / axios) ve form yönetimi',
    ],
  },
  {
    id: 'yakinda__kafka',
    category: 'yakinda',
    slug: 'apache-kafka',
    title: 'Apache Kafka',
    summary:
      'Olay tabanlı mimari için dağıtık mesajlaşma: producer/consumer ve Spring Kafka entegrasyonu.',
    source: 'yakinda/apache-kafka',
    readme: '',
    examples: [],
    comingSoon: true,
    planned: [
      'Topic, partition ve offset kavramları',
      'Producer ve consumer yazımı (Spring Kafka)',
      'Consumer group’lar ve ölçeklenme',
      'Serileştirme, hata yönetimi ve yeniden deneme',
    ],
  },
  {
    id: 'yakinda__redis',
    category: 'yakinda',
    slug: 'redis',
    title: 'Redis',
    summary:
      'Bellek-içi veri deposu ile önbellekleme, oturum yönetimi ve Spring Data Redis kullanımı.',
    source: 'yakinda/redis',
    readme: '',
    examples: [],
    comingSoon: true,
    planned: [
      'Önbellekleme (cache) ve @Cacheable',
      'TTL ve önbellek geçersizleştirme stratejileri',
      'Oturum / rate-limit senaryoları',
      'Spring Data Redis ile temel veri yapıları',
    ],
  },
]
