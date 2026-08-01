// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! OmniRoute gateway auto-connect.
//!
//! OmniRoute (https://github.com/diegosouzapw/OmniRoute) is a free, MIT
//! licensed local AI gateway: a single zero-config endpoint at
//! `http://localhost:20128/v1` that routes 290+ providers (90+ free) and 500+
//! models. This module makes it the seamless fallback for a fresh IDEOCODE
//! install: it checks whether the gateway is reachable, starts it if the
//! `omniroute` command is on `PATH`, and otherwise offers a one-time install
//! prompt. User-configured providers always take precedence and this module
//! never fires when any provider is already configured.

use anyhow::Result;
use std::io::Write;

/// OmniRoute listens on port 20128 of the local machine.
pub const OMNIROUTE_PORT: u16 = 20128;
/// Where OmniRoute's OpenAI-compatible API is exposed.
pub const OMNIROUTE_BASE_URL: &str = "http://localhost:20128/v1";
/// Human-facing installation/onboarding documentation.
pub const OMNIROUTE_INSTALL_URL: &str = "https://github.com/diegosouzapw/OmniRoute";

const INSTALL_DECLINED_SENTINEL: &str = "omniroute-install-declined";

/// Returns true when the OmniRoute gateway is reachable on localhost.
pub async fn gateway_reachable() -> bool {
    tokio::time::timeout(
        std::time::Duration::from_millis(300),
        tokio::net::TcpStream::connect(("localhost", OMNIROUTE_PORT)),
    )
    .await
    .map(|result| result.is_ok())
    .unwrap_or(false)
}

/// Best-effort check for an `omniroute` executable on `PATH`.
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

/// Spawns the OmniRoute gateway detached from the terminal.
#[cfg(windows)]
fn spawn_omniroute() -> std::io::Result<std::process::Child> {
    std::process::Command::new("cmd")
        .args(["/C", "omniroute"])
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
}

/// Spawns the OmniRoute gateway detached from the terminal.
#[cfg(not(windows))]
fn spawn_omniroute() -> std::io::Result<std::process::Child> {
    std::process::Command::new("omniroute")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
}

fn install_declined_path() -> Option<std::path::PathBuf> {
    crate::storage::app_config_dir()
        .ok()
        .map(|dir| dir.join(INSTALL_DECLINED_SENTINEL))
}

fn install_was_declined() -> bool {
    install_declined_path()
        .map(|path| path.exists())
        .unwrap_or(false)
}

fn mark_install_declined() {
    if let Some(path) = install_declined_path() {
        let _ = std::fs::write(path, "1");
    }
}

/// Offers a one-time `npm install -g omniroute` prompt. Returns true only when
/// the install succeeded and the command is now resolvable on `PATH`.
fn maybe_prompt_to_install() -> Result<bool> {
    if install_was_declined() || !crate::external_auth::can_prompt_for_external_auth() {
        return Ok(false);
    }

    eprintln!();
    eprintln!(
        "OmniRoute: free local AI gateway (zero-config, 290+ providers, 500+ models)."
    );
    eprintln!("  Install it to auto-connect:  npm install -g omniroute");
    eprintln!("  Docs: {OMNIROUTE_INSTALL_URL}");
    eprint!("Install OmniRoute now so IDEOCODE connects automatically? [Y/n]: ");
    std::io::stdout().flush()?;

    let mut input = String::new();
    std::io::stdin().read_line(&mut input)?;
    let answer = input.trim().to_ascii_lowercase();
    if !matches!(answer.as_str(), "y" | "yes" | "") {
        mark_install_declined();
        return Ok(false);
    }

    eprintln!("Installing OmniRoute globally via npm (may take a moment)...");
    let status = std::process::Command::new("npm")
        .args(["install", "-g", "omniroute"])
        .stdin(std::process::Stdio::null())
        .status();
    match status {
        Ok(status) if status.success() => {
            if omniroute_on_path() {
                Ok(true)
            } else {
                crate::logging::warn(
                    "npm install -g omniroute finished, but 'omniroute' was not found on PATH; restart your shell or add the npm global bin directory to PATH.",
                );
                Ok(false)
            }
        }
        Ok(status) => {
            crate::logging::warn(&format!(
                "OmniRoute install failed (npm exited with {status})."
            ));
            Ok(false)
        }
        Err(err) => {
            crate::logging::warn(&format!("Could not run npm to install OmniRoute: {err}"));
            Ok(false)
        }
    }
}

/// Ensures the OmniRoute gateway is reachable. Returns true when the caller
/// should connect to it. Never errors on a missing or failing gateway; it only
/// reports hard failures that deserve propagation.
pub async fn ensure_gateway() -> Result<bool> {
    if gateway_reachable().await {
        return Ok(true);
    }

    if !omniroute_on_path() {
        return maybe_prompt_to_install();
    }

    match spawn_omniroute() {
        Ok(_) => {
            let deadline =
                std::time::Instant::now() + std::time::Duration::from_secs(4);
            while std::time::Instant::now() < deadline {
                tokio::time::sleep(std::time::Duration::from_millis(150)).await;
                if gateway_reachable().await {
                    return Ok(true);
                }
            }
            crate::logging::warn(&format!(
                "Started OmniRoute, but the gateway did not become reachable on {OMNIROUTE_BASE_URL} within 4s.",
            ));
            Ok(false)
        }
        Err(err) => {
            crate::logging::warn(&format!("Could not start OmniRoute: {err}"));
            Ok(false)
        }
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
    fn install_sentinel_round_trips_in_temp_dir() {
        let dir = std::env::temp_dir().join(format!(
            "omniroute-sentinel-test-{}",
            std::process::id()
        ));
        let path = dir.join(INSTALL_DECLINED_SENTINEL);
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        assert!(!path.exists());
        std::fs::write(&path, "1").unwrap();
        assert!(path.exists());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
