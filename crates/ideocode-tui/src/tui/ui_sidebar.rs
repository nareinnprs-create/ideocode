// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Sidebar Panel System
//!
//! When a panel is open, renders in a dedicated right sidebar instead of
//! overlaying on top of the chat. The chat area shrinks to accommodate.
//! Tab/Shift+Tab cycles panels; Esc closes sidebar.

use crate::tui::ui_shell_cache;
use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph, Wrap};
use std::time::Duration;

/// Convenience wrapper: runs a cached shell command and returns its output as a single String.
fn shell_output(cmd: &str, ttl_secs: u64) -> String {
    let lines = ui_shell_cache::get_cached_command(cmd, Duration::from_secs(ttl_secs));
    lines.join("\n")
}

/// Which panel is active in the sidebar.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SidebarPanel {
    Git,
    Search,
    Build,
    Log,
    Docker,
    Cicd,
    Provider,
    FileExplorer,
    Profiler,
    Debugger,
    Split,
}

impl SidebarPanel {
    pub fn label(&self) -> &str {
        match self {
            SidebarPanel::Git => "Git",
            SidebarPanel::Search => "Search",
            SidebarPanel::Build => "Build",
            SidebarPanel::Log => "Log",
            SidebarPanel::Docker => "Docker",
            SidebarPanel::Cicd => "CI/CD",
            SidebarPanel::Provider => "Providers",
            SidebarPanel::FileExplorer => "Files",
            SidebarPanel::Profiler => "Profiler",
            SidebarPanel::Debugger => "Debug",
            SidebarPanel::Split => "Split",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            SidebarPanel::Git => "git",
            SidebarPanel::Search => "find",
            SidebarPanel::Build => "cog",
            SidebarPanel::Log => "log",
            SidebarPanel::Docker => "box",
            SidebarPanel::Cicd => "rocket",
            SidebarPanel::Provider => "link",
            SidebarPanel::FileExplorer => "folder",
            SidebarPanel::Profiler => "chart",
            SidebarPanel::Debugger => "bug",
            SidebarPanel::Split => "split",
        }
    }

    pub fn shortcut(&self) -> &str {
        match self {
            SidebarPanel::Git => "g",
            SidebarPanel::Search => "/",
            SidebarPanel::Build => "b",
            SidebarPanel::Log => "l",
            SidebarPanel::Docker => "d",
            SidebarPanel::Cicd => "c",
            SidebarPanel::Provider => "p",
            SidebarPanel::FileExplorer => "e",
            SidebarPanel::Profiler => "r",
            SidebarPanel::Debugger => "x",
            SidebarPanel::Split => "s",
        }
    }

    pub fn all() -> &'static [SidebarPanel] {
        &[
            SidebarPanel::FileExplorer,
            SidebarPanel::Git,
            SidebarPanel::Search,
            SidebarPanel::Build,
            SidebarPanel::Log,
            SidebarPanel::Docker,
            SidebarPanel::Cicd,
            SidebarPanel::Provider,
            SidebarPanel::Profiler,
            SidebarPanel::Debugger,
            SidebarPanel::Split,
        ]
    }

    pub fn next(&self) -> SidebarPanel {
        let all = Self::all();
        let idx = all.iter().position(|p| p == self).unwrap_or(0);
        all[(idx + 1) % all.len()]
    }

    pub fn prev(&self) -> SidebarPanel {
        let all = Self::all();
        let idx = all.iter().position(|p| p == self).unwrap_or(0);
        all[(idx + all.len() - 1) % all.len()]
    }
}

/// Minimum sidebar width.
pub const SIDEBAR_MIN_WIDTH: u16 = 28;
/// Default sidebar width ratio (percentage of terminal width).
pub const SIDEBAR_DEFAULT_RATIO: u16 = 30;

/// Render the full sidebar: vertical separator + bordered panel.
pub fn render_sidebar_chrome(
    frame: &mut Frame,
    area: Rect,
    active_panel: SidebarPanel,
) {
    if area.width < 5 || area.height < 3 {
        return;
    }

    // Render vertical separator line at the left edge of the sidebar area
    let sep_x = area.x;
    let sep_area = Rect {
        x: sep_x,
        y: area.y,
        width: 1,
        height: area.height,
    };
    let sep_lines: Vec<Line<'static>> = (0..area.height)
        .map(|_| Line::from(Span::styled("│", Style::default().fg(rgb(45, 45, 65)))))
        .collect();
    frame.render_widget(Paragraph::new(sep_lines), sep_area);

    // Sidebar panel content area (1 col right of separator)
    let panel_area = Rect {
        x: area.x + 1,
        y: area.y,
        width: area.width.saturating_sub(1),
        height: area.height,
    };

    if panel_area.width < 4 || panel_area.height < 3 {
        return;
    }

    // Border around the panel
    let border = Block::default()
        .borders(Borders::ALL)
        .border_type(ratatui::widgets::BorderType::Rounded)
        .border_style(Style::default().fg(rgb(50, 50, 70)))
        .title(Span::styled(
            format!(" {} {} ", active_panel.label(), "[Esc]"),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        ))
        .style(Style::default().bg(rgb(12, 12, 20)));

    let inner = border.inner(panel_area);
    frame.render_widget(border, panel_area);

    if inner.width < 3 || inner.height < 2 {
        return;
    }

    // Tab bar row (panel quick-switch with shortcut hints)
    let tab_area = Rect {
        x: inner.x,
        y: inner.y,
        width: inner.width,
        height: 1,
    };

    let mut tab_spans: Vec<Span<'static>> = Vec::new();
    for panel in SidebarPanel::all() {
        let is_active = *panel == active_panel;
        let label = if is_active {
            format!("[{}]", panel.shortcut())
        } else {
            format!(" {} ", panel.shortcut())
        };
        let style = if is_active {
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD | Modifier::REVERSED)
        } else {
            Style::default().fg(rgb(80, 80, 100))
        };
        tab_spans.push(Span::styled(label, style));
    }
    frame.render_widget(Paragraph::new(Line::from(tab_spans)), tab_area);

    // Separator line under tabs
    let sep_under = Rect {
        x: inner.x,
        y: inner.y + 1,
        width: inner.width,
        height: 1,
    };
    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            "─".repeat(inner.width as usize),
            Style::default().fg(rgb(35, 35, 55)),
        ))),
        sep_under,
    );

    // Content area (below separator)
    let content_area = Rect {
        x: inner.x,
        y: inner.y + 2,
        width: inner.width,
        height: inner.height.saturating_sub(2),
    };

    render_panel_content(frame, content_area, active_panel);
}

fn render_panel_content(frame: &mut Frame, area: Rect, panel: SidebarPanel) {
    if area.width == 0 || area.height == 0 {
        return;
    }

    match panel {
        SidebarPanel::FileExplorer => render_file_explorer(frame, area),
        SidebarPanel::Git => render_git_panel(frame, area),
        SidebarPanel::Search => render_search_panel(frame, area),
        SidebarPanel::Build => render_build_panel(frame, area),
        SidebarPanel::Log => render_log_panel(frame, area),
        SidebarPanel::Docker => render_docker_panel(frame, area),
        SidebarPanel::Cicd => render_cicd_panel(frame, area),
        SidebarPanel::Provider => render_provider_panel(frame, area),
        SidebarPanel::Profiler => render_profiler_panel(frame, area),
        SidebarPanel::Debugger => render_debugger_panel(frame, area),
        SidebarPanel::Split => render_split_panel(frame, area),
    }
}

fn render_file_explorer(frame: &mut Frame, area: Rect) {
    // Fetch cached file listing
    let output = shell_output("ls -la --color=never 2>/dev/null || dir /b 2>nul", 5);
    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " File Explorer",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));
    if output.is_empty() {
        lines.push(Line::from(Span::styled(
            "  Loading...",
            Style::default().fg(dim_color()),
        )));
    } else {
        for line in output.lines().take(area.height.saturating_sub(3) as usize) {
            let truncated: String = line.chars().take(area.width.saturating_sub(2) as usize).collect();
            lines.push(Line::from(Span::styled(
                format!("  {}", truncated),
                Style::default().fg(rgb(180, 180, 200)),
            )));
        }
    }
    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_git_panel(frame: &mut Frame, area: Rect) {
    let branch = shell_output("git rev-parse --abbrev-ref HEAD 2>/dev/null", 5);
    let status = shell_output("git status --porcelain -b 2>/dev/null | head -20", 5);
    let log = shell_output("git log --oneline -10 2>/dev/null", 5);

    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " Git",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    // Branch
    let branch_name = branch.trim().lines().next().unwrap_or("(unknown)");
    lines.push(Line::from(vec![
        Span::styled("  Branch: ", Style::default().fg(dim_color())),
        Span::styled(branch_name.to_string(), Style::default().fg(neon_green()).add_modifier(Modifier::BOLD)),
    ]));

    // Status summary
    if !status.is_empty() {
        let modified = status.lines().filter(|l| l.contains('M')).count();
        let untracked = status.lines().filter(|l| l.starts_with("??")).count();
        lines.push(Line::from(""));
        if modified > 0 {
            lines.push(Line::from(vec![
                Span::styled("  M ", Style::default().fg(neon_yellow())),
                Span::styled(format!("{} modified", modified), Style::default().fg(rgb(180, 180, 200))),
            ]));
        }
        if untracked > 0 {
            lines.push(Line::from(vec![
                Span::styled("  ? ", Style::default().fg(neon_purple())),
                Span::styled(format!("{} untracked", untracked), Style::default().fg(rgb(180, 180, 200))),
            ]));
        }
        if modified == 0 && untracked == 0 {
            lines.push(Line::from(Span::styled(
                "  Clean working tree",
                Style::default().fg(neon_green()),
            )));
        }
    }

    // Recent commits
    if !log.is_empty() {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "  Recent:",
            Style::default().fg(dim_color()).add_modifier(Modifier::BOLD),
        )));
        for entry in log.lines().take(5) {
            let truncated: String = entry.chars().take(area.width.saturating_sub(4) as usize).collect();
            lines.push(Line::from(Span::styled(
                format!("  {}", truncated),
                Style::default().fg(rgb(180, 180, 200)),
            )));
        }
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_search_panel(frame: &mut Frame, area: Rect) {
    let lines = vec![
        Line::from(Span::styled(
            " Search",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Type in input to search:",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  /pattern to find code",
            Style::default().fg(rgb(180, 180, 200)),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  F3 / Alt+Z to toggle",
            Style::default().fg(dim_color()),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_build_panel(frame: &mut Frame, area: Rect) {
    let output = shell_output("cargo build 2>&1 | tail -10", 10);
    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " Build Output",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));
    if output.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No recent build output",
            Style::default().fg(dim_color()),
        )));
        lines.push(Line::from(Span::styled(
            "  Alt+O to run build",
            Style::default().fg(dim_color()),
        )));
    } else {
        for line in output.lines().take(area.height.saturating_sub(3) as usize) {
            let is_error = line.contains("error") || line.contains("warning");
            let truncated: String = line.chars().take(area.width.saturating_sub(2) as usize).collect();
            let style = if is_error {
                Style::default().fg(rgb(255, 80, 80))
            } else {
                Style::default().fg(rgb(180, 180, 200))
            };
            lines.push(Line::from(Span::styled(format!("  {}", truncated), style)));
        }
    }
    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_log_panel(frame: &mut Frame, area: Rect) {
    let log_dir = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE/logs"))
        .unwrap_or_default();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let log_file = log_dir.join(format!("IDEOCODE-{}.log", today));

    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " Session Log",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    if log_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&log_file) {
            let tail_lines: Vec<&str> = content.lines().rev().take(20).collect();
            for line in tail_lines.into_iter().rev() {
                let truncated: String = line.chars().take(area.width.saturating_sub(2) as usize).collect();
                lines.push(Line::from(Span::styled(
                    format!("  {}", truncated),
                    Style::default().fg(rgb(180, 180, 200)),
                )));
            }
        }
    } else {
        lines.push(Line::from(Span::styled(
            "  No log file for today",
            Style::default().fg(dim_color()),
        )));
    }

    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_docker_panel(frame: &mut Frame, area: Rect) {
    let output = shell_output(
        "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | head -15",
        5,
    );
    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " Docker Containers",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));
    if output.is_empty() || output.contains("Cannot connect") {
        lines.push(Line::from(Span::styled(
            "  Docker not available",
            Style::default().fg(dim_color()),
        )));
    } else {
        for line in output.lines().take(area.height.saturating_sub(3) as usize) {
            let truncated: String = line.chars().take(area.width.saturating_sub(2) as usize).collect();
            let is_header = line.contains("NAMES") || line.contains("───");
            let style = if is_header {
                Style::default().fg(dim_color()).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(rgb(180, 180, 200))
            };
            lines.push(Line::from(Span::styled(format!("  {}", truncated), style)));
        }
    }
    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_cicd_panel(frame: &mut Frame, area: Rect) {
    let output = shell_output(
        "gh run list --limit 10 2>/dev/null || echo 'gh CLI unavailable'",
        5,
    );
    let mut lines: Vec<Line<'static>> = Vec::new();
    lines.push(Line::from(Span::styled(
        " CI/CD Pipelines",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));
    if output.is_empty() || output.contains("unavailable") {
        lines.push(Line::from(Span::styled(
            "  gh CLI unavailable",
            Style::default().fg(dim_color()),
        )));
    } else {
        for line in output.lines().take(area.height.saturating_sub(3) as usize) {
            let truncated: String = line.chars().take(area.width.saturating_sub(2) as usize).collect();
            let style = if line.contains("completed") || line.contains("success") {
                Style::default().fg(neon_green())
            } else if line.contains("failure") || line.contains("failed") {
                Style::default().fg(rgb(255, 80, 80))
            } else if line.contains("in_progress") || line.contains("running") {
                Style::default().fg(neon_yellow())
            } else {
                Style::default().fg(rgb(180, 180, 200))
            };
            lines.push(Line::from(Span::styled(format!("  {}", truncated), style)));
        }
    }
    frame.render_widget(
        Paragraph::new(lines).wrap(Wrap { trim: false }),
        area,
    );
}

fn render_provider_panel(frame: &mut Frame, area: Rect) {
    let lines = vec![
        Line::from(Span::styled(
            " Provider Manager",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(vec![
            Span::styled("  Active: ", Style::default().fg(dim_color())),
            Span::styled("Claude", Style::default().fg(neon_green()).add_modifier(Modifier::BOLD)),
        ]),
        Line::from(vec![
            Span::styled("  Model: ", Style::default().fg(dim_color())),
            Span::styled("sonnet-4-20250514", Style::default().fg(rgb(180, 180, 200))),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  [p] Switch model",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  [v] Full provider UI",
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Supported providers:",
            Style::default().fg(dim_color()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            "  Anthropic / OpenAI / Google",
            Style::default().fg(rgb(180, 180, 200)),
        )),
        Line::from(Span::styled(
            "  AWS Bedrock / Azure / OpenRouter",
            Style::default().fg(rgb(180, 180, 200)),
        )),
        Line::from(Span::styled(
            "  GitHub Copilot / Ollama / xAI",
            Style::default().fg(rgb(180, 180, 200)),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_profiler_panel(frame: &mut Frame, area: Rect) {
    let lines = vec![
        Line::from(Span::styled(
            " Performance",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Render stats tracked per-frame.",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  Enable profiler overlay with",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  Ctrl+Shift+P.",
            Style::default().fg(dim_color()),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_debugger_panel(frame: &mut Frame, area: Rect) {
    let lines = vec![
        Line::from(Span::styled(
            " Debugger",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Runtime debug socket",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  active on debug port.",
            Style::default().fg(dim_color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Logs at ~/.IDEOCODE/logs/",
            Style::default().fg(dim_color()),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_split_panel(frame: &mut Frame, area: Rect) {
    let lines = vec![
        Line::from(Span::styled(
            " Split Terminal",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "  Alt+S to toggle split",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  Multiple panes for",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  side-by-side editing.",
            Style::default().fg(dim_color()),
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

/// Compute sidebar area from the full terminal area.
pub fn compute_sidebar_area(area: Rect) -> Rect {
    let sidebar_width = (area.width * SIDEBAR_DEFAULT_RATIO / 100).max(SIDEBAR_MIN_WIDTH);
    let sidebar_width = sidebar_width.min(area.width / 2);

    Rect {
        x: area.x + area.width - sidebar_width,
        y: area.y,
        width: sidebar_width,
        height: area.height,
    }
}

/// Compute chat area minus the sidebar.
pub fn compute_chat_area_without_sidebar(area: Rect) -> Rect {
    let sidebar_width = (area.width * SIDEBAR_DEFAULT_RATIO / 100).max(SIDEBAR_MIN_WIDTH);
    let sidebar_width = sidebar_width.min(area.width / 2);

    Rect {
        x: area.x,
        y: area.y,
        width: area.width.saturating_sub(sidebar_width),
        height: area.height,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sidebar_width_calc() {
        let area = Rect::new(0, 0, 120, 40);
        let sidebar = compute_sidebar_area(area);
        assert!(sidebar.width >= SIDEBAR_MIN_WIDTH);
        assert!(sidebar.width <= area.width / 2);
    }

    #[test]
    fn panel_navigation() {
        let panel = SidebarPanel::Git;
        let next = panel.next();
        assert_eq!(next, SidebarPanel::Search);
        let prev = panel.prev();
        assert_eq!(prev, SidebarPanel::FileExplorer);
    }

    #[test]
    fn all_panels_have_labels() {
        for panel in SidebarPanel::all() {
            assert!(!panel.label().is_empty());
            assert!(!panel.icon().is_empty());
            assert!(!panel.shortcut().is_empty());
        }
    }
}
