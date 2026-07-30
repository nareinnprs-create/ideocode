// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Chat Transcript Search
//!
//! F3 opens search bar. Type to search within the current conversation.
//! F3 again / Enter to jump to next match. Shift+F3 for previous.
//! Esc closes search.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;

/// State for the chat transcript search.
#[derive(Debug, Clone)]
pub struct ChatSearchState {
    pub visible: bool,
    pub query: String,
    pub total_matches: usize,
    pub current_match: usize,
}

impl Default for ChatSearchState {
    fn default() -> Self {
        Self::new()
    }
}

impl ChatSearchState {
    pub fn new() -> Self {
        Self {
            visible: false,
            query: String::new(),
            total_matches: 0,
            current_match: 0,
        }
    }

    pub fn open(&mut self) {
        self.visible = true;
        self.query.clear();
        self.total_matches = 0;
        self.current_match = 0;
    }

    pub fn close(&mut self) {
        self.visible = false;
        self.query.clear();
        self.total_matches = 0;
        self.current_match = 0;
    }

    pub fn type_char(&mut self, c: char) {
        self.query.push(c);
        self.recount();
    }

    pub fn backspace(&mut self) {
        self.query.pop();
        self.recount();
    }

    pub fn next_match(&mut self) {
        if self.total_matches > 0 {
            self.current_match = (self.current_match + 1) % self.total_matches;
        }
    }

    pub fn prev_match(&mut self) {
        if self.total_matches > 0 {
            self.current_match = if self.current_match == 0 {
                self.total_matches - 1
            } else {
                self.current_match - 1
            };
        }
    }

    fn recount(&mut self) {
        // Total matches will be computed during render by scanning messages
        // For now we store the query and let the render phase update this
        self.current_match = 0;
        self.total_matches = 0;
    }
}

/// Render the search bar at the top of the chat area.
pub fn render_search_bar(state: &ChatSearchState, frame: &mut Frame, area: Rect) {
    if !state.visible || area.height == 0 {
        return;
    }

    let search_area = Rect {
        x: area.x,
        y: area.y,
        width: area.width,
        height: 1,
    };

    let match_info = if state.query.is_empty() {
        String::new()
    } else if state.total_matches == 0 {
        " (no matches)".to_string()
    } else {
        format!(" ({}/{})", state.current_match + 1, state.total_matches)
    };

    let line = Line::from(vec![
        Span::styled(
            " 🔍 ",
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            format!("{}_", state.query),
            Style::default().fg(neon_green()).add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            match_info,
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            "  [F3]next [Esc]close",
            Style::default().fg(rgb(60, 60, 80)),
        ),
    ]);

    frame.render_widget(Paragraph::new(line), search_area);
}

/// Check if a message line matches the search query and return styling.
pub fn match_style(query: &str, text: &str, is_current: bool) -> Option<Style> {
    if query.is_empty() {
        return None;
    }
    if text.to_lowercase().contains(&query.to_lowercase()) {
        if is_current {
            Some(Style::default().bg(rgb(80, 80, 0)).fg(rgb(255, 255, 100)).add_modifier(Modifier::BOLD))
        } else {
            Some(Style::default().bg(rgb(40, 40, 20)).fg(neon_yellow()))
        }
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_state_basic() {
        let mut state = ChatSearchState::new();
        assert!(!state.visible);
        state.open();
        assert!(state.visible);
        state.type_char('h');
        state.type_char('e');
        assert_eq!(state.query, "he");
        state.backspace();
        assert_eq!(state.query, "h");
        state.close();
        assert!(!state.visible);
    }

    #[test]
    fn match_style_works() {
        let style = match_style("hello", "say hello world", false);
        assert!(style.is_some());
        let no_match = match_style("xyz", "hello world", false);
        assert!(no_match.is_none());
    }
}
