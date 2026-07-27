//! IDEOCODE Bottom Status Bar (H1)
//!
//! A persistent status bar at the bottom of the screen showing:
//! - Model name with emoji
//! - Token usage
//! - Cost (if applicable)
//! - Streak counter
//! - Memory usage
//! - Connection status
//! - Current time / session duration

use crate::tui::TuiState;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;

/// Render the bottom status bar.
pub fn draw_status_bar(frame: &mut Frame, app: &dyn TuiState, area: Rect) {
    if area.width == 0 || area.height == 0 {
        return;
    }

    let w = area.width as usize;
    let elapsed = app.elapsed().map(|d| d.as_secs()).unwrap_or(0);
    let model = app.provider_model();
    let provider = app.provider_name();
    let is_processing = app.is_processing();

    // Build status segments
    let mut segments: Vec<StatusSegment> = Vec::new();

    // 1. Connection status (H3)
    let conn_status = if is_processing {
        (emoji::LIGHTNING, "thinking", neon_cyan())
    } else {
        (emoji::CONNECTED, "ready", neon_green())
    };
    segments.push(StatusSegment::new(conn_status.0, conn_status.1, conn_status.2));

    // 2. Model name with emoji
    let short_model = if model.len() > 20 {
        format!("{}…", &model[..19])
    } else {
        model.clone()
    };
    segments.push(StatusSegment::new(
        emoji::BRAIN,
        &short_model,
        neon_magenta(),
    ));

    // 3. Provider
    if !provider.is_empty() {
        segments.push(StatusSegment::new(
            emoji::LINK,
            &provider,
            neon_purple(),
        ));
    }

    // 4. Token usage (if streaming)
    let (input_tokens, output_tokens) = app.streaming_tokens();
    if input_tokens > 0 || output_tokens > 0 {
        let token_str = format!("↑{} ↓{}", format_tokens(input_tokens), format_tokens(output_tokens));
        segments.push(StatusSegment::new(emoji::CHART, &token_str, neon_cyan()));
    }

    // 5. Session duration
    if elapsed > 0 {
        let time_str = format_duration(elapsed);
        segments.push(StatusSegment::new(emoji::CLOCK, &time_str, dim_color()));
    }

    // 6. Processing indicator
    if is_processing {
        let spinner = ideocode_tui_style::theme::activity_indicator(
            app.elapsed().map(|d| d.as_secs_f32()).unwrap_or(0.0),
            12.5,
            true,
        );
        segments.push(StatusSegment::new(spinner, "active", neon_cyan()));
    }

    // Render the status bar
    let line = render_status_line(&segments, w);
    frame.render_widget(Paragraph::new(line), area);
}

struct StatusSegment {
    icon: String,
    text: String,
    color: Color,
}

impl StatusSegment {
    fn new(icon: &str, text: &str, color: Color) -> Self {
        Self {
            icon: icon.to_string(),
            text: text.to_string(),
            color,
        }
    }
}

fn render_status_line(segments: &[StatusSegment], width: usize) -> Line<'static> {
    let mut spans: Vec<Span<'static>> = Vec::new();
    let separator = Span::styled(" │ ", Style::default().fg(dim_color()));

    for (i, seg) in segments.iter().enumerate() {
        if i > 0 {
            spans.push(separator.clone());
        }
        // Icon
        spans.push(Span::styled(
            format!("{} ", seg.icon),
            Style::default().fg(seg.color),
        ));
        // Text
        spans.push(Span::styled(
            seg.text.clone(),
            Style::default()
                .fg(seg.color)
                .add_modifier(Modifier::BOLD),
        ));
    }

    // Fill remaining space with dim line
    let used_width: usize = spans.iter().map(|s| s.content.chars().count()).sum();
    if used_width < width {
        let fill = width - used_width;
        spans.push(Span::styled(
            "─".repeat(fill),
            Style::default().fg(dim_color()),
        ));
    }

    Line::from(spans)
}

fn format_tokens(n: u64) -> String {
    if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}k", n as f64 / 1_000.0)
    } else {
        format!("{}", n)
    }
}

fn format_duration(secs: u64) -> String {
    if secs >= 3600 {
        let h = secs / 3600;
        let m = (secs % 3600) / 60;
        format!("{}h {}m", h, m)
    } else if secs >= 60 {
        let m = secs / 60;
        let s = secs % 60;
        format!("{}m {}s", m, s)
    } else {
        format!("{}s", secs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_tokens_short() {
        assert_eq!(format_tokens(500), "500");
        assert_eq!(format_tokens(1500), "1.5k");
        assert_eq!(format_tokens(2_500_000), "2.5M");
    }

    #[test]
    fn format_duration_short() {
        assert_eq!(format_duration(30), "30s");
        assert_eq!(format_duration(90), "1m 30s");
        assert_eq!(format_duration(3661), "1h 1m");
    }
}
