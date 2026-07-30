// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Docker Panel (#12)
//!
//! Real Docker container status and logs.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

pub struct DockerPanelState {
    pub visible: bool,
    pub containers: Vec<DockerContainer>,
    pub selected: usize,
    pub scroll: usize,
}

#[derive(Debug, Clone)]
pub struct DockerContainer {
    pub name: String,
    pub image: String,
    pub status: String,
    pub ports: String,
    pub is_running: bool,
}

impl Default for DockerPanelState {
    fn default() -> Self {
        Self::new()
    }
}

impl DockerPanelState {
    pub fn new() -> Self {
        let mut state = Self { visible: false, containers: Vec::new(), selected: 0, scroll: 0 };
        state.refresh();
        state
    }

    pub fn refresh(&mut self) {
        self.containers.clear();
        let output = run_cmd("docker ps -a --format '{{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}' 2>/dev/null || echo 'Docker not available'");
        for line in output {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 3 {
                self.containers.push(DockerContainer {
                    name: parts[0].to_string(),
                    image: parts[1].to_string(),
                    status: parts[2].to_string(),
                    ports: parts.get(3).unwrap_or(&"").to_string(),
                    is_running: parts[2].contains("Up"),
                });
            }
        }
    }

    pub fn move_up(&mut self) { self.selected = self.selected.saturating_sub(1); }
    pub fn move_down(&mut self) { if self.selected + 1 < self.containers.len() { self.selected += 1; } }

    pub fn get_container_logs(&self, name: &str) -> Vec<String> {
        run_cmd(&format!("docker logs --tail 50 {} 2>&1", name))
    }
}

pub fn render_docker_panel(frame: &mut Frame, area: Rect, state: &DockerPanelState) {
    if !state.visible { return; }
    let panel_height = (area.height / 3).max(4);
    let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        "🐳 Docker Containers",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));

    for (i, c) in state.containers.iter().take(panel_height as usize - 2).enumerate() {
        let is_selected = i == state.selected;
        let color = if c.is_running { neon_green() } else { rgb(255, 80, 80) };
        let icon = if c.is_running { "🟢" } else { "🔴" };
        lines.push(Line::from(vec![
            Span::styled(if is_selected { "▸ " } else { "  " }, Style::default().fg(if is_selected { neon_green() } else { dim_color() })),
            Span::styled(format!("{} {} ", icon, c.name), Style::default().fg(neon_blue())),
            Span::styled(c.status.chars().take(30).collect::<String>(), Style::default().fg(color)),
            Span::styled(format!(" ({})", c.image.chars().take(20).collect::<String>()), Style::default().fg(dim_color())),
        ]));
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
}

fn run_cmd(cmd: &str) -> Vec<String> {
    #[cfg(windows)]
    let output = std::process::Command::new("cmd").arg("/C").arg(cmd).output();
    #[cfg(not(windows))]
    let output = std::process::Command::new("sh").arg("-c").arg(cmd).output();
    output.map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect()).unwrap_or_default()
}
