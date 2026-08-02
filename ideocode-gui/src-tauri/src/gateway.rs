// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Baanzon Verso local AI engine (backend) for the IDEOCODE GUI.
//!
//! Mirrors the vendored install, first-run setup, auto-login and self-heal
//! supervision that the CLI provides, so the GUI is fully self-sufficient: the
//! engine is auto-installed under `~/.IDEOCODE/baanzon-verso`, auto-set-up
//! (dashboard login disabled = auto-logged-in), and restarted within a 600
//! second budget whenever it becomes unreachable.

use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

/// The engine listens on port 20128 of the local machine.
pub const OMNIROUTE_PORT: u16 = 20128;
/// Where the engine's OpenAI-compatible API is exposed.
pub const OMNIROUTE_BASE_URL: &str = "http://localhost:20128/v1";

/// The vendored engine is installed under `<app-data>/baanzon-verso`.
const GATEWAY_DIR_NAME: &str = "baanzon-verso";
/// First-run setup sentinel: dashboard login stays disabled (auto-logged-in).
const SETUP_COMPLETE_SENTINEL: &str = "baanzon-setup-complete";
/// Maximum self-heal budget: the engine must recover within 600 seconds.
const SUPERVISOR_RECOVERY_BUDGET: Duration = Duration::from_secs(600);
/// How long a cold ensure blocks before handing control to the supervisor.
const COLD_START_BUDGET: Duration = Duration::from_secs(30);

fn app_data_dir() -> PathBuf {
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
    let path = gateway_log_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    use std::io::Write as _;
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        let _ = writeln!(file, "[{}] {message}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
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

fn find_node() -> Option<PathBuf> {
    let names: &[&str] = if cfg!(windows) {
        &["node.exe", "node"]
    } else {
        &["node"]
    };
    find_on_path(names)
}

fn find_npm() -> Option<PathBuf> {
    let names: &[&str] = if cfg!(windows) {
        &["npm.cmd", "npm.exe", "npm"]
    } else {
        &["npm"]
    };
    find_on_path(names)
}

/// Blocking HTTP probe against the engine's OpenAI-compatible API. Verifies it
/// is actually the gateway (and not an unrelated process squatting on the port).
fn gateway_healthy() -> bool {
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

/// Spawns the vendored gateway detached from the terminal.
fn spawn_gateway(bin: &Path, data_dir: &Path) -> std::io::Result<std::process::Child> {
    let node = find_node()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "node not found on PATH"))?;
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
fn install_vendored_gateway() -> bool {
    let Some(npm) = find_npm() else {
        log("Baanzon Verso install skipped: npm was not found on PATH");
        return false;
    };
    if find_node().is_none() {
        log("Baanzon Verso install skipped: node was not found on PATH");
        return false;
    }
    let dir = gateway_dir();
    if let Err(err) = std::fs::create_dir_all(&dir) {
        log(&format!("Baanzon Verso install failed to create dir: {err}"));
        return false;
    }

    log("Installing the Baanzon Verso local AI engine (first run; this can take a few minutes)...");
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
            log("Baanzon Verso install complete");
            let _ = apply_brand_patch();
            true
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log(&format!("Baanzon Verso install failed: {}", stderr.trim()));
            false
        }
        Err(err) => {
            log(&format!("Could not run npm to install Baanzon Verso: {err}"));
            false
        }
    }
}

/// Applies "Baanzon Verso" branding to the installed dashboard's static assets.
/// Only brand tokens are replaced; functional identifiers are left untouched.
fn apply_brand_patch() -> std::io::Result<()> {
    let pkg = vendored_pkg_dir();
    let replacements: [(&str, &str); 2] =
        [("OmniRoute", "Baanzon Verso"), ("omniroute.online", "baanzonverso.local")];
    let mut patched = 0usize;
    for dir in ["dist", ".build", "public"] {
        let target = pkg.join(dir);
        if target.is_dir() {
            patch_dir(&target, &replacements, &mut patched);
        }
    }
    log(&format!("Baanzon Verso branding applied ({patched} files patched)"));
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
        let Some(ext) = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
        else {
            continue;
        };
        if !matches!(
            ext.as_str(),
            "js" | "mjs" | "cjs" | "html" | "htm" | "json" | "css" | "txt" | "svg" | "map"
                | "xml"
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
        log(&format!("Baanzon Verso setup failed to create data dir: {err}"));
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
        log("Baanzon Verso first-run setup did not complete cleanly; the dashboard may require login.");
    }
    ok
}

fn ensure_global_gateway() -> bool {
    let deadline = Instant::now() + Duration::from_secs(15);
    let Ok(_) = spawn_omniroute_global() else {
        log("Could not start the Baanzon Verso engine from PATH");
        return false;
    };
    while Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(250));
        if gateway_healthy() {
            return true;
        }
    }
    log("Started the Baanzon Verso engine, but it did not become reachable within 15s.");
    false
}

/// Ensures the gateway is reachable, installing/setting up/spawning as needed.
fn ensure_with_budget(budget: Duration) -> bool {
    if gateway_healthy() {
        return true;
    }
    if !is_vendored_installed() {
        if !install_vendored_gateway() {
            return ensure_global_gateway();
        }
    }
    let _ = provision_gateway();

    let deadline = Instant::now() + budget;
    loop {
        if let Err(err) = spawn_gateway(&vendored_bin(), &gateway_data_dir()) {
            log(&format!("Could not start the Baanzon Verso engine: {err}"));
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

/// Spawns a background self-heal loop. On first launch it cold-starts the
/// engine immediately (install/setup may take minutes), then it polls every 10
/// seconds and restarts the engine whenever it is unreachable; a full recovery
/// must complete within [`SUPERVISOR_RECOVERY_BUDGET`] (600s) or the loop keeps
/// retrying and logs.
pub fn spawn_supervisor() {
    std::thread::Builder::new()
        .name("IDEOCODE-gui-baanzon-verso".to_string())
        .spawn(|| {
            let _ = ensure_with_budget(COLD_START_BUDGET);
            let mut recovery_started: Option<Instant> = None;
            loop {
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
