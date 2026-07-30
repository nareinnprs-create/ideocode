// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::Path;

const MAX_RESULTS: usize = 100;

pub struct GlobTool;

impl GlobTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
struct GlobInput {
    pattern: String,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    max_results: Option<usize>,
}

#[async_trait]
impl Tool for GlobTool {
    fn name(&self) -> &str {
        "glob"
    }

    fn description(&self) -> &str {
        "Search for files and directories by glob pattern. Supports wildcards like **/*.rs, src/**/*.ts, etc."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["pattern"],
            "properties": {
                "intent": super::intent_schema_property(),
                "pattern": {
                    "type": "string",
                    "description": "Glob pattern (e.g. **/*.rs, src/**/*.ts, *.json)."
                },
                "path": {
                    "type": "string",
                    "description": "Base directory to search from (default: current directory)."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 100)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, ctx: ToolContext) -> Result<ToolOutput> {
        let params: GlobInput = serde_json::from_value(input)?;
        let max = params.max_results.unwrap_or(MAX_RESULTS);

        let base = params
            .path
            .map(|p| ctx.resolve_path(Path::new(&p)))
            .unwrap_or_else(|| {
                ctx.working_dir
                    .clone()
                    .unwrap_or_else(|| Path::new(".").to_path_buf())
            });

        let pattern = if params.pattern.contains('/') || params.pattern.contains('\\') {
            if Path::new(&params.pattern).is_absolute() {
                params.pattern.clone()
            } else {
                base.join(&params.pattern)
                    .to_string_lossy()
                    .to_string()
            }
        } else {
            base.join(&params.pattern)
                .to_string_lossy()
                .to_string()
        };

        let matches = tokio::task::spawn_blocking(move || -> Result<Vec<String>> {
            let glob_pattern = glob::Pattern::new(&pattern)
                .context("Invalid glob pattern")?;

            let mut results = Vec::new();

            if !base.exists() {
                return Err(anyhow::anyhow!("Directory not found: {}", base.display()));
            }

            if glob_pattern.matches("") {
                // For simple patterns, use the glob crate's glob function
                let entries = glob::glob(&pattern)
                    .context("Failed to execute glob pattern")?;
                for entry in entries.flatten() {
                    if results.len() >= max {
                        break;
                    }
                    results.push(entry.to_string_lossy().to_string());
                }
            } else {
                // Use glob normally
                let entries = glob::glob(&pattern)
                    .context("Failed to execute glob pattern")?;
                for entry in entries.flatten() {
                    if results.len() >= max {
                        break;
                    }
                    results.push(entry.to_string_lossy().to_string());
                }
            }

            Ok(results)
        })
        .await??;

        let truncated = matches.len() >= max;

        let mut output = String::new();
        for m in &matches {
            output.push_str(m);
            output.push('\n');
        }

        if truncated {
            output.push_str(&format!("\n... truncated at {} results", max));
        }

        if matches.is_empty() {
            output = format!("No matches found for pattern: {}", params.pattern);
        }

        Ok(ToolOutput::new(output))
    }
}
