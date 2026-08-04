// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct ImagineTool {
    registry: Registry,
}

impl ImagineTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct ImagineInput {
    prompt: String,
    style: Option<String>,
    size: Option<String>,
}

#[async_trait]
impl Tool for ImagineTool {
    fn name(&self) -> &str {
        "imagine"
    }

    fn description(&self) -> &str {
        "Generate an image based on a text description. Uses the AI provider's image generation capability or describes what would be generated."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "prompt": { "type": "string", "description": "Description of the image to generate" },
                "style": { "type": "string", "enum": ["realistic", "cartoon", "sketch", "painting", "3d"], "description": "Art style" },
                "size": { "type": "string", "enum": ["small", "medium", "large"], "description": "Image size preference" }
            },
            "required": ["prompt"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: ImagineInput = serde_json::from_value(input)?;
        let provider = self
            .registry
            .provider
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let style_hint = input.style.as_deref().unwrap_or("realistic");
        let _size = input.size.as_deref().unwrap_or("medium");

        let system = format!(
            "You are an image generation assistant. Describe the image that would be created for the given prompt \
             in {style_hint} style. Include details about composition, colors, mood, and visual elements. \
             If the provider supports image generation, note that it would generate an actual image."
        );

        let user_prompt = format!(
            "Generate an image based on: {}\n\nStyle: {}\n\nDescribe what this image would look like.",
            input.prompt, style_hint
        );

        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
