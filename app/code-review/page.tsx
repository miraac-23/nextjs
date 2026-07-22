import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CodeReviewApp from '@/components/codereview/CodeReviewApp'
import CodeReviewBackdrop from '@/components/codereview/CodeReviewBackdrop'
import './codereview.css'

export const metadata: Metadata = {
  title: 'Code Review — AI + Kural tabanlı kod inceleme | Miraç Güntoğar',
  description:
    'GitLab · GitHub · Bitbucket MR/PR incelemesi. AI + deterministik kural motoru ile bulguları çıkar, tek tıkla yorum gönder — tamamen tarayıcıda.',
}

export default function CodeReviewPage() {
  return (
    <>
      <Navbar />
      <CodeReviewBackdrop />
      <main className="relative pt-28 pb-20 sm:pt-32">
        <div className="pcr-stage mx-auto w-full max-w-[92rem] px-3 sm:px-6">
          <CodeReviewApp />
        </div>
      </main>
      <Footer />
    </>
  )
}
