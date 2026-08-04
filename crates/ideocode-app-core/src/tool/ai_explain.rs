// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct ExplainTool {
    registry: Registry,
}

impl ExplainTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct ExplainInput {
    code: String,
    language: Option<String>,
    style: Option<String>,
}

#[async_trait]
impl Tool for ExplainTool {
    fn name(&self) -> &str {
        "explain"
    }

    fn description(&self) -> &str {
        "Explain code or a technical concept in detail."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "code": { "type": "string", "description": "The code or concept to explain" },
                "language": { "type": "string", "description": "Programming language (auto-detected if omitted)" },
                "style": { "type": "string", "enum": ["simple", "detailed", "analogy"], "description": "Explanation style" }
            },
            "required": ["code"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: ExplainInput = serde_json::from_value(input)?;
        let provider = self
            .registry
            .provider
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let style_guide = match input.style.as_deref() {
            Some("simple") => "Explain in simple terms suitable for a beginner.",
            Some("analogy") => "Use analogies and real-world comparisons to explain.",
            _ => "Provide a thorough, detailed explanation covering how and why it works.",
        };

        let system = format!(
            "You are an expert programming teacher. {} Be clear, accurate, and educational.",
            style_guide
        );

        let lang_hint = input
            .language
            .as_ref()
            .map(|l| format!(" (language: {})", l))
            .unwrap_or_default();
        let user_prompt = format!(
            "Explain the following code{lang_hint}:\n\n```{}\n{}```\n",
            input.language.as_deref().unwrap_or(""),
            input.code
        );

        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
