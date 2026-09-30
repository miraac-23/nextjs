import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SunumBackdrop from '@/components/sunum/SunumBackdrop'
import HeroLauncher from '@/components/sunum/HeroLauncher'
import PresentationLibrary from '@/components/sunum/PresentationLibrary'
import './sunum.css'

export const metadata: Metadata = {
  title: 'AI Sunum Stüdyosu — Konunu anlat, profesyonel sunumunu indir | Miraç Güntoğar',
  description:
    'Konuyu yaz ya da PDF/DOCX yükle; yerel yapay zekâ (Ollama · Qwen3) içeriği ve sunum akışını kurar, Slide Engine profesyonel tasarımı üretir. 12 slayt tipi, 7 tema, PPTX ve PDF çıktısı. Ücretsiz, kayıt yok, veriler cihazından çıkmaz.',
  keywords: [
    'AI sunum',
    'yapay zeka sunum hazırlama',
    'sunum oluşturucu',
    'PPTX oluştur',
    'PowerPoint AI',
    'Ollama',
    'Qwen3',
    'ücretsiz sunum',
    'presentation generator',
  ],
}

export default function SunumPage() {
  return (
    <>
      <Navbar />
      <SunumBackdrop />
      <main className="relative pt-28 pb-20 sm:pt-32">
        <div className="mx-auto w-full max-w-[76rem] px-3 sm:px-6">
          <HeroLauncher />
          <div className="mt-16 border-t border-line/10 pt-10">
            <PresentationLibrary />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
