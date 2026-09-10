/** Araç arayüzünün ikon seti — hepsi inline SVG, dış paket yok. */

export type UiIconName =
  | 'check' | 'chevron' | 'plus' | 'trash' | 'up' | 'down' | 'grip'
  | 'eye' | 'eyeOff' | 'search' | 'expand' | 'download' | 'upload'
  | 'refresh' | 'user' | 'briefcase' | 'cap' | 'spark' | 'globe'
  | 'folder' | 'badge' | 'trophy' | 'heart' | 'users' | 'left' | 'right'
  | 'x' | 'palette' | 'layout' | 'printer' | 'shield' | 'pencil' | 'pageBreak'

const P: Record<UiIconName, JSX.Element> = {
  check: <path d="M4.5 12.5l5 5 10-11" />,
  chevron: <path d="M6 9.5l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13M10.5 11v5M13.5 11v5" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  grip: <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" strokeWidth="2.4" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: <path d="M4 4l16 16M10 5.9a9.3 9.3 0 012-.4c6 0 9.5 6.5 9.5 6.5a15.8 15.8 0 01-3.4 4.1M6.4 7.6A15.6 15.6 0 002.5 12S6 18.5 12 18.5c1.3 0 2.4-.3 3.4-.7M9.9 9.9a3 3 0 004.2 4.2" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />,
  download: <path d="M12 3v12M7.5 10.5L12 15l4.5-4.5M4.5 20h15" />,
  upload: <path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M4.5 20h15" />,
  refresh: <path d="M20 11a8 8 0 10-1.5 5.5M20 20v-5h-5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V6a2 2 0 012-2h3a2 2 0 012 2v1.5M3 13h18" />
    </>
  ),
  cap: <path d="M12 4l9.5 4.5L12 13 2.5 8.5 12 4zM6.5 10.8V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-5.2" />,
  spark: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5zM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.5 3.6 8.5S14.4 18.1 12 20.5c-2.4-2.4-3.6-5.5-3.6-8.5S9.6 5.9 12 3.5z" />
    </>
  ),
  folder: <path d="M3.5 7a2 2 0 012-2h3.2l2 2.4h7.8a2 2 0 012 2V18a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z" />,
  badge: (
    <>
      <circle cx="12" cy="9.5" r="5" />
      <path d="M8.5 13.8L7 21l5-2.4L17 21l-1.5-7.2" />
    </>
  ),
  trophy: <path d="M7.5 4h9v5a4.5 4.5 0 11-9 0V4zM7.5 5.5H5A2.5 2.5 0 007.5 10M16.5 5.5H19a2.5 2.5 0 01-2.5 4.5M9.5 20h5M12 13.6V20" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0112 8.3a4.1 4.1 0 017.5 2.3C19.5 15.4 12 20 12 20z" />,
  users: (
    <>
      <circle cx="9.5" cy="8.5" r="3.2" />
      <path d="M3.5 19.5a6 6 0 0112 0M16.5 6.2a3.2 3.2 0 010 6M17.5 13.8a6 6 0 013 5.7" />
    </>
  ),
  left: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  right: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 000 17c1.4 0 2-.9 2-1.8 0-1.4-1.2-1.7-1.2-2.9 0-.8.7-1.4 1.6-1.4h1.5a4.6 4.6 0 004.6-4.6c0-3.5-3.6-6.3-8.5-6.3z" />
      <path d="M8 10.5h.01M11.5 8h.01M15 9.5h.01" strokeWidth="2.2" />
    </>
  ),
  layout: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M9.5 4v16M3.5 9.5h6" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V4h10v5M7 18H5.5A2.5 2.5 0 013 15.5v-3A2.5 2.5 0 015.5 10h13a2.5 2.5 0 012.5 2.5v3a2.5 2.5 0 01-2.5 2.5H17" />
      <rect x="7" y="14.5" width="10" height="5.5" rx="1.4" />
    </>
  ),
  shield: <path d="M12 3l7.5 3v5.5c0 4.3-3.1 8.1-7.5 9.5-4.4-1.4-7.5-5.2-7.5-9.5V6z" />,
  pencil: <path d="M4 20l.9-3.8L15.4 5.7a2 2 0 012.9 0l1.5 1.5a2 2 0 010 2.9L9.3 20.6 5.5 21.5z" />,
  // Sayfa başı: üstte biten sayfa, ortada kesik çizgi, altta yeni sayfanın başı
  pageBreak: (
    <>
      <path d="M6.5 9V4.5h11V9M6.5 15v4.5h11V15" />
      <path d="M3 12h3M9 12h2M14 12h2M19 12h2" />
    </>
  ),
}

export default function UiIcon({ name, className }: { name: UiIconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[name]}
    </svg>
  )
}
