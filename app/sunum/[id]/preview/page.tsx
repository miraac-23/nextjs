import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SunumBackdrop from '@/components/sunum/SunumBackdrop'
import PresentMode from '@/components/sunum/PresentMode'
import '../../sunum.css'

export const metadata: Metadata = {
  title: 'Sunum modu — AI Sunum Stüdyosu',
  description: 'Slaytları tam ekran gez, konuşmacı notlarını gör.',
  robots: { index: false, follow: false },
}

export default function PresentationPreviewPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Navbar />
      <SunumBackdrop />
      <main className="relative pt-24 pb-16 sm:pt-28">
        <div className="mx-auto w-full max-w-[88rem] px-3 sm:px-6">
          <PresentMode id={params.id} />
        </div>
      </main>
      <Footer />
    </>
  )
}
