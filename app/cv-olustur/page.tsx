import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CvStudio from '@/components/cv/CvStudio'
import CvBackdrop from '@/components/cv/CvBackdrop'
import './cv.css'

export const metadata: Metadata = {
  title: 'CV Stüdyosu — Ücretsiz modern CV oluşturucu | Miraç Güntoğar',
  description:
    '20 profesyonel şablon, canlı önizleme ve tek tıkla PDF çıktısı. Kayıt yok, ücret yok, veriler cihazınızdan çıkmaz — tamamen tarayıcıda çalışan CV oluşturma aracı.',
  keywords: ['CV oluşturucu', 'ücretsiz CV', 'özgeçmiş şablonu', 'PDF CV', 'resume builder', 'ATS uyumlu CV'],
}

export default function CvBuilderPage() {
  return (
    <>
      <Navbar />
      <CvBackdrop />
      <main className="relative pt-28 pb-20 sm:pt-32">
        <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-6">
          <CvStudio />
        </div>
      </main>
      <Footer />
    </>
  )
}
