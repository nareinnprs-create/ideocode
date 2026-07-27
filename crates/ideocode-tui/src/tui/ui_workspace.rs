//! IDEOCODE Workspace Profiles (F5)
//!
//! Different configs per project. Auto-switch theme/personality/tools by directory.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct WorkspaceProfile {
    pub name: String,
    pub directory: String,
    pub theme: String,
    pub personality: String,
    pub tools: Vec<String>,
    pub auto_switch: bool,
}

/// Get workspace profiles.
pub fn get_workspace_profiles() -> Vec<WorkspaceProfile> {
    vec![
        WorkspaceProfile {
            name: "Frontend".to_string(),
            directory: "~/projects/frontend".to_string(),
            theme: "neon_city".to_string(),
            personality: "casual".to_string(),
            tools: vec!["npm".to_string(), "eslint".to_string()],
            auto_switch: true,
        },
        WorkspaceProfile {
            name: "Backend".to_string(),
            directory: "~/projects/backend".to_string(),
            theme: "dracula".to_string(),
            personality: "professional".to_string(),
            tools: vec!["cargo".to_string(), "docker".to_string()],
            auto_switch: true,
        },
        WorkspaceProfile {
            name: "Data Science".to_string(),
            directory: "~/projects/data".to_string(),
            theme: "nord".to_string(),
            personality: "academic".to_string(),
            tools: vec!["python".to_string(), "jupyter".to_string()],
            auto_switch: true,
        },
    ]
}

/// Render workspace profile selector.
pub fn render_workspace_profiles(
    profiles: &[WorkspaceProfile],
    selected: usize,
    current_dir: &str,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "📁 Workspace Profiles",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("   Current: {}", current_dir),
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from(""));

    for (i, profile) in profiles.iter().enumerate() {
        let is_selected = i == selected;
        let is_active = current_dir.starts_with(&profile.directory);

        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                profile.name.clone(),
                Style::default()
                    .fg(if is_active { neon_green() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
            Span::styled(
                if is_active { " (active)" } else { "" },
                Style::default().fg(neon_green()),
            ),
        ]));

        if is_selected || is_active {
            lines.push(Line::from(vec![
                Span::styled("    Theme: ", Style::default().fg(dim_color())),
                Span::styled(profile.theme.clone(), Style::default().fg(neon_cyan())),
                Span::styled("  Personality: ", Style::default().fg(dim_color())),
                Span::styled(profile.personality.clone(), Style::default().fg(neon_magenta())),
            ]));
            lines.push(Line::from(vec![
                Span::styled("    Tools: ", Style::default().fg(dim_color())),
                Span::styled(
                    profile.tools.join(", "),
                    Style::default().fg(neon_yellow()),
                ),
            ]));
        }
    }

    lines
}

/// Auto-detect workspace profile from directory.
pub fn detect_workspace_profile(dir: &str) -> Option<WorkspaceProfile> {
    let profiles = get_workspace_profiles();
    profiles.into_iter().find(|p| dir.starts_with(&p.directory))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn workspace_profiles() {
        let profiles = get_workspace_profiles();
        assert!(profiles.len() >= 3);
    }

    #[test]
    fn detect_profile() {
        let profile = detect_workspace_profile("~/projects/frontend/src");
        assert!(profile.is_some());
    }
}
