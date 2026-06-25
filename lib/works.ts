import { labTopics } from './lab'

export type Work = {
  slug: string
  href: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  cover: string
  badge: string
  stats: { value: string; label: string }[]
}

export const works: Work[] = [
  {
    slug: 'java-spring-egitim-portali',
    href: '/calismalar/java-spring-egitim-portali',
    title: 'Java & Spring İnteraktif Eğitim Portalı',
    subtitle: 'Tarayıcıda çalışan eğitim laboratuvarı',
    description:
      "Java'dan Spring Boot'a kapsamlı bir eğitim çalışması. Orijinali React + Spring Boot backend ile kodu canlı çalıştırıyordu; bu sürümde tüm anlatımları ve örnekleri frontend'e taşıdım — JVM olmadan, her örneğin çıktısı önceden hazırlanmış olarak gösteriliyor.",
    tags: ['Java', 'Spring', 'Spring Boot', 'Next.js', 'İnteraktif'],
    cover: 'from-amber-500/30 via-orange-500/20 to-cyan-600/30',
    badge: 'İnteraktif Portal',
    stats: [
      { value: `${labTopics.length}+`, label: 'Konu' },
      { value: '5', label: 'Kategori' },
      { value: 'Gerçek', label: 'JVM Çıktısı' },
    ],
  },
]
