import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { LabExample } from '@/lib/lab'
import CopyButton from './CopyButton'
import Runner from './Runner'

export default function ExampleBlock({
  example,
  category,
}: {
  example: LabExample
  category?: string
}) {
  return (
    <div className="rounded-3xl border border-line/10 bg-surface/[0.02] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-display text-base font-semibold text-accent-soft">{example.name}</h4>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${
            example.runnable
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
          }`}
        >
          {example.runnable ? 'çalıştırılabilir' : 'ortam gerekir'}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/10 bg-[#0b0f1c]">
        <div className="flex items-center justify-between border-b border-line/10 bg-surface/[0.03] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[12px] text-fg3">{example.file}</span>
          </div>
          <CopyButton text={example.code} />
        </div>
        <SyntaxHighlighter
          language="java"
          style={oneDark}
          showLineNumbers
          customStyle={{
            margin: 0,
            background: 'transparent',
            fontSize: '12.5px',
            padding: '1rem',
            maxHeight: '460px',
          }}
          codeTagProps={{ style: { fontFamily: 'var(--font-mono), monospace' } }}
          lineNumberStyle={{ color: '#3b4861', minWidth: '2.4em' }}
        >
          {example.code}
        </SyntaxHighlighter>
      </div>

      <Runner
        file={example.file}
        output={example.output}
        runnable={example.runnable}
        category={category}
      />
    </div>
  )
}
