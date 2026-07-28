//! IDEOCODE Bottom Status Bar (H1) — Premium 2-line design
//!
//! Line 1: Connection │ Model │ Provider │ Processing spinner
//! Line 2: Tokens │ Duration │ Memory │ Shortcuts hint

use crate::tui::TuiState;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;

/// Render the bottom status bar (2 lines).
pub fn draw_status_bar(frame: &mut Frame, app: &dyn TuiState, area: Rect) {
    if area.width == 0 || area.height == 0 {
        return;
    }

    let w = area.width as usize;
    let elapsed = app.elapsed().map(|d| d.as_secs()).unwrap_or(0);
    let model = app.provider_model();
    let provider = app.provider_name();
    let is_processing = app.is_processing();

    // ── Line 1: Connection │ Model │ Provider │ Spinner ──────────────

    let mut line1_spans: Vec<Span<'static>> = Vec::new();
    let sep = Span::styled(" │ ", Style::default().fg(dim_color()));

    // Connection status
    let (conn_icon, conn_text, conn_color) = if is_processing {
        ("⚡", "thinking", neon_cyan())
    } else {
        ("●", "ready", neon_green())
    };
    line1_spans.push(Span::styled(
        format!("{} {}", conn_icon, conn_text),
        Style::default().fg(conn_color).add_modifier(Modifier::BOLD),
    ));

    // Model name
    let short_model = if model.len() > 24 {
        format!("{}…", &model[..23])
    } else {
        model.clone()
    };
    line1_spans.push(sep.clone());
    line1_spans.push(Span::styled(
        format!("🧠 {}", short_model),
        Style::default()
            .fg(neon_magenta())
            .add_modifier(Modifier::BOLD),
    ));

    // Provider
    if !provider.is_empty() {
        line1_spans.push(sep.clone());
        line1_spans.push(Span::styled(
            format!("🔗 {}", provider),
            Style::default().fg(neon_purple()),
        ));
    }

    // Processing spinner
    if is_processing {
        let spinner = ideocode_tui_style::theme::activity_indicator(
            app.elapsed().map(|d| d.as_secs_f32()).unwrap_or(0.0),
            12.5,
            true,
        );
        line1_spans.push(sep.clone());
        line1_spans.push(Span::styled(
            format!("{} active", spinner),
            Style::default().fg(neon_cyan()),
        ));
    }

    // Right-align: version
    let version_text = "v0.60.0";
    let used_width: usize = line1_spans.iter().map(|s| s.content.chars().count()).sum();
    let padding = w.saturating_sub(used_width + version_text.len());
    line1_spans.push(Span::styled(
        " ".repeat(padding),
        Style::default(),
    ));
    line1_spans.push(Span::styled(
        version_text,
        Style::default().fg(dim_color()),
    ));

    let line1 = Line::from(line1_spans);

    // ── Line 2: Tokens │ Duration │ Shortcuts ───────────────────────

    let mut line2_spans: Vec<Span<'static>> = Vec::new();

    // Token usage
    let (input_tokens, output_tokens) = app.streaming_tokens();
    if input_tokens > 0 || output_tokens > 0 {
        line2_spans.push(Span::styled(
            format!(
                "↑{} ↓{}",
                format_tokens(input_tokens),
                format_tokens(output_tokens)
            ),
            Style::default().fg(neon_cyan()),
        ));
    }

    // Tokens per second
    if let Some(tps) = app.output_tps() {
        if tps > 0.0 {
            if !line2_spans.is_empty() {
                line2_spans.push(sep.clone());
            }
            let tps_color = if tps > 80.0 {
                neon_green()
            } else if tps > 40.0 {
                neon_yellow()
            } else {
                dim_color()
            };
            line2_spans.push(Span::styled(
                format!("⚡{:.0} tok/s", tps),
                Style::default().fg(tps_color),
            ));
        }
    }

    // Session duration
    if elapsed > 0 {
        if !line2_spans.is_empty() {
            line2_spans.push(sep.clone());
        }
        line2_spans.push(Span::styled(
            format!("⏱ {}", format_duration(elapsed)),
            Style::default().fg(dim_color()),
        ));
    }

    // Vim mode indicator
    if let Some(mode_label) = app.vim_mode_label() {
        if !line2_spans.is_empty() {
            line2_spans.push(sep.clone());
        }
        let mode_color = if mode_label == "NORMAL" {
            neon_magenta()
        } else {
            neon_green()
        };
        line2_spans.push(Span::styled(
            format!("⌨ {}", mode_label),
            Style::default()
                .fg(mode_color)
                .add_modifier(Modifier::BOLD),
        ));
    }

    // Right-align: keyboard shortcut hints
    let hints = "Ctrl+/ help │ Alt+8 palette │ Alt+X sidebar";
    let used_width: usize = line2_spans.iter().map(|s| s.content.chars().count()).sum();
    let padding = w.saturating_sub(used_width + hints.len());
    line2_spans.push(Span::styled(
        " ".repeat(padding),
        Style::default(),
    ));
    line2_spans.push(Span::styled(
        hints,
        Style::default().fg(dim_color()),
    ));

    let line2 = Line::from(line2_spans);

    // Render both lines
    let lines = vec![line1, line2];
    frame.render_widget(Paragraph::new(lines), area);
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
