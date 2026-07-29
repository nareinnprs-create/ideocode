//! IDEOCODE Smart Completions (I9)
//!
//! Autocomplete suggestions as you type.
//! Uses fuzzy matching and context-aware suggestions.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Completion item with metadata.
#[derive(Debug, Clone)]
pub struct CompletionItem {
    pub label: String,
    pub kind: CompletionKind,
    pub detail: Option<String>,
    pub score: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CompletionKind {
    Command,
    File,
    Function,
    Variable,
    Keyword,
    Snippet,
}

impl CompletionKind {
    pub fn icon(&self) -> &str {
        match self {
            CompletionKind::Command => "⚡",
            CompletionKind::File => "📄",
            CompletionKind::Function => "🔧",
            CompletionKind::Variable => "📦",
            CompletionKind::Keyword => "🔑",
            CompletionKind::Snippet => "✂️",
        }
    }

    pub fn color(&self) -> Color {
        match self {
            CompletionKind::Command => neon_green(),
            CompletionKind::File => neon_cyan(),
            CompletionKind::Function => neon_magenta(),
            CompletionKind::Variable => neon_purple(),
            CompletionKind::Keyword => neon_yellow(),
            CompletionKind::Snippet => neon_orange(),
        }
    }
}

/// Autocomplete engine.
pub struct AutocompleteEngine {
    commands: Vec<CompletionItem>,
    keywords: Vec<CompletionItem>,
    snippets: Vec<CompletionItem>,
}

impl Default for AutocompleteEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl AutocompleteEngine {
    pub fn new() -> Self {
        Self {
            commands: Self::default_commands(),
            keywords: Self::default_keywords(),
            snippets: Self::default_snippets(),
        }
    }

    fn default_commands() -> Vec<CompletionItem> {
        vec![
            CompletionItem {
                label: "/help".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Show help".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "/clear".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Clear history".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "/theme".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Change theme".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "/mode".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Change personality".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "/roast".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Roast my code".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "/stats".to_string(),
                kind: CompletionKind::Command,
                detail: Some("Show statistics".to_string()),
                score: 0.0,
            },
        ]
    }

    fn default_keywords() -> Vec<CompletionItem> {
        vec![
            CompletionItem {
                label: "fn".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Function definition".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "let".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Variable binding".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "mut".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Mutable binding".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "pub".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Public visibility".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "impl".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Implementation block".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "struct".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Struct definition".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "enum".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Enum definition".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "match".to_string(),
                kind: CompletionKind::Keyword,
                detail: Some("Pattern matching".to_string()),
                score: 0.0,
            },
        ]
    }

    fn default_snippets() -> Vec<CompletionItem> {
        vec![
            CompletionItem {
                label: "fn name() {}".to_string(),
                kind: CompletionKind::Snippet,
                detail: Some("Function snippet".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "if condition {}".to_string(),
                kind: CompletionKind::Snippet,
                detail: Some("If statement".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "for i in 0..n {}".to_string(),
                kind: CompletionKind::Snippet,
                detail: Some("For loop".to_string()),
                score: 0.0,
            },
            CompletionItem {
                label: "match expr {}".to_string(),
                kind: CompletionKind::Snippet,
                detail: Some("Match expression".to_string()),
                score: 0.0,
            },
        ]
    }

    /// Get completions for input text.
    pub fn get_completions(&self, input: &str) -> Vec<&CompletionItem> {
        if input.is_empty() {
            return vec![];
        }

        let input_lower = input.to_lowercase();
        let mut completions: Vec<&CompletionItem> = self
            .commands
            .iter()
            .chain(self.keywords.iter())
            .chain(self.snippets.iter())
            .filter(|item| {
                item.label.to_lowercase().contains(&input_lower)
                    || item
                        .detail
                        .as_ref()
                        .map(|d| d.to_lowercase().contains(&input_lower))
                        .unwrap_or(false)
            })
            .collect();

        // Sort by relevance (exact match first, then prefix, then contains)
        completions.sort_by(|a, b| {
            let a_exact = a.label.to_lowercase() == input_lower;
            let b_exact = b.label.to_lowercase() == input_lower;
            let a_prefix = a.label.to_lowercase().starts_with(&input_lower);
            let b_prefix = b.label.to_lowercase().starts_with(&input_lower);

            match (a_exact, b_exact) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => match (a_prefix, b_prefix) {
                    (true, false) => std::cmp::Ordering::Less,
                    (false, true) => std::cmp::Ordering::Greater,
                    _ => a.label.cmp(&b.label),
                },
            }
        });

        completions
    }
}

/// Render completion popup.
pub fn render_completions(completions: &[&CompletionItem], selected: usize) -> Vec<Line<'static>> {
    let mut lines = Vec::new();
    
    for (i, item) in completions.iter().enumerate() {
        let is_selected = i == selected;
        let color = item.kind.color();
        
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                format!("{} ", item.kind.icon()),
                Style::default().fg(color),
            ),
            Span::styled(
                item.label.clone(),
                Style::default()
                    .fg(if is_selected { color } else { dim_color() })
                    .add_modifier(if is_selected {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
            Span::styled(
                item.detail
                    .as_ref()
                    .map(|d| format!("  {}", d))
                    .unwrap_or_default(),
                Style::default().fg(dim_color()),
            ),
        ]));
    }
    
    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn autocomplete_finds_commands() {
        let engine = AutocompleteEngine::new();
        let results = engine.get_completions("/he");
        assert!(!results.is_empty());
        assert!(results.iter().any(|c| c.label == "/help"));
    }

    #[test]
    fn autocomplete_empty_input() {
        let engine = AutocompleteEngine::new();
        let results = engine.get_completions("");
        assert!(results.is_empty());
    }
}
