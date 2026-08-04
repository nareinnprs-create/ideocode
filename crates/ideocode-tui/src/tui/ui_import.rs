// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Import from Competitors (F1)
//!
//! Import sessions from: Claude Code, Codex, Cursor, OpenCode, Pi.
//! Detects installed tools, discovers sessions, offers one-click import.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct CompetitorTool {
    pub name: &'static str,
    pub icon: &'static str,
    pub sessions_dir: &'static str,
    pub detected: bool,
    pub session_count: usize,
}

#[derive(Debug, Clone)]
pub struct ImportedSession {
    pub tool: &'static str,
    pub title: String,
    pub date: String,
    pub messages: usize,
}

/// Detect installed competitor tools and their session counts.
pub fn detect_competitor_tools() -> Vec<CompetitorTool> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();

    let tools = vec![
        CompetitorTool {
            name: "Claude Code",
            icon: "🟣",
            sessions_dir: "~/.claude/projects",
            detected: {
                let path = std::path::PathBuf::from(home.clone())
                    .join(".claude")
                    .join("projects");
                path.exists()
            },
            session_count: 0,
        },
        CompetitorTool {
            name: "Codex",
            icon: "🔵",
            sessions_dir: "~/.codex/sessions",
            detected: {
                let path = std::path::PathBuf::from(home.clone())
                    .join(".codex")
                    .join("sessions");
                path.exists()
            },
            session_count: 0,
        },
        CompetitorTool {
            name: "Cursor",
            icon: "🟡",
            sessions_dir: "~/.cursor/sessions",
            detected: {
                let path = std::path::PathBuf::from(home.clone())
                    .join(".cursor")
                    .join("sessions");
                path.exists()
            },
            session_count: 0,
        },
        CompetitorTool {
            name: "OpenCode",
            icon: "🟢",
            sessions_dir: "~/.opencode/sessions",
            detected: {
                let path = std::path::PathBuf::from(home.clone())
                    .join(".opencode")
                    .join("sessions");
                path.exists()
            },
            session_count: 0,
        },
        CompetitorTool {
            name: "Pi AI",
            icon: "⚪",
            sessions_dir: "~/.pi/sessions",
            detected: {
                let path = std::path::PathBuf::from(home.clone())
                    .join(".pi")
                    .join("sessions");
                path.exists()
            },
            session_count: 0,
        },
    ];

    tools
}

/// Render the import from competitors selector.
pub fn render_import_selector(tools: &[CompetitorTool], selected: usize) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Import from Competitors",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        "  Select a tool to import sessions from",
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(""));

    for (i, tool) in tools.iter().enumerate() {
        let is_selected = i == selected;
        let status = if tool.detected {
            format!("{} detected", tool.icon)
        } else {
            "not installed".to_string()
        };
        let status_color = if tool.detected {
            neon_green()
        } else {
            rgb(255, 80, 80)
        };

        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected {
                    neon_green()
                } else {
                    dim_color()
                }),
            ),
            Span::styled(format!("{} ", tool.icon), Style::default()),
            Span::styled(
                tool.name.to_string(),
                Style::default()
                    .fg(if tool.detected {
                        neon_cyan()
                    } else {
                        dim_color()
                    })
                    .add_modifier(if is_selected {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
            Span::styled(format!("  [{}]", status), Style::default().fg(status_color)),
        ]));

        if is_selected && tool.detected {
            lines.push(Line::from(vec![
                Span::styled("    Sessions dir: ", Style::default().fg(dim_color())),
                Span::styled(
                    tool.sessions_dir.to_string(),
                    Style::default().fg(neon_yellow()),
                ),
            ]));
        }
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "  Press Enter to import, Esc to close",
        Style::default().fg(dim_color()),
    )));

    lines
}

/// Render import progress.
pub fn render_import_progress(tool: &str, progress: f32) -> Vec<Line<'static>> {
    let bar_width = 20;
    let filled = (progress * bar_width as f32) as usize;
    let empty = bar_width - filled;
    let bar = "█".repeat(filled) + &"░".repeat(empty);

    vec![
        Line::from(Span::styled(
            format!("  Importing from {}...", tool),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(bar, Style::default().fg(neon_green()))),
    ]
}

/// Render import success.
pub fn render_import_success(tool: &str, count: usize) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "  Import Complete!",
            Style::default()
                .fg(neon_green())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  {} sessions imported from {}", count, tool),
            Style::default().fg(neon_cyan()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_tools() {
        let tools = detect_competitor_tools();
        assert_eq!(tools.len(), 5);
    }

    #[test]
    fn render_selector() {
        let tools = detect_competitor_tools();
        let lines = render_import_selector(&tools, 0);
        assert!(!lines.is_empty());
    }
}
