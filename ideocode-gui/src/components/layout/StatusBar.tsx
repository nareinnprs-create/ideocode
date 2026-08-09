import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { getGatewayStatus, type GatewayStatus } from "../../lib/tauri-commands";

export function StatusBar() {
  const { version, activePanel, theme } = useAppStore();
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getGatewayStatus();
        if (!cancelled) setGateway(status);
      } catch {
        if (!cancelled) setGateway(null);
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const engineState =
    gateway?.online
      ? { label: "Engine online", cls: "bg-success", text: "text-success" }
      : gateway?.installing
        ? { label: "Engine installing", cls: "bg-warning", text: "text-warning" }
        : { label: "Engine starting", cls: "bg-accent-primary animate-pulse", text: "text-accent-primary" };

  return (
    <footer className="flex items-center justify-between h-7 px-3 bg-bg-secondary border-t border-border-subtle text-[11px] text-text-muted select-none">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-text-secondary">IDEOCODE</span>
        <span className="opacity-50">v{version}</span>
        <span className="opacity-50">{theme}</span>
      </div>

      {/* Center */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${engineState.cls}`} />
          <span className={engineState.text}>{engineState.label}</span>
        </span>
        {gateway?.online && (
          <span className="opacity-50">:{gateway.port}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="opacity-50">Panel: {activePanel}</span>
        <span className="text-success">Ready</span>
        <span className="opacity-50">UTF-8</span>
      </div>
    </footer>
  );
}
