// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Themes API (F3)
//!
//! Full API for custom themes: colors, fonts, borders, animations, sounds.
//! Theme = complete visual package.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ThemeAPI {
    pub name: String,
    pub colors: HashMap<String, Color>,
    pub borders: BorderStyle,
    pub animations: AnimationStyle,
    pub sounds: SoundStyle,
}

#[derive(Debug, Clone)]
pub struct BorderStyle {
    pub kind: ratatui::widgets::BorderType,
    pub color: Color,
    pub animated: bool,
}

#[derive(Debug, Clone)]
pub struct AnimationStyle {
    pub enabled: bool,
    pub speed: f32,
    pub kind: AnimationKind,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AnimationKind {
    None,
    Pulse,
    Rainbow,
    Wave,
    Breathe,
}

#[derive(Debug, Clone)]
pub struct SoundStyle {
    pub enabled: bool,
    pub volume: f32,
    pub effects: HashMap<String, String>,
}

impl ThemeAPI {
    pub fn new(name: &str) -> Self {
        let mut colors = HashMap::new();
        colors.insert("bg".to_string(), rgb(10, 10, 20));
        colors.insert("fg".to_string(), rgb(0, 255, 255));
        colors.insert("accent1".to_string(), neon_cyan());
        colors.insert("accent2".to_string(), neon_magenta());
        colors.insert("accent3".to_string(), neon_purple());

        Self {
            name: name.to_string(),
            colors,
            borders: BorderStyle {
                kind: ratatui::widgets::BorderType::Rounded,
                color: neon_cyan(),
                animated: true,
            },
            animations: AnimationStyle {
                enabled: true,
                speed: 1.0,
                kind: AnimationKind::Pulse,
            },
            sounds: SoundStyle {
                enabled: false,
                volume: 0.5,
                effects: HashMap::new(),
            },
        }
    }

    pub fn set_color(&mut self, name: &str, color: Color) {
        self.colors.insert(name.to_string(), color);
    }

    pub fn get_color(&self, name: &str) -> Color {
        self.colors.get(name).copied().unwrap_or(neon_cyan())
    }
}

/// Render theme API preview.
pub fn render_theme_api_preview(theme: &ThemeAPI) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            format!("🎨 Theme API: {}", theme.name),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Colors:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(vec![
            Span::styled("  BG: ", Style::default().fg(dim_color())),
            Span::styled("██", Style::default().fg(theme.get_color("bg"))),
            Span::styled(" FG: ", Style::default().fg(dim_color())),
            Span::styled("██", Style::default().fg(theme.get_color("fg"))),
            Span::styled(" Accent1: ", Style::default().fg(dim_color())),
            Span::styled("██", Style::default().fg(theme.get_color("accent1"))),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "Borders:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(vec![
            Span::styled("  Animated: ", Style::default().fg(dim_color())),
            Span::styled(
                if theme.borders.animated { "Yes" } else { "No" },
                Style::default().fg(if theme.borders.animated { neon_green() } else { rgb(255, 80, 80) }),
            ),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "Animations:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(vec![
            Span::styled("  Kind: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:?}", theme.animations.kind),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled(" Speed: ", Style::default().fg(dim_color())),
            Span::styled(
                format!("{:.1}x", theme.animations.speed),
                Style::default().fg(neon_green()),
            ),
        ]),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theme_api_creation() {
        let theme = ThemeAPI::new("Test Theme");
        assert_eq!(theme.name, "Test Theme");
    }

    #[test]
    fn theme_api_colors() {
        let mut theme = ThemeAPI::new("Test");
        theme.set_color("bg", rgb(255, 80, 80));
        assert_eq!(theme.get_color("bg"), rgb(255, 80, 80));
    }
}
