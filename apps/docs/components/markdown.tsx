'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownProps = {
  content: string;
};

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function Markdown({ content }: MarkdownProps) {
  // Remove the first H1 as we display it separately
  const contentWithoutTitle = content.replace(/^# .+\n*/m, '');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom blockquote to handle screenshot placeholders
        blockquote: ({ children }) => {
          const text = String(children);
          const screenshotMatch = text.match(/\[Screenshot: (.+)\]/);
          if (screenshotMatch) {
            return (
              <div className="my-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                <span>📸 {screenshotMatch[1]}</span>
              </div>
            );
          }
          return (
            <blockquote className="border-l-4 border-primary/30 pl-4 italic">
              {children}
            </blockquote>
          );
        },
        // Style headers with IDs for TOC
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold tracking-tight mt-10 mb-4">{children}</h1>
        ),
        h2: ({ children }) => {
          const text = String(children);
          const id = generateId(text);
          return (
            <h2 id={id} className="text-xl font-semibold mt-10 mb-4 scroll-mt-28">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const text = String(children);
          const id = generateId(text);
          return (
            <h3 id={id} className="text-lg font-semibold mt-8 mb-3 scroll-mt-28">
              {children}
            </h3>
          );
        },
        h4: ({ children }) => (
          <h4 className="text-base font-semibold mt-6 mb-2 scroll-mt-28">{children}</h4>
        ),
        // Style paragraphs
        p: ({ children }) => (
          <p className="text-base leading-relaxed mb-4">{children}</p>
        ),
        // Style lists
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-base leading-relaxed">{children}</li>
        ),
        // Style tables
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="text-left font-semibold p-3 border-b">{children}</th>
        ),
        td: ({ children }) => (
          <td className="p-3 border-b">{children}</td>
        ),
        // Style code
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className={`${className} block`}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm">
            {children}
          </pre>
        ),
        // Style links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        // Style strong and emphasis
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        // Style horizontal rule
        hr: () => <hr className="my-8 border-t border-border" />,
      }}
    >
      {contentWithoutTitle}
    </ReactMarkdown>
  );
}
