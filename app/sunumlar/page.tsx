import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SunumlarListView from '@/components/sunumlar/SunumlarListView'

export const metadata: Metadata = {
  title: 'Sunumlar — Miraç Güntoğar',
  description:
    'Tarayıcıda gezilebilen interaktif eğitim sunumları. Java & Spring, rate limit & kota yönetimi ve API gateway mimarisi.',
}

export default function SunumlarPage() {
  return (
    <>
      <Navbar />
      <main className="relative pt-36 pb-24 sm:pt-44">
        <div className="pointer-events-none absolute inset-0 aurora opacity-60" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

        <div className="container-x relative">
          <SunumlarListView />
        </div>
      </main>
      <Footer />
    </>
  )
}
