import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AtsAnalyzer from '@/components/ats/AtsAnalyzer'
import CvBackdrop from '@/components/cv/CvBackdrop'
import '../cv-olustur/cv.css'
import '@/components/ats/ats.css'

export const metadata: Metadata = {
  title: "ATS CV Analizi — CV'nin ATS skorunu ücretsiz ölç | Miraç Güntoğar",
  description:
    'PDF, DOCX ya da TXT CV’ni yükle; Jobscan / Resume Worded yapısındaki beş kategori (biçim & ATS uyumu, aranabilirlik, hard skills, soft skills, işe alımcı ipuçları) ve 20 maddelik ATS kontrol listesiyle skorunu gör. Dosyan cihazından çıkmaz, kayıt yok.',
  keywords: ['ATS CV analizi', 'ATS skoru', 'CV kontrol', 'ATS uyumlu CV', 'resume ATS checker', 'CV anahtar kelime'],
}

export default function AtsAnalyzePage() {
  return (
    <>
      <Navbar />
      <CvBackdrop />
      <main className="relative pt-28 pb-20 sm:pt-32">
        <div className="mx-auto w-full max-w-[80rem] px-3 sm:px-6">
          <AtsAnalyzer />
        </div>
      </main>
      <Footer />
    </>
  )
}
