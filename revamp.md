# IDEOCODE 2026 Revamp — Master Plan & Progress Tracker

Goal: Baanzon Verso (omniroute auto-routing) works invisibly and automatically in the
backend of both TUI and GUI; users only ever see "Baanzon Verso". GUI and TUI are fully
functional, zero-error, and the GUI reaches premium 2026 UI/UX parity with Cursor,
Codex, Claude Code, and Zcode.

## Verified baseline (2026-08-08)

- Baanzon Verso engine = vendored `omniroute` npm package at `~/.IDEOCODE/baanzon-verso`,
  OpenAI-compatible API at `http://localhost:20128/v1`. **Functional when started**:
  serves `auto/best-coding`, `auto/best-reasoning`; streams chat completions. Zero config.
- **Root cause "not working in TUI":** engine daemon is only started by the GUI backend
  (`ideocode-gui/src-tauri/src/main.rs:74`). TUI never starts it — it only reads
  `gateway_online()` (`crates/ideocode-tui/src/tui/ui_sidebar.rs`).
- **Root cause "not working in GUI":** daemon starts async at setup; chat command does not
  wait for readiness and fails on cold start (`ideocode-gui/src-tauri/src/commands/chat.rs:177`).
- GUI builds clean (tsc + vite build OK). GUI dead wiring: `loadMessages`/`clearMessages`
  unused, `indexDirectory` unused, mic decorative.
- TUI: 100+ UI modules; production panics rare (mostly tests).

## Progress

### Phase 0 — Reliability: Baanzon works everywhere, zero errors
- [x] P0.1 Shared engine bootstrap (ensure installed -> start -> wait-for-ready) in `ideocode-provider-baanzon`
- [x] P0.2 TUI auto-starts engine at startup; sidebar status Starting/Running/Error + retry
- [x] P0.3 GUI bootstrap + wait-for-ready chat gating; status bar engine state + restart
- [x] P0.4 Stabilize supervisor (readiness probe before "recovered"; no tight restart loop)
- [x] P0.5 TUI prod panic!/unreachable! sweep -> graceful errors
- [x] P0.6 Full test suite + guardrails pass

### Phase 1 — GUI premium foundation
- [x] P1.1 Design system v2 (tokens, themes, motion, glassmorphism) — motion keyframes, primitives (.btn/.kbd/.chip/.card/.surface/.panel/.text-gradient), shimmer/typing dots, reduced-motion, resize handles
- [x] P1.2 Professional shell (activity bar, tabs, right/bottom panels, status bar) — editor tab bar (multi-file), bottom panel dock (terminal, Ctrl+J), drag-resize on right/bottom panels, engine status in status bar
- [x] P1.3 Premium onboarding incl. Baanzon provisioning progress — gateway provisioning step (install/start/online), timeout + continue-anyway
- [x] P1.4 Streaming markdown (syntax highlight, tables, mermaid, copy) — mermaid diagrams (lazy), file-path chips open files, avatars + typing dots + framer entrance, code copy

### Phase 2 — Cursor / Codex / Claude Code / Zcode feature parity
- [x] P2.1 Multi-tab composer, model selector, agent mode
- [x] P2.2 Inline AI diff accept/reject in Monaco
- [x] P2.3 Cmd+K quick edit + ghost autocomplete
- [x] P2.4 Codebase indexing + embeddings + semantic search
- [x] P2.5 @-mentions, slash commands, MCP config
- [x] P2.6 Plan mode + tool permission prompts
- [x] P2.7 Session history UX (load/clear/list/rename/resume/export/delete)
- [x] P2.8 Multi-file edit tree + per-file Monaco diff
- [x] P2.9 Terminal panel polish + AI-run commands
- [x] P2.10 Build/Debug panel wired to editor diagnostics
- [x] P2.11 Git panel staging UX
- [x] P2.12 Usage/cost overlay in GUI
- [x] P2.13 Command palette upgrade + keyboard-first/vim
- [x] P2.14 Voice dictation (mic)

### Phase 3 — TUI polish + full verification
- [ ] P3.1 TUI layout/theme cleanup + zero-error sweep
- [ ] P3.2 Guardrails, full tests, GUI vitest, Tauri build (Win + macOS), E2E chat
