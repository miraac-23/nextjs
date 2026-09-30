'use client'

/**
 * Sol sütun — slayt listesi (§8).
 *
 * Küçük resimler GERÇEK slaytı render eder (ayrı bir "önizleme" çizimi yoktur):
 * SlideCanvas 1280 px'lik kâğıdı rafın genişliğine ölçekler. Böylece listedeki
 * görüntü tuvaldeki ile birebir aynıdır ve şablon değişikliği anında görünür.
 *
 * Sıralama HEM sürükle-bırak HEM ok tuşlarıyla yapılabilir: sürükleme hızlı,
 * ok tuşları klavye ve dokunmatik için erişilebilir. HTML5 sürükleme API'si
 * kullanıldı — ek bir paket gerekmedi (§22).
 */

import { useState, type DragEvent } from 'react'
import { getTheme } from '@/lib/sunum/themes'
import { SLIDE_TYPES, type Presentation, type SlideType } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from './Icon'
import SlideCanvas from './SlideCanvas'
import SlideRenderer from './SlideRenderer'
import { IconButton } from './ui'

type Props = {
  presentation: Presentation
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, delta: number) => void
  /** Sürükle-bırak sonucu: `id` slaytını `toIndex` konumuna taşı. */
  onReorder: (id: string, toIndex: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onAdd: (type: SlideType) => void
  /**
   * Konudan AI ile slayt üretir. Tip verilmezse modele bırakılır; `instruction`
   * kullanıcının serbest yönergesidir ("maliyetleri karşılaştır").
   */
  onAiAdd: (type: SlideType | undefined, instruction: string) => Promise<void>
  aiAvailable: boolean
  t: SunumText
}

export default function SlideRail({
  presentation,
  selectedId,
  onSelect,
  onMove,
  onReorder,
  onDelete,
  onDuplicate,
  onAdd,
  onAiAdd,
  aiAvailable,
  t,
}: Props) {
  const [adding, setAdding] = useState(false)
  /** AI ile ekleme formu açık mı? */
  const [aiForm, setAiForm] = useState(false)
  const [aiType, setAiType] = useState<SlideType | ''>('')
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const theme = getTheme(presentation.theme)
  const slides = presentation.slides

  const handleDrop = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault()
    const id = dragId || event.dataTransfer.getData('text/plain')
    setDragId(null)
    setOverIndex(null)
    if (id) onReorder(id, index)
  }

  return (
    <aside className="rounded-2xl border border-line/10 bg-surface/[0.03] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-fg3">{t.editor.slides}</h2>
        <span className="text-xs text-fg4">{slides.length}</span>
      </div>

      <ol className="sn-rail sn-scroll -mr-1 space-y-2.5 pr-1">
        {slides.map((slide, i) => {
          const active = slide.id === selectedId
          return (
            <li
              key={slide.id}
              draggable
              onDragStart={(e) => {
                setDragId(slide.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', slide.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setOverIndex(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (overIndex !== i) setOverIndex(i)
              }}
              onDrop={(e) => handleDrop(e, i)}
              className={`${dragId === slide.id ? 'sn-dragging ' : ''}${
                overIndex === i && dragId && dragId !== slide.id ? 'sn-drop-target ' : ''
              }rounded-xl`}
            >
              <button
                type="button"
                onClick={() => onSelect(slide.id)}
                aria-current={active}
                title={t.editor.dragHint}
                className={`block w-full cursor-grab overflow-hidden rounded-xl border text-left transition-all active:cursor-grabbing ${
                  active ? 'border-accent/70 ring-2 ring-accent/25' : 'border-line/10 hover:border-accent/40'
                }`}
              >
                <SlideCanvas label={slide.title || t.slideTypes[slide.type]}>
                  <SlideRenderer
                    slide={slide}
                    theme={theme}
                    lang={presentation.language}
                    visual={presentation.visual}
                  />
                </SlideCanvas>
                <span className="flex items-center gap-1.5 px-2 py-1.5">
                  <span className="text-[10px] font-semibold text-fg4">{i + 1}</span>
                  <span className="truncate text-[11px] text-fg3">{t.slideTypes[slide.type]}</span>
                  <span className="ml-auto text-fg4 opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon name="grip" className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>

              {active ? (
                <div className="sn-pop mt-1.5 flex items-center justify-center gap-1.5">
                  <IconButton icon="up" title={t.editor.moveUp} disabled={i === 0} onClick={() => onMove(slide.id, -1)} />
                  <IconButton
                    icon="down"
                    title={t.editor.moveDown}
                    disabled={i === slides.length - 1}
                    onClick={() => onMove(slide.id, 1)}
                  />
                  <IconButton icon="plus" title={t.editor.duplicateSlide} onClick={() => onDuplicate(slide.id)} />
                  <IconButton
                    icon="trash"
                    title={t.editor.deleteSlide}
                    tone="danger"
                    disabled={slides.length <= 1}
                    onClick={() => onDelete(slide.id)}
                  />
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 border-t border-line/10 pt-3">
        {aiForm ? (
          /* Konudan AI ile slayt: sunumun tamamı yeniden üretilmez, yalnızca
             tek slayt istenir — bütçesi dar modellerde de çalışır. */
          <div className="sn-pop space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg3">{t.editor.aiAdd}</p>
            <textarea
              rows={2}
              autoFocus
              value={aiText}
              maxLength={200}
              placeholder={t.editor.aiAddPlaceholder}
              onChange={(e) => setAiText(e.target.value)}
              className="w-full resize-y rounded-lg border border-line/12 bg-surface/5 px-2.5 py-2 text-[12px] text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
            />
            <select
              value={aiType}
              onChange={(e) => setAiType(e.target.value as SlideType | '')}
              className="w-full rounded-lg border border-line/12 bg-surface/5 px-2.5 py-2 text-[12px] text-fg outline-none transition-colors focus:border-accent/60"
            >
              <option value="">{t.editor.aiAddAuto}</option>
              {SLIDE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.slideTypes[type]}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={aiBusy || !aiAvailable}
                onClick={async () => {
                  setAiBusy(true)
                  try {
                    await onAiAdd(aiType || undefined, aiText.trim())
                    setAiForm(false)
                    setAiText('')
                    setAiType('')
                  } finally {
                    setAiBusy(false)
                  }
                }}
                className="btn-primary flex-1 whitespace-nowrap py-1.5 text-[12px] disabled:opacity-40"
              >
                <Icon name={aiBusy ? 'refresh' : 'spark'} className={aiBusy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                {aiBusy ? t.editor.aiAdding : t.editor.aiAddCreate}
              </button>
              <button
                type="button"
                onClick={() => setAiForm(false)}
                className="rounded-lg border border-line/12 px-2.5 text-[12px] text-fg4 transition-colors hover:text-fg2"
              >
                {t.wizard.cancel}
              </button>
            </div>
            {!aiAvailable ? <p className="text-[10.5px] text-amber-300">{t.assistant.needsAi}</p> : null}
          </div>
        ) : adding ? (
          <div className="sn-pop grid gap-1">
            {SLIDE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onAdd(type)
                  setAdding(false)
                }}
                className="rounded-lg px-2.5 py-1.5 text-left text-[12px] text-fg2 transition-colors hover:bg-surface/10 hover:text-accent-soft"
              >
                {t.slideTypes[type]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mt-1 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-fg4 transition-colors hover:text-fg2"
            >
              {t.wizard.cancel}
            </button>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <button
              type="button"
              onClick={() => setAiForm(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-soft transition-colors hover:bg-accent/20"
            >
              <Icon name="spark" />
              {t.editor.aiAdd}
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line/20 px-3 py-2 text-xs font-semibold text-fg3 transition-colors hover:border-accent/50 hover:text-accent-soft"
            >
              <Icon name="plus" />
              {t.editor.addSlide}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
