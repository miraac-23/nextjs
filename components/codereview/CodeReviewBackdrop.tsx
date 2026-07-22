/**
 * Code Review sayfasının dekoratif arka planı: ince ızgara, iki yumuşak ışıma ve
 * diff satırlarını andıran kod motifi. Tamamen inline SVG/CSS — dış kaynak yok.
 * Tıklama almaz, ekran okuyuculardan gizlidir.
 */

/** Bir "kod bloğu": değişken genişlikte satırlar; bazıları eklenmiş (+) / silinmiş (−) işaretli. */
function CodeBlock({ x, y, scale = 1, rows }: { x: number; y: number; scale?: number; rows: [number, 0 | 1 | -1][] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {rows.map(([w, kind], i) => {
        const ty = i * 16
        const fill = kind === 1 ? 'var(--pcr-add)' : kind === -1 ? 'var(--pcr-del)' : 'var(--pcr-line)'
        return (
          <g key={i}>
            {kind !== 0 && <rect x={0} y={ty} width={7} height={7} rx={2} fill={fill} opacity={0.9} />}
            <rect x={14} y={ty} width={w} height={7} rx={3.5} fill={fill} />
          </g>
        )
      })}
    </g>
  )
}

/**
 * Sayfanın arkasına sabitlenen dekoratif katmanı çizer: ızgara + iki ışıma + kod motifi.
 * Motif, içeriğin okunmasını engellememesi için radial maske ile merkezden eritilir.
 */
export default function CodeReviewBackdrop() {
  return (
    <div className="pcr-backdrop" aria-hidden="true">
      <div className="pcr-backdrop-grid" />
      <div className="pcr-backdrop-glow a" />
      <div className="pcr-backdrop-glow b" />

      <svg className="pcr-backdrop-code" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Motif kenarlara doğru eritilir; içerik alanı okunur kalır. */}
          <radialGradient id="pcrFade" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="58%" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
          <mask id="pcrMask">
            <rect width="1440" height="900" fill="url(#pcrFade)" />
          </mask>
        </defs>

        <g mask="url(#pcrMask)">
          <CodeBlock x={40} y={90} scale={1.15} rows={[[120, 0], [86, 1], [140, 0], [64, -1], [104, 0], [78, 0]]} />
          <CodeBlock x={1180} y={140} scale={1} rows={[[96, 0], [130, 0], [72, 1], [110, 0], [58, 0]]} />
          <CodeBlock x={90} y={560} scale={0.92} rows={[[84, 0], [126, -1], [70, 0], [98, 1], [60, 0]]} />
          <CodeBlock x={1230} y={620} scale={1.08} rows={[[110, 0], [68, 0], [92, 1], [124, 0]]} />
          <CodeBlock x={640} y={780} scale={0.8} rows={[[140, 0], [92, 0], [116, -1]]} />

          {/* köşelerde ince süslemeler: kod parantezleri */}
          <g fill="none" stroke="var(--pcr-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
            <path d="M330 210 l-26 26 26 26" />
            <path d="M392 210 l26 26 -26 26" />
            <path d="M1010 700 l-22 22 22 22" />
            <path d="M1062 700 l22 22 -22 22" />
          </g>
        </g>
      </svg>
    </div>
  )
}
