'use client'

import { useRef, useState } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import CopyButton from './CopyButton'

type Props = { file: string; output: string; runnable: boolean; category?: string }

export default function Runner({ file, output, runnable, category }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useT()

  const reason =
    category === 'versiyon' ? t.portal.reasonVersion(file)
    : category === 'java' ? t.portal.reasonJava(file)
    : t.portal.reasonSpring(file)

  function run() {
    setStatus('running')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('done'), 750)
  }

  if (!runnable) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/[0.04]">
        <div className="flex items-center gap-2 border-b border-amber-400/15 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-amber-400/80" />
          <span className="font-mono text-[12px] text-amber-200/80">{t.portal.needsEnvBanner}</span>
        </div>
        <p className="px-4 py-3 text-[13px] leading-relaxed text-fg3">{reason}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={status === 'running'}
          className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-70"
        >
          {status === 'running' ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-950/40 border-t-ink-950" />
              {t.portal.running}
            </>
          ) : (
            <>{t.portal.run}</>
          )}
        </button>
        <span className="text-[12px] text-fg4">{t.portal.runNote}</span>
      </div>

      {status !== 'idle' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line/10 bg-[#05080f]">
          <div className="flex items-center justify-between border-b border-line/10 px-4 py-2">
            <span className="flex items-center gap-2 font-mono text-[12px] text-fg3">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === 'done' ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
                }`}
              />
              {t.portal.console} — {file}
            </span>
            {status === 'done' && output && <CopyButton text={output} label={t.portal.copyOutput} />}
          </div>
          <pre className="max-h-[420px] overflow-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-emerald-300/90">
            {status === 'running' ? (
              <span className="text-fg4">$ java {file} … {t.portal.compiling}</span>
            ) : (
              <code>
                <span className="text-fg4">$ java {file}</span>
                {'\n'}
                {output || t.portal.noOutput}
              </code>
            )}
          </pre>
        </div>
      )}
    </>
  )
}
