// Dile göre içerik demeti. Sadece istemciye taşınması güvenli modülleri içerir
// (lib/lab.ts gibi büyük veri setleri bilinçli olarak dışarıda bırakıldı — bkz. lib/works.en.ts).
import { profile, socials, stats, skillGroups, experiences, projects, education, blogPosts } from '../data'
import {
  profileEn,
  socialsEn,
  statsEn,
  skillGroupsEn,
  experiencesEn,
  projectsEn,
  educationEn,
  blogPostsEn,
} from '../data.en'
import { presentations } from '../presentations'
import { presentationsEn } from '../presentations.en'
import type { Lang } from './config'

export type Content = {
  profile: typeof profile
  socials: typeof socials
  stats: typeof stats
  skillGroups: typeof skillGroups
  experiences: typeof experiences
  projects: typeof projects
  education: typeof education
  blogPosts: typeof blogPosts
  presentations: typeof presentations
}

export const contentByLang: Record<Lang, Content> = {
  tr: { profile, socials, stats, skillGroups, experiences, projects, education, blogPosts, presentations },
  en: {
    profile: profileEn,
    socials: socialsEn,
    stats: statsEn,
    skillGroups: skillGroupsEn,
    experiences: experiencesEn,
    projects: projectsEn,
    education: educationEn,
    blogPosts: blogPostsEn,
    presentations: presentationsEn,
  },
}

export function getContent(lang: Lang): Content {
  return contentByLang[lang]
}
