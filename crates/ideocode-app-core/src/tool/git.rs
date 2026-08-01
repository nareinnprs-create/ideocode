// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::Path;

pub struct GitTool;

impl GitTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum GitAction {
    Status,
    Diff,
    Log,
    Commit,
    Push,
    Pull,
    Branch,
    Checkout,
    Stash,
    Init,
    Add,
    Reset,
    Show,
    Clone,
}

#[derive(Deserialize)]
struct GitInput {
    action: GitAction,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

#[async_trait]
impl Tool for GitTool {
    fn name(&self) -> &str {
        "git"
    }

    fn description(&self) -> &str {
        "Execute Git operations with structured output. Supports status, diff, log, commit, push, pull, branch, checkout, stash, init, add, reset, show, clone."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": ["status", "diff", "log", "commit", "push", "pull", "branch", "checkout", "stash", "init", "add", "reset", "show", "clone"],
                    "description": "Git action to perform."
                },
                "args": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Extra arguments passed to the git command."
                },
                "path": {
                    "type": "string",
                    "description": "Working directory for the git command."
                },
                "message": {
                    "type": "string",
                    "description": "Commit message (used with commit action)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, ctx: ToolContext) -> Result<ToolOutput> {
        let params: GitInput = serde_json::from_value(input)?;

        let working_dir = params
            .path
            .map(|p| ctx.resolve_path(Path::new(&p)))
            .or_else(|| ctx.working_dir.clone());

        let action_str = match params.action {
            GitAction::Status => "status",
            GitAction::Diff => "diff",
            GitAction::Log => "log",
            GitAction::Commit => "commit",
            GitAction::Push => "push",
            GitAction::Pull => "pull",
            GitAction::Branch => "branch",
            GitAction::Checkout => "checkout",
            GitAction::Stash => "stash",
            GitAction::Init => "init",
            GitAction::Add => "add",
            GitAction::Reset => "reset",
            GitAction::Show => "show",
            GitAction::Clone => "clone",
        };

        let mut cmd = tokio::process::Command::new("git");
        cmd.arg(action_str);

        if let Some(msg) = &params.message
            && matches!(params.action, GitAction::Commit)
        {
            cmd.arg("-m");
            cmd.arg(msg);
        }

        for arg in &params.args {
            cmd.arg(arg);
        }

        if let Some(dir) = &working_dir {
            cmd.current_dir(dir);
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
        if !output.status.success() {
            result = format!("Git {} failed (exit code: {:?})\n{}", action_str, output.status.code(), result);
        }

        Ok(ToolOutput::new(result))
    }
}
