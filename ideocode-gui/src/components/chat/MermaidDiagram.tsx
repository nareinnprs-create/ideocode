import { useEffect, useRef, useState } from "react";

interface Props {
  code: string;
}

export function MermaidDiagram({ code }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;

    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-error/30 bg-error/5 p-3">
        <p className="text-[10px] text-error mb-1">Could not render diagram</p>
        <pre className="text-xs text-text-secondary overflow-x-auto font-mono whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    );
  }

  return <div ref={ref} className="my-2 overflow-x-auto rounded-lg" />;
}
