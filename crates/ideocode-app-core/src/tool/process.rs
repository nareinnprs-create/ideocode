// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct ProcessTool;

impl ProcessTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum ProcessAction {
    List,
    Kill,
    Info,
}

#[derive(Deserialize)]
struct ProcessInput {
    action: ProcessAction,
    #[serde(default)]
    pid: Option<u32>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    signal: Option<String>,
}

#[async_trait]
impl Tool for ProcessTool {
    fn name(&self) -> &str {
        "process"
    }

    fn description(&self) -> &str {
        "List, inspect, or kill system processes. Supports filtering by PID or name."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": ["list", "kill", "info"],
                    "description": "Action: list (list processes), kill (terminate a process), info (get process details)."
                },
                "pid": {
                    "type": "integer",
                    "description": "Process ID (for kill/info)."
                },
                "name": {
                    "type": "string",
                    "description": "Process name filter (for list/kill)."
                },
                "signal": {
                    "type": "string",
                    "description": "Signal to send (Unix only, default: SIGTERM). Examples: SIGTERM, SIGKILL, SIGINT."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: ProcessInput = serde_json::from_value(input)?;

        match params.action {
            ProcessAction::List => process_list(params.name.as_deref()).await,
            ProcessAction::Kill => {
                process_kill(params.pid, params.name.as_deref(), params.signal.as_deref()).await
            }
            ProcessAction::Info => process_info(params.pid).await,
        }
    }
}

#[cfg(windows)]
async fn process_list(filter: Option<&str>) -> Result<ToolOutput> {
    let mut cmd = tokio::process::Command::new("tasklist");
    cmd.arg("/FO").arg("CSV");
    cmd.arg("/NH");

    let output = cmd.output().await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    let mut result = String::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.trim_matches('"').split("\",\"").collect();
        if parts.len() >= 2 {
            let name = parts.first().unwrap_or(&"");
            let pid = parts.get(1).unwrap_or(&"");
            if let Some(f) = filter
                && !name.to_lowercase().contains(&f.to_lowercase())
            {
                continue;
            }
            let mem = parts.get(4).unwrap_or(&"");
            result.push_str(&format!("{:>8}  {:<30}  {}\n", pid, name, mem));
        }
    }

    if result.is_empty() {
        result = "No matching processes found.".to_string();
    }

    Ok(ToolOutput::new(result))
}

#[cfg(not(windows))]
async fn process_list(filter: Option<&str>) -> Result<ToolOutput> {
    let mut cmd = tokio::process::Command::new("ps");
    cmd.args(["aux"]);

    let output = cmd.output().await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    // Parse ps aux output
    let mut result = String::new();
    let mut lines = stdout.lines();
    if let Some(header) = lines.next() {
        result.push_str(header);
        result.push('\n');
    }

    for line in lines {
        if let Some(f) = filter {
            if !line.to_lowercase().contains(&f.to_lowercase()) {
                continue;
            }
        }
        result.push_str(line);
        result.push('\n');
    }

    if result.trim().is_empty() || result.lines().count() <= 1 {
        result = "No matching processes found.".to_string();
    }

    Ok(ToolOutput::new(result))
}

#[cfg(windows)]
async fn process_kill(
    pid: Option<u32>,
    name: Option<&str>,
    _signal: Option<&str>,
) -> Result<ToolOutput> {
    if let Some(pid) = pid {
        let output = tokio::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .await?;
        if output.status.success() {
            Ok(ToolOutput::new(format!("Process {} terminated", pid)))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow::anyhow!(
                "Failed to kill process {}: {}",
                pid,
                stderr
            ))
        }
    } else if let Some(name) = name {
        let output = tokio::process::Command::new("taskkill")
            .args(["/IM", name, "/F"])
            .output()
            .await?;
        if output.status.success() {
            Ok(ToolOutput::new(format!("Process '{}' terminated", name)))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow::anyhow!("Failed to kill '{}': {}", name, stderr))
        }
    } else {
        Err(anyhow::anyhow!(
            "Either pid or name is required for kill action"
        ))
    }
}

#[cfg(not(windows))]
async fn process_kill(
    pid: Option<u32>,
    name: Option<&str>,
    signal: Option<&str>,
) -> Result<ToolOutput> {
    let sig = signal.unwrap_or("SIGTERM");

    if let Some(pid) = pid {
        let output = tokio::process::Command::new("kill")
            .args([format!("-{}", sig).as_str(), &pid.to_string()])
            .output()
            .await?;
        if output.status.success() {
            Ok(ToolOutput::new(format!(
                "Process {} killed with {}",
                pid, sig
            )))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow::anyhow!(
                "Failed to kill process {}: {}",
                pid,
                stderr
            ))
        }
    } else if let Some(name) = name {
        let output = tokio::process::Command::new("pkill")
            .args([format!("-{}", sig).as_str(), name])
            .output()
            .await?;
        if output.status.success() {
            Ok(ToolOutput::new(format!(
                "Process '{}' killed with {}",
                name, sig
            )))
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow::anyhow!("Failed to kill '{}': {}", name, stderr))
        }
    } else {
        Err(anyhow::anyhow!(
            "Either pid or name is required for kill action"
        ))
    }
}

#[cfg(windows)]
async fn process_info(pid: Option<u32>) -> Result<ToolOutput> {
    let pid = pid.context("pid is required for info action")?;
    let output = tokio::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/V"])
        .output()
        .await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.contains("INFO: No tasks") {
        Ok(ToolOutput::new(format!("No process with PID {}", pid)))
    } else {
        Ok(ToolOutput::new(stdout))
    }
}

#[cfg(not(windows))]
async fn process_info(pid: Option<u32>) -> Result<ToolOutput> {
    let pid = pid.context("pid is required for info action")?;
    let output = tokio::process::Command::new("ps")
        .args([
            "-p",
            &pid.to_string(),
            "-o",
            "pid,ppid,user,%cpu,%mem,rss,stat,start,time,args",
        ])
        .output()
        .await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.lines().count() <= 1 {
        Ok(ToolOutput::new(format!("No process with PID {}", pid)))
    } else {
        Ok(ToolOutput::new(stdout))
    }
}
