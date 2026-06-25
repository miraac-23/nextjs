'use client'

import { useRef, useState } from 'react'
import CopyButton from './CopyButton'

type Props = { file: string; output: string; runnable: boolean; category?: string }

function reasonFor(category: string | undefined, file: string) {
  if (category === 'versiyon')
    return (
      <>
        Bu sürüm-analizi örneği tek dosya olarak yerel <strong className="text-fg2">JDK 21</strong> ile
        çalıştırılamadı (bağımsız bir <code className="font-mono text-amber-200/90">main</code> içermeyebilir
        ya da <strong className="text-fg2">daha yeni bir JDK / önizleme özelliği</strong> gerektirir).
        İlgili dil özelliği yukarıdaki anlatım ve kodda gösterilmiştir.
      </>
    )
  if (category === 'java')
    return (
      <>
        Bu örnek canlı <strong className="text-fg2">veritabanı bağlantısı (JDBC sürücüsü)</strong>{' '}
        gerektirir; tek başına <code className="font-mono text-amber-200/90">java {file}</code> ile çalışmaz.
        Çalışma mantığı yukarıdaki anlatım ve kodda açıklanmıştır.
      </>
    )
  return (
    <>
      Bu örnek <strong className="text-fg2">Spring / Spring Boot (Gradle)</strong> ortamı
      gerektirir; tek dosya olarak <code className="font-mono text-amber-200/90">java {file}</code> ile
      çalışmaz. Orijinal portal bunu gömülü Tomcat / Spring context ile koşuyordu. Beklenen davranış
      yukarıdaki <strong className="text-fg2">anlatım</strong> ve{' '}
      <strong className="text-fg2">kodda</strong> açıklanmıştır.
    </>
  )
}

export default function Runner({ file, output, runnable, category }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          <span className="font-mono text-[12px] text-amber-200/80">canlı çalıştırma için ortam gerekir</span>
        </div>
        <p className="px-4 py-3 text-[13px] leading-relaxed text-fg3">{reasonFor(category, file)}</p>
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
              Çalışıyor…
            </>
          ) : (
            <>▶ Çalıştır</>
          )}
        </button>
        <span className="text-[12px] text-fg4">
          Çıktı yerel JDK 21 ile yakalandı — tarayıcıda JVM çalışmaz.
        </span>
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
              konsol — {file}
            </span>
            {status === 'done' && output && <CopyButton text={output} label="Çıktıyı kopyala" />}
          </div>
          <pre className="max-h-[420px] overflow-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-emerald-300/90">
            {status === 'running' ? (
              <span className="text-fg4">$ java {file} … derleniyor</span>
            ) : (
              <code>
                <span className="text-fg4">$ java {file}</span>
                {'\n'}
                {output || '(çıktı yok)'}
              </code>
            )}
          </pre>
        </div>
      )}
    </>
  )
}
