'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '/#about', label: 'Hakkımda' },
  { href: '/#skills', label: 'Yetenekler' },
  { href: '/#experience', label: 'Deneyim' },
  { href: '/#projects', label: 'Projeler' },
  { href: '/#blog', label: 'Blog' },
  { href: '/#contact', label: 'İletişim' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'py-3' : 'py-5'
      }`}
    >
      <div className="container-x">
        <nav
          className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 ${
            scrolled ? 'glass shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]' : 'border border-transparent'
          }`}
        >
          <Link href="/#home" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet-glow font-display text-sm font-bold text-ink-950">
              MG
            </span>
            <span className="font-display text-sm font-semibold tracking-wide text-slate-100">
              Miraç Güntoğar<span className="text-accent">.</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-accent-soft"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Link href="/#contact" className="btn-primary px-5 py-2.5 text-[13px]">
              İletişime Geç
            </Link>
          </div>

          <button
            aria-label="Menüyü aç/kapat"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 md:hidden"
          >
            <div className="space-y-1.5">
              <span
                className={`block h-0.5 w-5 bg-slate-200 transition-all duration-300 ${
                  open ? 'translate-y-2 rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-slate-200 transition-all duration-300 ${
                  open ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-slate-200 transition-all duration-300 ${
                  open ? '-translate-y-2 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 top-0 z-40 transition-all duration-500 md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute inset-x-4 top-24 rounded-3xl border border-white/10 bg-ink-800/95 p-6 shadow-2xl transition-all duration-500 ${
            open ? 'translate-y-0' : '-translate-y-6'
          }`}
        >
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-accent-soft"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/#contact"
            onClick={() => setOpen(false)}
            className="btn-primary mt-4 w-full"
          >
            İletişime Geç
          </Link>
        </div>
      </div>
    </header>
  )
}
