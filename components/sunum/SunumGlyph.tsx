/**
 * Görsel slaytların yer tutucu simgeleri — hepsi satır içi SVG.
 *
 * Ürün kararı (§7): MVP'de ücretli görsel üretimi YOK. Görsel gerektiğinde
 * ikon/şekil tabanlı grafikler kullanılır; kullanıcı istediğinde kendi görselini
 * yükleyip bu yer tutucunun yerine koyar.
 */

import type { SlideGlyph } from '@/lib/sunum/types'

const PATHS: Record<SlideGlyph, JSX.Element> = {
  idea: (
    <>
      <path d="M32 10a16 16 0 00-9 29.2V45a3 3 0 003 3h12a3 3 0 003-3v-5.8A16 16 0 0032 10z" />
      <path d="M26 54h12M28 60h8" />
    </>
  ),
  chart: (
    <>
      <path d="M10 54h44" />
      <path d="M18 54V34M30 54V20M42 54V28M52 54V40" />
    </>
  ),
  users: (
    <>
      <circle cx="24" cy="24" r="8" />
      <circle cx="43" cy="27" r="6.5" />
      <path d="M10 52a14 14 0 0128 0M38 52a12 12 0 0116-9.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="32" cy="32" r="8" />
      <path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5" />
    </>
  ),
  shield: (
    <>
      <path d="M32 8l20 7v16c0 12-8 21-20 25-12-4-20-13-20-25V15l20-7z" />
      <path d="M24 32l6 6 12-12" />
    </>
  ),
  cloud: (
    <>
      <path d="M20 46a11 11 0 01-1-21.9A15 15 0 0147 26.5 10 10 0 0146 46H20z" />
      <path d="M32 36v14M26 44l6 6 6-6" />
    </>
  ),
  code: (
    <>
      <path d="M22 22L10 32l12 10M42 22l12 10-12 10" />
      <path d="M36 16L28 48" />
    </>
  ),
  target: (
    <>
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="32" r="11" />
      <circle cx="32" cy="32" r="3" />
    </>
  ),
  clock: (
    <>
      <circle cx="32" cy="32" r="21" />
      <path d="M32 18v14l10 6" />
    </>
  ),
  book: (
    <>
      <path d="M12 14h16a6 6 0 016 6v30a6 6 0 00-6-6H12V14z" />
      <path d="M52 14H36a6 6 0 00-6 6v30a6 6 0 016-6h16V14z" />
    </>
  ),
  growth: (
    <>
      <path d="M10 46l13-13 8 8 13-15" />
      <path d="M34 26h10v10" />
      <path d="M10 54h44" />
    </>
  ),
  money: (
    <>
      <circle cx="32" cy="32" r="20" />
      <path d="M32 19v26" />
      <path d="M39 25h-9a5 5 0 000 10h4a5 5 0 010 10h-9" />
    </>
  ),
  warning: (
    <>
      <path d="M32 11L55 51H9L32 11z" />
      <path d="M32 26v12M32 44v.5" />
    </>
  ),
  check: (
    <>
      <circle cx="32" cy="32" r="20" />
      <path d="M22 32l7 7 14-15" />
    </>
  ),
  search: (
    <>
      <circle cx="28" cy="28" r="15" />
      <path d="M39 39l13 13" />
    </>
  ),
  globe: (
    <>
      <circle cx="32" cy="32" r="20" />
      <path d="M12 32h40" />
      <path d="M32 12c6 6 9 13 9 20s-3 14-9 20c-6-6-9-13-9-20s3-14 9-20z" />
    </>
  ),
  rocket: (
    <>
      <path d="M32 8c8 7 12 16 12 26l-6 8H26l-6-8c0-10 4-19 12-26z" />
      <circle cx="32" cy="27" r="4.5" />
      <path d="M26 42l-6 8 8-2M38 42l6 8-8-2" />
    </>
  ),
  network: (
    <>
      <circle cx="32" cy="14" r="5.5" />
      <circle cx="14" cy="48" r="5.5" />
      <circle cx="50" cy="48" r="5.5" />
      <path d="M32 20v12M32 32L16 43M32 32l16 11" />
    </>
  ),
  database: (
    <>
      <ellipse cx="32" cy="17" rx="18" ry="7" />
      <path d="M14 17v30c0 3.9 8.1 7 18 7s18-3.1 18-7V17" />
      <path d="M14 32c0 3.9 8.1 7 18 7s18-3.1 18-7" />
    </>
  ),
  mobile: (
    <>
      <rect x="20" y="8" width="24" height="48" rx="5" />
      <path d="M29 15h6M32 48v.5" />
    </>
  ),
  energy: (
    <>
      <path d="M35 8L17 36h12l-4 20 20-30H33l2-18z" />
    </>
  ),
  health: (
    <>
      <path d="M32 52S12 40 12 26a11 11 0 0120-6 11 11 0 0120 6c0 14-20 26-20 26z" />
      <path d="M20 31h7l3-5 4 10 3-5h7" />
    </>
  ),
  leaf: (
    <>
      <path d="M50 12C28 12 16 23 16 38a14 14 0 0014 14c15 0 20-13 20-40z" />
      <path d="M14 54c8-12 16-20 26-26" />
    </>
  ),
  lock: (
    <>
      <rect x="14" y="28" width="36" height="24" rx="5" />
      <path d="M23 28v-6a9 9 0 0118 0v6" />
      <path d="M32 38v5" />
    </>
  ),
  message: (
    <>
      <path d="M52 40a5 5 0 01-5 5H24L12 54V17a5 5 0 015-5h30a5 5 0 015 5v23z" />
      <path d="M22 24h20M22 33h13" />
    </>
  ),
  star: (
    <>
      <path d="M32 9l7.2 14.6 16.1 2.3-11.6 11.4 2.7 16L32 45.7 17.6 53.3l2.7-16L8.7 25.9l16.1-2.3L32 9z" />
    </>
  ),
  calendar: (
    <>
      <rect x="10" y="15" width="44" height="39" rx="5" />
      <path d="M10 27h44M22 10v10M42 10v10" />
      <path d="M22 38h6M36 38h6" />
    </>
  ),
  layers: (
    <>
      <path d="M32 9L9 21l23 12 23-12L32 9z" />
      <path d="M9 33l23 12 23-12" />
      <path d="M9 44l23 11 23-11" />
    </>
  ),
  flask: (
    <>
      <path d="M26 8v16L12 48a5 5 0 004.4 7h31.2A5 5 0 0052 48L38 24V8" />
      <path d="M22 8h20" />
      <path d="M19 38h26" />
    </>
  ),
  scale: (
    <>
      <path d="M32 12v40M20 52h24" />
      <path d="M12 24h40M12 24l-6 13a7 7 0 0012 0l-6-13zM52 24l-6 13a7 7 0 0012 0l-6-13z" />
      <path d="M32 18l-20 6M32 18l20 6" />
    </>
  ),
}

export default function SunumGlyph({ name, className }: { name: SlideGlyph; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.idea}
    </svg>
  )
}
