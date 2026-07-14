import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Marquee from '@/components/Marquee'
import About from '@/components/About'
import Skills from '@/components/Skills'
import Experience from '@/components/Experience'
import Projects from '@/components/Projects'
import SunumlarPreview from '@/components/SunumlarPreview'
import BlogPreview from '@/components/BlogPreview'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Skills />
        <Experience />
        <Projects />
        <SunumlarPreview />
        <BlogPreview />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
