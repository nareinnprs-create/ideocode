// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::{Context, Result, bail};
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

#[cfg(target_os = "linux")]
mod discover;
#[cfg(target_os = "linux")]
mod screen;
#[cfg(target_os = "linux")]
mod sys;
#[cfg(target_os = "linux")]
mod win;

pub struct LinuxComputerTool;

impl LinuxComputerTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Debug, Deserialize)]
#[allow(
    dead_code,
    reason = "fields used for future dispatch actions; kept for schema completeness"
)]
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

#[cfg(target_os = "linux")]
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

#[cfg(target_os = "linux")]
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
            | "activate_app"
            | "quit_app"
            | "focus_window"
            | "move_window"
            | "resize_window"
            | "minimize_window"
            | "close_window"
            | "set_clipboard"
            | "notify"
    )
}

#[async_trait]
impl Tool for LinuxComputerTool {
    fn name(&self) -> &str {
        "linux_computer_use"
    }

    fn description(&self) -> &str {
        "Control the Linux desktop: see the screen (screenshot/ocr/ui tree), click and type \
         (visible coordinate input), manage apps and windows, use the clipboard, and run \
         shell commands. Requires xdotool, xclip/wl-clipboard, scrot/import for full functionality. \
         Coordinates are in pixels (top-left origin). \
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
                        get_clipboard; run_shell; discover (load full action set)."
                },
                "category": {
                    "type": "string",
                    "enum": ["mouse","keyboard","observe","apps","windows","clipboard","scripting","system","all"],
                    "description": "For action='discover': which group to return full action specs for."
                },
                "x": { "type": "number", "description": "Screen X in pixels (top-left origin)." },
                "y": { "type": "number", "description": "Screen Y in pixels." },
                "text": { "type": "string", "description": "Text for type / set_clipboard / notify." },
                "keys": { "type": "string", "description": "Key chord, e.g. ctrl+c, alt+tab, super+r." },
                "app": { "type": "string", "description": "Target app/process name." },
                "title": { "type": "string", "description": "Window title substring." },
                "value": { "type": "string", "description": "Value to match for find_element." },
                "script": { "type": "string", "description": "Shell script to run." },
                "to_x": { "type": "number" }, "to_y": { "type": "number" },
                "dx": { "type": "integer" }, "dy": { "type": "integer" },
                "w": { "type": "number" }, "h": { "type": "number" },
                "window_id": { "type": "integer" },
                "timeout_ms": { "type": "integer" },
                "dry_run": { "type": "boolean" }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let parsed: ComputerInput =
            serde_json::from_value(input).context("invalid `linux_computer_use` tool input")?;
        tokio::task::spawn_blocking(move || run(parsed))
            .await
            .context("linux_computer_use tool task panicked")?
    }
}

#[cfg(not(target_os = "linux"))]
fn run(_input: ComputerInput) -> Result<ToolOutput> {
    bail!("The `linux_computer_use` tool is only supported on Linux.")
}

#[cfg(target_os = "linux")]
fn run(input: ComputerInput) -> Result<ToolOutput> {
    if input.dry_run == Some(true) && is_mutating(&input.action) {
        return Ok(ToolOutput::new(format!(
            "[dry_run] would perform '{}' (no action taken). Re-issue without dry_run.",
            input.action
        )));
    }
    let result = dispatch(&input.action, &input);
    result.map(|o| cap_output(o, 16_000))
}

#[cfg(target_os = "linux")]
fn dispatch(action: &str, input: &ComputerInput) -> Result<ToolOutput> {
    match action {
        "discover" => discover::discover(input.category.as_deref()),
        "screenshot" => screen::screenshot(),
        "ocr" => screen::ocr(input.x, input.y, input.w, input.h),
        "cursor" => {
            let out = win::run_cmd(&["xdotool", "getmouselocation", "--shell"])?;
            Ok(ToolOutput::new(out))
        }
        "move" => {
            let (x, y) = require_xy(input)?;
            win::run_cmd(&[
                "xdotool",
                "mousemove",
                &format!("{x:.0}"),
                &format!("{y:.0}"),
            ])?;
            Ok(ToolOutput::new(format!("moved cursor to ({x:.0}, {y:.0})")))
        }
        "click" => {
            let (x, y) = require_xy(input)?;
            win::run_cmd(&[
                "xdotool",
                "mousemove",
                &format!("{x:.0}"),
                &format!("{y:.0}"),
                "click",
                "1",
            ])?;
            Ok(ToolOutput::new(format!("clicked at ({x:.0}, {y:.0})")))
        }
        "double_click" => {
            let (x, y) = require_xy(input)?;
            win::run_cmd(&[
                "xdotool",
                "mousemove",
                &format!("{x:.0}"),
                &format!("{y:.0}"),
                "click",
                "--repeat",
                "2",
                "1",
            ])?;
            Ok(ToolOutput::new(format!(
                "double-clicked at ({x:.0}, {y:.0})"
            )))
        }
        "right_click" => {
            let (x, y) = require_xy(input)?;
            win::run_cmd(&[
                "xdotool",
                "mousemove",
                &format!("{x:.0}"),
                &format!("{y:.0}"),
                "click",
                "3",
            ])?;
            Ok(ToolOutput::new(format!(
                "right-clicked at ({x:.0}, {y:.0})"
            )))
        }
        "type" => {
            let text = input.text.as_deref().context("type requires `text`")?;
            win::run_cmd(&["xdotool", "type", text])?;
            Ok(ToolOutput::new(format!("typed {} characters", text.len())))
        }
        "key" => {
            let keys = input.keys.as_deref().context("key requires `keys`")?;
            win::run_cmd(&["xdotool", "key", keys])?;
            Ok(ToolOutput::new(format!("pressed {keys}")))
        }
        "list_apps" => win::list_apps(),
        "list_windows" => win::list_windows(),
        "activate_app" => win::activate_app(req_app(input)?),
        "quit_app" => win::quit_app(req_app(input)?),
        "focus_window" => win::focus_window(req_app(input)?),
        "get_clipboard" => sys::get_clipboard(),
        "set_clipboard" => sys::set_clipboard(
            input
                .text
                .as_deref()
                .context("set_clipboard requires `text`")?,
        ),
        "run_shell" => {
            let s = input
                .script
                .as_deref()
                .context("run_shell requires `script`")?;
            sys::run_shell(s)
        }
        other => bail!("Unknown linux_computer_use action: {other}. Call discover category='all'."),
    }
}

fn require_xy(input: &ComputerInput) -> Result<(f64, f64)> {
    match (input.x, input.y) {
        (Some(x), Some(y)) => Ok((x, y)),
        _ => bail!("action='{}' requires both `x` and `y`", input.action),
    }
}

fn req_app<'a>(input: &'a ComputerInput) -> Result<&'a str> {
    input
        .app
        .as_deref()
        .with_context(|| format!("action='{}' requires `app`", input.action))
}
