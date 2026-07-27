//! IDEOCODE Gesture Pad (I10)
//!
//! Numbered overlay (hold Space). Press 1-9 for quick actions.
//! Visual gesture system for power users.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct GestureAction {
    pub key: char,
    pub label: String,
    pub icon: String,
    pub action: String,
}

/// Get gesture pad actions.
pub fn get_gesture_actions() -> Vec<GestureAction> {
    vec![
        GestureAction { key: '1', label: "Copy".to_string(), icon: "📋".to_string(), action: "copy".to_string() },
        GestureAction { key: '2', label: "Paste".to_string(), icon: "📄".to_string(), action: "paste".to_string() },
        GestureAction { key: '3', label: "Clear".to_string(), icon: "🗑️".to_string(), action: "clear".to_string() },
        GestureAction { key: '4', label: "Help".to_string(), icon: "❓".to_string(), action: "help".to_string() },
        GestureAction { key: '5', label: "Theme".to_string(), icon: "🎨".to_string(), action: "theme".to_string() },
        GestureAction { key: '6', label: "Mode".to_string(), icon: "🎭".to_string(), action: "mode".to_string() },
        GestureAction { key: '7', label: "Stats".to_string(), icon: "📊".to_string(), action: "stats".to_string() },
        GestureAction { key: '8', label: "Sessions".to_string(), icon: "📁".to_string(), action: "sessions".to_string() },
        GestureAction { key: '9', label: "Settings".to_string(), icon: "⚙️".to_string(), action: "settings".to_string() },
    ]
}

/// Render gesture pad overlay.
pub fn render_gesture_pad(visible: bool) -> Vec<Line<'static>> {
    if !visible {
        return vec![];
    }

    let actions = get_gesture_actions();
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "🎯 Gesture Pad",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        "Hold Space + Press 1-9",
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(""));

    for action in &actions {
        lines.push(Line::from(vec![
            Span::styled(
                format!("[{}] ", action.key),
                Style::default()
                    .fg(neon_yellow())
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!("{} {}", action.icon, action.label),
                Style::default().fg(neon_cyan()),
            ),
        ]));
    }

    lines
}

/// Render compact gesture pad (single line).
pub fn render_gesture_pad_compact() -> Line<'static> {
    Line::from(vec![
        Span::styled(
            "🎯 ",
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            "Hold Space for gestures",
            Style::default().fg(dim_color()),
        ),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gesture_actions() {
        let actions = get_gesture_actions();
        assert_eq!(actions.len(), 9);
    }
}
