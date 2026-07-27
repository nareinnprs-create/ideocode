//! IDEOCODE Mascot System (P5)
//!
//! ASCII art mascot that appears in onboarding, gives tips, celebrates wins.
//! Like Clippy but cool and helpful.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum MascotMood {
    Happy,
    Thinking,
    Excited,
    Sleeping,
    Wave,
    Celebrate,
}

impl MascotMood {
    pub fn ascii_art(&self) -> &'static str {
        match self {
            MascotMood::Happy => {
                r#"
    ╭─────────╮
    │  ◕ ‿ ◕  │
    │   \_/   │
    │ ╭─────╮ │
    │ │ IDE │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
            MascotMood::Thinking => {
                r#"
    ╭─────────╮
    │  ◕ ~ ◕  │
    │   \_/   │
    │ ╭─────╮ │
    │ │ ... │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
            MascotMood::Excited => {
                r#"
    ╭─────────╮
    │  ◕ ▽ ◕  │
    │   \_/   │
    │ ╭─────╮ │
    │ │ !!! │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
            MascotMood::Sleeping => {
                r#"
    ╭─────────╮
    │  ─ ─ ─  │
    │   \_/   │
    │ ╭─────╮ │
    │ │ zzz │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
            MascotMood::Wave => {
                r#"
    ╭─────────╮
    │  ◕ ‿ ◕ ╭│
    │   \_/ ╯ │
    │ ╭─────╮ │
    │ │ Hi! │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
            MascotMood::Celebrate => {
                r#"
    ╭─────────╮
    │  ◕ ◡ ◕  │
    │  * \_/ * │
    │ ╭─────╮ │
    │ │ 🎉  │ │
    │ ╰─────╯ │
    ╰─────────╯"#
            }
        }
    }

    pub fn tips(&self) -> &[&str] {
        match self {
            MascotMood::Happy => &[
                "Press Tab for autocomplete!",
                "Use /theme to change colors!",
                "Try /mode for different personalities!",
            ],
            MascotMood::Thinking => &[
                "I'm thinking about your code...",
                "Let me analyze this...",
                "Processing your request...",
            ],
            MascotMood::Excited => &[
                "Great idea! Let's do it!",
                "This is going to be awesome!",
                "I love this approach!",
            ],
            MascotMood::Sleeping => &[
                "Zzz... I'm here when you need me...",
                "Waiting for your next command...",
                "Type something to wake me up!",
            ],
            MascotMood::Wave => &[
                "Hey there! Need help?",
                "Welcome back!",
                "What shall we build today?",
            ],
            MascotMood::Celebrate => &[
                "Congratulations! 🎉",
                "You did it! Amazing work!",
                "Another milestone reached!",
            ],
        }
    }
}

/// Render the mascot.
pub fn render_mascot(mood: & MascotMood) -> Vec<Line<'static>> {
    let art = mood.ascii_art();
    let color = match mood {
        MascotMood::Happy => neon_green(),
        MascotMood::Thinking => neon_cyan(),
        MascotMood::Excited => neon_magenta(),
        MascotMood::Sleeping => dim_color(),
        MascotMood::Wave => neon_blue(),
        MascotMood::Celebrate => neon_yellow(),
    };

    art.lines()
        .map(|line| {
            Line::from(Span::styled(
                line.to_string(),
                Style::default().fg(color),
            ))
        })
        .collect()
}

/// Render mascot with a speech bubble.
pub fn render_mascot_with_speech(mood: &MascotMood, message: &str) -> Vec<Line<'static>> {
    let mut lines = render_mascot(mood);
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        format!("  💬 {}", message),
        Style::default().fg(neon_cyan()),
    )));
    lines
}

/// Get a random tip from the mascot.
pub fn get_random_tip(mood: &MascotMood) -> &str {
    let tips = mood.tips();
    let index = (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as usize) % tips.len();
    tips[index]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mascot_moods() {
        assert!(!MascotMood::Happy.ascii_art().is_empty());
        assert!(!MascotMood::Thinking.ascii_art().is_empty());
    }

    #[test]
    fn mascot_tips() {
        let tips = MascotMood::Happy.tips();
        assert!(!tips.is_empty());
    }
}
