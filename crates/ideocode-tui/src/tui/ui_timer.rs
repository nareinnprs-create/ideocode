//! IDEOCODE Timer (H6)
//!
//! Session duration. Pomodoro integration. Focus tool.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use std::time::{Duration, Instant};

/// Render session timer.
pub fn render_session_timer(start_time: Instant) -> Line<'static> {
    let elapsed = start_time.elapsed();
    let hours = elapsed.as_secs() / 3600;
    let minutes = (elapsed.as_secs() % 3600) / 60;
    let seconds = elapsed.as_secs() % 60;

    Line::from(vec![
        Span::styled(
            "⏱️ ",
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            format!("{:02}:{:02}:{:02}", hours, minutes, seconds),
            Style::default()
                .fg(neon_green())
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

/// Render pomodoro timer.
pub fn render_pomodoro_timer(
    remaining: Duration,
    is_break: bool,
) -> Line<'static> {
    let minutes = remaining.as_secs() / 60;
    let seconds = remaining.as_secs() % 60;

    let (label, color) = if is_break {
        ("☕ Break", neon_blue())
    } else {
        ("🍅 Focus", rgb(255, 80, 80))
    };

    Line::from(vec![
        Span::styled(
            format!("{} ", label),
            Style::default().fg(color),
        ),
        Span::styled(
            format!("{:02}:{:02}", minutes, seconds),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

/// Render timer with progress bar.
pub fn render_timer_with_progress(
    elapsed: Duration,
    total: Duration,
) -> Vec<Line<'static>> {
    let progress = if total.as_secs() > 0 {
        elapsed.as_secs_f32() / total.as_secs_f32()
    } else {
        0.0
    };

    let bar_width = 20;
    let filled = (progress * bar_width as f32) as usize;
    let empty = bar_width - filled;
    let bar = "█".repeat(filled) + &"░".repeat(empty);

    let remaining = total.saturating_sub(elapsed);
    let minutes = remaining.as_secs() / 60;
    let seconds = remaining.as_secs() % 60;

    vec![
        Line::from(Span::styled(
            bar,
            Style::default().fg(neon_cyan()),
        )),
        Line::from(Span::styled(
            format!("  {:02}:{:02} remaining", minutes, seconds),
            Style::default().fg(dim_color()),
        )),
    ]
}

/// Render mini timer (single line).
pub fn render_timer_mini(elapsed: Duration) -> Line<'static> {
    let minutes = elapsed.as_secs() / 60;
    let seconds = elapsed.as_secs() % 60;

    Line::from(vec![
        Span::styled(
            "⏱️",
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            format!(" {:02}:{:02}", minutes, seconds),
            Style::default().fg(dim_color()),
        ),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn timer_render() {
        let line = render_session_timer(Instant::now());
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn pomodoro_render() {
        let line = render_pomodoro_timer(Duration::from_secs(1500), false);
        assert!(!line.spans.is_empty());
    }
}
