import { useAppStore } from "../../stores/appStore";

export function StatusBar() {
  const { version, activePanel, theme } = useAppStore();

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
        <span className="opacity-50">
          Panel: {activePanel}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="text-success">Ready</span>
        <span className="opacity-50">UTF-8</span>
      </div>
    </footer>
  );
}
