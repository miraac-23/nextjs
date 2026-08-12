'use client'
/* eslint-disable react/no-unescaped-entities, react/jsx-no-comment-textnodes */

// Code Review — SAF TARAYICI aracı (backend/DB yok). Next.js route'una gömülü.
// Kurallar bundledRules.ts'ten localStorage'a tohumlanır; inceleme tarayıcıda çalışır;
// AI çağrıları doğrudan sağlayıcıya yapılır (anahtar localStorage'da).
// Stiller `.pcr-app` altında izole edilmiştir; hedef sitenin tasarımına dokunmaz.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChangedFile, Finding, LlmConfig, Rule, RuleDraft, RuleType, ReviewMode, Severity } from '@/lib/codereview/types'
import type { ReviewProgress } from '@/lib/codereview/review'
import * as md from '@/lib/codereview/mdStore'
import type { RuleCoverage } from '@/lib/codereview/review'
import type { RuleCheck } from '@/lib/codereview/review'
import { runReview, ruleCoverage, explainRule, probeRule, ruleExamples } from '@/lib/codereview/review'
import { renderMarkdown } from '@/lib/codereview/markdown'
import { loadOrSeedConfig, saveConfig, clearConfig, testConfig } from '@/lib/codereview/llm'
import type { GitProvider, GitTarget } from '@/lib/codereview/git'
import { GIT_PROVIDERS, parsePrUrl, fetchChanges, postComment, tokenPageUrl, passwordLogin } from '@/lib/codereview/git'
import type { CommitTarget, FileEdit } from '@/lib/codereview/commit'
import { resolveCommitTarget, prepareTodoEdits, pushCommit, defaultCommitMessage } from '@/lib/codereview/commit'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { setCrLang, gitNote } from '@/lib/codereview/i18n'
import { ui } from '@/lib/codereview/ui-text'
import AiProviderLogo from './AiProviderLogo'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

/**
 * Tüm diyaloglar bu mixin'den açılır: popup body'ye taşındığı için `.pcr-app` dışında kalır,
 * `pcr-swal` sınıfı paleti (:root --pcr-*) taşır → site temasıyla birlikte açık/koyu döner.
 */
const pcrSwal = Swal.mixin({
  customClass: { popup: 'pcr-swal', container: 'pcr-swal-bg' },
  showClass: { popup: 'swal2-show' },
  reverseButtons: true,
})

/**
 * Overlay'leri (yükleme ekranı, çekmece, modal) `document.body` altına taşır.
 * Gerekli: sayfa sarmalayıcısı `.pcr-stage` bir YIĞIN BAĞLAMI oluşturur; içeride kalan
 * overlay'ler ne kadar yüksek z-index alırsa alsın site Navbar'ının (z-50) altında kalır.
 * Portal kapsayıcısı `.pcr-app` sınıfını taşır ki tüm stiller/tema değişkenleri geçerli olsun.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const el = document.createElement('div')
    el.className = 'pcr-app pcr-portal'
    document.body.appendChild(el)
    setHost(el)
    return () => { el.remove() }
  }, [])
  return host ? createPortal(children, host) : null
}

const SEV_LIST: Severity[] = ['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER']
const SEV_ORDER: Severity[] = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']

type Tab = 'review' | 'rules'

/**
 * Kök bileşen: sekme yönetimi.
 * Tema ayrı DEĞİLDİR — sitenin genel teması (`html[data-theme]`, Navbar'daki ThemeToggle)
 * doğrudan `.pcr-app` paletini sürer (bkz. codereview.css `:root[data-theme="light"]`).
 */
export default function CodeReviewApp() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('review')
  const { lang } = useLanguage()

  // Motor modülleri (review.ts, git.ts) React context'ine erişemediği için aktif dil
  // modül düzeyinde tutulur. Ebeveyn çocuklardan önce render edildiğinden burada set etmek güvenlidir.
  setCrLang(lang)
  const t = ui()

  // SSR sırasında localStorage yok; tüm iç bileşenler (localStorage lazy-init'li) yalnız mount sonrası render edilir.
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="pcr-app" />

  return (
    <div className="pcr-app">
      <div className="app">
        <header>
          <h1>‹/› Code Review</h1>
          <p className="sub">{t.appSub}</p>
        </header>
        <nav>
          <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
            <span className="nav-ic">🔍</span>
            <span className="nav-txt"><b>{t.tabReview}</b><small>{t.tabReviewSub}</small></span>
          </button>
          <button className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>
            <span className="nav-ic">📜</span>
            <span className="nav-txt"><b>{t.tabRules}</b><small>{t.tabRulesSub}</small></span>
          </button>
        </nav>
        <main>
          {tab === 'review' && <ReviewPage />}
          {tab === 'rules' && <RulesPage />}
        </main>
      </div>
    </div>
  )
}

/* ============================ Bağlantı durumu görselleri ============================ */

/** Bağlantı durumu noktası — bağlıyken nabız atar, bağlanırken sarı, hatada kırmızıdır. */
function ConnDot({ state }: { state: 'on' | 'off' | 'busy' | 'err' }) {
  return <span className={`cdot ${state}`} aria-hidden="true" />
}

/** Buton içinde dönen küçük yükleniyor göstergesi. */
function Spinner() {
  return <span className="cspin" aria-hidden="true" />
}

/** Bağlantı kurulduğunda bir kez çizilen onay işareti. */
function SuccessCheck() {
  return (
    <svg className="ccheck" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 12.4l3 3 6-6.6" />
    </svg>
  )
}

/** Döngüde akan anahtar kelimeler: `out` üst kolda (giden), `in` alt kolda (dönen). */
export interface FlowWords { out: string[]; in: string[] }

/** Akış kelimeleri arayüz diline göre çözülür. */
export const flowWordsGit = (): FlowWords => ({ out: [...ui().flowGitOut], in: [...ui().flowGitIn] })
export const flowWordsAi = (): FlowWords => ({ out: [...ui().flowAiOut], in: [...ui().flowAiIn] })

/** Hattın ortasındaki rozet: bağlıyken onay, bağlanırken şimşek, kopukken kırık halka. */
function FlowBadge({ state }: { state: ConnState }) {
  if (state === 'on') return <span className="cflow-badge on" aria-hidden="true">✓</span>
  if (state === 'busy') return <span className="cflow-badge busy" aria-hidden="true">⚡</span>
  if (state === 'err') return <span className="cflow-badge err" aria-hidden="true">⚠</span>
  return <span className="cflow-badge off" aria-hidden="true">⊘</span>
}

/** Bağlantı hattının durumu. */
type ConnState = 'on' | 'off' | 'busy' | 'err'

/**
 * Uygulama ile hedef (Git sunucusu / AI sağlayıcısı) arasındaki bağlantıyı bir VERİ HATTI
 * olarak gösterir: iki uçta düğümler, aralarında akan paketler ve taşınan veriyi anlatan
 * anahtar kelimeler. Bağlıyken akış çift yönlü ve yeşil, bağlanırken hızlı ve mavi,
 * kopukken hat kesikli ve duruktur.
 *
 * @param state Hattın durumu (bağlı / bağlanıyor / kopuk / hata)
 * @param logo  Hedef ucunda gösterilecek sağlayıcı işareti
 * @param title Hedef ucunun başlığı
 * @param detail Hedef ucunun alt satırı (sunucu adresi, model adı…)
 * @param words Hat üzerinde akacak anahtar kelimeler
 * @param onDisconnect Verilirse sağda bir kesme düğmesi gösterilir
 */
function ConnFlow({ state, logo, title, detail, words, fresh, onDisconnect, disconnectLabel }: {
  state: ConnState; logo: React.ReactNode; title: string; detail?: string
  words: FlowWords; fresh?: boolean; onDisconnect?: () => void; disconnectLabel?: string
}) {
  const t = ui()
  const flowing = state === 'on' || state === 'busy'
  return (
    <div className={`cflow ${state} ${fresh ? 'fresh' : ''}`}>
      <div className="cflow-node">
        <span className="cflow-ic app" aria-hidden="true">&lt;/&gt;</span>
        <span className="cflow-cap"><b>Code Review</b><small>{t.browser}</small></span>
      </div>

      <div className="cflow-rail" aria-hidden="true">
        {/* kapalı döngü: üst kolda giden, alt kolda dönen veri */}
        <span className="cflow-loop" />
        {flowing && [0, 1, 2, 3].map((i) => (
          <i key={`p${i}`} className="cflow-pkt" style={{ ['--i' as string]: i }} />
        ))}
        {flowing && words.out.map((w, i) => (
          <span key={`o${w}`} className="cflow-word out" style={{ ['--i' as string]: i, ['--n' as string]: words.out.length }}>{w}</span>
        ))}
        {flowing && words.in.map((w, i) => (
          <span key={`i${w}`} className="cflow-word in" style={{ ['--i' as string]: i, ['--n' as string]: words.in.length }}>{w}</span>
        ))}
        <FlowBadge state={state} />
      </div>

      <div className="cflow-node target">
        <span className="cflow-ic">
          {logo}
          {state === 'on' && <span className="cflow-halo" />}
        </span>
        <span className="cflow-cap"><b>{title}</b>{detail && <small>{detail}</small>}</span>
      </div>

      {onDisconnect && <button className="ghost small cflow-x" onClick={onDisconnect}>{disconnectLabel ?? t.logout}</button>}
    </div>
  )
}

/* ============================ AI Bağlantısı ============================ */

type ProviderId = 'ollama' | 'claude' | 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'mistral' | 'custom'
const AI_PROVIDERS: {
  id: ProviderId; label: string; provider: LlmConfig['provider']; base: string; custom?: boolean
  needsKey: boolean; defModel: string; keyUrl?: string; note: string
}[] = [
  { id: 'ollama', label: 'Ollama (yerel)', provider: 'openai', base: 'http://localhost:11434/v1', needsKey: false, defModel: 'qwen2.5-coder:7b', note: 'Anahtarsız, ücretsiz. Tarayıcıdan erişim için Ollama\'yı OLLAMA_ORIGINS=* ile başlat.' },
  { id: 'claude', label: 'Claude', provider: 'anthropic', base: '', needsKey: true, defModel: 'claude-haiku-4-5', keyUrl: 'https://console.anthropic.com/settings/keys', note: 'Anthropic Claude (ücretli API anahtarı). Model: claude-haiku-4-5 · claude-sonnet-4-6 · claude-opus-4-8. Tarayıcıdan doğrudan çağrılır.' },
  { id: 'gemini', label: 'Gemini', provider: 'gemini', base: '', needsKey: true, defModel: 'gemini-2.0-flash', keyUrl: 'https://aistudio.google.com/apikey', note: 'Ücretsiz ama SIKI kotalı (429). Model: gemini-2.0-flash · gemini-2.0-flash-lite' },
  { id: 'groq', label: 'Groq', provider: 'openai', base: 'https://api.groq.com/openai/v1', needsKey: true, defModel: 'openai/gpt-oss-20b', keyUrl: 'https://console.groq.com/keys', note: 'Ücretsiz, hızlı. Model: openai/gpt-oss-20b · qwen/qwen3-32b' },
  { id: 'openrouter', label: 'OpenRouter', provider: 'openai', base: 'https://openrouter.ai/api/v1', needsKey: true, defModel: 'qwen/qwen-2.5-coder-32b-instruct:free', keyUrl: 'https://openrouter.ai/keys', note: 'Ücretsiz (:free) modeller.' },
  { id: 'cerebras', label: 'Cerebras', provider: 'openai', base: 'https://api.cerebras.ai/v1', needsKey: true, defModel: 'llama-3.3-70b', keyUrl: 'https://cloud.cerebras.ai', note: 'Ücretsiz, hızlı.' },
  { id: 'mistral', label: 'Mistral', provider: 'openai', base: 'https://api.mistral.ai/v1', needsKey: true, defModel: 'mistral-small-latest', keyUrl: 'https://console.mistral.ai', note: 'Ücretsiz katman.' },
  { id: 'custom', label: 'Özel', provider: 'openai', base: '', custom: true, needsKey: false, defModel: '', note: 'OpenAI-uyumlu gateway / vLLM.' },
]

/** Sağlayıcı etiketi/notu arayüz diline göre çözülür (marka adları çevrilmez). */
const provLabel = (p: { id: ProviderId; label: string }) => ui().aiProviderLabels[p.id] ?? p.label
const provNote = (p: { id: ProviderId; note: string }) => ui().aiProviderNotes[p.id] ?? p.note

/** Kayıtlı bağlantıdan sağlayıcı sekmesini çözer (bağlı durum satırında logoyu göstermek için). */
function providerIdOf(cfg: LlmConfig): ProviderId {
  if (cfg.provider === 'anthropic') return 'claude'
  if (cfg.provider === 'gemini') return 'gemini'
  return AI_PROVIDERS.find((p) => p.base && p.base === cfg.baseUrl)?.id ?? 'custom'
}

/** Sağlayıcı bazında hatırlanan API anahtarı (sekme değiştirince kaybolmasın diye). */
const savedKey = (id: ProviderId) => localStorage.getItem(`pcr-key:${id}`) || ''
/** Başarılı bağlantı sonrası anahtarı bu tarayıcıda saklar (boşsa dokunmaz). */
const rememberKey = (id: ProviderId, key: string) => { if (key.trim()) localStorage.setItem(`pcr-key:${id}`, key.trim()) }

/** AI sağlayıcı bağlantısı. Bağlantı doğrulanır; başarılıysa localStorage'a yazılır. */
function AiPanel({ cfg, onChange }: { cfg: LlmConfig | null; onChange: (c: LlmConfig | null) => void }) {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState<ProviderId>('ollama')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('qwen2.5-coder:7b')
  const [base, setBase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)   // yeni bağlanıldı → kısa vurgu animasyonu
  const t = ui()

  const prov = AI_PROVIDERS.find((p) => p.id === sel)!
  const pick = (id: ProviderId) => {
    setSel(id); setError(null)
    const p = AI_PROVIDERS.find((x) => x.id === id)!
    setModel(p.defModel); setApiKey(savedKey(id)); setBase('')
  }

  const connect = async () => {
    setBusy(true); setError(null)
    const next: LlmConfig = {
      provider: prov.provider,
      baseUrl: prov.custom ? base.trim() : prov.base,
      model: model.trim(),
      apiKey: apiKey.trim(),
    }
    const err = await testConfig(next)
    if (err) { setError(err); setBusy(false); return }
    rememberKey(sel, apiKey)
    saveConfig(next); onChange(next); setOpen(false); setBusy(false)
    setFresh(true); setTimeout(() => setFresh(false), 2200)
  }
  const disconnect = () => { clearConfig(); onChange(null); setFresh(false) }

  const showForm = open || !cfg
  return (
    <div className="llmbox">
      <div className="llmbox-head">
        <span className="llmbox-title">{t.aiTitle}</span>
        <span className={`cstate ${cfg ? 'ok' : busy ? 'busy' : 'warn'}`}>
          <ConnDot state={cfg ? 'on' : busy ? 'busy' : 'off'} />
          {cfg ? t.aiConnected(cfg.model) : busy ? t.aiVerifying : t.aiNotConnected}
        </span>
      </div>
      <ConnFlow
        state={cfg ? 'on' : busy ? 'busy' : error ? 'err' : 'off'}
        fresh={fresh}
        logo={<AiProviderLogo id={cfg ? providerIdOf(cfg) : sel} size={22} />}
        title={cfg
          ? t.aiFlowConnected(
              (() => { const p = AI_PROVIDERS.find((x) => x.id === providerIdOf(cfg)); return p ? provLabel(p) : 'AI' })(),
            )
          : busy ? t.aiFlowConnecting(provLabel(prov)) : provLabel(prov)}
        detail={cfg ? cfg.model : t.aiFlowDetailOff}
        words={flowWordsAi()}
        onDisconnect={cfg ? disconnect : undefined}
        disconnectLabel={t.aiDisconnect}
      />
      <div className="llm-actions">
        {cfg && <button className="ghost small" onClick={() => setOpen((v) => !v)}>{open ? t.close : t.aiConnectOther}</button>}
      </div>
      {showForm && (
        <div className="llm-form">
          <div className="prov-tabs">
            {AI_PROVIDERS.map((p) => (
              <button key={p.id} className={`prov ${sel === p.id ? 'sel' : ''}`} onClick={() => pick(p.id)}>
                <span className="prov-logo"><AiProviderLogo id={p.id} size={15} /></span>
                {provLabel(p)}
              </button>
            ))}
          </div>
          <div className="prov-note">{provNote(prov)}{prov.keyUrl && <> · <a href={prov.keyUrl} target="_blank" rel="noreferrer">{t.aiFreeKey}</a></>}</div>
          <div className="row">
            {prov.needsKey && <label>{t.aiApiKey}
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder={t.aiKeyPh} /></label>}
            {prov.custom && <label>{t.aiBaseUrl}
              <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="http://host:port/v1" /></label>}
            <label>{t.aiModel}
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={prov.defModel || 'model'} /></label>
          </div>
          <button className="conn-go" onClick={connect} disabled={busy || (prov.needsKey && !apiKey.trim()) || (prov.custom && !base.trim())}>
            {busy ? <><Spinner /> {t.aiConnecting}</> : <><AiProviderLogo id={sel} size={15} /> {t.aiConnectWith(provLabel(prov))}</>}
          </button>
          {error && <div className="error small shake" key={error}>⚠️ {error}</div>}
          <small>{t.aiFootnote}</small>
        </div>
      )}
    </div>
  )
}

/* ============================ İnceleme sayfası ============================ */

/** Mod tanımı — metinler arayüz sözlüğünden (ui().modes) gelir. */
const MODES: {
  value: ReviewMode
  /** Modun kullandığı kaynaklar — kartta rozet olarak gösterilir. */
  uses: ('rules' | 'ai')[]
}[] = [
  { value: 'AI_WITH_RULES', uses: ['rules', 'ai'] },
  { value: 'RULES_ONLY', uses: ['rules'] },
  { value: 'AI_ONLY', uses: ['ai'] },
]

/** Bir modun aktif dildeki etiketi/açıklaması. */
const modeText = (value: ReviewMode) => ui().modes[value]

/** İnceleme modu kartındaki simge — modun kural/AI karışımını görselleştirir. */
function ModeIcon({ mode }: { mode: ReviewMode }) {
  const gear = (
    <path d="M12 8.6a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8zm8.2 4.6l1.7 1.3-1.7 3-2-.8a7.8 7.8 0 01-1.9 1.1l-.3 2.2h-3.4l-.3-2.2a7.8 7.8 0 01-1.9-1.1l-2 .8-1.7-3 1.7-1.3a7.9 7.9 0 010-2.4L6.7 9.5l1.7-3 2 .8a7.8 7.8 0 011.9-1.1l.3-2.2h3.4l.3 2.2c.7.3 1.3.6 1.9 1.1l2-.8 1.7 3-1.7 1.3c.1.8.1 1.6 0 2.4z" />
  )
  const spark = <path d="M12 2.5l1.6 5.4 5.4 1.6-5.4 1.6L12 16.5l-1.6-5.4L5 9.5l5.4-1.6L12 2.5z" />

  if (mode === 'RULES_ONLY') {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{gear}</svg>
  }
  if (mode === 'AI_ONLY') {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{spark}</svg>
  }
  // hibrit: küçültülmüş dişli + kıvılcım yan yana
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="translate(-2.4 2.2) scale(0.62)">{gear}</g>
      <g transform="translate(9.4 -1.6) scale(0.62)">{spark}</g>
    </svg>
  )
}

/** Sağlayıcıların gerçek marka logoları (inline SVG, tema uyumlu). */
function ProviderLogo({ id, size = 22 }: { id: GitProvider; size?: number }) {
  if (id === 'github') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
  if (id === 'bitbucket') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#2684FF" aria-hidden="true">
      <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC6D26" aria-hidden="true">
      <path d="m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 00-.3362-.405.8748.8748 0 00-.9997.0539.8748.8748 0 00-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 00-.29-.4412.8748.8748 0 00-.9997-.0539.8618.8618 0 00-.3362.405L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 002.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 001.2197 0l1.4995-1.1321 2.462-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 002.0094-7.003z" />
    </svg>
  )
}

/**
 * Çok sağlayıcılı Git bağlantısı (saf tarayıcı) — GitLab / GitHub / Bitbucket.
 * Host, token (ve Bitbucket için kullanıcı adı) ekrandan girilir; kodda sabit adres yoktur.
 * GitLab ayrıca kullanıcı adı+parola ile OAuth token alabilir. Değerler sağlayıcı bazında saklanır.
 */
function GitConnectPanel({ provider, host, token, username, onProvider, onHost, onToken, onUsername }: {
  provider: GitProvider; host: string; token: string; username: string
  onProvider: (p: GitProvider) => void; onHost: (h: string) => void; onToken: (t: string) => void; onUsername: (u: string) => void
}) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)   // yeni bağlanıldı → kısa vurgu animasyonu
  const t = ui()

  const meta = GIT_PROVIDERS.find((p) => p.id === provider)!
  const connected = !!token.trim() && (!meta.needsUser || !!username.trim())

  /** Bağlantı kurulduğunda vurgu animasyonunu tetikler (2.2 sn sonra söner). */
  const markFresh = () => { setFresh(true); setTimeout(() => setFresh(false), 2200) }

  // Üç sağlayıcıda da kullanıcı adı + parola ile giriş (GitLab: OAuth token; GitHub/Bitbucket: Basic doğrulama).
  const login = async () => {
    setBusy(true); setError(null)
    try {
      const t = await passwordLogin(provider, host.trim(), user.trim(), pass)
      if (provider !== 'gitlab') onUsername(user.trim()) // Basic auth için kullanıcı adı saklanır
      onToken(t); setPass(''); markFresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const useToken = () => { if (manualToken.trim()) { onToken(manualToken.trim()); setManualToken(''); markFresh() } }
  const logout = () => { onToken(''); setError(null); setFresh(false) }
  const tokenLink = tokenPageUrl(provider, host)
  const passLabel = provider === 'gitlab' ? t.gitPassGitlab : provider === 'github' ? t.gitPassGithub : t.gitPassBitbucket
  const passPh = provider === 'gitlab' ? t.gitPassPhGitlab : provider === 'github' ? t.gitPassPhGithub : t.gitPassPhBitbucket
  const writeReq = provider === 'gitlab' ? t.gitWriteScopeGitlab : provider === 'github' ? t.gitWriteScopeGithub : t.gitWriteScopeBitbucket

  return (
    <div className="connbox">
      <div className="connbox-head">
        <span className="connbox-title">{t.gitTitle}</span>
        <span className={`cstate ${connected ? 'ok' : busy ? 'busy' : 'warn'}`}>
          <ConnDot state={connected ? 'on' : busy ? 'busy' : 'off'} />
          {connected ? t.gitConnected(meta.label) : busy ? t.gitConnecting : t.gitNotConnected}
        </span>
      </div>

      {/* Sağlayıcı seçimi */}
      <div className="prov-pick">
        {GIT_PROVIDERS.map((p) => (
          <button key={p.id} className={`ppick ${provider === p.id ? 'on' : ''}`} onClick={() => { onProvider(p.id); setError(null) }}>
            <span className={`ppick-ic pl-${p.id}`}><ProviderLogo id={p.id} size={22} /></span>
            <span className="ppick-txt">{p.label}<small>{p.prLabel}</small></span>
          </button>
        ))}
      </div>

      <ConnFlow
        state={connected ? 'on' : busy ? 'busy' : error ? 'err' : 'off'}
        fresh={fresh}
        logo={<ProviderLogo id={provider} size={22} />}
        title={connected ? t.gitConnected(meta.label) : busy ? t.gitFlowConnecting(meta.label) : meta.label}
        detail={connected
          ? ([host.replace(/^https?:\/\//, ''), username].filter(Boolean).join(' · ') || undefined)
          : (host.replace(/^https?:\/\//, '') || t.gitNoHost)}
        words={flowWordsGit()}
        onDisconnect={connected ? logout : undefined}
      />

      {connected ? null : (
        <>
          <p className="conn-note">{gitNote(meta.id, meta.note)}</p>
          <label>{t.gitHostLabel(meta.label)}
            <input value={host} onChange={(e) => onHost(e.target.value)} placeholder={new URL(meta.urlExample).origin} /></label>

          {/* Kullanıcı adı + parola ile giriş (tüm sağlayıcılar) */}
          <div className="row">
            <label>{t.gitUsername}
              <input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" placeholder={t.gitUsernamePh} /></label>
            <label>{passLabel}
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password"
                     placeholder={passPh}
                     onKeyDown={(e) => { if (e.key === 'Enter') login() }} /></label>
          </div>
          <button className="conn-go" onClick={login} disabled={busy || !host.trim() || !user.trim() || !pass}>
            {busy ? <><Spinner /> {t.gitLoggingIn}</> : <>{t.gitLogin}</>}
          </button>
          {provider !== 'gitlab' && <small style={{ marginTop: 6 }}>{t.gitNoPlainPassword(meta.label, passLabel, meta.tokenLabel)} <a href={tokenLink} target="_blank" rel="noreferrer">{t.gitCreate}</a></small>}

          <div className="or">{t.gitOrToken}</div>
          <div className="row">
            {meta.needsUser && <label>{t.gitUsername}
              <input value={username} onChange={(e) => onUsername(e.target.value)} autoComplete="username" placeholder={t.gitUsernameOwnPh} /></label>}
            <label>{meta.tokenLabel} <a href={tokenLink} target="_blank" rel="noreferrer">{t.gitCreate}</a>
              <input type="password" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder={t.gitTokenPh} /></label>
            <button onClick={useToken} disabled={!manualToken.trim() || (meta.needsUser && !username.trim())} style={{ alignSelf: 'end', marginBottom: 10 }}>{t.gitUse}</button>
          </div>

          {error && <div className="error small shake" key={error}>⚠️ {error}</div>}
          <small>{t.gitWriteNote(writeReq)}</small>
        </>
      )}
    </div>
  )
}

/** İnceleme: GitLab girişi → MR linki → mod → tarayıcıda incele → özet + bulgular. */
function ReviewPage() {
  const [cfg, setCfg] = useState<LlmConfig | null>(loadOrSeedConfig())
  const [mode, setMode] = useState<ReviewMode>('AI_WITH_RULES')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ findings: Finding[]; files: ChangedFile[]; mode: ReviewMode; notice: string | null } | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [filter, setFilter] = useState<FindingFilter>(null)   // özet grafiğinden seçilen bulgu filtresi
  const [progress, setProgress] = useState<ReviewProgress | null>(null)  // yükleme ekranı ilerlemesi
  const [startedAt, setStartedAt] = useState(0)
  const t = ui()

  // Git bağlantısı (dinamik) — sağlayıcı + host + token (+ Bitbucket kullanıcı adı) sağlayıcı bazında hatırlanır.
  const initProvider = ((localStorage.getItem('pcr-git-provider') as GitProvider) || 'gitlab')
  const [provider, setProviderState] = useState<GitProvider>(initProvider)
  const [host, setHostState] = useState(() => localStorage.getItem(`pcr-git-host:${initProvider}`) || '')
  const [token, setTokenState] = useState(() => localStorage.getItem(`pcr-git-token:${initProvider}`) || '')
  const [username, setUsernameState] = useState(() => localStorage.getItem(`pcr-git-user:${initProvider}`) || '')
  const [prUrl, setPrUrl] = useState(() => localStorage.getItem('pcr-pr-url') || '')

  const setHost = (h: string) => { setHostState(h); localStorage.setItem(`pcr-git-host:${provider}`, h) }
  const setUsername = (u: string) => { setUsernameState(u); localStorage.setItem(`pcr-git-user:${provider}`, u) }
  const setToken = (t: string) => { setTokenState(t); if (t) localStorage.setItem(`pcr-git-token:${provider}`, t); else localStorage.removeItem(`pcr-git-token:${provider}`) }
  const setProvider = (p: GitProvider) => {
    setProviderState(p); localStorage.setItem('pcr-git-provider', p)
    setHostState(localStorage.getItem(`pcr-git-host:${p}`) || '')
    setTokenState(localStorage.getItem(`pcr-git-token:${p}`) || '')
    setUsernameState(localStorage.getItem(`pcr-git-user:${p}`) || '')
  }

  const gitMeta = GIT_PROVIDERS.find((p) => p.id === provider)!

  // Verilen dosyaları kurallardan + AI'dan geçirir.
  const reviewFiles = async (files: ChangedFile[]) => {
    let rules: Rule[] = []
    try { rules = md.readAllRules() } catch { /* kural okunamazsa kuralsız devam */ }
    const { findings, notice } = await runReview(files, rules, mode, cfg, setProgress)
    setResult({ findings, files, mode, notice })
    setFilter(null)
    setShowSend(false)
  }

  // Seçilen sağlayıcının MR/PR linkinden diff çekip incele
  const reviewFromGit = async () => {
    if (!prUrl.trim()) return
    setLoading(true); setError(null); setResult(null)
    setStartedAt(Date.now()); setProgress({ label: t.fetchingDiff(gitMeta.prLabel), done: 0, total: 0 })
    try {
      const target = parsePrUrl(provider, prUrl)
      localStorage.setItem('pcr-pr-url', prUrl.trim())
      const files = await fetchChanges(target, { token, username })
      if (files.length === 0) { setError(t.noChangedFiles(gitMeta.prLabel)); return }
      await reviewFiles(files)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <section className="card">
      {loading && <ReviewLoader mode={mode} progress={progress} startedAt={startedAt} />}
      <h2>{t.reviewTitle}</h2>

      <GitConnectPanel provider={provider} host={host} token={token} username={username}
        onProvider={setProvider} onHost={setHost} onToken={setToken} onUsername={setUsername} />

      <AiPanel cfg={cfg} onChange={setCfg} />

      <div className="modes">
        <div className="modes-title">{t.modesTitle}</div>
        <div className="modecards" role="radiogroup" aria-label={t.modesTitle}>
          {MODES.map((m) => {
            const on = mode === m.value
            const needsAi = m.uses.includes('ai')
            const mt = modeText(m.value)
            return (
              <button
                key={m.value} type="button" role="radio" aria-checked={on}
                className={`modecard ${on ? 'sel' : ''}`} onClick={() => setMode(m.value)}
              >
                <span className="modecard-top">
                  <span className="modecard-ic"><ModeIcon mode={m.value} /></span>
                  <span className="modecard-short">{mt.short}</span>
                  {mt.tag && <span className="modecard-tag">{mt.tag}</span>}
                  <span className="modecard-check" aria-hidden="true">✓</span>
                </span>
                <b className="modecard-title">{mt.label}</b>
                <small className="modecard-desc">{mt.desc}</small>
                <span className="modecard-uses">
                  {m.uses.includes('rules') && <i className="mu rules">{t.useRules}</i>}
                  {needsAi && <i className={`mu ai ${cfg ? '' : 'off'}`}>{t.useAi}{cfg ? '' : t.useAiOff}</i>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* MR/PR linkinden inceleme */}
      <div className="gitbox">
        <div className="gitbox-title"><span className={`gt-logo pl-${provider}`}><ProviderLogo id={provider} size={16} /></span> {t.gitboxTitle(gitMeta.label, gitMeta.prLabel)}</div>
        <label>{t.gitboxUrl(gitMeta.prLabel)}
          <input value={prUrl} onChange={(e) => setPrUrl(e.target.value)} placeholder={gitMeta.urlExample} /></label>
        <button onClick={reviewFromGit} disabled={loading || !prUrl.trim()}>{loading ? t.reviewing : t.fetchAndReview(gitMeta.prLabel)}</button>
        {!token && <small>{t.privateNote(gitMeta.label)}</small>}
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {result && (
        <div className="result">
          {result.notice && <div className="notice">ℹ️ {result.notice}</div>}
          {result.findings.length > 0 && !showSend && (
            <div className="send-cta">
              <button onClick={() => setShowSend(true)}>{t.sendCta}</button>
              <small>{t.sendCtaNote}</small>
            </div>
          )}
          {showSend && result.findings.length > 0 && (
            <SendToGitPanel findings={result.findings} provider={provider} prUrl={prUrl} host={host} token={token} username={username}
              onToken={setToken} onClose={() => setShowSend(false)} />
          )}
          <ReviewSummary findings={result.findings} mode={result.mode} cfg={cfg} fileCount={result.files.length}
            files={result.files} filter={filter} onFilter={setFilter} />
          {result.files.map((file) => {
            const fileFindings = result.findings.filter((f) => f.filePath === file.path && matchesFilter(f, filter))
            // Filtre etkinken, o filtreye uyan bulgusu olmayan dosyalar listeden düşer.
            if (filter && fileFindings.length === 0) return null
            return (
              <div key={file.path} className="filecard">
                <div className="filehead"><code>{file.path}</code><span className="count">{t.findingCount(fileFindings.length)}</span></div>
                <Diff raw={file.rawDiff} />
                {fileFindings.length > 0 && (
                  <div className="findings-in-file">
                    {fileFindings.map((f) => (
                      <div key={f.id} className={`finding-block sevb-${f.severity} ${f.source === 'LLM' ? 'ai' : ''}`}>
                        <div className="finding-head">
                          <span className={`sev ${f.severity}`}>{f.severity}</span>
                          <span className={`badge ${f.source}`}>{f.source === 'LLM' ? `🤖 ${cfg?.provider ?? 'AI'}` : t.badgeRule}</span>
                          <code>{t.line} {f.line ?? '?'}</code>
                          <strong>{f.ruleName}</strong>
                        </div>
                        <div className="finding-msg">{f.message}</div>
                        {f.suggestion && <div className="finding-fix">{f.source === 'LLM' ? t.aiSuggestionPrefix : t.suggestionPrefix}{f.suggestion}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** SweetAlert html'ine güvenle gömmek için kaçış. */
function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

/** Hata mesajı yetki/scope (401/403) kaynaklı mı? */
function isAuthError(msg: string): boolean {
  return /\b401\b|\b403\b|insufficient_scope|yetki|scope|unauthorized|forbidden/i.test(msg)
}

/** Gönderim biçimi: MR/PR'a yorum · kaynak dala TODO commit'i. */
type SendMode = 'comment' | 'commit'

/** Bulguları seçip verilen MR/PR'a yorum ya da TODO commit'i olarak gönderme paneli (GitLab/GitHub/Bitbucket). */
function SendToGitPanel({ findings, provider, prUrl, host, token, username, onToken, onClose }: {
  findings: Finding[]; provider: GitProvider; prUrl: string; host: string; token: string; username: string
  onToken: (t: string) => void; onClose: () => void
}) {
  const [sel, setSel] = useState<Set<number>>(() => new Set(findings.map((f) => f.id)))
  const [combine, setCombine] = useState(false)
  const [sendMode, setSendMode] = useState<SendMode>('comment')
  const [sending, setSending] = useState(false)
  const t = ui()
  const meta = GIT_PROVIDERS.find((p) => p.id === provider)!

  const allSelected = sel.size === findings.length && findings.length > 0
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(findings.map((f) => f.id)))
  const toggle = (id: number) => setSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const send = async () => {
    const chosen = findings.filter((f) => sel.has(f.id))
    if (chosen.length === 0) return
    let target: GitTarget
    try { target = parsePrUrl(provider, prUrl) } catch (e) { pcrSwal.fire({ icon: 'error', title: t.linkInvalid, text: e instanceof Error ? e.message : String(e) }); return }

    if (sendMode === 'commit') { await sendAsCommit(chosen, target, token); return }

    const c = await pcrSwal.fire({
      title: t.confirmSendTitle(meta.label),
      html: t.confirmSendHtml(chosen.length, meta.prLabel, String(target.id), combine),
      icon: 'question', showCancelButton: true,
      confirmButtonText: t.yesSend, cancelButtonText: t.no,
    })
    if (!c.isConfirmed) return

    await attemptSend(chosen, target, token, new Set<number>())
  }

  // Gönderimi dener; yetki hatası olursa token doğrulama ekranı açar ve KALDIĞI YERDEN devam eder.
  const attemptSend = async (chosen: Finding[], target: GitTarget, authToken: string, sentIds: Set<number>) => {
    setSending(true)
    let fail = 0
    let authFail = false
    const errs: string[] = []
    const auth = { token: authToken, username }
    try {
      if (combine && sentIds.size === 0) {
        const body = `${t.combinedHeader(chosen.length)}\n\n` + chosen.map(formatComment).join('\n\n---\n\n')
        try { await postComment(target, auth, body); chosen.forEach((f) => sentIds.add(f.id)) }
        catch (e) { const m = e instanceof Error ? e.message : String(e); if (isAuthError(m)) authFail = true; else fail = chosen.length; errs.push(m) }
      } else {
        for (const f of chosen) {
          if (sentIds.has(f.id)) continue // daha önce gönderilenleri tekrar gönderme
          try { await postComment(target, auth, formatComment(f)); sentIds.add(f.id) }
          catch (e) {
            const m = e instanceof Error ? e.message : String(e)
            if (isAuthError(m)) { authFail = true; errs.push(m); break } // token'ı düzeltince kalanı sürer
            fail++; if (errs.length < 3) errs.push(m)
          }
        }
      }
    } finally { setSending(false) }

    const ok = sentIds.size

    // Yetki hatası → token ile doğrula ve devam et ekranı
    if (authFail) {
      const { value: newToken } = await pcrSwal.fire({
        title: t.authTitle,
        html: t.authCommentHtml(meta.tokenLabel) + (ok > 0 ? t.authAlreadySent(ok) : ''),
        input: 'password',
        inputPlaceholder: t.gitTokenPh,
        inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
        showCancelButton: true,
        confirmButtonText: t.authConfirm,
        cancelButtonText: t.cancel,
        footer: `<a href="${tokenPageUrl(provider, host || target.webBase)}" target="_blank" rel="noreferrer">${t.authFooter(meta.tokenLabel)}</a>`,
        inputValidator: (v) => (!v || !v.trim() ? t.authTokenRequired : undefined),
      })
      if (newToken && newToken.trim()) {
        const tok = newToken.trim()
        onToken(tok) // yeni token'ı üst state'e ve localStorage'a yaz
        await attemptSend(chosen, target, tok, sentIds) // kaldığı yerden devam
        return
      }
      // Vazgeçti
      await pcrSwal.fire({ icon: 'info', title: t.sendStopped, html: t.sendStoppedHtml(ok) })
      if (ok >= chosen.length) onClose()
      return
    }

    if (fail === 0) {
      await pcrSwal.fire({ icon: 'success', title: t.sentTitle, html: t.sentHtml(ok) })
      onClose()
    } else {
      await pcrSwal.fire({ icon: 'warning', title: t.partialTitle, html: t.partialHtml(ok, fail, errs.join('<br>')) })
    }
  }

  /**
   * TODO commit'i akışı: kaynak dal çözülür → dosyalar okunup TODO'lar yerleştirilir →
   * önizleme onaylanırsa tek commit olarak dala push edilir. Yetki hatasında token istenir ve tekrar denenir.
   */
  const sendAsCommit = async (chosen: Finding[], target: GitTarget, authToken: string) => {
    const auth = { token: authToken, username }
    let ct: CommitTarget
    let edits: FileEdit[]
    setSending(true)
    try {
      ct = await resolveCommitTarget(target, auth)
      edits = await prepareTodoEdits(target, auth, ct, chosen)
    } catch (e) {
      setSending(false)
      const m = e instanceof Error ? e.message : String(e)
      if (isAuthError(m)) { await retryWithToken(chosen, target, m); return }
      await pcrSwal.fire({ icon: 'error', title: t.prepareFailed, html: esc(m) })
      return
    } finally { setSending(false) }

    const touched = edits.filter((e) => e.inserted > 0)
    const skipped = edits.reduce((n, e) => n + e.skipped.length, 0)
    if (touched.length === 0) {
      await pcrSwal.fire({
        icon: 'info', title: t.noTodoTitle,
        html: skipped > 0 ? t.noTodoSkipped(skipped) : t.noTodoExisting,
      })
      return
    }

    const rows = touched.map((e) => `<li><code>${esc(e.path)}</code> — ${t.commitRow(e.inserted)}</li>`).join('')
    const { isConfirmed, value: message } = await pcrSwal.fire({
      title: t.commitConfirmTitle,
      html:
        `<div style="text-align:left">${t.commitBranch}: <b>${esc(ct.branch)}</b><br>` +
        t.commitSummary(touched.length, touched.reduce((n, e) => n + e.inserted, 0)) +
        `<ul style="margin:8px 0 0;padding-left:18px;font-size:13px">${rows}</ul>` +
        (skipped > 0 ? `<small style="color:#b45309">${t.commitSkipped(skipped)}</small>` : '') +
        `</div>`,
      icon: 'question', input: 'text', inputLabel: t.commitMessageLabel,
      inputValue: defaultCommitMessage(edits).split('\n')[0],
      inputValidator: (v) => (!v || !v.trim() ? t.commitMessageRequired : undefined),
      showCancelButton: true, confirmButtonText: t.yesCommit, cancelButtonText: t.cancel,
    })
    if (!isConfirmed) return

    setSending(true)
    try {
      const url = await pushCommit(target, auth, ct, edits, String(message).trim())
      await pcrSwal.fire({
        icon: 'success', title: t.commitDoneTitle,
        html: t.commitDoneHtml(esc(ct.branch)) + (url ? `<br><a href="${esc(url)}" target="_blank" rel="noreferrer">${t.commitOpen}</a>` : '')
      })
      onClose()
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      if (isAuthError(m)) { await retryWithToken(chosen, target, m); return }
      await pcrSwal.fire({ icon: 'error', title: t.commitFailed, html: esc(m) })
    } finally { setSending(false) }
  }

  // Yetki hatasında yazma yetkili token isteyip commit akışını baştan dener (henüz commit atılmadığı için güvenli).
  const retryWithToken = async (chosen: Finding[], target: GitTarget, reason: string) => {
    const { value: newToken } = await pcrSwal.fire({
      title: t.authTitle,
      html: t.authCommitHtml(meta.tokenLabel) + `<br><small>${esc(reason.slice(0, 180))}</small>`,
      input: 'password', inputPlaceholder: t.gitTokenPh,
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true, confirmButtonText: t.authConfirmRetry, cancelButtonText: t.cancel,
      footer: `<a href="${tokenPageUrl(provider, host || target.webBase)}" target="_blank" rel="noreferrer">${t.authFooter(meta.tokenLabel)}</a>`,
      inputValidator: (v) => (!v || !v.trim() ? t.authTokenRequired : undefined),
    })
    if (!newToken || !String(newToken).trim()) return
    const tok = String(newToken).trim()
    onToken(tok)
    await sendAsCommit(chosen, target, tok)
  }

  const noLine = findings.filter((f) => sel.has(f.id) && f.line == null).length

  return (
    <div className="send-panel">
      <div className="send-head">
        <div className="send-head-l">
          <span className="send-ic">📤</span>
          <div>
            <h3>{t.sendTitle}</h3>
            <p>{sendMode === 'comment' ? t.sendSubComment : t.sendSubCommit}</p>
          </div>
        </div>
        <button className="send-x" onClick={onClose} aria-label={t.close}>✕</button>
      </div>

      <div className="send-modes">
        <button type="button" className={`smode ${sendMode === 'comment' ? 'on' : ''}`} onClick={() => setSendMode('comment')}>
          <span className="smode-ic">💬</span>
          <span className="smode-txt"><b>{t.sendModeComment}</b><small>{t.sendModeCommentSub(meta.prLabel)}</small></span>
        </button>
        <button type="button" className={`smode ${sendMode === 'commit' ? 'on' : ''}`} onClick={() => setSendMode('commit')}>
          <span className="smode-ic">📝</span>
          <span className="smode-txt"><b>{t.sendModeCommit}</b><small>{t.sendModeCommitSub}</small></span>
        </button>
      </div>

      <div className="send-tools">
        <button type="button" className={`sw ${allSelected ? 'on' : ''}`} onClick={toggleAll}>
          <span className="sw-box">{allSelected ? '✓' : ''}</span>
          {t.selectAll}
          <span className="sw-count">{sel.size}/{findings.length}</span>
        </button>
        {sendMode === 'comment' && (
          <label className={`sw ${combine ? 'on' : ''}`}>
            <input type="checkbox" checked={combine} onChange={(e) => setCombine(e.target.checked)} />
            <span className="sw-box">{combine ? '✓' : ''}</span>
            {t.combineOne}
          </label>
        )}
      </div>

      {sendMode === 'commit' && (
        <div className="send-hint">
          ℹ️ {t.commitHint(meta.prLabel)}
          {noLine > 0 && <> <b>{t.commitHintNoLine(noLine)}</b></>}
        </div>
      )}

      <div className="send-list">
        {findings.map((f) => {
          const on = sel.has(f.id)
          return (
            <div key={f.id} className={`send-item ${on ? 'on' : ''}`} onClick={() => toggle(f.id)} role="checkbox" aria-checked={on}>
              <span className="send-check">{on ? '✓' : ''}</span>
              <div className="send-item-body">
                <div className="send-item-top">
                  <span className={`sev ${f.severity}`}>{f.severity}</span>
                  <span className={`badge ${f.source}`}>{f.source === 'LLM' ? '🤖 AI' : `⚙️ ${t.badgeRule}`}</span>
                  <code className="send-loc">{f.filePath}:{f.line ?? '?'}</code>
                  <strong className="send-rule">{f.ruleName}</strong>
                </div>
                <div className="send-item-msg">{f.message}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="send-actions">
        <button className="send-go" onClick={send} disabled={sending || sel.size === 0}>
          {sending
            ? (sendMode === 'commit' ? t.preparingCommit : t.sending)
            : sendMode === 'commit' ? t.commitSelected(sel.size) : t.sendSelected(sel.size)}
        </button>
        <button className="send-cancel" onClick={onClose} disabled={sending}>{t.cancel}</button>
        {!token.trim() && <span className="send-warn">{t.noTokenWarn(meta.tokenLabel)}</span>}
      </div>
    </div>
  )
}

/** Bir bulguyu GitLab markdown yorumuna çevirir. */
function formatComment(f: Finding): string {
  const t = ui()
  const src = f.source === 'LLM' ? '🤖 AI' : t.commentRule
  const fix = f.suggestion ? `\n\n> 💡 **${t.commentSuggestion}:** ${f.suggestion}` : ''
  return `**[${f.severity}] ${f.ruleName}** · \`${f.filePath}:${f.line ?? '?'}\` · ${src}\n\n${f.message}${fix}\n\n<sub>Portal Code Review</sub>`
}

/**
 * Özet grafiğinden seçilen bulgu filtresi. Hem özet listesini hem de aşağıdaki
 * dosya kartlarındaki bulguları daraltır.
 */
export type FindingFilter =
  | { kind: 'sev'; value: Severity }
  | { kind: 'src'; value: Finding['source'] }
  | { kind: 'file'; value: string }
  | null

/**
 * Bulgu, özet grafiğinden seçilen filtreye uyuyor mu?
 * @param filter null ise her bulgu geçer (filtre yok)
 */
function matchesFilter(f: Finding, filter: FindingFilter): boolean {
  if (!filter) return true
  if (filter.kind === 'sev') return f.severity === filter.value
  if (filter.kind === 'src') return f.source === filter.value
  return f.filePath === filter.value
}

/** Filtrenin insan-okur etiketi (temizle çubuğunda gösterilir). */
function filterLabel(filter: FindingFilter): string {
  if (!filter) return ''
  const t = ui()
  if (filter.kind === 'sev') return t.filterSev(filter.value)
  if (filter.kind === 'src') return filter.value === 'LLM' ? t.filterSrcAi : t.filterSrcRule
  return t.filterFile(filter.value.split('/').pop() ?? filter.value)
}

/** İki filtre aynı seçimi mi gösteriyor? (aynı satıra tekrar tıklayınca filtreyi kaldırmak için) */
const sameFilter = (a: FindingFilter, b: FindingFilter) =>
  !!a && !!b && a.kind === b.kind && a.value === b.value

/** Bulgu önem dereceleri için grafik renkleri (Kurallar sekmesindeki kapsam paletiyle aynı dil). */
const SEV_COLOR: Record<Severity, string> = {
  BLOCKER: '#ef4444', CRITICAL: '#f97316', MAJOR: '#f59e0b', MINOR: '#10b981', INFO: '#94a3b8',
}

/**
 * İnceleme istatistikleri: önem dağılımı halkası + kaynak (kural/AI) ve en çok bulgu alan
 * dosyaların oransal barları. Kurallar sekmesindeki kapsam paneliyle aynı görsel dili kullanır.
 */
function FindingStats({ findings, fileCount, filter, onFilter }: {
  findings: Finding[]; fileCount: number; filter: FindingFilter; onFilter: (f: FindingFilter) => void
}) {
  const t = ui()
  // Satıra tıklamak filtreyi uygular; aynı satıra tekrar tıklamak temizler.
  const pick = (f: NonNullable<FindingFilter>) => onFilter(sameFilter(filter, f) ? null : f)
  const dim = (f: NonNullable<FindingFilter>) => (filter && !sameFilter(filter, f) ? 'dim' : '')
  const total = findings.length
  const bySev = (s: Severity) => findings.filter((f) => f.severity === s).length
  const shownSev = SEV_ORDER.filter((s) => bySev(s) > 0)
  const ai = findings.filter((f) => f.source === 'LLM').length
  const rule = total - ai

  // Bulgu alan TÜM dosyalar, en çoktan aza (liste uzunsa kendi içinde kaydırılır)
  const perFile = new Map<string, number>()
  for (const f of findings) perFile.set(f.filePath, (perFile.get(f.filePath) ?? 0) + 1)
  const fileRows = Array.from(perFile.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const worst = fileRows[0]?.[1] ?? 1
  const touchedFiles = perFile.size

  // Halka: önem derecesine göre yay uzunlukları (r=54 → çevre ≈ 339.29)
  const R = 54
  const C = 2 * Math.PI * R
  let offset = 0
  const arcs = shownSev.map((s) => {
    const len = (bySev(s) / total) * C
    const arc = { s, len, offset }
    offset += len
    return arc
  })
  const blockerish = bySev('BLOCKER') + bySev('CRITICAL')

  return (
    <div className="fstats">
      <div className="fstats-ring">
        <svg viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
          <circle cx="64" cy="64" r={R} fill="none" stroke="var(--border-2)" strokeWidth="13" />
          {arcs.map(({ s, len, offset: off }) => (
            <circle
              key={s} cx="64" cy="64" r={R} fill="none"
              stroke={SEV_COLOR[s]} strokeWidth="13" strokeLinecap="butt"
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`}
              strokeDashoffset={-off} transform="rotate(-90 64 64)"
            />
          ))}
        </svg>
        <span className="fstats-ring-txt"><b>{total}</b><small>{t.findingsWord}</small></span>
      </div>

      <div className="fstats-body">
        <div className="fstats-top">
          <span className="fstats-kpi">{t.filesWithFindings(touchedFiles, fileCount)}</span>
          <span className={`fstats-kpi ${blockerish > 0 ? 'bad' : 'good'}`}>
            <b>{blockerish}</b> {t.blockerish}
          </span>
          <span className="fstats-kpi"><b>{(total / Math.max(touchedFiles, 1)).toFixed(1)}</b> {t.perFile}</span>
        </div>

        <div className="fstats-cols">
          <div className="fstats-col">
            <h5>{t.sevDistribution}</h5>
            {shownSev.map((s) => (
              <button
                key={s} className={`fstats-row ${filter?.kind === 'sev' && filter.value === s ? 'on' : ''} ${dim({ kind: 'sev', value: s })}`}
                onClick={() => pick({ kind: 'sev', value: s })} title={t.onlySev(s)}
              >
                <span className="fstats-key"><i style={{ background: SEV_COLOR[s] }} />{s}</span>
                <span className="fstats-bar"><i style={{ width: `${(bySev(s) / total) * 100}%`, background: SEV_COLOR[s] }} /></span>
                <span className="fstats-n">{bySev(s)}</span>
              </button>
            ))}
            <div className="fstats-src">
              <button className={`${filter?.kind === 'src' && filter.value === 'RULE' ? 'on' : ''} ${dim({ kind: 'src', value: 'RULE' })}`}
                      onClick={() => pick({ kind: 'src', value: 'RULE' })} title={t.onlyRuleFindings} disabled={rule === 0}>
                <i className="src rule" /> {rule} {t.rules}
              </button>
              <button className={`${filter?.kind === 'src' && filter.value === 'LLM' ? 'on' : ''} ${dim({ kind: 'src', value: 'LLM' })}`}
                      onClick={() => pick({ kind: 'src', value: 'LLM' })} title={t.onlyAiFindings} disabled={ai === 0}>
                <i className="src ai" /> {ai} AI
              </button>
            </div>
          </div>

          <div className="fstats-col">
            <h5>{t.findingsPerFile} <span className="fstats-count">{fileRows.length}</span></h5>
            <div className="fstats-scroll">
              {fileRows.map(([path, n]) => (
                <button
                  key={path} className={`fstats-row ${filter?.kind === 'file' && filter.value === path ? 'on' : ''} ${dim({ kind: 'file', value: path })}`}
                  onClick={() => pick({ kind: 'file', value: path })} title={t.onlyThisFile(path)}
                >
                  <span className="fstats-key file">{path.split('/').pop()}</span>
                  <span className="fstats-bar"><i style={{ width: `${(n / worst) * 100}%`, background: 'var(--accent)' }} /></span>
                  <span className="fstats-n">{n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * İnceleme özeti: sayı kutucukları, istatistik grafiği ve (filtreye göre süzülmüş) bulgu listesi.
 * @param filter Grafikten seçilen filtre; listeyi daraltır
 * @param onFilter Filtre değiştiğinde çağrılır (üst bileşen dosya kartlarını da süzer)
 */
function ReviewSummary({ findings, mode, cfg, fileCount, files, filter, onFilter }: {
  findings: Finding[]; mode: ReviewMode; cfg: LlmConfig | null; fileCount: number
  files: ChangedFile[]; filter: FindingFilter; onFilter: (f: FindingFilter) => void
}) {
  const [detail, setDetail] = useState<Finding | null>(null)   // detay penceresinde açık bulgu
  const t = ui()
  const ai = findings.filter((f) => f.source === 'LLM').length
  const rule = findings.length - ai
  const bySev = (s: Severity) => findings.filter((f) => f.severity === s).length
  const shown = findings.filter((f) => matchesFilter(f, filter))
  const sorted = shown.slice().sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))
  return (
    <div className="rsum">
      <div className="rsum-head">
        <div className="rsum-title">{t.summaryTitle}</div>
        <div className="rsum-meta">{t.summaryMeta(fileCount)}{modeText(mode)?.label}{mode !== 'RULES_ONLY' && cfg && <> · 🤖 {cfg.provider}/{cfg.model}</>}</div>
      </div>
      <div className="tiles">
        <div className="tile total"><b>{findings.length}</b><span>{t.total}</span></div>
        <div className="tile ruletile"><b>{rule}</b><span>{t.rules}</span></div>
        <div className="tile aitile"><b>{ai}</b><span>🤖 AI</span></div>
        {SEV_ORDER.filter((s) => bySev(s) > 0).map((s) => (<div key={s} className={`tile sevtile ${s}`}><b>{bySev(s)}</b><span>{s}</span></div>))}
      </div>
      {findings.length > 0 && <FindingStats findings={findings} fileCount={fileCount} filter={filter} onFilter={onFilter} />}
      {filter && (
        <div className="rsum-filter">
          <span>{t.filterPrefix}<b>{filterLabel(filter)}</b> · {t.filterShowing(shown.length, findings.length)}</span>
          <button className="ghost small" onClick={() => onFilter(null)}>{t.clearFilter}</button>
        </div>
      )}
      {sorted.length > 0 ? (
        <ol className="rsum-list">
          {sorted.map((f) => (
            <li key={f.id} className={f.source === 'LLM' ? 'ai' : ''}>
              <button className="rsum-open" onClick={() => setDetail(f)} title={t.seeDetails}>
                <span className={`sev ${f.severity}`}>{f.severity}</span>
                <span className={`badge ${f.source}`}>{f.source === 'LLM' ? '🤖 AI' : t.badgeRule}</span>
                <code>{f.filePath.split('/').pop()}:{f.line ?? '?'}</code>
                <span className="rsum-rule">{f.ruleName}</span>
                <span className="rsum-msg">{f.message}</span>
                <span className="rsum-go" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ol>
      ) : <p className="rsum-empty">{t.noFindings}</p>}

      {detail && (
        <FindingDetail
          finding={detail}
          file={files.find((x) => x.path === detail.filePath)}
          cfg={cfg}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

/** Detay modalında gösterilecek tek bir kod satırı. */
interface SnippetLine { n: number; content: string; hit: boolean }

/**
 * Bulgunun düştüğü satırı ve çevresini diff'ten çıkarır.
 * Diff'te yalnızca EKLENEN satırlar izlendiği için parçacık da eklenen satırlardan oluşur;
 * hedef satır `hit` ile işaretlenir.
 * @param file Bulgunun ait olduğu değişen dosya
 * @param line Bulgunun satır numarası (null ise dosya düzeyi bulgu → boş parçacık)
 * @param around Hedefin altında/üstünde gösterilecek satır sayısı
 */
function snippetFor(file: ChangedFile | undefined, line: number | null, around = 3): SnippetLine[] {
  if (!file || line == null) return []
  const lines = file.addedLines
  const idx = lines.findIndex((a) => a.newLineNumber === line)
  if (idx < 0) return []
  return lines
    .slice(Math.max(0, idx - around), idx + around + 1)
    .map((a) => ({ n: a.newLineNumber, content: a.content, hit: a.newLineNumber === line }))
}

/**
 * Bulgu detay penceresi: bulgunun mesajı, önerisi, DENK GELDİĞİ KOD PARÇACIĞI ve
 * (kural kaynaklıysa) kuralı tetikleyen desen/dedektör bilgisi.
 *
 * @param finding Gösterilecek bulgu
 * @param file Bulgunun ait olduğu değişen dosya (kod parçacığı buradan çıkarılır)
 * @param cfg Bağlı AI (kaynak rozetinde sağlayıcı adını göstermek için)
 */
function FindingDetail({ finding, file, cfg, onClose }: {
  finding: Finding; file?: ChangedFile; cfg: LlmConfig | null; onClose: () => void
}) {
  const t = ui()
  const snippet = snippetFor(file, finding.line)
  // Kural kaynaklı bulgularda, kuralı md deposundan bulup hangi desenin çalıştığını göster.
  const rule = finding.source === 'RULE'
    ? (() => { try { return md.readAllRules().find((r) => r.name === finding.ruleName) } catch { return undefined } })()
    : undefined
  const explain = rule ? explainRule(rule) : null

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <Portal>
      <div className="fd-overlay" onClick={onClose}>
        <div className="fd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.fdTitle}>
          <header className={`fd-head sev-${finding.severity}`}>
            <div className="fd-head-l">
              <span className={`sev ${finding.severity}`}>{finding.severity}</span>
              <span className={`badge ${finding.source}`}>
                {finding.source === 'LLM' ? `🤖 ${cfg?.provider ?? 'AI'}` : `⚙️ ${t.badgeRule}`}
              </span>
              <h3>{finding.ruleName}</h3>
            </div>
            <button className="fd-x" onClick={onClose} aria-label={t.close}>✕</button>
          </header>

          <div className="fd-body">
            <section className="fd-sec">
              <h4>{t.fdLocation}</h4>
              <div className="fd-loc">
                <code>{finding.filePath}</code>
                {finding.line != null
                  ? <span className="fd-line">{t.line} {finding.line}</span>
                  : <span className="fd-line file">{t.fdFileLevel}</span>}
              </div>
            </section>

            <section className="fd-sec">
              <h4>{t.fdFinding}</h4>
              <p className="fd-msg">{finding.message}</p>
            </section>

            {finding.suggestion && (
              <section className="fd-sec">
                <h4>{t.fdSuggestion}</h4>
                <p className="fd-fix">{finding.source === 'LLM' ? '🤖 ' : '💡 '}{finding.suggestion}</p>
              </section>
            )}

            <section className="fd-sec">
              <h4>{t.fdMatchedCode}</h4>
              {snippet.length > 0 ? (
                <pre className="fd-code">
                  {snippet.map((l) => (
                    <div key={l.n} className={`fd-cl ${l.hit ? 'hit' : ''}`}>
                      <span className="fd-cn">{l.n}</span>
                      <span className="fd-ct">{l.content || ' '}</span>
                    </div>
                  ))}
                </pre>
              ) : (
                <p className="fd-none">
                  {finding.line == null ? t.fdWholeFile : t.fdNotInDiff}
                </p>
              )}
            </section>

            {explain && (
              <section className="fd-sec">
                <h4>{t.fdProducedBy}</h4>
                <div className="fd-rule">
                  <span className={`cover ${COVER_META[explain.coverage].cls}`}>{coverText(explain.coverage).label}</span>
                  <p>{explain.message}</p>
                </div>
                {explain.checks.map((c, i) => (
                  <div key={i} className="fd-check">
                    <b>{c.label}</b>
                    {c.code && <code>/{c.code}/</code>}
                    <small>{c.meaning}</small>
                  </div>
                ))}
              </section>
            )}
          </div>

          <footer className="fd-foot">
            <small>{finding.filePath.split('/').pop()}{finding.line != null ? `:${finding.line}` : ''}</small>
          </footer>
        </div>
      </div>
    </Portal>
  )
}

/** Unified diff'i satır türüne göre renklendirerek gösterir (eklenen/silinen/hunk/bağlam). */
function Diff({ raw }: { raw: string }) {
  const lines = (raw ?? '').split('\n')
  return (
    <pre className="diff">
      {lines.map((ln, i) => {
        let cls = 'ctx'
        if (ln.startsWith('@@')) cls = 'hunk'
        else if (ln.startsWith('+') && !ln.startsWith('+++')) cls = 'add'
        else if (ln.startsWith('-') && !ln.startsWith('---')) cls = 'del'
        return <div key={i} className={`dl ${cls}`}>{ln || ' '}</div>
      })}
    </pre>
  )
}

/** Yükleme ekranı başlıkları/mesajları — aktif dile göre çözülür. */
function loaderSet(mode: ReviewMode): { title: string; sub: string; msgs: string[] } {
  const t = ui()
  const M = {
    fetch: t.loaderMsgFetch, rules: t.loaderMsgRules, scan: t.loaderMsgScan,
    ai: t.loaderMsgAi, find: t.loaderMsgFind, sug: t.loaderMsgSug,
  }
  if (mode === 'AI_ONLY') return { title: t.loaderAiOnly, sub: t.loaderAiOnlySub, msgs: [M.fetch, M.ai, M.find, M.sug] }
  if (mode === 'RULES_ONLY') return { title: t.loaderRules, sub: t.loaderRulesSub, msgs: [M.fetch, M.rules, M.scan, M.find] }
  return { title: t.loaderHybrid, sub: t.loaderHybridSub, msgs: [M.fetch, M.rules, M.ai, M.find, M.sug] }
}

/** mm:ss biçiminde geçen süre. */
function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * İnceleme yükleme ekranı — sayfanın EN ÜSTÜNDE (portal ile body'ye taşınır, Navbar dahil
 * her şeyin üzerinde). Proje temasıyla uyumlu; geçen süre sayacı ve ilerleme çubuğu içerir.
 * İlerleme gerçek adımlardan gelir: toplam bilinmiyorsa çubuk belirsiz modda akar.
 */
function ReviewLoader({ mode, progress, startedAt }: {
  mode: ReviewMode; progress: ReviewProgress | null; startedAt: number
}) {
  const t = ui()
  const set = loaderSet(mode)
  const [i, setI] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Dönen bilgi mesajı (yalnızca gerçek bir ilerleme etiketi yokken gösterilir)
  useEffect(() => {
    setI(0)
    const t = setInterval(() => setI((v) => (v + 1) % set.msgs.length), 1600)
    return () => clearInterval(t)
  }, [mode, set.msgs.length])

  // Geçen süre sayacı
  useEffect(() => {
    setElapsed(Date.now() - startedAt)
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 250)
    return () => clearInterval(t)
  }, [startedAt])

  const determinate = !!progress && progress.total > 0
  const pct = determinate ? Math.min(100, Math.round((progress!.done / progress!.total) * 100)) : 0
  const label = progress?.label ?? set.msgs[i]

  return (
    <Portal>
      <div className="rl-overlay" role="status" aria-live="polite">
        <div className="rl-card">
          <div className="rl-stage">
            <div className="rl-orbit">
              <span className="rl-dot d1" /><span className="rl-dot d2" /><span className="rl-dot d3" />
              <div className="rl-icon">
                <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
                  <defs><linearGradient id="rlg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7aa2ff" /><stop offset="1" stopColor="#8a5cff" /></linearGradient></defs>
                  <circle className="rl-ring" cx="60" cy="60" r="52" fill="none" stroke="url(#rlg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 260" />
                  <rect x="34" y="36" width="52" height="48" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
                  <circle cx="41" cy="43" r="1.8" fill="#ff7a7a" /><circle cx="47" cy="43" r="1.8" fill="#ffd27a" /><circle cx="53" cy="43" r="1.8" fill="#7ee0a0" />
                  <g className="rl-lines"><rect x="40" y="52" width="26" height="3" rx="1.5" fill="#3b466b" /><rect x="40" y="60" width="34" height="3" rx="1.5" fill="#4a3a63" /><rect x="40" y="68" width="20" height="3" rx="1.5" fill="#2f5a41" /></g>
                  <rect className="rl-scan" x="34" y="36" width="52" height="3" fill="#7aa2ff" opacity="0.5" />
                  <g className="rl-lens"><circle cx="78" cy="76" r="12" fill="none" stroke="url(#rlg)" strokeWidth="3.5" /><line x1="87" y1="85" x2="98" y2="96" stroke="url(#rlg)" strokeWidth="4" strokeLinecap="round" /></g>
                  <path className="rl-spark" d="M60 6 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 z" fill="#c79bff" />
                </svg>
              </div>
            </div>
            <div className="rl-title">{set.title}</div>
            <div className="rl-sub">{set.sub}</div>
          </div>

          <div className="rl-progress">
            <div className="rl-msg" key={label}>{label}</div>
            <div className={`rl-bar ${determinate ? '' : 'indet'}`}>
              <i style={determinate ? { width: `${pct}%` } : undefined} />
            </div>
            <div className="rl-meta">
              <span className="rl-timer">⏱ {formatElapsed(elapsed)}</span>
              {determinate
                ? <span className="rl-count">{t.loaderFiles(progress!.done, progress!.total, pct)}</span>
                : <span className="rl-count">{t.loaderVariable}</span>}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/* ============================ Kurallar (md) sayfası ============================ */

const emptyDraft: RuleDraft = { name: '', description: '', type: 'REGEX', severity: 'MAJOR', filePattern: '**', body: '', enabled: true }

/* ============================ "Nasıl kural eklenir?" rehberi (modal) ============================ */

// Dedektörleri tetikleyen anahtar kelimeler — dedektörler hem TR hem EN terimleri tanır,
// bu yüzden listeyi arayüz diline göre gösteriyoruz (bkz. detectors.ts `keywords`).
const DETECTOR_KEYWORDS_TR = [
  'yorum', 'console', 'System.out', 'print(', 'println( / puts', 'println! / dbg!', 'fmt.Print',
  'Console.WriteLine', 'var_dump / dd(', 'printStackTrace', 'TODO', 'FIXME', 'any', 'var',
  'debugger', 'alert', 'die / exit / panic', 'parola / secret / token', 'boş catch', '=== / eşitlik',
]
const DETECTOR_KEYWORDS_EN = [
  'comment', 'console', 'System.out', 'print(', 'println( / puts', 'println! / dbg!', 'fmt.Print',
  'Console.WriteLine', 'var_dump / dd(', 'printStackTrace', 'TODO', 'FIXME', 'any', 'var',
  'debugger', 'alert', 'die / exit / panic', 'password / secret / token', 'empty catch', '=== / strict equal',
]

type GuideTab = 'basla' | 'desen' | 'ornek'

/** Kural yazma rehberi — sekmeli, ortalanmış modal. */
function GuideModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<GuideTab>('basla')
  const t = ui()
  const { lang } = useLanguage()
  const detectorKeywords = lang === 'en' ? DETECTOR_KEYWORDS_EN : DETECTOR_KEYWORDS_TR
  const guideTabs: { id: GuideTab; icon: string; label: string; sub: string }[] = [
    { id: 'basla', icon: '🚀', label: t.guideTabStart, sub: t.guideTabStartSub },
    { id: 'desen', icon: '🔧', label: t.guideTabPattern, sub: t.guideTabPatternSub },
    { id: 'ornek', icon: '📌', label: t.guideTabExamples, sub: t.guideTabExamplesSub },
  ]

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <Portal>
    <div className="gm-overlay" onClick={onClose}>
      <div className="gm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.guideTitle}>
        <header className="gm-head">
          <div className="gm-head-l">
            <span className="gm-ic">💡</span>
            <div>
              <h3>{t.guideTitle}</h3>
              <p>{t.guideSub}</p>
            </div>
          </div>
          <button className="gm-x" onClick={onClose} aria-label={t.close}>✕</button>
        </header>

        <nav className="gm-tabs">
          {guideTabs.map((g) => (
            <button key={g.id} className={tab === g.id ? 'on' : ''} onClick={() => setTab(g.id)}>
              <span className="gm-tab-ic">{g.icon}</span>
              <span className="gm-tab-txt"><b>{g.label}</b><small>{g.sub}</small></span>
            </button>
          ))}
        </nav>

        <div className="gm-body">
          {tab === 'basla' && (
            <>
              <div className="guide-steps">
                <div className="gstep"><span className="gnum">1</span><div><b>{t.guideStep1}</b><small>{t.guideStep1Sub}</small></div></div>
                <div className="gstep"><span className="gnum">2</span><div><b>{t.guideStep2}</b><small>{t.guideStep2Sub}</small></div></div>
                <div className="gstep"><span className="gnum">3</span><div><b>{t.guideStep3}</b><small>{t.guideStep3Sub}</small></div></div>
              </div>

              <div className="guide-types">
                <div className="gtype">
                  <div className="gtype-h"><span className="badge REGEX">{t.badgePattern}</span> {t.guideRegexHead}</div>
                  <p>{t.guideRegexBody}</p>
                  <div className="gex"><span>{t.guideBody}</span><code>console\.log</code></div>
                </div>
                <div className="gtype">
                  <div className="gtype-h"><span className="badge LLM">{t.badgeText}</span> {t.guideTextHead}</div>
                  <p>{t.guideTextBody}</p>
                  <div className="gex"><span>{t.guideBody}</span><code>{t.guideTextBodyEx}</code></div>
                </div>
              </div>

              <div className="guide-kw">
                <b>{t.guideKwTitle}</b>
                <div className="kws">{detectorKeywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
                <small>{t.guideKwNote}</small>
              </div>
            </>
          )}

          {tab === 'desen' && (
            <>
              <p className="gm-lead">{t.guideLead}</p>

              <div className="gm-cards">
                <div className="gm-card forbid">
                  <div className="gm-card-h"><span>⛔</span><b>{t.guideForbidHead}</b></div>
                  <code>{t.guideForbidEx}/style=\{'{{'}/</code>
                  <p>{t.guideForbidNote}</p>
                </div>
                <div className="gm-card require">
                  <div className="gm-card-h"><span>✅</span><b>{t.guideRequireHead}</b></div>
                  <code>{t.guideRequireEx}/describe\s*\(/</code>
                  <p>{t.guideRequireNote}</p>
                </div>
                <div className="gm-card limit">
                  <div className="gm-card-h"><span>📏</span><b>{t.guideLimitHead}</b></div>
                  <code>{t.guideLimitEx}</code>
                  <p>{t.guideLimitNote}</p>
                </div>
              </div>

              <div className="gm-warn">
                <b>{t.guideWarnTitle}</b>
                <ul>
                  <li>{t.guideWarn1}</li>
                  <li><code>[metin](hedef)</code> — {t.guideWarn2}</li>
                  <li><code>/</code> → <code>\/</code> {t.guideWarn3}</li>
                  <li>{t.guideWarn4}</li>
                </ul>
              </div>
            </>
          )}

          {tab === 'ornek' && (
            <div className="guide-ex">
              {t.guideExamples.map((ex, i) => (
                <div key={i} className="exrow">
                  <span className={`badge ${ex.type}`}>{ex.type === 'REGEX' ? t.badgePattern : t.badgeText}</span>
                  <code>{ex.pattern}</code>
                  <span className="exname">{ex.name}</span>
                  <span className="exbody">{ex.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="gm-foot">
          <small>{t.guideFoot}</small>
          <button onClick={onClose}>{t.guideOk}</button>
        </footer>
      </div>
    </div>
    </Portal>
  )
}

/** Kuralın hangi yolla denetlendiğini gösteren rozet/grafik bilgisi (dilden bağımsız kısım). */
const COVER_META: Record<RuleCoverage, { cls: string; color: string }> = {
  REGEX: { cls: 'auto', color: '#3b82f6' },
  PATTERN: { cls: 'auto', color: '#8b5cf6' },
  DETECTOR: { cls: 'auto', color: '#10b981' },
  LIMIT: { cls: 'auto', color: '#f59e0b' },
  MANUAL: { cls: 'manual', color: '#94a3b8' },
}

/** Denetim türünün aktif dildeki etiketi/kısaltması/açıklaması. */
const coverText = (c: RuleCoverage) => ui().coverMeta[c]

const COVER_ORDER: RuleCoverage[] = ['PATTERN', 'DETECTOR', 'REGEX', 'LIMIT', 'MANUAL']

const CHECK_KIND: Record<RuleCheck['kind'], { icon: string; cls: string }> = {
  forbidden: { icon: '⛔', cls: 'forbid' },
  required: { icon: '✅', cls: 'require' },
  regex: { icon: '⛔', cls: 'forbid' },
  detector: { icon: '🔎', cls: 'detect' },
  limit: { icon: '📏', cls: 'limit' },
}

/**
 * Kural detay çekmecesi: kuralın ne dediğini, hangi denetim yoluna düştüğünü,
 * NEDEN öyle olduğunu ve tam olarak hangi desenin/dedektörün çalıştığını gösterir.
 */
function RuleDetail({ rule, onClose, onEdit, onToggle, onDelete }: {
  rule: Rule; onClose: () => void; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  const t = ui()
  const ex = explainRule(rule)
  const m = COVER_META[ex.coverage]
  const cm = coverText(ex.coverage)
  const trace = md.traceParse(rule)
  const [showTrace, setShowTrace] = useState(false)
  const [probeLine, setProbeLine] = useState('')
  const probe = probeRule(rule, probeLine)
  const examples = ruleExamples(rule)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600)
    }).catch(() => { /* pano kapalıysa sessiz geç */ })
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <Portal>
    <div className="rd-overlay" onClick={onClose}>
      <aside className="rd" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.ruleDetailTitle}>
        <header className="rd-head" style={{ borderTopColor: m.color }}>
          <div className="rd-head-txt">
            <span className={`cover ${m.cls}`}>{cm.label}</span>
            <h3>{rule.name}</h3>
          </div>
          <button className="rd-x" onClick={onClose} aria-label={t.close}>✕</button>
        </header>

        <div className="rd-body">
          <section className="rd-sec">
            <h4>{t.rdWhatSays}</h4>
            <p className="rd-msg">{ex.message}</p>
          </section>

          <section className="rd-sec">
            <h4>{t.rdStatus}</h4>
            <div className="rd-cov" style={{ borderColor: m.color + '66', background: m.color + '14' }}>
              <span className="rd-cov-ic" style={{ background: m.color }}>{ex.coverage === 'MANUAL' ? '✋' : '⚙️'}</span>
              <div>
                <b>{ex.headline}</b>
                <p>{ex.why}</p>
              </div>
            </div>
          </section>

          {ex.checks.length > 0 && (
            <section className="rd-sec">
              <h4>{ex.checks.length > 1 ? t.rdChecksMany : t.rdChecksOne}</h4>
              {ex.checks.map((c, i) => (
                <div key={i} className={`rd-check ${CHECK_KIND[c.kind].cls}`}>
                  <div className="rd-check-h">
                    <span>{CHECK_KIND[c.kind].icon}</span>{c.label}
                    {c.code && (
                      <button className="rd-copy" onClick={() => copy(c.code!, `copy-${i}`)}>
                        {copied === `copy-${i}` ? t.rdCopied : t.rdCopy}
                      </button>
                    )}
                  </div>
                  {c.code && <code className="rd-code">/{c.code}/</code>}
                  <p>{c.meaning}</p>
                </div>
              ))}
            </section>
          )}

          {ex.fix && (
            <section className="rd-sec">
              <h4>{t.rdHowFix}</h4>
              <div className="rd-fix">
                <p>{ex.fix}</p>
                <div className="rd-fix-ex">
                  <code>{t.fixExForbidden}/style=\{'{{'}/</code>
                  <code>{t.fixExRequired}/describe\s*\(/</code>
                </div>
              </div>
            </section>
          )}

          <section className="rd-sec">
            <h4>{t.rdScope}</h4>
            <dl className="rd-facts">
              <div><dt>{t.rdFilePattern}</dt><dd><code>{rule.filePattern}</code></dd></div>
              <div><dt>{t.rdSeverity}</dt><dd><span className={`sev ${rule.severity}`}>{rule.severity}</span></dd></div>
              <div><dt>{t.rdType}</dt><dd><span className={`badge ${rule.type}`}>{rule.type === 'REGEX' ? t.badgePattern : t.badgeText}</span></dd></div>
              <div><dt>{t.rdState}</dt><dd>{rule.enabled ? t.rdActive : t.rdInactive}</dd></div>
              <div><dt>{t.rdSource}</dt><dd><small>{rule.sourceFile}</small></dd></div>
            </dl>
          </section>

          <section className="rd-sec">
            <div className="rd-sec-h">
              <h4>{t.rdPipeline}</h4>
              <button className="rd-toggle" onClick={() => setShowTrace((v) => !v)}>
                {showTrace ? t.rdHideSteps : t.rdShowSteps}
              </button>
            </div>

            <div className="rd-pipe">
              <div className="rd-pipe-step">
                <span className="rd-pipe-tag">{t.rdRawLine}</span>
                <pre className="rd-raw">{rule.raw}</pre>
              </div>

              {showTrace && trace.steps.filter((s) => s.removed.length > 0).map((s, i) => (
                <div key={i} className="rd-pipe-step sub">
                  <span className="rd-pipe-tag muted">{s.label}</span>
                  <div className="rd-chips">
                    {s.removed.slice(0, 8).map((x, j) => <code key={j} className="rd-chip-del">{x}</code>)}
                    {s.removed.length > 8 && <span className="rd-chip-more">+{s.removed.length - 8}</span>}
                  </div>
                </div>
              ))}

              <div className="rd-pipe-step">
                <span className="rd-pipe-tag">{t.rdCleanBody}</span>
                <pre className="rd-raw">{trace.cleaned}</pre>
                <small className="rd-pipe-note">{t.rdCleanNote}</small>
              </div>

              <div className="rd-pipe-step">
                <span className="rd-pipe-tag ok">{t.rdFinalMsg}</span>
                <pre className="rd-raw done">{ex.message}</pre>
                <small className="rd-pipe-note">{t.rdFinalNote}</small>
              </div>
            </div>

            <dl className="rd-facts tight">
              <div><dt>{t.rdNameFrom}</dt><dd>{trace.origins.name}</dd></div>
              <div><dt>{t.rdSevFrom}</dt><dd>{trace.origins.severity}</dd></div>
              <div><dt>{t.rdPatternFrom}</dt><dd>{trace.origins.filePattern}</dd></div>
            </dl>
          </section>

          {examples.length > 0 && (
            <section className="rd-sec">
              <h4>{t.rdExamples}</h4>
              <div className="rd-ex">
                {examples.map((e, i) => (
                  <button
                    key={i} className={`rd-ex-row ${e.fires ? 'hit' : 'clean'}`}
                    onClick={() => setProbeLine(e.code)} title={t.rdMoveToProbe}
                  >
                    <span className="rd-ex-tag">{e.fires ? '⛔' : '✓'} {e.label}</span>
                    <code>{e.code}</code>
                    <small>{e.note}</small>
                  </button>
                ))}
              </div>
              {ex.coverage !== 'DETECTOR' && ex.coverage !== 'LIMIT' && (
                <small className="rd-ex-note">{t.rdExamplesNote}</small>
              )}
            </section>
          )}

          <section className="rd-sec">
            <h4>{t.rdProbe}</h4>
            {probe.applicable ? (
              <div className="rd-try">
                <input
                  value={probeLine} onChange={(e) => setProbeLine(e.target.value)}
                  placeholder={t.rdProbePh} spellCheck={false}
                />
                <div className={`rd-try-res ${probeLine.trim() ? (probe.fires ? 'hit' : 'clean') : 'idle'}`}>
                  <b>{!probeLine.trim() ? '·' : probe.fires ? t.rdProbeFires : t.rdProbeClean}</b>
                  <span>{probe.detail}</span>
                </div>
              </div>
            ) : (
              <p className="rd-try-na">{probe.detail}</p>
            )}
          </section>
        </div>

        <footer className="rd-foot">
          <button onClick={onEdit}>{t.rdEdit}</button>
          <button className="ghost" onClick={onToggle}>{rule.enabled ? t.rdDisable : t.rdEnable}</button>
          <button className="ghost rd-del" onClick={onDelete}>{t.rdDelete}</button>
        </footer>
      </aside>
    </div>
    </Portal>
  )
}

/**
 * Kural kapsamı özeti: kaçı makine ile denetleniyor, kaçı insan incelemesi gerektiriyor.
 * Halka ve satırlar tıklanabilir — ilgili denetim türüne göre listeyi filtreler.
 */
function CoverageStats({ rules, active, onPick }: {
  rules: Rule[]; active: '' | 'AUTO' | RuleCoverage; onPick: (c: '' | 'AUTO' | RuleCoverage) => void
}) {
  const t = ui()
  const total = rules.length
  const counts = {} as Record<RuleCoverage, number>
  for (const c of COVER_ORDER) counts[c] = 0
  for (const r of rules) counts[ruleCoverage(r)]++
  const manual = counts.MANUAL
  const auto = total - manual
  const pct = total ? Math.round((auto / total) * 100) : 0

  // Halka: her denetim türü için yay uzunluğu (r=54 → çevre ≈ 339.29)
  const R = 54
  const C = 2 * Math.PI * R
  let offset = 0
  const arcs = COVER_ORDER.filter((c) => counts[c] > 0).map((c) => {
    const len = total ? (counts[c] / total) * C : 0
    const arc = { c, len, offset }
    offset += len
    return arc
  })

  return (
    <div className="covstats">
      <button
        className={`cov-ring ${active === 'AUTO' ? 'on' : ''}`}
        onClick={() => onPick(active === 'AUTO' ? '' : 'AUTO')}
        title={t.coverRingTitle(auto)}
      >
        <svg viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
          <circle cx="64" cy="64" r={R} fill="none" stroke="var(--border-2)" strokeWidth="13" />
          {arcs.map(({ c, len, offset: off }) => (
            <circle
              key={c} cx="64" cy="64" r={R} fill="none"
              stroke={COVER_META[c].color} strokeWidth="13" strokeLinecap="butt"
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`}
              strokeDashoffset={-off}
              transform="rotate(-90 64 64)"
              opacity={active && active !== 'AUTO' && active !== c ? 0.25 : 1}
            />
          ))}
        </svg>
        <span className="cov-ring-txt">
          <b>{pct}%</b>
          <small>{t.coverAuto}</small>
        </span>
      </button>

      <div className="cov-body">
        <div className="cov-head">
          <div className="cov-total">
            <b>{total}</b> {t.coverRules}
            <span className="cov-split">
              <i className="dot auto" /> {auto} {t.coverMachine}
              <i className="dot manual" /> {manual} {t.coverManual}
            </span>
          </div>
          {active && <button className="ghost small" onClick={() => onPick('')}>{t.clearFilter}</button>}
        </div>

        <div className="cov-rows">
          {COVER_ORDER.map((c) => {
            const n = counts[c]
            const share = total ? (n / total) * 100 : 0
            return (
              <button
                key={c} className={`cov-row ${active === c ? 'on' : ''} ${n === 0 ? 'zero' : ''}`}
                onClick={() => onPick(active === c ? '' : c)} title={coverText(c).title} disabled={n === 0}
              >
                <span className="cov-key"><i style={{ background: COVER_META[c].color }} />{coverText(c).short}</span>
                <span className="cov-bar"><i style={{ width: `${share}%`, background: COVER_META[c].color }} /></span>
                <span className="cov-n">{n}</span>
              </button>
            )
          })}
        </div>

        <small className="cov-note">
          {manual === 0 ? t.coverAllAuto : t.coverNote(manual)}
        </small>
      </div>
    </div>
  )
}

/** md dosyalarını alanlarına göre gruplayan <optgroup> listesi (select içinde kullanılır). */
function GroupedFileOptions({ files }: { files: string[] }) {
  const t = ui()
  const AREAS = ['Frontend', 'Backend', 'Genel'] as const
  // Alan anahtarları mdStore'dan gelir (TR); etiketler arayüz diline göre gösterilir.
  const areaLabel: Record<string, string> = { Frontend: t.areaFrontend, Backend: t.areaBackend, Genel: t.areaGeneral }
  const byArea: Record<string, string[]> = { Frontend: [], Backend: [], Genel: [] }
  for (const f of files) byArea[md.fileGroup(f).area].push(f)
  return <>{AREAS.filter((a) => byArea[a].length).map((a) => (
    <optgroup key={a} label={areaLabel[a]}>{byArea[a].map((f) => <option key={f} value={f}>{md.fileGroup(f).icon} {f}</option>)}</optgroup>
  ))}</>
}

/**
 * Kurallar sayfası — projeye gömülü md dosyalarından okunan kurallar (localStorage çalışma kopyası).
 * İki görünüm: "Kurallar" (listele/ara/ekle/düzenle/sil) ve "md Dosyaları" (içeriği düzenle, yeni oluştur, indir).
 */
function RulesPage() {
  const [view, setView] = useState<'rules' | 'files'>('rules')
  const [rules, setRules] = useState<Rule[]>([])
  const [files, setFiles] = useState<string[]>([])
  const [outdated, setOutdated] = useState<string[]>([])
  const [detail, setDetail] = useState<Rule | null>(null)   // detay çekmecesinde açık kural
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft)
  const [target, setTarget] = useState('')
  const [editing, setEditing] = useState<Rule | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [fileFilter, setFileFilter] = useState('')
  const [covFilter, setCovFilter] = useState<'' | 'AUTO' | RuleCoverage>('')
  // md dosya düzenleyici
  const [selFile, setSelFile] = useState('')
  const [content, setContentState] = useState('')
  const [fileMode, setFileMode] = useState<'view' | 'edit'>('view')
  const [newFile, setNewFile] = useState('')
  const t = ui()

  const load = () => {
    const fs = md.listMdFiles(); setFiles(fs)
    setTarget((t) => t || fs[0] || '')
    setRules(md.readAllRules())
    setOutdated(md.outdatedFiles())
  }
  useEffect(() => { load() }, [])

  // --- kural işlemleri ---
  const saveRule = () => {
    if (!draft.name || !draft.body || !target) { setMsg(t.ruleSaveNeeds); return }
    try {
      if (editing) md.updateRule(editing, draft); else md.addRule(target, draft)
      setDraft(emptyDraft); setEditing(null); setMsg(t.ruleSaved(editing ? editing.sourceFile : target)); load()
    } catch (e) { setMsg('⚠️ ' + (e instanceof Error ? e.message : String(e))) }
  }
  const editRule = (r: Rule) => { setEditing(r); setTarget(r.sourceFile); setDraft({ name: r.name, description: r.description, type: r.type, severity: r.severity, filePattern: r.filePattern, body: r.body, enabled: r.enabled }) }
  const toggleRule = (r: Rule) => { md.updateRule(r, { ...r, enabled: !r.enabled }); load() }
  const removeRule = (r: Rule) => { md.deleteRule(r); load() }

  // --- md dosya işlemleri ---
  const openFile = (name: string) => { setSelFile(name); setContentState(md.getContent(name)); setFileMode('view') }
  const saveFile = () => { md.setContent(selFile, content); setMsg(t.updatedOk(selFile)); load() }
  const downloadFile = () => md.downloadFile(selFile)
  const deleteFile = () => { if (confirmDelete(selFile)) { md.deleteFile(selFile); setSelFile(''); setContentState(''); load() } }
  const createFile = () => {
    try { md.createFile(newFile); const name = newFile.trim().endsWith('.md') ? newFile.trim() : newFile.trim() + '.md'; setNewFile(''); load(); openFile(name); setView('files'); setMsg(t.createdOk(name)) }
    catch (e) { setMsg('⚠️ ' + (e instanceof Error ? e.message : String(e))) }
  }
  const resetAll = () => { if (confirmReset()) { md.resetToBundled(); setSelFile(''); setContentState(''); setMsg(t.resetOk); load() } }

  const shown = rules.filter((r) =>
    (!fileFilter || r.sourceFile === fileFilter) &&
    (!covFilter || (covFilter === 'AUTO' ? ruleCoverage(r) !== 'MANUAL' : ruleCoverage(r) === covFilter)) &&
    (!q.trim() || `${r.name} ${r.body} ${r.sourceFile}`.toLowerCase().includes(q.trim().toLowerCase())))
  const manualCount = rules.filter((r) => ruleCoverage(r) === 'MANUAL').length

  return (
    <>
      <section className="card rules-hero">
        <div className="rules-hero-top">
          <div className="rules-hero-l">
            <span className="rules-hero-ic">📜</span>
            <div>
              <h2>{t.rulesHeroTitle}</h2>
              <p>{t.rulesHeroSub}</p>
            </div>
          </div>
          <button className="hero-help-btn" onClick={() => setShowHelp((v) => !v)}>{showHelp ? t.guideClose : t.guideOpen}</button>
        </div>

        {outdated.length > 0 && (
          <div className="mdupdate">
            <span className="mdupdate-ic">🆕</span>
            <div className="mdupdate-txt">
              <b>{t.mdUpdated(outdated.length)}</b>
              <small>
                {t.mdUpdatedNote}
                {outdated.slice(0, 4).join(', ')}{outdated.length > 4 ? ` +${outdated.length - 4}` : ''}
              </small>
            </div>
            <button onClick={() => { md.refreshFromBundled(outdated); setMsg(t.mdUpdatedOk(outdated.length)); load() }}>
              {t.mdUpdate}
            </button>
          </div>
        )}

        <CoverageStats rules={rules} active={covFilter} onPick={(c) => { setCovFilter(c); setView('rules') }} />

        <div className="rules-hero-bar">
          <div className="seg">
            <button className={view === 'rules' ? 'on' : ''} onClick={() => setView('rules')}>{t.segRules}</button>
            <button className={view === 'files' ? 'on' : ''} onClick={() => setView('files')}>{t.segFiles}</button>
          </div>
          <button className="ghost small" onClick={load}>{t.refresh}</button>
        </div>

        {showHelp && <GuideModal onClose={() => setShowHelp(false)} />}
        {msg && <div className="import-msg">{msg}</div>}
      </section>

      {detail && (
        <RuleDetail
          rule={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { editRule(detail); setDetail(null) }}
          onToggle={() => { toggleRule(detail); setDetail(null) }}
          onDelete={() => { removeRule(detail); setDetail(null) }}
        />
      )}

      {view === 'rules' ? (
        <div className="grid">
          <section className="card">
            <h2>{editing ? t.editRule : t.newRule}</h2>
            <label>{t.fName}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
            <label>{t.fDescription}<input value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
            <div className="row">
              <label>{t.fType}<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as RuleType })}><option value="REGEX">REGEX</option><option value="LLM">LLM</option></select></label>
              <label>{t.fSeverity}<select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Severity })}>{SEV_LIST.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
              <label>{t.fFilePattern}<input value={draft.filePattern} onChange={(e) => setDraft({ ...draft, filePattern: e.target.value })} placeholder="*.java" /></label>
            </div>
            <label>{t.fBody}<textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} /></label>
            <label>{t.fTargetMd}<select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!!editing}><GroupedFileOptions files={files} /></select></label>
            <label className="inline"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> {t.fEnabled}</label>
            <div className="actions">
              <button onClick={saveRule}>{editing ? t.update : t.add}</button>
              {editing && <button className="ghost" onClick={() => { setEditing(null); setDraft(emptyDraft) }}>{t.cancelBtn}</button>}
            </div>
          </section>

          <section className="card">
            <h2>{t.tabRules} ({shown.length}{shown.length !== rules.length ? ` / ${rules.length}` : ''})</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <label>{t.search}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} /></label>
              <label>{t.sourceMd}<select value={fileFilter} onChange={(e) => setFileFilter(e.target.value)}><option value="">{t.all}</option><GroupedFileOptions files={files} /></select></label>
              <label>{t.checking}
                <select value={covFilter} onChange={(e) => setCovFilter(e.target.value as typeof covFilter)}>
                  <option value="">{t.all}</option>
                  <option value="AUTO">{t.autoAll}</option>
                  <option value="REGEX">{t.coverMeta.REGEX.label}</option>
                  <option value="PATTERN">{t.coverMeta.PATTERN.label}</option>
                  <option value="DETECTOR">{t.coverMeta.DETECTOR.label}</option>
                  <option value="LIMIT">{t.coverMeta.LIMIT.label}</option>
                  <option value="MANUAL">{t.coverMeta.MANUAL.label} ({manualCount})</option>
                </select>
              </label>
            </div>
            {covFilter === 'MANUAL' && (
              <div className="cover-hint">
                {t.coverHint}
                <code>{t.fixExForbidden.trim()} /style=\{'{{'}/</code>{t.coverHintForbid}
                <code>{t.fixExRequired.trim()} /describe\s*\(/</code>{t.coverHintRequire}
              </div>
            )}
            <div className="rulelist">
              {shown.map((r) => {
                const cov = ruleCoverage(r)
                const m = COVER_META[cov]
                return (
                  <button
                    key={r.id} className={`rulerow ${r.enabled ? '' : 'off'} ${detail?.id === r.id ? 'sel' : ''}`}
                    onClick={() => setDetail(r)} title={t.seeDetails}
                  >
                    <span className="rr-accent" style={{ background: m.color }} />
                    <span className="rr-main">
                      <span className="rr-name">{r.name}</span>
                      <span className="rr-meta">
                        <span className={`cover ${m.cls}`}>{coverText(cov).label}</span>
                        <span className={`sev ${r.severity}`}>{r.severity}</span>
                        <code>{r.filePattern}</code>
                        <small>{r.sourceFile.replace(/\.md$/, '')}</small>
                        {!r.enabled && <span className="rr-off">{t.ruleInactive}</span>}
                      </span>
                    </span>
                    <span className="rr-go">›</span>
                  </button>
                )
              })}
              {shown.length === 0 && (
                <p className="rulelist-empty">{rules.length === 0 ? t.noRulesAtAll : t.noRulesMatch}</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid">
          <section className="card">
            <h2>{t.mdFiles} ({files.length})</h2>
            {(() => {
              const AREAS = ['Frontend', 'Backend', 'Genel'] as const
              const areaIcon = { Frontend: '🎨', Backend: '⚙️', Genel: '📄' } as const
              const areaLabel: Record<string, string> = { Frontend: t.areaFrontend, Backend: t.areaBackend, Genel: t.areaGeneral }
              const byArea: Record<string, string[]> = { Frontend: [], Backend: [], Genel: [] }
              for (const f of files) byArea[md.fileGroup(f).area].push(f)
              return AREAS.filter((a) => byArea[a].length).map((area) => (
                <div key={area} className="mdgroup">
                  <div className="mdgroup-h">{areaIcon[area]} {areaLabel[area]} <span>{byArea[area].length}</span></div>
                  {byArea[area].map((f) => {
                    const g = md.fileGroup(f)
                    return (
                      <div key={f} className={`filetab ${selFile === f ? 'sel' : ''}`} onClick={() => openFile(f)}>
                        <span className="ft-ic">{g.icon}</span>
                        <span className="ft-name">{f}</span>
                        <span className="ft-tech">{g.tech}</span>
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
            <div style={{ marginTop: 12 }}>
              <label>{t.newMdFile}<input value={newFile} onChange={(e) => setNewFile(e.target.value)} placeholder="07-yeni-standart.md" /></label>
              <div className="actions">
                <button onClick={createFile} disabled={!newFile.trim()}>{t.create}</button>
                <button className="ghost" onClick={resetAll}>{t.resetFromProject}</button>
              </div>
            </div>
          </section>

          <section className="card">
            {selFile ? (<>
              <div className="rules-top-head"><h2>{selFile}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={`ghost small ${fileMode === 'view' ? 'active' : ''}`} onClick={() => setFileMode('view')}>{t.view}</button>
                  <button className={`ghost small ${fileMode === 'edit' ? 'active' : ''}`} onClick={() => setFileMode('edit')}>{t.edit}</button>
                  {fileMode === 'edit' && <button onClick={saveFile}>{t.save}</button>}
                  <button className="ghost small" onClick={downloadFile}>{t.download}</button>
                  <button className="ghost small" onClick={deleteFile}>{t.deleteBtn}</button>
                </div>
              </div>
              {fileMode === 'view' ? (
                <div className="md-view" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              ) : (
                <textarea value={content} onChange={(e) => setContentState(e.target.value)} rows={22} style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }} />
              )}
              <small>{fileMode === 'view' ? t.editHint : t.savedInBrowser}{t.permanentHint(selFile)}</small>
            </>) : <p className="hint">{t.pickFileHint}</p>}
          </section>
        </div>
      )}
    </>
  )
}

/** md dosyası silme onayı — yalnızca tarayıcı kopyası silinir. */
function confirmDelete(name: string): boolean { return window.confirm(ui().confirmDeleteFile(name)) }
/** Tüm md değişikliklerini geri alma onayı (projedeki dosyalardan yeniden tohumlama). */
function confirmReset(): boolean { return window.confirm(ui().confirmResetAll) }
