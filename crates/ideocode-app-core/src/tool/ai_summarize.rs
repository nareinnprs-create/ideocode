// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct SummarizeTool {
    registry: Registry,
}

impl SummarizeTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct SummarizeInput {
    text: String,
    length: Option<String>,
    format: Option<String>,
}

#[async_trait]
impl Tool for SummarizeTool {
    fn name(&self) -> &str { "summarize" }

    fn description(&self) -> &str {
        "Summarize text, code, or content into a concise overview."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "The text to summarize" },
                "length": { "type": "string", "enum": ["short", "medium", "detailed"], "description": "Summary length" },
                "format": { "type": "string", "enum": ["paragraph", "bullets", "outline"], "description": "Output format" }
            },
            "required": ["text"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: SummarizeInput = serde_json::from_value(input)?;
        let provider = self.registry.provider.as_ref().ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let length_guide = match input.length.as_deref() {
            Some("short") => "in 2-3 sentences",
            Some("detailed") => "comprehensively, covering all key points",
            _ => "concisely, covering the essential points",
        };

        let format_guide = match input.format.as_deref() {
            Some("bullets") => "Use bullet points.",
            Some("outline") => "Use a structured outline with headings.",
            _ => "Use flowing paragraph format.",
        };

        let system = format!(
            "You are an expert summarizer. Summarize the following content {}.\n{}",
            length_guide, format_guide
        );

        let user_prompt = format!("Summarize this:\n\n---\n{}\n---", input.text);
        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
