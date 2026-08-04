// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Personality System
//!
//! Adds life, humor, and delight to the terminal experience.
//! - ASCII art logo (V4)
//! - Startup sequence (D1)
//! - Easter eggs (D8)
//! - Quote of the day (D9)
//! - Typing indicator personality (I1)
//! - Error personality (I8)
//! - Progress poetry (P5)

use ratatui::prelude::*;
use ratatui::text::Line;

// ── V4: ASCII ART LOGO ──────────────────────────────────────────────

/// Cyberpunk-style ASCII art logo for IDEOCODE.
/// Renders as a gradient-styled Line.
pub fn ideocode_ascii_logo() -> Vec<Line<'static>> {
    let art = vec![
        r"  ██╗███████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗",
        r"  ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝",
        r"  ██║█████╗  ███████╗██║     ██║   ██║██║  ██║█████╗  ",
        r"  ██║██╔══╝  ╚════██║██║     ██║   ██║██║  ██║██╔══╝  ",
        r"  ██║███████╗███████║╚██████╗╚██████╔╝██████╔╝███████╗",
        r"  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
    ];

    let cyan = ideocode_tui_style::theme::neon_cyan();
    let magenta = ideocode_tui_style::theme::neon_magenta();
    let purple = ideocode_tui_style::theme::neon_purple();

    art.into_iter()
        .enumerate()
        .map(|(row, line)| {
            let color = match row % 3 {
                0 => cyan,
                1 => magenta,
                _ => purple,
            };
            Line::from(Span::styled(
                line.to_string(),
                Style::default().fg(color).add_modifier(Modifier::BOLD),
            ))
        })
        .collect()
}

/// Compact single-line logo for narrow terminals.
pub fn ideocode_compact_logo() -> Line<'static> {
    use ratatui::text::Span;
    Line::from(vec![
        Span::styled(
            "⚡ ",
            Style::default().fg(ideocode_tui_style::theme::neon_yellow()),
        ),
        Span::styled(
            "IDEOCODE",
            Style::default()
                .fg(ideocode_tui_style::theme::neon_cyan())
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

// ── D1: STARTUP SEQUENCE ────────────────────────────────────────────

/// Startup sequence messages with personality.
/// Each step simulates a system check with a fun message.
pub fn startup_sequence() -> Vec<(&'static str, &'static str)> {
    vec![
        ("⚡", "Initializing neural pathways..."),
        ("🧠", "Loading AI personality matrix..."),
        ("🎨", "Calibrating neon color spectrum..."),
        ("🔮", "Connecting to the digital ether..."),
        ("💫", "Syncing memory banks..."),
        ("🚀", "Systems online. Welcome aboard."),
    ]
}

/// Get a startup message by index (wraps around).
pub fn startup_message(index: usize) -> (&'static str, &'static str) {
    let seq = startup_sequence();
    seq[index % seq.len()]
}

// ── D8: EASTER EGGS ─────────────────────────────────────────────────

/// Check if input is an easter egg command and return the response.
pub fn check_easter_egg(input: &str) -> Option<EasterEgg> {
    let cmd = input.trim().to_lowercase();
    match cmd.as_str() {
        "/party" => Some(EasterEgg::Party),
        "/magic" => Some(EasterEgg::Magic),
        "/retro" => Some(EasterEgg::Retro),
        "/matrix" => Some(EasterEgg::Matrix),
        "/sparkle" => Some(EasterEgg::Sparkle),
        "/neon" => Some(EasterEgg::Neon),
        "/cyber" => Some(EasterEgg::Cyberpunk),
        _ => {
            // Konami code: up up down down left right left right b a
            // Simplified: just check for the sequence in recent input
            None
        }
    }
}

/// Easter egg types with visual responses.
#[derive(Debug, Clone, PartialEq)]
pub enum EasterEgg {
    Party,
    Magic,
    Retro,
    Matrix,
    Sparkle,
    Neon,
    Cyberpunk,
}

/// Render an easter egg response.
pub fn render_easter_egg(egg: &EasterEgg) -> Vec<Line<'static>> {
    match egg {
        EasterEgg::Party => {
            vec![
                Line::from("🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉"),
                Line::from(Span::styled(
                    "  🎈 PARTY MODE ACTIVATED! 🎈",
                    Style::default()
                        .fg(ideocode_tui_style::theme::neon_magenta())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from("🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉🎊🎉"),
                Line::from(""),
                Line::from("  🥳 Let's code something amazing!"),
            ]
        }
        EasterEgg::Magic => {
            vec![
                Line::from("✨🔮✨🔮✨🔮✨🔮✨🔮✨🔮✨🔮✨"),
                Line::from(Span::styled(
                    "  ✨ MAGIC MODE ENGAGED ✨",
                    Style::default()
                        .fg(ideocode_tui_style::theme::neon_purple())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from("✨🔮✨🔮✨🔮✨🔮✨🔮✨🔮✨🔮✨"),
                Line::from(""),
                Line::from("  🧙 Abracadabra... your code is now enchanted!"),
            ]
        }
        EasterEgg::Retro => {
            vec![
                Line::from("████████████████████████████████████████"),
                Line::from(Span::styled(
                    "  ▓▓▓ RETRO MODE ▓▓▓",
                    Style::default().fg(ideocode_tui_style::theme::neon_green()),
                )),
                Line::from("████████████████████████████████████████"),
                Line::from(""),
                Line::from("  📺 Like it's 1984 all over again!"),
            ]
        }
        EasterEgg::Matrix => {
            vec![
                Line::from("01001000 01100101 01101100 01101100 01101111"),
                Line::from(Span::styled(
                    "  🟢 ENTER THE MATRIX 🟢",
                    Style::default().fg(ideocode_tui_style::theme::neon_green()),
                )),
                Line::from("01001000 01100101 01101100 01101100 01101111"),
                Line::from(""),
                Line::from("  💊 Red pill or blue pill?"),
            ]
        }
        EasterEgg::Sparkle => {
            vec![
                Line::from("✨ ⭐ ✨ ⭐ ✨ ⭐ ✨ ⭐ ✨ ⭐ ✨"),
                Line::from(Span::styled(
                    "  ✨ SPARKLE ACTIVATED ✨",
                    Style::default()
                        .fg(ideocode_tui_style::theme::neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from("✨ ⭐ ✨ ⭐ ✨ ⭐ ✨ ⭐ ✨ ⭐ ✨"),
                Line::from(""),
                Line::from("  💫 You're sparkling with brilliance!"),
            ]
        }
        EasterEgg::Neon => {
            vec![
                Line::from("🔵 🟣 🔵 🟣 🔵 🟣 🔵 🟣 🔵 🟣 🔵"),
                Line::from(Span::styled(
                    "  🌃 NEON CITY ACTIVATED 🌃",
                    Style::default()
                        .fg(ideocode_tui_style::theme::neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from("🔵 🟣 🔵 🟣 🔵 🟣 🔵 🟣 🔵 🟣 🔵"),
                Line::from(""),
                Line::from("  💜 Welcome to the neon-lit future!"),
            ]
        }
        EasterEgg::Cyberpunk => {
            vec![
                Line::from("▓▒░ CYBERPUNK MODE ░▒▓"),
                Line::from(Span::styled(
                    "  🤖 CYBERPUNK ACTIVATED 🤖",
                    Style::default()
                        .fg(ideocode_tui_style::theme::neon_magenta())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from("▓▒░ CYBERPUNK MODE ░▒▓"),
                Line::from(""),
                Line::from("  🔧 Wake up, samurai... we have code to write."),
            ]
        }
    }
}

// ── D9: QUOTE OF THE DAY ───────────────────────────────────────────

/// Programming quotes for the welcome screen.
/// Each quote has text and author.
pub fn quote_of_the_day() -> (&'static str, &'static str) {
    // Use a simple hash of the day to pick a quote
    let day = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        / 86400; // days since epoch

    let quotes: Vec<(&str, &str)> = vec![
        (
            "Any sufficiently advanced technology is indistinguishable from magic.",
            "Arthur C. Clarke",
        ),
        (
            "First, solve the problem. Then, write the code.",
            "John Johnson",
        ),
        (
            "The best error message is the one that never shows up.",
            "Thomas Fuchs",
        ),
        (
            "Code is like humor. When you have to explain it, it's bad.",
            "Cory House",
        ),
        ("Fix the cause, not the symptom.", "Steve Maguire"),
        (
            "Optimism is an occupational hazard of programming: feedback is the treatment.",
            "Kent Beck",
        ),
        ("Simplicity is the soul of efficiency.", "Austin Freeman"),
        ("Talk is cheap. Show me the code.", "Linus Torvalds"),
        (
            "Programs must be written for people to read.",
            "Harold Abelson",
        ),
        (
            "The only way to learn a new programming language is by writing programs in it.",
            "Dennis Ritchie",
        ),
        ("It works on my machine.", "Every Developer Ever"),
        (
            "There are only two hard things in Computer Science: cache invalidation and naming things.",
            "Phil Karlton",
        ),
        ("Programming is thinking, not typing.", "Casey Muratori"),
        (
            "First, solve the problem. Then, write the code.",
            "John Johnson",
        ),
        ("The best code is no code at all.", "Jeff Atwood"),
        (
            "Every line of code is written without error until proven otherwise.",
            "Anonymous",
        ),
        (
            "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
            "Bill Gates",
        ),
        (
            "The most dangerous phrase in the language is 'We've always done it this way.'",
            "Grace Hopper",
        ),
        (
            "In theory, there is no difference between theory and practice. In practice, there is.",
            "Yogi Berra",
        ),
        (
            "Simplicity is prerequisite for reliability.",
            "Edsger W. Dijkstra",
        ),
    ];

    let idx = (day as usize) % quotes.len();
    quotes[idx]
}

/// Render the quote of the day as styled lines.
pub fn render_quote() -> Vec<Line<'static>> {
    let (quote, author) = quote_of_the_day();
    let cyan = ideocode_tui_style::theme::neon_cyan();
    let dim = ideocode_tui_style::theme::dim_color();

    vec![
        Line::from(""),
        Line::from(Span::styled(
            format!("💡 \"{}\"", quote),
            Style::default().fg(cyan),
        )),
        Line::from(Span::styled(
            format!("   — {}", author),
            Style::default().fg(dim),
        )),
        Line::from(""),
    ]
}

// ── I1: TYPING INDICATOR PERSONALITY ────────────────────────────────

/// Personality-rich typing indicators.
pub fn typing_indicator() -> &'static str {
    let indicators = [
        "🔮 Weaving ideas together...",
        "⚡ Lightning neurons firing...",
        "🧠 Deep in thought...",
        "✨ Crafting something brilliant...",
        "🎯 Focusing on your request...",
        "💫 Generating insights...",
        "🚀 Launching creative engines...",
        "🎨 Painting with code...",
        "🌊 Riding the data waves...",
        "🔮 Consulting the digital oracle...",
    ];

    let idx = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as usize
        % indicators.len();

    indicators[idx]
}

// ── I8: ERROR PERSONALITY ───────────────────────────────────────────

/// Personality-rich error messages.
pub fn error_personality(error: &str) -> String {
    let lower = error.to_lowercase();

    if lower.contains("network") || lower.contains("connection") {
        format!(
            "🔌 Oops! The network seems to be taking a coffee break. {}",
            error
        )
    } else if lower.contains("timeout") {
        format!("⏰ Timed out! Even AI needs a moment sometimes. {}", error)
    } else if lower.contains("auth") || lower.contains("token") {
        format!(
            "🔑 Authentication hiccup. Your keys might need a refresh. {}",
            error
        )
    } else if lower.contains("rate") || lower.contains("limit") {
        format!(
            "🚦 Whoa, slow down! The API is asking us to take a breather. {}",
            error
        )
    } else if lower.contains("file") || lower.contains("path") {
        format!("📁 File not found. Did it wander off? {}", error)
    } else if lower.contains("permission") || lower.contains("access") {
        format!(
            "🔒 Permission denied. The file says 'access forbidden'. {}",
            error
        )
    } else {
        format!(
            "😅 Something went sideways. Here's what happened: {}",
            error
        )
    }
}

// ── P5: PROGRESS POETRY ─────────────────────────────────────────────

/// Poetry for long-running operations.
pub fn progress_poetry(progress: f32) -> &'static str {
    if progress < 0.1 {
        "🌅 Just getting started..."
    } else if progress < 0.2 {
        "🌱 Seeds of creation planted..."
    } else if progress < 0.3 {
        "🌿 Growing beautifully..."
    } else if progress < 0.4 {
        "🌊 Riding the data waves..."
    } else if progress < 0.5 {
        "⚡ Halfway through the digital ether..."
    } else if progress < 0.6 {
        "🎨 Painting with algorithms..."
    } else if progress < 0.7 {
        "🚀 Gaining momentum..."
    } else if progress < 0.8 {
        "💫 Almost there, stay brilliant..."
    } else if progress < 0.9 {
        "🏁 The finish line is in sight..."
    } else {
        "🎉 Complete! You're amazing!"
    }
}

/// Render a progress bar with poetry.
pub fn render_progress_with_poetry(progress: f32, width: usize) -> Line<'static> {
    let filled = (progress * width as f32) as usize;
    let empty = width.saturating_sub(filled);

    let bar_char = "█";
    let empty_char = "░";

    let bar: String = std::iter::repeat_n(bar_char, filled)
        .chain(std::iter::repeat_n(empty_char, empty))
        .collect();

    let poetry = progress_poetry(progress);
    let cyan = ideocode_tui_style::theme::neon_cyan();
    let dim = ideocode_tui_style::theme::dim_color();

    Line::from(vec![
        Span::styled(format!("{} ", bar), Style::default().fg(cyan)),
        Span::styled(
            format!("{}%", (progress * 100.0) as u32),
            Style::default().fg(cyan).add_modifier(Modifier::BOLD),
        ),
        Span::styled(format!("  {}", poetry), Style::default().fg(dim)),
    ])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ascii_logo_has_lines() {
        let logo = ideocode_ascii_logo();
        assert!(!logo.is_empty());
    }

    #[test]
    fn compact_logo_contains_ideocode() {
        let logo = ideocode_compact_logo();
        let text: String = logo.spans.iter().map(|s| s.content.as_ref()).collect();
        assert!(text.contains("IDEOCODE"));
    }

    #[test]
    fn startup_sequence_has_steps() {
        let seq = startup_sequence();
        assert!(seq.len() >= 5);
    }

    #[test]
    fn easter_eggs_detected() {
        assert_eq!(check_easter_egg("/party"), Some(EasterEgg::Party));
        assert_eq!(check_easter_egg("/magic"), Some(EasterEgg::Magic));
        assert_eq!(check_easter_egg("/retro"), Some(EasterEgg::Retro));
        assert_eq!(check_easter_egg("/matrix"), Some(EasterEgg::Matrix));
        assert_eq!(check_easter_egg("/sparkle"), Some(EasterEgg::Sparkle));
        assert_eq!(check_easter_egg("/neon"), Some(EasterEgg::Neon));
        assert_eq!(check_easter_egg("/cyber"), Some(EasterEgg::Cyberpunk));
        assert_eq!(check_easter_egg("normal input"), None);
    }

    #[test]
    fn quote_of_the_day_returns_tuple() {
        let (quote, author) = quote_of_the_day();
        assert!(!quote.is_empty());
        assert!(!author.is_empty());
    }

    #[test]
    fn typing_indicator_returns_string() {
        let indicator = typing_indicator();
        assert!(!indicator.is_empty());
    }

    #[test]
    fn error_personality_wraps_errors() {
        let result = error_personality("network timeout");
        assert!(result.contains("🔌") || result.contains("⏰"));
    }

    #[test]
    fn progress_poetry_covers_full_range() {
        assert!(!progress_poetry(0.0).is_empty());
        assert!(!progress_poetry(0.5).is_empty());
        assert!(!progress_poetry(1.0).is_empty());
    }
}
