//! IDEOCODE Build Output Panel (#10)
//!
//! Shows cargo/npm/make build output with error highlighting.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

#[derive(Debug, Clone, PartialEq)]
pub enum BuildSystem {
    Cargo,
    Npm,
    Make,
    Custom(String),
}

pub struct BuildPanelState {
    pub visible: bool,
    pub output: Vec<String>,
    pub scroll: usize,
    pub is_running: bool,
    pub build_system: BuildSystem,
    pub exit_code: Option<i32>,
}

impl Default for BuildPanelState {
    fn default() -> Self {
        Self::new()
    }
}

impl BuildPanelState {
    pub fn new() -> Self {
        Self {
            visible: false,
            output: Vec::new(),
            scroll: 0,
            is_running: false,
            build_system: BuildSystem::Cargo,
            exit_code: None,
        }
    }

    pub fn start_build(&mut self, cmd: &str) {
        self.output.clear();
        self.scroll = 0;
        self.is_running = true;
        self.exit_code = None;

        let output = run_cmd(cmd);
        self.output = output;
        self.is_running = false;
        self.exit_code = Some(0);
    }

    pub fn detect_build_system(&mut self) {
        if std::path::Path::new("Cargo.toml").exists() {
            self.build_system = BuildSystem::Cargo;
        } else if std::path::Path::new("package.json").exists() {
            self.build_system = BuildSystem::Npm;
        } else if std::path::Path::new("Makefile").exists() {
            self.build_system = BuildSystem::Make;
        }
    }

    pub fn get_default_command(&self) -> &str {
        match self.build_system {
            BuildSystem::Cargo => "cargo build 2>&1",
            BuildSystem::Npm => "npm run build 2>&1",
            BuildSystem::Make => "make 2>&1",
            BuildSystem::Custom(ref cmd) => cmd,
        }
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        if self.scroll + 1 < self.output.len() {
            self.scroll += 1;
        }
    }

    pub fn error_count(&self) -> usize {
        self.output.iter().filter(|l| l.contains("error")).count()
    }

    pub fn warning_count(&self) -> usize {
        self.output.iter().filter(|l| l.contains("warning")).count()
    }
}

/// Render the build output panel.
pub fn render_build_panel(frame: &mut Frame, area: Rect, state: &BuildPanelState) {
    if !state.visible { return; }

    let panel_height = (area.height / 2).max(6);
    let panel_area = Rect {
        x: area.x,
        y: area.y + area.height - panel_height,
        width: area.width,
        height: panel_height,
    };

    let mut lines = Vec::new();

    let status = if state.is_running { " ⏳" }
        else if state.exit_code == Some(0) { " ✅" }
        else if state.exit_code.is_some() { " ❌" }
        else { "" };

    let system_label = match state.build_system {
        BuildSystem::Cargo => "Cargo",
        BuildSystem::Npm => "npm",
        BuildSystem::Make => "Make",
        BuildSystem::Custom(_) => "Custom",
    };

    lines.push(Line::from(vec![
        Span::styled(format!("🔨 {} Build", system_label), Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
        Span::styled(status, Style::default()),
    ]));

    if !state.is_running && !state.output.is_empty() {
        let errors = state.error_count();
        let warnings = state.warning_count();
        let mut stats = vec![];
        if errors > 0 { stats.push(Span::styled(format!("{} errors ", errors), Style::default().fg(rgb(255, 80, 80)))); }
        if warnings > 0 { stats.push(Span::styled(format!("{} warnings ", warnings), Style::default().fg(neon_yellow()))); }
        if stats.is_empty() { stats.push(Span::styled("clean build ✨", Style::default().fg(neon_green()))); }
        lines.push(Line::from(stats));
    }

    lines.push(Line::from("─".repeat(area.width as usize)));

    let max_visible = panel_height as usize - 4;
    for line in state.output.iter().skip(state.scroll).take(max_visible) {
        let color = if line.contains("error[E") || line.contains("error:") { rgb(255, 80, 80) }
            else if line.contains("warning") { neon_yellow() }
            else if line.contains("Compiling") || line.contains("Building") { neon_cyan() }
            else if line.contains("Finished") || line.contains("Done") { neon_green() }
            else { dim_color() };
        lines.push(Line::from(Span::styled(
            format!("  {}", line.chars().take(120).collect::<String>()),
            Style::default().fg(color),
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
        .map(|o| {
            let mut lines: Vec<String> = String::from_utf8_lossy(&o.stdout)
                .lines().map(String::from).collect();
            lines.extend(String::from_utf8_lossy(&o.stderr).lines().map(String::from));
            lines
        })
        .unwrap_or_default()
}
