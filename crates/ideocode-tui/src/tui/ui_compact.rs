// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Compact Mode (F8)
//!
//! Ultra-dense layout. Remove padding, max info per line. Terminal-native.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render compact mode toggle.
pub fn render_compact_mode_toggle(enabled: bool) -> Line<'static> {
    Line::from(vec![
        Span::styled("📦 Compact Mode: ", Style::default().fg(dim_color())),
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

/// Render compact status bar.
pub fn render_compact_status(model: &str, tokens: u64, cost: f32) -> Line<'static> {
    Line::from(vec![
        Span::styled(format!("{} ", model), Style::default().fg(neon_cyan())),
        Span::styled(format!("{}tok ", tokens), Style::default().fg(neon_green())),
        Span::styled(format!("${:.4}", cost), Style::default().fg(neon_yellow())),
    ])
}

/// Render compact message.
pub fn render_compact_message(role: &str, content: &str, max_width: usize) -> Line<'static> {
    let truncated = if content.len() > max_width {
        format!("{}...", &content[..max_width.saturating_sub(3)])
    } else {
        content.to_string()
    };

    let role_color = match role {
        "user" => neon_cyan(),
        "assistant" => neon_green(),
        "system" => neon_yellow(),
        _ => dim_color(),
    };

    Line::from(vec![
        Span::styled(format!("{}: ", role), Style::default().fg(role_color)),
        Span::styled(truncated, Style::default().fg(dim_color())),
    ])
}

/// Render compact input.
pub fn render_compact_input(input: &str, cursor_pos: usize) -> Line<'static> {
    let truncated = if input.len() > 50 {
        let start = cursor_pos.saturating_sub(25);
        let end = (start + 50).min(input.len());
        format!("...{}...", &input[start..end])
    } else {
        input.to_string()
    };

    Line::from(vec![
        Span::styled("> ", Style::default().fg(neon_green())),
        Span::styled(truncated, Style::default().fg(neon_cyan())),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_status_render() {
        let line = render_compact_status("claude-4", 1000, 0.01);
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn compact_message_truncate() {
        let line = render_compact_message("user", "Hello world", 10);
        assert!(!line.spans.is_empty());
    }
}
