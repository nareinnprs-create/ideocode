//! IDEOCODE Command Palette Pro (I7)
//!
//! Ctrl+P style command palette with categories, fuzzy search, and preview.
//! Like VS Code's command palette but for the terminal.

use crate::tui::ui_glass::glass_border_color;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum CommandCategory {
    Recent,
    Frequent,
    All,
    Settings,
    Files,
    Tools,
}

impl CommandCategory {
    pub fn label(&self) -> &str {
        match self {
            CommandCategory::Recent => "Recent",
            CommandCategory::Frequent => "Frequent",
            CommandCategory::All => "All Commands",
            CommandCategory::Settings => "Settings",
            CommandCategory::Files => "Files",
            CommandCategory::Tools => "Tools",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            CommandCategory::Recent => "🕐",
            CommandCategory::Frequent => "⭐",
            CommandCategory::All => "📋",
            CommandCategory::Settings => "⚙️",
            CommandCategory::Files => "📄",
            CommandCategory::Tools => "🔧",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PaletteCommand {
    pub name: String,
    pub description: String,
    pub category: CommandCategory,
    pub shortcut: Option<String>,
    pub preview: Option<String>,
}

/// Get all available commands.
pub fn all_commands() -> Vec<PaletteCommand> {
    vec![
        PaletteCommand {
            name: "/help".to_string(),
            description: "Show help".to_string(),
            category: CommandCategory::All,
            shortcut: Some("?".to_string()),
            preview: Some("Show keyboard shortcuts and available commands".to_string()),
        },
        PaletteCommand {
            name: "/clear".to_string(),
            description: "Clear history".to_string(),
            category: CommandCategory::All,
            shortcut: Some("Ctrl+L".to_string()),
            preview: Some("Clear all conversation history".to_string()),
        },
        PaletteCommand {
            name: "/theme".to_string(),
            description: "Change theme".to_string(),
            category: CommandCategory::Settings,
            shortcut: None,
            preview: Some("Switch between 12 available themes".to_string()),
        },
        PaletteCommand {
            name: "/mode".to_string(),
            description: "Change personality".to_string(),
            category: CommandCategory::Settings,
            shortcut: None,
            preview: Some("Switch personality mode (Professional, Casual, GenZ, etc.)".to_string()),
        },
        PaletteCommand {
            name: "/stats".to_string(),
            description: "Show statistics".to_string(),
            category: CommandCategory::All,
            shortcut: None,
            preview: Some("View session stats, achievements, and streak".to_string()),
        },
        PaletteCommand {
            name: "/resume".to_string(),
            description: "Resume session".to_string(),
            category: CommandCategory::Recent,
            shortcut: None,
            preview: Some("Browse and resume previous sessions".to_string()),
        },
        PaletteCommand {
            name: "/login".to_string(),
            description: "Login to provider".to_string(),
            category: CommandCategory::Settings,
            shortcut: None,
            preview: Some("Authenticate with AI provider".to_string()),
        },
        PaletteCommand {
            name: "/account".to_string(),
            description: "Manage accounts".to_string(),
            category: CommandCategory::Settings,
            shortcut: None,
            preview: Some("Switch between provider accounts".to_string()),
        },
    ]
}

/// Render command palette.
pub fn render_command_palette(
    commands: &[PaletteCommand],
    selected: usize,
    filter: &str,
    category: &CommandCategory,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        "📋 Command Palette",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("Filter: {}_", filter),
        Style::default().fg(neon_green()),
    )));
    lines.push(Line::from(""));

    // Categories
    let categories = [
        CommandCategory::Recent,
        CommandCategory::Frequent,
        CommandCategory::All,
        CommandCategory::Settings,
        CommandCategory::Files,
    ];

    let cat_spans: Vec<Span> = categories
        .iter()
        .flat_map(|cat| {
            let is_active = cat == category;
            vec![
                Span::styled(
                    format!("{} ", cat.icon()),
                    Style::default().fg(if is_active { neon_cyan() } else { dim_color() }),
                ),
                Span::styled(
                    format!("{} ", cat.label()),
                    Style::default()
                        .fg(if is_active { neon_cyan() } else { dim_color() })
                        .add_modifier(if is_active { Modifier::BOLD } else { Modifier::empty() }),
                ),
            ]
        })
        .collect();
    lines.push(Line::from(cat_spans));
    lines.push(Line::from(""));

    // Commands
    for (i, cmd) in commands.iter().enumerate() {
        let is_selected = i == selected;
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                cmd.name.clone(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
            Span::styled(
                format!("  {}", cmd.description),
                Style::default().fg(dim_color()),
            ),
            Span::styled(
                cmd.shortcut
                    .as_ref()
                    .map(|s| format!("  [{}]", s))
                    .unwrap_or_default(),
                Style::default().fg(neon_yellow()),
            ),
        ]));
    }

    // Preview
    if let Some(cmd) = commands.get(selected) {
        if let Some(preview) = &cmd.preview {
            lines.push(Line::from(""));
            lines.push(Line::from(Span::styled(
                "─".repeat(40),
                Style::default().fg(glass_border_color()),
            )));
            lines.push(Line::from(Span::styled(
                preview.clone(),
                Style::default().fg(neon_green()),
            )));
        }
    }

    lines
}

/// Filter commands by search query.
pub fn filter_commands(commands: &[PaletteCommand], query: &str) -> Vec<PaletteCommand> {
    if query.is_empty() {
        return commands.to_vec();
    }

    let query_lower = query.to_lowercase();
    commands
        .iter()
        .filter(|cmd| {
            cmd.name.to_lowercase().contains(&query_lower)
                || cmd.description.to_lowercase().contains(&query_lower)
        })
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_commands_available() {
        let commands = all_commands();
        assert!(commands.len() >= 8);
    }

    #[test]
    fn filter_works() {
        let commands = all_commands();
        let filtered = filter_commands(&commands, "help");
        assert!(filtered.iter().any(|c| c.name == "/help"));
    }
}
