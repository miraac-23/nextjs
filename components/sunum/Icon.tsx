/**
 * Modülün ikon giriş noktası (§13).
 *
 * Kural: emoji yok, tek bir çizim dili var. Tüm ikonlar 24×24 kutuda, 1.8
 * kalınlıkta, yuvarlak uçlu çizgilerle — projenin mevcut seti (components/cv/UiIcon)
 * ile aynı ağırlık. Sette olmayan birkaç ikon burada AYNI kurallarla tanımlandı;
 * böylece ikinci bir ikon kütüphanesi eklemeye gerek kalmadı.
 *
 * Boyut da burada veriliyor: UiIcon SVG'ye ölçü yazmaz, ölçüyü CSS'ten bekler.
 * Bu modül cv.css'i içe aktarmadığı için varsayılan sınıfı biz koyuyoruz.
 */

import UiIcon, { type UiIconName } from '@/components/cv/UiIcon'

/** Projenin setinde olmayan, bu modülün ihtiyaç duyduğu ikonlar. */
const EXTRA = {
  code: <path d="M9 8l-5 4 5 4M15 8l5 4-5 4M13 5l-2 14" />,
  play: <path d="M7 4.5l13 7.5-13 7.5z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  bars: <path d="M4 20V10M10 20V4M16 20v-7M22 20h-2" />,
  wand: <path d="M4 20l9-9M14.5 4.5l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3L10 9l3.3-1.2zM19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />,
  compress: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  sliders: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M15 4v6M8 14v6" />,
  book: (
    <>
      <path d="M4 5.5h6a2.5 2.5 0 012.5 2.5v11A2.2 2.2 0 0010.4 18H4z" />
      <path d="M20 5.5h-6A2.5 2.5 0 0011.5 8v11A2.2 2.2 0 0113.6 18H20z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  undo: (
    <>
      <path d="M4 9h11a5 5 0 010 10h-6" />
      <path d="M8 5L4 9l4 4" />
    </>
  ),
  redo: (
    <>
      <path d="M20 9H9a5 5 0 000 10h6" />
      <path d="M16 5l4 4-4 4" />
    </>
  ),
} as const

type ExtraName = keyof typeof EXTRA
export type IconName = UiIconName | ExtraName

export type { UiIconName }

const DEFAULT_CLASS = 'h-4 w-4 flex-shrink-0'

function isExtra(name: IconName): name is ExtraName {
  return Object.prototype.hasOwnProperty.call(EXTRA, name)
}

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  if (isExtra(name)) {
    return (
      <svg
        className={className ?? DEFAULT_CLASS}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {EXTRA[name]}
      </svg>
    )
  }
  return <UiIcon name={name} className={className ?? DEFAULT_CLASS} />
}
