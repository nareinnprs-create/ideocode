// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Quick Actions Bar (I2)
//!
//! Bottom bar with context-sensitive actions.
//! Shows relevant actions based on current state.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct QuickAction {
    pub label: String,
    pub icon: String,
    pub shortcut: Option<String>,
    pub action: String,
    pub enabled: bool,
}

impl QuickAction {
    pub fn new(label: &str, icon: &str, action: &str) -> Self {
        Self {
            label: label.to_string(),
            icon: icon.to_string(),
            shortcut: None,
            action: action.to_string(),
            enabled: true,
        }
    }

    pub fn with_shortcut(mut self, shortcut: &str) -> Self {
        self.shortcut = Some(shortcut.to_string());
        self
    }
}

/// Get context-sensitive quick actions.
pub fn get_quick_actions(context: &ActionContext) -> Vec<QuickAction> {
    let mut actions = vec![
        QuickAction::new("Copy", "📋", "copy").with_shortcut("Ctrl+C"),
        QuickAction::new("Retry", "🔄", "retry").with_shortcut("Ctrl+R"),
    ];

    match context {
        ActionContext::Idle => {
            actions.push(QuickAction::new("Clear", "🗑️", "clear").with_shortcut("Ctrl+L"));
            actions.push(QuickAction::new("Help", "❓", "help").with_shortcut("/help"));
        }
        ActionContext::Processing => {
            actions.push(QuickAction::new("Cancel", "⛔", "cancel").with_shortcut("Ctrl+C"));
        }
        ActionContext::HasSelection => {
            actions.push(QuickAction::new("Edit", "📝", "edit").with_shortcut("Ctrl+E"));
            actions.push(QuickAction::new("Refactor", "🔧", "refactor"));
        }
        ActionContext::HasError => {
            actions.push(QuickAction::new("Debug", "🐛", "debug"));
            actions.push(QuickAction::new("Explain", "💡", "explain"));
        }
    }

    actions
}

#[derive(Debug, Clone, PartialEq)]
pub enum ActionContext {
    Idle,
    Processing,
    HasSelection,
    HasError,
}

/// Render the quick actions bar.
pub fn render_quick_actions_bar(actions: &[QuickAction], selected: usize) -> Line<'static> {
    let spans: Vec<Span> = actions
        .iter()
        .enumerate()
        .flat_map(|(i, action)| {
            let is_selected = i == selected;
            let color = if action.enabled { neon_cyan() } else { dim_color() };

            let mut spans = vec![
                Span::styled(
                    format!("[{}]", if is_selected { "▸" } else { " " }),
                    Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
                ),
                Span::styled(
                    format!(" {} {} ", action.icon, action.label),
                    Style::default().fg(color),
                ),
            ];

            if let Some(shortcut) = &action.shortcut {
                spans.push(Span::styled(
                    format!("{} ", shortcut),
                    Style::default().fg(dim_color()),
                ));
            }

            spans
        })
        .collect();

    Line::from(spans)
}

/// Render compact quick actions (single line).
pub fn render_quick_actions_compact(actions: &[QuickAction]) -> Line<'static> {
    let spans: Vec<Span> = actions
        .iter()
        .take(5)
        .flat_map(|action| {
            vec![
                Span::styled(
                    format!("{} ", action.icon),
                    Style::default().fg(neon_cyan()),
                ),
                Span::styled(
                    format!("{} ", action.label),
                    Style::default().fg(dim_color()),
                ),
            ]
        })
        .collect();

    Line::from(spans)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_actions_idle() {
        let actions = get_quick_actions(&ActionContext::Idle);
        assert!(actions.len() >= 4);
    }

    #[test]
    fn quick_actions_processing() {
        let actions = get_quick_actions(&ActionContext::Processing);
        assert!(actions.iter().any(|a| a.action == "cancel"));
    }
}
