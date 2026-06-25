import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="lab-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-2 font-display text-2xl font-bold tracking-tight text-fg">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-9 border-b border-line/10 pb-2 font-display text-xl font-semibold text-fg">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 font-display text-base font-semibold text-accent-soft">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 text-[14.5px] leading-[1.75] text-fg2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 space-y-1.5 pl-1 text-[14.5px] text-fg2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[14.5px] text-fg2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-5 leading-[1.7] marker:text-accent before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent/60 [ol_&]:pl-1 [ol_&]:before:hidden">
              {children}
            </li>
          ),
          a: ({ children, href }) => (
            <a href={href} className="font-medium text-accent underline-offset-2 hover:underline">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em: ({ children }) => <em className="text-fg2">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-xl border-l-2 border-accent/60 bg-accent/[0.06] px-4 py-1 text-[14px] italic text-fg2">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-line/10">
              <table className="w-full border-collapse text-left text-[13.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface/[0.04]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-line/10 px-3 py-2 font-semibold text-fg2">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line/5 px-3 py-2 align-top text-fg2">{children}</td>
          ),
          hr: () => <hr className="my-6 border-line/10" />,
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const text = String(children).replace(/\n$/, '')
            // Inline code (no language + single line)
            if (!match && !text.includes('\n')) {
              return (
                <code
                  className="rounded-md border border-line/10 bg-surface/[0.06] px-1.5 py-0.5 font-mono text-[12.5px] text-accent-soft"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <SyntaxHighlighter
                language={match ? match[1] : 'text'}
                style={oneDark}
                customStyle={{
                  margin: '1rem 0',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: '#0b0f1c',
                  fontSize: '12.5px',
                  padding: '1rem',
                }}
                codeTagProps={{ style: { fontFamily: 'var(--font-mono), monospace' } }}
              >
                {text}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
