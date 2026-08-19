import { listen } from "@tauri-apps/api/event";
import { eventBus } from "./eventBus";

let initialized = false;

export function initTauriEventBridge() {
  if (initialized) return;
  initialized = true;

  listen<{ stdout: string; stderr: string; success: boolean; exit_code: number }>(
    "build://output",
    (e) => {
      const { stdout, stderr, success } = e.payload;
      if (stdout) eventBus.emit("build-output", stdout);
      if (stderr) eventBus.emit("build-output", stderr);
      eventBus.emit("build-output", success ? "\n✓ Build succeeded" : "\n✗ Build failed");
    },
  );

  listen<{ message: string }>("git://committed", (e) => {
    eventBus.emit("output", `[git] ${e.payload.message}`);
  });

  listen<{ message: string }>("git://pushed", (e) => {
    eventBus.emit("output", `[git] ${e.payload.message}`);
  });

  listen<{ message: string }>("git://pulled", (e) => {
    eventBus.emit("output", `[git] ${e.payload.message}`);
  });

  listen<{ message: string }>("git://error", (e) => {
    eventBus.emit("output", `[git error] ${e.payload.message}`);
  });

  listen<{ line: string }>("process://stdout", (e) => {
    eventBus.emit("output", e.payload.line);
  });

  listen<{ line: string }>("process://stderr", (e) => {
    eventBus.emit("output", e.payload.line);
  });

  // Agent tool execution events
  listen<{ assistant_id: string; tools: string[] }>("chat://tool", (e) => {
    eventBus.emit("agent-tool", e.payload);
  });

  listen<{ assistant_id: string; tool_id: string; tool_name: string; output: string }>(
    "chat://tool_result",
    (e) => {
      eventBus.emit("agent-tool-result", e.payload);
    },
  );
}
