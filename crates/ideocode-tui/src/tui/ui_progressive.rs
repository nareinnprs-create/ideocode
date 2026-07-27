//! IDEOCODE Progressive Disclosure (H10)
//!
//! Show advanced features only when user is ready.
//! Tracks usage patterns and unlocks features gradually.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum FeatureLevel {
    Beginner,
    Intermediate,
    Advanced,
    Expert,
}

impl FeatureLevel {
    pub fn label(&self) -> &str {
        match self {
            FeatureLevel::Beginner => "Beginner",
            FeatureLevel::Intermediate => "Intermediate",
            FeatureLevel::Advanced => "Advanced",
            FeatureLevel::Expert => "Expert",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            FeatureLevel::Beginner => "🌱",
            FeatureLevel::Intermediate => "🌿",
            FeatureLevel::Advanced => "🌳",
            FeatureLevel::Expert => "🏔️",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            FeatureLevel::Beginner => neon_green(),
            FeatureLevel::Intermediate => neon_cyan(),
            FeatureLevel::Advanced => neon_magenta(),
            FeatureLevel::Expert => neon_yellow(),
        }
    }
}

/// Features unlocked at each level.
pub fn features_for_level(level: &FeatureLevel) -> Vec<&'static str> {
    match level {
        FeatureLevel::Beginner => vec![
            "Basic input",
            "Help command",
            "Clear history",
        ],
        FeatureLevel::Intermediate => vec![
            "Themes",
            "Keyboard shortcuts",
            "Command history",
            "Autocomplete",
        ],
        FeatureLevel::Advanced => vec![
            "Personality modes",
            "Achievements",
            "Reactions",
            "Hover previews",
        ],
        FeatureLevel::Expert => vec![
            "Roast mode",
            "Custom themes",
            "Advanced tools",
            "Developer mode",
        ],
    }
}

/// Determine user level from usage stats.
pub fn determine_level(stats: &UsageStats) -> FeatureLevel {
    let score = stats.messages_sent
        + stats.sessions_completed * 5
        + stats.tools_used * 3
        + stats.achievements_unlocked * 10;

    if score >= 500 {
        FeatureLevel::Expert
    } else if score >= 100 {
        FeatureLevel::Advanced
    } else if score >= 20 {
        FeatureLevel::Intermediate
    } else {
        FeatureLevel::Beginner
    }
}

/// Usage statistics for level determination.
#[derive(Debug, Default)]
pub struct UsageStats {
    pub messages_sent: u64,
    pub sessions_completed: u64,
    pub tools_used: u64,
    pub achievements_unlocked: u64,
    pub days_active: u64,
}

/// Render level indicator.
pub fn render_level_indicator(level: &FeatureLevel) -> Line<'static> {
    let color = level.color();
    Line::from(vec![
        Span::styled(
            format!("{} ", level.icon()),
            Style::default().fg(color),
        ),
        Span::styled(
            level.label().to_string(),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

/// Render feature unlock notification.
pub fn render_feature_unlock(feature: &str, level: &FeatureLevel) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "🔓 Feature Unlocked!",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  {} {}", level.icon(), feature),
            Style::default().fg(level.color()),
        )),
        Line::from(Span::styled(
            format!("  Level: {}", level.label()),
            Style::default().fg(dim_color()),
        )),
    ]
}

/// Render level progress bar.
pub fn render_level_progress(stats: &UsageStats) -> Line<'static> {
    let level = determine_level(stats);
    let next_level = match &level {
        FeatureLevel::Beginner => Some(FeatureLevel::Intermediate),
        FeatureLevel::Intermediate => Some(FeatureLevel::Advanced),
        FeatureLevel::Advanced => Some(FeatureLevel::Expert),
        FeatureLevel::Expert => None,
    };

    if let Some(next) = next_level {
        let current_score = stats.messages_sent
            + stats.sessions_completed * 5
            + stats.tools_used * 3
            + stats.achievements_unlocked * 10;

        let (min_score, max_score) = match &level {
            FeatureLevel::Beginner => (0, 20),
            FeatureLevel::Intermediate => (20, 100),
            FeatureLevel::Advanced => (100, 500),
            FeatureLevel::Expert => (500, 500),
        };

        let progress = if max_score > min_score {
            ((current_score - min_score) as f32 / (max_score - min_score) as f32).min(1.0)
        } else {
            1.0
        };

        let bar_width = 20;
        let filled = (progress * bar_width as f32) as usize;
        let empty = bar_width - filled;
        let bar = "█".repeat(filled) + &"░".repeat(empty);

        Line::from(vec![
            Span::styled(
                format!("{} ", level.icon()),
                Style::default().fg(level.color()),
            ),
            Span::styled(
                bar,
                Style::default().fg(next.color()),
            ),
            Span::styled(
                format!(" → {} ", next.icon()),
                Style::default().fg(next.color()),
            ),
        ])
    } else {
        Line::from(vec![
            Span::styled(
                format!("{} MAX ", level.icon()),
                Style::default().fg(level.color()),
            ),
            Span::styled(
                "🌟",
                Style::default().fg(neon_yellow()),
            ),
        ])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn beginner_level() {
        let stats = UsageStats {
            messages_sent: 5,
            ..Default::default()
        };
        assert_eq!(determine_level(&stats), FeatureLevel::Beginner);
    }

    #[test]
    fn intermediate_level() {
        let stats = UsageStats {
            messages_sent: 20,
            ..Default::default()
        };
        assert_eq!(determine_level(&stats), FeatureLevel::Intermediate);
    }

    #[test]
    fn advanced_level() {
        let stats = UsageStats {
            messages_sent: 100,
            ..Default::default()
        };
        assert_eq!(determine_level(&stats), FeatureLevel::Advanced);
    }
}
