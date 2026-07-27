//! IDEOCODE Interactive Tutorial (H9)
//!
//! Step-by-step onboarding that teaches users how to use the tool.
//! Shows keyboard shortcuts, features, and tips as they navigate.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum TutorialStep {
    Welcome,
    BasicInput,
    KeyboardShortcuts,
    Commands,
    Themes,
    Personality,
    Achievements,
    Tools,
    Completions,
    Done,
}

impl TutorialStep {
    pub fn next(&self) -> Option<Self> {
        match self {
            TutorialStep::Welcome => Some(TutorialStep::BasicInput),
            TutorialStep::BasicInput => Some(TutorialStep::KeyboardShortcuts),
            TutorialStep::KeyboardShortcuts => Some(TutorialStep::Commands),
            TutorialStep::Commands => Some(TutorialStep::Themes),
            TutorialStep::Themes => Some(TutorialStep::Personality),
            TutorialStep::Personality => Some(TutorialStep::Achievements),
            TutorialStep::Achievements => Some(TutorialStep::Tools),
            TutorialStep::Tools => Some(TutorialStep::Completions),
            TutorialStep::Completions => Some(TutorialStep::Done),
            TutorialStep::Done => None,
        }
    }

    pub fn prev(&self) -> Option<Self> {
        match self {
            TutorialStep::Welcome => None,
            TutorialStep::BasicInput => Some(TutorialStep::Welcome),
            TutorialStep::KeyboardShortcuts => Some(TutorialStep::BasicInput),
            TutorialStep::Commands => Some(TutorialStep::KeyboardShortcuts),
            TutorialStep::Themes => Some(TutorialStep::Commands),
            TutorialStep::Personality => Some(TutorialStep::Themes),
            TutorialStep::Achievements => Some(TutorialStep::Personality),
            TutorialStep::Tools => Some(TutorialStep::Achievements),
            TutorialStep::Completions => Some(TutorialStep::Tools),
            TutorialStep::Done => Some(TutorialStep::Completions),
        }
    }

    pub fn title(&self) -> &str {
        match self {
            TutorialStep::Welcome => "Welcome to IDEOCODE",
            TutorialStep::BasicInput => "Basic Input",
            TutorialStep::KeyboardShortcuts => "Keyboard Shortcuts",
            TutorialStep::Commands => "Commands",
            TutorialStep::Themes => "Themes",
            TutorialStep::Personality => "Personality Modes",
            TutorialStep::Achievements => "Achievements",
            TutorialStep::Tools => "Tools",
            TutorialStep::Completions => "Smart Completions",
            TutorialStep::Done => "Tutorial Complete",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            TutorialStep::Welcome => "🚀",
            TutorialStep::BasicInput => "⌨️",
            TutorialStep::KeyboardShortcuts => "🎯",
            TutorialStep::Commands => "⚡",
            TutorialStep::Themes => "🎨",
            TutorialStep::Personality => "🎭",
            TutorialStep::Achievements => "🏆",
            TutorialStep::Tools => "🔧",
            TutorialStep::Completions => "💡",
            TutorialStep::Done => "✅",
        }
    }

    pub fn content(&self) -> Vec<Line<'static>> {
        match self {
            TutorialStep::Welcome => vec![
                Line::from(Span::styled(
                    "Welcome to IDEOCODE!",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("Your AI-powered coding assistant with personality."),
                Line::from("This tutorial will guide you through the basics."),
                Line::from(""),
                Line::from(Span::styled(
                    "Press → or Enter to continue",
                    Style::default().fg(neon_green()),
                )),
            ],
            TutorialStep::BasicInput => vec![
                Line::from(Span::styled(
                    "Basic Input",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("Type your message and press Enter to send."),
                Line::from("Use Shift+Enter for multi-line input."),
                Line::from(""),
                Line::from(Span::styled(
                    "Pro tip: ",
                    Style::default().fg(neon_yellow()),
                )),
                Line::from("Start with / to see available commands."),
            ],
            TutorialStep::KeyboardShortcuts => vec![
                Line::from(Span::styled(
                    "Keyboard Shortcuts",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from(vec![
                    Span::styled("Ctrl+C ", Style::default().fg(neon_yellow())),
                    Span::styled("Cancel current operation", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("Ctrl+L ", Style::default().fg(neon_yellow())),
                    Span::styled("Clear screen", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("Ctrl+S ", Style::default().fg(neon_yellow())),
                    Span::styled("Save/stash input", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("↑/↓    ", Style::default().fg(neon_yellow())),
                    Span::styled("Navigate history", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("Tab    ", Style::default().fg(neon_yellow())),
                    Span::styled("Autocomplete", Style::default().fg(dim_color())),
                ]),
            ],
            TutorialStep::Commands => vec![
                Line::from(Span::styled(
                    "Commands",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from(vec![
                    Span::styled("/help   ", Style::default().fg(neon_green())),
                    Span::styled("Show help", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("/clear  ", Style::default().fg(neon_green())),
                    Span::styled("Clear history", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("/theme  ", Style::default().fg(neon_green())),
                    Span::styled("Change theme", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("/mode   ", Style::default().fg(neon_green())),
                    Span::styled("Change personality", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("/stats  ", Style::default().fg(neon_green())),
                    Span::styled("Show statistics", Style::default().fg(dim_color())),
                ]),
            ],
            TutorialStep::Themes => vec![
                Line::from(Span::styled(
                    "Themes",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("12 themes organized in 3 tiers:"),
                Line::from(""),
                Line::from(vec![
                    Span::styled("Classic ", Style::default().fg(neon_blue())),
                    Span::styled(
                        "Monokai, Dracula, Nord, Solarized, One Dark, GitHub Dark",
                        Style::default().fg(dim_color()),
                    ),
                ]),
                Line::from(vec![
                    Span::styled("Cyberpunk ", Style::default().fg(neon_magenta())),
                    Span::styled(
                        "Neon City, Synthwave, Matrix, Tron",
                        Style::default().fg(dim_color()),
                    ),
                ]),
                Line::from(vec![
                    Span::styled("Minimal ", Style::default().fg(neon_cyan())),
                    Span::styled(
                        "Glassmorphism, Retro",
                        Style::default().fg(dim_color()),
                    ),
                ]),
                Line::from(""),
                Line::from(Span::styled(
                    "Try: /theme neon_city",
                    Style::default().fg(neon_yellow()),
                )),
            ],
            TutorialStep::Personality => vec![
                Line::from(Span::styled(
                    "Personality Modes",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("6 modes that change the AI's tone:"),
                Line::from(""),
                Line::from(vec![
                    Span::styled("💼 Professional", Style::default().fg(neon_cyan())),
                    Span::styled(" - Formal and precise", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("😎 Casual", Style::default().fg(neon_green())),
                    Span::styled(" - Relaxed and friendly", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🔥 GenZ", Style::default().fg(neon_magenta())),
                    Span::styled(" - Slang and enthusiasm", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("📚 Academic", Style::default().fg(neon_purple())),
                    Span::styled(" - Scholarly approach", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("😄 Witty", Style::default().fg(neon_yellow())),
                    Span::styled(" - Puns and humor", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🧘 Zen", Style::default().fg(neon_blue())),
                    Span::styled(" - Calm and philosophical", Style::default().fg(dim_color())),
                ]),
                Line::from(""),
                Line::from(Span::styled(
                    "Try: /mode genz",
                    Style::default().fg(neon_yellow()),
                )),
            ],
            TutorialStep::Achievements => vec![
                Line::from(Span::styled(
                    "Achievements",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("Earn badges for milestones:"),
                Line::from(""),
                Line::from(vec![
                    Span::styled("🚀 First Contact", Style::default().fg(neon_green())),
                    Span::styled(" - Send first message", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("💬 Century Club", Style::default().fg(neon_cyan())),
                    Span::styled(" - Send 100 messages", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🔥 On Fire", Style::default().fg(neon_orange())),
                    Span::styled(" - 3-day streak", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🏆 Tool Master", Style::default().fg(neon_yellow())),
                    Span::styled(" - Use 10 different tools", Style::default().fg(dim_color())),
                ]),
                Line::from(""),
                Line::from(Span::styled(
                    "Check progress: /stats",
                    Style::default().fg(neon_yellow()),
                )),
            ],
            TutorialStep::Tools => vec![
                Line::from(Span::styled(
                    "Tools",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("IDEOCODE can use tools to help you:"),
                Line::from(""),
                Line::from(vec![
                    Span::styled("📄 File Operations", Style::default().fg(neon_green())),
                    Span::styled(" - Read, write, edit files", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🔍 Search", Style::default().fg(neon_cyan())),
                    Span::styled(" - Find files and content", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("💻 Terminal", Style::default().fg(neon_magenta())),
                    Span::styled(" - Run commands", Style::default().fg(dim_color())),
                ]),
                Line::from(vec![
                    Span::styled("🌐 Web", Style::default().fg(neon_blue())),
                    Span::styled(" - Fetch and search", Style::default().fg(dim_color())),
                ]),
            ],
            TutorialStep::Completions => vec![
                Line::from(Span::styled(
                    "Smart Completions",
                    Style::default()
                        .fg(neon_cyan())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("Type partial text for suggestions:"),
                Line::from(""),
                Line::from(vec![
                    Span::styled("/he", Style::default().fg(neon_green())),
                    Span::styled(" → /help", Style::default().fg(neon_cyan())),
                ]),
                Line::from(vec![
                    Span::styled("fn ", Style::default().fg(neon_green())),
                    Span::styled("→ function snippet", Style::default().fg(neon_cyan())),
                ]),
                Line::from(""),
                Line::from("Press Tab to accept suggestions."),
                Line::from("Use ↑/↓ to navigate the list."),
            ],
            TutorialStep::Done => vec![
                Line::from(Span::styled(
                    "Tutorial Complete!",
                    Style::default()
                        .fg(neon_green())
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(""),
                Line::from("You're ready to use IDEOCODE."),
                Line::from(""),
                Line::from(Span::styled(
                    "Remember:",
                    Style::default().fg(neon_yellow()),
                )),
                Line::from("• Type /help for commands"),
                Line::from("• Type /mode to change personality"),
                Line::from("• Type /theme to change appearance"),
                Line::from("• Press Tab for completions"),
                Line::from(""),
                Line::from(Span::styled(
                    "Happy coding! 🚀",
                    Style::default().fg(neon_cyan()),
                )),
            ],
        }
    }

    pub fn progress(&self) -> (usize, usize) {
        let steps = [
            TutorialStep::Welcome,
            TutorialStep::BasicInput,
            TutorialStep::KeyboardShortcuts,
            TutorialStep::Commands,
            TutorialStep::Themes,
            TutorialStep::Personality,
            TutorialStep::Achievements,
            TutorialStep::Tools,
            TutorialStep::Completions,
            TutorialStep::Done,
        ];
        let current = steps.iter().position(|s| s == self).unwrap_or(0);
        (current + 1, steps.len())
    }
}

/// Render tutorial step.
pub fn render_tutorial_step(step: &TutorialStep) -> Vec<Line<'static>> {
    let (current, total) = step.progress();
    let mut lines = Vec::new();

    // Progress bar
    let progress_width = 20;
    let filled = (current as f32 / total as f32 * progress_width as f32) as usize;
    let empty = progress_width - filled;
    let progress_bar = "█".repeat(filled) + &"░".repeat(empty);

    lines.push(Line::from(vec![
        Span::styled(
            format!("{} ", step.icon()),
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            step.title().to_string(),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        ),
    ]));
    lines.push(Line::from(Span::styled(
        progress_bar,
        Style::default().fg(neon_green()),
    )));
    lines.push(Line::from(format!("Step {}/{}", current, total)));
    lines.push(Line::from(""));

    // Content
    lines.extend(step.content());

    lines
}

/// Render tutorial navigation hints.
pub fn render_navigation_hints(step: &TutorialStep) -> Line<'static> {
    let mut hints = Vec::new();

    if step.prev().is_some() {
        hints.push(Span::styled(
            "← Back ",
            Style::default().fg(dim_color()),
        ));
    }

    hints.push(Span::styled(
        "Esc Skip ",
        Style::default().fg(neon_orange()),
    ));

    if step.next().is_some() {
        hints.push(Span::styled(
            "→ Next ",
            Style::default().fg(neon_green()),
        ));
    } else {
        hints.push(Span::styled(
            "→ Finish ",
            Style::default().fg(neon_green()),
        ));
    }

    Line::from(hints)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tutorial_progression() {
        let step = TutorialStep::Welcome;
        assert_eq!(step.next(), Some(TutorialStep::BasicInput));
        assert_eq!(TutorialStep::Done.next(), None);
    }

    #[test]
    fn tutorial_step_count() {
        let (current, total) = TutorialStep::Welcome.progress();
        assert_eq!(current, 1);
        assert_eq!(total, 10);
    }
}
