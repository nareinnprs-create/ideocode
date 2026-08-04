// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Keyboard Wizard (I6)
//!
//! Progressive keyboard tips that appear after repeated mouse usage.
//! "Did you know? Press Ctrl+X for this shortcut"

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// A keyboard shortcut tip.
#[derive(Debug, Clone)]
pub struct KeyboardTip {
    pub trigger: String,
    pub shortcut: String,
    pub description: String,
    pub shown_count: u32,
    pub last_shown: Option<Instant>,
}

impl KeyboardTip {
    pub fn new(trigger: &str, shortcut: &str, description: &str) -> Self {
        Self {
            trigger: trigger.to_string(),
            shortcut: shortcut.to_string(),
            description: description.to_string(),
            shown_count: 0,
            last_shown: None,
        }
    }

    pub fn should_show(&self) -> bool {
        // Show after 3 uses of the trigger action
        self.shown_count >= 3 && !self.is_recently_shown()
    }

    pub fn is_recently_shown(&self) -> bool {
        self.last_shown
            .map(|t| t.elapsed() < Duration::from_secs(60))
            .unwrap_or(false)
    }

    pub fn mark_shown(&mut self) {
        self.shown_count += 1;
        self.last_shown = Some(Instant::now());
    }
}

/// Keyboard wizard that tracks usage and suggests shortcuts.
#[derive(Debug, Default)]
pub struct KeyboardWizard {
    tips: HashMap<String, KeyboardTip>,
    last_tip_time: Option<Instant>,
}

impl KeyboardWizard {
    pub fn new() -> Self {
        let mut tips = HashMap::new();

        // Common shortcuts
        tips.insert(
            "copy".to_string(),
            KeyboardTip::new("copy", "Ctrl+C", "Copy selected text"),
        );
        tips.insert(
            "paste".to_string(),
            KeyboardTip::new("paste", "Ctrl+V", "Paste text"),
        );
        tips.insert(
            "undo".to_string(),
            KeyboardTip::new("undo", "Ctrl+Z", "Undo last action"),
        );
        tips.insert(
            "redo".to_string(),
            KeyboardTip::new("redo", "Ctrl+Y", "Redo last action"),
        );
        tips.insert(
            "select_all".to_string(),
            KeyboardTip::new("select_all", "Ctrl+A", "Select all text"),
        );
        tips.insert(
            "find".to_string(),
            KeyboardTip::new("find", "Alt+Z", "Search code"),
        );
        tips.insert(
            "command_palette".to_string(),
            KeyboardTip::new("command_palette", "Alt+8", "Open command palette"),
        );
        tips.insert(
            "model_switch".to_string(),
            KeyboardTip::new("model_switch", "/model", "Switch AI model"),
        );
        tips.insert(
            "help".to_string(),
            KeyboardTip::new("help", "/help", "Show help"),
        );
        tips.insert(
            "clear".to_string(),
            KeyboardTip::new("clear", "/clear", "Clear conversation"),
        );

        Self {
            tips,
            last_tip_time: None,
        }
    }

    /// Record that the user performed a mouse action for a given trigger.
    pub fn record_mouse_action(&mut self, trigger: &str) {
        if let Some(tip) = self.tips.get_mut(trigger) {
            tip.shown_count += 1;
        }
    }

    /// Get the next tip to show, if any.
    pub fn next_tip(&mut self) -> Option<&str> {
        // Don't show tips too frequently
        if self
            .last_tip_time
            .map(|t| t.elapsed() < Duration::from_secs(30))
            .unwrap_or(false)
        {
            return None;
        }

        // Find a tip that should be shown
        for tip in self.tips.values_mut() {
            if tip.should_show() {
                tip.mark_shown();
                self.last_tip_time = Some(Instant::now());
                return Some(&tip.description);
            }
        }

        None
    }

    /// Render a keyboard tip as a styled line.
    pub fn render_tip(tip: &str) -> Line<'static> {
        let cyan = neon_cyan();
        let dim = dim_color();
        let tip_owned = tip.to_string();

        Line::from(vec![
            Span::styled(
                format!("{} ", emoji::LIGHTNING),
                Style::default().fg(neon_yellow()),
            ),
            Span::styled(
                "Did you know? ",
                Style::default().fg(cyan).add_modifier(Modifier::BOLD),
            ),
            Span::styled(tip_owned, Style::default().fg(dim)),
        ])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyboard_tip_creation() {
        let tip = KeyboardTip::new("copy", "Ctrl+C", "Copy text");
        assert_eq!(tip.trigger, "copy");
        assert_eq!(tip.shortcut, "Ctrl+C");
        assert!(!tip.should_show());
    }

    #[test]
    fn keyboard_tip_shows_after_3_uses() {
        let mut tip = KeyboardTip::new("copy", "Ctrl+C", "Copy text");
        tip.shown_count = 3;
        assert!(tip.should_show());
    }

    #[test]
    fn keyboard_wizard_tracks_actions() {
        let mut wizard = KeyboardWizard::new();
        wizard.record_mouse_action("copy");
        wizard.record_mouse_action("copy");
        wizard.record_mouse_action("copy");
        // After 3 uses, the tip should be available
        let tip = wizard.tips.get("copy").unwrap();
        assert!(tip.should_show());
    }
}
