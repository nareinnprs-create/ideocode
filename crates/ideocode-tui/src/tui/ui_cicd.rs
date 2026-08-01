// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE CI/CD Status Panel (#13)
//!
//! Real GitHub Actions / CI status via `gh` CLI.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

pub struct CicdPanelState {
    pub visible: bool,
    pub runs: Vec<CicdRun>,
    pub selected: usize,
}

#[derive(Debug, Clone)]
pub struct CicdRun {
    pub branch: String,
    pub status: String,
    pub title: String,
    pub timestamp: String,
    pub is_success: bool,
}

impl Default for CicdPanelState {
    fn default() -> Self {
        Self::new()
    }
}

impl CicdPanelState {
    pub fn new() -> Self {
        let mut state = Self { visible: false, runs: Vec::new(), selected: 0 };
        state.refresh();
        state
    }

    pub fn refresh(&mut self) {
        self.runs.clear();
        let mut output = run_command(
            "gh",
            &["run", "list", "--limit", "10", "--json", "headBranch,status,conclusion,title,updatedAt"],
        );
        if output.is_empty() {
            output.push("[]".to_string());
        }
        // Parse JSON output
        if let Ok(json_str) = output.first().map(|s| s.as_str()).unwrap_or("[]").parse::<serde_json::Value>()
            && let Some(arr) = json_str.as_array() {
                for run in arr {
                    self.runs.push(CicdRun {
                        branch: run["headBranch"].as_str().unwrap_or("unknown").to_string(),
                        status: run["conclusion"].as_str().unwrap_or(run["status"].as_str().unwrap_or("unknown")).to_string(),
                        title: run["title"].as_str().unwrap_or("No title").to_string(),
                        timestamp: run["updatedAt"].as_str().unwrap_or("").to_string(),
                        is_success: run["conclusion"].as_str() == Some("success"),
                    });
                }
            }

        // Fallback: simple text parsing
        if self.runs.is_empty() {
            let output = run_command("gh", &["run", "list", "--limit", "5"]);
            for line in output {
                if line.contains("completed") || line.contains("success") || line.contains("failure") {
                    let is_success = line.contains("success") || line.contains("completed");
                    self.runs.push(CicdRun {
                        branch: "main".to_string(),
                        status: if is_success { "success".to_string() } else { "failure".to_string() },
                        title: line,
                        timestamp: String::new(),
                        is_success,
                    });
                }
            }
        }
    }

    pub fn move_up(&mut self) { self.selected = self.selected.saturating_sub(1); }
    pub fn move_down(&mut self) { if self.selected + 1 < self.runs.len() { self.selected += 1; } }
}

pub fn render_cicd_panel(frame: &mut Frame, area: Rect, state: &CicdPanelState) {
    if !state.visible { return; }
    let panel_height = (area.height / 3).max(4);
    let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        "🚀 CI/CD Status",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));

    if state.runs.is_empty() {
        lines.push(Line::from(Span::styled(
            "  No runs found (is gh CLI installed?)",
            Style::default().fg(dim_color()),
        )));
    }

    for (i, run) in state.runs.iter().take(panel_height as usize - 2).enumerate() {
        let is_selected = i == state.selected;
        let icon = if run.is_success { "✅" } else { "❌" };
        let color = if run.is_success { neon_green() } else { rgb(255, 80, 80) };
        lines.push(Line::from(vec![
            Span::styled(if is_selected { "▸ " } else { "  " }, Style::default().fg(if is_selected { neon_green() } else { dim_color() })),
            Span::styled(format!("{} ", icon), Style::default()),
            Span::styled(format!("[{}] ", run.branch), Style::default().fg(neon_yellow())),
            Span::styled(run.title.chars().take(50).collect::<String>(), Style::default().fg(color)),
        ]));
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
}

fn run_command(program: &str, args: &[&str]) -> Vec<String> {
    std::process::Command::new(program)
        .args(args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect())
        .unwrap_or_default()
}
