//! IDEOCODE Message Reactions (I4)
//!
//! React to messages with emoji: 👍 🤔 💡 🔥 👀 😅

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum Reaction {
    Like,       // 👍
    Thinking,   // 🤔
    Lightbulb,  // 💡
    Fire,       // 🔥
    Eyes,       // 👀
    Laugh,      // 😅
}

impl Reaction {
    pub fn icon(&self) -> &str {
        match self {
            Reaction::Like => "👍",
            Reaction::Thinking => "🤔",
            Reaction::Lightbulb => "💡",
            Reaction::Fire => "🔥",
            Reaction::Eyes => "👀",
            Reaction::Laugh => "😅",
        }
    }

    pub fn key(&self) -> &str {
        match self {
            Reaction::Like => "l",
            Reaction::Thinking => "t",
            Reaction::Lightbulb => "i",
            Reaction::Fire => "f",
            Reaction::Eyes => "e",
            Reaction::Laugh => "h",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            Reaction::Like => neon_green(),
            Reaction::Thinking => neon_yellow(),
            Reaction::Lightbulb => neon_cyan(),
            Reaction::Fire => neon_orange(),
            Reaction::Eyes => neon_purple(),
            Reaction::Laugh => neon_magenta(),
        }
    }
}

/// Render reaction picker.
pub fn render_reaction_picker() -> Line<'static> {
    let reactions = vec![
        Reaction::Like,
        Reaction::Thinking,
        Reaction::Lightbulb,
        Reaction::Fire,
        Reaction::Eyes,
        Reaction::Laugh,
    ];

    let spans: Vec<Span> = reactions
        .iter()
        .flat_map(|r| {
            vec![
                Span::styled(
                    format!("[{}]", r.key()),
                    Style::default()
                        .fg(r.color())
                        .add_modifier(Modifier::BOLD),
                ),
                Span::styled(
                    format!(" {} ", r.icon()),
                    Style::default().fg(r.color()),
                ),
            ]
        })
        .collect();

    Line::from(spans)
}

/// Render a reaction on a message.
pub fn render_reaction(reaction: &Reaction) -> Span<'static> {
    Span::styled(
        format!(" {}", reaction.icon()),
        Style::default()
            .fg(reaction.color())
            .add_modifier(Modifier::BOLD),
    )
}

/// Parse reaction from key press.
pub fn parse_reaction(key: char) -> Option<Reaction> {
    match key {
        'l' => Some(Reaction::Like),
        't' => Some(Reaction::Thinking),
        'i' => Some(Reaction::Lightbulb),
        'f' => Some(Reaction::Fire),
        'e' => Some(Reaction::Eyes),
        'h' => Some(Reaction::Laugh),
        _ => None,
    }
}

/// Reaction summary for a message.
#[derive(Debug, Default, Clone)]
pub struct ReactionSummary {
    pub reactions: Vec<(Reaction, usize)>,
}

impl ReactionSummary {
    pub fn render(&self) -> Line<'static> {
        if self.reactions.is_empty() {
            return Line::from("");
        }

        let spans: Vec<Span> = self
            .reactions
            .iter()
            .flat_map(|(r, count)| {
                vec![
                    Span::styled(
                        r.icon().to_string(),
                        Style::default().fg(r.color()),
                    ),
                    Span::styled(
                        format!("{} ", count),
                        Style::default().fg(dim_color()),
                    ),
                ]
            })
            .collect();

        Line::from(spans)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_reaction_keys() {
        assert_eq!(parse_reaction('l'), Some(Reaction::Like));
        assert_eq!(parse_reaction('t'), Some(Reaction::Thinking));
        assert_eq!(parse_reaction('f'), Some(Reaction::Fire));
        assert_eq!(parse_reaction('x'), None);
    }
}
