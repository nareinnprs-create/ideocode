// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Network Activity (H7)
//!
//! Show connection status, API calls, latency. Trust indicator.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render network activity indicator.
pub fn render_network_indicator(is_connected: bool, latency_ms: Option<u64>) -> Line<'static> {
    let (icon, color) = if is_connected {
        match latency_ms {
            Some(ms) if ms < 100 => ("🟢", neon_green()),
            Some(ms) if ms < 500 => ("🟡", neon_yellow()),
            Some(_) => ("🟠", rgb(255, 80, 80)),
            None => ("🟢", neon_green()),
        }
    } else {
        ("🔴", rgb(255, 80, 80))
    };

    let latency_str = match latency_ms {
        Some(ms) => format!(" {}ms", ms),
        None => String::new(),
    };

    Line::from(vec![
        Span::styled(icon, Style::default()),
        Span::styled(
            format!("Network{}", latency_str),
            Style::default().fg(color),
        ),
    ])
}

/// Render API call counter.
pub fn render_api_calls(count: u64) -> Line<'static> {
    Line::from(vec![
        Span::styled("🌐 ", Style::default().fg(neon_cyan())),
        Span::styled(
            format!("{} API calls", count),
            Style::default().fg(dim_color()),
        ),
    ])
}

/// Render trust indicator.
pub fn render_trust_indicator(verified: bool, provider: &str) -> Line<'static> {
    let (icon, color, status) = if verified {
        ("🛡️", neon_green(), "Verified")
    } else {
        ("⚠️", neon_yellow(), "Unverified")
    };

    Line::from(vec![
        Span::styled(icon, Style::default()),
        Span::styled(
            format!("{} {}", provider, status),
            Style::default().fg(color),
        ),
    ])
}

/// Render detailed network stats.
pub fn render_network_details(
    is_connected: bool,
    latency_ms: Option<u64>,
    api_calls: u64,
    bytes_sent: u64,
    bytes_received: u64,
) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "🌐 Network Activity",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Status: ", Style::default().fg(dim_color())),
            Span::styled(
                if is_connected {
                    "Connected"
                } else {
                    "Disconnected"
                },
                Style::default().fg(if is_connected {
                    neon_green()
                } else {
                    rgb(255, 80, 80)
                }),
            ),
        ]),
        Line::from(vec![
            Span::styled("  Latency: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{}ms", latency_ms.unwrap_or(0)),
                Style::default().fg(neon_yellow()),
            ),
        ]),
        Line::from(vec![
            Span::styled("  API Calls: ", Style::default().fg(dim_color())),
            Span::styled(format!("{}", api_calls), Style::default().fg(neon_green())),
        ]),
        Line::from(vec![
            Span::styled("  Sent: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{} KB", bytes_sent / 1024),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled("  Received: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{} KB", bytes_received / 1024),
                Style::default().fg(neon_magenta()),
            ),
        ]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn network_indicator_connected() {
        let line = render_network_indicator(true, Some(50));
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn network_indicator_disconnected() {
        let line = render_network_indicator(false, None);
        assert!(!line.spans.is_empty());
    }

    #[test]
    fn trust_indicator_verified() {
        let line = render_trust_indicator(true, "Anthropic");
        assert!(!line.spans.is_empty());
    }
}
