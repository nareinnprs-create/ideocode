//! IDEOCODE File Explorer Panel (#6)
//!
//! Interactive file tree sidebar with directory navigation.

use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::{Line, Span};
use ratatui::widgets::Paragraph;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: PathBuf,
    pub is_dir: bool,
    pub is_expanded: bool,
    pub depth: usize,
}

pub struct FileExplorerState {
    pub visible: bool,
    pub entries: Vec<FileEntry>,
    pub selected: usize,
    pub cwd: PathBuf,
    pub scroll: usize,
}

impl FileExplorerState {
    pub fn new() -> Self {
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let mut state = Self {
            visible: false,
            entries: Vec::new(),
            selected: 0,
            cwd: cwd.clone(),
            scroll: 0,
        };
        state.refresh();
        state
    }

    pub fn refresh(&mut self) {
        self.entries.clear();
        let cwd = self.cwd.clone();
        self.load_dir(&cwd, 0, true);
    }

    fn load_dir(&mut self, dir: &Path, depth: usize, expand_root: bool) {
        if let Ok(rd) = std::fs::read_dir(dir) {
            let mut entries: Vec<_> = rd.flatten().collect();
            entries.sort_by(|a, b| {
                let a_dir = a.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                let b_dir = b.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                b_dir.cmp(&a_dir).then(a.file_name().cmp(&b.file_name()))
            });

            for entry in entries {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with('.') && depth == 0 { continue; }
                let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                let path = entry.path();

                self.entries.push(FileEntry {
                    name: name.clone(),
                    path: path.clone(),
                    is_dir,
                    is_expanded: false,
                    depth,
                });

                if is_dir && expand_root && depth < 1 {
                    // Load one level deep for root
                }
            }
        }
    }

    pub fn toggle_expand(&mut self) {
        if let Some(entry) = self.entries.get_mut(self.selected) {
            if entry.is_dir {
                entry.is_expanded = !entry.is_expanded;
                if entry.is_expanded {
                    // Load children
                    let path = entry.path.clone();
                    let depth = entry.depth + 1;
                    let idx = self.selected + 1;
                    let mut new_entries = Vec::new();
                    if let Ok(rd) = std::fs::read_dir(&path) {
                        let mut entries: Vec<_> = rd.flatten().collect();
                        entries.sort_by(|a, b| {
                            let a_dir = a.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                            let b_dir = b.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                            b_dir.cmp(&a_dir).then(a.file_name().cmp(&b.file_name()))
                        });
                        for entry in entries {
                            let name = entry.file_name().to_string_lossy().to_string();
                            if name.starts_with('.') { continue; }
                            let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
                            new_entries.push(FileEntry {
                                name, path: entry.path(), is_dir, is_expanded: false, depth,
                            });
                        }
                    }
                    for (i, e) in new_entries.into_iter().enumerate() {
                        self.entries.insert(idx + i, e);
                    }
                } else {
                    // Remove children
                    let child_depth = self.entries[self.selected].depth + 1;
                    while self.entries.len() > self.selected + 1
                        && self.entries[self.selected + 1].depth >= child_depth
                    {
                        self.entries.remove(self.selected + 1);
                    }
                }
            }
        }
    }

    pub fn move_up(&mut self) {
        self.selected = self.selected.saturating_sub(1);
    }

    pub fn move_down(&mut self) {
        if self.selected + 1 < self.entries.len() {
            self.selected += 1;
        }
    }

    pub fn scroll_up(&mut self) {
        self.scroll = self.scroll.saturating_sub(1);
    }

    pub fn scroll_down(&mut self) {
        self.scroll += 1;
    }
}

/// Render the file explorer panel.
pub fn render_file_explorer(frame: &mut Frame, area: Rect, state: &FileExplorerState) {
    if !state.visible { return; }

    let panel_width = 30.min(area.width as usize / 3);
    let panel_area = Rect {
        x: area.x,
        y: area.y,
        width: panel_width as u16,
        height: area.height,
    };

    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        "📂 Files",
        Style::default().fg(neon_cyan()).add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(Span::styled(
        format!("  {}", state.cwd.to_string_lossy().chars().take(26).collect::<String>()),
        Style::default().fg(dim_color()),
    )));
    lines.push(Line::from("─".repeat(panel_width)));

    let max_visible = area.height as usize - 4;
    for (i, entry) in state.entries.iter().skip(state.scroll).take(max_visible).enumerate() {
        let is_selected = i + state.scroll == state.selected;
        let indent = "  ".repeat(entry.depth);

        let (icon, color) = if entry.is_dir {
            if entry.is_expanded { ("📂", neon_yellow()) } else { ("📁", neon_blue()) }
        } else {
            let ext = Path::new(&entry.name).extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");
            match ext {
                "rs" => ("🦀", neon_orange()),
                "js" | "ts" => ("📜", neon_yellow()),
                "py" => ("🐍", neon_green()),
                "go" => ("🔵", neon_cyan()),
                "md" | "txt" => ("📝", dim_color()),
                "json" | "yaml" | "yml" => ("⚙️", neon_magenta()),
                "toml" => ("📋", neon_purple()),
                _ => ("📄", dim_color()),
            }
        };

        lines.push(Line::from(vec![
            Span::styled(indent, Style::default()),
            Span::styled(format!("{} ", icon), Style::default().fg(color)),
            Span::styled(
                entry.name.chars().take(22).collect::<String>(),
                Style::default()
                    .fg(if is_selected { neon_cyan() } else { dim_color() })
                    .add_modifier(if is_selected { Modifier::BOLD } else { Modifier::empty() }),
            ),
        ]));
    }

    frame.render_widget(Paragraph::new(lines), panel_area);
}
