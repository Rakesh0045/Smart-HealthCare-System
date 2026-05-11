import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div className={`markdown-content ${className || ''}`}>
      <style>{`
        .markdown-content {
          line-height: 1.6;
          font-size: 13px;
        }
        .markdown-content p {
          margin: 0 0 10px 0;
        }
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        .markdown-content ul, .markdown-content ol {
          margin: 0 0 10px 20px;
          padding: 0;
          list-style-type: disc;
        }
        .markdown-content ol {
          list-style-type: decimal;
        }
        .markdown-content li {
          margin-bottom: 4px;
        }
        .markdown-content strong, .markdown-content b {
          font-weight: 700;
          color: inherit;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          margin: 16px 0 8px 0;
          font-weight: 800;
          line-height: 1.3;
        }
        .markdown-content h1 { font-size: 18px; }
        .markdown-content h2 { font-size: 16px; }
        .markdown-content h3 { font-size: 14px; }
        .markdown-content code {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(0,0,0,0.05);
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 12px;
        }
        .markdown-content blockquote {
          margin: 0 0 10px 0;
          padding-left: 12px;
          border-left: 3px solid #cbd5e1;
          color: #64748b;
          font-style: italic;
        }
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .markdown-content th, .markdown-content td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: left;
        }
        .markdown-content th {
          background: #f8fafc;
          font-weight: 700;
        }
      `}</style>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
