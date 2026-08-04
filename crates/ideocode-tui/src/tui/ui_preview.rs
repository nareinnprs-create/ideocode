// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Hover Previews (I5)
//!
//! Preview files, tools, and completions without opening them.
//! Uses popup panels for rich previews.

use crate::tui::ui_glass::glass_border_color;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Preview type for different content.
#[derive(Debug, Clone)]
pub enum PreviewType {
    File {
        path: String,
        content: String,
        language: Option<String>,
    },
    Tool {
        name: String,
        description: String,
        parameters: Vec<(String, String)>,
    },
    Command {
        name: String,
        description: String,
        examples: Vec<String>,
    },
    Commit {
        hash: String,
        message: String,
        author: String,
        date: String,
    },
}

/// Render a preview panel.
pub fn render_preview(preview: &PreviewType) -> Vec<Line<'static>> {
    match preview {
        PreviewType::File {
            path,
            content,
            language,
        } => render_file_preview(path, content, language.as_deref()),
        PreviewType::Tool {
            name,
            description,
            parameters,
        } => render_tool_preview(name, description, parameters),
        PreviewType::Command {
            name,
            description,
            examples,
        } => render_command_preview(name, description, examples),
        PreviewType::Commit {
            hash,
            message,
            author,
            date,
        } => render_commit_preview(hash, message, author, date),
    }
}

fn render_file_preview(path: &str, content: &str, language: Option<&str>) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        format!("📄 {}", path),
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));

    if let Some(lang) = language {
        lines.push(Line::from(Span::styled(
            format!("   Language: {}", lang),
            Style::default().fg(dim_color()),
        )));
    }

    // Separator
    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(glass_border_color()),
    )));

    // Content (first 20 lines)
    for (i, line) in content.lines().take(20).enumerate() {
        lines.push(Line::from(vec![
            Span::styled(format!("{:>3} ", i + 1), Style::default().fg(dim_color())),
            Span::styled(line.to_string(), Style::default().fg(neon_green())),
        ]));
    }

    if content.lines().count() > 20 {
        lines.push(Line::from(Span::styled(
            "... (preview truncated)",
            Style::default().fg(dim_color()),
        )));
    }

    lines
}

fn render_tool_preview(
    name: &str,
    description: &str,
    parameters: &[(String, String)],
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        format!("🔧 {}", name),
        Style::default()
            .fg(neon_magenta())
            .add_modifier(Modifier::BOLD),
    )));

    // Description
    lines.push(Line::from(Span::styled(
        format!("   {}", description),
        Style::default().fg(dim_color()),
    )));

    // Separator
    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(glass_border_color()),
    )));

    // Parameters
    if !parameters.is_empty() {
        lines.push(Line::from(Span::styled(
            "Parameters:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )));

        for (param, desc) in parameters {
            lines.push(Line::from(vec![
                Span::styled(format!("  {} ", param), Style::default().fg(neon_cyan())),
                Span::styled(desc.clone(), Style::default().fg(dim_color())),
            ]));
        }
    }

    lines
}

fn render_command_preview(
    name: &str,
    description: &str,
    examples: &[String],
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        format!("⚡ {}", name),
        Style::default()
            .fg(neon_green())
            .add_modifier(Modifier::BOLD),
    )));

    // Description
    lines.push(Line::from(Span::styled(
        format!("   {}", description),
        Style::default().fg(dim_color()),
    )));

    // Separator
    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(glass_border_color()),
    )));

    // Examples
    if !examples.is_empty() {
        lines.push(Line::from(Span::styled(
            "Examples:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )));

        for example in examples {
            lines.push(Line::from(Span::styled(
                format!("  > {}", example),
                Style::default().fg(neon_green()),
            )));
        }
    }

    lines
}

fn render_commit_preview(
    hash: &str,
    message: &str,
    author: &str,
    date: &str,
) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            format!("📝 Commit {}", hash),
            Style::default()
                .fg(neon_purple())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("   {}", message),
            Style::default().fg(neon_green()),
        )),
        Line::from(vec![
            Span::styled("   Author: ", Style::default().fg(dim_color())),
            Span::styled(author.to_string(), Style::default().fg(neon_cyan())),
        ]),
        Line::from(vec![
            Span::styled("   Date:   ", Style::default().fg(dim_color())),
            Span::styled(date.to_string(), Style::default().fg(neon_yellow())),
        ]),
    ]
}

/// Preview dimensions for different types.
pub fn preview_size(preview: &PreviewType) -> (u16, u16) {
    match preview {
        PreviewType::File { content, .. } => {
            let lines = content.lines().count().min(20) as u16;
            (60, lines + 5)
        }
        PreviewType::Tool { parameters, .. } => {
            let params = parameters.len() as u16;
            (50, params + 5)
        }
        PreviewType::Command { examples, .. } => {
            let examples = examples.len() as u16;
            (50, examples + 5)
        }
        PreviewType::Commit { .. } => (50, 6),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preview_size_calculation() {
        let preview = PreviewType::Commit {
            hash: "abc123".to_string(),
            message: "Test commit".to_string(),
            author: "Test".to_string(),
            date: "2024-01-01".to_string(),
        };
        assert_eq!(preview_size(&preview), (50, 6));
    }
}
