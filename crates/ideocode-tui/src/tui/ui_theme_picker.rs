//! IDEOCODE Theme Picker (O3)
//!
//! Visual theme selection with live preview.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct ThemeEntry {
    pub name: &'static str,
    pub tier: ThemeTier,
    pub colors: ThemeColors,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ThemeTier {
    Classic,
    Cyberpunk,
    Minimal,
}

impl ThemeTier {
    pub fn label(&self) -> &str {
        match self {
            ThemeTier::Classic => "Classic",
            ThemeTier::Cyberpunk => "Cyberpunk",
            ThemeTier::Minimal => "Minimal",
        }
    }
}

#[derive(Debug, Clone)]
pub struct ThemeColors {
    pub primary: Color,
    pub secondary: Color,
    pub accent: Color,
    pub bg: Color,
}

impl ThemeColors {
    pub fn swatch_line(&self, name: &str) -> Line<'static> {
        Line::from(vec![
            Span::styled(
                "██ ",
                Style::default().fg(self.primary),
            ),
            Span::styled(
                "██ ",
                Style::default().fg(self.secondary),
            ),
            Span::styled(
                "██ ",
                Style::default().fg(self.accent),
            ),
            Span::styled(
                format!(" {}", name),
                Style::default().fg(self.primary),
            ),
        ])
    }
}

pub fn get_builtin_themes() -> Vec<ThemeEntry> {
    vec![
        ThemeEntry {
            name: "Neon Cyberpunk",
            tier: ThemeTier::Cyberpunk,
            colors: ThemeColors {
                primary: neon_cyan(),
                secondary: neon_magenta(),
                accent: neon_green(),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Midnight",
            tier: ThemeTier::Cyberpunk,
            colors: ThemeColors {
                primary: rgb(100, 149, 237),
                secondary: rgb(138, 43, 226),
                accent: rgb(0, 255, 127),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Monochrome",
            tier: ThemeTier::Minimal,
            colors: ThemeColors {
                primary: Color::White,
                secondary: Color::Gray,
                accent: Color::DarkGray,
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Forest",
            tier: ThemeTier::Minimal,
            colors: ThemeColors {
                primary: rgb(34, 139, 34),
                secondary: rgb(107, 142, 35),
                accent: rgb(154, 205, 50),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Sunset",
            tier: ThemeTier::Classic,
            colors: ThemeColors {
                primary: rgb(255, 165, 0),
                secondary: rgb(255, 69, 0),
                accent: rgb(255, 215, 0),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Ocean",
            tier: ThemeTier::Classic,
            colors: ThemeColors {
                primary: rgb(0, 128, 128),
                secondary: rgb(0, 191, 255),
                accent: rgb(135, 206, 235),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Lavender",
            tier: ThemeTier::Minimal,
            colors: ThemeColors {
                primary: rgb(230, 230, 250),
                secondary: rgb(186, 85, 211),
                accent: rgb(221, 160, 221),
                bg: Color::Black,
            },
        },
        ThemeEntry {
            name: "Hacker",
            tier: ThemeTier::Cyberpunk,
            colors: ThemeColors {
                primary: rgb(0, 255, 0),
                secondary: rgb(0, 200, 0),
                accent: rgb(0, 150, 0),
                bg: Color::Black,
            },
        },
    ]
}

/// Render theme picker list.
pub fn render_theme_list(
    themes: &[ThemeEntry],
    selected: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        "🎨 Theme Picker",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    let mut current_tier: Option<&ThemeTier> = None;
    for (i, theme) in themes.iter().enumerate() {
        if current_tier.as_ref() != Some(&&theme.tier) {
            lines.push(Line::from(Span::styled(
                format!("  {}:", theme.tier.label()),
                Style::default()
                    .fg(neon_yellow())
                    .add_modifier(Modifier::BOLD),
            )));
            current_tier = Some(&theme.tier);
        }

        let is_selected = i == selected;
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "    ▸ " } else { "      " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                "██ ",
                Style::default().fg(theme.colors.primary),
            ),
            Span::styled(
                "██ ",
                Style::default().fg(theme.colors.secondary),
            ),
            Span::styled(
                "██ ",
                Style::default().fg(theme.colors.accent),
            ),
            Span::styled(
                format!(" {}", theme.name),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
        ]));
    }

    lines
}

/// Render theme preview panel.
pub fn render_theme_preview(theme: &ThemeEntry) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            format!("Preview: {}", theme.name),
            Style::default()
                .fg(theme.colors.primary)
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        theme.colors.swatch_line("Primary colors"),
        Line::from(Span::styled(
            "  > User message here",
            Style::default().fg(theme.colors.secondary),
        )),
        Line::from(Span::styled(
            "  > Assistant response here",
            Style::default().fg(theme.colors.accent),
        )),
        Line::from(Span::styled(
            "  $ ideocode run --test",
            Style::default().fg(theme.colors.primary),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtin_themes_count() {
        let themes = get_builtin_themes();
        assert!(themes.len() >= 8);
    }

    #[test]
    fn theme_preview() {
        let themes = get_builtin_themes();
        let lines = render_theme_preview(&themes[0]);
        assert!(!lines.is_empty());
    }
}
