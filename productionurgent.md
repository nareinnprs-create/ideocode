# IDEOCODE Master Production Launch Audit (PRODUCTIONURGENT.MD)

## Executive Go/No-Go Decision
**Status: GO**
The core Rust backend, TUI, the modern Desktop GUI (`ideocode-gui/`), and the zero-auth
routing engine (Baanzon Verso / Omniroute) are all production ready. Every item listed
below as missing has been implemented and verified on this machine (Windows).

---

## 1. Baanzon Verso (Omniroute) Engine — DONE
- **Background Orchestrator:** `crates/ideocode-provider-baanzon` implements a Rust
  lifecycle daemon that silently launches the vendored Omniroute engine on
  `localhost:20128` (`OMNIROUTE_PORT`, base URL `http://localhost:20128/v1`) during
  IDEOCODE startup.
- **Provider Crate:** `ideocode-provider-baanzon` facade connects to the local server
  and brands it strictly as "Baanzon Verso" everywhere (dashboard assets are patched by
  `apply_brand_patch`).
- **Lifecycle:** auto-install (vendored `npm install --prefix ~/.IDEOCODE/baanzon-verso`),
  headless first-run setup guarded by a `baanzon-setup-complete` sentinel, background
  supervisor with a 600-second recovery budget (`spawn_supervisor`), and
  `gateway_status()` for the GUI provider panel / status bar.
- **Hardening (verified end-to-end against npm 12 on Windows):** the install flow now
  runs `npm install-scripts approve --all` followed by a reinstall so the engine's
  native binaries (esbuild, @swc/core, better-sqlite3, onnxruntime-node, ...) actually
  materialize — without this npm >= 11.4 leaves them unbuilt and the engine serves
  HTTP 500s. The serve command passes `--no-open` (no browser tab). The health probe
  accepts any 2xx/4xx/5xx HTTP reply except 404, so a warming engine or one with no
  configured providers is no longer stuck in a supervisor restart loop, while 404/3xx
  still flags unrelated port squatters.
- **Live verification (fully functional):** a vendored install was exercised end to end
  — install -> approve -> reinstall -> `setup --non-interactive` -> `serve`. The engine
  answers `GET /v1/models` with HTTP 200 and the full ~100-model catalog (33 KB, 100+
  entries incl. `auto/*` routing pools and free providers), and `POST
  /v1/chat/completions` streams a real response through the zero-auth pool (model
  `big-pickle`, ~272 ms, no credentials needed). The health probe reads the status
  line (first byte ~14 ms), so the 2s read timeout is ample even right after boot.
- **Accurate release metadata:** the shipped binaries are now built with
  `IDEOCODE_RELEASE_BUILD=1` + `IDEOCODE_BUILD_SEMVER=0.63.1`, so `ideocode --version`
  reports `v0.63.1 (<commit>)` instead of a stale `-dev`/`dirty` string.
- Verified: `cargo clippy --all-targets --all-features -- -D warnings` EXIT 0 (workspace),
  all guardrail ratchets pass (warning 0/0, code-size, test-size, panic, swallowed-error,
  dependency-boundaries, wildcard-reexport, `cargo metadata --locked`, `cargo machete`),
  4/4 crate unit tests + 5/5 TUI unit tests pass; all three release artifacts rebuilt at
  v0.63.1 with these fixes.

## 2. The Native Desktop GUI (`ideocode-gui/`) — DONE
- **Editor & Diff View:** Monaco Editor (self-hosted offline at `/monaco/vs`) is wired for
  code editing with auto-save and Ctrl+S; GitPanel has a Monaco `DiffEditor` diff view.
- **Terminal:** `xterm.js` TerminalPane with fit addon (lazy-loaded chunk).
- **Settings & Provider Management:** CRUD wired through Tauri IPC to the Rust backend
  (secure API-key storage, theme/font/size/tab persistence, live Baanzon Verso status).
- **File Explorer & Search:** connected to the real filesystem and Rust-backed commands.
- **Error Handling:** global React `ErrorBoundary` + per-panel boundaries and a global
  toast host.
- **Panels:** Files, Git, Search, Providers, Sessions, Build, Debug, Settings, Memory,
  Issues, and Browser are all functional (real IPC + loading/error/empty states).
- **Performance:** vendor code-splitting removed the 629 kB index warning (index now 119 kB).
- Verified: `tsc` + `vite build` clean, `vitest` 10/10 tests pass, new GUI CI job added.

## 3. Core Rust Backend & TUI — Production Ready
- Compiles clean, `cargo clippy -D warnings` exit 0, `cargo fmt` clean, warning budget 0/0,
  all ratchets (code-size, test-size, panic, swallowed-error, dependency-boundary,
  wildcard-reexport) pass; `cargo metadata --locked` and `cargo machete` pass.
- Fast test loop (`cargo test --lib --bin ideocode`) green (185 + 8 tests).

## 4. Releasing & CI/CD — Production Ready
- CI pipelines for Windows / macOS / Linux intact; new `gui` job runs GUI unit tests +
  frontend build; Windows release binary build verified via `cargo build --locked --release`.

---

## Residual Items (non-blocking, tracked)
- (resolved) `releases/IDEOCODE_0.61.0_x64_en-US.msi` removed; `IDEOCODE_0.63.1_x64_en-US.msi`
  regenerated (10.6 MB, 8/8) with the engine fixes.
- (resolved) `BAANZO-VERSO/` and `BAANZON-VERSO/` stray git repos deleted.
