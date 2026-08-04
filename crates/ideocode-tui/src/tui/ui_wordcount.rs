// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Word Count (H5)
//!
//! Live word/token/line count for input and total session.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render word count for input.
pub fn render_input_word_count(input: &str) -> Line<'static> {
    let words = input.split_whitespace().count();
    let chars = input.chars().count();
    let lines = input.lines().count();

    Line::from(vec![
        Span::styled("📝 ", Style::default().fg(neon_cyan())),
        Span::styled(
            format!("{}w {}c {}L", words, chars, lines),
            Style::default().fg(dim_color()),
        ),
    ])
}

/// Render session word count.
pub fn render_session_word_count(
    total_words: usize,
    total_chars: usize,
    total_lines: usize,
) -> Line<'static> {
    Line::from(vec![
        Span::styled("📊 ", Style::default().fg(neon_purple())),
        Span::styled(
            format!("{}w {}c {}L", total_words, total_chars, total_lines),
            Style::default().fg(dim_color()),
        ),
    ])
}

/// Render detailed word count.
pub fn render_word_count_detailed(
    input_words: usize,
    input_chars: usize,
    input_lines: usize,
    session_words: usize,
    session_chars: usize,
    session_lines: usize,
) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "📝 Word Count",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled("  Input:", Style::default().fg(neon_yellow()))),
        Line::from(vec![
            Span::styled("    Words: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", input_words),
                Style::default().fg(neon_green()),
            ),
            Span::styled("  Chars: ", Style::default().fg(dim_color())),
            Span::styled(format!("{}", input_chars), Style::default().fg(neon_cyan())),
            Span::styled("  Lines: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", input_lines),
                Style::default().fg(neon_magenta()),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  Session:",
            Style::default().fg(neon_yellow()),
        )),
        Line::from(vec![
            Span::styled("    Words: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", session_words),
                Style::default().fg(neon_green()),
            ),
            Span::styled("  Chars: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", session_chars),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled("  Lines: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}", session_lines),
                Style::default().fg(neon_magenta()),
            ),
        ]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn input_word_count() {
        let line = render_input_word_count("Hello world");
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn session_word_count() {
        let line = render_session_word_count(100, 500, 10);
        assert!(!line.spans.is_empty());
    }
}
