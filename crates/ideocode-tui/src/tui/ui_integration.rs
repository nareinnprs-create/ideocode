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
