//! IDEOCODE Shareable Configs (S1)
//!
//! Export/import theme and personality configs as JSON.
//! Share configs with the community.

use crate::tui::ui_glass::glass_border_color;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct SharedConfig {
    pub name: String,
    pub author: String,
    pub description: String,
    pub theme: Option<String>,
    pub personality: Option<String>,
    pub version: String,
}

impl SharedConfig {
    pub fn new(name: &str, author: &str) -> Self {
        Self {
            name: name.to_string(),
            author: author.to_string(),
            description: String::new(),
            theme: None,
            personality: None,
            version: "1.0.0".to_string(),
        }
    }

    pub fn to_json(&self) -> String {
        format!(
            r#"{{
  "name": "{}",
  "author": "{}",
  "description": "{}",
  "theme": {},
  "personality": {},
  "version": "{}"
}}"#,
            self.name,
            self.author,
            self.description,
            self.theme
                .as_ref()
                .map(|t| format!("\"{}\"", t))
                .unwrap_or_else(|| "null".to_string()),
            self.personality
                .as_ref()
                .map(|p| format!("\"{}\"", p))
                .unwrap_or_else(|| "null".to_string()),
            self.version,
        )
    }

    pub fn from_json(json: &str) -> Option<Self> {
        // Simple JSON parsing (in production, use serde)
        let name = extract_json_string(json, "name")?;
        let author = extract_json_string(json, "author")?;
        let description = extract_json_string(json, "description").unwrap_or_default();
        let theme = extract_json_string(json, "theme");
        let personality = extract_json_string(json, "personality");
        let version = extract_json_string(json, "version").unwrap_or_else(|| "1.0.0".to_string());

        Some(Self {
            name,
            author,
            description,
            theme,
            personality,
            version,
        })
    }
}

fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\":", key);
    let start = json.find(&pattern)? + pattern.len();
    let rest = &json[start..].trim_start();

    if rest.starts_with("null") {
        return None;
    }

    if rest.starts_with('"') {
        let end = rest[1..].find('"')?;
        Some(rest[1..end + 1].to_string())
    } else {
        None
    }
}

/// Render config preview.
pub fn render_config_preview(config: &SharedConfig) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        format!("📦 {}", config.name),
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));

    lines.push(Line::from(Span::styled(
        format!("   by {}", config.author),
        Style::default().fg(dim_color()),
    )));

    if !config.description.is_empty() {
        lines.push(Line::from(Span::styled(
            format!("   {}", config.description),
            Style::default().fg(dim_color()),
        )));
    }

    lines.push(Line::from(Span::styled(
        "─".repeat(40),
        Style::default().fg(glass_border_color()),
    )));

    if let Some(theme) = &config.theme {
        lines.push(Line::from(vec![
            Span::styled("   Theme: ", Style::default().fg(dim_color())),
            Span::styled(theme.clone(), Style::default().fg(neon_green())),
        ]));
    }

    if let Some(personality) = &config.personality {
        lines.push(Line::from(vec![
            Span::styled("   Personality: ", Style::default().fg(dim_color())),
            Span::styled(personality.clone(), Style::default().fg(neon_magenta())),
        ]));
    }

    lines.push(Line::from(vec![
        Span::styled("   Version: ", Style::default().fg(dim_color())),
        Span::styled(config.version.clone(), Style::default().fg(neon_yellow())),
    ]));

    lines
}

/// Render export instructions.
pub fn render_export_instructions() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "📤 Export Configuration",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("Your config has been exported to:"),
        Line::from(Span::styled(
            "  ~/.ideocode/config.json",
            Style::default().fg(neon_green()),
        )),
        Line::from(""),
        Line::from("Share it with the community!"),
    ]
}

/// Render import instructions.
pub fn render_import_instructions() -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "📥 Import Configuration",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("To import a config:"),
        Line::from(Span::styled(
            "  1. Copy the config.json file",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  2. Place in ~/.ideocode/config.json",
            Style::default().fg(dim_color()),
        )),
        Line::from(Span::styled(
            "  3. Restart IDEOCODE",
            Style::default().fg(dim_color()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_json_roundtrip() {
        let config = SharedConfig {
            name: "My Theme".to_string(),
            author: "Test".to_string(),
            description: "A test theme".to_string(),
            theme: Some("neon_city".to_string()),
            personality: Some("genz".to_string()),
            version: "1.0.0".to_string(),
        };

        let json = config.to_json();
        let parsed = SharedConfig::from_json(&json).unwrap();

        assert_eq!(parsed.name, "My Theme");
        assert_eq!(parsed.author, "Test");
        assert_eq!(parsed.theme, Some("neon_city".to_string()));
    }
}
