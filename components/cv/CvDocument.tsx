'use client'

/**
 * CV belgesi — seçili şablonun ailesine göre doğru renderer'ı seçen ince dağıtıcı.
 *
 *   design → CvDesignDocument (yan sütun, bant, fotoğraf, göstergeler; kök `.cv-doc.cv-design`)
 *   ats    → CvAtsDocument    (tek sütun, standart font/başlık; kök `.cv-doc.cv-ats`)
 *
 * İki renderer benzer sınıf adları (cv-name, cv-sec, cv-h2…) kullanır; stiller aile
 * sınıfı altında izole edildiği için birbirine sızmaz (app/cv-olustur/cv.css).
 */

import { memo } from 'react'
import { getTemplate, isAtsTemplate } from '@/lib/cv/templates'
import type { CvData, CvSettings } from '@/lib/cv/types'
import { cvText } from '@/lib/cv/ui-text'
import CvAtsDocument from './CvAtsDocument'
import CvDesignDocument from './CvDesignDocument'

type Props = {
  data: CvData
  settings: CvSettings
  /** Galeri kartları gibi etkileşimsiz bağlamlarda `true` — bağlantılar düz metne döner. */
  static?: boolean
}

function CvDocument({ data, settings, static: isStatic }: Props) {
  const tpl = getTemplate(settings.templateId)
  if (isAtsTemplate(tpl)) return <CvAtsDocument data={data} settings={settings} static={isStatic} />
  return <CvDesignDocument data={data} settings={settings} t={cvText(settings.docLang)} static={isStatic} />
}

export default memo(CvDocument)
