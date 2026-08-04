// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Glassmorphism Panels (V7)
//!
//! Frosted glass effect panels with blur simulation.
//! Uses semi-transparent backgrounds and subtle borders.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Padding};

/// Render a glassmorphism panel.
pub fn glass_panel<'a>(title: &'a str, _width: u16, _height: u16) -> Block<'a> {
    Block::default()
        .borders(Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(Style::default().fg(glass_border_color()))
        .style(Style::default().bg(glass_bg()))
        .title(Span::styled(
            format!(" {} ", title),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        ))
        .padding(Padding {
            top: 1,
            bottom: 1,
            left: 2,
            right: 2,
        })
}

/// Glassmorphism background color (semi-transparent effect).
pub fn glass_bg() -> Color {
    rgb(20, 20, 30)
}

/// Glassmorphism border color (subtle glow).
pub fn glass_border_color() -> Color {
    rgb(60, 60, 80)
}

/// Glassmorphism highlight color.
pub fn glass_highlight() -> Color {
    rgb(100, 100, 140)
}

/// Render a glass card (for achievements, cards, etc.).
pub fn glass_card<'a>(title: &'a str, content: Vec<Line<'a>>) -> Vec<Line<'a>> {
    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        format!("  ╭─{}─╮", "─".repeat(title.len() + 2)),
        Style::default().fg(glass_border_color()),
    )));
    lines.push(Line::from(Span::styled(
        format!("  │ {} │", title),
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  ╰─{}─╯", "─".repeat(title.len() + 2)),
        Style::default().fg(glass_border_color()),
    )));
    for line in content {
        lines.push(Line::from(format!("  {}", line)));
    }
    lines
}

/// Render frosted glass overlay for modals.
pub fn frosted_overlay(width: u16, height: u16) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    let filler = "░".repeat(width as usize);
    for _ in 0..height {
        lines.push(Line::from(Span::styled(
            filler.clone(),
            Style::default().fg(glass_bg()).bg(glass_bg()),
        )));
    }
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glass_colors_differ() {
        assert_ne!(glass_bg(), glass_border_color());
        assert_ne!(glass_border_color(), glass_highlight());
    }
}
