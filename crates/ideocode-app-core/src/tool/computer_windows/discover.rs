// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::Result;
use serde_json::{Value, json};

use super::ToolOutput;

const ACTIONS: &[(&str, &str, &str)] = &[
    (
        "observe",
        "screenshot",
        "Capture the full screen as a PNG image.",
    ),
    (
        "observe",
        "ocr",
        "Optical character recognition: extract text from the screen. Options: x,y,w,h region.",
    ),
    (
        "observe",
        "ui",
        "Dump the accessibility (UI Automation) control tree.",
    ),
    (
        "observe",
        "cursor",
        "Get the current cursor position as (x, y) pixel coordinates.",
    ),
    (
        "mouse",
        "move",
        "Move the cursor to absolute pixel coordinates (x, y).",
    ),
    (
        "mouse",
        "click",
        "Left-click at (x,y). Defaults to current cursor position.",
    ),
    ("mouse", "double_click", "Double-click at (x,y)."),
    ("mouse", "right_click", "Right-click at (x,y)."),
    (
        "mouse",
        "drag",
        "Click-drag from (x,y) to (to_x, to_y) with smooth interpolation.",
    ),
    (
        "mouse",
        "scroll",
        "Scroll at (x,y) by dx (horizontal), dy (vertical) ticks.",
    ),
    (
        "keyboard",
        "type",
        "Type text at the current focused element.",
    ),
    (
        "keyboard",
        "key",
        "Press a key chord, e.g. ctrl+c, alt+tab, win+r.",
    ),
    (
        "apps",
        "list_apps",
        "List running processes with visible windows (name, PID, title).",
    ),
    (
        "apps",
        "activate_app",
        "Bring an app's window to the foreground by process name.",
    ),
    ("apps", "quit_app", "Terminate an app by process name."),
    (
        "windows",
        "list_windows",
        "List all visible top-level windows (handle, title, class).",
    ),
    (
        "windows",
        "focus_window",
        "Alias for activate_app: bring window to foreground.",
    ),
    (
        "windows",
        "move_window",
        "Move an app's window to absolute screen coordinates (x,y).",
    ),
    (
        "windows",
        "resize_window",
        "Resize an app's window to width (w) x height (h).",
    ),
    ("windows", "minimize_window", "Minimize an app's window."),
    (
        "windows",
        "close_window",
        "Gracefully close an app's main window.",
    ),
    (
        "clipboard",
        "get_clipboard",
        "Read the current clipboard text content.",
    ),
    (
        "clipboard",
        "set_clipboard",
        "Set the clipboard text content.",
    ),
    (
        "scripting",
        "run_powershell",
        "Execute an arbitrary PowerShell script and return output.",
    ),
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
        "hint": "Pass category='all' to list every action, or a specific category like 'mouse', 'keyboard', 'observe', 'apps', 'windows', 'clipboard', 'scripting'."
    });
    Ok(ToolOutput::new(serde_json::to_string_pretty(&result)?))
}

fn param_schema(action: &str) -> Value {
    match action {
        "screenshot" | "cursor" | "list_apps" | "list_windows" | "ui" | "get_clipboard" => {
            json!({})
        }
        "ocr" => {
            json!({ "x": {"type":"number"}, "y": {"type":"number"}, "w": {"type":"number"}, "h": {"type":"number"} })
        }
        "move" | "click" | "double_click" | "right_click" => json!({
            "x": {"type":"number","description":"Screen X coordinate (pixels)"},
            "y": {"type":"number","description":"Screen Y coordinate (pixels)"}
        }),
        "drag" => json!({
            "x": {"type":"number"}, "y": {"type":"number"},
            "to_x": {"type":"number"}, "to_y": {"type":"number"}
        }),
        "scroll" => json!({
            "x": {"type":"number"}, "y": {"type":"number"},
            "dx": {"type":"integer","description":"Horizontal scroll ticks"},
            "dy": {"type":"integer","description":"Vertical scroll ticks"}
        }),
        "type" => json!({ "text": {"type":"string","description":"Text to type"} }),
        "key" => json!({ "keys": {"type":"string","description":"Key chord, e.g. ctrl+c"} }),
        "activate_app" | "quit_app" | "focus_window" | "minimize_window" | "close_window" => {
            json!({
                "app": {"type":"string","description":"Process name (without .exe)"}
            })
        }
        "move_window" => json!({
            "app": {"type":"string"}, "x": {"type":"number"}, "y": {"type":"number"}
        }),
        "resize_window" => json!({
            "app": {"type":"string"}, "w": {"type":"number"}, "h": {"type":"number"}
        }),
        "set_clipboard" => json!({ "text": {"type":"string"} }),
        "run_powershell" => {
            json!({ "script": {"type":"string","description":"PowerShell script source"} })
        }
        _ => json!({}),
    }
}
