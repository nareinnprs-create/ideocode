// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::{Context, Result};

use super::ToolOutput;

pub fn get_clipboard() -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; \
             [System.Windows.Forms.Clipboard]::GetText()"
        ])
        .output()
        .context("Failed to read clipboard")?;
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ToolOutput::new(if text.is_empty() {
        "Clipboard is empty".to_string()
    } else {
        text
    }))
}

pub fn set_clipboard(text: &str) -> Result<ToolOutput> {
    let status = std::process::Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            &format!(
                "Add-Type -AssemblyName System.Windows.Forms; \
                 [System.Windows.Forms.Clipboard]::SetText('{}')",
                text.replace('\'', "''")
            )
        ])
        .status()
        .context("Failed to set clipboard")?;
    if !status.success() {
        anyhow::bail!("PowerShell clipboard write failed");
    }
    Ok(ToolOutput::new(format!("Set clipboard ({} chars)", text.chars().count())))
}

pub fn run_powershell(script: &str) -> Result<ToolOutput> {
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .context("PowerShell execution failed")?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str("[stderr]\n");
        result.push_str(&stderr);
    }
    if result.is_empty() {
        result = format!("Command completed with exit code {}", output.status.code().unwrap_or(-1));
    }
    Ok(ToolOutput::new(result))
}
