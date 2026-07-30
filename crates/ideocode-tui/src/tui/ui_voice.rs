// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Voice Mode
//!
//! Voice dictation UI: status indicator, configuration panel, and wave visualization.
//! Actual audio processing is handled by the dictation backend configured in config.toml.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use crate::tui::color_support::rgb;

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

/// Render voice mode status panel.
pub fn render_voice_placeholder() -> Vec<Line<'static>> {
    let cfg = crate::config::config().dictation.clone();
    let command = cfg.command.trim();
    let configured = !command.is_empty();

    let mut lines = vec![
        Line::from(Span::styled(
            "🎤 Voice Mode (Dictation)",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
    ];

    if configured {
        lines.push(Line::from(Span::styled(
            format!("Status: {}", "Configured"),
            Style::default().fg(neon_green()),
        )));
        lines.push(Line::from(Span::styled(
            format!("Command: {}", command),
            Style::default().fg(dim_color()),
        )));
    } else {
        lines.push(Line::from(Span::styled(
            "Status: Not configured",
            Style::default().fg(rgb(255, 100, 100)),
        )));
        lines.push(Line::from(Span::styled(
            "Set `[dictation].command` in ~/.IDEOCODE/config.toml",
            Style::default().fg(dim_color()),
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "How to use:",
        Style::default()
            .fg(neon_yellow())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        "  • Press F5 or run /dictate to start voice input",
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(Span::styled(
        "  • Press F5 again to stop recording",
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(Span::styled(
        "  • Transcript is inserted into the input buffer",
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "Supported backends: macOS say, whisper.cpp, dictation.py, etc.",
        Style::default().fg(dim_color()),
    )));

    lines
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
