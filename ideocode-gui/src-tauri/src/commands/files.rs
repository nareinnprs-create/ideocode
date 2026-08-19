// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Opens a native folder picker dialog and returns the selected path.
#[tauri::command]
pub fn open_workspace(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .set_title("Open Workspace")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });
    let path = rx
        .recv()
        .map_err(|e| format!("Dialog channel error: {}", e))?
        .ok_or_else(|| "No folder selected".to_string())?;
    let path_str = path.to_string();
    if path_str.is_empty() {
        return Err("No folder selected".to_string());
    }
    Ok(path_str)
}

/// Remembers the last-opened workspace path for auto-reload on next launch.
#[tauri::command]
pub fn save_workspace_path(path: String) -> Result<(), String> {
    let ws_path = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("workspace-path.txt"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/workspace-path.txt"));
    if let Some(dir) = ws_path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    std::fs::write(&ws_path, &path).map_err(|e| format!("Failed to save workspace path: {}", e))
}

/// Loads the previously-saved workspace path, if any.
#[tauri::command]
pub fn load_workspace_path() -> Option<String> {
    let ws_path = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("workspace-path.txt"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/workspace-path.txt"));
    std::fs::read_to_string(&ws_path)
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && std::path::Path::new(s).exists())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub content: String,
}

fn sanitize_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    for component in p.components() {
        if matches!(component, std::path::Component::ParentDir) {
            return Err("Path traversal detected".into());
        }
    }
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    Ok(p)
}

#[tauri::command]
pub fn get_file_tree(path: String, depth: usize) -> Result<Vec<FileNode>, String> {
    let root = sanitize_path(&path)?;
    build_tree(&root, depth, 0)
}

fn build_tree(
    path: &PathBuf,
    max_depth: usize,
    current_depth: usize,
) -> Result<Vec<FileNode>, String> {
    let mut entries: Vec<FileNode> = Vec::new();
    let read_dir = std::fs::read_dir(path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common ignore patterns
        if file_name.starts_with('.')
            || file_name == "node_modules"
            || file_name == "target"
            || file_name == "__pycache__"
            || file_name == ".git"
        {
            continue;
        }

        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();

        let children = if is_dir && current_depth < max_depth {
            Some(build_tree(&entry.path(), max_depth, current_depth + 1)?)
        } else {
            None
        };

        entries.push(FileNode {
            name: file_name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            children,
            size: if is_dir { None } else { Some(metadata.len()) },
        });
    }

    entries.sort_by(|a, b| {
        // Directories first, then alphabetically
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name))
    });

    Ok(entries)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    let _ = sanitize_path(&path)?;
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let _ = sanitize_path(&path)?;
    std::fs::write(&path, content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    sanitize_path(&path).is_ok() && std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn search_files(pattern: String, path: String) -> Result<Vec<SearchResult>, String> {
    let root = sanitize_path(&path)?;

    let mut results = Vec::new();
    search_recursive(&root, &pattern, &mut results, 0, 50)?;
    Ok(results)
}

fn search_recursive(
    dir: &PathBuf,
    pattern: &str,
    results: &mut Vec<SearchResult>,
    depth: usize,
    max_results: usize,
) -> Result<(), String> {
    if results.len() >= max_results || depth > 10 {
        return Ok(());
    }

    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name.starts_with('.')
            || file_name == "node_modules"
            || file_name == "target"
            || file_name == ".git"
        {
            continue;
        }

        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            search_recursive(&path, pattern, results, depth + 1, max_results)?;
        } else if file_name.to_lowercase().contains(&pattern.to_lowercase()) {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                results.push(SearchResult {
                    file: path.to_string_lossy().to_string(),
                    line: 0,
                    column: 0,
                    content: name.to_string(),
                });
            }
        }
    }

    Ok(())
}
