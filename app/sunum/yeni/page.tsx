import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SunumBackdrop from '@/components/sunum/SunumBackdrop'
import Wizard from '@/components/sunum/wizard/Wizard'
import '../sunum.css'

export const metadata: Metadata = {
  title: 'Yeni sunum oluştur — AI Sunum Stüdyosu | Miraç Güntoğar',
  description:
    'Konu, hedef kitle, süre ve temayı seç; yerel yapay zekâ sunum planını ve içeriğini üretsin. PDF/DOCX yükleyerek kendi dokümanından sunum çıkar.',
}

export default function NewPresentationPage() {
  return (
    <>
      <Navbar />
      <SunumBackdrop />
      <main className="relative pt-28 pb-20 sm:pt-32">
        <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
          <Wizard />
        </div>
      </main>
      <Footer />
    </>
  )
}
