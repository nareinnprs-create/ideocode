// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Theme Collection (V8)
//!
//! 12 themes organized in three tiers:
//! Tier 1: Classic (Monokai, Dracula, Nord, Solarized, One Dark, GitHub Dark)
//! Tier 2: Cyberpunk (Neon City, Synthwave, Matrix, Tron)
//! Tier 3: Minimal (Glassmorphism, Retro)

use crate::tui::color_support::rgb;
use ratatui::style::Color;

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

    pub fn icon(&self) -> &str {
        match self {
            ThemeTier::Classic => "🎨",
            ThemeTier::Cyberpunk => "🌆",
            ThemeTier::Minimal => "✨",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub tier: ThemeTier,
    pub bg: Color,
    pub fg: Color,
    pub accent1: Color,   // primary accent
    pub accent2: Color,   // secondary accent
    pub accent3: Color,   // tertiary accent
    pub success: Color,
    pub warning: Color,
    pub error: Color,
    pub dim: Color,
    pub border: Color,
    pub selection: Color,
}

impl Theme {
    pub fn all() -> Vec<Self> {
        vec![
            // Classic Tier
            Theme::monokai(),
            Theme::dracula(),
            Theme::nord(),
            Theme::solarized(),
            Theme::one_dark(),
            Theme::github_dark(),
            // Cyberpunk Tier
            Theme::neon_city(),
            Theme::synthwave(),
            Theme::matrix(),
            Theme::tron(),
            // Minimal Tier
            Theme::glassmorphism(),
            Theme::retro(),
        ]
    }

    fn monokai() -> Self {
        Self {
            id: "monokai".to_string(),
            name: "Monokai".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(39, 40, 34),
            fg: rgb(248, 248, 242),
            accent1: rgb(166, 226, 46),
            accent2: rgb(102, 217, 239),
            accent3: rgb(174, 129, 255),
            success: rgb(166, 226, 46),
            warning: rgb(255, 255, 0),
            error: rgb(249, 38, 114),
            dim: rgb(117, 113, 94),
            border: rgb(72, 72, 50),
            selection: rgb(72, 72, 72),
        }
    }

    fn dracula() -> Self {
        Self {
            id: "dracula".to_string(),
            name: "Dracula".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(40, 42, 54),
            fg: rgb(248, 248, 242),
            accent1: rgb(255, 121, 198),
            accent2: rgb(189, 147, 249),
            accent3: rgb(80, 250, 123),
            success: rgb(80, 250, 123),
            warning: rgb(255, 184, 108),
            error: rgb(255, 85, 85),
            dim: rgb(98, 114, 164),
            border: rgb(68, 71, 90),
            selection: rgb(68, 71, 90),
        }
    }

    fn nord() -> Self {
        Self {
            id: "nord".to_string(),
            name: "Nord".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(46, 52, 64),
            fg: rgb(236, 239, 244),
            accent1: rgb(136, 192, 208),
            accent2: rgb(129, 161, 193),
            accent3: rgb(180, 142, 173),
            success: rgb(163, 190, 140),
            warning: rgb(235, 203, 139),
            error: rgb(191, 97, 106),
            dim: rgb(76, 86, 106),
            border: rgb(59, 66, 82),
            selection: rgb(67, 76, 94),
        }
    }

    fn solarized() -> Self {
        Self {
            id: "solarized".to_string(),
            name: "Solarized".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(0, 43, 54),
            fg: rgb(253, 246, 227),
            accent1: rgb(38, 139, 210),
            accent2: rgb(42, 161, 152),
            accent3: rgb(133, 153, 0),
            success: rgb(38, 139, 210),
            warning: rgb(181, 137, 0),
            error: rgb(220, 50, 47),
            dim: rgb(131, 148, 150),
            border: rgb(7, 54, 66),
            selection: rgb(7, 54, 66),
        }
    }

    fn one_dark() -> Self {
        Self {
            id: "one_dark".to_string(),
            name: "One Dark".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(40, 44, 52),
            fg: rgb(171, 178, 191),
            accent1: rgb(97, 175, 239),
            accent2: rgb(198, 120, 221),
            accent3: rgb(152, 195, 121),
            success: rgb(152, 195, 121),
            warning: rgb(229, 192, 123),
            error: rgb(224, 108, 117),
            dim: rgb(92, 99, 112),
            border: rgb(57, 63, 75),
            selection: rgb(50, 55, 65),
        }
    }

    fn github_dark() -> Self {
        Self {
            id: "github_dark".to_string(),
            name: "GitHub Dark".to_string(),
            tier: ThemeTier::Classic,
            bg: rgb(13, 17, 23),
            fg: rgb(201, 209, 217),
            accent1: rgb(88, 166, 255),
            accent2: rgb(210, 153, 235),
            accent3: rgb(121, 192, 119),
            success: rgb(121, 192, 119),
            warning: rgb(210, 153, 235),
            error: rgb(248, 81, 73),
            dim: rgb(110, 118, 129),
            border: rgb(48, 54, 61),
            selection: rgb(30, 37, 44),
        }
    }

    fn neon_city() -> Self {
        Self {
            id: "neon_city".to_string(),
            name: "Neon City".to_string(),
            tier: ThemeTier::Cyberpunk,
            bg: rgb(10, 10, 20),
            fg: rgb(0, 255, 255),
            accent1: rgb(0, 255, 255),
            accent2: rgb(255, 0, 255),
            accent3: rgb(139, 92, 246),
            success: rgb(0, 255, 128),
            warning: rgb(255, 200, 0),
            error: rgb(255, 50, 50),
            dim: rgb(50, 50, 70),
            border: rgb(30, 30, 50),
            selection: rgb(20, 20, 40),
        }
    }

    fn synthwave() -> Self {
        Self {
            id: "synthwave".to_string(),
            name: "Synthwave".to_string(),
            tier: ThemeTier::Cyberpunk,
            bg: rgb(25, 10, 40),
            fg: rgb(255, 100, 150),
            accent1: rgb(255, 0, 200),
            accent2: rgb(0, 200, 255),
            accent3: rgb(255, 200, 0),
            success: rgb(0, 255, 150),
            warning: rgb(255, 200, 0),
            error: rgb(255, 50, 100),
            dim: rgb(100, 50, 120),
            border: rgb(50, 20, 80),
            selection: rgb(40, 15, 60),
        }
    }

    fn matrix() -> Self {
        Self {
            id: "matrix".to_string(),
            name: "Matrix".to_string(),
            tier: ThemeTier::Cyberpunk,
            bg: rgb(0, 10, 0),
            fg: rgb(0, 255, 0),
            accent1: rgb(0, 255, 0),
            accent2: rgb(0, 200, 0),
            accent3: rgb(0, 150, 0),
            success: rgb(0, 255, 0),
            warning: rgb(200, 255, 0),
            error: rgb(255, 0, 0),
            dim: rgb(0, 80, 0),
            border: rgb(0, 40, 0),
            selection: rgb(0, 30, 0),
        }
    }

    fn tron() -> Self {
        Self {
            id: "tron".to_string(),
            name: "Tron".to_string(),
            tier: ThemeTier::Cyberpunk,
            bg: rgb(5, 10, 15),
            fg: rgb(100, 200, 255),
            accent1: rgb(0, 200, 255),
            accent2: rgb(255, 150, 0),
            accent3: rgb(100, 200, 255),
            success: rgb(0, 255, 100),
            warning: rgb(255, 150, 0),
            error: rgb(255, 50, 50),
            dim: rgb(50, 100, 150),
            border: rgb(30, 60, 90),
            selection: rgb(20, 40, 60),
        }
    }

    fn glassmorphism() -> Self {
        Self {
            id: "glassmorphism".to_string(),
            name: "Glassmorphism".to_string(),
            tier: ThemeTier::Minimal,
            bg: rgb(15, 15, 20),
            fg: rgb(220, 220, 230),
            accent1: rgb(100, 150, 255),
            accent2: rgb(150, 100, 255),
            accent3: rgb(100, 200, 150),
            success: rgb(100, 200, 150),
            warning: rgb(255, 200, 100),
            error: rgb(255, 100, 100),
            dim: rgb(80, 80, 100),
            border: rgb(40, 40, 50),
            selection: rgb(30, 30, 40),
        }
    }

    fn retro() -> Self {
        Self {
            id: "retro".to_string(),
            name: "Retro".to_string(),
            tier: ThemeTier::Minimal,
            bg: rgb(50, 40, 30),
            fg: rgb(200, 180, 140),
            accent1: rgb(255, 150, 50),
            accent2: rgb(200, 100, 50),
            accent3: rgb(150, 100, 50),
            success: rgb(150, 200, 100),
            warning: rgb(255, 200, 50),
            error: rgb(200, 80, 80),
            dim: rgb(100, 80, 60),
            border: rgb(80, 60, 40),
            selection: rgb(70, 50, 35),
        }
    }
}

/// Parse theme name to Theme.
pub fn parse_theme(name: &str) -> Option<Theme> {
    Theme::all().into_iter().find(|t| {
        t.id == name.to_lowercase()
            || t.name.to_lowercase() == name.to_lowercase()
    })
}

/// List all themes by tier.
pub fn list_themes() -> Vec<(ThemeTier, Vec<Theme>)> {
    let themes = Theme::all();
    vec![
        (
            ThemeTier::Classic,
            themes
                .iter()
                .filter(|t| t.tier == ThemeTier::Classic)
                .cloned()
                .collect(),
        ),
        (
            ThemeTier::Cyberpunk,
            themes
                .iter()
                .filter(|t| t.tier == ThemeTier::Cyberpunk)
                .cloned()
                .collect(),
        ),
        (
            ThemeTier::Minimal,
            themes
                .iter()
                .filter(|t| t.tier == ThemeTier::Minimal)
                .cloned()
                .collect(),
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_themes_available() {
        assert_eq!(Theme::all().len(), 12);
    }

    #[test]
    fn parse_theme_works() {
        assert!(parse_theme("monokai").is_some());
        assert!(parse_theme("dracula").is_some());
        assert!(parse_theme("invalid").is_none());
    }

    #[test]
    fn theme_tiers() {
        assert_eq!(
            list_themes().len(),
            3
        );
    }
}
