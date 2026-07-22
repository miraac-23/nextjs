/**
 * AI sağlayıcı markaları — inline SVG (dış kaynak yok, tema uyumlu).
 * Marka renkleri kendi paletlerinden; renksiz olanlar `currentColor` kullanır.
 */

export type AiProviderId =
  | 'ollama' | 'claude' | 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'mistral' | 'custom'

/**
 * Sağlayıcının marka işaretini çizer.
 * @param id Sağlayıcı kimliği; tanınmayan değer "özel gateway" ikonuna düşer
 * @param size Kenar uzunluğu (px), varsayılan 16
 */
export default function AiProviderLogo({ id, size = 16 }: { id: AiProviderId; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const }

  if (id === 'ollama') {
    // Lama (Ollama maskotu) — küçük boyutta okunsun diye sade geometri: iki kulak + baş + göz/burun.
    return (
      <svg {...p} fill="currentColor">
        <path d="M6.6 2.1c.8 0 1.4 1 1.6 2.2.1.8.1 1.6 0 2.3-.5.4-.9.9-1.2 1.5-.5-.7-.9-1.7-1.1-2.7-.3-1.7-.1-3.3.7-3.3zM17.4 2.1c.8 0 1 1.6.7 3.3-.2 1-.6 2-1.1 2.7-.3-.6-.7-1.1-1.2-1.5-.1-.7-.1-1.5 0-2.3.2-1.2.8-2.2 1.6-2.2z" />
        {/* Gövde + gözler/burun tek yolda: evenodd ile KESİT olurlar, böylece arka plan
            rengi ne olursa olsun (koyu/açık tema, seçili pill) doğru görünür. */}
        <path
          fillRule="evenodd"
          d="M12 6.4c-3.4 0-6.1 2.4-6.1 5.6v4.3c0 .8-.3 1.5-.8 2.1-.5.6-.7 1.2-.7 1.8 0 1 .8 1.7 1.9 1.7h11.4c1.1 0 1.9-.7 1.9-1.7 0-.6-.2-1.2-.7-1.8-.5-.6-.8-1.3-.8-2.1V12c0-3.2-2.7-5.6-6.1-5.6z
             M8.55 11.6a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0
             M13.15 11.6a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0
             M9.3 17a2.7 1.8 0 1 0 5.4 0a2.7 1.8 0 1 0 -5.4 0"
        />
      </svg>
    )
  }

  if (id === 'claude') {
    // Claude ışıma (asterisk) işareti.
    return (
      <svg {...p} fill="#D97757">
        <path d="M12 1.6l1.35 6.02 4.3-4.36-2.5 5.65 5.9-1.6-5.12 3.4 6.07 1.3-6.07 1.28 5.12 3.4-5.9-1.6 2.5 5.66-4.3-4.36L12 22.4l-1.35-6.02-4.3 4.36 2.5-5.65-5.9 1.6 5.12-3.4L2 11.99l6.07-1.28-5.12-3.4 5.9 1.6-2.5-5.65 4.3 4.36L12 1.6z" />
      </svg>
    )
  }

  if (id === 'gemini') {
    // Gemini dört uçlu yıldız (içbükey kenarlı).
    return (
      <svg {...p}>
        <defs>
          <linearGradient id="pcr-gemini" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4796E3" />
            <stop offset="0.5" stopColor="#9177C7" />
            <stop offset="1" stopColor="#D96570" />
          </linearGradient>
        </defs>
        <path fill="url(#pcr-gemini)" d="M12 1.5c0 5.8 4.7 10.5 10.5 10.5C16.7 12 12 16.7 12 22.5 12 16.7 7.3 12 1.5 12 7.3 12 12 7.3 12 1.5z" />
      </svg>
    )
  }

  if (id === 'mistral') {
    // Mistral piksel ızgarası (sarıdan kırmızıya sıcak palet).
    const c = ['#FFD800', '#FFAF00', '#FF8205', '#FA500F', '#E10500']
    const cell = 4.4
    const x0 = 1.2
    const y0 = 1.2
    // [satır][sütun] → renk indeksi; null = boş
    const grid: (number | null)[][] = [
      [0, null, null, null, 0],
      [1, 1, null, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, null, 3, 3],
      [4, 4, null, null, 4],
    ]
    return (
      <svg {...p}>
        {grid.map((row, r) =>
          row.map((v, k) =>
            v == null ? null : (
              <rect key={`${r}-${k}`} x={x0 + k * cell} y={y0 + r * cell} width={cell} height={cell} fill={c[v]} />
            ),
          ),
        )}
      </svg>
    )
  }

  if (id === 'groq') {
    // Groq: marka renginde daire içinde "G".
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="10.5" fill="#F55036" />
        <path fill="#fff" d="M12.3 6.2c-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8c1.2 0 2.2-.4 3-1v1.6c0 .6-.5 1.1-1.1 1.1h-1.9v2h1.9c1.7 0 3.1-1.4 3.1-3.1V12c0-3.2-2.6-5.8-5.8-5.8zm0 9.6c-2.1 0-3.8-1.7-3.8-3.8s1.7-3.8 3.8-3.8 3.8 1.7 3.8 3.8-1.7 3.8-3.8 3.8z" />
      </svg>
    )
  }

  if (id === 'cerebras') {
    // Cerebras: yonga/ızgara motifi (wafer-scale çip çağrışımı).
    return (
      <svg {...p} fill="none" stroke="#F04E23" strokeWidth="1.6">
        <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" />
        <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="#F04E23" stroke="none" />
        <g strokeLinecap="round">
          <path d="M9 2.6v2.9M12 2.6v2.9M15 2.6v2.9M9 18.5v2.9M12 18.5v2.9M15 18.5v2.9" />
          <path d="M2.6 9h2.9M2.6 12h2.9M2.6 15h2.9M18.5 9h2.9M18.5 12h2.9M18.5 15h2.9" />
        </g>
      </svg>
    )
  }

  if (id === 'openrouter') {
    // OpenRouter: iki girişten tek çıkışa yönlendirme (router) motifi.
    return (
      <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 7.5h4l4 4.5h5" />
        <path d="M2.5 16.5h4l4-4.5" />
        <circle cx="4" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
        <circle cx="4" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
        <path d="M15.5 8.5l4 3.5-4 3.5z" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  // custom — OpenAI uyumlu özel gateway
  return (
    <svg {...p} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 3.5a4.5 4.5 0 00-5.9 5.9L3.5 14.5a1.8 1.8 0 002.5 2.5l5.1-5.1a4.5 4.5 0 005.9-5.9l-2.6 2.6-2.4-.5-.5-2.4 2.6-2.6z" />
      <circle cx="6" cy="18" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
