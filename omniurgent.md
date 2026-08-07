# Baanzon Verso (Omniroute) Integration — OMNIURGENT.MD

## Status
**COMPLETE.** The external routing engine is integrated, auto-installed, branded, and
self-healing. Port is **20128** (not the outdated 37000), base URL
`http://localhost:20128/v1`.

## Architecture & Requirements

### 1. Backend: Silent Localhost Orchestration — DONE
- `crates/ideocode-provider-baanzon/src/daemon.rs` is the Rust lifecycle manager:
  - `install_vendored_gateway`: silently `npm install --prefix ~/.IDEOCODE/baanzon-verso`
    (never touches global npm).
  - `provision_gateway`: headless first-run setup with `INITIAL_PASSWORD=""` (auto-logged-in
    dashboard), guarded by `baanzon-setup-complete` sentinel.
  - `spawn_supervisor`: background thread polls every 10s and self-heals within a 600s
    recovery budget.
  - `gateway_status()`: exposes engine/online/disabled/installing/port/base_url to the GUI.

### 2. Provider Integration: The "Baanzon Verso" Facade — DONE
- `crates/ideocode-provider-baanzon` implements the client (`client.rs`) and config
  (`config.rs`); GUI chat/providers use the crate constants via `OMNIROUTE_BASE_URL`.
- White-labeling: `apply_brand_patch` rewrites "OmniRoute" -> "Baanzon Verso" and
  "omniroute.online" -> "baanzonverso.local" in the dashboard static assets.
- The word "omniroute" never appears in UI-facing labels.

### 3. The Zero-Auth Fallback Pool — DONE (engine-side)
- Routing/fallback across the free providers is handled inside the Omniroute engine's own
  routing table (OpenRouter free, OpenCode Zen/Free, Gemini, Felo, Groq, Anthropic
  proxies). IDEOCODE talks to the local gateway through one OpenAI-compatible endpoint and
  inherits the cascade.

## Action Plan Status
### Phase 1: Core Integration — DONE
- [x] Task 1.1: vendored engine install under app-data (`~/.IDEOCODE/baanzon-verso`).
- [x] Task 1.2: silent background runner (`BaanzonDaemon::start` -> `spawn_supervisor`).
- [x] Task 1.3: `crates/ideocode-provider-baanzon` client + config + status.

### Phase 2: Configuration & Self-Healing — DONE
- [x] Task 2.1: engine provisioned headlessly with zero-auth dashboard login disabled.
- [x] Task 2.2: supervisor enforces 600s recovery budget and restarts on unavailability.

### Phase 3: UI & White-labeling — DONE
- [x] Task 3.1: "Baanzon Verso" shown in the GUI provider panel with live engine status.
- [x] Task 3.2: engine errors/logs are surfaced under the Baanzon Verso label; upstream
      name scrubbed via brand patch.
