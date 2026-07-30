// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::{Context, Result, bail};

use super::ToolOutput;

pub fn list_apps() -> Result<ToolOutput> {
    let output = std::process::Command::new("wmctrl")
        .args(["-l", "-p"])
        .output()
        .or_else(|_| {
            std::process::Command::new("xdotool")
                .args(["search", "--onlyvisible", "--name", ""])
                .args(["--maxdepth", "3"])
                .output()
        })
        .context("Failed to list windows (needs wmctrl or xdotool)")?;
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(ToolOutput::new(if text.trim().is_empty() {
        "No visible windows found".to_string()
    } else {
        text
    }))
}

pub fn list_windows() -> Result<ToolOutput> {
    list_apps()
}

pub fn activate_app(name: &str) -> Result<ToolOutput> {
    let pid_output = std::process::Command::new("pgrep")
        .args(["-x", name])
        .output()
        .context("pgrep failed")?;
    if !pid_output.status.success() {
        bail!("App '{name}' not found running");
    }
    let pid = String::from_utf8_lossy(&pid_output.stdout).trim().to_string();
    let output = run_cmd(&["xdotool", "windowactivate", &format!("$(xdotool search --pid {pid} | tail -1)")]);
    match output {
        Ok(_) => Ok(ToolOutput::new(format!("Activated {name}"))),
        Err(_) => {
            run_cmd(&["wmctrl", "-a", name])?;
            Ok(ToolOutput::new(format!("Activated {name}")))
        }
    }
}

pub fn quit_app(name: &str) -> Result<ToolOutput> {
    let status = std::process::Command::new("pkill")
        .args(["-x", name])
        .status()
        .context("pkill failed")?;
    if status.success() {
        Ok(ToolOutput::new(format!("Quit {name}")))
    } else {
        bail!("Failed to quit '{name}'")
    }
}

pub fn focus_window(name: &str) -> Result<ToolOutput> {
    activate_app(name)
}

pub(super) fn run_cmd(args: &[&str]) -> Result<String> {
    let output = std::process::Command::new(args[0])
        .args(&args[1..])
        .output()?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
