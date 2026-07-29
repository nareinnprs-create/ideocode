//! IDEOCODE Log Viewer Panel (#8)
//!
//! Live tail of IDEOCODE logs with filtering and color coding.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq)]
pub enum LogLevel {
    All,
    Info,
    Warn,
    Error,
}

pub struct LogViewerState {
    pub visible: bool,
    pub lines: Vec<String>,
    pub scroll: usize,
    pub filter: LogLevel,
    pub auto_scroll: bool,
    pub log_path: Option<PathBuf>,
}

impl Default for LogViewerState {
    fn default() -> Self {
        Self::new()
    }
}

impl LogViewerState {
    pub fn new() -> Self {
        let log_dir = dirs::home_dir()
            .map(|h| h.join(".IDEOCODE").join("logs"))
            .unwrap_or_else(|| PathBuf::from("."));
        let log_path = find_latest_log(&log_dir);

        let mut state = Self {
            visible: false,
            lines: Vec::new(),
            scroll: 0,
            filter: LogLevel::All,
            auto_scroll: true,
            log_path,
        };
        state.refresh();
        state
    }

    pub fn refresh(&mut self) {
        self.lines.clear();
        if let Some(ref path) = self.log_path
            && let Ok(content) = std::fs::read_to_string(path) {
                self.lines = content.lines().map(String::from).collect();
            }
        if self.auto_scroll {
            self.scroll = self.lines.len().saturating_sub(50);
        }
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        if self.scroll + 1 < self.lines.len() {
            self.scroll += 1;
        }
    }

    pub fn scroll_to_bottom(&mut self) {
        self.scroll = self.lines.len().saturating_sub(50);
    }

    pub fn next_filter(&mut self) {
        self.filter = match self.filter {
            LogLevel::All => LogLevel::Info,
            LogLevel::Info => LogLevel::Warn,
            LogLevel::Warn => LogLevel::Error,
            LogLevel::Error => LogLevel::All,
        };
    }

    fn filtered_lines(&self) -> Vec<&String> {
        self.lines.iter().filter(|line| {
            match self.filter {
                LogLevel::All => true,
                LogLevel::Info => line.contains("INFO"),
                LogLevel::Warn => line.contains("WARN"),
                LogLevel::Error => line.contains("ERROR"),
            }
        }).collect()
    }
}

/// Render the log viewer panel.
pub fn render_log_viewer(frame: &mut Frame, area: Rect, state: &LogViewerState) {
    if !state.visible { return; }

    let panel_height = (area.height / 2).max(6);
    let panel_area = Rect {
        x: area.x,
        y: area.y + area.height - panel_height,
        width: area.width,
        height: panel_height,
    };

    let filtered = state.filtered_lines();
    let mut lines = Vec::new();

    lines.push(Line::from(vec![
        Span::styled("📜 Logs ", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
        Span::styled(
            format!("[{:?}]", state.filter),
            Style::default().fg(neon_yellow()),
        ),
        Span::styled(
            format!(" {} lines", filtered.len()),
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            if state.auto_scroll { " (auto)" } else { "" },
            Style::default().fg(neon_green()),
        ),
    ]));
    lines.push(Line::from("─".repeat(area.width as usize)));

    let max_visible = panel_height as usize - 3;
    for line in filtered.iter().skip(state.scroll).take(max_visible) {
        let color = if line.contains("ERROR") { rgb(255, 80, 80) }
            else if line.contains("WARN") { neon_yellow() }
            else if line.contains("INFO") { neon_green() }
            else { dim_color() };
        lines.push(Line::from(Span::styled(
            format!("  {}", line.chars().take(120).collect::<String>()),
            Style::default().fg(color),
        )));
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
}

fn find_latest_log(dir: &std::path::Path) -> Option<PathBuf> {
    let mut entries: Vec<_> = std::fs::read_dir(dir).ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "log").unwrap_or(false))
        .collect();
    entries.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    entries.first().map(|e| e.path())
}
