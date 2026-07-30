// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Social Features (S2-S5)
//!
//! Leaderboards, team features, social sharing, and achievement sharing.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Leaderboard entry.
#[derive(Debug, Clone)]
pub struct LeaderboardEntry {
    pub rank: usize,
    pub name: String,
    pub score: u64,
    pub achievements: usize,
}

/// Render leaderboard.
pub fn render_leaderboard(entries: &[LeaderboardEntry]) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "🏆 Leaderboard",
        Style::default()
            .fg(neon_yellow())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for entry in entries.iter().take(10) {
        let color = match entry.rank {
            1 => neon_yellow(),
            2 => neon_cyan(),
            3 => neon_orange(),
            _ => dim_color(),
        };

        lines.push(Line::from(vec![
            Span::styled(
                format!("{} ", entry.rank),
                Style::default().fg(color),
            ),
            Span::styled(
                entry.name.clone(),
                Style::default()
                    .fg(color)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!("  {} pts", entry.score),
                Style::default().fg(dim_color()),
            ),
            Span::styled(
                format!("  🏅{}", entry.achievements),
                Style::default().fg(neon_green()),
            ),
        ]));
    }

    lines
}

/// Render team and sharing features panel.
#[allow(dead_code, reason = "kept for social features panel; not yet wired into main UI")]
pub fn render_team_placeholder() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "👥 Team & Sharing Features",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Available features:",
            Style::default()
                .fg(neon_green())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  /share     - Export & share your config with others",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  /export    - Export session transcript or config",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  /import    - Import configs from Claude Code / Cursor / Codex",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  /template  - Save & load prompt templates",
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Config sharing:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            "  • Share ~/.IDEOCODE/config.toml with teammates",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  • Use ./.IDEOCODE/ for project-local settings",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  • Export prompts via /template save <name>",
            Style::default().fg(dim_color()),
        )),
    ]
}

/// Render social sharing preview.
#[allow(dead_code, reason = "kept for share preview overlay; not yet wired into main UI")]
pub fn render_share_preview(achievements: &[String]) -> Vec<Line<'static>> {
    let mut lines = vec![
        Line::from(Span::styled(
            "📤 Share Your Progress",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Look what I accomplished in IDEOCODE!",
            Style::default().fg(neon_green()),
        )),
    ];
    lines.push(Line::from(""));

    for achievement in achievements.iter().take(5) {
        lines.push(Line::from(Span::styled(
            format!("  🏅 {}", achievement),
            Style::default().fg(neon_yellow()),
        )));
    }

    if achievements.len() > 5 {
        lines.push(Line::from(Span::styled(
            format!("  ... and {} more!", achievements.len() - 5),
            Style::default().fg(dim_color()),
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "#IDEOCODE #CodingAssistant #Achievements",
        Style::default().fg(neon_purple()),
    )));

    lines
}

/// Render achievement share card.
#[allow(dead_code, reason = "kept for achievement card overlay; not yet wired into main UI")]
pub fn render_achievement_card(
    achievement: &str,
    description: &str,
) -> Vec<Line<'static>> {
    vec![
        Line::from("╭──────────────────────────────╮"),
        Line::from(Span::styled(
            "│     🏆 Achievement Unlocked!  │",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from("╰──────────────────────────────╯"),
        Line::from(Span::styled(
            format!("  {}", achievement),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  {}", description),
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  IDEOCODE - AI Coding Assistant",
            Style::default().fg(neon_purple()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn leaderboard_render() {
        let entries = vec![
            LeaderboardEntry {
                rank: 1,
                name: "Alice".to_string(),
                score: 1000,
                achievements: 15,
            },
            LeaderboardEntry {
                rank: 2,
                name: "Bob".to_string(),
                score: 800,
                achievements: 12,
            },
        ];

        let lines = render_leaderboard(&entries);
        assert!(!lines.is_empty());
    }
}
