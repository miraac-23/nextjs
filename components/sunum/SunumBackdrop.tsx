/**
 * Modül sayfalarının dekoratif arka planı: ince ızgara, iki yumuşak ışıma ve
 * 16:9 slayt çerçevelerini anıştıran hafif bir motif. Tamamı inline SVG/CSS —
 * dış görsel ya da ağ isteği yok. Tıklama almaz, ekran okuyuculardan gizlidir.
 *
 * Stilleri app/sunum/sunum.css içinde (.sn-backdrop*). CV Stüdyosu'nun arka planı
 * yeniden kullanılmadı: o dosyanın tamamını (3000+ satır) bu modüle taşımak
 * gereksiz bir bağımlılık olurdu.
 */

/** Motif: köşesinde vurgu şeridi olan bir slayt çerçevesi ve metin satırları. */
function Frame({ x, y, rotate = 0, scale = 1 }: { x: number; y: number; rotate?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <rect width="160" height="90" rx="6" fill="var(--snb-sheet)" stroke="var(--snb-line)" strokeWidth="2" />
      <rect x="14" y="16" width="34" height="5" rx="2.5" fill="var(--snb-accent)" />
      <rect x="14" y="30" width="96" height="5" rx="2.5" fill="var(--snb-line)" opacity="0.75" />
      <rect x="14" y="42" width="112" height="5" rx="2.5" fill="var(--snb-line)" opacity="0.6" />
      <rect x="14" y="54" width="72" height="5" rx="2.5" fill="var(--snb-line)" opacity="0.6" />
      <rect x="14" y="70" width="22" height="8" rx="2" fill="var(--snb-line)" opacity="0.5" />
      <rect x="42" y="66" width="22" height="12" rx="2" fill="var(--snb-accent)" opacity="0.7" />
      <rect x="70" y="72" width="22" height="6" rx="2" fill="var(--snb-line)" opacity="0.5" />
    </g>
  )
}

export default function SunumBackdrop() {
  return (
    <div className="sn-backdrop" aria-hidden="true">
      <div className="sn-backdrop-grid" />
      <div className="sn-backdrop-glow a" />
      <div className="sn-backdrop-glow b" />

      <svg className="sn-backdrop-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Motif merkeze doğru eritilir; içerik alanı okunur kalır. */}
          <radialGradient id="snbFade" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
          <mask id="snbMask">
            <rect width="1440" height="900" fill="url(#snbFade)" />
          </mask>
        </defs>
        <g mask="url(#snbMask)">
          <Frame x={56} y={120} rotate={-7} scale={1.05} />
          <Frame x={1190} y={190} rotate={8} scale={0.95} />
          <Frame x={130} y={620} rotate={5} scale={0.85} />
          <Frame x={1120} y={640} rotate={-6} scale={1} />
        </g>
      </svg>
    </div>
  )
}
