// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Toast Notification System (I3)
//!
//! Slide-in banners for feedback. Auto-dismiss after timeout.
//! Categories: success (green), info (cyan), warning (yellow), error (red).

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::Paragraph;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// Toast notification types.
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
            ToastKind::Success => emoji::CHECK,
            ToastKind::Info => emoji::INFO,
            ToastKind::Warning => emoji::WARNING,
            ToastKind::Error => emoji::ERROR,
            ToastKind::Achievement => emoji::TROPHY,
            ToastKind::Celebration => emoji::SPARKLE,
        }
    }
}

/// A single toast notification.
#[derive(Debug, Clone)]
pub struct Toast {
    pub message: String,
    pub kind: ToastKind,
    pub created_at: Instant,
    pub duration: Duration,
}

impl Toast {
    pub fn new(message: &str, kind: ToastKind) -> Self {
        Self {
            message: message.to_string(),
            kind,
            created_at: Instant::now(),
            duration: Duration::from_secs(4),
        }
    }

    pub fn with_duration(message: &str, kind: ToastKind, duration: Duration) -> Self {
        Self {
            message: message.to_string(),
            kind,
            created_at: Instant::now(),
            duration,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed() >= self.duration
    }

    pub fn remaining_secs(&self) -> f32 {
        self.duration
            .saturating_sub(self.created_at.elapsed())
            .as_secs_f32()
    }

    pub fn fade_alpha(&self) -> f32 {
        let remaining = self.remaining_secs();
        if remaining < 1.0 {
            remaining.clamp(0.0, 1.0)
        } else {
            1.0
        }
    }
}

/// Toast manager that holds active toasts.
#[derive(Debug, Default)]
pub struct ToastManager {
    toasts: VecDeque<Toast>,
    max_visible: usize,
}

impl ToastManager {
    pub fn new() -> Self {
        Self {
            toasts: VecDeque::new(),
            max_visible: 3,
        }
    }

    pub fn push(&mut self, toast: Toast) {
        self.toasts.push_back(toast);
        // Remove old expired toasts
        self.toasts.retain(|t| !t.is_expired());
    }

    pub fn push_success(&mut self, message: &str) {
        self.push(Toast::new(message, ToastKind::Success));
    }

    pub fn push_info(&mut self, message: &str) {
        self.push(Toast::new(message, ToastKind::Info));
    }

    pub fn push_warning(&mut self, message: &str) {
        self.push(Toast::new(message, ToastKind::Warning));
    }

    pub fn push_error(&mut self, message: &str) {
        self.push(Toast::new(message, ToastKind::Error));
    }

    pub fn push_achievement(&mut self, message: &str) {
        self.push(Toast::with_duration(
            message,
            ToastKind::Achievement,
            Duration::from_secs(6),
        ));
    }

    pub fn push_celebration(&mut self, message: &str) {
        self.push(Toast::with_duration(
            message,
            ToastKind::Celebration,
            Duration::from_secs(5),
        ));
    }

    pub fn active_toasts(&self) -> impl Iterator<Item = &Toast> {
        self.toasts.iter().filter(|t| !t.is_expired())
    }

    pub fn render_toasts(&mut self, frame: &mut Frame, area: Rect) {
        // Remove expired toasts
        self.toasts.retain(|t| !t.is_expired());

        let visible: Vec<&Toast> = self.active_toasts().take(self.max_visible).collect();
        if visible.is_empty() {
            return;
        }

        // Render toasts in the top-right corner
        let toast_width = 40.min(area.width as usize);
        let x = area.x + area.width.saturating_sub(toast_width as u16);
        for (i, toast) in visible.iter().enumerate() {
            let y = area.y + i as u16;
            if y + 1 > area.y + area.height {
                break;
            }

            let alpha = toast.fade_alpha();
            let color = toast.kind.color();
            let icon = toast.kind.icon();

            let faded_color = if alpha < 1.0 {
                match color {
                    Color::Rgb(r, g, b) => rgb(
                        ((r as f32) * alpha) as u8,
                        ((g as f32) * alpha) as u8,
                        ((b as f32) * alpha) as u8,
                    ),
                    _ => color,
                }
            } else {
                color
            };

            let line = Line::from(vec![
                Span::styled(format!(" {} ", icon), Style::default().fg(faded_color)),
                Span::styled(toast.message.clone(), Style::default().fg(faded_color)),
            ]);

            let rect = Rect::new(x, y, toast_width as u16, 1);
            frame.render_widget(Paragraph::new(line), rect);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toast_creation() {
        let toast = Toast::new("test", ToastKind::Success);
        assert_eq!(toast.message, "test");
        assert!(!toast.is_expired());
    }

    #[test]
    fn toast_expiry() {
        let toast = Toast::with_duration("test", ToastKind::Info, Duration::from_millis(10));
        std::thread::sleep(Duration::from_millis(20));
        assert!(toast.is_expired());
    }

    #[test]
    fn toast_manager_push() {
        let mut manager = ToastManager::new();
        manager.push_success("test");
        assert!(!manager.active_toasts().collect::<Vec<_>>().is_empty());
    }
}
