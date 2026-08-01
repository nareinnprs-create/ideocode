// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::{Context, Result};

use super::ToolOutput;

#[derive(Clone, Copy, PartialEq)]
enum ClipboardBackend {
    Xclip,
    WlClipboard,
    None,
}

fn clipboard_backend() -> ClipboardBackend {
    if std::process::Command::new("xclip")
        .arg("-version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok()
    {
        ClipboardBackend::Xclip
    } else if std::process::Command::new("wl-copy")
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .is_ok()
    {
        ClipboardBackend::WlClipboard
    } else {
        ClipboardBackend::None
    }
}

pub fn get_clipboard() -> Result<ToolOutput> {
    let output = match clipboard_backend() {
        ClipboardBackend::Xclip => std::process::Command::new("xclip")
            .args(["-o", "-selection", "clipboard"])
            .output()
            .context("xclip failed")?,
        ClipboardBackend::WlClipboard => std::process::Command::new("wl-paste")
            .output()
            .context("wl-paste failed")?,
        ClipboardBackend::None => {
            return Ok(ToolOutput::new("Clipboard access requires xclip or wl-clipboard".to_string()));
        }
    };
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ToolOutput::new(if text.is_empty() {
        "Clipboard is empty".to_string()
    } else {
        text
    }))
}

pub fn set_clipboard(text: &str) -> Result<ToolOutput> {
    let status = match clipboard_backend() {
        ClipboardBackend::Xclip => std::process::Command::new("xclip")
            .args(["-selection", "clipboard"])
            .stdin(std::process::Stdio::piped())
            .spawn()
            .and_then(|mut child| {
                use std::io::Write;
                child.stdin.take().unwrap().write_all(text.as_bytes())?;
                child.wait()
            })
            .context("xclip failed")?,
        ClipboardBackend::WlClipboard => {
            let mut child = std::process::Command::new("wl-copy")
                .stdin(std::process::Stdio::piped())
                .spawn()
                .context("wl-copy failed")?;
            use std::io::Write;
            child.stdin.take().unwrap().write_all(text.as_bytes())?;
            child.wait()?
        }
        ClipboardBackend::None => {
            return Ok(ToolOutput::new("Clipboard access requires xclip or wl-clipboard".to_string()));
        }
    };
    if !status.success() {
        anyhow::bail!("Failed to set clipboard");
    }
    Ok(ToolOutput::new(format!("Set clipboard ({} chars)", text.chars().count())))
}

pub fn run_shell(script: &str) -> Result<ToolOutput> {
    let output = std::process::Command::new("sh")
        .args(["-c", script])
        .output()
        .context("Shell execution failed")?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let mut result = String::new();
    if !stdout.is_empty() { result.push_str(&stdout); }
    if !stderr.is_empty() {
        if !result.is_empty() { result.push('\n'); }
        result.push_str("[stderr]\n");
        result.push_str(&stderr);
    }
    if result.is_empty() {
        result = format!("Command completed with exit code {}", output.status.code().unwrap_or(-1));
    }
    Ok(ToolOutput::new(result))
}
