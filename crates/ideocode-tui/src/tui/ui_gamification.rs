// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Gamification System
//!
//! - D3: Streak counter (daily usage streaks)
//! - D6: Celebration moments (fireworks on task completion)
//! - D2: Welcome particle burst (first response celebration)

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use std::time::{SystemTime, UNIX_EPOCH};

// ── D3: STREAK COUNTER ──────────────────────────────────────────────

/// Get the current day as a Unix timestamp (days since epoch).
fn current_day() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        / 86400
}

/// Calculate the streak from stored data.
/// Returns (current_streak, longest_streak).
pub fn calculate_streak(last_session_day: Option<u64>, current_streak: u64, longest_streak: u64) -> (u64, u64) {
    let today = current_day();
    
    match last_session_day {
        Some(last) if last == today => {
            // Same day - streak continues
            (current_streak, longest_streak.max(current_streak))
        }
        Some(last) if last == today - 1 => {
            // Yesterday - streak continues
            let new_streak = current_streak + 1;
            (new_streak, longest_streak.max(new_streak))
        }
        Some(_) | None => {
            // Missed a day or first session - reset streak
            (1, longest_streak.max(current_streak))
        }
    }
}

/// Render the streak display.
pub fn render_streak(current_streak: u64, longest_streak: u64) -> Line<'static> {
    let fire = if current_streak >= 7 {
        "🔥🔥🔥"
    } else if current_streak >= 3 {
        "🔥🔥"
    } else if current_streak >= 1 {
        "🔥"
    } else {
        ""
    };

    let streak_color = if current_streak >= 7 {
        neon_orange()
    } else if current_streak >= 3 {
        neon_yellow()
    } else {
        dim_color()
    };

    Line::from(vec![
        Span::styled(
            format!("{} ", fire),
            Style::default().fg(streak_color),
        ),
        Span::styled(
            format!("Day {} streak", current_streak),
            Style::default()
                .fg(streak_color)
                .add_modifier(Modifier::BOLD),
        ),
        if longest_streak > current_streak {
            Span::styled(
                format!(" (best: {})", longest_streak),
                Style::default().fg(dim_color()),
            )
        } else {
            Span::raw("")
        },
    ])
}

// ── D6: CELEBRATION MOMENTS ─────────────────────────────────────────

/// Render a celebration animation for task completion.
pub fn render_celebration(task_name: &str) -> Vec<Line<'static>> {
    vec![
        Line::from("🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉"),
        Line::from(Span::styled(
            format!("  {} Task Complete!", emoji::TROPHY),
            Style::default()
                .fg(neon_magenta())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  🎯 {}", task_name),
            Style::default().fg(neon_cyan()),
        )),
        Line::from("🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉"),
    ]
}

/// Render a mini celebration (for inline use).
pub fn render_mini_celebration() -> Line<'static> {
    Line::from(Span::styled(
        "✨ 🎉 ✨",
        Style::default()
            .fg(neon_magenta())
            .add_modifier(Modifier::BOLD),
    ))
}

// ── D2: WELCOME PARTICLE BURST ──────────────────────────────────────

/// Render a particle burst effect for the first response.
pub fn render_particle_burst() -> Vec<Line<'static>> {
    vec![
        Line::from("✨ ⭐ 💫 ⭐ ✨ ⭐ 💫 ⭐ ✨"),
        Line::from(Span::styled(
            "  🚀 First response! Welcome aboard!",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from("✨ ⭐ 💫 ⭐ ✨ ⭐ 💫 ⭐ ✨"),
    ]
}

/// Check if this is the first response in a session.
pub fn is_first_response(message_count: usize) -> bool {
    message_count <= 1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn streak_calculation_same_day() {
        let today = current_day();
        let (streak, best) = calculate_streak(Some(today), 5, 10);
        assert_eq!(streak, 5);
        assert_eq!(best, 10);
    }

    #[test]
    fn streak_calculation_consecutive_day() {
        let today = current_day();
        let (streak, best) = calculate_streak(Some(today - 1), 5, 10);
        assert_eq!(streak, 6);
        assert_eq!(best, 10);
    }

    #[test]
    fn streak_calculation_missed_day() {
        let today = current_day();
        let (streak, best) = calculate_streak(Some(today - 2), 5, 10);
        assert_eq!(streak, 1);
        assert_eq!(best, 10);
    }

    #[test]
    fn celebration_rendering() {
        let lines = render_celebration("Test Task");
        assert!(!lines.is_empty());
    }
}
