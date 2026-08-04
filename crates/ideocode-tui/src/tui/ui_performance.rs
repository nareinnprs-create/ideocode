// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Performance Dashboard (H8)
//!
//! Toggle with F12. Live charts: tokens/sec, latency, cost, memory.
//! Real-time performance monitoring.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, Default)]
pub struct PerformanceMetrics {
    pub tokens_per_second: f32,
    pub latency_ms: f32,
    pub cost_usd: f32,
    pub memory_mb: f32,
    pub cpu_percent: f32,
    pub network_in_kb: f32,
    pub network_out_kb: f32,
}

/// Render performance dashboard.
pub fn render_performance_dashboard(
    metrics: &PerformanceMetrics,
    visible: bool,
) -> Vec<Line<'static>> {
    if !visible {
        return vec![];
    }

    vec![
        Line::from(Span::styled(
            "📊 Performance Dashboard",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  ⚡ Tokens/sec: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}", metrics.tokens_per_second),
                Style::default().fg(neon_green()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  🕐 Latency:    ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.0}ms", metrics.latency_ms),
                Style::default().fg(if metrics.latency_ms < 100.0 {
                    neon_green()
                } else {
                    neon_yellow()
                }),
            ),
        ]),
        Line::from(vec![
            Span::styled("  💰 Cost:       ", Style::default().fg(dim_color())),
            Span::styled(
                format!("${:.4}", metrics.cost_usd),
                Style::default().fg(neon_yellow()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  💾 Memory:     ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}MB", metrics.memory_mb),
                Style::default().fg(neon_cyan()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  🖥️  CPU:        ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}%", metrics.cpu_percent),
                Style::default().fg(if metrics.cpu_percent < 50.0 {
                    neon_green()
                } else {
                    neon_yellow()
                }),
            ),
        ]),
        Line::from(vec![
            Span::styled("  📥 Network:    ", Style::default().fg(dim_color())),
            Span::styled(
                format!(
                    "↓{:.1}KB ↑{:.1}KB",
                    metrics.network_in_kb, metrics.network_out_kb
                ),
                Style::default().fg(neon_blue()),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  Press F12 to toggle",
            Style::default().fg(dim_color()),
        )),
    ]
}

/// Render performance sparkline (mini chart).
pub fn render_sparkline(data: &[f32], width: usize, color: Color) -> Line<'static> {
    if data.is_empty() {
        return Line::from("");
    }

    let max = data.iter().cloned().fold(f32::MIN, f32::max);
    let min = data.iter().cloned().fold(f32::MAX, f32::min);
    let range = if max > min { max - min } else { 1.0 };

    let chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    let spark: String = data
        .iter()
        .take(width)
        .map(|&v| {
            let normalized = (v - min) / range;
            let index = (normalized * (chars.len() - 1) as f32) as usize;
            chars[index]
        })
        .collect();

    Line::from(Span::styled(spark, Style::default().fg(color)))
}

/// Render latency graph.
pub fn render_latency_graph(latencies: &[f32]) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "Latency (ms)",
            Style::default().fg(neon_cyan()),
        )),
        render_sparkline(latencies, 40, neon_green()),
    ]
}

/// Render token throughput graph.
pub fn render_throughput_graph(throughputs: &[f32]) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled("Tokens/sec", Style::default().fg(neon_cyan()))),
        render_sparkline(throughputs, 40, neon_magenta()),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sparkline_empty() {
        let line = render_sparkline(&[], 10, neon_green());
        assert!(line.spans.is_empty());
    }

    #[test]
    fn sparkline_with_data() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let line = render_sparkline(&data, 5, neon_green());
        assert!(!line.spans.is_empty());
    }
}
