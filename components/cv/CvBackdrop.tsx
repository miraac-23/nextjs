/**
 * CV Stüdyosu sayfasının dekoratif arka planı: ince ızgara, iki yumuşak ışıma
 * ve kâğıt yaprakları anıştıran hafif bir motif. Tamamı inline SVG/CSS'tir —
 * dış görsel ya da ağ isteği yoktur. Tıklama almaz, ekran okuyuculardan gizlidir.
 */

/** Sayfa motifi: köşesi kıvrık bir yaprak ve üstünde metin satırları. */
function Sheet({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 0h74l22 22v118H0z" fill="var(--cvb-sheet)" stroke="var(--cvb-line)" strokeWidth="2" />
      <path d="M74 0v22h22" fill="none" stroke="var(--cvb-line)" strokeWidth="2" />
      <rect x="14" y="42" width="52" height="6" rx="3" fill="var(--cvb-line)" />
      <rect x="14" y="58" width="68" height="5" rx="2.5" fill="var(--cvb-line)" opacity="0.7" />
      <rect x="14" y="70" width="68" height="5" rx="2.5" fill="var(--cvb-line)" opacity="0.7" />
      <rect x="14" y="82" width="44" height="5" rx="2.5" fill="var(--cvb-line)" opacity="0.7" />
      <rect x="14" y="100" width="30" height="5" rx="2.5" fill="var(--cvb-accent)" />
      <rect x="14" y="112" width="58" height="5" rx="2.5" fill="var(--cvb-line)" opacity="0.55" />
    </g>
  )
}

export default function CvBackdrop() {
  return (
    <div className="cvs-backdrop" aria-hidden="true">
      <div className="cvs-backdrop-grid" />
      <div className="cvs-backdrop-glow a" />
      <div className="cvs-backdrop-glow b" />

      <svg className="cvs-backdrop-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Motif merkeze doğru eritilir; içerik alanı okunur kalır. */}
          <radialGradient id="cvbFade" cx="50%" cy="42%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="56%" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
          <mask id="cvbMask">
            <rect width="1440" height="900" fill="url(#cvbFade)" />
          </mask>
        </defs>

        <g mask="url(#cvbMask)">
          <Sheet x={72} y={110} rotate={-8} scale={1.1} />
          <Sheet x={1206} y={150} rotate={7} />
          <Sheet x={120} y={560} rotate={5} scale={0.95} />
          <Sheet x={1250} y={600} rotate={-6} scale={1.05} />
          <Sheet x={660} y={790} rotate={-3} scale={0.8} />
        </g>
      </svg>
    </div>
  )
}
