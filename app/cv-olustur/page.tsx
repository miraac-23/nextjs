import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CvStudio from '@/components/cv/CvStudio'
import CvBackdrop from '@/components/cv/CvBackdrop'
import './cv.css'
import './templates-dogu.css'
import './editor.css'
import '@/components/ats/ats.css'

export const metadata: Metadata = {
  title: 'CV Stüdyosu — Ücretsiz CV oluşturucu, ATS skoru ve ATS uyumlu şablonlar | Miraç Güntoğar',
  description:
    '97 şablon: 25 ATS uyumlu Ankara şablonu + 72 görsel tasarım şablonu. Seçtiğin şablonun gerçek yerleşimine göre anlık ATS skoru, hard/soft skill iş ilanı eşleşmesi ve 20 maddelik ATS kontrol listesi. PDF, DOCX ve TXT çıktısı. Kayıt yok, ücret yok, veriler cihazınızdan çıkmaz — tamamen tarayıcıda çalışır.',
  keywords: [
    'CV oluşturucu',
    'ATS uyumlu CV',
    'ATS skoru',
    'CV şablonları',
    'ücretsiz CV',
    'özgeçmiş şablonu',
    'PDF CV',
    'DOCX CV',
    'resume builder',
  ],
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
