// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Macro Recording (F4)
//!
//! Record sequences of actions. Replay with one key. Share macros.
//! Macros are saved to ~/.ideocode/macros/ as JSON files.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Macro {
    pub name: String,
    pub actions: Vec<MacroAction>,
    pub created_at: String,
    pub author: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MacroAction {
    pub kind: ActionKind,
    pub data: String,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ActionKind {
    KeyPress,
    Type,
    Wait,
    Command,
}

/// Get macros directory path.
fn macros_dir() -> Option<std::path::PathBuf> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()?;
    let dir = std::path::PathBuf::from(home).join(".ideocode").join("macros");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

/// Save a macro to disk.
pub fn save_macromac(m: &Macro) -> Result<(), String> {
    let dir = macros_dir().ok_or("Cannot determine macros directory")?;
    let filename = format!("{}.json", m.name.replace(' ', "_").to_lowercase());
    let path = dir.join(filename);
    let json = serde_json::to_string_pretty(m).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to save: {}", e))
}

/// Load all macros from disk.
pub fn load_macros() -> Vec<Macro> {
    let Some(dir) = macros_dir() else { return Vec::new() };
    let mut macros = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json")
                && let Ok(content) = std::fs::read_to_string(&path)
                    && let Ok(m) = serde_json::from_str::<Macro>(&content) {
                        macros.push(m);
                    }
        }
    }
    macros.sort_by(|a, b| a.name.cmp(&b.name));
    macros
}

/// Delete a macro from disk.
pub fn delete_macro(name: &str) -> Result<(), String> {
    let dir = macros_dir().ok_or("Cannot determine macros directory")?;
    let filename = format!("{}.json", name.replace(' ', "_").to_lowercase());
    let path = dir.join(filename);
    std::fs::remove_file(&path).map_err(|e| format!("Failed to delete: {}", e))
}

/// Render macro recorder UI.
pub fn render_macro_recorder(
    recording: bool,
    macro_name: &str,
    action_count: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        if recording { "🔴 Recording" } else { "⏺️ Macro Recorder" },
        Style::default()
            .fg(if recording { rgb(255, 80, 80) } else { dim_color() })
            .add_modifier(Modifier::BOLD),
    )));

    if recording {
        lines.push(Line::from(vec![
            Span::styled("  Name: ", Style::default().fg(dim_color())),
            Span::styled(macro_name.to_string(), Style::default().fg(neon_cyan())),
        ]));
        lines.push(Line::from(vec![
            Span::styled("  Actions: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", action_count),
                Style::default().fg(neon_green()),
            ),
        ]));
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "  Press Ctrl+Shift+R to stop recording",
            Style::default().fg(neon_yellow()),
        )));
    } else {
        lines.push(Line::from(Span::styled(
            "  Press Ctrl+Shift+R to start recording",
            Style::default().fg(dim_color()),
        )));
    }

    lines
}

/// Render macro list.
pub fn render_macro_list(macros: &[Macro], selected: usize) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "📹 Macros",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    if macros.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No macros recorded yet",
            Style::default().fg(dim_color()),
        )));
    } else {
        for (i, mac) in macros.iter().enumerate() {
            let is_selected = i == selected;
            lines.push(Line::from(vec![
                Span::styled(
                    if is_selected { "▸ " } else { "  " },
                    Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
                ),
                Span::styled(
                    mac.name.clone(),
                    Style::default()
                        .fg(if is_selected { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
                ),
                Span::styled(
                    format!(" ({} actions)", mac.actions.len()),
                    Style::default().fg(dim_color()),
                ),
            ]));
        }
    }

    lines
}

/// Render macro playback.
pub fn render_macro_playback(
    macro_name: &str,
    current_action: usize,
    total_actions: usize,
) -> Vec<Line<'static>> {
    let progress = if total_actions > 0 {
        current_action as f32 / total_actions as f32
    } else {
        0.0
    };

    let bar_width = 20;
    let filled = (progress * bar_width as f32) as usize;
    let empty = bar_width - filled;
    let bar = "█".repeat(filled) + &"░".repeat(empty);

    vec![
        Line::from(Span::styled(
            format!("▶ Playing: {}", macro_name),
            Style::default()
                .fg(neon_green())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            bar,
            Style::default().fg(neon_cyan()),
        )),
        Line::from(Span::styled(
            format!("Action {}/{}", current_action + 1, total_actions),
            Style::default().fg(dim_color()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn macro_recorder_render() {
        let lines = render_macro_recorder(true, "test", 5);
        assert!(!lines.is_empty());
    }

    #[test]
    fn macro_list_empty() {
        let lines = render_macro_list(&[], 0);
        assert!(!lines.is_empty());
    }
}
