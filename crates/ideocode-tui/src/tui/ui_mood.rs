// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Mood Indicator (D5)
//!
//! AI mood changes based on context: happy (success), focused (complex task),
//! confused (unclear input), excited (easter egg), etc.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum AIMood {
    Happy,
    Focused,
    Confused,
    Excited,
    Thinking,
    Concerned,
    Celebrating,
    Chill,
}

impl AIMood {
    pub fn icon(&self) -> &str {
        match self {
            AIMood::Happy => "😊",
            AIMood::Focused => "🎯",
            AIMood::Confused => "🤔",
            AIMood::Excited => "🎉",
            AIMood::Thinking => "💭",
            AIMood::Concerned => "😟",
            AIMood::Celebrating => "🥳",
            AIMood::Chill => "😌",
        }
    }

    pub fn label(&self) -> &str {
        match self {
            AIMood::Happy => "happy",
            AIMood::Focused => "focused",
            AIMood::Confused => "confused",
            AIMood::Excited => "excited",
            AIMood::Thinking => "thinking",
            AIMood::Concerned => "concerned",
            AIMood::Celebrating => "celebrating",
            AIMood::Chill => "chill",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            AIMood::Happy => neon_green(),
            AIMood::Focused => neon_cyan(),
            AIMood::Confused => neon_yellow(),
            AIMood::Excited => neon_magenta(),
            AIMood::Thinking => neon_purple(),
            AIMood::Concerned => neon_orange(),
            AIMood::Celebrating => neon_pink(),
            AIMood::Chill => neon_blue(),
        }
    }

    /// Determine mood from context.
    pub fn from_context(context: MoodContext) -> Self {
        match context {
            MoodContext::TaskComplete => AIMood::Celebrating,
            MoodContext::Error => AIMood::Concerned,
            MoodContext::ComplexTask => AIMood::Focused,
            MoodContext::SimpleQuery => AIMood::Happy,
            MoodContext::Thinking => AIMood::Thinking,
            MoodContext::UnclearInput => AIMood::Confused,
            MoodContext::EasterEgg => AIMood::Excited,
            MoodContext::Idle => AIMood::Chill,
        }
    }
}

pub enum MoodContext {
    TaskComplete,
    Error,
    ComplexTask,
    SimpleQuery,
    Thinking,
    UnclearInput,
    EasterEgg,
    Idle,
}

/// Render mood indicator.
pub fn render_mood_indicator(mood: &AIMood) -> Line<'static> {
    let color = mood.color();
    Line::from(vec![
        Span::styled(
            format!("{} ", mood.icon()),
            Style::default().fg(color),
        ),
        Span::styled(
            mood.label().to_string(),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::ITALIC),
        ),
    ])
}
