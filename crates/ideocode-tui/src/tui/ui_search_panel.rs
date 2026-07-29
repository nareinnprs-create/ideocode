//! IDEOCODE Search Results Panel (#7)
//!
//! Real grep/ripgrep search with results display and jump-to-line.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

#[derive(Debug, Clone)]
pub struct SearchHit {
    pub file: String,
    pub line: usize,
    pub text: String,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

pub struct SearchPanelState {
    pub visible: bool,
    pub query: String,
    pub results: Vec<SearchHit>,
    pub selected: usize,
    pub scroll: usize,
    pub total_matches: usize,
    pub search_path: String,
    pub is_case_sensitive: bool,
    pub is_regex: bool,
}

impl Default for SearchPanelState {
    fn default() -> Self {
        Self::new()
    }
}

impl SearchPanelState {
    pub fn new() -> Self {
        Self {
            visible: false,
            query: String::new(),
            results: Vec::new(),
            selected: 0,
            scroll: 0,
            total_matches: 0,
            search_path: ".".to_string(),
            is_case_sensitive: false,
            is_regex: false,
        }
    }

    pub fn search(&mut self, query: &str) {
        self.query = query.to_string();
        self.results.clear();
        self.selected = 0;
        self.scroll = 0;

        if query.is_empty() { return; }

        let pattern = if self.is_regex {
            query.to_string()
        } else {
            regex::escape(query)
        };

        let mut cmd = format!("grep -rn --include='*.rs' --include='*.ts' --include='*.js' --include='*.py' --include='*.go' --include='*.md' '{}'", pattern);
        if !self.is_case_sensitive {
            cmd = format!("grep -rni --include='*.rs' --include='*.ts' --include='*.js' --include='*.py' --include='*.go' --include='*.md' '{}' .", pattern);
        }

        let output = run_cmd(&cmd);
        self.total_matches = output.len();

        for line in output.into_iter().take(200) {
            let parts: Vec<&str> = line.splitn(3, ':').collect();
            if parts.len() >= 3 {
                let file = parts[0].to_string();
                let line_num = parts[1].parse::<usize>().unwrap_or(0);
                let text = parts[2..].join(":");
                self.results.push(SearchHit {
                    file, line: line_num, text,
                    context_before: Vec::new(),
                    context_after: Vec::new(),
                });
            }
        }
    }

    pub fn move_up(&mut self) {
        self.selected = self.selected.saturating_sub(1);
    }

    pub fn move_down(&mut self) {
        if self.selected + 1 < self.results.len() {
            self.selected += 1;
        }
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        self.scroll += 1;
    }

    pub fn get_selected_file(&self) -> Option<(&str, usize)> {
        self.results.get(self.selected).map(|r| (r.file.as_str(), r.line))
    }
}

/// Render the search panel.
pub fn render_search_panel(frame: &mut Frame, area: Rect, state: &SearchPanelState) {
    if !state.visible { return; }

    let panel_height = (area.height / 2).max(6);
    let panel_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: panel_height,
    };

    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(vec![
        Span::styled("🔍 Search ", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
        Span::styled(
            format!("[{}]", state.query),
            Style::default().fg(neon_green()),
        ),
        Span::styled(
            format!(" {} matches", state.total_matches),
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            if state.is_regex { " (regex)" } else { "" },
            Style::default().fg(neon_yellow()),
        ),
    ]));
    lines.push(Line::from("─".repeat(area.width as usize)));

    if state.results.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No results. Type to search...",
            Style::default().fg(dim_color()),
        )));
    }

    let max_visible = panel_height as usize - 3;
    for (i, hit) in state.results.iter().skip(state.scroll).take(max_visible).enumerate() {
        let is_selected = i + state.scroll == state.selected;
        lines.push(Line::from(vec![
            Span::styled(
                format!("  {}:", hit.file),
                Style::default().fg(neon_blue()),
            ),
            Span::styled(
                format!("{}:", hit.line),
                Style::default().fg(neon_yellow()),
            ),
            Span::styled(
                hit.text.chars().take(80).collect::<String>(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
        ]));
    }

    if state.results.len() > max_visible {
        lines.push(Line::from(Span::styled(
            format!("  ... {} more results", state.results.len() - max_visible),
            Style::default().fg(dim_color()),
        )));
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
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
