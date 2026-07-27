//! IDEOCODE Voice Mode (P7)
//!
//! Placeholder for future voice interaction features.
//! Shows UI elements but doesn't actually process audio yet.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum VoiceState {
    Inactive,
    Listening,
    Processing,
    Speaking,
}

impl VoiceState {
    pub fn icon(&self) -> &str {
        match self {
            VoiceState::Inactive => "🎤",
            VoiceState::Listening => "🎙️",
            VoiceState::Processing => "⏳",
            VoiceState::Speaking => "🔊",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            VoiceState::Inactive => "Voice mode off",
            VoiceState::Listening => "Listening...",
            VoiceState::Processing => "Processing...",
            VoiceState::Speaking => "Speaking...",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            VoiceState::Inactive => dim_color(),
            VoiceState::Listening => neon_green(),
            VoiceState::Processing => neon_yellow(),
            VoiceState::Speaking => neon_cyan(),
        }
    }
}

/// Render voice mode indicator.
pub fn render_voice_indicator(state: &VoiceState) -> Line<'static> {
    let color = state.color();
    Line::from(vec![
        Span::styled(
            format!("{} ", state.icon()),
            Style::default().fg(color),
        ),
        Span::styled(
            state.label().to_string(),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::ITALIC),
        ),
    ])
}

/// Render voice mode placeholder message.
pub fn render_voice_placeholder() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "🎤 Voice Mode",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Coming soon!",
            Style::default().fg(neon_yellow()),
        )),
        Line::from(""),
        Line::from("Voice interaction will let you:"),
        Line::from(Span::styled(
            "  • Talk to IDEOCODE naturally",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  • Get spoken responses",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  • Code hands-free",
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "For now, use text input!",
            Style::default().fg(neon_green()),
        )),
    ]
}

/// Render voice wave visualization (placeholder).
pub fn render_voice_wave(active: bool) -> Line<'static> {
    let wave = if active {
        "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁"
    } else {
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁"
    };

    Line::from(Span::styled(
        wave.to_string(),
        Style::default().fg(if active {
            neon_cyan()
        } else {
            dim_color()
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn voice_states() {
        assert_eq!(VoiceState::Inactive.icon(), "🎤");
        assert_eq!(VoiceState::Listening.icon(), "🎙️");
    }
}
