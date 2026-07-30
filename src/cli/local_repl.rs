// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use std::sync::Arc;

use anyhow::Result;
use serde_json::Value;

use crate::local_provider::LocalProvider;
use crate::tool::{Registry, ToolContext, ToolExecutionMode};

pub async fn run_shell() -> Result<()> {
    let provider = Arc::new(LocalProvider);
    let registry = Registry::new(provider).await;

    let cwd = std::env::current_dir().ok();

    println!("IDEOCODE Local Shell (no AI)");
    println!("Type a tool name and JSON arguments, or 'help' for tool list, or 'quit' to exit.");
    println!();

    loop {
        let Some(line) = read_line("> ") else {
            break;
        };
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        match line.as_str() {
            "quit" | "exit" => break,
            "help" => print_help(&registry).await,
            "list" => print_help(&registry).await,
            _ => {
                if let Err(e) = run_command(&registry, &line, &cwd).await {
                    eprintln!("Error: {e}");
                }
            }
        }
    }

    Ok(())
}

fn read_line(prompt: &str) -> Option<String> {
    use std::io::Write;
    print!("{prompt}");
    std::io::stdout().flush().ok()?;
    let mut line = String::new();
    if std::io::stdin().read_line(&mut line).ok()? == 0 {
        return None;
    }
    Some(line)
}

async fn print_help(registry: &Registry) {
    let defs = registry.definitions(None).await;
    println!("Available tools ({}):", defs.len());
    for def in &defs {
        let short = def.description.lines().next().unwrap_or(&def.description);
        println!("  {:<20} {}", def.name, short);
    }
    println!();
    println!("Usage: <tool-name> <json-args>");
    println!("Example: bash {{\"cmd\": \"ls -la\"}}");
    println!("         read {{\"file_path\": \"src/main.rs\"}}");
    println!();
    println!("Available via CLI: `ideocode tool list`, `ideocode tool run <name> <json>`, `ideocode tool info <name>`");
}

async fn run_command(registry: &Registry, line: &str, cwd: &Option<std::path::PathBuf>) -> Result<()> {
    let trimmed = line.trim();
    let split_at = trimmed.find(char::is_whitespace).unwrap_or(trimmed.len());
    let tool_name = &trimmed[..split_at];
    let rest = trimmed[split_at..].trim();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    let input: Value = if rest.is_empty() {
        Value::Object(serde_json::Map::new())
    } else {
        serde_json::from_str(rest).map_err(|e| {
            anyhow::anyhow!(
                "Invalid JSON input for '{tool_name}': {e}\nExample: {tool_name} {{\"key\": \"value\"}}"
            )
        })?
    };

    let ctx = ToolContext {
        session_id: format!("repl-{now:x}"),
        message_id: format!("msg-{now:x}"),
        tool_call_id: format!("call-{now:x}"),
        working_dir: cwd.clone(),
        stdin_request_tx: None,
        graceful_shutdown_signal: None,
        execution_mode: ToolExecutionMode::Direct,
    };

    let output = registry.execute(tool_name, input, ctx).await?;

    if !output.output.is_empty() {
        println!("{}", output.output);
    }
    for img in &output.images {
        println!("[Image: {} ({}, {} bytes)]", img.label.as_deref().unwrap_or("untitled"), img.media_type, img.data.len());
    }

    Ok(())
}
