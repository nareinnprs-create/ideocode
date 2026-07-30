// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct ReviewTool {
    registry: Registry,
}

impl ReviewTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct ReviewInput {
    code: String,
    language: Option<String>,
    focus: Option<String>,
}

#[async_trait]
impl Tool for ReviewTool {
    fn name(&self) -> &str { "review" }

    fn description(&self) -> &str {
        "Review code for bugs, style issues, and improvement opportunities."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "code": { "type": "string", "description": "The code to review" },
                "language": { "type": "string", "description": "Programming language" },
                "focus": { "type": "string", "enum": ["security", "performance", "style", "correctness", "all"], "description": "Review focus area" }
            },
            "required": ["code"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: ReviewInput = serde_json::from_value(input)?;
        let provider = self.registry.provider.as_ref().ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let focus = input.focus.as_deref().unwrap_or("all");
        let focus_guide = match focus {
            "security" => "Focus specifically on security vulnerabilities, injection risks, and unsafe patterns.",
            "performance" => "Focus on performance issues, inefficient algorithms, and optimization opportunities.",
            "style" => "Focus on code style, readability, and adherence to best practices.",
            "correctness" => "Focus on logical errors, edge cases, and correctness issues.",
            _ => "Cover security, performance, style, and correctness comprehensively.",
        };

        let system = format!(
            "You are an expert code reviewer. Provide a thorough review with specific issues, their severity, and actionable fixes. {}",
            focus_guide
        );

        let lang_hint = input.language.as_deref().unwrap_or("");
        let user_prompt = format!("Review this code:\n\n```{lang_hint}\n{}```\n", input.code);

        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
