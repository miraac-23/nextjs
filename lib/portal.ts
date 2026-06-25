// Portalın tek giriş noktası: otomatik üretilen konular + "yakında" konuları birleştirir.
import { labTopics, labCategories, type LabTopic, type LabCategory } from './lab'
import { comingSoonTopics, comingSoonCategory } from './lab-extra'

export type PortalTopic = Omit<LabTopic, 'category'> & {
  category: string
  comingSoon?: boolean
  planned?: string[]
}
export type PortalCategory = Omit<LabCategory, 'id'> & { id: string }

export const portalCategories: PortalCategory[] = [...labCategories, comingSoonCategory]

export const portalTopics: PortalTopic[] = [...labTopics, ...comingSoonTopics]

// İçeriği hazır (yakında olmayan) konu sayısı — istatistikler için.
export const readyTopicCount = labTopics.length
