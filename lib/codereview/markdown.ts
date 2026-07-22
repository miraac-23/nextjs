// Küçük, bağımsız Markdown → HTML dönüştürücü (harici bağımlılık yok).
// Güvenlik: tüm girdi önce HTML-escape edilir; ardından yalnızca bilinen md desenleri
// güvenli HTML'e çevrilir. Ham HTML enjeksiyonu mümkün değildir.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Satır içi biçimlendirme: **kalın**, *italik*, `kod`, [metin](url). Girdi zaten escape'li. */
function inline(text: string): string {
  let s = text
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  // [metin](url) — yalnızca güvenli şemalar
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const safe = /^(https?:|mailto:|#|\/)/i.test(href.trim())
    return safe ? `<a href="${href.trim()}" target="_blank" rel="noopener noreferrer">${label}</a>` : label
  })
  return s
}

/** Markdown metnini güvenli HTML'e çevirir. */
export function renderMarkdown(md: string): string {
  const lines = esc(md ?? '').split('\n')
  const out: string[] = []
  let i = 0
  let inCode = false
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null } }

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.replace(/\s+$/, '')

    // Kod bloğu ``` ... ```
    const fence = line.trim().match(/^```/)
    if (fence) {
      if (inCode) { out.push('</code></pre>'); inCode = false }
      else { closeList(); out.push('<pre><code>'); inCode = true }
      i++; continue
    }
    if (inCode) { out.push(raw); i++; continue }

    // Boş satır
    if (line.trim() === '') { closeList(); i++; continue }

    // Başlık # .. ######
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) { closeList(); const lv = h[1].length; out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue }

    // Yatay çizgi
    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) { closeList(); out.push('<hr />'); i++; continue }

    // Alıntı
    const bq = line.match(/^>\s?(.*)$/)
    if (bq) { closeList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); i++; continue }

    // Tablo satırı |...|...| (ayraç satırını atla)
    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList()
      const rows: string[][] = []
      let hasHeader = false
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        const cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) { hasHeader = rows.length === 1; i++; continue }
        rows.push(cells); i++
      }
      out.push('<table>')
      rows.forEach((cells, idx) => {
        const tag = hasHeader && idx === 0 ? 'th' : 'td'
        out.push('<tr>' + cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('') + '</tr>')
      })
      out.push('</table>')
      continue
    }

    // Checklist / madde listesi
    const check = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (check) {
      if (listType !== 'ul') { closeList(); out.push('<ul class="md-check">'); listType = 'ul' }
      const done = check[1].toLowerCase() === 'x'
      out.push(`<li class="${done ? 'done' : 'todo'}"><span class="box">${done ? '☑' : '☐'}</span> ${inline(check[2])}</li>`)
      i++; continue
    }
    const ul = line.match(/^\s*[-*]\s+(.*)$/)
    if (ul) {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul' }
      out.push(`<li>${inline(ul[1])}</li>`); i++; continue
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ol) {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol' }
      out.push(`<li>${inline(ol[1])}</li>`); i++; continue
    }

    // Normal paragraf
    closeList()
    out.push(`<p>${inline(line)}</p>`)
    i++
  }
  closeList()
  if (inCode) out.push('</code></pre>')
  return out.join('\n')
}
