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

pub struct DiffTool;

impl DiffTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum DiffInputSource {
    Text,
    File,
}

#[derive(Deserialize)]
struct DiffInput {
    before: String,
    after: String,
    #[serde(default = "default_source")]
    source: DiffInputSource,
    #[serde(default = "default_context")]
    context: usize,
    #[serde(default)]
    path: Option<String>,
}

fn default_source() -> DiffInputSource {
    DiffInputSource::Text
}

fn default_context() -> usize {
    3
}

#[async_trait]
impl Tool for DiffTool {
    fn name(&self) -> &str {
        "diff"
    }

    fn description(&self) -> &str {
        "Show a structured diff between two texts or files. Uses unified diff format with configurable context lines."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["before", "after"],
            "properties": {
                "intent": super::intent_schema_property(),
                "before": {
                    "type": "string",
                    "description": "Original text or file path (depending on source)."
                },
                "after": {
                    "type": "string",
                    "description": "Modified text or file path (depending on source)."
                },
                "source": {
                    "type": "string",
                    "enum": ["text", "file"],
                    "description": "Whether before/after are inline text or file paths (default: text)."
                },
                "context": {
                    "type": "integer",
                    "description": "Number of context lines (default: 3)."
                },
                "path": {
                    "type": "string",
                    "description": "Working directory for resolving file paths."
                }
            }
        })
    }

    async fn execute(&self, input: Value, ctx: ToolContext) -> Result<ToolOutput> {
        let params: DiffInput = serde_json::from_value(input)?;

        let (before_text, after_text) = match params.source {
            DiffInputSource::Text => (params.before.clone(), params.after.clone()),
            DiffInputSource::File => {
                let resolve = |p: &str| -> Result<String> {
                    let path = if Path::new(p).is_absolute() {
                        Path::new(p).to_path_buf()
                    } else if let Some(ref base) = params.path {
                        Path::new(base).join(p)
                    } else {
                        ctx.resolve_path(Path::new(p))
                    };
                    std::fs::read_to_string(&path)
                        .with_context(|| format!("Failed to read file: {}", path.display()))
                };
                (resolve(&params.before)?, resolve(&params.after)?)
            }
        };

        let diff = tokio::task::spawn_blocking(move || -> Result<String> {
            let diff = similar::udiff::unified_diff(
                similar::Algorithm::Myers,
                &before_text,
                &after_text,
                params.context,
                Some(("before", "after")),
            );

            Ok(diff)
        })
        .await??;

        if diff.trim() == "--- before\n+++ after" || diff.trim().is_empty() {
            Ok(ToolOutput::new("No differences found."))
        } else {
            Ok(ToolOutput::new(diff))
        }
    }
}
