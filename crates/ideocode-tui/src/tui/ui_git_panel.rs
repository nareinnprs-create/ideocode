//! IDEOCODE Git Integration Panel (#5)
//!
//! Real git operations: status, diff, commit, branch, log.
//! Runs actual git commands and renders results.

use crate::tui::color_support::rgb;
use crate::tui::TuiState;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

#[derive(Debug, Clone, PartialEq)]
pub enum GitPanelTab {
    Status,
    Diff,
    Log,
    Branches,
}

impl GitPanelTab {
    pub fn label(&self) -> &str {
        match self {
            GitPanelTab::Status => "Status",
            GitPanelTab::Diff => "Diff",
            GitPanelTab::Log => "Log",
            GitPanelTab::Branches => "Branches",
        }
    }
}

pub struct GitPanelState {
    pub visible: bool,
    pub active_tab: GitPanelTab,
    pub branch: String,
    pub status_lines: Vec<String>,
    pub diff_lines: Vec<String>,
    pub log_lines: Vec<String>,
    pub branch_lines: Vec<String>,
    pub scroll: usize,
    pub selected_file: usize,
}

impl GitPanelState {
    pub fn new() -> Self {
        Self {
            visible: false,
            active_tab: GitPanelTab::Status,
            branch: String::new(),
            status_lines: Vec::new(),
            diff_lines: Vec::new(),
            log_lines: Vec::new(),
            branch_lines: Vec::new(),
            scroll: 0,
            selected_file: 0,
        }
    }

    pub fn refresh(&mut self) {
        self.branch = run_cmd("git rev-parse --abbrev-ref HEAD 2>/dev/null")
            .first()
            .cloned()
            .unwrap_or_else(|| "detached".to_string());

        self.status_lines = run_cmd("git status --short 2>/dev/null");
        self.diff_lines = run_cmd("git diff --stat 2>/dev/null");
        self.log_lines = run_cmd("git log --oneline -20 2>/dev/null");
        self.branch_lines = run_cmd("git branch --format='%(refname:short)%(if)%(HEAD)%(then) * (HEAD)%(end)' 2>/dev/null");
    }

    pub fn next_tab(&mut self) {
        self.active_tab = match self.active_tab {
            GitPanelTab::Status => GitPanelTab::Diff,
            GitPanelTab::Diff => GitPanelTab::Log,
            GitPanelTab::Log => GitPanelTab::Branches,
            GitPanelTab::Branches => GitPanelTab::Status,
        };
        self.scroll = 0;
    }

    pub fn prev_tab(&mut self) {
        self.active_tab = match self.active_tab {
            GitPanelTab::Status => GitPanelTab::Branches,
            GitPanelTab::Diff => GitPanelTab::Status,
            GitPanelTab::Log => GitPanelTab::Diff,
            GitPanelTab::Branches => GitPanelTab::Log,
        };
        self.scroll = 0;
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        self.scroll += 1;
    }
}

/// Render the full git panel.
pub fn render_git_panel(frame: &mut Frame, area: Rect, state: &GitPanelState) {
    if !state.visible { return; }

    let panel_height = (area.height * 2 / 3).max(8);
    let panel_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: panel_height,
    };

    let mut lines = Vec::new();

    // Header with tabs
    let tabs = [
        GitPanelTab::Status,
        GitPanelTab::Diff,
        GitPanelTab::Log,
        GitPanelTab::Branches,
    ];

    lines.push(Line::from(vec![
        Span::styled(
            "🔀 Git ",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("[{}] ", state.branch),
            Style::default().fg(neon_green()).add_modifier(Modifier::BOLD),
        ),
    ]));

    let mut tab_line_spans = vec![];
    for tab in &tabs {
        let is_active = *tab == state.active_tab;
        tab_line_spans.push(Span::styled(
            format!(" {} ", tab.label()),
            Style::default()
                .fg(if is_active { Color::Black } else { dim_color() })
                .bg(if is_active { neon_cyan() } else { Color::Black })
                .add_modifier(if is_active { Modifier::BOLD } else { Modifier::empty() }),
        ));
    }
    lines.push(Line::from(tab_line_spans));
    lines.push(Line::from("─".repeat(area.width as usize)));

    // Content based on active tab
    let content_lines = match state.active_tab {
        GitPanelTab::Status => render_status_lines(state),
        GitPanelTab::Diff => render_diff_lines(state),
        GitPanelTab::Log => render_log_lines(state),
        GitPanelTab::Branches => render_branch_lines(state),
    };

    let max_content = panel_height as usize - 4;
    for line in content_lines.iter().skip(state.scroll).take(max_content) {
        lines.push(line.clone());
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
}

fn render_status_lines(state: &GitPanelState) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    if state.status_lines.is_empty() {
        lines.push(Line::from(Span::styled(
            "  ✨ Working tree clean",
            Style::default().fg(neon_green()),
        )));
        return lines;
    }

    for (i, line) in state.status_lines.iter().enumerate() {
        let (status, filename) = if line.len() >= 3 {
            (&line[..2], &line[2..])
        } else {
            ("  ", line.as_str())
        };

        let (icon, color) = match status.trim() {
            "M" | " M" => ("M ", neon_yellow()),
            "A" | "A " => ("A ", neon_green()),
            "D" | "D " => ("D ", rgb(255, 80, 80)),
            "R" | "R " => ("R ", neon_magenta()),
            "?" | "??" => ("??", neon_cyan()),
            _ => ("  ", dim_color()),
        };

        let is_selected = i == state.selected_file;
        lines.push(Line::from(vec![
            Span::styled(
                format!("  {} ", icon),
                Style::default().fg(color),
            ),
            Span::styled(
                filename.trim().to_string(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
        ]));
    }
    lines
}

fn render_diff_lines(state: &GitPanelState) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    if state.diff_lines.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No changes staged",
            Style::default().fg(dim_color()),
        )));
        return lines;
    }
    for line in &state.diff_lines {
        let color = if line.contains("insertion") { neon_green() }
            else if line.contains("deletion") { rgb(255, 80, 80) }
            else if line.contains("file") { neon_cyan() }
            else { dim_color() };
        lines.push(Line::from(Span::styled(
            format!("  {}", line),
            Style::default().fg(color),
        )));
    }
    lines
}

fn render_log_lines(state: &GitPanelState) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    for line in &state.log_lines {
        let parts: Vec<&str> = line.splitn(2, ' ').collect();
        if parts.len() == 2 {
            lines.push(Line::from(vec![
                Span::styled(
                    format!("  {} ", parts[0]),
                    Style::default().fg(neon_yellow()),
                ),
                Span::styled(
                    parts[1].to_string(),
                    Style::default().fg(dim_color()),
                ),
            ]));
        } else {
            lines.push(Line::from(Span::styled(
                format!("  {}", line),
                Style::default().fg(dim_color()),
            )));
        }
    }
    lines
}

fn render_branch_lines(state: &GitPanelState) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    for line in &state.branch_lines {
        let is_current = line.contains("*") || line.contains("(HEAD)");
        let name = line.trim_start_matches('*').trim();
        lines.push(Line::from(vec![
            Span::styled(
                if is_current { "  ▸ " } else { "    " },
                Style::default().fg(if is_current { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                name.to_string(),
                Style::default()
                    .fg(if is_current { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_current { Modifier::BOLD } else { Modifier::empty() }),
            ),
        ]));
    }
    lines
}

fn run_cmd(cmd: &str) -> Vec<String> {
    #[cfg(windows)]
    let output = std::process::Command::new("cmd").arg("/C").arg(cmd).output();
    #[cfg(not(windows))]
    let output = std::process::Command::new("sh").arg("-c").arg(cmd).output();

    output
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn git_panel_new() {
        let state = GitPanelState::new();
        assert!(!state.visible);
        assert_eq!(state.active_tab, GitPanelTab::Status);
    }
}
