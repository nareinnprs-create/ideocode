// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Memory Usage Visual (H4)
//!
//! Visual memory usage display with color coding.
//! Always visible in status area.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render memory usage bar.
pub fn render_memory_usage(used_mb: f32, total_mb: f32) -> Line<'static> {
    let percentage = if total_mb > 0.0 { used_mb / total_mb } else { 0.0 };
    let bar_width = 15;
    let filled = (percentage * bar_width as f32) as usize;
    let empty = bar_width - filled;

    let bar = "█".repeat(filled) + &"░".repeat(empty);

    let color = if percentage < 0.5 {
        neon_green()
    } else if percentage < 0.8 {
        neon_yellow()
    } else {
        rgb(255, 80, 80)
    };

    Line::from(vec![
        Span::styled(
            "🧠 ",
            Style::default().fg(neon_purple()),
        ),
        Span::styled(
            bar,
            Style::default().fg(color),
        ),
        Span::styled(
            format!(" {:.0}MB ({:.0}%)", used_mb, percentage * 100.0),
            Style::default().fg(dim_color()),
        ),
    ])
}

/// Render memory usage with breakdown.
pub fn render_memory_detailed(
    heap_mb: f32,
    stack_mb: f32,
    other_mb: f32,
) -> Vec<Line<'static>> {
    let total = heap_mb + stack_mb + other_mb;

    vec![
        Line::from(Span::styled(
            "🧠 Memory Usage",
            Style::default()
                .fg(neon_purple())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(render_memory_usage(heap_mb + stack_mb + other_mb, 1024.0)),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Heap:  ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}MB", heap_mb),
                Style::default().fg(neon_cyan()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Stack: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}MB", stack_mb),
                Style::default().fg(neon_green()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Other: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}MB", other_mb),
                Style::default().fg(neon_yellow()),
            ),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Total: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}MB", total),
                Style::default()
                    .fg(neon_cyan())
                    .add_modifier(Modifier::BOLD),
            ),
        ]),
    ]
}

/// Render mini memory indicator.
pub fn render_memory_mini(used_mb: f32) -> Line<'static> {
    let color = if used_mb < 100.0 {
        neon_green()
    } else if used_mb < 500.0 {
        neon_yellow()
    } else {
        rgb(255, 80, 80)
    };

    Line::from(vec![
        Span::styled(
            "🧠",
            Style::default().fg(neon_purple()),
        ),
        Span::styled(
            format!(" {:.0}MB", used_mb),
            Style::default().fg(color),
        ),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn memory_usage_render() {
        let line = render_memory_usage(512.0, 1024.0);
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn memory_mini_render() {
        let line = render_memory_mini(256.0);
        assert!(!line.spans.is_empty());
    }
}
