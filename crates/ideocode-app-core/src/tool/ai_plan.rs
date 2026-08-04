// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct PlanTool {
    registry: Registry,
}

impl PlanTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct PlanInput {
    goal: String,
    context: Option<String>,
    constraints: Option<String>,
}

#[async_trait]
impl Tool for PlanTool {
    fn name(&self) -> &str {
        "plan"
    }

    fn description(&self) -> &str {
        "Create a structured plan to accomplish a goal with actionable steps."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "goal": { "type": "string", "description": "What to accomplish" },
                "context": { "type": "string", "description": "Additional context or background" },
                "constraints": { "type": "string", "description": "Constraints, requirements, or limitations" }
            },
            "required": ["goal"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: PlanInput = serde_json::from_value(input)?;
        let provider = self
            .registry
            .provider
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let context = input.context.unwrap_or_default();
        let constraints = input.constraints.unwrap_or_default();

        let system = "You are an expert project planner. Create a detailed, actionable plan with clear steps, \
                      estimated effort, dependencies, and success criteria. Be specific and practical.";

        let user_prompt = format!(
            "Goal: {}\n\nContext: {}\n\nConstraints: {}\n\nCreate a comprehensive plan.",
            input.goal, context, constraints
        );
        let response = provider.complete_simple(&user_prompt, system).await?;
        Ok(ToolOutput::new(response))
    }
}
