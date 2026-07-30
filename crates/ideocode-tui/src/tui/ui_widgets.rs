// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Custom Widgets (F1)
//!
//! User-defined widgets in status bar. Like Conky for the terminal.
//! Write in TOML format.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct CustomWidget {
    pub name: String,
    pub widget_type: WidgetType,
    pub position: WidgetPosition,
    pub style: WidgetStyle,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum WidgetType {
    Text,
    Clock,
    Battery,
    Weather,
    Music,
    SystemStats,
    Custom,
}

impl WidgetType {
    pub fn label(&self) -> &str {
        match self {
            WidgetType::Text => "Text",
            WidgetType::Clock => "Clock",
            WidgetType::Battery => "Battery",
            WidgetType::Weather => "Weather",
            WidgetType::Music => "Music",
            WidgetType::SystemStats => "System Stats",
            WidgetType::Custom => "Custom",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            WidgetType::Text => "📝",
            WidgetType::Clock => "🕐",
            WidgetType::Battery => "🔋",
            WidgetType::Weather => "🌤️",
            WidgetType::Music => "🎵",
            WidgetType::SystemStats => "📊",
            WidgetType::Custom => "⚙️",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum WidgetPosition {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Center,
}

#[derive(Debug, Clone)]
pub struct WidgetStyle {
    pub bg: Option<Color>,
    pub fg: Color,
    pub border: bool,
    pub border_color: Color,
}

impl Default for WidgetStyle {
    fn default() -> Self {
        Self {
            bg: None,
            fg: neon_cyan(),
            border: false,
            border_color: dim_color(),
        }
    }
}

/// Render a custom widget.
pub fn render_custom_widget(widget: &CustomWidget) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    let header = match widget.widget_type {
        WidgetType::Clock => "🕐 Clock",
        WidgetType::Battery => "🔋 Battery",
        WidgetType::Weather => "🌤️ Weather",
        WidgetType::Music => "🎵 Music",
        WidgetType::SystemStats => "📊 System",
        WidgetType::Text => "📝 Text",
        WidgetType::Custom => "⚙️ Custom",
    };

    lines.push(Line::from(Span::styled(
        header,
        Style::default()
            .fg(widget.style.fg)
            .add_modifier(Modifier::BOLD),
    )));

    if widget.style.border {
        lines.push(Line::from(Span::styled(
            "─".repeat(20),
            Style::default().fg(widget.style.border_color),
        )));
    }

    lines.push(Line::from(Span::styled(
        widget.content.clone(),
        Style::default().fg(widget.style.fg),
    )));

    lines
}

/// Render widget configuration.
pub fn render_widget_config(widgets: &[CustomWidget]) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "⚙️ Custom Widgets",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for widget in widgets {
        lines.push(Line::from(vec![
            Span::styled(
                format!("{} ", widget.widget_type.icon()),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled(
                widget.name.clone(),
                Style::default()
                    .fg(neon_green())
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" ({})", widget.widget_type.label()),
                Style::default().fg(dim_color()),
            ),
        ]));
    }

    lines
}

/// Parse widget from TOML config.
pub fn parse_widget_toml(toml: &str) -> Option<CustomWidget> {
    // Simple TOML parsing (in production, use toml crate)
    let name = extract_toml_value(toml, "name")?;
    let widget_type = match extract_toml_value(toml, "type")?.as_str() {
        "clock" => WidgetType::Clock,
        "battery" => WidgetType::Battery,
        "weather" => WidgetType::Weather,
        "music" => WidgetType::Music,
        "system" => WidgetType::SystemStats,
        "text" => WidgetType::Text,
        _ => WidgetType::Custom,
    };

    Some(CustomWidget {
        name,
        widget_type,
        position: WidgetPosition::BottomRight,
        style: WidgetStyle::default(),
        content: extract_toml_value(toml, "content").unwrap_or_default(),
    })
}

fn extract_toml_value(toml: &str, key: &str) -> Option<String> {
    let pattern = format!("{} = ", key);
    let start = toml.find(&pattern)? + pattern.len();
    let rest = &toml[start..].trim_start();

    if rest.starts_with('"') {
        let inner = rest.strip_prefix('"')?;
        let end = inner.find('"')?;
        Some(inner[..end].to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn widget_types() {
        assert_eq!(WidgetType::Clock.label(), "Clock");
        assert_eq!(WidgetType::Battery.icon(), "🔋");
    }

    #[test]
    fn parse_widget() {
        let toml = r#"
name = "My Clock"
type = "clock"
content = "12:00"
"#;
        let widget = parse_widget_toml(toml);
        assert!(widget.is_some());
    }
}
