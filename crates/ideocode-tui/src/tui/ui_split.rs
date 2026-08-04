// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Split Terminal (F10)
//!
//! Multi-pane split view with horizontal/vertical splits.
//! Allows users to see output, logs, and chat simultaneously.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use ratatui::widgets::{Block, Borders, Paragraph};

/// Split direction.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SplitDirection {
    Horizontal,
    Vertical,
}

/// A single pane in the split view.
#[derive(Debug, Clone)]
pub struct SplitPane {
    pub id: usize,
    pub label: String,
    pub content: Vec<String>,
    pub scroll: usize,
    pub active: bool,
}

impl SplitPane {
    pub fn new(id: usize, label: &str) -> Self {
        Self {
            id,
            label: label.to_string(),
            content: Vec::new(),
            scroll: 0,
            active: false,
        }
    }

    pub fn push_line(&mut self, line: String) {
        self.content.push(line);
    }

    pub fn visible_lines(&self, height: usize) -> &[String] {
        let start = self.scroll;
        let end = (start + height).min(self.content.len());
        if start < self.content.len() {
            &self.content[start..end]
        } else {
            &[]
        }
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self, viewport_height: usize) {
        let max_scroll = self.content.len().saturating_sub(viewport_height);
        if self.scroll < max_scroll {
            self.scroll += 1;
        }
    }
}

/// Split layout configuration.
#[derive(Debug, Clone)]
pub struct SplitLayout {
    pub direction: SplitDirection,
    pub panes: Vec<SplitPane>,
    pub active_pane: usize,
    pub ratios: Vec<f32>,
}

impl SplitLayout {
    pub fn new(direction: SplitDirection) -> Self {
        Self {
            direction,
            panes: Vec::new(),
            active_pane: 0,
            ratios: Vec::new(),
        }
    }

    pub fn add_pane(&mut self, label: &str) -> usize {
        let id = self.panes.len();
        self.panes.push(SplitPane::new(id, label));
        self.rebalance_ratios();
        id
    }

    pub fn remove_pane(&mut self, id: usize) {
        if self.panes.len() <= 1 {
            return;
        }
        self.panes.retain(|p| p.id != id);
        if self.active_pane >= self.panes.len() {
            self.active_pane = self.panes.len() - 1;
        }
        self.rebalance_ratios();
    }

    pub fn activate_next(&mut self) {
        if !self.panes.is_empty() {
            self.active_pane = (self.active_pane + 1) % self.panes.len();
        }
    }

    pub fn activate_prev(&mut self) {
        if !self.panes.is_empty() {
            self.active_pane = if self.active_pane == 0 {
                self.panes.len() - 1
            } else {
                self.active_pane - 1
            };
        }
    }

    fn rebalance_ratios(&mut self) {
        let n = self.panes.len() as f32;
        self.ratios = vec![1.0 / n; self.panes.len()];
    }

    /// Compute areas for each pane given a total area.
    pub fn compute_areas(&self, area: Rect) -> Vec<Rect> {
        if self.panes.is_empty() {
            return vec![];
        }

        let mut areas = Vec::with_capacity(self.panes.len());
        let total_weight: f32 = self.ratios.iter().sum();

        match self.direction {
            SplitDirection::Horizontal => {
                let total_h = area.height as f32;
                let mut y = area.y;
                for (i, ratio) in self.ratios.iter().enumerate() {
                    let h = if i == self.panes.len() - 1 {
                        area.height.saturating_sub(y - area.y)
                    } else {
                        (total_h * ratio / total_weight).round() as u16
                    };
                    areas.push(Rect {
                        x: area.x,
                        y,
                        width: area.width,
                        height: h.max(1),
                    });
                    y += h;
                }
            }
            SplitDirection::Vertical => {
                let total_w = area.width as f32;
                let mut x = area.x;
                for (i, ratio) in self.ratios.iter().enumerate() {
                    let w = if i == self.panes.len() - 1 {
                        area.width.saturating_sub(x - area.x)
                    } else {
                        (total_w * ratio / total_weight).round() as u16
                    };
                    areas.push(Rect {
                        x,
                        y: area.y,
                        width: w.max(1),
                        height: area.height,
                    });
                    x += w;
                }
            }
        }

        areas
    }
}

/// Render a single split pane.
pub fn render_pane(pane: &SplitPane, frame: &mut Frame, area: Rect, is_active: bool) {
    let border_style = if is_active {
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(dim_color())
    };

    let header = if pane.active { " [ACTIVE]" } else { "" };
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(border_style)
        .title(Span::styled(
            format!(" {}{}", pane.label, header),
            Style::default()
                .fg(if is_active { neon_cyan() } else { dim_color() })
                .add_modifier(Modifier::BOLD),
        ));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.height == 0 || inner.width == 0 {
        return;
    }

    let lines: Vec<Line<'static>> = pane
        .visible_lines(inner.height as usize)
        .iter()
        .map(|l| Line::from(Span::styled(l.clone(), Style::default().fg(dim_color()))))
        .collect();

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Render a split layout.
pub fn render_split_layout(layout: &SplitLayout, frame: &mut Frame, area: Rect) {
    let areas = layout.compute_areas(area);
    for (i, pane) in layout.panes.iter().enumerate() {
        if i < areas.len() {
            render_pane(pane, frame, areas[i], i == layout.active_pane);
        }
    }
}

/// Create a default split layout with common panes.
pub fn default_split() -> SplitLayout {
    let mut layout = SplitLayout::new(SplitDirection::Horizontal);
    layout.add_pane("Chat");
    layout.add_pane("Output");
    layout.panes[0].active = true;
    layout.active_pane = 0;
    layout
}

/// Create a side-by-side split layout.
pub fn side_by_side() -> SplitLayout {
    let mut layout = SplitLayout::new(SplitDirection::Vertical);
    layout.add_pane("Terminal");
    layout.add_pane("Preview");
    layout.panes[0].active = true;
    layout.active_pane = 0;
    layout
}

/// Create a three-pane layout (terminal, log, status).
pub fn three_pane() -> SplitLayout {
    let mut layout = SplitLayout::new(SplitDirection::Vertical);
    layout.add_pane("Terminal");
    layout.add_pane("Log");
    layout.add_pane("Status");
    layout.panes[0].active = true;
    layout.active_pane = 0;
    layout
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pane_lifecycle() {
        let mut pane = SplitPane::new(0, "Test");
        assert!(pane.content.is_empty());
        pane.push_line("hello".into());
        assert_eq!(pane.content.len(), 1);
        let visible = pane.visible_lines(10);
        assert_eq!(visible, &["hello"]);
    }

    #[test]
    fn layout_areas() {
        let mut layout = SplitLayout::new(SplitDirection::Horizontal);
        layout.add_pane("A");
        layout.add_pane("B");
        let area = Rect::new(0, 0, 80, 24);
        let areas = layout.compute_areas(area);
        assert_eq!(areas.len(), 2);
        assert_eq!(areas[0].height + areas[1].height, 24);
    }

    #[test]
    fn remove_pane() {
        let mut layout = default_split();
        assert_eq!(layout.panes.len(), 2);
        layout.remove_pane(1);
        assert_eq!(layout.panes.len(), 1);
    }

    #[test]
    fn activate_navigation() {
        let mut layout = default_split();
        assert_eq!(layout.active_pane, 0);
        layout.activate_next();
        assert_eq!(layout.active_pane, 1);
        layout.activate_next();
        assert_eq!(layout.active_pane, 0);
        layout.activate_prev();
        assert_eq!(layout.active_pane, 1);
    }
}
