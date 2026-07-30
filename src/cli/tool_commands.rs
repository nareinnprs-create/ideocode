// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use std::sync::Arc;

use anyhow::{Context, Result};
use serde_json::Value;

use crate::local_provider::LocalProvider;
use crate::message::ToolDefinition;
use crate::tool::{Registry, ToolContext, ToolExecutionMode};

pub enum ToolSubcommand {
    List { json: bool },
    Run { name: String, input: Value },
    Help { name: String },
}

async fn make_registry() -> Registry {
    let provider = Arc::new(LocalProvider);
    Registry::new(provider).await
}

fn make_context() -> ToolContext {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    ToolContext {
        session_id: format!("local-{now:x}"),
        message_id: format!("msg-{now:x}"),
        tool_call_id: format!("call-{now:x}"),
        working_dir: std::env::current_dir().ok(),
        stdin_request_tx: None,
        graceful_shutdown_signal: None,
        execution_mode: ToolExecutionMode::Direct,
    }
}

pub async fn run_tool_command(cmd: ToolSubcommand) -> Result<()> {
    match cmd {
        ToolSubcommand::List { json } => run_tool_list(json).await,
        ToolSubcommand::Run { name, input } => run_tool_run(&name, input).await,
        ToolSubcommand::Help { name } => run_tool_help(&name).await,
    }
}

async fn run_tool_list(json: bool) -> Result<()> {
    let registry = make_registry().await;
    let defs = registry.definitions(None).await;

    if json {
        println!("{}", serde_json::to_string_pretty(&defs)?);
        return Ok(());
    }

    println!("Available tools ({}):", defs.len());
    println!();
    for def in &defs {
        let short_desc = def.description.lines().next().unwrap_or(&def.description);
        println!("  {:<20} {}", def.name, short_desc);
    }
    println!();
    println!("Use `ideocode tool info <name>` for details on a specific tool.");
    println!("Use `ideocode tool run <name> '<json-input>'` to execute a tool directly.");

    Ok(())
}

async fn run_tool_run(name: &str, input: Value) -> Result<()> {
    let registry = make_registry().await;
    let ctx = make_context();
    let output = registry.execute(name, input, ctx).await?;

    if !output.output.is_empty() {
        println!("{}", output.output);
    }
    for img in &output.images {
        println!("[Image: {} ({}, {} bytes)]", img.label.as_deref().unwrap_or("untitled"), img.media_type, img.data.len());
    }

    Ok(())
}

fn render_tool_help(def: &ToolDefinition, schema: &Value) -> String {
    let mut out = String::new();
    out.push_str(&format!("Tool: {}\n", def.name));
    out.push_str(&format!("Description: {}\n", def.description));

    if let Some(properties) = schema.get("properties").and_then(|p| p.as_object()) {
        out.push_str(&format!("\nParameters:\n"));
        let required = schema
            .get("required")
            .and_then(|r| r.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect::<std::collections::HashSet<String>>()
            })
            .unwrap_or_default();

        for (param_name, param_schema) in properties {
            let ptype = param_schema
                .get("type")
                .and_then(|t| t.as_str())
                .unwrap_or("any");
            let desc = param_schema
                .get("description")
                .and_then(|d| d.as_str())
                .unwrap_or("");
            let req = if required.contains(param_name) {
                " (required)"
            } else {
                " (optional)"
            };
            out.push_str(&format!("  --{}: {}{}\n", param_name, ptype, req));
            if !desc.is_empty() {
                out.push_str(&format!("       {}\n", desc));
            }
            // Show default if present
            if let Some(default) = param_schema.get("default") {
                out.push_str(&format!("       default: {}\n", default));
            }
            // Show enum values if present
            if let Some(enum_vals) = param_schema.get("enum").and_then(|e| e.as_array()) {
                let vals: Vec<String> = enum_vals
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();
                if !vals.is_empty() {
                    out.push_str(&format!("       enum: [{}]\n", vals.join(", ")));
                }
            }
        }
    }

    out.push_str(&format!("\nExample:\n"));
    out.push_str(&format!("  ideocode tool run {} '{{\"param\": \"value\"}}'\n", def.name));

    out
}

async fn run_tool_help(name: &str) -> Result<()> {
    let registry = make_registry().await;
    let defs = registry.definitions(None).await;

    let def = defs.iter().find(|d| d.name == name).with_context(|| {
        let names: Vec<&str> = defs.iter().map(|d| d.name.as_str()).collect();
        format!("Unknown tool '{}'. Available tools: {}", name, names.join(", "))
    })?;

    print!("{}", render_tool_help(def, &def.input_schema));
    Ok(())
}
