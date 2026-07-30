// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Mutex;

static THOUGHTS: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub struct ThinkTool;

impl ThinkTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
struct ThinkInput {
    thought: String,
    #[serde(default)]
    clear: bool,
}

#[async_trait]
impl Tool for ThinkTool {
    fn name(&self) -> &str {
        "think"
    }

    fn description(&self) -> &str {
        "Record extended reasoning, plans, and intermediate analysis in a persistent scratchpad visible across the session. Use for multi-step reasoning, planning, and tracking progress."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["thought"],
            "properties": {
                "intent": super::intent_schema_property(),
                "thought": {
                    "type": "string",
                    "description": "The thought, plan, or analysis to record."
                },
                "clear": {
                    "type": "boolean",
                    "description": "Clear the scratchpad before adding this thought."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: ThinkInput = serde_json::from_value(input)?;

        let mut thoughts = THOUGHTS.lock().unwrap();

        if params.clear {
            thoughts.clear();
        }

        let entry_number = thoughts.len() + 1;
        thoughts.push(params.thought);

        let output = format!(
            "Thought #{} recorded. {} thought(s) in scratchpad.\n\nUse `think` again to continue reasoning.",
            entry_number,
            thoughts.len()
        );

        Ok(ToolOutput::new(output))
    }
}
