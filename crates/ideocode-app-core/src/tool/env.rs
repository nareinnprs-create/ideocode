// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub struct EnvTool;

impl EnvTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum EnvAction {
    Get,
    Set,
    List,
    Unset,
}

#[derive(Deserialize)]
struct EnvInput {
    action: EnvAction,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    value: Option<String>,
}

#[async_trait]
impl Tool for EnvTool {
    fn name(&self) -> &str {
        "env"
    }

    fn description(&self) -> &str {
        "View and manage environment variables. Supports get, set, list, and unset operations."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "enum": ["get", "set", "list", "unset"],
                    "description": "Action: get (read a variable), set (set a variable), list (list all variables), unset (remove a variable)."
                },
                "name": {
                    "type": "string",
                    "description": "Environment variable name (required for get/set/unset)."
                },
                "value": {
                    "type": "string",
                    "description": "Value to set (required for set action)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: EnvInput = serde_json::from_value(input)?;

        match params.action {
            EnvAction::Get => {
                let name = params.name.context("name is required for get action")?;
                match std::env::var(&name) {
                    Ok(val) => Ok(ToolOutput::new(format!("{}={}", name, val))),
                    Err(_) => Ok(ToolOutput::new(format!("{} is not set", name))),
                }
            }
            EnvAction::Set => {
                let name = params.name.context("name is required for set action")?;
                let value = params.value.context("value is required for set action")?;
                // SAFETY: setting env vars is safe in this single-threaded
                // tool context; we don't rely on env var values elsewhere.
                unsafe {
                    std::env::set_var(&name, &value);
                }
                Ok(ToolOutput::new(format!("{}={}", name, value)))
            }
            EnvAction::List => {
                let mut vars: BTreeMap<String, String> = BTreeMap::new();
                for (key, value) in std::env::vars() {
                    vars.insert(key, value);
                }
                let mut output = String::new();
                for (key, value) in &vars {
                    output.push_str(&format!("{}={}\n", key, value));
                }
                Ok(ToolOutput::new(output.trim().to_string()))
            }
            EnvAction::Unset => {
                let name = params.name.context("name is required for unset action")?;
                // SAFETY: single-threaded tool context, no concurrent env reads.
                unsafe {
                    std::env::remove_var(&name);
                }
                Ok(ToolOutput::new(format!("Unset {}", name)))
            }
        }
    }
}
