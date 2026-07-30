// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Cinematic Intro (O1)
//!
//! ASCII art logo with glow, sequential reveal, typing animation.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};

/// Render the IDEOCODE ASCII logo with glow effect.
pub fn render_logo() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            r"  ██████╗ ███████╗████████╗██████╗  ██████╗  ██████╗ ██████╗ ██████╗ ███████╗",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            r"  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝",
            Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            r"  ██║  ██║█████╗     ██║   ██████╔╝██║   ██║██║     ██║   ██║██████╔╝█████╗  ",
            Style::default().fg(neon_magenta()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            r"  ██║  ██║██╔══╝     ██║   ██╔══██╗██║   ██║██║     ██║   ██║██╔══██╗██╔══╝  ",
            Style::default().fg(neon_magenta()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            r"  ██████╔╝███████╗   ██║   ██║  ██║╚██████╔╝╚██████╗╚██████╔╝██║  ██║███████╗",
            Style::default().fg(neon_green()).add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            r"  ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝",
            Style::default().fg(neon_green()).add_modifier(Modifier::BOLD),
        )),
    ]
}

/// Render logo with sequential color reveal effect.
pub fn render_logo_reveal(step: usize) -> Vec<Line<'static>> {
    let _colors = [
        neon_cyan(),
        neon_cyan(),
        neon_magenta(),
        neon_magenta(),
        neon_green(),
        neon_green(),
    ];

    let lines = render_logo();
    lines
        .into_iter()
        .enumerate()
        .map(|(i, line)| {
            if i < step {
                line
            } else {
                Line::from(Span::styled(
                    " ".repeat(80),
                    Style::default().fg(Color::Black),
                ))
            }
        })
        .collect()
}

/// Render tagline with typing effect.
pub fn render_tagline(progress: f32) -> Line<'static> {
    let tagline = "100X better than Claude Code & Codex";
    let visible_chars = (tagline.len() as f32 * progress) as usize;
    let visible = &tagline[..visible_chars.min(tagline.len())];
    let cursor = if progress < 1.0 { "▌" } else { "" };

    Line::from(vec![
        Span::styled(
            format!("  {}{}", visible, cursor),
            Style::default().fg(neon_cyan()),
        ),
    ])
}

/// Render version and build info line.
pub fn render_build_info() -> Line<'static> {
    Line::from(vec![
        Span::styled(
            "  v",
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            env!("CARGO_PKG_VERSION"),
            Style::default().fg(neon_green()),
        ),
        Span::styled(
            " • ",
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            "AI-Powered Terminal IDE",
            Style::default().fg(neon_cyan()),
        ),
    ])
}

/// Render full cinematic intro sequence.
pub fn render_intro(
    reveal_step: usize,
    tagline_progress: f32,
    show_build_info: bool,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(""));
    lines.extend(render_logo_reveal(reveal_step));
    lines.push(Line::from(""));
    lines.push(render_tagline(tagline_progress));

    if show_build_info {
        lines.push(Line::from(""));
        lines.push(render_build_info());
    }

    lines.push(Line::from(""));

    lines
}

/// Render skip hint during intro.
pub fn render_skip_hint() -> Line<'static> {
    Line::from(Span::styled(
        "  Press any key to skip...",
        Style::default()
            .fg(dim_color())
            .add_modifier(Modifier::ITALIC),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn logo_lines() {
        let lines = render_logo();
        assert_eq!(lines.len(), 6);
    }

    #[test]
    fn intro_render() {
        let lines = render_intro(6, 1.0, true);
        assert!(!lines.is_empty());
    }

    #[test]
    fn tagline_progress() {
        let line = render_tagline(0.5);
        assert!(!line.spans.is_empty());
    }
}
