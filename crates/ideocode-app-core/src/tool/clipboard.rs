// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct ClipboardTool;

impl ClipboardTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum ClipboardAction {
    Get,
    Set,
    Clear,
}

#[derive(Deserialize)]
struct ClipboardInput {
    action: ClipboardAction,
    #[serde(default)]
    content: Option<String>,
}

#[async_trait]
impl Tool for ClipboardTool {
    fn name(&self) -> &str {
        "clipboard"
    }

    fn description(&self) -> &str {
        "Read, write, or clear the system clipboard."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": ["get", "set", "clear"],
                    "description": "Clipboard action: get (read current content), set (write new content), clear (empty clipboard)."
                },
                "content": {
                    "type": "string",
                    "description": "Content to write (required for set action)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: ClipboardInput = serde_json::from_value(input)?;

        match params.action {
            ClipboardAction::Get => clipboard_get().await,
            ClipboardAction::Set => {
                let content = params
                    .content
                    .context("content is required for set action")?;
                clipboard_set(&content).await
            }
            ClipboardAction::Clear => clipboard_clear().await,
        }
    }
}

#[cfg(windows)]
async fn clipboard_get() -> Result<ToolOutput> {
    let output = tokio::process::Command::new("powershell")
        .args(["-Command", "Get-Clipboard"])
        .output()
        .await?;
    let content = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ToolOutput::new(content))
}

#[cfg(not(windows))]
async fn clipboard_get() -> Result<ToolOutput> {
    let output = if cfg!(target_os = "macos") {
        tokio::process::Command::new("pbpaste").output().await?
    } else {
        // Linux - try wl-paste (Wayland) then xclip (X11)
        let result = tokio::process::Command::new("wl-paste").output().await;
        match result {
            Ok(o) if o.status.success() => o,
            _ => {
                tokio::process::Command::new("xclip")
                    .args(["-selection", "clipboard", "-o"])
                    .output()
                    .await?
            }
        }
    };
    let content = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(ToolOutput::new(content))
}

#[cfg(windows)]
async fn clipboard_set(content: &str) -> Result<ToolOutput> {
    let output = tokio::process::Command::new("powershell")
        .args([
            "-Command",
            &format!("Set-Clipboard -Value \"{}\"", content.replace('"', "`\"")),
        ])
        .output()
        .await?;
    if output.status.success() {
        Ok(ToolOutput::new(format!(
            "Clipboard set ({} chars)",
            content.len()
        )))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(anyhow::anyhow!("Failed to set clipboard: {}", stderr))
    }
}

#[cfg(not(windows))]
async fn clipboard_set(content: &str) -> Result<ToolOutput> {
    let mut cmd = if cfg!(target_os = "macos") {
        let mut c = tokio::process::Command::new("pbcopy");
        c.stdin(std::process::Stdio::piped());
        c
    } else {
        let mut c = tokio::process::Command::new("wl-copy");
        c.stdin(std::process::Stdio::piped());
        c
    };

    let mut child = cmd.spawn()?;
    use tokio::io::AsyncWriteExt;
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(content.as_bytes()).await?;
    }
    let status = child.wait().await?;
    if status.success() {
        Ok(ToolOutput::new(format!(
            "Clipboard set ({} chars)",
            content.len()
        )))
    } else {
        Err(anyhow::anyhow!(
            "Failed to set clipboard (exit code: {:?})",
            status.code()
        ))
    }
}

#[cfg(windows)]
async fn clipboard_clear() -> Result<ToolOutput> {
    let output = tokio::process::Command::new("powershell")
        .args(["-Command", "Set-Clipboard -Value \"\""])
        .output()
        .await?;
    if output.status.success() {
        Ok(ToolOutput::new("Clipboard cleared"))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(anyhow::anyhow!("Failed to clear clipboard: {}", stderr))
    }
}

#[cfg(not(windows))]
async fn clipboard_clear() -> Result<ToolOutput> {
    clipboard_set("").await
}
