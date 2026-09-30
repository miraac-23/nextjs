'use client'

/**
 * Sunum editörü — modülün çalışma masası (§8).
 *
 * Yerleşim: solda slayt listesi, ortada 16:9 tuval, sağda üç sekme
 * (Tasarım · İçerik · AI). Canva benzeri ama bilinçli olarak çok daha sade:
 * serbest sürükleme, katman, hizalama YOKTUR. Kullanıcı METİN ve YAPI düzenler;
 * yerleşimi Slide Engine üstlenir (§26).
 *
 * Kalıcılık: her değişiklik 600 ms gecikmeyle localStorage'a yazılır. Tuşa
 * basıldığı anda yazmak yerine geciktirme, uzun sunumlarda yazma maliyetini
 * ölçülebilir biçimde düşürür.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n/LanguageProvider'
import { generateSlide, probeAi, type AiStatus } from '@/lib/sunum/ai/client'
import { isAiError } from '@/lib/sunum/ai/provider'
import { printSlides, safeFileName } from '@/lib/sunum/export/browser'
import { LIMITS } from '@/lib/sunum/schema'
import { presentationStore } from '@/lib/sunum/store'
import { blankSlide } from '@/lib/sunum/templates'
import { getTheme, type ThemeId } from '@/lib/sunum/themes'
import { DEFAULT_VISUAL, reindex, uid, type Presentation, type Slide, type SlideType, type Visual } from '@/lib/sunum/types'
import { sunumText } from '@/lib/sunum/ui-text'
import AiAssistantPanel from './AiAssistantPanel'
import ConnectionPanel from './ConnectionPanel'
import CoachPanel from './CoachPanel'
import ContentPanel from './ContentPanel'
import DesignPanel from './DesignPanel'
import ExportPanel from './ExportPanel'
import Icon from './Icon'
import QualityPanel from './QualityPanel'
import SlideCanvas from './SlideCanvas'
import SlideRail from './SlideRail'
import SlideRenderer, { SlideDeck } from './SlideRenderer'
import { SlideEditProvider, type TextPath } from './slides/edit'
import { Card, StateCard, Toast } from './ui'

/** Bellekte tutulan geri-al adımı sayısı. */
const HISTORY_LIMIT = 40

const SAVE_DELAY_MS = 600

type Tab = 'design' | 'content' | 'ai' | 'coach'

export type FallbackReason = 'offline' | 'quota' | null

export default function PresentationEditor({ id, fallback = null }: { id: string; fallback?: FallbackReason }) {
  const { lang } = useLanguage()
  const t = sunumText(lang)

  const [ready, setReady] = useState(false)
  /**
   * Sunum ve geçmişi TEK bir durum nesnesinde tutulur.
   *
   * Önce geçmiş `useRef`'te tutuluyordu ve derinlik ayrı bir state'ti; React
   * güncelleyici fonksiyonu render sırasında çalıştığı için derinliği hemen
   * ardından okumak ESKİ değeri veriyordu — geri aldıktan sonra "yinele" düğmesi
   * kapalı kalıyordu. Üçünü tek bir indirgeyicide birleştirmek bu sınıf hatayı
   * tamamen ortadan kaldırıyor (StrictMode'da çift çağrıya da dayanıklı).
   */
  const [snap, setSnap] = useState<{ present: Presentation | null; past: Presentation[]; future: Presentation[] }>({
    present: null,
    past: [],
    future: [],
  })
  const presentation = snap.present
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('content')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)
  const [printHost, setPrintHost] = useState<HTMLElement | null>(null)
  const [printing, setPrinting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)
  const [fallbackNote, setFallbackNote] = useState(fallback)
  /** Kısayol ipucunda gösterilecek değiştirici tuş — macOS'ta ⌘, diğerlerinde Ctrl. */
  const [modKey, setModKey] = useState('Ctrl')
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setModKey('⌘')
  }, [])

  /** İlk yüklemede kaydetme tetiklenmesin diye "yüklendi" işareti. */
  const loadedRef = useRef(false)

  /* --------------------------------- yükleme --------------------------------- */

  /**
   * Bağlantı durumu editörün TAMAMINI ilgilendiriyor: slayt rayındaki "AI ile
   * slayt ekle" ve koç panelindeki doldurma eylemleri buna bakıyor.
   * `ConnectionPanel` yalnızca AI sekmesi açıkken monte olduğundan durumu burada
   * da bir kez yokluyoruz; yoksa kullanıcı o sekmeye uğrayana kadar otomatik
   * kurulmuş bağlantıya rağmen AI eylemleri kapalı görünüyor.
   */
  useEffect(() => {
    const ctrl = new AbortController()
    void probeAi(ctrl.signal)
      .then((next) => {
        if (!ctrl.signal.aborted) setAiStatus(next)
      })
      .catch(() => {
        /* yoklama başarısızsa panel açıldığında yeniden denenir */
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const found = presentationStore.get(id)
    setSnap({ present: found, past: [], future: [] })
    setSelectedId(found && found.slides.length > 0 ? found.slides[0].id : null)
    setReady(true)
    loadedRef.current = false

  }, [id])

  /* ------------------------------ otomatik kayıt ------------------------------ */

  useEffect(() => {
    if (!presentation) return
    if (!loadedRef.current) {
      loadedRef.current = true
      return
    }
    setSaving(true)
    const timer = window.setTimeout(() => {
      const result = presentationStore.save(presentation)
      setSaving(false)
      if (!result.ok) {
        setToast({
          message: result.reason === 'quota' ? t.errors.saveQuota : t.errors.generic,
          tone: 'error',
        })
      }
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [presentation, t])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  // Yazdırma kopyası için body altında kapsayıcı (bkz. app/sunum/sunum.css).
  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'sunum-print-root'
    document.body.appendChild(el)
    setPrintHost(el)
    return () => el.remove()
  }, [])

  /* -------------------------------- işlemler -------------------------------- */

  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ message, tone })
  }, [])

  /*
   * Geri al / yinele.
   *
   * Editörde yapılan her değişiklik kalıcı: 600 ms sonra localStorage'a yazılıyor
   * ve eski hâli geri getirmenin bir yolu yoktu. Bu, kullanıcıyı denemekten
   * alıkoyuyor — "AI ile yeniden yaz"a basmaya çekiniyor. Geçmiş yığını yalnızca
   * BELLEKTE tutuluyor (sekme ömrü kadar); diske yazılan şey her zaman güncel hâl.
   *
   * Yığın sınırlı: sunum nesnesi büyük olabiliyor ve sınırsız geçmiş sekmeyi
   * şişiriyor. 40 adım, gerçekte geri dönülen mesafenin çok üstünde.
   */
  const patch = useCallback((change: (current: Presentation) => Presentation) => {
    setSnap((s) => {
      if (!s.present) return s
      const next = change(s.present)
      if (next === s.present) return s
      // Yeni bir değişiklik yapıldığında ileri geçmiş anlamını yitirir.
      return { present: next, past: s.past.concat(s.present).slice(-HISTORY_LIMIT), future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setSnap((s) => {
      const previous = s.past[s.past.length - 1]
      if (!s.present || !previous) return s
      return {
        present: previous,
        past: s.past.slice(0, -1),
        future: s.future.concat(s.present).slice(-HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setSnap((s) => {
      const next = s.future[s.future.length - 1]
      if (!s.present || !next) return s
      return {
        present: next,
        past: s.past.concat(s.present).slice(-HISTORY_LIMIT),
        future: s.future.slice(0, -1),
      }
    })
  }, [])

  /*
   * Klavye kısayolları.
   *
   * Yalnızca odak bir metin alanında DEĞİLKEN çalışır: kullanıcı başlık yazarken
   * Cmd+Z'nin slaytı geri alması değil, yazdığı harfi geri alması beklenir —
   * tarayıcının kendi geri alması o alanda daha doğru davranıyor.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      // Ok tuşlarıyla slaytlar arasında gezinme — değiştirici tuş gerektirmez,
      // çünkü odak bir alanda değilken oklar zaten boşta duruyor.
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const list = presentation?.slides ?? []
        const at = list.findIndex((slide) => slide.id === selectedId)
        const target = list[Math.min(list.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]
        if (target) setSelectedId(target.id)
        return
      }

      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key !== 'z' && key !== 'y') return
      e.preventDefault()
      if (key === 'y' || e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, selectedId, presentation])

  const updateSlide = useCallback(
    (next: Slide) => {
      patch((current) => ({
        ...current,
        slides: current.slides.map((slide) => (slide.id === next.id ? next : slide)),
      }))
    },
    [patch],
  )

  const moveSlide = useCallback(
    (slideId: string, delta: number) => {
      patch((current) => {
        const index = current.slides.findIndex((s) => s.id === slideId)
        const target = index + delta
        if (index < 0 || target < 0 || target >= current.slides.length) return current
        const slides = current.slides.slice()
        const [slide] = slides.splice(index, 1)
        slides.splice(target, 0, slide)
        return { ...current, slides: reindex(slides) }
      })
    },
    [patch],
  )

  /** Sürükle-bırak: kaynağı çıkarıp hedef konuma yerleştirir. */
  const reorderSlide = useCallback(
    (slideId: string, toIndex: number) => {
      patch((current) => {
        const from = current.slides.findIndex((s) => s.id === slideId)
        if (from < 0 || from === toIndex) return current
        const slides = current.slides.slice()
        const [slide] = slides.splice(from, 1)
        slides.splice(Math.max(0, Math.min(slides.length, toIndex)), 0, slide)
        return { ...current, slides: reindex(slides) }
      })
    },
    [patch],
  )

  // Aşağıdaki üç işlem seçimi de değiştirir. Bu yüzden durum güncelleyicinin
  // İÇİNDE yan etki yapmak yerine mevcut duruma bakarak çalışıyorlar: React bir
  // güncelleyiciyi (geliştirme modunda) iki kez çağırabilir, yan etki tekrarlanmaz.

  const deleteSlide = useCallback(
    (slideId: string) => {
      if (!presentation || presentation.slides.length <= 1) return
      const index = presentation.slides.findIndex((s) => s.id === slideId)
      if (index < 0) return
      const slides = reindex(presentation.slides.filter((s) => s.id !== slideId))
      const next = slides[Math.min(index, slides.length - 1)]
      setSelectedId(next ? next.id : null)
      patch((current) => ({ ...current, slides }))
    },
    [presentation, patch],
  )

  const duplicateSlide = useCallback(
    (slideId: string) => {
      if (!presentation || presentation.slides.length >= LIMITS.slides) return
      const index = presentation.slides.findIndex((s) => s.id === slideId)
      if (index < 0) return
      const copy: Slide = { ...presentation.slides[index], id: uid('sl') }
      const slides = presentation.slides.slice()
      slides.splice(index + 1, 0, copy)
      setSelectedId(copy.id)
      patch((current) => ({ ...current, slides: reindex(slides) }))
    },
    [presentation, patch],
  )

  const addSlide = useCallback(
    (type: SlideType) => {
      if (!presentation || presentation.slides.length >= LIMITS.slides) return
      const index = presentation.slides.findIndex((s) => s.id === selectedId)
      const at = index < 0 ? presentation.slides.length : index + 1
      const slide = blankSlide(type, presentation.id, at, presentation.language)
      const slides = presentation.slides.slice()
      slides.splice(at, 0, slide)
      setSelectedId(slide.id)
      patch((current) => ({ ...current, slides: reindex(slides) }))
    },
    [presentation, selectedId, patch],
  )

  /**
   * Konudan AI ile slayt üretir ve seçili slaytın ardına ekler.
   *
   * Sunum yeniden üretilmez — yalnızca tek slayt istenir; bu yüzden ücretsiz ve
   * bütçesi dar modellerde de çalışıyor. Model destede zaten anlatılanları görür
   * ve aynı şeyi tekrar etmez.
   */
  const aiAddSlide = useCallback(
    async (type: SlideType | undefined, instruction: string) => {
      if (!presentation) return
      const index = presentation.slides.findIndex((s) => s.id === selectedId)
      const at = index < 0 ? presentation.slides.length : index + 1
      try {
        const slide = await generateSlide(
          {
            presentationTitle: presentation.title,
            topic: presentation.description || presentation.title,
            audience: presentation.audience,
            language: presentation.language,
            tone: presentation.tone,
            type,
            existingTitles: presentation.slides.map((s) => s.title).filter(Boolean),
            instruction: instruction || undefined,
          },
          presentation.id,
          at,
        )
        const slides = presentation.slides.slice()
        slides.splice(at, 0, slide)
        patch((current) => ({ ...current, slides: reindex(slides) }))
        setSelectedId(slide.id)
      } catch (e) {
        notify(isAiError(e) ? e.message : t.errors.refineFailed, 'error')
      }
    },
    [presentation, selectedId, notify, patch, t],
  )

  /**
   * Yazdırma: kopya DOM'a monte edildikten SONRA yazdırma diyaloğu açılır.
   * Aynı render'da çağrılırsa tarayıcı henüz slaytları görmeden diyaloğu açar.
   */
  const print = useCallback(() => {
    if (!presentation) return
    setPrinting(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        printSlides(safeFileName(presentation.title, 'sunum'), () => setPrinting(false))
      })
    })
  }, [presentation])

  /* --------------------------------- görünüm --------------------------------- */

  const theme = useMemo(() => getTheme(presentation?.theme), [presentation?.theme])
  const selected = useMemo(
    () => presentation?.slides.find((s) => s.id === selectedId) ?? presentation?.slides[0] ?? null,
    [presentation, selectedId],
  )
  const slideIndex = useMemo(
    () => (presentation && selected ? presentation.slides.findIndex((s) => s.id === selected.id) : -1),
    [presentation, selected],
  )

  /**
   * Slayt üzerinde düzenlenen metni doğru alana yazar.
   *
   * Madde silme kasıtlı: kullanıcı bir maddeyi tamamen silip odaktan çıkarsa
   * o madde listeden düşer — boş bir madde işareti bırakmak slaydı bozuyor.
   */
  const editApi = useMemo(
    () => ({
      onText: (path: TextPath, value: string) => {
        const slide = selected
        if (!slide) return
        if (path.field === 'title') return updateSlide({ ...slide, title: value })
        if (path.field === 'subtitle') return updateSlide({ ...slide, subtitle: value || undefined })
        if (path.field === 'highlight') return updateSlide({ ...slide, highlight: value || undefined })
        if (path.field === 'example') return updateSlide({ ...slide, example: value || undefined })
        if (path.field === 'bullet') {
          if (slide.type !== 'content' && slide.type !== 'conclusion') return
          const bullets = slide.content.bullets.slice()
          if (value) bullets[path.index] = value
          else bullets.splice(path.index, 1)
          return updateSlide({ ...slide, content: { ...slide.content, bullets } })
        }
      },
    }),
    [selected, updateSlide],
  )

  if (!ready) {
    return (
      <div className="sn-editor" aria-busy="true">
        <div className="h-64 animate-pulse rounded-2xl border border-line/10 bg-surface/[0.03]" />
        <div className="aspect-video animate-pulse rounded-2xl border border-line/10 bg-surface/[0.03]" />
        <div className="h-64 animate-pulse rounded-2xl border border-line/10 bg-surface/[0.03]" />
      </div>
    )
  }

  if (!presentation) {
    return (
      <StateCard
        icon="warn"
        tone="error"
        title={t.errors.notFound}
        description={t.errors.notFoundHint}
        action={
          <Link href="/sunum" className="btn-primary whitespace-nowrap">
            {t.editor.back}
          </Link>
        }
      />
    )
  }

  // Dört sekme: TASARIM ve İÇERİK slaytı düzenler, AI slaytı yeniden yazar,
  // KOÇ ise sunumu yapacak kişiye bakar (eksikler, süre, istekler, kalite).
  const tabs: { id: Tab; label: string; icon: 'palette' | 'type' | 'spark' | 'target' }[] = [
    { id: 'design', label: t.editor.tabDesign, icon: 'palette' },
    { id: 'content', label: t.editor.tabContent, icon: 'type' },
    { id: 'ai', label: t.editor.tabAi, icon: 'spark' },
    { id: 'coach', label: t.editor.tabCoach, icon: 'target' },
  ]

  return (
    <div className="sn-app space-y-4">
      {/* ------------------------------ üst çubuk ------------------------------ */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line/10 bg-surface/[0.03] p-3">
        <Link
          href="/sunum"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line/10 px-3 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
        >
          <Icon name="left" />
          <span className="hidden sm:inline">{t.editor.back}</span>
        </Link>

        <input
          aria-label={t.editor.rename}
          value={presentation.title}
          maxLength={LIMITS.title}
          onChange={(e) => patch((current) => ({ ...current, title: e.target.value }))}
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-2 font-display text-base font-semibold text-fg outline-none transition-colors hover:border-line/10 focus:border-accent/60"
        />

        {/* Geri al / yinele — kayıt göstergesinin solunda, çünkü ikisi de
            "değişikliğim ne oldu" sorusunun cevabı. */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={snap.past.length === 0}
            title={`${t.editor.undo} (${modKey}+Z)`}
            aria-label={t.editor.undo}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line/10 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-30 disabled:hover:border-line/10 disabled:hover:text-fg3"
          >
            <Icon name="undo" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={snap.future.length === 0}
            title={`${t.editor.redo} (${modKey}+Shift+Z)`}
            aria-label={t.editor.redo}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line/10 text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft disabled:opacity-30 disabled:hover:border-line/10 disabled:hover:text-fg3"
          >
            <Icon name="redo" />
          </button>
        </div>

        <span className="hidden items-center gap-1.5 text-xs text-fg4 sm:flex">
          {saving ? (
            <>
              <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
              {t.editor.saving}
            </>
          ) : (
            <>
              <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" />
              {t.editor.saved}
            </>
          )}
        </span>

        {/* İndirme menüsü — dışarı tıklama arka plan katmanıyla kapatılır. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            aria-expanded={exportOpen}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-line/10 px-3.5 py-2 text-[13px] font-semibold text-fg2 transition-colors hover:border-accent/50 hover:text-accent-soft"
          >
            <Icon name="download" />
            {t.editor.download}
          </button>
          {exportOpen ? (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="sn-pop absolute right-0 top-[calc(100%+8px)] z-40 w-72 rounded-2xl border border-line/15 bg-page/95 p-4 shadow-2xl backdrop-blur-xl">
                <ExportPanel
                  presentation={presentation}
                  onPrint={() => {
                    setExportOpen(false)
                    print()
                  }}
                  printing={printing}
                  onNotify={notify}
                  t={t}
                />
              </div>
            </>
          ) : null}
        </div>

        <Link
          href={`/sunum/${presentation.id}/preview`}
          className="btn-primary whitespace-nowrap px-4 py-2.5 text-[13px]"
        >
          <Icon name="play" />
          <span className="hidden sm:inline">{t.editor.present}</span>
        </Link>
      </div>

      {fallbackNote ? (
        <div className="sn-pop flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-200">
            {fallbackNote === 'quota' ? t.errors.quotaDetail : t.errors.aiOfflineDetail}
          </p>
          {/* Uyarı "bağlantıyı kur" diyordu ama kuracak bir yol vermiyordu.
              Düğme bağlantı panelinin bulunduğu AI sekmesini açıyor. */}
          <button
            type="button"
            onClick={() => {
              setTab('ai')
              setFallbackNote(null)
            }}
            className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[12px] font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
          >
            <Icon name="sliders" className="h-3.5 w-3.5" />
            {t.errors.openConnection}
          </button>
          <button
            type="button"
            onClick={() => setFallbackNote(null)}
            className="grid h-7 w-7 place-items-center rounded-lg text-amber-200/70 transition-colors hover:text-amber-100"
            aria-label={t.wizard.cancel}
          >
            <Icon name="x" />
          </button>
        </div>
      ) : null}

      {/* ------------------------------- çalışma ------------------------------- */}
      <div className="sn-editor">
        <SlideRail
          presentation={presentation}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onMove={moveSlide}
          onReorder={reorderSlide}
          onDelete={deleteSlide}
          onDuplicate={duplicateSlide}
          onAdd={addSlide}
          onAiAdd={aiAddSlide}
          aiAvailable={!!aiStatus && !aiStatus.offline}
          t={t}
        />

        <div className="space-y-3">
          {selected ? (
            <>
              {/* Slaydın ÜZERİNDE doğrudan düzenleme: başlık, alt başlık,
                  maddeler, örnek ve vurgu tıklanıp yazılabilir. Sağ panel
                  kaldırılmadı — ikisi aynı veriyi düzenliyor. */}
              <SlideCanvas shadow>
                <SlideEditProvider api={editApi}>
                  <SlideRenderer
                    slide={selected}
                    theme={theme}
                    lang={presentation.language}
                    visual={presentation.visual}
                  />
                </SlideEditProvider>
              </SlideCanvas>
              <p className="text-center text-xs text-fg4">
                {slideIndex + 1} / {presentation.slides.length} · {t.slideTypes[selected.type]}
              </p>
            </>
          ) : (
            <StateCard
              icon="layout"
              title={t.editor.empty}
              action={
                <button type="button" className="btn-primary whitespace-nowrap" onClick={() => addSlide('content')}>
                  <Icon name="plus" />
                  {t.editor.emptyAction}
                </button>
              }
            />
          )}
        </div>

        <Card as="aside" className="sn-panel-col sn-scroll">
          <div className="mb-4 flex gap-1 rounded-xl border border-line/10 bg-surface/5 p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={tab === item.id}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  tab === item.id ? 'bg-accent/15 text-accent-soft' : 'text-fg3 hover:text-fg2'
                }`}
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'design' && selected ? (
            <DesignPanel
              slide={selected}
              onSlide={updateSlide}
              theme={presentation.theme as ThemeId}
              onTheme={(next) => patch((current) => ({ ...current, theme: next }))}
              visual={presentation.visual ?? DEFAULT_VISUAL}
              onVisual={(next: Visual) => patch((current) => ({ ...current, visual: next }))}
              deckLang={presentation.language}
              uiLang={lang}
              t={t}
            />
          ) : null}

          {tab === 'content' && selected ? <ContentPanel slide={selected} onSlide={updateSlide} t={t} /> : null}

          {tab === 'ai' ? (
            <div className="space-y-5">
              <ConnectionPanel t={t} onStatus={setAiStatus} />
              {selected ? (
                <AiAssistantPanel
                  slide={selected}
                  presentationTitle={presentation.title}
                  audience={presentation.audience}
                  language={presentation.language}
                  theme={theme}
                  visual={presentation.visual}
                  onSlide={updateSlide}
                  onNotify={notify}
                  available={!!aiStatus && !aiStatus.offline}
                  t={t}
                />
              ) : null}
            </div>
          ) : null}

          {tab === 'coach' ? (
            <div className="space-y-5">
              <CoachPanel
                presentation={presentation}
                onPresentation={(next) => patch(() => next)}
                onSelectSlide={setSelectedId}
                onNotify={notify}
                aiAvailable={!!aiStatus && !aiStatus.offline}
                t={t}
              />
              <div className="border-t border-line/10 pt-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-fg3">{t.quality.title}</h3>
                <QualityPanel
                  presentation={presentation}
                  onPresentation={(next) => patch(() => next)}
                  onSelectSlide={setSelectedId}
                  onNotify={notify}
                  t={t}
                />
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      {/* Yazdırma kopyası: ekranda gizli, @media print içinde tek görünen düğüm.
          Yalnızca yazdırma anında monte edilir — 25 slaytı boşuna iki kez render etmeyiz. */}
      {printing && printHost ? createPortal(<SlideDeck presentation={presentation} />, printHost) : null}
    </div>
  )
}
