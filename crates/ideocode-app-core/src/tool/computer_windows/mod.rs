// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result, bail};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

#[cfg(windows)]
mod input;
#[cfg(windows)]
mod screen;
#[cfg(windows)]
mod win;
#[cfg(windows)]
mod sys;
#[cfg(windows)]
mod discover;

pub struct WindowsComputerTool;

impl WindowsComputerTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Debug, Deserialize)]
#[allow(dead_code, reason = "fields used for future dispatch actions; kept for schema completeness")]
struct ComputerInput {
    action: String,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    x: Option<f64>,
    #[serde(default)]
    y: Option<f64>,
    #[serde(default)]
    to_x: Option<f64>,
    #[serde(default)]
    to_y: Option<f64>,
    #[serde(default)]
    w: Option<f64>,
    #[serde(default)]
    h: Option<f64>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    keys: Option<String>,
    #[serde(default)]
    dx: Option<i32>,
    #[serde(default)]
    dy: Option<i32>,
    #[serde(default)]
    app: Option<String>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    value: Option<String>,
    #[serde(default)]
    window_id: Option<i64>,
    #[serde(default)]
    script: Option<String>,
    #[serde(default)]
    timeout_ms: Option<u64>,
    #[serde(default)]
    dry_run: Option<bool>,
}

#[cfg(windows)]
fn cap_output(mut out: ToolOutput, max_chars: usize) -> ToolOutput {
    if out.output.len() > max_chars {
        let mut cut = max_chars;
        while cut > 0 && !out.output.is_char_boundary(cut) {
            cut -= 1;
        }
        let dropped = out.output.len() - cut;
        let head = out.output[..cut].to_string();
        out.output = format!("{head}\n… [truncated {dropped} chars]");
    }
    out
}

#[cfg(windows)]
fn is_mutating(action: &str) -> bool {
    matches!(
        action,
        "move"
            | "click"
            | "double_click"
            | "right_click"
            | "drag"
            | "scroll"
            | "type"
            | "key"
            | "key_down"
            | "key_up"
            | "activate_app"
            | "hide_app"
            | "quit_app"
            | "focus_window"
            | "move_window"
            | "resize_window"
            | "minimize_window"
            | "close_window"
            | "set_clipboard"
            | "notify"
            | "set_brightness"
    )
}

#[async_trait]
impl Tool for WindowsComputerTool {
    fn name(&self) -> &str {
        "windows_computer_use"
    }

    fn description(&self) -> &str {
        "Control the Windows desktop: see the screen (screenshot/ocr/ui tree), click and type \
         (visible coordinate input), manage apps and windows, use the clipboard, and run \
         PowerShell scripts. Coordinates are in pixels (top-left origin). This is the user's live \
         machine: act only on the requested task (not proactively). \
         Call action='discover' for the full action set."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["action"],
            "properties": {
                "intent": super::intent_schema_property(),
                "action": {
                    "type": "string",
                    "description": "Common: screenshot, ocr, ui (see); click, type, key (input); \
                        find_element; list_apps, list_windows, activate_app, focus_window; \
                        get_clipboard; run_powershell; discover (load full action set). \
                        Many more actions take the same fields; call discover for their params."
                },
                "category": {
                    "type": "string",
                    "enum": ["mouse","keyboard","observe","apps","windows","clipboard","scripting","system","all"],
                    "description": "For action='discover': which group to return full action specs for."
                },
                "x": { "type": "number", "description": "Screen X in pixels (top-left origin)." },
                "y": { "type": "number", "description": "Screen Y in pixels." },
                "text": { "type": "string", "description": "Text for type / set_clipboard / notify." },
                "keys": { "type": "string", "description": "Key chord, e.g. ctrl+c, alt+tab, win+r, return, esc." },
                "app": { "type": "string", "description": "Target app/process name (for window/app management)." },
                "title": { "type": "string", "description": "Window title substring for find_element." },
                "value": { "type": "string", "description": "Value to match (find_element)." },
                "script": { "type": "string", "description": "PowerShell script source (run_powershell)." },
                "to_x": { "type": "number" },
                "to_y": { "type": "number" },
                "dx": { "type": "integer" },
                "dy": { "type": "integer" },
                "w": { "type": "number" },
                "h": { "type": "number" },
                "window_id": { "type": "integer", "description": "Window handle (HWND) ID from list_windows." },
                "timeout_ms": { "type": "integer" },
                "dry_run": { "type": "boolean", "description": "Mutating actions: report intended action without doing it." }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let parsed: ComputerInput =
            serde_json::from_value(input).context("invalid `windows_computer_use` tool input")?;
        tokio::task::spawn_blocking(move || run(parsed))
            .await
            .context("windows_computer_use tool task panicked")?
    }
}

#[cfg(not(windows))]
fn run(_input: ComputerInput) -> Result<ToolOutput> {
    bail!("The `windows_computer_use` tool is only supported on Windows.")
}

#[cfg(windows)]
fn run(input: ComputerInput) -> Result<ToolOutput> {
    if input.dry_run == Some(true) && is_mutating(&input.action) {
        return Ok(ToolOutput::new(format!(
            "[dry_run] would perform '{}' (no action taken). \
             Re-issue without dry_run to execute.",
            input.action
        )));
    }
    let result = dispatch(&input.action, &input);
    result.map(|o| cap_output(o, 16_000))
}

#[cfg(windows)]
fn dispatch(action: &str, input: &ComputerInput) -> Result<ToolOutput> {
    match action {
        "discover" => discover::discover(input.category.as_deref()),
        "screenshot" => screen::screenshot(),
        "ocr" => screen::ocr(input.x, input.y, input.w, input.h),
        "ui" => win::ui_tree(),
        "cursor" => {
            let p = input::cursor_pos()?;
            Ok(ToolOutput::new(format!("cursor at ({}, {})", p.0, p.1))
                .with_metadata(json!({ "x": p.0, "y": p.1 })))
        }
        "move" => {
            let (x, y) = require_xy(input)?;
            input::move_to(x, y)?;
            Ok(ToolOutput::new(format!("moved cursor to ({x:.0}, {y:.0})")))
        }
        "click" => {
            let (x, y) = input::click(input.x, input.y, 1)?;
            Ok(ToolOutput::new(format!("clicked at ({x:.0}, {y:.0})")))
        }
        "double_click" => {
            let (x, y) = input::click(input.x, input.y, 2)?;
            Ok(ToolOutput::new(format!("double-clicked at ({x:.0}, {y:.0})")))
        }
        "right_click" => {
            let (x, y) = input::right_click(input.x, input.y)?;
            Ok(ToolOutput::new(format!("right-clicked at ({x:.0}, {y:.0})")))
        }
        "drag" => {
            let (x, y) = require_xy(input)?;
            match (input.to_x, input.to_y) {
                (Some(tx), Some(ty)) => {
                    input::drag(x, y, tx, ty)?;
                    Ok(ToolOutput::new(format!("dragged from ({x:.0},{y:.0}) to ({tx:.0},{ty:.0})")))
                }
                _ => bail!("action='drag' requires `to_x` and `to_y`"),
            }
        }
        "scroll" => {
            let dx = input.dx.unwrap_or(0);
            let dy = input.dy.unwrap_or(0);
            if dx == 0 && dy == 0 {
                bail!("action='scroll' requires non-zero `dx` and/or `dy`");
            }
            input::scroll(input.x, input.y, dx, dy)?;
            Ok(ToolOutput::new(format!("scrolled dx={dx} dy={dy}")))
        }
        "type" => {
            let text = input.text.as_deref()
                .filter(|s| !s.is_empty())
                .context("action='type' requires non-empty `text`")?;
            input::type_text(text)?;
            Ok(ToolOutput::new(format!("typed {} characters", text.chars().count())))
        }
        "key" => {
            let keys = input.keys.as_deref()
                .filter(|s| !s.is_empty())
                .context("action='key' requires a `keys` chord, e.g. 'ctrl+c'")?;
            input::key_chord(keys)?;
            Ok(ToolOutput::new(format!("pressed {keys}")))
        }
        "list_apps" => win::list_apps(),
        "list_windows" => win::list_windows(),
        "activate_app" => win::activate_app(req_app(input)?),
        "quit_app" => win::quit_app(req_app(input)?),
        "focus_window" => win::focus_window(req_app(input)?),
        "move_window" => {
            let (x, y) = require_xy(input)?;
            win::move_window(req_app(input)?, x, y)
        }
        "resize_window" => {
            let w = input.w.context("resize_window requires `w`")?;
            let h = input.h.context("resize_window requires `h`")?;
            win::resize_window(req_app(input)?, w, h)
        }
        "minimize_window" => win::minimize_window(req_app(input)?),
        "close_window" => win::close_window(req_app(input)?),
        "get_clipboard" => sys::get_clipboard(),
        "set_clipboard" => {
            let t = input.text.as_deref()
                .context("set_clipboard requires `text`")?;
            sys::set_clipboard(t)
        }
        "run_powershell" => {
            let s = input.script.as_deref()
                .context("run_powershell requires `script`")?;
            sys::run_powershell(s)
        }
        other => bail!("Unknown windows_computer_use action: {other}. Call action='discover' (category='all') to list every action."),
    }
}

fn require_xy(input: &ComputerInput) -> Result<(f64, f64)> {
    match (input.x, input.y) {
        (Some(x), Some(y)) => Ok((x, y)),
        _ => bail!("action='{}' requires both `x` and `y`", input.action),
    }
}

fn req_app<'a>(input: &'a ComputerInput) -> Result<&'a str> {
    input.app.as_deref()
        .with_context(|| format!("action='{}' requires `app`", input.action))
}
