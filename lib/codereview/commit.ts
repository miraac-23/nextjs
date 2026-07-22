// Bulguları MR/PR'ın KAYNAK DALINA commit olarak yazar: ilgili satırın ÜSTÜNE `TODO` yorumu ekler.
// Yorum gönderiminden (git.ts → postComment) farklı olarak burada dosya içeriği değiştirilir.
// Akış: MR/PR detayını çek (kaynak dal + kaynak depo) → dosya içeriklerini oku → TODO satırlarını yerleştir →
// tek bir commit ile dala push et. Backend yok; her şey tarayıcıdan REST ile yapılır.

import type { Finding } from './types'
import type { GitAuth, GitTarget } from './git'
import { GIT_PROVIDERS } from './git'

/** Commit'in yazılacağı hedef: kaynak dal + (fork olabileceği için) kaynak depo bilgisi. */
export interface CommitTarget {
  branch: string
  /** gitlab: kaynak projenin sayısal id'si */
  projectId?: string | number
  /** github: kaynak deponun sahibi/adı (fork'ta base'den farklıdır) */
  owner?: string
  repo?: string
  /** bitbucket: "workspace/repo" */
  fullName?: string
}

/** Tek dosya için hazırlanan değişiklik önizlemesi. */
export interface FileEdit {
  path: string
  original: string
  updated: string
  /** eklenen TODO satır sayısı */
  inserted: number
  /** bu dosyada karşılığı bulunan bulgular */
  findings: Finding[]
  /** satır numarası dosya sınırlarını aşan / satırsız bulgular */
  skipped: Finding[]
}

/** Sağlayıcının hata mesajlarında kullanılacak okunur adı. */
const providerName = (p: GitTarget['provider']) => GIT_PROVIDERS.find((x) => x.id === p)?.label ?? p

/**
 * Sağlayıcıya uygun kimlik başlıklarını üretir.
 * Kullanıcı adı verilmişse Basic (GitHub/Bitbucket), aksi halde Bearer kullanılır.
 */
function authHeaders(target: GitTarget, auth: GitAuth): Record<string, string> {
  const t = (auth.token || '').trim()
  const h: Record<string, string> = {}
  if (target.provider === 'github') { h['Accept'] = 'application/vnd.github+json'; h['X-GitHub-Api-Version'] = '2022-11-28' }
  if (!t) return h
  if ((target.provider === 'bitbucket' || target.provider === 'github') && auth.username?.trim()) {
    h['Authorization'] = 'Basic ' + btoa(`${auth.username.trim()}:${t}`)
  } else {
    h['Authorization'] = `Bearer ${t}`
  }
  return h
}

/**
 * Kimlik başlıklarını ekleyerek istek atar; ağ/CORS hatasını okunur bir mesaja çevirir.
 * HTTP durum kodunu DEĞERLENDİRMEZ — bunun için `ensureOk` kullanılır.
 */
async function req(target: GitTarget, url: string, init: RequestInit & { headers?: Record<string, string> }, auth: GitAuth): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: { ...authHeaders(target, auth), ...(init.headers ?? {}) } })
  } catch (e) {
    throw new Error(`${providerName(target.provider)}’a erişilemedi (CORS/erişim engeli olabilir). ` + (e instanceof Error ? e.message : ''))
  }
  return res
}

/** Yazma yetkisi hatalarını okunur mesaja çevirir. */
async function ensureOk(target: GitTarget, res: Response, what: string): Promise<Response> {
  if (res.ok) return res
  const txt = await res.text().catch(() => '')
  let hint = ''
  if (res.status === 401 || res.status === 403) {
    hint = target.provider === 'gitlab'
      ? ' — Commit atmak için tam "api" scope’lu token ve dalda en az Developer yetkisi gerekir.'
      : target.provider === 'github'
        ? ' — Commit atmak için "repo" (contents: write) izinli token gerekir.'
        : ' — App Password’a "Repositories: write" izni verin.'
  }
  if (res.status === 404) hint = ' — kaynak dal/dosya bulunamadı ya da erişim yok.'
  throw new Error(`${what}: ${providerName(target.provider)} ${res.status} ${res.statusText}${hint} ${txt}`.trim().slice(0, 320))
}

/* ============================ yorum sözdizimi ============================ */

type CommentStyle = { line?: string; open?: string; close?: string }

const BY_EXT: Record<string, CommentStyle> = {
  // // tarzı
  js: { line: '//' }, jsx: { line: '//' }, mjs: { line: '//' }, cjs: { line: '//' },
  ts: { line: '//' }, tsx: { line: '//' }, java: { line: '//' }, kt: { line: '//' }, kts: { line: '//' },
  c: { line: '//' }, h: { line: '//' }, cc: { line: '//' }, cpp: { line: '//' }, hpp: { line: '//' }, cxx: { line: '//' },
  cs: { line: '//' }, go: { line: '//' }, rs: { line: '//' }, swift: { line: '//' }, scala: { line: '//' },
  php: { line: '//' }, dart: { line: '//' }, groovy: { line: '//' }, gradle: { line: '//' }, json5: { line: '//' },
  // # tarzı
  py: { line: '#' }, rb: { line: '#' }, sh: { line: '#' }, bash: { line: '#' }, zsh: { line: '#' },
  yml: { line: '#' }, yaml: { line: '#' }, toml: { line: '#' }, ini: { line: '#' }, cfg: { line: '#' }, conf: { line: '#' },
  properties: { line: '#' }, env: { line: '#' }, pl: { line: '#' }, r: { line: '#' }, tf: { line: '#' }, dockerfile: { line: '#' },
  // -- tarzı
  sql: { line: '--' }, lua: { line: '--' }, hs: { line: '--' }, adb: { line: '--' },
  // blok
  css: { open: '/*', close: '*/' }, scss: { line: '//' }, less: { line: '//' },
  html: { open: '<!--', close: '-->' }, htm: { open: '<!--', close: '-->' }, xml: { open: '<!--', close: '-->' },
  xhtml: { open: '<!--', close: '-->' }, jsp: { open: '<!--', close: '-->' }, md: { open: '<!--', close: '-->' },
  vue: { open: '<!--', close: '-->' }, svelte: { open: '<!--', close: '-->' }, hbs: { open: '{{!--', close: '--}}' },
}

/** Dosya uzantısına göre yorum sözdizimi (bilinmiyorsa `#`). */
export function commentStyle(path: string): CommentStyle {
  const base = (path.split('/').pop() ?? '').toLowerCase()
  if (base === 'dockerfile' || base.startsWith('dockerfile.')) return { line: '#' }
  if (base === 'makefile') return { line: '#' }
  const ext = base.includes('.') ? base.split('.').pop()! : ''
  return BY_EXT[ext] ?? { line: '#' }
}

/** Bulguyu (girintiyi koruyarak) TODO yorum satır(lar)ına çevirir. */
export function todoLines(f: Finding, path: string, indent: string): string[] {
  const st = commentStyle(path)
  const src = f.source === 'LLM' ? 'AI' : 'Kural'
  const head = `TODO [${f.severity}] ${f.ruleName} (${src} · Portal Code Review)`
  const parts = [head, f.message.replace(/\s+/g, ' ').trim()]
  if (f.suggestion) parts.push('Öneri: ' + f.suggestion.replace(/\s+/g, ' ').trim())
  if (st.line) return parts.map((p) => `${indent}${st.line} ${p}`)
  return [`${indent}${st.open} ${parts.join(' — ')} ${st.close}`]
}

/* ============================ içerik düzenleme ============================ */

/** Metnin satır sonu türünü korur. */
function eolOf(text: string): string { return /\r\n/.test(text) ? '\r\n' : '\n' }
/** Satırın baştaki girintisi — eklenen TODO yorumu aynı hizada dursun diye. */
function indentOf(line: string): string { return /^[ \t]*/.exec(line)?.[0] ?? '' }

/** Aynı TODO daha önce eklenmişse (yeniden gönderimde) tekrar eklenmesin. */
function alreadyHasTodo(lines: string[], at: number, ruleName: string): boolean {
  for (let i = Math.max(0, at - 6); i < at; i++) {
    if (lines[i]?.includes('Portal Code Review') && lines[i].includes(ruleName)) return true
  }
  return false
}

/**
 * Dosya içeriğine, her bulgunun satırının ÜSTÜNE TODO yorumu ekler.
 * Satır numaraları bozulmasın diye aşağıdan yukarı işlenir.
 */
export function applyTodos(path: string, original: string, findings: Finding[]): FileEdit {
  const eol = eolOf(original)
  const lines = original.split(/\r?\n/)
  const skipped: Finding[] = []
  const usable = findings.filter((f) => {
    const ok = f.line != null && f.line >= 1 && f.line <= lines.length
    if (!ok) skipped.push(f)
    return ok
  })

  // aynı satırdaki bulgular birlikte, satır no'suna göre azalan sırada
  const byLine = new Map<number, Finding[]>()
  for (const f of usable) {
    const arr = byLine.get(f.line!) ?? []
    arr.push(f); byLine.set(f.line!, arr)
  }
  let inserted = 0
  for (const ln of Array.from(byLine.keys()).sort((a, b) => b - a)) {
    const at = ln - 1
    const indent = indentOf(lines[at] ?? '')
    const block: string[] = []
    for (const f of byLine.get(ln)!) {
      if (alreadyHasTodo(lines, at, f.ruleName)) continue
      block.push(...todoLines(f, path, indent))
    }
    if (block.length === 0) continue
    lines.splice(at, 0, ...block)
    inserted += block.length
  }

  return { path, original, updated: lines.join(eol), inserted, findings: usable, skipped }
}

/* ============================ sağlayıcı API'leri ============================ */

/** MR/PR'ın kaynak dalını ve (fork ise) kaynak deposunu bulur. */
export async function resolveCommitTarget(target: GitTarget, auth: GitAuth): Promise<CommitTarget> {
  if (target.provider === 'gitlab') {
    const url = `${target.apiBase}/api/v4/projects/${encodeURIComponent(target.projectPath!)}/merge_requests/${target.id}`
    const res = await ensureOk(target, await req(target, url, {}, auth), 'MR bilgisi okunamadı')
    const d = await res.json()
    if (!d?.source_branch) throw new Error('MR kaynak dalı bulunamadı.')
    return { branch: d.source_branch, projectId: d.source_project_id ?? d.project_id }
  }
  if (target.provider === 'github') {
    const url = `${target.apiBase}/repos/${target.owner}/${target.repo}/pulls/${target.id}`
    const res = await ensureOk(target, await req(target, url, {}, auth), 'PR bilgisi okunamadı')
    const d = await res.json()
    const head = d?.head
    if (!head?.ref) throw new Error('PR kaynak dalı bulunamadı.')
    return { branch: head.ref, owner: head.repo?.owner?.login ?? target.owner, repo: head.repo?.name ?? target.repo }
  }
  const url = `${target.apiBase}/2.0/repositories/${target.workspace}/${target.repo}/pullrequests/${target.id}`
  const res = await ensureOk(target, await req(target, url, {}, auth), 'PR bilgisi okunamadı')
  const d = await res.json()
  const branch = d?.source?.branch?.name
  if (!branch) throw new Error('PR kaynak dalı bulunamadı.')
  return { branch, fullName: d?.source?.repository?.full_name ?? `${target.workspace}/${target.repo}` }
}

/** Kaynak daldaki dosyanın ham içeriğini okur. */
export async function fetchFileContent(target: GitTarget, auth: GitAuth, ct: CommitTarget, path: string): Promise<string> {
  let url: string
  if (target.provider === 'gitlab') {
    url = `${target.apiBase}/api/v4/projects/${ct.projectId}/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ct.branch)}`
  } else if (target.provider === 'github') {
    url = `${target.apiBase}/repos/${ct.owner}/${ct.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ct.branch)}`
  } else {
    url = `${target.apiBase}/2.0/repositories/${ct.fullName}/src/${encodeURIComponent(ct.branch)}/${path.split('/').map(encodeURIComponent).join('/')}`
  }
  const headers = target.provider === 'github' ? { Accept: 'application/vnd.github.raw' } : undefined
  const res = await ensureOk(target, await req(target, url, headers ? { headers } : {}, auth), `Dosya okunamadı (${path})`)
  return res.text()
}

/** UTF-8 güvenli base64 (GitHub blob API'si için). */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as number[])
  }
  return btoa(bin)
}

/** Hazırlanan dosya değişikliklerini TEK commit olarak kaynak dala push eder. Commit URL'ini döner (varsa). */
export async function pushCommit(
  target: GitTarget, auth: GitAuth, ct: CommitTarget, edits: FileEdit[], message: string,
): Promise<string | null> {
  const changed = edits.filter((e) => e.inserted > 0)
  if (changed.length === 0) throw new Error('Eklenecek TODO bulunamadı (hepsi zaten mevcut olabilir).')

  if (target.provider === 'gitlab') {
    const url = `${target.apiBase}/api/v4/projects/${ct.projectId}/repository/commits`
    const body = JSON.stringify({
      branch: ct.branch, commit_message: message,
      actions: changed.map((e) => ({ action: 'update', file_path: e.path, content: e.updated })),
    })
    const res = await ensureOk(target, await req(target, url, { method: 'POST', headers: { 'content-type': 'application/json' }, body }, auth), 'Commit atılamadı')
    const d = await res.json().catch(() => null)
    return d?.web_url ?? null
  }

  if (target.provider === 'github') {
    const base = `${target.apiBase}/repos/${ct.owner}/${ct.repo}`
    // 1) dalın ucu → commit → tree
    const refRes = await ensureOk(target, await req(target, `${base}/git/ref/heads/${encodeURIComponent(ct.branch)}`, {}, auth), 'Dal okunamadı')
    const headSha = (await refRes.json())?.object?.sha
    const cRes = await ensureOk(target, await req(target, `${base}/git/commits/${headSha}`, {}, auth), 'Commit okunamadı')
    const baseTree = (await cRes.json())?.tree?.sha
    // 2) her dosya için blob
    const blobs: { path: string; sha: string }[] = []
    for (const e of changed) {
      const bRes = await ensureOk(target, await req(target, `${base}/git/blobs`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: toBase64(e.updated), encoding: 'base64' }),
      }, auth), `Blob oluşturulamadı (${e.path})`)
      blobs.push({ path: e.path, sha: (await bRes.json())?.sha })
    }
    // 3) tree → commit → ref güncelle
    const tRes = await ensureOk(target, await req(target, `${base}/git/trees`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ base_tree: baseTree, tree: blobs.map((b) => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })) }),
    }, auth), 'Tree oluşturulamadı')
    const treeSha = (await tRes.json())?.sha
    const ncRes = await ensureOk(target, await req(target, `${base}/git/commits`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, tree: treeSha, parents: [headSha] }),
    }, auth), 'Commit oluşturulamadı')
    const newCommit = await ncRes.json()
    await ensureOk(target, await req(target, `${base}/git/refs/heads/${encodeURIComponent(ct.branch)}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sha: newCommit?.sha }),
    }, auth), 'Dal güncellenemedi')
    return newCommit?.html_url ?? null
  }

  // bitbucket: /src uç noktası form-data ile çok dosyalı tek commit kabul eder
  const form = new FormData()
  form.append('message', message)
  form.append('branch', ct.branch)
  for (const e of changed) form.append(e.path, e.updated)
  await ensureOk(target, await req(target, `${target.apiBase}/2.0/repositories/${ct.fullName}/src`, { method: 'POST', body: form }, auth), 'Commit atılamadı')
  return null // Bitbucket /src commit URL'i döndürmez
}

/** Seçilen bulgular için dosya içeriklerini okuyup TODO'ları uygular (henüz push etmez). */
export async function prepareTodoEdits(
  target: GitTarget, auth: GitAuth, ct: CommitTarget, findings: Finding[],
): Promise<FileEdit[]> {
  const byFile = new Map<string, Finding[]>()
  for (const f of findings) {
    const arr = byFile.get(f.filePath) ?? []
    arr.push(f); byFile.set(f.filePath, arr)
  }
  const out: FileEdit[] = []
  for (const path of Array.from(byFile.keys())) {
    const content = await fetchFileContent(target, auth, ct, path)
    out.push(applyTodos(path, content, byFile.get(path)!))
  }
  return out
}

/** Commit mesajı (bulgu sayısı + dosya sayısı). */
export function defaultCommitMessage(edits: FileEdit[]): string {
  const files = edits.filter((e) => e.inserted > 0).length
  const todos = edits.reduce((n, e) => n + e.findings.length, 0)
  return `chore(review): ${todos} bulgu için TODO notu eklendi (${files} dosya)\n\nPortal Code Review tarafından otomatik eklendi.`
}
