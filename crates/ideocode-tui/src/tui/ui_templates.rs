//! IDEOCODE Quick Start Templates (O4)
//!
//! Pre-built project templates to get started quickly.
//! Web App, CLI Tool, Library, Data Science, etc.

use crate::tui::color_support::rgb;
use crate::tui::ui_glass::glass_border_color;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct ProjectTemplate {
    pub name: String,
    pub description: String,
    pub icon: String,
    pub language: String,
    pub files: Vec<String>,
    pub commands: Vec<String>,
}

/// Get available project templates.
pub fn get_templates() -> Vec<ProjectTemplate> {
    vec![
        ProjectTemplate {
            name: "Web App".to_string(),
            description: "Full-stack web application with frontend and backend".to_string(),
            icon: "🌐".to_string(),
            language: "TypeScript".to_string(),
            files: vec![
                "package.json".to_string(),
                "tsconfig.json".to_string(),
                "src/index.ts".to_string(),
                "src/app.ts".to_string(),
                "public/index.html".to_string(),
            ],
            commands: vec![
                "npm init".to_string(),
                "npm install express typescript".to_string(),
                "npm run dev".to_string(),
            ],
        },
        ProjectTemplate {
            name: "CLI Tool".to_string(),
            description: "Command-line interface tool with argument parsing".to_string(),
            icon: "⌨️".to_string(),
            language: "Rust".to_string(),
            files: vec![
                "Cargo.toml".to_string(),
                "src/main.rs".to_string(),
                "src/lib.rs".to_string(),
                "README.md".to_string(),
            ],
            commands: vec![
                "cargo init".to_string(),
                "cargo add clap".to_string(),
                "cargo run".to_string(),
            ],
        },
        ProjectTemplate {
            name: "Library".to_string(),
            description: "Reusable library with tests and documentation".to_string(),
            icon: "📚".to_string(),
            language: "Python".to_string(),
            files: vec![
                "pyproject.toml".to_string(),
                "src/__init__.py".to_string(),
                "tests/test_main.py".to_string(),
                "README.md".to_string(),
            ],
            commands: vec![
                "python -m venv venv".to_string(),
                "pip install -e .".to_string(),
                "pytest".to_string(),
            ],
        },
        ProjectTemplate {
            name: "Data Science".to_string(),
            description: "Data analysis and visualization project".to_string(),
            icon: "📊".to_string(),
            language: "Python".to_string(),
            files: vec![
                "notebooks/analysis.ipynb".to_string(),
                "data/sample.csv".to_string(),
                "src/visualize.py".to_string(),
                "requirements.txt".to_string(),
            ],
            commands: vec![
                "pip install pandas matplotlib".to_string(),
                "jupyter notebook".to_string(),
            ],
        },
        ProjectTemplate {
            name: "Mobile App".to_string(),
            description: "Cross-platform mobile application".to_string(),
            icon: "📱".to_string(),
            language: "Dart".to_string(),
            files: vec![
                "pubspec.yaml".to_string(),
                "lib/main.dart".to_string(),
                "lib/app.dart".to_string(),
                "test/widget_test.dart".to_string(),
            ],
            commands: vec![
                "flutter create .".to_string(),
                "flutter pub get".to_string(),
                "flutter run".to_string(),
            ],
        },
    ]
}

/// Render template selector.
pub fn render_template_selector(
    templates: &[ProjectTemplate],
    selected: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "🚀 Quick Start Templates",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for (i, template) in templates.iter().enumerate() {
        let is_selected = i == selected;
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                format!("{} ", template.icon),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled(
                template.name.clone(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
            Span::styled(
                format!("  ({})", template.language),
                Style::default().fg(dim_color()),
            ),
        ]));
    }

    // Show selected template details
    if let Some(template) = templates.get(selected) {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "─".repeat(40),
            Style::default().fg(glass_border_color()),
        )));
        lines.push(Line::from(Span::styled(
            template.description.clone(),
            Style::default().fg(neon_green()),
        )));
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "Files:",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )));
        for file in &template.files {
            lines.push(Line::from(Span::styled(
                format!("  📄 {}", file),
                Style::default().fg(dim_color()),
            )));
        }
    }

    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_available() {
        let templates = get_templates();
        assert!(templates.len() >= 5);
    }

    #[test]
    fn template_has_files() {
        let templates = get_templates();
        assert!(templates[0].files.len() >= 3);
    }
}
