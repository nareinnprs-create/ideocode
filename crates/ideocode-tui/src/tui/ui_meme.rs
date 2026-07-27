//! IDEOCODE Meme Generator (S6)
//!
//! `/meme` command: describe a meme, AI generates ASCII art version.
//! Share it with the community.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render meme generator UI.
pub fn render_meme_generator() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "😂 Meme Generator",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Describe a meme and I'll generate it!",
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Examples:",
            Style::default().fg(neon_yellow()),
        )),
        Line::from(Span::styled(
            "  /meme programmer debugging at 3am",
            Style::default().fg(neon_green()),
        )),
        Line::from(Span::styled(
            "  /meme when the code works on first try",
            Style::default().fg(neon_green()),
        )),
        Line::from(Span::styled(
            "  /meme git push force on main",
            Style::default().fg(neon_green()),
        )),
    ]
}

/// Render generated meme (ASCII art).
pub fn render_meme(ascii_art: &str, caption: &str) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(neon_cyan()),
    )));

    for line in ascii_art.lines() {
        lines.push(Line::from(Span::styled(
            line.to_string(),
            Style::default().fg(neon_green()),
        )));
    }

    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(neon_cyan()),
    )));

    lines.push(Line::from(Span::styled(
        format!("💬 {}", caption),
        Style::default().fg(neon_yellow()),
    )));

    lines
}

/// Render meme template library.
pub fn render_meme_templates() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "📚 Meme Templates",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  1. ", Style::default().fg(neon_yellow())),
            Span::styled("Drake Hotline", Style::default().fg(neon_cyan())),
        ]),
        Line::from(vec![
            Span::styled("  2. ", Style::default().fg(neon_yellow())),
            Span::styled("Distracted Boyfriend", Style::default().fg(neon_cyan())),
        ]),
        Line::from(vec![
            Span::styled("  3. ", Style::default().fg(neon_yellow())),
            Span::styled("Change My Mind", Style::default().fg(neon_cyan())),
        ]),
        Line::from(vec![
            Span::styled("  4. ", Style::default().fg(neon_yellow())),
            Span::styled("Expanding Brain", Style::default().fg(neon_cyan())),
        ]),
        Line::from(vec![
            Span::styled("  5. ", Style::default().fg(neon_yellow())),
            Span::styled("This is Fine", Style::default().fg(neon_cyan())),
        ]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn meme_generator_render() {
        let lines = render_meme_generator();
        assert!(!lines.is_empty());
    }

    #[test]
    fn meme_render() {
        let lines = render_meme("  /\\_/\\\n ( o.o )\n  > ^ <", "Cat meme");
        assert!(!lines.is_empty());
    }
}
