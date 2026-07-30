// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Registry, Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct DiagramTool {
    registry: Registry,
}

impl DiagramTool {
    pub fn new(registry: Registry) -> Self {
        Self { registry }
    }
}

#[derive(Deserialize)]
struct DiagramInput {
    description: String,
    diagram_type: Option<String>,
}

#[async_trait]
impl Tool for DiagramTool {
    fn name(&self) -> &str { "diagram" }

    fn description(&self) -> &str {
        "Generate a Mermaid diagram from a textual description."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "description": { "type": "string", "description": "What the diagram should represent" },
                "diagram_type": { "type": "string", "enum": ["flowchart", "sequence", "class", "state", "gantt", "pie", "er"], "description": "Type of diagram" }
            },
            "required": ["description"]
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let input: DiagramInput = serde_json::from_value(input)?;
        let provider = self.registry.provider.as_ref().ok_or_else(|| anyhow::anyhow!("No AI provider available"))?;

        let dtype = input.diagram_type.as_deref().unwrap_or("flowchart");
        let system = format!(
            "You are a diagram expert. Generate a {dtype} Mermaid.js diagram from the description. \
             Output ONLY valid Mermaid syntax inside a single mermaid code block. \
             Do not include explanations outside the code block.",
        );

        let user_prompt = format!(
            "Create a {} diagram for: {}\nReturn only the Mermaid code in a ```mermaid block.",
            dtype, input.description
        );
        let response = provider.complete_simple(&user_prompt, &system).await?;
        Ok(ToolOutput::new(response))
    }
}
