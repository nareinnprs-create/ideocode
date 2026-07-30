// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{StdinInputRequest, Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct AskTool;

impl AskTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
struct AskInput {
    prompt: String,
    #[serde(default)]
    is_password: bool,
}

#[async_trait]
impl Tool for AskTool {
    fn name(&self) -> &str {
        "ask"
    }

    fn description(&self) -> &str {
        "Ask the user for input or confirmation. Displays a prompt and waits for a response. Use when clarification, approval, or additional information is needed."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["prompt"],
            "properties": {
                "intent": super::intent_schema_property(),
                "prompt": {
                    "type": "string",
                    "description": "The question or prompt to display to the user."
                },
                "is_password": {
                    "type": "boolean",
                    "description": "If true, input is masked (for secrets)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, ctx: ToolContext) -> Result<ToolOutput> {
        let params: AskInput = serde_json::from_value(input)?;

        let tx = ctx
            .stdin_request_tx
            .context("No stdin channel available — cannot ask user for input")?;

        let (response_tx, response_rx) = tokio::sync::oneshot::channel();

        tx.send(StdinInputRequest {
            request_id: ctx.tool_call_id.clone(),
            prompt: params.prompt,
            is_password: params.is_password,
            response_tx,
        })
        .context("Failed to send stdin request — user input channel closed")?;

        let user_input = response_rx
            .await
            .context("User did not provide input")?;

        Ok(ToolOutput::new(user_input))
    }
}
