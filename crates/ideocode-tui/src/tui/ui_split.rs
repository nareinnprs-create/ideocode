//! IDEOCODE Split Terminal (F10)
//!
//! Multiple AI conversations side by side.
//! Compare models, parallel tasks.

use crate::tui::color_support::rgb;
use crate::tui::ui_glass::glass_border_color;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct SplitPane {
    pub id: usize,
    pub title: String,
    pub model: String,
    pub active: bool,
    pub message_count: usize,
}

/// Render split terminal view.
pub fn render_split_terminal(
    panes: &[SplitPane],
    active_pane: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "🔲 Split Terminal",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    // Pane tabs
    let tab_spans: Vec<Span> = panes
        .iter()
        .enumerate()
        .flat_map(|(i, pane)| {
            let is_active = i == active_pane;
            vec![
                Span::styled(
                    format!("[{}]", if is_active { "▸" } else { " " }),
                    Style::default().fg(if is_active { neon_green() } else { dim_color() }),
                ),
                Span::styled(
                    format!(" {} ", pane.title),
                    Style::default()
                        .fg(if is_active { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_active { Modifier::BOLD } else { Modifier::empty() }),
                ),
                Span::styled(
                    format!("({} msgs) ", pane.message_count),
                    Style::default().fg(dim_color()),
                ),
            ]
        })
        .collect();
    lines.push(Line::from(tab_spans));
    lines.push(Line::from(""));

    // Active pane info
    if let Some(pane) = panes.get(active_pane) {
        lines.push(Line::from(Span::styled(
            "─".repeat(40),
            Style::default().fg(glass_border_color()),
        )));
        lines.push(Line::from(vec![
            Span::styled("Model: ", Style::default().fg(dim_color())),
            Span::styled(pane.model.clone(), Style::default().fg(neon_green())),
        ]));
        lines.push(Line::from(vec![
            Span::styled("Messages: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", pane.message_count),
                Style::default().fg(neon_cyan()),
            ),
        ]));
    }

    lines
}

/// Create a new split pane.
pub fn create_split_pane(id: usize, title: &str, model: &str) -> SplitPane {
    SplitPane {
        id,
        title: title.to_string(),
        model: model.to_string(),
        active: true,
        message_count: 0,
    }
}

/// Render split pane divider.
pub fn render_split_divider(height: u16) -> Vec<Line<'static>> {
    (0..height)
        .map(|_| {
            Line::from(Span::styled(
                "│",
                Style::default().fg(glass_border_color()),
            ))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_pane_creation() {
        let pane = create_split_pane(0, "Main", "claude-4");
        assert_eq!(pane.title, "Main");
        assert_eq!(pane.model, "claude-4");
    }
}
