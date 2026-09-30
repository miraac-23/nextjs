'use client'

/**
 * "Sunumda olmasını istediklerin" alanı.
 *
 * Kullanıcı sunumun BİÇİMİNE dair beklentisini kendi cümleleriyle yazar
 * ("grafik ağırlıklı olsun", "her bölümde örnek ver", "sonunda kaynakça").
 * Bu metin isteme en sonda eklenir — modeller son talimatı daha güçlü uygular —
 * ve sunumla birlikte saklanır; sunum koçu eksikleri buna göre denetler.
 *
 * Öneri rozetleri boş sayfa sorununu çözüyor: kullanıcı ne yazabileceğini
 * bilmiyorsa tek tıkla ekliyor, isterse üzerine kendi cümlesini yazıyor.
 */

import type { Dispatch, SetStateAction } from 'react'
import { LIMITS } from '@/lib/sunum/schema'
import type { SunumText } from '@/lib/sunum/ui-text'
import Icon from '../Icon'

export default function RequirementsField({
  t,
  value,
  onChange,
}: {
  t: SunumText
  value: string
  /**
   * Güncelleyici fonksiyon da kabul eder. Rozetlere hızlı ardışık tıklandığında
   * prop'tan okumak bayat değer veriyordu (React güncellemeleri toplu işliyor);
   * fonksiyonel biçim her tıklamayı bir önceki sonucun üstüne uyguluyor.
   */
  onChange: Dispatch<SetStateAction<string>>
}) {
  /** Rozeti metne ekler; zaten varsa çıkarır (aç/kapa gibi davranır). */
  const toggle = (phrase: string) => {
    onChange((previous) => {
      const parts = previous
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const index = parts.indexOf(phrase)
      if (index >= 0) parts.splice(index, 1)
      else parts.push(phrase)
      return parts.join('\n').slice(0, LIMITS.requirements)
    })
  }

  const active = (phrase: string) => value.split('\n').some((line) => line.trim() === phrase)

  return (
    <div>
      <label htmlFor="sn-requirements" className="mb-1.5 block text-[15px] font-semibold text-fg">
        {t.form.requirements}
      </label>
      <p className="mb-2.5 text-xs leading-relaxed text-fg4">{t.form.requirementsHint}</p>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {t.form.requirementChips.map((chip) => {
          const on = active(chip)
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(chip)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                on
                  ? 'border-accent/60 bg-accent/10 text-accent-soft'
                  : 'border-line/12 text-fg3 hover:border-accent/40 hover:text-accent-soft'
              }`}
            >
              <Icon name={on ? 'check' : 'plus'} className="h-3 w-3" />
              {chip}
            </button>
          )
        })}
      </div>

      <textarea
        id="sn-requirements"
        rows={4}
        value={value}
        maxLength={LIMITS.requirements}
        placeholder={t.form.requirementsPlaceholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-xl border border-line/15 bg-surface/5 px-3.5 py-3 text-sm leading-relaxed text-fg outline-none transition-colors placeholder:text-fg4 focus:border-accent/60"
      />
      <p className="mt-1 text-right text-[11px] text-fg4">
        {value.length} / {LIMITS.requirements}
      </p>
    </div>
  )
}
