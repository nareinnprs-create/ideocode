//! IDEOCODE Export Formats (F6)
//!
//! Export as: Markdown, HTML, PDF, JSON, terminal recording (asciinema).

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

/// Export session content to a file.
pub fn export_session(
    format: &ExportFormat,
    filename: &str,
    messages: &[(String, String)], // (role, content) pairs
) -> Result<String, String> {
    let content = match format {
        ExportFormat::Markdown => export_as_markdown(messages),
        ExportFormat::Html => export_as_html(messages),
        ExportFormat::Json => export_as_json(messages),
        ExportFormat::Pdf | ExportFormat::PdfWithHighlight => {
            return Err("PDF export requires external tool (wkhtmltopdf)".to_string());
        }
        ExportFormat::Asciinema => export_as_asciinema(messages),
    };

    std::fs::write(filename, &content)
        .map_err(|e| format!("Failed to write {}: {}", filename, e))?;

    Ok(filename.to_string())
}

fn export_as_markdown(messages: &[(String, String)]) -> String {
    let mut md = String::from("# IDEOCODE Session Export\n\n");
    md.push_str(&format!("Exported at: {}\n\n", chrono::Local::now().format("%Y-%m-%d %H:%M:%S")));
    for (role, content) in messages {
        let header = match role.as_str() {
            "user" => "## User",
            "assistant" => "## Assistant",
            _ => "## System",
        };
        md.push_str(&format!("{}\n\n{}\n\n", header, content));
    }
    md
}

fn export_as_html(messages: &[(String, String)]) -> String {
    let mut html = String::from(r#"<!DOCTYPE html>
<html><head><title>IDEOCODE Session</title>
<style>
body{font-family:monospace;background:#0a0a14;color:#e0e0e0;padding:2rem;max-width:800px;margin:auto}
.user{color:#00ffcc;border-left:3px solid #00ffcc;padding-left:1rem;margin:1rem 0}
.assistant{color:#00ff88;border-left:3px solid #00ff88;padding-left:1rem;margin:1rem 0}
h2{margin-top:2rem}
</style></head><body>
<h1>IDEOCODE Session</h1>
"#);
    for (role, content) in messages {
        let class = if role == "user" { "user" } else { "assistant" };
        html.push_str(&format!(
            r#"<div class="{}"><h2>{}</h2><pre>{}</pre></div>"#,
            class, role, content
        ));
    }
    html.push_str("</body></html>");
    html
}

fn export_as_json(messages: &[(String, String)]) -> String {
    let export = serde_json::json!({
        "tool": "IDEOCODE",
        "exported_at": chrono::Local::now().to_rfc3339(),
        "message_count": messages.len(),
        "messages": messages.iter().map(|(role, content)| {
            serde_json::json!({"role": role, "content": content})
        }).collect::<Vec<_>>(),
    });
    serde_json::to_string_pretty(&export).unwrap_or_default()
}

fn export_as_asciinema(messages: &[(String, String)]) -> String {
    let mut cast = String::from(r#"{"version":2,"width":120,"height":40,"timestamp":0,"env":{"SHELL":"/bin/bash"}}"#);
    cast.push('\n');
    let mut ts = 0.0;
    for (role, content) in messages {
        let prompt = if role == "user" { "$ " } else { "" };
        cast.push_str(&format!("[{:.1},\"o\",\"{}{}\\n\"]\n", ts, prompt, content.replace('\n', "\\n")));
        ts += 0.5;
    }
    cast
}

/// Get default export filename.
pub fn default_export_filename(format: &ExportFormat) -> String {
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    format!("ideocode_session_{}{}", timestamp, format.extension())
}
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
