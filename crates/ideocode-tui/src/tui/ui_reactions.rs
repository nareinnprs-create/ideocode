// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Message Reactions — State Management
//!
//! Manages per-message reactions with keyboard interaction.
//! Press 'r' to enter reaction mode, then l/t/i/f/e/h to toggle reactions.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use std::collections::HashMap;

/// A reaction type with emoji icon and key binding.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Reaction {
    Like,
    Thinking,
    Lightbulb,
    Fire,
    Eyes,
    Laugh,
}

impl Reaction {
    pub fn icon(&self) -> &str {
        match self {
            Reaction::Like => "👍",
            Reaction::Thinking => "🤔",
            Reaction::Lightbulb => "💡",
            Reaction::Fire => "🔥",
            Reaction::Eyes => "👀",
            Reaction::Laugh => "😅",
        }
    }

    pub fn key(&self) -> char {
        match self {
            Reaction::Like => 'l',
            Reaction::Thinking => 't',
            Reaction::Lightbulb => 'i',
            Reaction::Fire => 'f',
            Reaction::Eyes => 'e',
            Reaction::Laugh => 'h',
        }
    }

    pub fn color(&self) -> Color {
        match self {
            Reaction::Like => neon_green(),
            Reaction::Thinking => neon_yellow(),
            Reaction::Lightbulb => neon_cyan(),
            Reaction::Fire => rgb(255, 120, 0),
            Reaction::Eyes => neon_purple(),
            Reaction::Laugh => neon_magenta(),
        }
    }

    pub fn all() -> &'static [Reaction] {
        &[
            Reaction::Like,
            Reaction::Thinking,
            Reaction::Lightbulb,
            Reaction::Fire,
            Reaction::Eyes,
            Reaction::Laugh,
        ]
    }
}

/// Parse reaction from key press.
pub fn parse_reaction(key: char) -> Option<Reaction> {
    Reaction::all().iter().find(|r| r.key() == key).copied()
}

/// Reaction state manager — tracks reactions per message index.
pub struct ReactionState {
    /// Map of message_index → set of active reactions
    reactions: HashMap<usize, Vec<Reaction>>,
    /// Whether reaction mode is active (waiting for key input)
    mode_active: bool,
    /// Current message index being reacted to
    active_message: usize,
}

impl Default for ReactionState {
    fn default() -> Self {
        Self::new()
    }
}

impl ReactionState {
    pub fn new() -> Self {
        Self {
            reactions: HashMap::new(),
            mode_active: false,
            active_message: 0,
        }
    }

    /// Enter reaction mode for a specific message.
    pub fn enter_mode(&mut self, message_index: usize) {
        self.mode_active = true;
        self.active_message = message_index;
    }

    /// Exit reaction mode.
    pub fn exit_mode(&mut self) {
        self.mode_active = false;
    }

    /// Is reaction mode active?
    pub fn is_active(&self) -> bool {
        self.mode_active
    }

    /// Get the message index being reacted to.
    pub fn active_message_index(&self) -> usize {
        self.active_message
    }

    /// Toggle a reaction on the active message.
    pub fn toggle_reaction(&mut self, reaction: Reaction) {
        let reactions = self.reactions.entry(self.active_message).or_default();
        if let Some(pos) = reactions.iter().position(|r| *r == reaction) {
            reactions.remove(pos);
        } else {
            reactions.push(reaction);
        }
    }

    /// Get reactions for a message.
    pub fn get_reactions(&self, message_index: usize) -> &[Reaction] {
        self.reactions
            .get(&message_index)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }

    /// Check if a specific reaction is active on a message.
    pub fn has_reaction(&self, message_index: usize, reaction: Reaction) -> bool {
        self.reactions
            .get(&message_index)
            .map(|r| r.contains(&reaction))
            .unwrap_or(false)
    }
}

/// Render reaction picker bar (shown when reaction mode is active).
pub fn render_reaction_picker(active_message: usize) -> Line<'static> {
    let mut spans: Vec<Span> = Vec::new();
    spans.push(Span::styled(
        format!("React to msg #{} ", active_message),
        Style::default()
            .fg(dim_color())
            .add_modifier(Modifier::BOLD),
    ));

    for r in Reaction::all() {
        spans.push(Span::styled(
            format!("[{}]", r.key()),
            Style::default().fg(r.color()).add_modifier(Modifier::BOLD),
        ));
        spans.push(Span::styled(
            format!("{} ", r.icon()),
            Style::default().fg(r.color()),
        ));
    }

    spans.push(Span::styled(
        "[Esc] cancel",
        Style::default().fg(rgb(60, 60, 80)),
    ));

    Line::from(spans)
}

/// Render reactions summary for a message.
pub fn render_reactions_summary(reactions: &[Reaction]) -> Line<'static> {
    if reactions.is_empty() {
        return Line::from("");
    }

    let spans: Vec<Span> = reactions
        .iter()
        .map(|r| {
            Span::styled(
                format!(" {} ", r.icon()),
                Style::default().fg(r.color()).add_modifier(Modifier::BOLD),
            )
        })
        .collect();

    Line::from(spans)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_reaction_keys() {
        assert_eq!(parse_reaction('l'), Some(Reaction::Like));
        assert_eq!(parse_reaction('t'), Some(Reaction::Thinking));
        assert_eq!(parse_reaction('x'), None);
    }

    #[test]
    fn reaction_toggle() {
        let mut state = ReactionState::new();
        state.enter_mode(0);
        assert!(state.is_active());
        assert!(!state.has_reaction(0, Reaction::Like));

        state.toggle_reaction(Reaction::Like);
        assert!(state.has_reaction(0, Reaction::Like));

        state.toggle_reaction(Reaction::Like);
        assert!(!state.has_reaction(0, Reaction::Like));
    }
}
