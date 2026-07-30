// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::Result;
use serde_json::{Value, json};

use super::ToolOutput;

const ACTIONS: &[(&str, &str, &str)] = &[
    ("observe", "screenshot", "Capture the full screen as a PNG image."),
    ("observe", "ocr", "Optical character recognition via tesseract."),
    ("observe", "cursor", "Get the current cursor position as (x, y) pixel coordinates."),
    ("mouse", "move", "Move the cursor to absolute pixel coordinates (x, y)."),
    ("mouse", "click", "Left-click at (x,y)."),
    ("mouse", "double_click", "Double-click at (x,y)."),
    ("mouse", "right_click", "Right-click at (x,y)."),
    ("keyboard", "type", "Type text at the current focused element."),
    ("keyboard", "key", "Press a key chord, e.g. ctrl+c, alt+tab."),
    ("apps", "list_apps", "List running processes with visible windows."),
    ("apps", "activate_app", "Bring an app's window to the foreground by process name."),
    ("apps", "quit_app", "Terminate an app by process name."),
    ("windows", "list_windows", "List all visible top-level windows."),
    ("windows", "focus_window", "Bring window to foreground."),
    ("clipboard", "get_clipboard", "Read the current clipboard text content."),
    ("clipboard", "set_clipboard", "Set the clipboard text content."),
    ("scripting", "run_shell", "Execute an arbitrary shell command."),
];

pub fn discover(category: Option<&str>) -> Result<ToolOutput> {
    let cat = category.unwrap_or("all");
    let mut specs = Vec::new();
    for (action_cat, name, desc) in ACTIONS {
        if *action_cat == cat || cat == "all" {
            specs.push(json!({
                "name": name,
                "category": action_cat,
                "description": desc,
                "parameters": param_schema(name)
            }));
        }
    }
    let result = json!({
        "category": cat,
        "actions": specs,
        "hint": "Pass category='all' to list every action."
    });
    Ok(ToolOutput::new(serde_json::to_string_pretty(&result)?))
}

fn param_schema(action: &str) -> Value {
    match action {
        "screenshot" | "cursor" | "list_apps" | "list_windows" | "get_clipboard" => json!({}),
        "ocr" => json!({ "x": {"type":"number"}, "y": {"type":"number"}, "w": {"type":"number"}, "h": {"type":"number"} }),
        "move" | "click" | "double_click" | "right_click" => json!({
            "x": {"type":"number"}, "y": {"type":"number"}
        }),
        "type" => json!({ "text": {"type":"string"} }),
        "key" => json!({ "keys": {"type":"string"} }),
        "activate_app" | "quit_app" | "focus_window" => json!({
            "app": {"type":"string"}
        }),
        "set_clipboard" => json!({ "text": {"type":"string"} }),
        "run_shell" => json!({ "script": {"type":"string"} }),
        _ => json!({}),
    }
}
