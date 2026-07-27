//! IDEOCODE Plugin System (F2)
//!
//! Community plugins: linters, formatters, deployers, themes.
//! Install with `/plugin install <name>`, list with `/plugin list`.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum PluginCategory {
    Linter,
    Formatter,
    Deployer,
    Theme,
    Tool,
}

impl PluginCategory {
    pub fn label(&self) -> &str {
        match self {
            PluginCategory::Linter => "Linter",
            PluginCategory::Formatter => "Formatter",
            PluginCategory::Deployer => "Deployer",
            PluginCategory::Theme => "Theme",
            PluginCategory::Tool => "Tool",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            PluginCategory::Linter => "🔍",
            PluginCategory::Formatter => "✨",
            PluginCategory::Deployer => "🚀",
            PluginCategory::Theme => "🎨",
            PluginCategory::Tool => "🔧",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Plugin {
    pub name: String,
    pub description: String,
    pub category: PluginCategory,
    pub version: String,
    pub author: String,
    pub installed: bool,
    pub downloads: usize,
}

/// Get available plugins.
pub fn get_available_plugins() -> Vec<Plugin> {
    vec![
        Plugin {
            name: "eslint-ideocode".to_string(),
            description: "ESLint integration with real-time lint display".to_string(),
            category: PluginCategory::Linter,
            version: "1.2.0".to_string(),
            author: "ideocode-community".to_string(),
            installed: false,
            downloads: 12400,
        },
        Plugin {
            name: "prettier-ideocode".to_string(),
            description: "Auto-format on save with Prettier".to_string(),
            category: PluginCategory::Formatter,
            version: "2.0.1".to_string(),
            author: "ideocode-community".to_string(),
            installed: false,
            downloads: 8900,
        },
        Plugin {
            name: "vercel-deploy".to_string(),
            description: "One-click deploy to Vercel".to_string(),
            category: PluginCategory::Deployer,
            version: "1.0.3".to_string(),
            author: "vercel-labs".to_string(),
            installed: false,
            downloads: 5600,
        },
        Plugin {
            name: "dracula-theme".to_string(),
            description: "Dracula color theme for IDEOCODE".to_string(),
            category: PluginCategory::Theme,
            version: "3.1.0".to_string(),
            author: "dracula".to_string(),
            installed: true,
            downloads: 23000,
        },
        Plugin {
            name: "git-auto-commit".to_string(),
            description: "Auto-commit with conventional commits".to_string(),
            category: PluginCategory::Tool,
            version: "1.1.0".to_string(),
            author: "ideocode-labs".to_string(),
            installed: false,
            downloads: 7800,
        },
        Plugin {
            name: "rust-analyzer-ideocode".to_string(),
            description: "Rust Analyzer diagnostics in the TUI".to_string(),
            category: PluginCategory::Linter,
            version: "0.9.2".to_string(),
            author: "rust-lang".to_string(),
            installed: false,
            downloads: 4200,
        },
    ]
}

/// Render plugin list selector.
pub fn render_plugin_list(
    plugins: &[Plugin],
    selected: usize,
    filter: &str,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "  Plugin System",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));

    let installed_count = plugins.iter().filter(|p| p.installed).count();
    lines.push(Line::from(Span::styled(
        format!("  {} installed, {} available", installed_count, plugins.len()),
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(""));

    let filtered: Vec<(usize, &Plugin)> = plugins
        .iter()
        .enumerate()
        .filter(|(_, p)| {
            if filter.is_empty() {
                return true;
            }
            p.name.to_lowercase().contains(&filter.to_lowercase())
                || p.description.to_lowercase().contains(&filter.to_lowercase())
        })
        .collect();

    for (display_idx, (_real_idx, plugin)) in filtered.iter().enumerate() {
        let is_selected = display_idx == selected;
        let install_badge = if plugin.installed {
            Span::styled(" [installed]", Style::default().fg(neon_green()))
        } else {
            Span::styled(
                format!(" ({} downloads)", plugin.downloads),
                Style::default().fg(dim_color()),
            )
        };

        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                format!("{} ", plugin.category.icon()),
                Style::default(),
            ),
            Span::styled(
                plugin.name.clone(),
                Style::default()
                    .fg(neon_cyan())
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
            Span::styled(
                format!(" v{}", plugin.version),
                Style::default().fg(dim_color()),
            ),
            install_badge,
        ]));

        if is_selected {
            lines.push(Line::from(vec![
                Span::styled("    ", Style::default()),
                Span::styled(
                    plugin.description.clone(),
                    Style::default().fg(neon_yellow()),
                ),
            ]));
            lines.push(Line::from(vec![
                Span::styled("    Author: ", Style::default().fg(dim_color())),
                Span::styled(
                    plugin.author.clone(),
                    Style::default().fg(neon_magenta()),
                ),
            ]));
        }
    }

    lines
}

/// Render plugin install progress.
pub fn render_plugin_install_progress(name: &str, progress: f32) -> Vec<Line<'static>> {
    let bar_width = 20;
    let filled = (progress * bar_width as f32) as usize;
    let empty = bar_width - filled;
    let bar = "█".repeat(filled) + &"░".repeat(empty);

    vec![
        Line::from(Span::styled(
            format!("  Installing {}...", name),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(bar, Style::default().fg(neon_green()))),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plugin_list() {
        let plugins = get_available_plugins();
        assert!(plugins.len() >= 5);
    }

    #[test]
    fn render_list() {
        let plugins = get_available_plugins();
        let lines = render_plugin_list(&plugins, 0, "");
        assert!(!lines.is_empty());
    }
}
