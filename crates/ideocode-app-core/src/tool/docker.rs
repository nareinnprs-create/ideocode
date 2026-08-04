// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct DockerTool;

impl DockerTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum DockerAction {
    Ps,
    Logs,
    Exec,
    Build,
    Compose,
    Images,
    Pull,
    Stop,
    Rm,
    Rmi,
    Stats,
    Inspect,
    Info,
    Version,
}

#[derive(Deserialize)]
struct DockerInput {
    action: DockerAction,
    #[serde(default)]
    target: Option<String>,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    file: Option<String>,
}

#[async_trait]
impl Tool for DockerTool {
    fn name(&self) -> &str {
        "docker"
    }

    fn description(&self) -> &str {
        "Manage Docker containers and images. Supports ps, logs, exec, build, compose, images, pull, stop, rm, rmi, stats, inspect."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": ["ps", "logs", "exec", "build", "compose", "images", "pull", "stop", "rm", "rmi", "stats", "inspect", "info", "version"],
                    "description": "Docker action to perform."
                },
                "target": {
                    "type": "string",
                    "description": "Container/image name or ID (for logs, exec, stop, rm, rmi, inspect, build)."
                },
                "args": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Extra arguments passed to the docker command."
                },
                "file": {
                    "type": "string",
                    "description": "Path to Dockerfile (for build) or compose file (for compose)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: DockerInput = serde_json::from_value(input)?;

        let action_str = match params.action {
            DockerAction::Ps => "ps",
            DockerAction::Logs => "logs",
            DockerAction::Exec => "exec",
            DockerAction::Build => "build",
            DockerAction::Compose => "compose",
            DockerAction::Images => "images",
            DockerAction::Pull => "pull",
            DockerAction::Stop => "stop",
            DockerAction::Rm => "rm",
            DockerAction::Rmi => "rmi",
            DockerAction::Stats => "stats",
            DockerAction::Inspect => "inspect",
            DockerAction::Info => "info",
            DockerAction::Version => "version",
        };

        let mut cmd = tokio::process::Command::new("docker");
        cmd.arg(action_str);

        if let Some(target) = &params.target {
            if matches!(params.action, DockerAction::Build) {
                cmd.arg("-t").arg(target);
            } else if matches!(params.action, DockerAction::Compose) {
                if let Some(file) = &params.file {
                    cmd.arg("-f").arg(file);
                }
                cmd.arg(target);
            } else {
                cmd.arg(target);
            }
        }

        if let Some(file) = &params.file
            && matches!(params.action, DockerAction::Build)
            && params.target.is_none()
        {
            cmd.arg("-f").arg(file);
        }

        for arg in &params.args {
            cmd.arg(arg);
        }

        // For build action without target, add current dir context
        if matches!(params.action, DockerAction::Build)
            && !params.args.iter().any(|a| !a.starts_with('-'))
        {
            cmd.arg(".");
        }

        let output = cmd.output().await?;
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
            result.push_str(&stderr);
        }
        if !output.status.success() && result.is_empty() {
            result = format!(
                "Docker {} failed (exit code: {:?})",
                action_str,
                output.status.code()
            );
        }

        Ok(ToolOutput::new(result))
    }
}
