// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Baanzon Verso local AI engine (backend).
//!
//! Baanzon Verso is IDEOCODE's built-in AI assistant. It is powered by the
//! OmniRoute gateway engine running entirely in the background at
//! `http://localhost:20128/v1`, but users never see "OmniRoute": the engine is
//! auto-installed (vendored under IDEOCODE's own app-data directory), auto-set
//! up, auto-logged-in (no login wall), and self-healed (auto-restart within a
//! 600 second budget). User-configured providers always take precedence and
//! this module never takes over when any provider is already configured.

use anyhow::Result;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::{Duration, Instant};

/// The engine listens on port 20128 of the local machine.
pub const OMNIROUTE_PORT: u16 = 20128;
/// Where the engine's OpenAI-compatible API is exposed.
pub const OMNIROUTE_BASE_URL: &str = "http://localhost:20128/v1";
/// Backend install docs (never surfaced to the user).
pub const OMNIROUTE_INSTALL_URL: &str = "https://github.com/diegosouzapw/OmniRoute";
/// Additional localhost ports probed for an already-running OmniRoute engine.
/// The default port is [`OMNIROUTE_PORT`]; these cover common non-default
/// setups where a user launched OmniRoute on another port.
const EXTRA_PROBE_PORTS: &[u16] = &[20129, 3000, 3001, 8080, 8000];
/// Port remembered once an already-running local engine is discovered, so
/// later health probes target a single port instead of rescanning.
static REMEMBERED_PORT: AtomicU16 = AtomicU16::new(0);

/// The vendored engine is installed under `<app-config>/baanzon-verso`.
const GATEWAY_DIR_NAME: &str = "baanzon-verso";
/// First-run setup sentinel: dashboard login stays disabled (auto-logged-in).
const SETUP_COMPLETE_SENTINEL: &str = "baanzon-setup-complete";
/// Maximum self-heal budget: the engine must recover within 600 seconds.
pub const SUPERVISOR_RECOVERY_BUDGET: Duration = Duration::from_secs(600);
/// On Windows a first-run engine start can be noticeably slower (cold npm
/// installs, antivirus scanning, slower process spawn), so give a cold ensure
/// more headroom before handing control to the background supervisor.
#[cfg(windows)]
const COLD_START_BUDGET_WINDOWS: Duration = Duration::from_secs(120);

/// Cold-start wait budget on non-Windows platforms, matching the gateway
/// daemon's default 30s before handing control to the supervisor.
#[cfg(not(windows))]
const COLD_START_BUDGET: Duration = Duration::from_secs(30);

/// Returns true when the engine's TCP port accepts connections.
pub async fn gateway_reachable() -> bool {
    // Resolve the effective port off the async runtime (port discovery uses
    // blocking TCP probes), then run only the fast connect check in async.
    let port = tokio::task::spawn_blocking(effective_port)
        .await
        .unwrap_or(OMNIROUTE_PORT);
    tokio::time::timeout(
        Duration::from_millis(300),
        tokio::net::TcpStream::connect(("localhost", port)),
    )
    .await
    .map(|result| result.is_ok())
    .unwrap_or(false)
}

/// An `OMNIROUTE_PORT` env override, when set and parseable.
fn env_override_port() -> Option<u16> {
    std::env::var("OMNIROUTE_PORT").ok()?.parse().ok()
}

/// The localhost ports probed for an already-running engine: the env override
/// first (if any), then the default port and the common non-default ports.
pub fn candidate_probe_ports() -> Vec<u16> {
    let mut ports = Vec::with_capacity(EXTRA_PROBE_PORTS.len() + 2);
    if let Some(port) = env_override_port() {
        ports.push(port);
    }
    ports.push(OMNIROUTE_PORT);
    ports.extend_from_slice(EXTRA_PROBE_PORTS);
    ports.sort_unstable();
    ports.dedup();
    ports
}

/// Returns the base URL an engine running on `port` is served from.
pub fn base_url_for_port(port: u16) -> String {
    format!("http://localhost:{port}/v1")
}

/// Blocking HTTP probe against the engine's OpenAI-compatible API on a given
/// port. Verifies it is actually the gateway (and not an unrelated process
/// squatting on the port).
pub fn probe_port(port: u16) -> bool {
    let Ok(mut stream) = std::net::TcpStream::connect(("127.0.0.1", port)) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
    let _ = write!(
        stream,
        "GET /v1/models HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    );
    let mut buf = [0u8; 256];
    let n = stream.read(&mut buf).unwrap_or(0);
    is_engine_reply(&String::from_utf8_lossy(&buf[..n]))
}

/// Discovers an already-running OmniRoute engine on localhost by probing the
/// candidate ports. When one answers, its port is remembered so subsequent
/// probes target it directly (seamless adoption, no duplicate engine spawned).
pub fn discover_engine() -> Option<u16> {
    for port in candidate_probe_ports() {
        if probe_port(port) {
            REMEMBERED_PORT.store(port, Ordering::Relaxed);
            if port != OMNIROUTE_PORT {
                crate::logging::info(&format!(
                    "Baanzon Verso connected to an existing OmniRoute engine on localhost:{port} ({})",
                    base_url_for_port(port)
                ));
            }
            return Some(port);
        }
    }
    None
}

/// The port the engine should be reached on: an already-running local engine
/// wins (adopted, not duplicated); otherwise the env override or the default.
pub fn effective_port() -> u16 {
    let remembered = REMEMBERED_PORT.load(Ordering::Relaxed);
    if remembered != 0 {
        if probe_port(remembered) {
            return remembered;
        }
        REMEMBERED_PORT.store(0, Ordering::Relaxed);
    }
    if let Some(port) = discover_engine() {
        return port;
    }
    env_override_port().unwrap_or(OMNIROUTE_PORT)
}

/// Blocking HTTP probe against the engine's OpenAI-compatible API on the
/// effective port. Verifies it is actually the gateway (and not an unrelated
/// process squatting on the port).
fn gateway_healthy_sync() -> bool {
    probe_port(effective_port())
}

/// Interprets the reply to the health probe. A running engine can legitimately
/// answer non-2xx while it warms up or before any providers are configured
/// (e.g. HTTP 500 from /v1/models), so any 2xx/4xx/5xx reply means the engine is
/// alive. A 404 or a redirect is the signature of an unrelated HTTP server
/// (like a dev server) squatting on the engine's port.
fn is_engine_reply(reply: &str) -> bool {
    // Only inspect the status line (first line) so 404/3xx text inside a
    // response body never counts as the status.
    let Some(status_line) = reply.lines().next() else {
        return false;
    };
    let mut parts = status_line.split_whitespace();
    if !matches!(parts.next(), Some("HTTP/1.1") | Some("HTTP/1.0")) {
        return false;
    }
    let code = match parts.next().map(|c| c.parse::<u16>()) {
        Some(Ok(code)) => code,
        _ => return false,
    };
    // Accept 2xx, 5xx, and 4xx except 404; reject 3xx and 404 (squatter
    // signatures). A running engine can legitimately answer 4xx/5xx while it
    // warms up or before providers are configured.
    (200..=299).contains(&code)
        || (500..=599).contains(&code)
        || ((400..=499).contains(&code) && code != 404)
}

/// Returns true when the gateway answers a real `/v1/models` request.
pub async fn gateway_healthy() -> bool {
    tokio::task::spawn_blocking(gateway_healthy_sync)
        .await
        .unwrap_or(false)
}

fn app_gateway_dir() -> Result<PathBuf> {
    Ok(crate::storage::app_config_dir()?.join(GATEWAY_DIR_NAME))
}

fn vendored_pkg_dir() -> Result<PathBuf> {
    Ok(app_gateway_dir()?.join("node_modules").join("omniroute"))
}

fn vendored_bin() -> Result<PathBuf> {
    Ok(vendored_pkg_dir()?.join("bin").join("omniroute.mjs"))
}

fn gateway_data_dir() -> Result<PathBuf> {
    Ok(app_gateway_dir()?.join("data"))
}

fn gateway_log_path() -> PathBuf {
    crate::storage::logs_dir()
        .map(|dir| dir.join("baanzon-verso.log"))
        .unwrap_or_else(|_| PathBuf::from("baanzon-verso.log"))
}

fn is_vendored_installed() -> bool {
    vendored_bin().map(|path| path.is_file()).unwrap_or(false)
}

/// Best-effort check for an `omniroute` executable on `PATH` (legacy fallback).
fn omniroute_on_path() -> bool {
    let Some(path) = std::env::var_os("PATH") else {
        return false;
    };
    let names: &[&str] = if cfg!(windows) {
        &[
            "omniroute.cmd",
            "omniroute.exe",
            "omniroute.ps1",
            "omniroute",
        ]
    } else {
        &["omniroute"]
    };
    std::env::split_paths(&path)
        .filter(|dir| !dir.as_os_str().is_empty())
        .any(|dir| names.iter().any(|name| dir.join(name).is_file()))
}

fn find_on_path(names: &[&str]) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path)
        .filter(|dir| !dir.as_os_str().is_empty())
        .find_map(|dir| {
            names
                .iter()
                .find(|name| dir.join(name).is_file())
                .map(|name| dir.join(name))
        })
}

/// Well-known install locations checked when the toolchain is missing from
/// PATH (common on Windows: Node bundled by an installer or nvm-windows, or a
/// PATH that was set before Node was installed).
#[cfg(windows)]
fn known_toolchain_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    if let Some(program_files) = std::env::var_os("ProgramFiles") {
        dirs.push(PathBuf::from(&program_files).join("nodejs"));
    }
    if let Some(appdata) = std::env::var_os("APPDATA") {
        dirs.push(PathBuf::from(&appdata).join("nvm").join("current"));
    }
    dirs
}

#[cfg(not(windows))]
fn known_toolchain_dirs() -> Vec<PathBuf> {
    Vec::new()
}

fn find_in_known_dirs(names: &[&str]) -> Option<PathBuf> {
    known_toolchain_dirs().into_iter().find_map(|dir| {
        names
            .iter()
            .find(|name| dir.join(name).is_file())
            .map(|name| dir.join(name))
    })
}

fn find_node() -> Option<PathBuf> {
    let names: &[&str] = if cfg!(windows) {
        &["node.exe", "node"]
    } else {
        &["node"]
    };
    find_on_path(names).or_else(|| find_in_known_dirs(names))
}

fn find_npm() -> Option<PathBuf> {
    let names: &[&str] = if cfg!(windows) {
        &["npm.cmd", "npm.exe", "npm"]
    } else {
        &["npm"]
    };
    find_on_path(names).or_else(|| find_in_known_dirs(names))
}

/// Spawns the vendored gateway detached from the terminal.
fn spawn_gateway(bin: &Path, data_dir: &Path) -> std::io::Result<std::process::Child> {
    let node = find_node().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "node not found on PATH")
    })?;
    let mut cmd = Command::new(node);
    cmd.arg(bin)
        .arg("--no-open")
        .env("DATA_DIR", data_dir)
        .env("OMNIROUTE_NO_UPDATE_NOTIFIER", "1")
        .env("OMNIROUTE_HIDE_HEALTHCHECK_LOGS", "1")
        .current_dir(bin.parent().unwrap_or_else(|| Path::new(".")))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
        cmd.creation_flags(0x0000_0008 | 0x0000_0200);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    cmd.spawn()
}

/// Spawns a globally installed gateway (legacy fallback path).
#[cfg(windows)]
fn spawn_omniroute_global() -> std::io::Result<std::process::Child> {
    Command::new("cmd")
        .args(["/C", "omniroute"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

/// Spawns a globally installed gateway (legacy fallback path).
#[cfg(not(windows))]
fn spawn_omniroute_global() -> std::io::Result<std::process::Child> {
    Command::new("omniroute")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

/// Silently installs the gateway under IDEOCODE's own app-data directory. This
/// never prompts and never mutates the user's global npm setup.
fn install_vendored_gateway() -> Result<bool> {
    let dir = app_gateway_dir()?;
    std::fs::create_dir_all(&dir)?;

    // npm >= 11.4 blocks dependency install scripts by default, which would
    // leave the engine's native binaries (esbuild, @swc/core, better-sqlite3,
    // onnxruntime-node, ...) unbuilt and the engine serving HTTP 500s. Approve
    // all scripts, then reinstall so the approved natives actually materialize.
    // On older npm the approve command does not exist; the plain install already
    // ran scripts, so the follow-up install is a harmless no-op.
    crate::logging::info(
        "Installing the Baanzon Verso local AI engine (first run; this can take several minutes)...",
    );
    if !npm_install(&dir, Some("omniroute"))? {
        return Ok(false);
    }
    approve_install_scripts(&dir);
    if !npm_install(&dir, None)? {
        return Ok(false);
    }

    crate::logging::info("Baanzon Verso install complete");
    let _ = apply_brand_patch();
    Ok(true)
}

/// Runs `npm install` inside the vendored gateway dir (uses `--prefix`, so the
/// current working directory of the daemon is irrelevant).
fn npm_install(dir: &Path, package: Option<&str>) -> Result<bool> {
    let Some(npm) = find_npm() else {
        crate::logging::warn("Baanzon Verso install skipped: npm was not found on PATH");
        return Ok(false);
    };
    if find_node().is_none() {
        crate::logging::warn("Baanzon Verso install skipped: node was not found on PATH");
        return Ok(false);
    }
    let mut args = vec![
        "install",
        "--prefix",
        dir.to_str().unwrap_or("."),
        "--no-audit",
        "--no-fund",
    ];
    if let Some(pkg) = package {
        args.push(pkg);
    }
    let result = Command::new(npm)
        .args(&args)
        .env("npm_config_update_notifier", "false")
        .env("NO_UPDATE_NOTIFIER", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .and_then(|child| child.wait_with_output());

    match result {
        Ok(output) if output.status.success() => Ok(true),
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            crate::logging::error(&format!("Baanzon Verso install failed: {}", stderr.trim()));
            let _ = std::fs::write(gateway_log_path(), format!("npm install failed:\n{stderr}"));
            Ok(false)
        }
        Err(err) => {
            crate::logging::error(&format!(
                "Could not run npm to install Baanzon Verso: {err}"
            ));
            Ok(false)
        }
    }
}

/// Best-effort approval of dependency install scripts (npm >= 11.4). Writes an
/// allowlist into the vendored package.json so the follow-up `npm install`
/// builds the engine's native binaries. Must run with the gateway dir as the
/// current working directory, because the command operates on the local project.
fn approve_install_scripts(dir: &Path) {
    let Some(npm) = find_npm() else {
        return;
    };
    let status = Command::new(npm)
        .args(["install-scripts", "approve", "--all"])
        .current_dir(dir)
        .env("npm_config_update_notifier", "false")
        .env("NO_UPDATE_NOTIFIER", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    if !matches!(status, Ok(status) if status.success()) {
        crate::logging::warn(
            "Could not approve Baanzon Verso install scripts; native binaries may be missing on npm >= 11.4",
        );
    }
}

/// Applies "Baanzon Verso" branding to the installed dashboard's static assets,
/// so the gateway's localhost page is completely re-branded. Only brand tokens
/// are replaced; functional identifiers and env-var names are left untouched.
fn apply_brand_patch() -> Result<()> {
    let pkg = vendored_pkg_dir()?;
    let replacements: [(&str, &str); 2] = [
        ("OmniRoute", "Baanzon Verso"),
        ("omniroute.online", "baanzonverso.local"),
    ];
    let mut patched = 0usize;
    for dir in ["dist", ".build", "public"] {
        let target = pkg.join(dir);
        if target.is_dir() {
            patch_dir(&target, &replacements, &mut patched);
        }
    }
    crate::logging::info(&format!(
        "Baanzon Verso branding applied ({patched} files patched)"
    ));
    Ok(())
}

fn patch_dir(dir: &Path, replacements: &[(&str, &str)], patched: &mut usize) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            patch_dir(&path, replacements, patched);
            continue;
        }
        let Some(ext) = path.extension().map(|e| e.to_string_lossy().to_lowercase()) else {
            continue;
        };
        if !matches!(
            ext.as_str(),
            "js" | "mjs" | "cjs" | "html" | "htm" | "json" | "css" | "txt" | "svg" | "map" | "xml"
        ) {
            continue;
        }
        let Ok(content) = std::fs::read(&path) else {
            continue;
        };
        if content.contains(&0) {
            continue; // binary asset, skip
        }
        let Ok(text) = String::from_utf8(content) else {
            continue;
        };
        if !text.contains("OmniRoute") && !text.contains("omniroute.online") {
            continue;
        }
        let mut out = text.clone();
        for (from, to) in replacements {
            out = out.replace(from, to);
        }
        if out != text {
            let _ = std::fs::write(&path, out);
            *patched += 1;
        }
    }
}

/// Runs the gateway's first-run setup headlessly. Without a password the
/// dashboard keeps login disabled, so it opens already "logged in" with no user
/// interaction. Runs once per install (guarded by a sentinel file).
fn provision_gateway() -> Result<bool> {
    let dir = app_gateway_dir()?;
    let sentinel = dir.join(SETUP_COMPLETE_SENTINEL);
    if sentinel.exists() {
        return Ok(true);
    }
    let Some(node) = find_node() else {
        return Ok(false);
    };
    let bin = vendored_bin()?;
    if !bin.is_file() {
        return Ok(false);
    }
    let data_dir = gateway_data_dir()?;
    std::fs::create_dir_all(&data_dir)?;

    crate::logging::info("Configuring Baanzon Verso (first-run setup)...");
    let result = Command::new(node)
        .arg(&bin)
        .args(["setup", "--non-interactive"])
        .env("DATA_DIR", &data_dir)
        .env("INITIAL_PASSWORD", "") // empty keeps dashboard login disabled (auto-logged-in)
        .env("OMNIROUTE_NO_UPDATE_NOTIFIER", "1")
        .current_dir(bin.parent().unwrap_or_else(|| Path::new(".")))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    let ok = matches!(result, Ok(status) if status.success());
    if ok {
        let _ = std::fs::write(&sentinel, "1");
        crate::logging::info("Baanzon Verso setup complete (auto-logged-in)");
    } else {
        crate::logging::warn(
            "Baanzon Verso first-run setup did not complete cleanly; the dashboard may require login.",
        );
    }
    Ok(ok)
}

/// Ensures the gateway is reachable. Returns true when the caller should
/// connect to it. Never errors on a missing or failing gateway; it only reports
/// hard failures that deserve propagation.
pub async fn ensure_gateway() -> Result<bool> {
    ensure_gateway_with_budget(default_cold_start_budget()).await
}

/// The cold-start wait budget for the platform: Windows gets more headroom
/// than the default 30s (see [`COLD_START_BUDGET_WINDOWS`]).
fn default_cold_start_budget() -> Duration {
    #[cfg(windows)]
    {
        COLD_START_BUDGET_WINDOWS
    }
    #[cfg(not(windows))]
    {
        COLD_START_BUDGET
    }
}

/// Like [`ensure_gateway`] but bounds how long the initial wait may take. Longer
/// recovery is handed off to the supervisor.
///
/// Set `IDEOCODE_DISABLE_BAANZON_GATEWAY` to opt out of the built-in gateway
/// entirely (offline/enterprise/CI environments that must not auto-install or
/// auto-start it, and deterministic tests).
pub async fn ensure_gateway_with_budget(budget: Duration) -> Result<bool> {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return Ok(false);
    }
    if gateway_healthy().await {
        return Ok(true);
    }
    if app_gateway_dir().is_err() {
        crate::logging::warn("Baanzon Verso gateway directory is unavailable");
        return Ok(false);
    }

    if !is_vendored_installed() && !install_vendored_gateway()? {
        return ensure_global_gateway().await;
    }
    let _ = provision_gateway()?;

    let deadline = Instant::now() + budget;
    // Spawn at most once per call: a gateway that started but has not answered
    // yet is left to warm up instead of being replaced every few seconds (which
    // could pile up processes and thrash the port). A spawn that errors is
    // retried cheaply each pass.
    let mut spawned_once = false;
    loop {
        if !spawned_once {
            match spawn_gateway(&vendored_bin()?, &gateway_data_dir()?) {
                Ok(_) => spawned_once = true,
                Err(err) => {
                    crate::logging::warn(&format!(
                        "Could not start the Baanzon Verso engine: {err}"
                    ));
                }
            }
        }
        let wait_until = std::cmp::min(Instant::now() + Duration::from_secs(3), deadline);
        while Instant::now() < wait_until {
            tokio::time::sleep(Duration::from_millis(250)).await;
            if gateway_healthy().await {
                return Ok(true);
            }
        }
        if Instant::now() >= deadline {
            crate::logging::warn(&format!(
                "The Baanzon Verso engine did not become reachable on {} within {}s; recovery continues in the background",
                base_url_for_port(effective_port()),
                budget.as_secs()
            ));
            return Ok(false);
        }
    }
}

/// Legacy fallback: use a globally installed `omniroute` when the vendored
/// install is unavailable.
async fn ensure_global_gateway() -> Result<bool> {
    if !omniroute_on_path() {
        crate::logging::warn(
            "The Baanzon Verso engine could not be installed (npm unavailable); enable networking and restart IDEOCODE to auto-install it.",
        );
        return Ok(false);
    }
    match spawn_omniroute_global() {
        Ok(_) => {
            let deadline = Instant::now() + Duration::from_secs(15);
            while Instant::now() < deadline {
                tokio::time::sleep(Duration::from_millis(250)).await;
                if gateway_healthy().await {
                    return Ok(true);
                }
            }
            crate::logging::warn(&format!(
                "Started the Baanzon Verso engine, but it did not become reachable on {} within 15s.",
                base_url_for_port(effective_port())
            ));
            Ok(false)
        }
        Err(err) => {
            crate::logging::warn(&format!("Could not start the Baanzon Verso engine: {err}"));
            Ok(false)
        }
    }
}

/// Spawns a background self-heal loop. Whenever the gateway is unreachable it
/// is restarted automatically; a full recovery must complete within
/// [`SUPERVISOR_RECOVERY_BUDGET`] (600s) or the loop keeps retrying and logs.
pub fn spawn_supervisor() -> tokio::task::JoinHandle<()> {
    tokio::spawn(async {
        let mut recovery_started: Option<Instant> = None;
        loop {
            tokio::time::sleep(Duration::from_secs(10)).await;
            if gateway_healthy().await {
                if recovery_started.take().is_some() {
                    crate::logging::info("Baanzon Verso engine recovered and is running again");
                }
                continue;
            }
            if recovery_started.is_none() {
                recovery_started = Some(Instant::now());
                crate::logging::warn(
                    "Baanzon Verso engine unreachable; attempting automatic recovery",
                );
            }
            if recovery_started
                .map(|started| started.elapsed() >= SUPERVISOR_RECOVERY_BUDGET)
                .unwrap_or(false)
            {
                crate::logging::warn(&format!(
                    "Baanzon Verso engine still unreachable after {}s; retrying",
                    SUPERVISOR_RECOVERY_BUDGET.as_secs()
                ));
                recovery_started = None; // reset the budget window and keep trying
            }
            let _ = ensure_gateway_with_budget(Duration::from_secs(20)).await;
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_url_and_port_agree() {
        assert!(OMNIROUTE_BASE_URL.contains("localhost:20128/v1"));
        assert_eq!(OMNIROUTE_PORT, 20128);
    }

    #[test]
    fn candidate_ports_always_include_default_and_are_deduped() {
        let ports = candidate_probe_ports();
        assert!(ports.contains(&OMNIROUTE_PORT));
        assert!(ports.windows(2).all(|w| w[0] < w[1]), "candidate ports must be sorted + deduped");
    }

    #[test]
    fn base_url_for_port_format() {
        assert_eq!(base_url_for_port(3000), "http://localhost:3000/v1");
        assert_eq!(base_url_for_port(OMNIROUTE_PORT), OMNIROUTE_BASE_URL);
    }

    #[test]
    fn setup_sentinel_round_trips_in_temp_dir() {
        let dir =
            std::env::temp_dir().join(format!("baanzon-sentinel-test-{}", std::process::id()));
        let path = dir.join(SETUP_COMPLETE_SENTINEL);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        assert!(!path.exists());
        std::fs::write(&path, "1").unwrap();
        assert!(path.exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn recovery_budget_is_600_seconds() {
        assert_eq!(SUPERVISOR_RECOVERY_BUDGET, Duration::from_secs(600));
    }

    #[test]
    fn health_reply_treats_engine_errors_as_alive() {
        assert!(is_engine_reply("HTTP/1.1 200 OK\r\n"));
        assert!(is_engine_reply("HTTP/1.1 500 Internal Server Error\r\n"));
        assert!(is_engine_reply("HTTP/1.1 503 Service Unavailable\r\n"));
        assert!(is_engine_reply("HTTP/1.0 500 Internal Server Error\r\n"));
    }

    #[test]
    fn health_reply_rejects_squatters_and_garbage() {
        assert!(!is_engine_reply("HTTP/1.1 404 Not Found\r\n"));
        assert!(!is_engine_reply("HTTP/1.1 301 Moved Permanently\r\n"));
        assert!(!is_engine_reply("hello, this is a dev server\r\n"));
        assert!(!is_engine_reply(""));
    }
}
