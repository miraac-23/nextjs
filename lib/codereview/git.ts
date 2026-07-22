// Çok sağlayıcılı tarayıcı Git istemcisi — GitLab / GitHub / Bitbucket.
// MR/PR linkinden diff çeker ve seçilen bulguları yorum olarak gönderir.
// Backend yok; kimlik doğrulama tarayıcıdan Access Token / App Password ile yapılır.
// TÜM host adresleri dinamiktir (kodda sabit kurumsal adres yoktur) — ekrandan girilir/linkten çözülür.

import type { ChangedFile } from './types'
import { extractAddedLines } from './diff'

export type GitProvider = 'gitlab' | 'github' | 'bitbucket'

/** UI için sağlayıcı meta verisi. */
export const GIT_PROVIDERS: {
  id: GitProvider; label: string; icon: string; prLabel: string
  urlExample: string; needsUser: boolean; tokenLabel: string; note: string
}[] = [
  {
    id: 'gitlab', label: 'GitLab', icon: '🦊', prLabel: 'Merge Request',
    urlExample: 'https://gitlab.ornek.com/grup/proje/-/merge_requests/7',
    needsUser: false, tokenLabel: 'Access Token',
    note: 'Kendi sunucu adresini gir. Token’da tam "api" scope’u olmalı (okuma+yorum). İstersen kullanıcı adı+parola ile de giriş yapabilirsin.',
  },
  {
    id: 'github', label: 'GitHub', icon: '🐙', prLabel: 'Pull Request',
    urlExample: 'https://github.com/kullanici/proje/pull/42',
    needsUser: false, tokenLabel: 'Personal Access Token',
    note: 'github.com veya kurumsal GitHub Enterprise sunucusu. Token’da "repo" izni olmalı (okuma+yorum).',
  },
  {
    id: 'bitbucket', label: 'Bitbucket', icon: '🪣', prLabel: 'Pull Request',
    urlExample: 'https://bitbucket.org/workspace/proje/pull-requests/12',
    needsUser: true, tokenLabel: 'App Password',
    note: 'Bitbucket Cloud. Kullanıcı adın + App Password gerekir (Basic auth). App Password’a "Pull requests: read & write" izni ver.',
  },
]

export interface GitTarget {
  provider: GitProvider
  apiBase: string      // REST API kökü
  webBase: string      // linkin host’u (token sayfası vb.)
  id: string           // MR/PR numarası
  projectPath?: string // gitlab: grup/proje
  owner?: string       // github: sahip
  repo?: string        // github/bitbucket: depo
  workspace?: string   // bitbucket: workspace
}

export interface GitAuth {
  token: string
  username?: string    // bitbucket App Password için gerekli
}

// --- host yardımcıları ---

function stripSlash(u: string): string { return (u || '').trim().replace(/\/+$/, '') }

/** github.com → api.github.com; kurumsal host → {host}/api/v3 */
function githubApiBase(webBase: string): string {
  const b = stripSlash(webBase)
  return /(^|\/\/)([^/]*\.)?github\.com$/i.test(b) ? 'https://api.github.com' : `${b}/api/v3`
}

// --- URL ayrıştırma ---

/** MR/PR URL’sini sağlayıcıya göre hedefe ayrıştırır. */
export function parsePrUrl(provider: GitProvider, url: string): GitTarget {
  const u = (url || '').trim()
  if (provider === 'gitlab') {
    const m = /^(https?:\/\/[^/]+)\/(.+?)\/-\/merge_requests\/(\d+)/.exec(u)
    if (!m) throw new Error('Geçersiz GitLab MR linki. Örn: https://gitlab.ornek.com/grup/proje/-/merge_requests/7')
    return { provider, webBase: m[1], apiBase: m[1], projectPath: m[2], id: m[3] }
  }
  if (provider === 'github') {
    const m = /^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(u)
    if (!m) throw new Error('Geçersiz GitHub PR linki. Örn: https://github.com/kullanici/proje/pull/42')
    return { provider, webBase: m[1], apiBase: githubApiBase(m[1]), owner: m[2], repo: m[3], id: m[4] }
  }
  // bitbucket
  const m = /^(https?:\/\/[^/]+)\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)/.exec(u)
  if (!m) throw new Error('Geçersiz Bitbucket PR linki. Örn: https://bitbucket.org/workspace/proje/pull-requests/12')
  return { provider, webBase: m[1], apiBase: 'https://api.bitbucket.org', workspace: m[2], repo: m[3], id: m[4] }
}

/** Token/App Password oluşturma sayfası (host dinamik). */
export function tokenPageUrl(provider: GitProvider, host: string): string {
  const b = stripSlash(host)
  if (provider === 'gitlab') return `${b}/-/user_settings/personal_access_tokens?name=portal-code-review&scopes=api`
  if (provider === 'github') {
    const isCloud = /(^|\/\/)([^/]*\.)?github\.com$/i.test(b) || !b
    return isCloud
      ? 'https://github.com/settings/tokens/new?scopes=repo&description=portal-code-review'
      : `${b}/settings/tokens/new?scopes=repo&description=portal-code-review`
  }
  return 'https://bitbucket.org/account/settings/app-passwords/'
}

// --- kimlik başlıkları ---

function authHeaders(provider: GitProvider, auth: GitAuth): Record<string, string> {
  const t = (auth.token || '').trim()
  const h: Record<string, string> = {}
  if (provider === 'github') { h['Accept'] = 'application/vnd.github+json'; h['X-GitHub-Api-Version'] = '2022-11-28' }
  if (!t) return h
  // Kullanıcı adı varsa Basic (GitHub/Bitbucket: username + token/app-password), yoksa Bearer.
  if ((provider === 'bitbucket' || provider === 'github') && auth.username?.trim()) {
    h['Authorization'] = 'Basic ' + btoa(`${auth.username.trim()}:${t}`)
  } else {
    h['Authorization'] = `Bearer ${t}`
  }
  return h
}

/** Sağlayıcının hata mesajlarında kullanılacak okunur adı. */
const providerName = (p: GitProvider) => GIT_PROVIDERS.find((x) => x.id === p)?.label ?? p

// --- diff çekme ---

/** MR/PR’ın değişen dosyalarını (diff) çeker. */
export async function fetchChanges(target: GitTarget, auth: GitAuth): Promise<ChangedFile[]> {
  const headers = authHeaders(target.provider, auth)
  let url: string
  if (target.provider === 'gitlab') {
    url = `${target.apiBase}/api/v4/projects/${encodeURIComponent(target.projectPath!)}/merge_requests/${target.id}/changes`
  } else if (target.provider === 'github') {
    url = `${target.apiBase}/repos/${target.owner}/${target.repo}/pulls/${target.id}/files?per_page=100`
  } else {
    url = `${target.apiBase}/2.0/repositories/${target.workspace}/${target.repo}/pullrequests/${target.id}/diff`
  }

  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch (e) {
    throw new Error(`${providerName(target.provider)}’a erişilemedi (tarayıcı CORS engeli olabilir). ` + (e instanceof Error ? e.message : ''))
  }
  if (!res.ok) {
    const hint = res.status === 401 || res.status === 404 ? ' — private depo olabilir; geçerli bir token/erişim girin.' : ''
    throw new Error(`${providerName(target.provider)} ${res.status} ${res.statusText}${hint}`)
  }

  if (target.provider === 'gitlab') {
    const data = await res.json()
    const changes: any[] = data?.changes ?? []
    return changes.map((c) => {
      const diff: string = c.diff ?? ''
      return { path: c.new_path ?? c.old_path ?? '(bilinmeyen)', rawDiff: diff, addedLines: extractAddedLines(diff) }
    })
  }
  if (target.provider === 'github') {
    const files: any[] = await res.json()
    return (files ?? []).map((f) => {
      const patch: string = f.patch ?? ''
      return { path: f.filename ?? '(bilinmeyen)', rawDiff: patch, addedLines: extractAddedLines(patch) }
    })
  }
  // bitbucket: tek birleşik unified diff → dosyalara böl
  const text = await res.text()
  return splitUnifiedDiff(text)
}

/** Birleşik "diff --git" çıktısını dosya başına ChangedFile’lara böler. */
function splitUnifiedDiff(diff: string): ChangedFile[] {
  if (!diff.trim()) return []
  const chunks = diff.split(/\ndiff --git /).map((c, i) => (i === 0 ? c : 'diff --git ' + c))
  const out: ChangedFile[] = []
  for (const chunk of chunks) {
    if (!/^diff --git /.test(chunk) && !/^@@/m.test(chunk)) continue
    const mNew = /^\+\+\+ b\/(.+)$/m.exec(chunk)
    const mGit = /^diff --git a\/.+ b\/(.+)$/m.exec(chunk)
    const path = (mNew?.[1] ?? mGit?.[1] ?? '(bilinmeyen)').trim()
    out.push({ path, rawDiff: chunk, addedLines: extractAddedLines(chunk) })
  }
  return out
}

// --- yorum gönderme ---

/** MR/PR’a bir yorum gönderir. Token’ın YAZMA yetkisi olmalı. */
export async function postComment(target: GitTarget, auth: GitAuth, body: string): Promise<void> {
  const headers = { ...authHeaders(target.provider, auth), 'content-type': 'application/json' }
  let url: string
  let payload: string
  if (target.provider === 'gitlab') {
    url = `${target.apiBase}/api/v4/projects/${encodeURIComponent(target.projectPath!)}/merge_requests/${target.id}/notes`
    payload = JSON.stringify({ body })
  } else if (target.provider === 'github') {
    url = `${target.apiBase}/repos/${target.owner}/${target.repo}/issues/${target.id}/comments`
    payload = JSON.stringify({ body })
  } else {
    url = `${target.apiBase}/2.0/repositories/${target.workspace}/${target.repo}/pullrequests/${target.id}/comments`
    payload = JSON.stringify({ content: { raw: body } })
  }

  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: payload })
  } catch (e) {
    throw new Error(`${providerName(target.provider)}’a erişilemedi (CORS/erişim engeli olabilir). ` + (e instanceof Error ? e.message : ''))
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    let hint = ''
    if (res.status === 401 || res.status === 403) {
      hint = target.provider === 'gitlab'
        ? ' — Token yorum yazamıyor. Tam "api" scope’lu bir Access Token gerekir (read_api yalnızca okur) ve projede en az Reporter/Developer rolün olmalı.'
        : target.provider === 'github'
          ? ' — Token yorum yazamıyor. "repo" (veya public_repo) izinli bir token gerekir ve depoya yazma erişimin olmalı.'
          : ' — Kullanıcı adı + "Pull requests: write" izinli App Password gerekir.'
    }
    throw new Error(`${providerName(target.provider)} ${res.status} ${res.statusText}${hint} ${txt}`.trim().slice(0, 320))
  }
}

/**
 * Kullanıcı adı + parola ile giriş (üç sağlayıcı için tek arayüz).
 *  - GitLab: OAuth password-grant → access token döner.
 *  - GitHub/Bitbucket: kimlik Basic auth ile DOĞRULANIR; "parola" alanı bir token / App Password olmalı.
 *    Doğrulama başarılıysa aynı değeri (token) döndürür; auth başlığı Basic (username:token) kurulur.
 * Yazma yetkisi yoksa bu aşamada değil, gönderim sırasında (token isteme akışıyla) anlaşılır.
 */
export async function passwordLogin(provider: GitProvider, host: string, username: string, password: string): Promise<string> {
  if (provider === 'gitlab') return gitlabPasswordLogin(host, username, password)

  const apiBase = provider === 'github' ? githubApiBase(host) : 'https://api.bitbucket.org'
  const url = provider === 'github' ? `${apiBase}/user` : `${apiBase}/2.0/user`
  const headers: Record<string, string> = { 'Authorization': 'Basic ' + btoa(`${username.trim()}:${password}`) }
  if (provider === 'github') { headers['Accept'] = 'application/vnd.github+json'; headers['X-GitHub-Api-Version'] = '2022-11-28' }

  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch (e) {
    throw new Error(`${providerName(provider)}’a erişilemedi (tarayıcı CORS engeli olabilir). ` + (e instanceof Error ? e.message : ''))
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(provider === 'github'
      ? 'GitHub artık düz parola ile girişi desteklemiyor. "Parola" alanına, hesabınla eşleşen bir Personal Access Token (repo izinli) girin.'
      : 'Bitbucket girişi reddedildi. "Parola" alanına, kullanıcı adınla eşleşen bir App Password girin (Pull requests: read/write).')
  }
  if (!res.ok) throw new Error(`${providerName(provider)} ${res.status} ${res.statusText} — giriş doğrulanamadı.`)
  return password // Basic auth’ta saklanacak "token" = parola/app-password/PAT
}

/** GitLab kullanıcı adı + parola girişi (OAuth password-grant / ROPC) → access token. */
export async function gitlabPasswordLogin(base: string, username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ grant_type: 'password', username, password, scope: 'api' })
  let res: Response
  try {
    res = await fetch(`${stripSlash(base)}/oauth/token`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
    })
  } catch (e) {
    throw new Error('GitLab’a erişilemedi (tarayıcı CORS engeli olabilir). Access Token ile girmeyi deneyin. ' + (e instanceof Error ? e.message : ''))
  }
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    if (data?.error === 'invalid_grant') throw new Error('Kullanıcı adı veya parola hatalı (ya da 2FA açık — Access Token kullanın).')
    const desc = data?.error_description || data?.error || `${res.status} ${res.statusText}`
    throw new Error('Giriş reddedildi: ' + desc + ' (password-grant kapalıysa Access Token kullanın).')
  }
  if (!data?.access_token) throw new Error('Token alınamadı.')
  return data.access_token as string
}
