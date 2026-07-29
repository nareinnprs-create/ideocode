//! IDEOCODE Mentor Mode (P3)
//!
//! AI explains WHY it does things, not just WHAT.
//! Educational annotations with code explanations.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum MentorLevel {
    Beginner,
    Intermediate,
    Advanced,
}

impl MentorLevel {
    pub fn label(&self) -> &str {
        match self {
            MentorLevel::Beginner => "Beginner",
            MentorLevel::Intermediate => "Intermediate",
            MentorLevel::Advanced => "Advanced",
        }
    }

    pub fn explanation_depth(&self) -> usize {
        match self {
            MentorLevel::Beginner => 3, // Very detailed
            MentorLevel::Intermediate => 2, // Moderate
            MentorLevel::Advanced => 1, // Brief
        }
    }
}

/// Render mentor mode indicator.
pub fn render_mentor_indicator(level: &MentorLevel) -> Line<'static> {
    let color = match level {
        MentorLevel::Beginner => neon_green(),
        MentorLevel::Intermediate => neon_cyan(),
        MentorLevel::Advanced => neon_magenta(),
    };

    Line::from(vec![
        Span::styled(
            "📚 ",
            Style::default().fg(neon_purple()),
        ),
        Span::styled(
            "Mentor Mode",
            Style::default()
                .fg(color)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!(" ({})", level.label()),
            Style::default().fg(dim_color()),
        ),
    ])
}

/// Render explanation annotation.
pub fn render_explanation(
    code: &str,
    explanation: &str,
    level: &MentorLevel,
) -> Vec<Line<'static>> {
    let mut lines = vec![
        Line::from(Span::styled(
            "```",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            code.to_string(),
            Style::default().fg(neon_green()),
        )),
        Line::from(Span::styled(
            "```",
            Style::default().fg(dim_color()),
        )),
    ];

    // Explanation
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "💡 Why:",
        Style::default()
            .fg(neon_yellow())
            .add_modifier(Modifier::BOLD),
    )));

    // Split explanation into lines based on level
    let max_line_length = match level {
        MentorLevel::Beginner => 60,
        MentorLevel::Intermediate => 80,
        MentorLevel::Advanced => 100,
    };

    for line in explanation.lines() {
        for chunk in line.chars().collect::<Vec<_>>().chunks(max_line_length) {
            let chunk_str: String = chunk.iter().collect();
            lines.push(Line::from(Span::styled(
                format!("  {}", chunk_str),
                Style::default().fg(dim_color()),
            )));
        }
    }

    lines
}

/// Render concept explanation.
pub fn render_concept(concept: &str, example: &str) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            format!("📖 Concept: {}", concept),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Example:",
            Style::default().fg(neon_yellow()),
        )),
        Line::from(Span::styled(
            format!("  {}", example),
            Style::default().fg(neon_green()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mentor_levels() {
        assert_eq!(MentorLevel::Beginner.explanation_depth(), 3);
        assert_eq!(MentorLevel::Advanced.explanation_depth(), 1);
    }
}
