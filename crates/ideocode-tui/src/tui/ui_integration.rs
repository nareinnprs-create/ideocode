//! IDEOCODE UI Integration Layer
//!
//! Bridges new UI modules with the main draw loop.
//! Uses thread-local state for toasts, achievements, mood, etc.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;
use std::cell::RefCell;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

// Thread-local state for UI integration
thread_local! {
    static TOAST_MANAGER: RefCell<ToastManagerState> = RefCell::new(ToastManagerState::new());
    static ACHIEVEMENT_STATE: RefCell<AchievementState> = RefCell::new(AchievementState::new());
    static MOOD_STATE: RefCell<MoodState> = RefCell::new(MoodState::new());
    static KEYBOARD_WIZARD_STATE: RefCell<KeyboardWizardState> = RefCell::new(KeyboardWizardState::new());
}

// ── Toast Manager State ──────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum ToastKind {
    Success,
    Info,
    Warning,
    Error,
    Achievement,
    Celebration,
}

impl ToastKind {
    fn color(&self) -> Color {
        match self {
            ToastKind::Success => neon_green(),
            ToastKind::Info => neon_cyan(),
            ToastKind::Warning => neon_yellow(),
            ToastKind::Error => rgb(255, 80, 80),
            ToastKind::Achievement => neon_purple(),
            ToastKind::Celebration => neon_magenta(),
        }
    }

    fn icon(&self) -> &str {
        match self {
            ToastKind::Success => "✅",
            ToastKind::Info => "ℹ️",
            ToastKind::Warning => "⚠️",
            ToastKind::Error => "❌",
            ToastKind::Achievement => "🏆",
            ToastKind::Celebration => "🎉",
        }
    }
}

#[derive(Debug, Clone)]
struct Toast {
    message: String,
    kind: ToastKind,
    created_at: Instant,
    duration: Duration,
}

impl Toast {
    fn is_expired(&self) -> bool {
        self.created_at.elapsed() >= self.duration
    }

    fn fade_alpha(&self) -> f32 {
        let remaining = self.duration.saturating_sub(self.created_at.elapsed());
        let secs = remaining.as_secs_f32();
        if secs < 1.0 {
            secs.clamp(0.0, 1.0)
        } else {
            1.0
        }
    }
}

#[derive(Debug, Default)]
struct ToastManagerState {
    toasts: VecDeque<Toast>,
    max_visible: usize,
}

impl ToastManagerState {
    fn new() -> Self {
        Self {
            toasts: VecDeque::new(),
            max_visible: 3,
        }
    }

    fn push(&mut self, message: &str, kind: ToastKind, duration: Duration) {
        self.toasts.push_back(Toast {
            message: message.to_string(),
            kind,
            created_at: Instant::now(),
            duration,
        });
        self.toasts.retain(|t| !t.is_expired());
    }

    fn render(&mut self, frame: &mut Frame, area: Rect) {
        self.toasts.retain(|t| !t.is_expired());

        let visible: Vec<&Toast> = self.toasts.iter().take(self.max_visible).collect();
        if visible.is_empty() {
            return;
        }

        let toast_width = 40.min(area.width as usize);
        let x = area.x + area.width.saturating_sub(toast_width as u16);
        let mut y = area.y;

        for toast in &visible {
            if y + 1 > area.y + area.height {
                break;
            }

            let alpha = toast.fade_alpha();
            let color = toast.kind.color();
            let icon = toast.kind.icon();

            let faded_color = if alpha < 1.0 {
                let (r, g, b) = color_to_floats(color);
                rgb(
                    (r * alpha) as u8,
                    (g * alpha) as u8,
                    (b * alpha) as u8,
                )
            } else {
                color
            };

            let line = Line::from(vec![
                Span::styled(
                    format!(" {} ", icon),
                    Style::default().fg(faded_color),
                ),
                Span::styled(
                    toast.message.clone(),
                    Style::default().fg(faded_color),
                ),
            ]);

            let toast_area = Rect {
                x,
                y,
                width: toast_width as u16,
                height: 1,
            };

            frame.render_widget(Paragraph::new(line), toast_area);
            y += 1;
        }
    }
}

fn color_to_floats(color: Color) -> (f32, f32, f32) {
    match color {
        Color::Rgb(r, g, b) => (r as f32, g as f32, b as f32),
        _ => (128.0, 128.0, 128.0),
    }
}

// ── Achievement State ────────────────────────────────────────────────

#[derive(Debug, Default)]
struct AchievementState {
    unlocked_count: usize,
    total_count: usize,
    last_achievement: Option<String>,
}

impl AchievementState {
    fn new() -> Self {
        Self::default()
    }
}

// ── Mood State ───────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum AIMood {
    Happy,
    Focused,
    Confused,
    Excited,
    Thinking,
    Concerned,
    Celebrating,
    Chill,
}

impl AIMood {
    pub fn icon(&self) -> &str {
        match self {
            AIMood::Happy => "😊",
            AIMood::Focused => "🎯",
            AIMood::Confused => "🤔",
            AIMood::Excited => "🎉",
            AIMood::Thinking => "💭",
            AIMood::Concerned => "😟",
            AIMood::Celebrating => "🥳",
            AIMood::Chill => "😌",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            AIMood::Happy => neon_green(),
            AIMood::Focused => neon_cyan(),
            AIMood::Confused => neon_yellow(),
            AIMood::Excited => neon_magenta(),
            AIMood::Thinking => neon_purple(),
            AIMood::Concerned => neon_orange(),
            AIMood::Celebrating => neon_pink(),
            AIMood::Chill => neon_blue(),
        }
    }
}

#[derive(Debug)]
struct MoodState {
    current_mood: AIMood,
    mood_changed_at: Instant,
}

impl MoodState {
    fn new() -> Self {
        Self {
            current_mood: AIMood::Chill,
            mood_changed_at: Instant::now(),
        }
    }
}

// ── Keyboard Wizard State ────────────────────────────────────────────

#[derive(Debug)]
struct KeyboardWizardState {
    mouse_click_count: usize,
    last_tip_shown: Option<Instant>,
    current_tip_index: usize,
}

impl KeyboardWizardState {
    fn new() -> Self {
        Self {
            mouse_click_count: 0,
            last_tip_shown: None,
            current_tip_index: 0,
        }
    }
}

// ── Public API ───────────────────────────────────────────────────────

/// Push a toast notification.
pub fn push_toast(message: &str, kind: ToastKind) {
    TOAST_MANAGER.with(|state| {
        state.borrow_mut().push(
            message,
            kind,
            Duration::from_secs(4),
        );
    });
}

/// Push a success toast.
pub fn push_toast_success(message: &str) {
    push_toast(message, ToastKind::Success);
}

/// Push an info toast.
pub fn push_toast_info(message: &str) {
    push_toast(message, ToastKind::Info);
}

/// Push a warning toast.
pub fn push_toast_warning(message: &str) {
    push_toast(message, ToastKind::Warning);
}

/// Push an error toast.
pub fn push_toast_error(message: &str) {
    push_toast(message, ToastKind::Error);
}

/// Push an achievement toast.
pub fn push_toast_achievement(message: &str) {
    push_toast(message, ToastKind::Achievement, );
}

/// Push a celebration toast.
pub fn push_toast_celebration(message: &str) {
    push_toast(message, ToastKind::Celebration);
}

/// Render all toast notifications.
pub fn render_toasts(frame: &mut Frame, area: Rect) {
    TOAST_MANAGER.with(|state| {
        state.borrow_mut().render(frame, area);
    });
}

/// Set the current AI mood.
pub fn set_mood(mood: AIMood) {
    MOOD_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.current_mood = mood;
        s.mood_changed_at = Instant::now();
    });
}

/// Get the current AI mood.
pub fn get_mood() -> AIMood {
    MOOD_STATE.with(|state| {
        state.borrow().current_mood.clone()
    })
}

/// Render mood indicator.
pub fn render_mood_indicator(frame: &mut Frame, area: Rect) {
    MOOD_STATE.with(|state| {
        let s = state.borrow();
        let mood = &s.current_mood;
        let color = mood.color();
        let line = Line::from(vec![
            Span::styled(
                format!("{} ", mood.icon()),
                Style::default().fg(color),
            ),
            Span::styled(
                "AI",
                Style::default()
                    .fg(color)
                    .add_modifier(Modifier::BOLD),
            ),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}

/// Record a mouse click for keyboard wizard.
pub fn record_mouse_click() {
    KEYBOARD_WIZARD_STATE.with(|state| {
        state.borrow_mut().mouse_click_count += 1;
    });
}

/// Get keyboard wizard tip if available.
pub fn get_keyboard_wizard_tip() -> Option<&'static str> {
    KEYBOARD_WIZARD_STATE.with(|state| {
        let s = state.borrow();
        if s.mouse_click_count >= 3 {
            let tips = [
                "Press Ctrl+C to cancel operations",
                "Use Tab for autocomplete suggestions",
                "Press ↑/↓ to navigate command history",
                "Ctrl+L clears the screen",
                "Ctrl+S stashes your current input",
            ];
            Some(tips[s.current_tip_index % tips.len()])
        } else {
            None
        }
    })
}

/// Render keyboard wizard tip.
pub fn render_keyboard_wizard_tip(frame: &mut Frame, area: Rect) {
    if let Some(tip) = get_keyboard_wizard_tip() {
        let line = Line::from(vec![
            Span::styled(
                "💡 ",
                Style::default().fg(neon_yellow()),
            ),
            Span::styled(
                "Did you know? ",
                Style::default()
                    .fg(neon_cyan())
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                tip.to_string(),
                Style::default().fg(dim_color()),
            ),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    }
}

/// Update achievement progress.
pub fn update_achievements(unlocked: usize, total: usize) {
    ACHIEVEMENT_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.unlocked_count = unlocked;
        s.total_count = total;
    });
}

/// Render achievement progress.
pub fn render_achievement_progress(frame: &mut Frame, area: Rect) {
    ACHIEVEMENT_STATE.with(|state| {
        let s = state.borrow();
        if s.total_count == 0 {
            return;
        }

        let progress = s.unlocked_count as f32 / s.total_count as f32;
        let bar_width = 15;
        let filled = (progress * bar_width as f32) as usize;
        let empty = bar_width - filled;
        let bar = "█".repeat(filled) + &"░".repeat(empty);

        let line = Line::from(vec![
            Span::styled(
                "🏆 ",
                Style::default().fg(neon_yellow()),
            ),
            Span::styled(
                bar,
                Style::default().fg(neon_cyan()),
            ),
            Span::styled(
                format!(" {}/{}", s.unlocked_count, s.total_count),
                Style::default().fg(dim_color()),
            ),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}

/// Initialize the UI integration layer.
pub fn init() {
    // Push a welcome toast on startup
    push_toast_info("Welcome to IDEOCODE! 🚀");
}

// ── Session Timer State ──────────────────────────────────────────────

thread_local! {
    static TIMER_STATE: RefCell<TimerState> = RefCell::new(TimerState::new());
    static NETWORK_STATE: RefCell<NetworkState> = RefCell::new(NetworkState::new());
    static WORDCOUNT_STATE: RefCell<WordCountState> = RefCell::new(WordCountState::new());
    static GESTURE_STATE: RefCell<GestureState> = RefCell::new(GestureState::new());
}

#[derive(Debug)]
struct TimerState {
    started_at: Instant,
    pomodoro_remaining: Option<Duration>,
    pomodoro_is_break: bool,
}

impl TimerState {
    fn new() -> Self {
        Self {
            started_at: Instant::now(),
            pomodoro_remaining: None,
            pomodoro_is_break: false,
        }
    }
}

#[derive(Debug)]
struct NetworkState {
    connected: bool,
    latency_ms: Option<u64>,
    api_calls: u64,
}

impl NetworkState {
    fn new() -> Self {
        Self {
            connected: true,
            latency_ms: None,
            api_calls: 0,
        }
    }
}

#[derive(Debug, Default)]
struct WordCountState {
    input_words: usize,
    input_chars: usize,
    session_words: usize,
    session_chars: usize,
}

impl WordCountState {
    fn new() -> Self {
        Self::default()
    }
}

#[derive(Debug)]
struct GestureState {
    visible: bool,
    selected: usize,
}

impl GestureState {
    fn new() -> Self {
        Self { visible: false, selected: 0 }
    }
}

// ── Timer API ────────────────────────────────────────────────────────

/// Render session timer in the status bar area.
pub fn render_session_timer(frame: &mut Frame, area: Rect) {
    TIMER_STATE.with(|state| {
        let s = state.borrow();
        let elapsed = s.started_at.elapsed();
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
    });
}

/// Start a pomodoro timer.
pub fn start_pomodoro(focus_secs: u64) {
    TIMER_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.pomodoro_remaining = Some(Duration::from_secs(focus_secs));
        s.pomodoro_is_break = false;
    });
}

/// Render pomodoro indicator if active.
pub fn render_pomodoro(frame: &mut Frame, area: Rect) {
    TIMER_STATE.with(|state| {
        let s = state.borrow();
        if let Some(remaining) = s.pomodoro_remaining {
            let mins = remaining.as_secs() / 60;
            let secs = remaining.as_secs() % 60;
            let (label, color) = if s.pomodoro_is_break {
                ("☕ Break", neon_blue())
            } else {
                ("🍅 Focus", rgb(255, 80, 80))
            };
            let line = Line::from(vec![
                Span::styled(format!("{} ", label), Style::default().fg(color)),
                Span::styled(
                    format!("{:02}:{:02}", mins, secs),
                    Style::default().fg(color).add_modifier(Modifier::BOLD),
                ),
            ]);
            frame.render_widget(Paragraph::new(line), area);
        }
    });
}

// ── Network API ──────────────────────────────────────────────────────

/// Update network state.
pub fn update_network(connected: bool, latency_ms: Option<u64>, api_calls: u64) {
    NETWORK_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.connected = connected;
        s.latency_ms = latency_ms;
        s.api_calls = api_calls;
    });
}

/// Render network indicator in the status bar area.
pub fn render_network_indicator(frame: &mut Frame, area: Rect) {
    NETWORK_STATE.with(|state| {
        let s = state.borrow();
        let (icon, color) = if s.connected {
            match s.latency_ms {
                Some(ms) if ms < 100 => ("🟢", neon_green()),
                Some(ms) if ms < 500 => ("🟡", neon_yellow()),
                Some(_) => ("🟠", neon_orange()),
                None => ("🟢", neon_green()),
            }
        } else {
            ("🔴", rgb(255, 80, 80))
        };

        let latency_str = match s.latency_ms {
            Some(ms) => format!(" {}ms", ms),
            None => String::new(),
        };

        let line = Line::from(vec![
            Span::styled(icon, Style::default()),
            Span::styled(
                format!("{}{}", if s.api_calls > 0 { format!("{} API ", s.api_calls) } else { String::new() }, latency_str),
                Style::default().fg(color),
            ),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}

// ── Word Count API ───────────────────────────────────────────────────

/// Update input word count.
pub fn update_input_wordcount(words: usize, chars: usize) {
    WORDCOUNT_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.input_words = words;
        s.input_chars = chars;
    });
}

/// Update session word count.
pub fn update_session_wordcount(words: usize, chars: usize) {
    WORDCOUNT_STATE.with(|state| {
        let mut s = state.borrow_mut();
        s.session_words = words;
        s.session_chars = chars;
    });
}

/// Render word count in the status bar area.
pub fn render_wordcount(frame: &mut Frame, area: Rect) {
    WORDCOUNT_STATE.with(|state| {
        let s = state.borrow();
        let line = Line::from(vec![
            Span::styled("📝 ", Style::default().fg(neon_cyan())),
            Span::styled(
                format!("{}w {}c", s.session_words, s.session_chars),
                Style::default().fg(dim_color()),
            ),
        ]);
        frame.render_widget(Paragraph::new(line), area);
    });
}

// ── Gesture Pad API ──────────────────────────────────────────────────

/// Show the gesture pad overlay.
pub fn show_gesture_pad() {
    GESTURE_STATE.with(|state| {
        state.borrow_mut().visible = true;
    });
}

/// Hide the gesture pad overlay.
pub fn hide_gesture_pad() {
    GESTURE_STATE.with(|state| {
        state.borrow_mut().visible = false;
    });
}

/// Render gesture pad overlay if visible.
pub fn render_gesture_pad(frame: &mut Frame, area: Rect) {
    GESTURE_STATE.with(|state| {
        let s = state.borrow();
        if !s.visible {
            return;
        }

        let actions = [
            ("1", "Quick Actions"),
            ("2", "Command Palette"),
            ("3", "Theme Picker"),
            ("4", "Export"),
            ("5", "Templates"),
            ("6", "Settings"),
        ];

        let pad_width = 28.min(area.width as usize);
        let pad_height = (actions.len() + 2) as u16;
        let x = area.x + area.width.saturating_sub(pad_width as u16);
        let y = area.y + area.height.saturating_sub(pad_height + 1);

        let mut lines = Vec::new();
        lines.push(Line::from(Span::styled(
            "⚡ Quick Actions",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )));

        for (i, (key, label)) in actions.iter().enumerate() {
            let is_selected = i == s.selected;
            lines.push(Line::from(vec![
                Span::styled(
                    if is_selected { "▸ " } else { "  " },
                    Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
                ),
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

        let pad_area = Rect {
            x,
            y,
            width: pad_width as u16,
            height: pad_height,
        };
        frame.render_widget(Paragraph::new(lines), pad_area);
    });
}
