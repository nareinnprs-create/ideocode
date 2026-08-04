// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Big Mode (F9)
//!
//! Spacious layout with large text. For presentations and learning.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render big mode toggle.
pub fn render_big_mode_toggle(enabled: bool) -> Line<'static> {
    Line::from(vec![
        Span::styled("📺 Big Mode: ", Style::default().fg(dim_color())),
        Span::styled(
            if enabled { "ON" } else { "OFF" },
            Style::default()
                .fg(if enabled {
                    neon_green()
                } else {
                    rgb(255, 80, 80)
                })
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

/// Render big text.
pub fn render_big_text(text: &str) -> Vec<Line<'static>> {
    let lines: Vec<Line<'static>> = text
        .lines()
        .map(|line| {
            Line::from(Span::styled(
                line.to_string(),
                Style::default()
                    .fg(neon_cyan())
                    .add_modifier(Modifier::BOLD),
            ))
        })
        .collect();

    if lines.is_empty() {
        vec![Line::from(Span::styled(
            text.to_string(),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        ))]
    } else {
        lines
    }
}

/// Render big header.
pub fn render_big_header(text: &str) -> Vec<Line<'static>> {
    let width = text.len() + 4;
    let border = "═".repeat(width);

    vec![
        Line::from(Span::styled(
            format!("╔{}╗", border),
            Style::default().fg(neon_cyan()),
        )),
        Line::from(Span::styled(
            format!("║  {}  ║", text),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("╚{}╝", border),
            Style::default().fg(neon_cyan()),
        )),
    ]
}

/// Render big message.
pub fn render_big_message(role: &str, content: &str) -> Vec<Line<'static>> {
    let role_color = match role {
        "user" => neon_cyan(),
        "assistant" => neon_green(),
        "system" => neon_yellow(),
        _ => dim_color(),
    };

    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        format!("{}:", role.to_uppercase()),
        Style::default().fg(role_color).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for line in content.lines() {
        lines.push(Line::from(Span::styled(
            format!("  {}", line),
            Style::default().fg(dim_color()),
        )));
    }

    lines
}

/// Render big input.
pub fn render_big_input(input: &str, _cursor_pos: usize) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        "You:",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for line in input.lines() {
        lines.push(Line::from(Span::styled(
            format!("  {}", line),
            Style::default().fg(neon_green()),
        )));
    }

    if input.is_empty() {
        lines.push(Line::from(Span::styled(
            "  (type your message...)",
            Style::default().fg(dim_color()),
        )));
    }

    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn big_text_render() {
        let lines = render_big_text("Hello");
        assert!(!lines.is_empty());
    }

    #[test]
    fn big_header_render() {
        let lines = render_big_header("TEST");
        assert_eq!(lines.len(), 3);
    }
}
