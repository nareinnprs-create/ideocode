//! IDEOCODE Macro Recording (F4)
//!
//! Record sequences of actions. Replay with one key. Share macros.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct Macro {
    pub name: String,
    pub actions: Vec<MacroAction>,
    pub created_at: String,
    pub author: String,
}

#[derive(Debug, Clone)]
pub struct MacroAction {
    pub kind: ActionKind,
    pub data: String,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ActionKind {
    KeyPress,
    Type,
    Wait,
    Command,
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
