//! IDEOCODE Visible Scrollbar (H2)
//!
//! Mini scrollbar on right edge showing position in conversation.
//! Like VS Code's minimap but for the terminal.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

/// Render a visible scrollbar indicator.
pub fn render_scrollbar(
    total_lines: usize,
    visible_lines: usize,
    scroll_offset: usize,
    height: u16,
) -> Vec<Line<'static>> {
    if total_lines <= visible_lines {
        return vec![];
    }

    let mut lines = Vec::new();
    let scrollbar_height = height as usize;

    // Calculate thumb position
    let scroll_ratio = if total_lines > visible_lines {
        scroll_offset as f32 / (total_lines - visible_lines) as f32
    } else {
        0.0
    };

    let thumb_pos = (scroll_ratio * (scrollbar_height as f32 - 1.0)) as usize;
    let thumb_height = ((visible_lines as f32 / total_lines as f32) * scrollbar_height as f32)
        .max(1.0) as usize;

    for i in 0..scrollbar_height {
        let is_thumb = i >= thumb_pos && i < thumb_pos + thumb_height;
        let is_top = i == thumb_pos;
        let is_bottom = i == thumb_pos + thumb_height - 1;

        let (ch, color) = if is_thumb {
            if is_top || is_bottom {
                ("█", neon_cyan())
            } else {
                ("█", neon_cyan())
            }
        } else {
            ("│", dim_color())
        };

        lines.push(Line::from(Span::styled(
            ch.to_string(),
            Style::default().fg(color),
        )));
    }

    lines
}

/// Render scroll position indicator.
pub fn render_scroll_position(
    total_lines: usize,
    visible_lines: usize,
    scroll_offset: usize,
) -> Line<'static> {
    if total_lines <= visible_lines {
        return Line::from(Span::styled(
            " Full ",
            Style::default().fg(neon_green()),
        ));
    }

    let start = scroll_offset + 1;
    let end = (scroll_offset + visible_lines).min(total_lines);
    let percentage = if total_lines > visible_lines {
        (scroll_offset as f32 / (total_lines - visible_lines) as f32 * 100.0) as usize
    } else {
        100
    };

    Line::from(vec![
        Span::styled(
            format!(" {}-{}/{} ", start, end, total_lines),
            Style::default().fg(dim_color()),
        ),
        Span::styled(
            format!("{}%", percentage),
            Style::default().fg(neon_cyan()),
        ),
    ])
}

/// Render scrollbar with position markers.
pub fn render_scrollbar_with_markers(
    total_lines: usize,
    visible_lines: usize,
    scroll_offset: usize,
    height: u16,
    markers: &[(usize, Color)], // (line_number, color) pairs
) -> Vec<Line<'static>> {
    if total_lines <= visible_lines {
        return vec![];
    }

    let mut lines = Vec::new();
    let scrollbar_height = height as usize;

    let scroll_ratio = if total_lines > visible_lines {
        scroll_offset as f32 / (total_lines - visible_lines) as f32
    } else {
        0.0
    };

    let thumb_pos = (scroll_ratio * (scrollbar_height as f32 - 1.0)) as usize;
    let thumb_height = ((visible_lines as f32 / total_lines as f32) * scrollbar_height as f32)
        .max(1.0) as usize;

    for i in 0..scrollbar_height {
        let is_thumb = i >= thumb_pos && i < thumb_pos + thumb_height;

        // Check if there's a marker at this position
        let marker_color = markers
            .iter()
            .find(|(line, _)| {
                let marker_pos = (*line as f32 / total_lines as f32 * scrollbar_height as f32) as usize;
                marker_pos == i
            })
            .map(|(_, color)| *color);

        let (ch, color) = if let Some(color) = marker_color {
            ("●", color)
        } else if is_thumb {
            ("█", neon_cyan())
        } else {
            ("│", dim_color())
        };

        lines.push(Line::from(Span::styled(
            ch.to_string(),
            Style::default().fg(color),
        )));
    }

    lines
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scrollbar_no_overflow() {
        let lines = render_scrollbar(100, 50, 0, 10);
        assert_eq!(lines.len(), 10);
    }

    #[test]
    fn scroll_position_full() {
        let line = render_scroll_position(50, 50, 0);
        assert!(line.spans.iter().any(|s| s.content.contains("Full")));
    }
}
