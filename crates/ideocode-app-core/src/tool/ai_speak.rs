// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct SpeakTool {
    registry: Registry,
}

impl SpeakTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct SpeakInput {
    text: String,
    voice: Option<String>,
}

#[async_trait]
impl Tool for SpeakTool {
    fn name(&self) -> &str {
        "speak"
    }

    fn description(&self) -> &str {
        "Convert text to speech. Uses the AI provider or OS text-to-speech capabilities."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "The text to speak" },
                "voice": { "type": "string", "enum": ["default", "female", "male"], "description": "Voice preference" }
            },
            "required": ["text"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: SpeakInput = serde_json::from_value(input)?;
        let provider = self
            .registry
            .provider
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let system = "You are a text-to-speech assistant. The text you receive will be spoken aloud. \
                      Format the text for natural speech: expand abbreviations, handle numbers, and add appropriate pauses. \
                      Output the text optimized for speech synthesis.";

        let user_prompt = format!(
            "Optimize this text for speech synthesis (voice: {}):\n\n{}",
            input.voice.as_deref().unwrap_or("default"),
            input.text
        );

        let response = provider.complete_simple(&user_prompt, system).await?;

        Ok(ToolOutput::new(format!(
            "[TTS would speak: {} character(s)]\n\nOptimized text:\n{}",
            input.text.len(),
            response
        )))
    }
}
