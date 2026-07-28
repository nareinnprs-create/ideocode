//! IDEOCODE Personality Modes (P1)
//!
//! Six modes that change the AI's tone, humor, and response style:
//! Professional, Casual, GenZ, Academic, Witty, Zen

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum PersonalityMode {
    Professional,
    Casual,
    GenZ,
    Academic,
    Witty,
    Zen,
}

impl PersonalityMode {
    pub fn as_str(&self) -> &str {
        match self {
            PersonalityMode::Professional => "professional",
            PersonalityMode::Casual => "casual",
            PersonalityMode::GenZ => "genz",
            PersonalityMode::Academic => "academic",
            PersonalityMode::Witty => "witty",
            PersonalityMode::Zen => "zen",
        }
    }

    pub fn display_name(&self) -> &str {
        match self {
            PersonalityMode::Professional => "Professional",
            PersonalityMode::Casual => "Casual",
            PersonalityMode::GenZ => "Gen Z",
            PersonalityMode::Academic => "Academic",
            PersonalityMode::Witty => "Witty",
            PersonalityMode::Zen => "Zen",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            PersonalityMode::Professional => "💼",
            PersonalityMode::Casual => "😎",
            PersonalityMode::GenZ => "🔥",
            PersonalityMode::Academic => "📚",
            PersonalityMode::Witty => "😄",
            PersonalityMode::Zen => "🧘",
        }
    }

    pub fn system_prompt_suffix(&self) -> &str {
        match self {
            PersonalityMode::Professional => {
                "Respond professionally. Be clear, concise, and formal."
            }
            PersonalityMode::Casual => {
                "Respond casually. Be friendly, relaxed, and use contractions."
            }
            PersonalityMode::GenZ => {
                "Respond like a Gen Z friend. Use slang (bruh, slay, no cap, bussin), be enthusiastic, use fire emojis. Be real and authentic."
            }
            PersonalityMode::Academic => {
                "Respond academically. Use formal language, citations, and structured arguments."
            }
            PersonalityMode::Witty => {
                "Respond with wit and humor. Include puns, wordplay, and clever observations. Be entertaining while helpful."
            }
            PersonalityMode::Zen => {
                "Respond with zen wisdom. Be calm, philosophical, and offer peaceful solutions. Use nature metaphors."
            }
        }
    }

    pub fn color(&self) -> Color {
        match self {
            PersonalityMode::Professional => neon_cyan(),
            PersonalityMode::Casual => neon_green(),
            PersonalityMode::GenZ => neon_magenta(),
            PersonalityMode::Academic => neon_purple(),
            PersonalityMode::Witty => neon_yellow(),
            PersonalityMode::Zen => neon_blue(),
        }
    }
}

impl std::fmt::Display for PersonalityMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// Get personality mode from string (for commands).
pub fn parse_personality_mode(s: &str) -> Option<PersonalityMode> {
    match s.to_lowercase().as_str() {
        "professional" | "prof" | "formal" => Some(PersonalityMode::Professional),
        "casual" | "chill" | "relaxed" => Some(PersonalityMode::Casual),
        "genz" | "gen-z" | "gen_z" | "slay" | "fire" => Some(PersonalityMode::GenZ),
        "academic" | "scholar" | "research" => Some(PersonalityMode::Academic),
        "witty" | "funny" | "humor" | "joke" => Some(PersonalityMode::Witty),
        "zen" | "peace" | "calm" | "zenmode" => Some(PersonalityMode::Zen),
        _ => None,
    }
}

/// Render mode selector menu.
pub fn render_mode_selector(current: &PersonalityMode) -> Vec<Line<'static>> {
    let modes = vec![
        PersonalityMode::Professional,
        PersonalityMode::Casual,
        PersonalityMode::GenZ,
        PersonalityMode::Academic,
        PersonalityMode::Witty,
        PersonalityMode::Zen,
    ];

    let mut lines = vec![
        Line::from(Span::styled(
            "🎭 Personality Modes",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
    ];

    for mode in &modes {
        let is_current = mode == current;
        let color = mode.color();
        let indicator = if is_current { "▸ " } else { "  " };

        lines.push(Line::from(vec![
            Span::styled(indicator, Style::default().fg(neon_green())),
            Span::styled(
                format!("{} ", mode.icon()),
                Style::default().fg(color),
            ),
            Span::styled(
                mode.display_name().to_string(),
                Style::default()
                    .fg(if is_current { color } else { dim_color() })
                    .add_modifier(if is_current {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
            Span::styled(
                if is_current { " (active)" } else { "" },
                Style::default().fg(neon_green()),
            ),
        ]));
    }

    lines
}

/// Render mode indicator for header.
pub fn render_mode_indicator(mode: &PersonalityMode) -> Line<'static> {
    let color = mode.color();
    Line::from(vec![
        Span::styled(
            format!("{} ", mode.icon()),
            Style::default().fg(color),
        ),
        Span::styled(
            mode.display_name().to_string(),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

/// Mode transition messages.
pub fn mode_transition_message(from: &PersonalityMode, to: &PersonalityMode) -> String {
    match to {
        PersonalityMode::Professional => {
            format!(
                "Switching from {} to {} mode. I'll be more formal and precise.",
                from.icon(),
                to.icon()
            )
        }
        PersonalityMode::Casual => {
            format!(
                "Switching from {} to {} mode. Let's chill and keep things relaxed!",
                from.icon(),
                to.icon()
            )
        }
        PersonalityMode::GenZ => {
            format!(
                "Switching from {} to {} mode. No cap, this is gonna be fire! 🔥",
                from.icon(),
                to.icon()
            )
        }
        PersonalityMode::Academic => {
            format!(
                "Switching from {} to {} mode. I shall now employ a more scholarly approach.",
                from.icon(),
                to.icon()
            )
        }
        PersonalityMode::Witty => {
            format!(
                "Switching from {} to {} mode. I hope you like puns, because they're coming! 😄",
                from.icon(),
                to.icon()
            )
        }
        PersonalityMode::Zen => {
            format!(
                "Switching from {} to {} mode. 🧘 Let us find peace in our code.",
                from.icon(),
                to.icon()
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_personality() {
        assert_eq!(parse_personality_mode("professional"), Some(PersonalityMode::Professional));
        assert_eq!(parse_personality_mode("genz"), Some(PersonalityMode::GenZ));
        assert_eq!(parse_personality_mode("zen"), Some(PersonalityMode::Zen));
        assert_eq!(parse_personality_mode("invalid"), None);
    }

    #[test]
    fn mode_icons() {
        assert_eq!(PersonalityMode::Professional.icon(), "💼");
        assert_eq!(PersonalityMode::GenZ.icon(), "🔥");
    }
}
