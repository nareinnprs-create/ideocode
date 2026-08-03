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
use std::time::{Duration, Instant};

/// The engine listens on port 20128 of the local machine.
pub const OMNIROUTE_PORT: u16 = 20128;
/// Where the engine's OpenAI-compatible API is exposed.
pub const OMNIROUTE_BASE_URL: &str = "http://localhost:20128/v1";
/// Backend install docs (never surfaced to the user).
pub const OMNIROUTE_INSTALL_URL: &str = "https://github.com/diegosouzapw/OmniRoute";

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

/// Returns true when the engine's TCP port accepts connections.
pub async fn gateway_reachable() -> bool {
    tokio::time::timeout(
        Duration::from_millis(300),
        tokio::net::TcpStream::connect(("localhost", OMNIROUTE_PORT)),
    )
    .await
    .map(|result| result.is_ok())
    .unwrap_or(false)
}

/// Blocking HTTP probe against the engine's OpenAI-compatible API. Verifies it
/// is actually the gateway (and not an unrelated process squatting on the port).
fn gateway_healthy_sync() -> bool {
    let Ok(mut stream) = std::net::TcpStream::connect(("127.0.0.1", OMNIROUTE_PORT)) else {
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
    n > 0 && String::from_utf8_lossy(&buf[..n]).starts_with("HTTP/1.1 2")
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
    let Some(npm) = find_npm() else {
        crate::logging::warn("Baanzon Verso install skipped: npm was not found on PATH");
        return Ok(false);
    };
    if find_node().is_none() {
        crate::logging::warn("Baanzon Verso install skipped: node was not found on PATH");
        return Ok(false);
    }
    let dir = app_gateway_dir()?;
    std::fs::create_dir_all(&dir)?;

    crate::logging::info(
        "Installing the Baanzon Verso local AI engine (first run; this can take a few minutes)...",
    );
    let result = Command::new(npm)
        .args([
            "install",
            "--prefix",
            dir.to_str().unwrap_or("."),
            "--no-audit",
            "--no-fund",
            "omniroute",
        ])
        .env("npm_config_update_notifier", "false")
        .env("NO_UPDATE_NOTIFIER", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .and_then(|child| child.wait_with_output());

    match result {
        Ok(output) if output.status.success() => {
            crate::logging::info("Baanzon Verso install complete");
            let _ = apply_brand_patch();
            Ok(true)
        }
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
    loop {
        match spawn_gateway(&vendored_bin()?, &gateway_data_dir()?) {
            Ok(_) => {}
            Err(err) => {
                crate::logging::warn(&format!("Could not start the Baanzon Verso engine: {err}"));
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
                "The Baanzon Verso engine did not become reachable on {OMNIROUTE_BASE_URL} within {}s; recovery continues in the background",
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
                "Started the Baanzon Verso engine, but it did not become reachable on {OMNIROUTE_BASE_URL} within 15s."
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
}
