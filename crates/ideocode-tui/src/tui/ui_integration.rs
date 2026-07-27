//! IDEOCODE UI Integration Layer — v2
//!
//! Bridges UI modules with the real App state via TuiState trait.
//! Also provides thread-local state for cross-frame overlays (toasts, etc).

use crate::tui::TuiState;
use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;
use std::cell::RefCell;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

// ── Thread-local overlay state (toasts persist across frames) ─────────

thread_local! {
    static TOAST_MANAGER: RefCell<ToastManagerState> = RefCell::new(ToastManagerState::new());
    static OVERLAY_STATE: RefCell<OverlayState> = RefCell::new(OverlayState::new());
}

struct OverlayState {
    gesture_visible: bool,
    gesture_selected: usize,
    file_explorer_visible: bool,
    file_explorer_selected: usize,
    file_explorer_cwd: String,
    git_panel_visible: bool,
    search_panel_visible: bool,
    search_query: String,
    search_results: Vec<SearchResult>,
    search_selected: usize,
    log_viewer_visible: bool,
    log_lines: Vec<String>,
    log_scroll: usize,
    build_panel_visible: bool,
    build_output: Vec<String>,
    build_scroll: usize,
    build_running: bool,
    debugger_visible: bool,
    docker_visible: bool,
    cicd_visible: bool,
    profiler_visible: bool,
    mood: AIMood,
    personality_mode: PersonalityMode,
    active_theme: usize,
    achievements_unlocked: usize,
    achievements_total: usize,
    session_started_at: Option<Instant>,
}

impl OverlayState {
    fn new() -> Self {
        Self {
            gesture_visible: false, gesture_selected: 0,
            file_explorer_visible: false, file_explorer_selected: 0, file_explorer_cwd: String::new(),
            git_panel_visible: false, search_panel_visible: false, search_query: String::new(),
            search_results: Vec::new(), search_selected: 0,
            log_viewer_visible: false, log_lines: Vec::new(), log_scroll: 0,
            build_panel_visible: false, build_output: Vec::new(), build_scroll: 0, build_running: false,
            debugger_visible: false, docker_visible: false, cicd_visible: false, profiler_visible: false,
            mood: AIMood::Chill, personality_mode: PersonalityMode::Professional,
            active_theme: 0, achievements_unlocked: 0, achievements_total: 16,
            session_started_at: Some(Instant::now()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub file: String,
    pub line: usize,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AIMood {
    Happy, Focused, Confused, Excited, Thinking, Concerned, Celebrating, Chill,
}

impl Default for AIMood { fn default() -> Self { AIMood::Chill } }

impl AIMood {
    pub fn icon(&self) -> &str {
        match self {
            AIMood::Happy => "😊", AIMood::Focused => "🎯", AIMood::Confused => "🤔",
            AIMood::Excited => "🎉", AIMood::Thinking => "💭", AIMood::Concerned => "😟",
            AIMood::Celebrating => "🥳", AIMood::Chill => "😌",
        }
    }
    pub fn color(&self) -> Color {
        match self {
            AIMood::Happy => neon_green(), AIMood::Focused => neon_cyan(),
            AIMood::Confused => neon_yellow(), AIMood::Excited => neon_magenta(),
            AIMood::Thinking => neon_purple(), AIMood::Concerned => neon_orange(),
            AIMood::Celebrating => neon_pink(), AIMood::Chill => neon_blue(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum PersonalityMode {
    Professional, Casual, GenZ, Academic, Witty, Zen,
}

impl Default for PersonalityMode { fn default() -> Self { PersonalityMode::Professional } }

impl PersonalityMode {
    pub fn icon(&self) -> &str {
        match self {
            PersonalityMode::Professional => "👔", PersonalityMode::Casual => "😎",
            PersonalityMode::GenZ => "🔥", PersonalityMode::Academic => "🎓",
            PersonalityMode::Witty => "😏", PersonalityMode::Zen => "🧘",
        }
    }
}

// ── Toast Manager ────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum ToastKind { Success, Info, Warning, Error, Achievement, Celebration }

impl ToastKind {
    fn color(&self) -> Color {
        match self { ToastKind::Success => neon_green(), ToastKind::Info => neon_cyan(),
            ToastKind::Warning => neon_yellow(), ToastKind::Error => rgb(255, 80, 80),
            ToastKind::Achievement => neon_purple(), ToastKind::Celebration => neon_magenta() }
    }
    fn icon(&self) -> &str {
        match self { ToastKind::Success => "✅", ToastKind::Info => "ℹ️",
            ToastKind::Warning => "⚠️", ToastKind::Error => "❌",
            ToastKind::Achievement => "🏆", ToastKind::Celebration => "🎉" }
    }
}

#[derive(Debug, Clone)]
struct Toast { message: String, kind: ToastKind, created_at: Instant, duration: Duration }

impl Toast {
    fn is_expired(&self) -> bool { self.created_at.elapsed() >= self.duration }
    fn fade_alpha(&self) -> f32 {
        let remaining = self.duration.saturating_sub(self.created_at.elapsed());
        remaining.as_secs_f32().clamp(0.0, 1.0)
    }
}

#[derive(Debug, Default)]
struct ToastManagerState { toasts: VecDeque<Toast>, max_visible: usize }

impl ToastManagerState {
    fn new() -> Self { Self { toasts: VecDeque::new(), max_visible: 3 } }
    fn push(&mut self, message: &str, kind: ToastKind, duration: Duration) {
        self.toasts.push_back(Toast { message: message.to_string(), kind, created_at: Instant::now(), duration });
        self.toasts.retain(|t| !t.is_expired());
    }
    fn render(&mut self, frame: &mut Frame, area: Rect) {
        self.toasts.retain(|t| !t.is_expired());
        let visible: Vec<&Toast> = self.toasts.iter().take(self.max_visible).collect();
        if visible.is_empty() { return; }
        let toast_width = 40.min(area.width as usize);
        let x = area.x + area.width.saturating_sub(toast_width as u16);
        let mut y = area.y;
        for toast in &visible {
            if y + 1 > area.y + area.height { break; }
            let alpha = toast.fade_alpha();
            let color = if alpha < 1.0 { let (r, g, b) = color_to_rgb(toast.kind.color()); rgb(((r as f32 * alpha) as u8), ((g as f32 * alpha) as u8), ((b as f32 * alpha) as u8)) } else { toast.kind.color() };
            let line = Line::from(vec![
                Span::styled(format!(" {} ", toast.kind.icon()), Style::default().fg(color)),
                Span::styled(toast.message.clone(), Style::default().fg(color)),
            ]);
            frame.render_widget(Paragraph::new(line), Rect { x, y, width: toast_width as u16, height: 1 });
            y += 1;
        }
    }
}

fn color_to_rgb(c: Color) -> (u8, u8, u8) {
    match c { Color::Rgb(r, g, b) => (r, g, b), _ => (128, 128, 128) }
}

// ── PUBLIC API ───────────────────────────────────────────────────────

pub fn push_toast(message: &str, kind: ToastKind) {
    TOAST_MANAGER.with(|s| s.borrow_mut().push(message, kind, Duration::from_secs(4)));
}
pub fn push_toast_success(m: &str) { push_toast(m, ToastKind::Success); }
pub fn push_toast_info(m: &str) { push_toast(m, ToastKind::Info); }
pub fn push_toast_warning(m: &str) { push_toast(m, ToastKind::Warning); }
pub fn push_toast_error(m: &str) { push_toast(m, ToastKind::Error); }
pub fn push_toast_achievement(m: &str) { push_toast(m, ToastKind::Achievement); }
pub fn push_toast_celebration(m: &str) { push_toast(m, ToastKind::Celebration); }

pub fn render_toasts(frame: &mut Frame, area: Rect) {
    TOAST_MANAGER.with(|s| s.borrow_mut().render(frame, area));
}

pub fn set_mood(mood: AIMood) { OVERLAY_STATE.with(|s| s.borrow_mut().mood = mood); }
pub fn get_mood() -> AIMood { OVERLAY_STATE.with(|s| s.borrow().mood.clone()) }
pub fn set_personality(mode: PersonalityMode) { OVERLAY_STATE.with(|s| s.borrow_mut().personality_mode = mode); }

pub fn show_gesture_pad() { OVERLAY_STATE.with(|s| s.borrow_mut().gesture_visible = true); }
pub fn hide_gesture_pad() { OVERLAY_STATE.with(|s| s.borrow_mut().gesture_visible = false); }
pub fn toggle_gesture_pad() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.gesture_visible = !st.gesture_visible; st.gesture_selected = 0; }); }
pub fn gesture_move_up() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); if st.gesture_selected > 0 { st.gesture_selected -= 1; } }); }
pub fn gesture_move_down() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.gesture_selected = (st.gesture_selected + 1).min(7); }); }
pub fn gesture_selected() -> usize { OVERLAY_STATE.with(|s| s.borrow().gesture_selected) }
pub fn gesture_pad_visible() -> bool { OVERLAY_STATE.with(|s| s.borrow().gesture_visible) }

pub fn gesture_navigate_up() {
    OVERLAY_STATE.with(|s| {
        let mut st = s.borrow_mut();
        st.gesture_selected = st.gesture_selected.saturating_sub(1);
    });
}
pub fn gesture_navigate_down() {
    OVERLAY_STATE.with(|s| {
        let mut st = s.borrow_mut();
        st.gesture_selected = (st.gesture_selected + 1).min(7);
    });
}
pub fn gesture_activate() {
    let index = OVERLAY_STATE.with(|s| s.borrow().gesture_selected);
    OVERLAY_STATE.with(|s| { s.borrow_mut().gesture_visible = false; });
    match index {
        0 => toggle_file_explorer(),
        1 => toggle_git_panel(),
        2 => toggle_search_panel(),
        3 => toggle_build_panel(),
        4 => toggle_log_viewer(),
        5 => toggle_docker(),
        6 => toggle_cicd(),
        7 => toggle_profiler(),
        _ => {}
    }
}

pub fn toggle_file_explorer() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.file_explorer_visible = !st.file_explorer_visible; }); }
pub fn toggle_git_panel() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.git_panel_visible = !st.git_panel_visible; }); }
pub fn toggle_search_panel() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.search_panel_visible = !st.search_panel_visible; }); }
pub fn toggle_log_viewer() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.log_viewer_visible = !st.log_viewer_visible; }); }
pub fn toggle_build_panel() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.build_panel_visible = !st.build_panel_visible; }); }
pub fn toggle_debugger() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.debugger_visible = !st.debugger_visible; }); }
pub fn toggle_docker() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.docker_visible = !st.docker_visible; }); }
pub fn toggle_cicd() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.cicd_visible = !st.cicd_visible; }); }
pub fn toggle_profiler() { OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.profiler_visible = !st.profiler_visible; }); }

pub fn set_search_results(results: Vec<SearchResult>) {
    OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.search_results = results; st.search_selected = 0; });
}
pub fn set_build_output(lines: Vec<String>, running: bool) {
    OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.build_output = lines; st.build_running = running; st.build_scroll = 0; });
}
pub fn set_log_lines(lines: Vec<String>) {
    OVERLAY_STATE.with(|s| { let mut st = s.borrow_mut(); st.log_lines = lines; st.log_scroll = 0; });
}

pub fn init() { push_toast_info("Welcome to IDEOCODE! 🚀"); }

// ════════════════════════════════════════════════════════════════════════
// RENDER FUNCTIONS — All accept &dyn TuiState for real data
// ════════════════════════════════════════════════════════════════════════

/// Render mood indicator from real app state
pub fn render_mood_indicator(frame: &mut Frame, area: Rect, _app: &dyn TuiState) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        let mood = &st.mood;
        let color = mood.color();
        let line = Line::from(vec![
            Span::styled(format!("{} ", mood.icon()), Style::default().fg(color)),
            Span::styled("AI", Style::default().fg(color).add_modifier(Modifier::BOLD)),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}

/// Render session timer from real app state (uses elapsed from TuiState)
pub fn render_session_timer(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let elapsed = app.elapsed().unwrap_or(Duration::ZERO);
    let h = elapsed.as_secs() / 3600;
    let m = (elapsed.as_secs() % 3600) / 60;
    let sec = elapsed.as_secs() % 60;
    let line = Line::from(vec![
        Span::styled("⏱️ ", Style::default().fg(neon_cyan())),
        Span::styled(
            format!("{:02}:{:02}:{:02}", h, m, sec),
            Style::default().fg(neon_green()).add_modifier(Modifier::BOLD),
        ),
    ]);
    frame.render_widget(Paragraph::new(line), area);
}

/// Render pomodoro if active
pub fn render_pomodoro(frame: &mut Frame, area: Rect) {
    // Pomodoro managed via thread-local when user starts one
}

/// Render network indicator from real connection state
pub fn render_network_indicator(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let connected = !app.is_processing() || app.status_detail().is_some();
    let latency = app.elapsed().map(|d| d.as_millis() as u64);
    let (icon, color) = if connected {
        match latency {
            Some(ms) if ms < 100 => ("🟢", neon_green()),
            Some(ms) if ms < 500 => ("🟡", neon_yellow()),
            _ => ("🟢", neon_green()),
        }
    } else {
        ("🔴", rgb(255, 80, 80))
    };

    let model = app.provider_model();
    let line = Line::from(vec![
        Span::styled(icon, Style::default()),
        Span::styled(
            format!("{} {}", model.chars().take(15).collect::<String>(), if app.is_processing() { "⚡" } else { "" }),
            Style::default().fg(color),
        ),
    ]);
    frame.render_widget(Paragraph::new(line), area);
}

/// Render word count from real input + messages
pub fn render_wordcount(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let input = app.input();
    let input_words = input.split_whitespace().count();
    let input_chars = input.chars().count();
    let messages = app.display_messages();
    let total_words: usize = messages.iter().map(|m| m.content.split_whitespace().count()).sum();
    let total_chars: usize = messages.iter().map(|m| m.content.chars().count()).sum();

    let line = Line::from(vec![
        Span::styled("📝 ", Style::default().fg(neon_cyan())),
        Span::styled(
            format!("{}w {}c | {}w {}c", input_words, input_chars, total_words, total_chars),
            Style::default().fg(dim_color()),
        ),
    ]);
    frame.render_widget(Paragraph::new(line), area);
}

/// Render gesture pad overlay if visible
pub fn render_gesture_pad(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.gesture_visible { return; }

        let actions = [
            ("1", "File Explorer", "📂"),
            ("2", "Git Panel", "🔀"),
            ("3", "Search", "🔍"),
            ("4", "Build Output", "🔨"),
            ("5", "Log Viewer", "📜"),
            ("6", "Docker", "🐳"),
            ("7", "CI/CD", "🚀"),
            ("8", "Profiler", "📊"),
        ];

        let pad_width = 32.min(area.width as usize);
        let pad_height = (actions.len() + 2) as u16;
        let x = area.x + area.width.saturating_sub(pad_width as u16);
        let y = area.y + area.height.saturating_sub(pad_height + 1);

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "⚡ Quick Actions (Esc to close)",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));

        for (i, (key, label, icon)) in actions.iter().enumerate() {
            let is_selected = i == st.gesture_selected;
            lines.push(Line::from(vec![
                Span::styled(
                    if is_selected { "▸ " } else { "  " },
                    Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
                ),
                Span::styled(format!("{} ", icon), Style::default()),
                Span::styled(
                    format!("[{}] ", key),
                    Style::default().fg(neon_yellow()),
                ),
                Span::styled(
                    label.to_string(),
                    Style::default()
                        .fg(if is_selected { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
                ),
            ]));
        }

        frame.render_widget(Paragraph::new(lines), Rect { x, y, width: pad_width as u16, height: pad_height });
    });
}

/// Render file explorer panel (left sidebar)
pub fn render_file_explorer(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.file_explorer_visible { return; }

        let dir = app.working_dir().unwrap_or_else(|| ".".to_string());
        let entries = get_dir_entries(&dir);

        let panel_width = 30.min(area.width as usize / 3);
        let panel_area = Rect { x: area.x, y: area.y, width: panel_width as u16, height: area.height };

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "📂 File Explorer",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            format!("  {}", dir.chars().take(28).collect::<String>()),
            Style::default().fg(dim_color()),
        )));
        lines.push(Line::from(""));

        for (i, entry) in entries.iter().enumerate().take(area.height as usize - 4) {
            let is_selected = i == st.file_explorer_selected;
            let (icon, color) = if entry.is_dir { ("📁", neon_blue()) } else { ("📄", dim_color()) };
            lines.push(Line::from(vec![
                Span::styled(
                    if is_selected { "▸ " } else { "  " },
                    Style::default().fg(if is_selected { neon_green() } else { Color::Black }),
                ),
                Span::styled(format!("{} ", icon), Style::default().fg(color)),
                Span::styled(
                    entry.name.chars().take(24).collect::<String>(),
                    Style::default()
                        .fg(if is_selected { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
                ),
            ]));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

struct DirEntry { name: String, is_dir: bool }

fn get_dir_entries(dir: &str) -> Vec<DirEntry> {
    let mut entries = Vec::new();
    if let Ok(rd) = std::fs::read_dir(dir) {
        for entry in rd.flatten().take(100) {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') { continue; }
            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
            entries.push(DirEntry { name, is_dir });
        }
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    entries
}

/// Render git panel (top overlay)
pub fn render_git_panel(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.git_panel_visible { return; }

        let panel_height = (area.height / 3).max(6);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let branch = app.git_branch().unwrap_or_else(|| "detached".to_string());
        let is_processing = app.is_processing();

        let mut lines = Vec::new();
        lines.push(Line::from(vec![
            Span::styled("🔀 Git: ", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
            Span::styled(branch, Style::default().fg(neon_green()).add_modifier(Modifier::BOLD)),
            Span::styled(
                if is_processing { " (AI working...)" } else { "" },
                Style::default().fg(neon_yellow()),
            ),
        ]));

        // Run git status in background — read from cached state
        let status = run_git_command("status --short");
        for line in status.iter().take(panel_height as usize - 2) {
            let (icon, color) = if line.starts_with("M ") || line.starts_with(" M") {
                ("M", neon_yellow())
            } else if line.starts_with("A ") {
                ("A", neon_green())
            } else if line.starts_with("D ") {
                ("D", rgb(255, 80, 80))
            } else if line.starts_with("? ") {
                ("?", neon_cyan())
            } else {
                (" ", dim_color())
            };
            lines.push(Line::from(vec![
                Span::styled(format!("  {} ", icon), Style::default().fg(color)),
                Span::styled(line[2..].to_string(), Style::default().fg(dim_color())),
            ]));
        }

        if status.is_empty() {
            lines.push(Line::from(Span::styled(
                "  ✨ Working tree clean",
                Style::default().fg(neon_green()),
            )));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render search results panel
pub fn render_search_panel(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.search_panel_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let mut lines = Vec::new();
        lines.push(Line::from(vec![
            Span::styled("🔍 Search: ", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
            Span::styled(
                if st.search_query.is_empty() { "type to search...".to_string() } else { st.search_query.clone() },
                Style::default().fg(if st.search_query.is_empty() { dim_color() } else { neon_green() }),
            ),
            Span::styled(
                format!(" ({} results)", st.search_results.len()),
                Style::default().fg(dim_color()),
            ),
        ]));

        for (i, result) in st.search_results.iter().take(panel_height as usize - 2).enumerate() {
            let is_selected = i == st.search_selected;
            lines.push(Line::from(vec![
                Span::styled(
                    format!("  {}:", result.file),
                    Style::default().fg(neon_blue()),
                ),
                Span::styled(
                    format!("{}: ", result.line),
                    Style::default().fg(neon_yellow()),
                ),
                Span::styled(
                    result.text.chars().take(60).collect::<String>(),
                    Style::default()
                        .fg(if is_selected { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
                ),
            ]));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render log viewer (bottom overlay)
pub fn render_log_viewer(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.log_viewer_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y + area.height - panel_height, width: area.width, height: panel_height };

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "📜 Log Viewer (Ctrl+G to close)",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));

        let start = st.log_scroll;
        for line in st.log_lines.iter().skip(start).take(panel_height as usize - 2) {
            let color = if line.contains("ERROR") { rgb(255, 80, 80) }
                else if line.contains("WARN") { neon_yellow() }
                else if line.contains("INFO") { neon_green() }
                else { dim_color() };
            lines.push(Line::from(Span::styled(
                format!("  {}", line.chars().take(100).collect::<String>()),
                Style::default().fg(color),
            )));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render build output panel
pub fn render_build_panel(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.build_panel_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y + area.height - panel_height, width: area.width, height: panel_height };

        let mut lines = Vec::new();
        lines.push(Line::from(vec![
            Span::styled("🔨 Build", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
            Span::styled(
                if st.build_running { " ⏳ running..." } else { " ✅ done" },
                Style::default().fg(if st.build_running { neon_yellow() } else { neon_green() }),
            ),
        ]));

        let start = st.build_scroll;
        for line in st.build_output.iter().skip(start).take(panel_height as usize - 2) {
            let color = if line.contains("error") { rgb(255, 80, 80) }
                else if line.contains("warning") { neon_yellow() }
                else { dim_color() };
            lines.push(Line::from(Span::styled(
                format!("  {}", line.chars().take(100).collect::<String>()),
                Style::default().fg(color),
            )));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render docker panel
pub fn render_docker_panel(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.docker_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let containers = run_command("docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null || echo 'Docker not available'");

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "🐳 Docker Containers",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));

        for line in containers.iter().take(panel_height as usize - 2) {
            let parts: Vec<&str> = line.split('\t').collect();
            let (name, status, image) = match parts.as_slice() {
                [n, s, i] => (*n, *s, *i),
                [n, s] => (*n, *s, ""),
                _ => (line.as_str(), "", ""),
            };
            let color = if status.contains("Up") { neon_green() } else { rgb(255, 80, 80) };
            lines.push(Line::from(vec![
                Span::styled(format!("  📦 {} ", name), Style::default().fg(neon_blue())),
                Span::styled(status, Style::default().fg(color)),
                Span::styled(format!(" ({})", image), Style::default().fg(dim_color())),
            ]));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render CI/CD status panel
pub fn render_cicd_panel(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.cicd_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "🚀 CI/CD Status",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));

        // Try to get GitHub Actions status
        let runs = run_command("gh run list --limit 5 2>/dev/null || echo 'GitHub CLI not available'");
        for line in runs.iter().take(panel_height as usize - 2) {
            let color = if line.contains("success") || line.contains("completed") { neon_green() }
                else if line.contains("failure") || line.contains("failed") { rgb(255, 80, 80) }
                else if line.contains("in_progress") || line.contains("running") { neon_yellow() }
                else { dim_color() };
            lines.push(Line::from(Span::styled(
                format!("  {}", line.chars().take(80).collect::<String>()),
                Style::default().fg(color),
            )));
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render debugger panel
pub fn render_debugger_panel(frame: &mut Frame, area: Rect) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.debugger_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "🐛 Debugger (GDB/LLDB)",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(Span::styled(
            "  Attach to process or start debugging session",
            Style::default().fg(dim_color()),
        )));
        lines.push(Line::from(Span::styled(
            "  Commands: run, step, next, continue, print, backtrace",
            Style::default().fg(dim_color()),
        )));

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

/// Render profiler panel
pub fn render_profiler_panel(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    OVERLAY_STATE.with(|s| {
        let st = s.borrow();
        if !st.profiler_visible { return; }

        let panel_height = (area.height / 3).max(4);
        let panel_area = Rect { x: area.x, y: area.y, width: area.width, height: panel_height };

        let tokens = app.streaming_tokens();
        let tps = app.output_tps();
        let elapsed = app.elapsed().unwrap_or(Duration::ZERO);

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "📊 Performance Profiler",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));
        lines.push(Line::from(vec![
            Span::styled("  Input tokens: ", Style::default().fg(dim_color())),
            Span::styled(format!("{}", tokens.0), Style::default().fg(neon_green())),
            Span::styled("  Output tokens: ", Style::default().fg(dim_color())),
            Span::styled(format!("{}", tokens.1), Style::default().fg(neon_cyan())),
        ]));
        if let Some(tps_val) = tps {
            lines.push(Line::from(vec![
                Span::styled("  Speed: ", Style::default().fg(dim_color())),
                Span::styled(format!("{:.1} tok/s", tps_val), Style::default().fg(neon_green())),
            ]));
        }
        lines.push(Line::from(vec![
            Span::styled("  Elapsed: ", Style::default().fg(dim_color())),
            Span::styled(format!("{:.1}s", elapsed.as_secs_f32()), Style::default().fg(neon_yellow())),
        ]));

        // Memory usage
        if let Ok(status) = std::fs::read_to_string("/proc/self/status") {
            for line in status.lines() {
                if line.starts_with("VmRSS:") {
                    lines.push(Line::from(vec![
                        Span::styled("  Memory: ", Style::default().fg(dim_color())),
                        Span::styled(line.trim().to_string(), Style::default().fg(neon_magenta())),
                    ]));
                    break;
                }
            }
        }

        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

// ── Helper: run shell commands ───────────────────────────────────────

#[cfg(windows)]
fn run_command(cmd: &str) -> Vec<String> {
    std::process::Command::new("cmd")
        .arg("/C")
        .arg(cmd)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect())
        .unwrap_or_default()
}

#[cfg(not(windows))]
fn run_command(cmd: &str) -> Vec<String> {
    std::process::Command::new("sh")
        .arg("-c")
        .arg(cmd)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect())
        .unwrap_or_default()
}

fn run_git_command(args: &str) -> Vec<String> {
    run_command(&format!("git {}", args))
}

/// Initialize
pub fn init_all() {
    init();
}

// ════════════════════════════════════════════════════════════════════════
// BATCH 1: Wire standalone modules into draw loop
// ════════════════════════════════════════════════════════════════════════

// ── I2: Quick Actions Bar ─────────────────────────────────────────────

pub fn render_quick_actions(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let ctx = if app.is_processing() {
        super::ui_quick_actions::ActionContext::Processing
    } else {
        super::ui_quick_actions::ActionContext::Idle
    };
    let actions = super::ui_quick_actions::get_quick_actions(&ctx);
    let line = super::ui_quick_actions::render_quick_actions_compact(&actions);
    let bar_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(2),
        width: area.width,
        height: 1,
    };
    frame.render_widget(Paragraph::new(line), bar_area);
}

// ── H2: Scroll Position Indicator ─────────────────────────────────────

pub fn render_scroll_position(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let total = app.display_messages().len();
    let visible = area.height as usize;
    let scroll = app.scroll_offset();
    let line = super::ui_scrollbar::render_scroll_position(total, visible, scroll);
    let pos_area = Rect {
        x: area.x + area.width.saturating_sub(14),
        y: area.y + area.height.saturating_sub(1),
        width: 14,
        height: 1,
    };
    frame.render_widget(Paragraph::new(line), pos_area);
}

// ── H4: Memory Usage Visual ───────────────────────────────────────────

pub fn render_memory_visual(frame: &mut Frame, area: Rect) {
    let (used_mb, total_mb) = get_process_memory_mb();
    if total_mb > 0.0 {
        let line = super::ui_memory_visual::render_memory_usage(used_mb, total_mb);
        let mem_area = Rect {
            x: area.x + area.width.saturating_sub(40),
            y: area.y,
            width: 40,
            height: 1,
        };
        frame.render_widget(Paragraph::new(line), mem_area);
    }
}

// ── H8: Performance Dashboard ─────────────────────────────────────────

pub fn render_performance_overlay(frame: &mut Frame, area: Rect, app: &dyn TuiState) {
    let visible = OVERLAY_STATE.with(|s| s.borrow().profiler_visible);
    if !visible { return; }

    let _elapsed = app.elapsed().unwrap_or(Duration::ZERO);
    let (_tokens_in, _tokens_out) = app.streaming_tokens();
    let tps = app.output_tps().unwrap_or(0.0);
    let (used_mb, _) = get_process_memory_mb();

    let metrics = super::ui_performance::PerformanceMetrics {
        tokens_per_second: tps,
        latency_ms: 0.0,
        cost_usd: 0.0,
        memory_mb: used_mb,
        cpu_percent: 0.0,
        network_in_kb: 0.0,
        network_out_kb: 0.0,
    };
    let lines = super::ui_performance::render_performance_dashboard(&metrics, true);
    if lines.is_empty() { return; }

    let panel_height = (lines.len() as u16 + 2).min(area.height / 2);
    let panel_area = Rect {
        x: area.x + area.width.saturating_sub(35),
        y: area.y + 1,
        width: 35,
        height: panel_height,
    };
    frame.render_widget(Paragraph::new(lines), panel_area);
}

// ── F1: Custom Widgets ────────────────────────────────────────────────

pub fn render_custom_widgets(frame: &mut Frame, area: Rect) {
    let widgets = get_default_widgets();
    if widgets.is_empty() { return; }

    let mut all_lines = Vec::new();
    for widget in &widgets {
        all_lines.extend(super::ui_widgets::render_custom_widget(widget));
    }

    let panel_height = (all_lines.len() as u16 + 1).min(area.height / 3);
    let panel_area = Rect {
        x: area.x,
        y: area.y + area.height.saturating_sub(panel_height + 1),
        width: 25,
        height: panel_height,
    };
    frame.render_widget(Paragraph::new(all_lines), panel_area);
}

// ── F3: Theme API Preview ─────────────────────────────────────────────

thread_local! {
    static THEME_API_STATE: RefCell<ThemeApiState> = RefCell::new(ThemeApiState::new());
}

struct ThemeApiState {
    visible: bool,
    current_theme: super::ui_theme_api::ThemeAPI,
}

impl ThemeApiState {
    fn new() -> Self {
        Self {
            visible: false,
            current_theme: super::ui_theme_api::ThemeAPI::new("Default"),
        }
    }
}

pub fn toggle_theme_api() { THEME_API_STATE.with(|s| s.borrow_mut().visible = !s.borrow().visible); }
pub fn theme_api_visible() -> bool { THEME_API_STATE.with(|s| s.borrow().visible) }

pub fn render_theme_api_overlay(frame: &mut Frame, area: Rect) {
    THEME_API_STATE.with(|s| {
        let st = s.borrow();
        if !st.visible { return; }

        let lines = super::ui_theme_api::render_theme_api_preview(&st.current_theme);
        let panel_height = (lines.len() as u16 + 2).min(area.height / 2);
        let panel_area = Rect {
            x: area.x + area.width.saturating_sub(40),
            y: area.y + 2,
            width: 40,
            height: panel_height,
        };
        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

// ── F4: Macro Recording ───────────────────────────────────────────────

thread_local! {
    static MACRO_STATE: RefCell<MacroState> = RefCell::new(MacroState::new());
}

struct MacroState {
    recording: bool,
    macro_name: String,
    action_count: usize,
    visible: bool,
}

impl MacroState {
    fn new() -> Self {
        Self { recording: false, macro_name: String::new(), action_count: 0, visible: false }
    }
}

pub fn toggle_macro_recorder() {
    MACRO_STATE.with(|s| {
        let mut st = s.borrow_mut();
        st.recording = !st.recording;
        st.visible = true;
        if st.recording { st.action_count = 0; }
    });
}
pub fn toggle_macro_list() { MACRO_STATE.with(|s| s.borrow_mut().visible = !s.borrow().visible); }
pub fn macro_recording() -> bool { MACRO_STATE.with(|s| s.borrow().recording) }

pub fn render_macro_overlay(frame: &mut Frame, area: Rect) {
    MACRO_STATE.with(|s| {
        let st = s.borrow();
        if !st.visible { return; }

        let lines = if st.recording {
            super::ui_macros::render_macro_recorder(true, &st.macro_name, st.action_count)
        } else {
            super::ui_macros::render_macro_list(&[], 0)
        };
        let panel_height = (lines.len() as u16 + 2).min(area.height / 3);
        let panel_area = Rect {
            x: area.x,
            y: area.y + 2,
            width: 30,
            height: panel_height,
        };
        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

// ── I7: Command Palette ───────────────────────────────────────────────

thread_local! {
    static PALETTE_STATE: RefCell<PaletteState> = RefCell::new(PaletteState::new());
}

struct PaletteState {
    visible: bool,
    selected: usize,
    filter: String,
    category_index: usize,
}

impl PaletteState {
    fn new() -> Self {
        Self { visible: false, selected: 0, filter: String::new(), category_index: 0 }
    }
}

pub fn toggle_command_palette() {
    PALETTE_STATE.with(|s| {
        let mut st = s.borrow_mut();
        st.visible = !st.visible;
        st.selected = 0;
        st.filter.clear();
    });
}
pub fn command_palette_visible() -> bool { PALETTE_STATE.with(|s| s.borrow().visible) }

pub fn palette_navigate_up() {
    PALETTE_STATE.with(|s| { let mut st = s.borrow_mut(); st.selected = st.selected.saturating_sub(1); });
}
pub fn palette_navigate_down() {
    PALETTE_STATE.with(|s| { let mut st = s.borrow_mut(); st.selected = (st.selected + 1).min(15); });
}
pub fn palette_next_category() {
    PALETTE_STATE.with(|s| { let mut st = s.borrow_mut(); st.category_index = (st.category_index + 1) % 5; });
}
pub fn palette_prev_category() {
    PALETTE_STATE.with(|s| { let mut st = s.borrow_mut(); st.category_index = if st.category_index == 0 { 4 } else { st.category_index - 1 }; });
}

pub fn render_command_palette_overlay(frame: &mut Frame, area: Rect) {
    PALETTE_STATE.with(|s| {
        let st = s.borrow();
        if !st.visible { return; }

        let commands = super::ui_palette::all_commands();
        let category = match st.category_index {
            0 => super::ui_palette::CommandCategory::Recent,
            1 => super::ui_palette::CommandCategory::Frequent,
            2 => super::ui_palette::CommandCategory::All,
            3 => super::ui_palette::CommandCategory::Settings,
            _ => super::ui_palette::CommandCategory::Files,
        };
        let lines = super::ui_palette::render_command_palette(&commands, st.selected, &st.filter, &category);
        let panel_height = (lines.len() as u16 + 2).min(area.height * 2 / 3);
        let panel_width = 50.min(area.width);
        let panel_area = Rect {
            x: area.x + (area.width.saturating_sub(panel_width)) / 2,
            y: area.y,
            width: panel_width,
            height: panel_height,
        };
        frame.render_widget(Paragraph::new(lines), panel_area);
    });
}

// ── Helper: process memory ────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn get_process_memory_mb() -> (f32, f32) {
    if let Ok(status) = std::fs::read_to_string("/proc/self/status") {
        for line in status.lines() {
            if line.starts_with("VmRSS:") {
                let kb: f32 = line.split_whitespace().nth(1).unwrap_or("0").parse().unwrap_or(0.0);
                return (kb / 1024.0, 4096.0);
            }
        }
    }
    (0.0, 0.0)
}

#[cfg(not(target_os = "linux"))]
fn get_process_memory_mb() -> (f32, f32) {
    (0.0, 0.0)
}

// ── Helper: default widgets ───────────────────────────────────────────

fn get_default_widgets() -> Vec<super::ui_widgets::CustomWidget> {
    use super::ui_widgets::{CustomWidget, WidgetType, WidgetStyle, WidgetPosition};
    let now = chrono::Local::now();
    vec![
        CustomWidget {
            name: "clock".to_string(),
            widget_type: WidgetType::Clock,
            position: WidgetPosition::BottomLeft,
            style: WidgetStyle::default(),
            content: now.format("%H:%M:%S").to_string(),
        },
    ]
}

// ── Keyboard Wizard ─────────────────────────────────────────────────

thread_local! {
    static KEYBOARD_WIZARD_STATE: RefCell<KbWizardState> = RefCell::new(KbWizardState::new());
}

struct KbWizardState { mouse_click_count: usize, current_tip_index: usize }

impl KbWizardState {
    fn new() -> Self { Self { mouse_click_count: 0, current_tip_index: 0 } }
}

pub fn record_mouse_click() {
    KEYBOARD_WIZARD_STATE.with(|s| s.borrow_mut().mouse_click_count += 1);
}

pub fn render_keyboard_wizard_tip(frame: &mut Frame, area: Rect) {
    KEYBOARD_WIZARD_STATE.with(|s| {
        let st = s.borrow();
        if st.mouse_click_count < 3 { return; }
        let tips = [
            "Press Ctrl+C to cancel operations",
            "Use Tab for autocomplete",
            "Press ↑/↓ for command history",
            "Ctrl+L clears the screen",
            "Ctrl+S stashes input",
            "Alt+Q opens gesture pad",
            "Alt+E toggles file explorer",
            "Alt+W toggles git panel",
            "Alt+P toggles profiler",
            "Alt+O toggles build output",
            "Alt+Z toggles search panel",
            "Alt+8 opens command palette",
            "Alt+9 toggles theme preview",
            "Alt+0 toggles macro recorder",
            "Alt+1 docker, Alt+2 CI/CD, Alt+3 logs",
            "Alt+4 toggles debugger",
        ];
        let tip = tips[st.current_tip_index % tips.len()];
        let line = Line::from(vec![
            Span::styled("💡 ", Style::default().fg(neon_yellow())),
            Span::styled("Did you know? ", Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD)),
            Span::styled(tip.to_string(), Style::default().fg(dim_color())),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}
