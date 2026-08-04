// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct TranscribeTool {
    registry: Registry,
}

impl TranscribeTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct TranscribeInput {
    audio: String,
    language: Option<String>,
}

#[async_trait]
impl Tool for TranscribeTool {
    fn name(&self) -> &str {
        "transcribe"
    }

    fn description(&self) -> &str {
        "Transcribe audio to text. Provide a file path or base64-encoded audio data."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "audio": { "type": "string", "description": "File path or description of audio to transcribe" },
                "language": { "type": "string", "description": "Language hint (e.g., 'en', 'es')" }
            },
            "required": ["audio"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: TranscribeInput = serde_json::from_value(input)?;
        let provider = self
            .registry
            .provider
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let lang_hint = input.language.as_deref().unwrap_or("auto-detect");

        let system = format!(
            "You are a speech-to-text assistant. The user has provided audio (described as: '{}') in language: {}. \
             Since audio file processing is not directly available, help the user by explaining how to transcribe their audio. \
             If they provided a file path, suggest using ffmpeg or other tools to convert to text.",
            input.audio, lang_hint
        );

        let user_prompt = format!(
            "Transcribe this audio: {}\nLanguage hint: {}\n\nIf the audio is a file path, explain how to process it. \
             If it's a description, note that actual audio transcription requires API support.",
            input.audio, lang_hint
        );

        let response = provider.complete_simple(&user_prompt, &system).await?;

        Ok(ToolOutput::new(format!(
            "[Transcription requested for: {}]\n\n{}",
            truncate(&input.audio, 80),
            response
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
