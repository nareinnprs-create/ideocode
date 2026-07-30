// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct RefactorTool {
    registry: Registry,
}

impl RefactorTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct RefactorInput {
    code: String,
    goal: Option<String>,
    language: Option<String>,
}

#[async_trait]
impl Tool for RefactorTool {
    fn name(&self) -> &str { "refactor" }

    fn description(&self) -> &str {
        "Refactor code to improve structure, readability, or performance."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "code": { "type": "string", "description": "The code to refactor" },
                "goal": { "type": "string", "description": "Refactoring goal (e.g., 'extract function', 'use pattern', 'improve naming', 'optimize')" },
                "language": { "type": "string", "description": "Programming language" }
            },
            "required": ["code"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: RefactorInput = serde_json::from_value(input)?;
        let provider = self.registry.provider.as_ref().ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let goal = input.goal.unwrap_or_default();
        let goal_text = if goal.is_empty() { "improve overall code quality and readability".to_string() } else { goal };

        let system = format!(
            "You are an expert software architect. Refactor the given code to {}. Show the refactored code and explain each change you made.",
            goal_text
        );

        let lang = input.language.as_deref().unwrap_or("");
        let user_prompt = format!("Refactor this code:\n\n```{lang}\n{}```\nGoal: {}\nProvide the complete refactored version with explanations.", input.code, goal_text);

        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
