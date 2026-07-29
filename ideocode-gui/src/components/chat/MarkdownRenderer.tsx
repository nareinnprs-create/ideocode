import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  content: string;
  onFileClick?: (path: string) => void;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children }) {
          return <CodeBlock>{children}</CodeBlock>;
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="bg-bg-elevated px-1.5 py-0.5 rounded text-accent-tertiary text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        ul({ children }) {
          return <ul className="list-disc list-inside space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className="list-decimal list-inside space-y-1">{children}</ol>
          );
        },
        h1({ children }) {
          return (
            <h1 className="text-xl font-bold text-text-primary mt-4 mb-2">
              {children}
            </h1>
          );
        },
        h2({ children }) {
          return (
            <h2 className="text-lg font-semibold text-text-primary mt-3 mb-1.5">
              {children}
            </h2>
          );
        },
        h3({ children }) {
          return (
            <h3 className="text-base font-semibold text-text-primary mt-2 mb-1">
              {children}
            </h3>
          );
        },
        p({ children }) {
          return <p className="text-sm leading-relaxed mb-2">{children}</p>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-accent-primary pl-3 text-text-secondary italic my-2">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="text-sm border-collapse">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border-default px-3 py-1.5 text-left font-medium bg-bg-tertiary">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-border-default px-3 py-1.5">
              {children}
            </td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = extractText(children);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-border-subtle">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-bg-elevated/80 backdrop-blur
          text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-fast z-10"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre className="bg-bg-secondary p-3 overflow-x-auto text-[13px] leading-relaxed font-mono">
        {children}
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  if ("props" in node && node.props && typeof node.props === "object") {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  return "";
}
