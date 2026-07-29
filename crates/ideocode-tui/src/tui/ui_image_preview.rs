//! Multimodal output preview — inline image thumbnails, file previews, and save support.
//!
//! In a terminal, we cannot render actual images, but we can:
//! 1. Show a colored placeholder with dimensions/type info
//! 2. Generate a tiny ASCII art preview from base64 data
//! 3. Save images to disk for viewing in external viewers
//! 4. Show metadata (size, type, dimensions)

use ratatui::prelude::*;
use ratatui::widgets::*;

const THUMB_WIDTH: u16 = 40;
const THUMB_HEIGHT: u16 = 10;

#[derive(Debug, Clone)]
pub struct ImagePreview {
    pub media_type: String,
    pub data_b64: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub label: String,
}

impl ImagePreview {
    pub fn new(media_type: String, data_b64: String) -> Self {
        let label = format!("{} image", media_type.replace("image/", "").to_uppercase());
        Self {
            media_type,
            data_b64,
            width: None,
            height: None,
            label,
        }
    }

    pub fn with_dimensions(mut self, w: u32, h: u32) -> Self {
        self.width = Some(w);
        self.height = Some(h);
        self
    }

    pub fn size_bytes(&self) -> usize {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(&self.data_b64)
            .map(|d| d.len())
            .unwrap_or(0)
    }

    pub fn dimensions_str(&self) -> String {
        match (self.width, self.height) {
            (Some(w), Some(h)) => format!("{}x{}", w, h),
            _ => "unknown".to_string(),
        }
    }

    pub fn save_to_file(&self, path: &std::path::Path) -> Result<(), String> {
        use base64::Engine;
        let data = base64::engine::general_purpose::STANDARD
            .decode(&self.data_b64)
            .map_err(|e| format!("Base64 decode error: {}", e))?;
        std::fs::write(path, data).map_err(|e| format!("Write error: {}", e))
    }
}

/// Render an inline image preview block within a chat area.
pub fn render_image_preview_block(
    f: &mut Frame,
    area: Rect,
    preview: &ImagePreview,
    is_selected: bool,
) {
    let border_color = if is_selected {
        Color::Rgb(0, 255, 200)
    } else {
        Color::Rgb(60, 60, 100)
    };

    let bg_color = Color::Rgb(15, 15, 30);

    let block = Block::default()
        .title(Span::styled(
            format!(" {} {} ", preview.label, preview.dimensions_str()),
            Style::default()
                .fg(Color::Rgb(0, 200, 255))
                .add_modifier(Modifier::BOLD),
        ))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(border_color))
        .style(Style::default().bg(bg_color));

    let inner = block.inner(area);
    f.render_widget(block, area);

    if inner.width < 6 || inner.height < 3 {
        return;
    }

    let mut lines = Vec::new();

    // ASCII art pattern based on media type
    let pattern = generate_type_pattern(&preview.media_type);
    for row in pattern.iter().take(inner.height as usize) {
        let mut spans: Vec<Span> = Vec::new();
        for ch in row.chars().take(inner.width as usize) {
            let color = match ch {
                '#' => Color::Rgb(0, 180, 255),
                '.' => Color::Rgb(0, 100, 150),
                '*' => Color::Rgb(0, 255, 200),
                '~' => Color::Rgb(80, 80, 120),
                _ => Color::Rgb(30, 30, 50),
            };
            spans.push(Span::styled(ch.to_string(), Style::default().fg(color)));
        }
        lines.push(Line::from(spans));
    }

    // Info line at bottom
    let size_kb = preview.size_bytes() / 1024;
    let info = format!("{} | {} KB", preview.media_type, size_kb);
    if lines.len() < inner.height as usize {
        lines.push(Line::from(Span::styled(
            info,
            Style::default().fg(Color::Rgb(120, 120, 160)),
        )));
    }

    let paragraph = Paragraph::new(lines).wrap(Wrap { trim: false });
    f.render_widget(paragraph, inner);
}

/// Render a compact inline image indicator for chat messages.
pub fn render_inline_image_indicator(
    preview: &ImagePreview,
) -> Line<'static> {
    let size_kb = preview.size_bytes() / 1024;
    let dim = preview.dimensions_str();

    Line::from(vec![
        Span::styled("🖼 ", Style::default().fg(Color::Rgb(0, 200, 255))),
        Span::styled(
            format!("{} ", preview.label),
            Style::default()
                .fg(Color::Rgb(0, 255, 200))
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("{} ", dim),
            Style::default().fg(Color::Rgb(120, 120, 160)),
        ),
        Span::styled(
            format!("{} KB", size_kb),
            Style::default().fg(Color::Rgb(100, 100, 140)),
        ),
        Span::styled(
            " [save]",
            Style::default().fg(Color::Rgb(0, 150, 255)),
        ),
    ])
}

/// Generate a simple ASCII pattern based on media type for the preview block.
fn generate_type_pattern(media_type: &str) -> Vec<String> {
    let width = THUMB_WIDTH as usize;
    let height = THUMB_HEIGHT as usize;

    match media_type {
        t if t.contains("png") || t.contains("jpeg") || t.contains("jpg") => {
            // Image pattern: mountain landscape
            let mut pattern = Vec::new();
            for y in 0..height {
                let mut row = String::new();
                for x in 0..width {
                    let ch = if y > height * 2 / 3 && x > width / 4 && x < width * 3 / 4 {
                        '#'
                    } else if y > height / 2
                        && ((x > width / 3 && y < height * 2 / 3)
                            || (x > width / 2 && y < height * 3 / 4))
                    {
                        '.'
                    } else if y == height / 3 && x > width / 5 && x < width * 4 / 5 {
                        '*'
                    } else if y > height * 3 / 4 {
                        '~'
                    } else {
                        ' '
                    };
                    row.push(ch);
                }
                pattern.push(row);
            }
            pattern
        }
        t if t.contains("pdf") => {
            // PDF pattern: document
            let mut pattern = Vec::new();
            for y in 0..height {
                let mut row = String::new();
                for x in 0..width {
                    let ch = if x >= 8 && x < width - 8 && y >= 2 && y < height - 2 {
                        if (4..=6).contains(&y) && (12..20).contains(&x) {
                            '#'
                        } else if y > 7 && y < height - 4 && x >= 12 && x < width - 12 {
                            '.'
                        } else {
                            '~'
                        }
                    } else {
                        ' '
                    };
                    row.push(ch);
                }
                pattern.push(row);
            }
            pattern
        }
        t if t.contains("gif") => {
            // GIF pattern: animated frames indicator
            let mut pattern = Vec::new();
            for y in 0..height {
                let mut row = String::new();
                for x in 0..width {
                    let ch = if y > 2 && y < height - 2 && x > 5 && x < width - 5 {
                        let phase = (x + y) % 8;
                        if phase < 2 {
                            '#'
                        } else if phase < 4 {
                            '.'
                        } else if phase < 6 {
                            '*'
                        } else {
                            '~'
                        }
                    } else {
                        ' '
                    };
                    row.push(ch);
                }
                pattern.push(row);
            }
            pattern
        }
        _ => {
            // Generic pattern
            let mut pattern = Vec::new();
            for y in 0..height {
                let mut row = String::new();
                for x in 0..width {
                    let ch = if (x + y) % 6 < 3 { '#' } else { '.' };
                    row.push(ch);
                }
                pattern.push(row);
            }
            pattern
        }
    }
}

/// Save an image to a user-friendly location and return the path.
pub fn save_image_to_desktop(
    preview: &ImagePreview,
    filename: &str,
) -> Result<String, String> {
    let desktop = dirs::desktop_dir()
        .or_else(|| dirs::data_local_dir().map(|p| p.join("Desktop")))
        .ok_or("Cannot find Desktop directory")?;

    let ext = if preview.media_type.contains("png") {
        "png"
    } else if preview.media_type.contains("jpeg") || preview.media_type.contains("jpg") {
        "jpg"
    } else if preview.media_type.contains("gif") {
        "gif"
    } else if preview.media_type.contains("webp") {
        "webp"
    } else {
        "bin"
    };

    let path = desktop.join(format!("{}.{}", filename, ext));
    preview.save_to_file(&path)?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn image_preview_size_bytes() {
        use base64::Engine;
        let data = b"fake image data for testing";
        let b64 = base64::engine::general_purpose::STANDARD.encode(data);
        let preview = ImagePreview::new("image/png".to_string(), b64);
        assert_eq!(preview.size_bytes(), data.len());
    }

    #[test]
    fn pattern_generation() {
        let pattern = generate_type_pattern("image/png");
        assert_eq!(pattern.len(), THUMB_HEIGHT as usize);
        for row in &pattern {
            assert_eq!(row.len(), THUMB_WIDTH as usize);
        }
    }
}
