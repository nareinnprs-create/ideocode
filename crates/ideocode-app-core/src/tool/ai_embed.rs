// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct EmbedTool;

impl EmbedTool {
    pub fn new(_registry: Registry) -> Self {
        Self
    }
}

#[derive(Deserialize)]
struct EmbedInput {
    text: String,
}

#[async_trait]
impl Tool for EmbedTool {
    fn name(&self) -> &str {
        "embed"
    }

    fn description(&self) -> &str {
        "Generate text embeddings using the local embedding model."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "The text to embed" }
            },
            "required": ["text"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: EmbedInput = serde_json::from_value(input)?;

        let embedding = crate::embedding::embed(&input.text)?;
        let dims = embedding.len();
        let preview: Vec<f32> = embedding.iter().take(5).copied().collect();
        let preview_str = preview
            .iter()
            .map(|v| format!("{:.6}", v))
            .collect::<Vec<_>>()
            .join(", ");

        Ok(ToolOutput::new(format!(
            "Generated {} dimensional embedding for '{}':\n[{}, ...]",
            dims,
            truncate(&input.text, 80),
            preview_str
        )))
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}
