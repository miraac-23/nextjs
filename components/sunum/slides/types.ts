// Slayt şablonlarının ortak prop şekli.
// Tema ve dil her şablona geçilir: bazıları rengi (grafik), bazıları sayı
// biçimlendirmesini (istatistik) kullanır, kalanlar yok sayar.

import type { SunumTheme } from '@/lib/sunum/themes'
import type { SunumLang } from '@/lib/sunum/types'

export type SlideProps<T> = {
  slide: T
  theme: SunumTheme
  lang: SunumLang
  /**
   * Slayt ilk kez sahneleniyor mu? Yalnızca sunum modunda ve üretim
   * önizlemesinde true olur; editörde her tuş vuruşunda animasyon oynamaz.
   */
  animate: boolean
}
