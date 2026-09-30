'use client'

/**
 * Sihirbaz 2. adım — hedef kitle (§4).
 *
 * Tek tıklamayla seçilir, seçim görsel olarak belirginleşir. Kartların altındaki
 * kısa açıklama, seçimin sunumu NASIL değiştirdiğini söyler — kullanıcı
 * "Yönetim" ile "Teknik Ekip" arasındaki farkı tahmin etmek zorunda kalmaz.
 */

import { AUDIENCES, type Audience } from '@/lib/sunum/types'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon, { type IconName } from '../Icon'

const ICONS: Record<Audience, IconName> = {
  professional: 'briefcase',
  student: 'cap',
  employee: 'briefcase',
  management: 'badge',
  technical: 'code',
  customer: 'users',
  academic: 'book',
  general: 'globe',
}

export default function StepAudience({
  t,
  value,
  onChange,
}: {
  t: SunumText
  value: Audience
  onChange: (audience: Audience) => void
}) {
  return (
    <fieldset>
      <legend className="mb-4 text-[15px] font-semibold text-fg">{t.form.audience}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {AUDIENCES.map((audience) => {
          const active = audience === value
          return (
            <button
              key={audience}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(audience)}
              className={`group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? 'border-accent/70 bg-accent/[0.08] ring-2 ring-accent/20'
                  : 'border-line/12 bg-surface/[0.03] hover:-translate-y-0.5 hover:border-accent/40'
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
                  active ? 'bg-accent text-ink-950' : 'bg-surface/10 text-fg3 group-hover:text-accent-soft'
                }`}
              >
                <Icon name={ICONS[audience]} className="h-[18px] w-[18px]" />
              </span>
              <span className={`text-sm font-semibold ${active ? 'text-accent-soft' : 'text-fg'}`}>
                {t.audiences[audience]}
              </span>
              <span className="text-[11.5px] leading-snug text-fg4">{t.audienceHints[audience]}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
