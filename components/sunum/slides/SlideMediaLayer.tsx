/**
 * Slaydın görsel katmanı.
 *
 * Görsel bir slayt TİPİ değil, her slaytın bir özelliğidir (bkz. SlideBase.media).
 * Bu bileşen üç yerleşimi de basar ve hepsi yerleşim ölçü motoruyla uyumludur:
 * `background` içeriğin ARKASINDA durur (yer kaplamaz), `band` ve `inset` yalnızca
 * dikey alan tüketir ve o alan `parts.tsx → mediaHeight` ile gövdeden düşülür.
 *
 * Görsel her zaman gömülü `data:` URL'dir; harici adres şemadan geçmez.
 */

import type { SlideMedia } from '@/lib/sunum/types'

type Props = {
  media: SlideMedia
  /** Gradyan zeminli (hero) slaytta perde rengi ters çevrilir. */
  hero?: boolean
  animate?: boolean
}

/**
 * Odak noktası ve yakınlaştırma `object-position` + `scale` ile uygulanır.
 * Kullanıcı bu iki değeri tarayıcıdan sürükleyerek ayarlıyor; kırpma kararını
 * tarayıcı veriyor, biz sadece odağı söylüyoruz.
 */
function frameStyle(media: SlideMedia): React.CSSProperties {
  return {
    objectFit: media.fit,
    objectPosition: `${media.focusX}% ${media.focusY}%`,
    transform: media.zoom > 1 ? `scale(${media.zoom})` : undefined,
  }
}

export default function SlideMediaLayer({ media, hero = false, animate = false }: Props) {
  const cls = [
    'sn-media',
    `sn-media-${media.placement}`,
    hero ? 'sn-media-hero' : '',
    animate ? 'sn-media-in' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} aria-hidden={media.alt ? undefined : true}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URL; next/image gerekmez */}
      <img src={media.src} alt={media.alt || ''} style={frameStyle(media)} draggable={false} />
      {media.placement === 'background' ? <span className="sn-media-scrim" /> : null}
    </div>
  )
}
