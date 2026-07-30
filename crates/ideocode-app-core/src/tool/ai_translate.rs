// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct TranslateTool {
    registry: Registry,
}

impl TranslateTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct TranslateInput {
    text: String,
    target_language: String,
    source_language: Option<String>,
    preserve_code: Option<bool>,
}

#[async_trait]
impl Tool for TranslateTool {
    fn name(&self) -> &str { "translate" }

    fn description(&self) -> &str {
        "Translate text between languages while preserving technical accuracy."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "The text to translate" },
                "target_language": { "type": "string", "description": "Target language (e.g., 'Spanish', 'Japanese')" },
                "source_language": { "type": "string", "description": "Source language (auto-detected if omitted)" },
                "preserve_code": { "type": "boolean", "description": "Preserve code blocks and technical terms as-is" }
            },
            "required": ["text", "target_language"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: TranslateInput = serde_json::from_value(input)?;
        let provider = self.registry.provider.as_ref().ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let source = input.source_language.as_deref().unwrap_or("auto-detected");
        let preserve = if input.preserve_code.unwrap_or(true) {
            "Preserve all code blocks, technical terms, and formatting exactly as-is. Only translate natural language text."
        } else {
            ""
        };

        let system = format!(
            "You are an expert translator. Translate from {} to {} with technical accuracy.\n{}",
            source, input.target_language, preserve
        );

        let user_prompt = format!("Translate this to {}:\n\n---\n{}\n---", input.target_language, input.text);
        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
