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
- [ ] P0.4 Stabilize supervisor (readiness probe before "recovered"; no tight restart loop)
- [ ] P0.5 TUI prod panic!/unreachable! sweep -> graceful errors
- [ ] P0.6 Full test suite + guardrails pass

### Phase 1 — GUI premium foundation
- [ ] P1.1 Design system v2 (tokens, themes, motion, glassmorphism)
- [ ] P1.2 Professional shell (activity bar, tabs, right/bottom panels, status bar)
- [ ] P1.3 Premium onboarding incl. Baanzon provisioning progress
- [ ] P1.4 Streaming markdown (syntax highlight, tables, mermaid, copy)

### Phase 2 — Cursor / Codex / Claude Code / Zcode feature parity
- [ ] P2.1 Multi-tab composer, model selector, agent mode
- [ ] P2.2 Inline AI diff accept/reject in Monaco
- [ ] P2.3 Cmd+K quick edit + ghost autocomplete
- [ ] P2.4 Codebase indexing + embeddings + semantic search
- [ ] P2.5 @-mentions, slash commands, MCP config
- [ ] P2.6 Plan mode + tool permission prompts
- [ ] P2.7 Session history UX (load/clear/list/rename/resume/export/delete)
- [ ] P2.8 Multi-file edit tree + per-file Monaco diff
- [ ] P2.9 Terminal panel polish + AI-run commands
- [ ] P2.10 Build/Debug panel wired to editor diagnostics
- [ ] P2.11 Git panel staging UX
- [ ] P2.12 Usage/cost overlay in GUI
- [ ] P2.13 Command palette upgrade + keyboard-first/vim
- [ ] P2.14 Voice dictation (mic)

### Phase 3 — TUI polish + full verification
- [ ] P3.1 TUI layout/theme cleanup + zero-error sweep
- [ ] P3.2 Guardrails, full tests, GUI vitest, Tauri build (Win + macOS), E2E chat
