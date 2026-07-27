//! IDEOCODE Export Formats (F6)
//!
//! Export as: Markdown, HTML, PDF, JSON, terminal recording (asciinema).

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone, PartialEq)]
pub enum ExportFormat {
    Markdown,
    Html,
    Pdf,
    Json,
    Asciinema,
    PdfWithHighlight,
}

impl ExportFormat {
    pub fn label(&self) -> &str {
        match self {
            ExportFormat::Markdown => "Markdown",
            ExportFormat::Html => "HTML",
            ExportFormat::Pdf => "PDF",
            ExportFormat::Json => "JSON",
            ExportFormat::Asciinema => "Asciinema",
            ExportFormat::PdfWithHighlight => "PDF (Highlighted)",
        }
    }

    pub fn extension(&self) -> &str {
        match self {
            ExportFormat::Markdown => ".md",
            ExportFormat::Html => ".html",
            ExportFormat::Pdf => ".pdf",
            ExportFormat::Json => ".json",
            ExportFormat::Asciinema => ".cast",
            ExportFormat::PdfWithHighlight => ".pdf",
        }
    }

    pub fn icon(&self) -> &str {
        match self {
            ExportFormat::Markdown => "📝",
            ExportFormat::Html => "🌐",
            ExportFormat::Pdf => "📄",
            ExportFormat::Json => "📋",
            ExportFormat::Asciinema => "🎬",
            ExportFormat::PdfWithHighlight => "✨",
        }
    }
}

/// Get available export formats.
pub fn get_export_formats() -> Vec<ExportFormat> {
    vec![
        ExportFormat::Markdown,
        ExportFormat::Html,
        ExportFormat::Pdf,
        ExportFormat::Json,
        ExportFormat::Asciinema,
        ExportFormat::PdfWithHighlight,
    ]
}

/// Render export format selector.
pub fn render_export_selector(
    formats: &[ExportFormat],
    selected: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    lines.push(Line::from(Span::styled(
        "📤 Export Session",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    for (i, format) in formats.iter().enumerate() {
        let is_selected = i == selected;
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected { neon_green() } else { dim_color() }),
            ),
            Span::styled(
                format!("{} ", format.icon()),
                Style::default().fg(neon_cyan()),
            ),
            Span::styled(
                format.label().to_string(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
            Span::styled(
                format!("  ({})", format.extension()),
                Style::default().fg(dim_color()),
            ),
        ]));
    }

    lines
}

/// Render export progress.
pub fn render_export_progress(
    format: &ExportFormat,
    progress: f32,
    filename: &str,
) -> Vec<Line<'static>> {
    let bar_width = 20;
    let filled = (progress * bar_width as f32) as usize;
    let empty = bar_width - filled;
    let bar = "█".repeat(filled) + &"░".repeat(empty);

    vec![
        Line::from(Span::styled(
            format!("📤 Exporting to {}", format.label()),
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            bar,
            Style::default().fg(neon_green()),
        )),
        Line::from(Span::styled(
            format!("  {}", filename),
            Style::default().fg(dim_color()),
        )),
    ]
}

/// Render export success.
pub fn render_export_success(format: &ExportFormat, filename: &str) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "✅ Export Complete!",
            Style::default()
                .fg(neon_green())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  Saved to: {}", filename),
            Style::default().fg(neon_cyan()),
        )),
        Line::from(Span::styled(
            format!("  Format: {} ({})", format.label(), format.extension()),
            Style::default().fg(dim_color()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_formats() {
        let formats = get_export_formats();
        assert!(formats.len() >= 6);
    }

    #[test]
    fn format_extensions() {
        assert_eq!(ExportFormat::Markdown.extension(), ".md");
        assert_eq!(ExportFormat::Html.extension(), ".html");
    }
}
