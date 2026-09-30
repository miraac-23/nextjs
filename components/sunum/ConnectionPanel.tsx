'use client'

/**
 * AI bağlantı paneli.
 *
 * Ürün kuralı: uygulama ilk açılışta BAĞLI gelir. Kullanıcı bu paneli hiç
 * açmadan sunum üretebilir. Panel yalnızca üç şey için var:
 *   · hangi modele bağlı olduğunu göstermek,
 *   · başka bir ÜCRETSİZ modele geçmeyi kolaylaştırmak,
 *   · isteyenin kendi (ücretsiz ya da ücretli) anahtarını girmesine izin vermek.
 *
 * Gizlilik burada gizlenmez: her sağlayıcının yanında verinin cihazda mı kaldığı
 * yoksa sağlayıcıya mı gittiği rozetle yazar. API anahtarı yalnızca tarayıcıda
 * saklanır ve yalnızca sağlayıcının kendi adresine gider.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { probeAi, resetTransport, type AiStatus } from '@/lib/sunum/ai/client'
import { clearConnection, loadConnection, needsKey, saveConnection, type AiConnection } from '@/lib/sunum/ai/connection'
import { fetchModels, type ModelOption } from '@/lib/sunum/ai/catalog-client'
import ModelInstaller from './ModelInstaller'
import {
  PREFERRED_LOCAL_ID,
  PROVIDERS,
  getProvider,
  type ProviderKind,
} from '@/lib/sunum/ai/providers'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import { Badge, Field, GhostButton, Label } from './ui'

type Props = {
  t: SunumText
  /** Durum değiştiğinde üst bileşene haber verir (sihirbaz uyarısı için). */
  onStatus?: (status: AiStatus) => void
  defaultOpen?: boolean
}

const GROUP_ORDER: ProviderKind[] = ['keyless', 'local', 'byok']

export default function ConnectionPanel({ t, onStatus, defaultOpen = false }: Props) {
  const { lang } = useLanguage()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [open, setOpen] = useState(defaultOpen)
  /** Panelde düzenlenen taslak; "Kaydet" denene kadar uygulanmaz. */
  const [draft, setDraft] = useState<AiConnection | null>(null)
  const [models, setModels] = useState<ModelOption[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [freeOnly, setFreeOnly] = useState(true)
  const [savedNote, setSavedNote] = useState(false)
  /** Kurulum sihirbazı açık mı? Yerel sağlayıcı kapalıyken kendiliğinden açılır. */
  const [installer, setInstaller] = useState(false)
  /**
   * Model listesini elle tazelemek için sayaç. Sağlayıcı/anahtar değişmeden de
   * liste eskiyebiliyor — sihirbazla yeni bir model kurulduğunda tam olarak bu
   * oluyor; sayaç artınca listeyi çeken efekt yeniden çalışıyor.
   */
  const [modelsVersion, setModelsVersion] = useState(0)

  const onStatusRef = useRef(onStatus)
  useEffect(() => {
    onStatusRef.current = onStatus
  }, [onStatus])

  /* ------------------------------ bağlantı durumu ------------------------------ */

  const check = useCallback(async (signal?: AbortSignal) => {
    setChecking(true)
    try {
      const next = await probeAi(signal)
      if (signal?.aborted) return
      setStatus(next)
      setDraft(next.connection)
      onStatusRef.current?.(next)
    } finally {
      if (!signal?.aborted) setChecking(false)
    }
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    void check(ctrl.signal)
    return () => ctrl.abort()
  }, [check])

  // Yerel sağlayıcı seçili ama servise ulaşılamıyorsa kullanıcıyı aramaya
  // bırakma: paneli ve sihirbazı kendiliğinden aç.
  useEffect(() => {
    if (!status || checking) return
    if (status.provider.kind === 'local' && status.offline) {
      setOpen(true)
      setInstaller(true)
    }
  }, [status, checking])

  /* ------------------------------- model listesi ------------------------------- */

  const providerId = draft?.providerId
  const apiKey = draft?.apiKey
  const baseUrl = draft?.baseUrl

  useEffect(() => {
    if (!open || !providerId) return
    const ctrl = new AbortController()
    setLoadingModels(true)
    void fetchModels(providerId, { apiKey, baseUrl, signal: ctrl.signal })
      .then((result) => {
        if (ctrl.signal.aborted) return
        setModels(result.models)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingModels(false)
      })
    return () => ctrl.abort()
  }, [open, providerId, apiKey, baseUrl, modelsVersion])

  /* --------------------------------- eylemler --------------------------------- */

  const apply = (connection: AiConnection) => {
    saveConnection(connection)
    resetTransport()
    setSavedNote(true)
    window.setTimeout(() => setSavedNote(false), 1800)
    void check()
  }

  const reset = () => {
    clearConnection()
    resetTransport()
    void check()
  }

  /** Sağlayıcı değişince model o sağlayıcının makul varsayılanına çekilir. */
  const switchProvider = (id: string) => {
    const info = getProvider(id)
    const previous = loadConnection()
    setModels([])
    setDraft({
      providerId: id,
      model: info.models[0] || '',
      // Anahtar sağlayıcıya özeldir; taşınmaz. Aynı sağlayıcıya dönülürse geri gelir.
      apiKey: previous && previous.providerId === id ? previous.apiKey : undefined,
      baseUrl: previous && previous.providerId === id ? previous.baseUrl : undefined,
    })
  }

  const info = draft ? getProvider(draft.providerId) : null
  /** Seçili sağlayıcı yerel servis mi? Sihirbazın davranışı buna göre değişir. */
  const local = !!info && info.wire === 'ollama'
  const online = !!status && !status.offline
  const missingKey = draft ? needsKey(draft) : false
  const visibleModels = freeOnly ? models.filter((m) => m.free) : models
  const shownModels = visibleModels.length > 0 ? visibleModels : models

  return (
    <div className="rounded-2xl border border-line/10 bg-surface/[0.03] p-4">
      {/* -------------------------------- durum -------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ${
              checking
                ? 'bg-surface/10 text-fg3'
                : online
                  ? 'bg-emerald-400/15 text-emerald-300'
                  : 'bg-rose-400/15 text-rose-300'
            }`}
          >
            <Icon name={checking ? 'refresh' : online ? 'spark' : 'warn'} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">
              {checking
                ? t.connection.connecting
                : online
                  ? `${t.connection.connected} · ${status?.provider.name ?? ''}`
                  : t.connection.offline}
            </p>
            <p className="truncate text-xs text-fg4">
              {status?.connection.model || '—'}
              {!checking && status?.autoSelected ? ` · ${t.connection.autoConnected}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!checking && status ? (
            <Badge tone={status.provider.privacy === 'device' ? 'ok' : 'muted'}>
              {status.provider.privacy === 'device' ? t.connection.badges.device : t.connection.badges.hosted}
            </Badge>
          ) : null}
          <GhostButton icon="refresh" onClick={() => void check()} disabled={checking}>
            {t.connection.retry}
          </GhostButton>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t.connection.title}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line/10 bg-surface/5 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
          >
            <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>
              <Icon name="chevron" />
            </span>
          </button>
        </div>
      </div>

      {!checking && !online ? (
        <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2.5">
          <p className="text-xs text-amber-200">{t.errors.aiOffline}</p>
          {/* Yerel sağlayıcı seçiliyken kurulum adımları doğrudan işe yarar. */}
          {status?.provider.kind === 'local' ? (
            <ol className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-200/80">
              {t.ai.setupSteps.map((step) => (
                <li key={step} className="flex gap-1.5">
                  <span>·</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------- ayrıntılar ------------------------------- */}
      {open && draft && info ? (
        <div className="sn-pop mt-4 space-y-4 border-t border-line/10 pt-4">
          {/* --------------------------- sağlayıcı seçimi --------------------------- */}
          <div>
            <Label>{t.connection.provider}</Label>
            <div className="relative">
              <select
                value={draft.providerId}
                onChange={(e) => switchProvider(e.target.value)}
                className="w-full appearance-none rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 pr-9 text-sm text-fg outline-none transition-colors focus:border-accent/60"
              >
                {GROUP_ORDER.map((kind) => (
                  <optgroup key={kind} label={t.connection.groups[kind]}>
                    {PROVIDERS.filter((p) => p.kind === kind).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg3">
                <Icon name="chevron" />
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={info.paid ? 'warn' : 'ok'}>
                {info.paid ? t.connection.badges.paid : t.connection.badges.free}
              </Badge>
              <Badge>{info.needsKey ? t.connection.badges.needsKey : t.connection.badges.keyless}</Badge>
              <Badge tone={info.privacy === 'device' ? 'ok' : 'muted'}>
                {info.privacy === 'device' ? t.connection.badges.device : t.connection.badges.hosted}
              </Badge>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-fg4">{info.note[lang]}</p>
          </div>

          {/* ------------------------------- anahtar ------------------------------- */}
          {info.needsKey ? (
            <div>
              <Label hint={t.connection.apiKeyHint}>{t.connection.apiKey}</Label>
              <input
                type="password"
                autoComplete="off"
                value={draft.apiKey ?? ''}
                placeholder={t.connection.apiKeyPlaceholder}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value || undefined })}
                className="w-full rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 font-mono text-[13px] text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
              />
              {info.keyUrl ? (
                <a
                  href={info.keyUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-soft hover:underline"
                >
                  {t.connection.getKey}
                  <Icon name="right" className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          ) : null}

          {/* -------------------------------- adres -------------------------------- */}
          {info.id === 'custom' ? (
            <Field
              label={t.connection.baseUrl}
              value={draft.baseUrl ?? ''}
              onChange={(v) => setDraft({ ...draft, baseUrl: v || undefined })}
              placeholder={t.connection.baseUrlPlaceholder}
            />
          ) : null}

          {/* -------------------------------- model -------------------------------- */}
          <div>
            <span className="mb-1.5 flex items-center justify-between gap-2">
              <Label>{t.connection.model}</Label>
              {models.some((m) => !m.free) ? (
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-fg4">
                  <input
                    type="checkbox"
                    checked={freeOnly}
                    onChange={() => setFreeOnly((v) => !v)}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  {t.connection.freeOnly}
                </label>
              ) : null}
            </span>

            {shownModels.length > 0 ? (
              <div className="relative">
                <select
                  value={draft.model}
                  onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 pr-9 font-mono text-[13px] text-fg outline-none transition-colors focus:border-accent/60"
                >
                  {/* Kayıtlı model listede yoksa da seçili kalsın. */}
                  {shownModels.some((m) => m.id === draft.model) ? null : (
                    <option value={draft.model}>{draft.model || '—'}</option>
                  )}
                  {shownModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                      {m.free ? '' : ' · $'}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg3">
                  <Icon name="chevron" />
                </span>
              </div>
            ) : (
              <input
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder={t.connection.modelPlaceholder}
                className="w-full rounded-xl border border-line/10 bg-surface/5 px-3 py-2.5 font-mono text-[13px] text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
              />
            )}

            <p className="mt-1.5 text-[11px] text-fg4">
              {loadingModels ? t.connection.loadingModels : models.length === 0 ? t.connection.noModels : ''}
            </p>
          </div>

          {/*
            Yerel model kurulum sihirbazı.
            
            Giriş noktası bilinçli olarak SEÇİLİ SAĞLAYICIDAN BAĞIMSIZ: önce
            yalnızca Ollama seçiliyken görünüyordu, ama Ollama'sı olmayan
            kullanıcı tam da onu arıyor ve sağlayıcıyı elle değiştirmeden
            sihirbaza ulaşamıyordu — özellik duruyordu ama erişilemezdi.
          */}
          {!installer ? (
            <button
              type="button"
              onClick={() => {
                // Sihirbaz açılırken taslak sağlayıcı YERELE çevrilir. Böylece
                // panelin model listesi ve çevrimiçi durumu Ollama'yı anlatır ve
                // sihirbaz dünkü kod yolunun aynısıyla çalışır; ayrı bir yoklama
                // mantığı gerekmez. Kaydetmez — kullanıcı vazgeçerse eski seçimi durur.
                if (!local) switchProvider(PREFERRED_LOCAL_ID)
                setInstaller(true)
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/40 px-3 py-2.5 text-[12.5px] font-semibold text-accent-soft transition-colors hover:bg-accent/10"
            >
              <Icon name="download" />
              {t.install.open}
            </button>
          ) : null}

          {installer ? (
            <ModelInstaller
              t={t}
              lang={lang}
              baseUrl={draft.baseUrl || info.baseUrl}
              installed={models.map((m) => m.id)}
              offline={!online}
              onClose={() => setInstaller(false)}
              onInstalled={(model) => {
                // Yeni model kurulduysa liste eskidi: sayacı artırıp tazele.
                setModelsVersion((v) => v + 1)
                if (!model) {
                  // Yalnızca servis ayağa kalktı; bağlantıyı tazele.
                  void check()
                  return
                }
                /*
                 * Model YEREL servise kuruldu. Kullanıcı sihirbazı başka bir
                 * sağlayıcıdayken açtıysa bağlantıyı da yerele çevirmek gerekir;
                 * aksi hâlde model iniyor ama hiç kullanılmıyor.
                 */
                const next: AiConnection = { ...draft, model }
                setDraft(next)
                apply(next)
              }}
            />
          ) : null}

          {missingKey ? (
            <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
              {t.connection.needsKey}
            </p>
          ) : null}

          {/* ------------------------------- eylemler ------------------------------- */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!draft.model || missingKey}
              onClick={() => apply(draft)}
              className="btn-primary whitespace-nowrap px-4 py-2 text-[13px] disabled:opacity-40"
            >
              <Icon name="check" />
              {t.connection.save}
            </button>
            <GhostButton icon="refresh" onClick={reset}>
              {t.connection.reset}
            </GhostButton>
            {savedNote ? <span className="text-xs text-emerald-300">{t.connection.saved}</span> : null}
          </div>

          <p className="text-[11px] leading-relaxed text-fg4">{t.connection.localHint}</p>
        </div>
      ) : null}
    </div>
  )
}
