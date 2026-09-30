import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SunumBackdrop from '@/components/sunum/SunumBackdrop'
import PresentationEditor from '@/components/sunum/PresentationEditor'
import '../../sunum.css'

export const metadata: Metadata = {
  title: 'Sunum editörü — AI Sunum Stüdyosu',
  description: 'Slaytları düzenle, şablon ve tema değiştir, AI asistanla metni iyileştir, PPTX/PDF indir.',
  // Kullanıcının kendi (yerel) sunumları arama sonuçlarında yer almamalı.
  robots: { index: false, follow: false },
}

type Props = {
  params: { id: string }
  /** `?fallback=1|quota` → sunum yerel taslaktan üretildi; değer nedenini söyler. */
  searchParams: { fallback?: string }
}

export default function PresentationEditorPage({ params, searchParams }: Props) {
  return (
    <>
      <Navbar />
      <SunumBackdrop />
      <main className="relative pt-24 pb-16 sm:pt-28">
        <div className="mx-auto w-full max-w-[104rem] px-3 sm:px-6">
          <PresentationEditor
            id={params.id}
            fallback={searchParams.fallback === '1' ? 'offline' : searchParams.fallback === 'quota' ? 'quota' : null}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
