/**
 * CV içinde kullanılan minik çizgi ikonları. Tamamı inline SVG'dir:
 * dış ikon paketi, font ya da ağ isteği yoktur; PDF çıktısında vektörel kalır.
 */

export type CvIconName =
  | 'mail'
  | 'phone'
  | 'pin'
  | 'globe'
  | 'linkedin'
  | 'github'
  | 'calendar'
  | 'flag'
  | 'car'
  | 'shield'
  | 'link'

const PATHS: Record<CvIconName, JSX.Element> = {
  mail: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 006.5 6.5L17 13l4 1.5v3a2 2 0 01-2.2 2A17.5 17.5 0 013.2 5.2 2 2 0 015.2 3z" />,
  pin: (
    <>
      <path d="M12 21s7-5.7 7-11a7 7 0 10-14 0c0 5.3 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.6 3.9 6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-6-3.9-9S9.4 5.6 12 3z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10.5V17M7.5 7.4v.1M11.5 17v-3.6a2.1 2.1 0 014.2 0V17" />
    </>
  ),
  github: <path d="M9 19.5c-4 1.2-4-2.2-5.5-2.7m11 5v-3.4c0-1 .1-1.4-.5-2 2.5-.3 4.8-1.3 4.8-5.4a4.2 4.2 0 00-1.1-2.9 3.9 3.9 0 00-.1-2.9s-.9-.3-3 1.1a10.3 10.3 0 00-5.4 0C7.1 4.4 6.2 4.7 6.2 4.7a3.9 3.9 0 00-.1 2.9A4.2 4.2 0 005 10.5c0 4.1 2.3 5.1 4.8 5.4-.6.6-.6 1.2-.5 2v3.9" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  flag: <path d="M5 21V4m0 0h11l-2 3.5L16 11H5" />,
  car: (
    <>
      <path d="M4 16v2.5M20 16v2.5M3 15.5h18v-3l-1.8-4.2A2 2 0 0017.4 7H6.6a2 2 0 00-1.8 1.3L3 12.5z" />
      <path d="M6.5 12.2h11" />
    </>
  ),
  shield: <path d="M12 3l7.5 3v5.5c0 4.3-3.1 8.1-7.5 9.5-4.4-1.4-7.5-5.2-7.5-9.5V6z" />,
  link: <path d="M10.5 13.5a4 4 0 005.7 0l2.6-2.6a4 4 0 10-5.7-5.7l-1.3 1.3M13.5 10.5a4 4 0 00-5.7 0l-2.6 2.6a4 4 0 005.7 5.7l1.3-1.3" />,
}

export default function CvIcon({ name, className }: { name: CvIconName; className?: string }) {
  return (
    <svg
      className={className ?? 'cv-ic'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
