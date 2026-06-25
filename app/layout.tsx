import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://miracguntogar.dev'),
  title: 'Miraç Güntoğar — Fullstack Yazılım Geliştirici',
  description:
    'Java · Spring Boot · React / Next.js. Ölçeklenebilir mikroservis mimarileri ve modern, kullanıcı odaklı arayüzler geliştiren fullstack yazılım mühendisi.',
  keywords: [
    'Miraç Güntoğar',
    'Fullstack Developer',
    'Java',
    'Spring Boot',
    'React',
    'Next.js',
    'Mikroservis',
    'Yazılım Mühendisi',
  ],
  authors: [{ name: 'Miraç Güntoğar' }],
  openGraph: {
    title: 'Miraç Güntoğar — Fullstack Yazılım Geliştirici',
    description:
      'Java · Spring Boot · React / Next.js ile ölçeklenebilir ve modern sistemler.',
    type: 'website',
    locale: 'tr_TR',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
