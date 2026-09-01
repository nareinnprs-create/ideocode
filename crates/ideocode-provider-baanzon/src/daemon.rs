//! Baanzon Verso local AI engine (backend) lifecycle.
//!
//! The engine is the `omniroute` npm package, auto-installed (vendored) under
//! `~/.IDEOCODE/baanzon-verso`, auto-set-up (dashboard login disabled =
//! auto-logged-in), and restarted within a 600 second budget whenever it
//! becomes unreachable. It is exposed at `http://localhost:20128/v1`.

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU16, Ordering};
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

use crate::config::BaanzonConfig;

/// Callback invoked whenever the engine's gateway status changes.
pub type StatusCallback = dyn Fn(crate::GatewayStatus) + Send + Sync + 'static;
/// Callback invoked for each engine log line.
pub type LogCallback = dyn Fn(String) + Send + Sync + 'static;

lazy_static::lazy_static! {
    pub static ref STATUS_CALLBACK: Mutex<Option<Box<StatusCallback>>> = Mutex::new(None);
    pub static ref LOG_CALLBACK: Mutex<Option<Box<LogCallback>>> = Mutex::new(None);
}

pub fn set_status_callback(cb: impl Fn(crate::GatewayStatus) + Send + Sync + 'static) {
    if let Ok(mut lock) = STATUS_CALLBACK.lock() {
        *lock = Some(Box::new(cb));
    }
}

pub fn set_log_callback(cb: impl Fn(String) + Send + Sync + 'static) {
    if let Ok(mut lock) = LOG_CALLBACK.lock() {
        *lock = Some(Box::new(cb));
    }
}

/// The engine listens on port 20128 of the local machine.
pub const OMNIROUTE_PORT: u16 = 20128;
/// Where the engine's OpenAI-compatible API is exposed.
pub const OMNIROUTE_BASE_URL: &str = "http://localhost:20128/v1";
/// Additional localhost ports probed for an already-running OmniRoute engine.
/// The default port is [`OMNIROUTE_PORT`]; these cover common non-default
/// setups where a user launched OmniRoute on another port (dev servers,
/// alternate installs, containers published on 3000/8080, ...).
const EXTRA_PROBE_PORTS: &[u16] = &[20129, 3000, 3001, 8080, 8000];
/// Port remembered once an already-running local engine is discovered, so
/// later health probes target a single port instead of rescanning.
static REMEMBERED_PORT: AtomicU16 = AtomicU16::new(0);

/// The vendored engine is installed under `<app-data>/baanzon-verso`.
const GATEWAY_DIR_NAME: &str = "baanzon-verso";
/// First-run setup sentinel: dashboard login stays disabled (auto-logged-in).
const SETUP_COMPLETE_SENTINEL: &str = "baanzon-setup-complete";
/// Maximum self-heal budget: the engine must recover within 600 seconds.
const SUPERVISOR_RECOVERY_BUDGET: Duration = Duration::from_secs(600);
/// How long a cold ensure blocks before handing control to the supervisor.
const COLD_START_BUDGET: Duration = Duration::from_secs(30);

/// The app-data root shared with the rest of IDEOCODE (`~/.IDEOCODE`).
pub fn app_data_dir() -> PathBuf {
    match dirs::home_dir() {
        Some(home) => home.join(".IDEOCODE"),
        None => std::env::current_dir().unwrap_or_default(),
    }
}

fn gateway_dir() -> PathBuf {
    app_data_dir().join(GATEWAY_DIR_NAME)
}

fn vendored_pkg_dir() -> PathBuf {
    gateway_dir().join("node_modules").join("omniroute")
}

fn vendored_bin() -> PathBuf {
    vendored_pkg_dir().join("bin").join("omniroute.mjs")
}

fn gateway_data_dir() -> PathBuf {
    gateway_dir().join("data")
}

fn gateway_log_path() -> PathBuf {
    app_data_dir().join("logs").join("baanzon-verso.log")
}

fn log(message: &str) {
    if let Some(cb) = LOG_CALLBACK.lock().ok().as_ref().and_then(|g| g.as_ref()) {
        cb(message.to_string());
    }

    let path = gateway_log_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        let _ = writeln!(
            file,
            "[{}] {message}",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        );
    }
}

fn is_vendored_installed() -> bool {
    vendored_bin().is_file()
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

fn find_in_known_dirs(names: &[&str]) -> Option<PathBuf> {
    known_toolchain_dirs().into_iter().find_map(|dir| {
        names
            .iter()
            .find(|name| dir.join(name).is_file())
            .map(|name| dir.join(name))
    })
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

/// Discovers an already-running OmniRoute engine on localhost by probing the
/// candidate ports. When one answers, its port is remembered so subsequent
/// probes target it directly (seamless adoption, no duplicate engine spawned).
pub fn discover_engine() -> Option<u16> {
    for port in candidate_probe_ports() {
        if probe_port(port) {
            REMEMBERED_PORT.store(port, Ordering::Relaxed);
            if port != OMNIROUTE_PORT {
                log(&format!(
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
pub fn gateway_healthy() -> bool {
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

/// Silently installs the gateway under IDEOCODE's own app-data directory. This
/// never prompts and never mutates the user's global npm setup.
fn install_vendored_gateway() -> bool {
    let dir = gateway_dir();
    if let Err(err) = std::fs::create_dir_all(&dir) {
        log(&format!(
            "Baanzon Verso install failed to create dir: {err}"
        ));
        return false;
    }

    // npm >= 11.4 blocks dependency install scripts by default, which would
    // leave the engine's native binaries (esbuild, @swc/core, better-sqlite3,
    // onnxruntime-node, ...) unbuilt and the engine serving HTTP 500s. Approve
    // all scripts, then reinstall so the approved natives actually materialize.
    // On older npm the approve command does not exist; the plain install already
    // ran scripts, so the follow-up install is a harmless no-op.
    log(
        "Installing the Baanzon Verso local AI engine (first run; this can take several minutes)...",
    );
    if !npm_install(&dir, Some("omniroute")) {
        return false;
    }
    approve_install_scripts(&dir);
    if !npm_install(&dir, None) {
        return false;
    }

    log("Baanzon Verso install complete");
    let _ = apply_brand_patch();
    true
}

/// Runs `npm install` inside the vendored gateway dir (uses `--prefix`, so the
/// current working directory of the daemon is irrelevant).
fn npm_install(dir: &Path, package: Option<&str>) -> bool {
    let Some(npm) = find_npm() else {
        log("Baanzon Verso install skipped: npm was not found on PATH");
        return false;
    };
    if find_node().is_none() {
        log("Baanzon Verso install skipped: node was not found on PATH");
        return false;
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
        Ok(output) if output.status.success() => true,
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log(&format!("Baanzon Verso install failed: {}", stderr.trim()));
            false
        }
        Err(err) => {
            log(&format!(
                "Could not run npm to install Baanzon Verso: {err}"
            ));
            false
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
        log(
            "Could not approve Baanzon Verso install scripts; native binaries may be missing on npm >= 11.4",
        );
    }
}

/// Applies "Baanzon Verso" branding to the installed dashboard's static assets.
/// Only brand tokens are replaced; functional identifiers are left untouched.
fn apply_brand_patch() -> std::io::Result<()> {
    let pkg = vendored_pkg_dir();
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
    log(&format!(
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
/// dashboard keeps login disabled, so it opens already "logged in". Runs once
/// per install (guarded by a sentinel file).
fn provision_gateway() -> bool {
    let dir = gateway_dir();
    let sentinel = dir.join(SETUP_COMPLETE_SENTINEL);
    if sentinel.exists() {
        return true;
    }
    let Some(node) = find_node() else {
        return false;
    };
    let bin = vendored_bin();
    if !bin.is_file() {
        return false;
    }
    let data_dir = gateway_data_dir();
    if let Err(err) = std::fs::create_dir_all(&data_dir) {
        log(&format!(
            "Baanzon Verso setup failed to create data dir: {err}"
        ));
        return false;
    }

    log("Configuring Baanzon Verso (first-run setup)...");
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
        log("Baanzon Verso setup complete (auto-logged-in)");
    } else {
        log(
            "Baanzon Verso first-run setup did not complete cleanly; the dashboard may require login.",
        );
    }
    ok
}

/// Ensures the gateway is reachable, installing/setting up/spawning as needed.
fn ensure_with_budget(budget: Duration) -> bool {
    if gateway_healthy() {
        return true;
    }
    if !is_vendored_installed() && !install_vendored_gateway() {
        return false;
    }
    let _ = provision_gateway();

    let deadline = Instant::now() + budget;
    // Spawn at most once per call: a gateway that started but has not answered
    // yet is left to warm up instead of being replaced every few seconds (which
    // could pile up processes and thrash the port). A spawn that errors is
    // retried cheaply each pass.
    let mut spawned_once = false;
    loop {
        if !spawned_once {
            match spawn_gateway(&vendored_bin(), &gateway_data_dir()) {
                Ok(_) => spawned_once = true,
                Err(err) => {
                    log(&format!("Could not start the Baanzon Verso engine: {err}"));
                }
            }
        }
        let wait_until = std::cmp::min(Instant::now() + Duration::from_secs(3), deadline);
        while Instant::now() < wait_until {
            std::thread::sleep(Duration::from_millis(250));
            if gateway_healthy() {
                return true;
            }
        }
        if Instant::now() >= deadline {
            log(&format!(
                "The Baanzon Verso engine did not become reachable on {OMNIROUTE_BASE_URL} within {}s; recovery continues in the background",
                budget.as_secs()
            ));
            return false;
        }
    }
}

/// Ensures the engine is reachable on first use, blocking for up to the
/// cold-start budget while it installs/provisions/spawns on first run.
pub fn ensure_gateway() -> bool {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return false;
    }
    ensure_with_budget(COLD_START_BUDGET)
}

/// Blocks until the engine's health probe succeeds or `timeout` elapses.
/// Returns immediately when the engine is already reachable, so it is safe and
/// cheap to call on every request path once the engine is up.
pub fn wait_until_ready(timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    loop {
        if gateway_healthy() {
            return true;
        }
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return false;
        }
        std::thread::sleep(Duration::from_millis(250).min(remaining));
    }
}

/// The shared first-use bootstrap used by every surface (TUI and GUI): writes
/// the engine's `.env`, ensures the engine is installed and reachable (blocking
/// up to the cold-start budget while it installs/provisions/spawns on first
/// run), then hands ongoing recovery to the background supervisor. Idempotent:
/// when the engine is already healthy it returns immediately. Respects
/// `IDEOCODE_DISABLE_BAANZON_GATEWAY`.
pub fn bootstrap_engine() -> GatewayStatus {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return gateway_status_blocking();
    }
    if let Err(err) = BaanzonConfig::new(app_data_dir()).generate_env() {
        log(&format!("Baanzon Verso config failed: {err}"));
    }
    ensure_gateway();
    spawn_supervisor();
    gateway_status_blocking()
}

/// Spawns a background self-heal loop. On first launch it cold-starts the
/// engine immediately (install/setup may take minutes), then it polls every 10
/// seconds and restarts the engine whenever it is unreachable; a full recovery
/// must complete within [`SUPERVISOR_RECOVERY_BUDGET`] (600s) or the loop keeps
/// retrying and logs.
pub fn spawn_supervisor() {
    if std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some() {
        return;
    }
    std::thread::Builder::new()
        .name("IDEOCODE-baanzon-verso".to_string())
        .spawn(|| {
            let _ = ensure_with_budget(COLD_START_BUDGET);
            let mut recovery_started: Option<Instant> = None;
            let mut previous_status = crate::gateway_status_blocking();
            loop {
                let current_status = crate::gateway_status_blocking();
                if current_status != previous_status {
                    if let Some(cb) = STATUS_CALLBACK.lock().ok().as_ref().and_then(|g| g.as_ref()) {
                        cb(current_status.clone());
                    }
                    previous_status = current_status;
                }

                std::thread::sleep(Duration::from_secs(10));
                if gateway_healthy() {
                    if recovery_started.take().is_some() {
                        log("Baanzon Verso engine recovered and is running again");
                    }
                    continue;
                }
                if recovery_started.is_none() {
                    recovery_started = Some(Instant::now());
                    log("Baanzon Verso engine unreachable; attempting automatic recovery");
                }
                if recovery_started
                    .map(|started| started.elapsed() >= SUPERVISOR_RECOVERY_BUDGET)
                    .unwrap_or(false)
                {
                    log(&format!(
                        "Baanzon Verso engine still unreachable after {}s; retrying",
                        SUPERVISOR_RECOVERY_BUDGET.as_secs()
                    ));
                    recovery_started = None; // reset the budget window and keep trying
                }
                let _ = ensure_with_budget(Duration::from_secs(20));
            }
        })
        .ok();
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GatewayStatus {
    pub engine: String,
    pub online: bool,
    pub disabled: bool,
    pub installing: bool,
    pub port: u16,
    pub base_url: String,
}

/// Reports the live state of the built-in Baanzon Verso engine so UI surfaces
/// (provider panel, status bar) can show ONLINE / starting / offline instead of
/// failing silently when the engine is cold-starting on first launch.
pub async fn gateway_status() -> GatewayStatus {
    tokio::task::spawn_blocking(gateway_status_blocking)
        .await
        .unwrap_or_else(|_| gateway_status_blocking())
}

/// Synchronous core of [`gateway_status`], for callers that are already off the
/// async runtime (e.g. [`bootstrap_engine`]).
pub fn gateway_status_blocking() -> GatewayStatus {
    let disabled = std::env::var_os("IDEOCODE_DISABLE_BAANZON_GATEWAY").is_some();
    let port = effective_port();
    let online = probe_port(port);
    GatewayStatus {
        engine: "Baanzon Verso".to_string(),
        online,
        disabled,
        installing: !disabled && !online && !is_vendored_installed(),
        port,
        base_url: base_url_for_port(port),
    }
}

/// Handle to the local engine. Starting it ensures the engine is installed,
/// provisioned and supervised; stopping is a no-op because the supervisor is a
/// detached process that self-heals independently of this handle.
#[derive(Debug, Default)]
pub struct BaanzonDaemon;

impl BaanzonDaemon {
    /// Ensures the engine is running and hands ongoing recovery to the
    /// background supervisor. Returns immediately with `Ok(())`.
    pub fn start() -> std::io::Result<Self> {
        spawn_supervisor();
        Ok(Self)
    }

    /// No-op: the supervisor keeps the engine alive until the process exits.
    pub fn stop() -> std::io::Result<()> {
        Ok(())
    }
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
        assert!(
            ports.windows(2).all(|w| w[0] < w[1]),
            "candidate ports must be sorted + deduped"
        );
    }

    #[test]
    fn base_url_for_port_format() {
        assert_eq!(base_url_for_port(3000), "http://localhost:3000/v1");
        assert_eq!(base_url_for_port(OMNIROUTE_PORT), OMNIROUTE_BASE_URL);
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
