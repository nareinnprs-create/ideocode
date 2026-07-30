// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSearchResult {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub content: String,
    pub match_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexProgress {
    pub files_indexed: usize,
    pub total_files: usize,
    pub current_file: String,
}

#[tauri::command]
pub fn search_contents(path: String, query: String) -> Result<Vec<CodeSearchResult>, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    let mut results = Vec::new();
    search_recursive(&root, &query, &mut results, 0, 100)?;
    Ok(results)
}

fn search_recursive(
    dir: &PathBuf,
    query: &str,
    results: &mut Vec<CodeSearchResult>,
    depth: usize,
    max_results: usize,
) -> Result<(), String> {
    if results.len() >= max_results || depth > 15 {
        return Ok(());
    }
    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    let q_lower = query.to_lowercase();

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name.starts_with('.')
            || file_name == "node_modules"
            || file_name == "target"
            || file_name == "__pycache__"
            || file_name == ".git"
            || file_name == "dist"
            || file_name == "build"
        {
            continue;
        }

        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            search_recursive(&path, query, results, depth + 1, max_results)?;
        } else if metadata.len() < 500_000 {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for (line_num, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&q_lower) {
                        results.push(CodeSearchResult {
                            file: path.to_string_lossy().to_string(),
                            line: (line_num + 1) as u32,
                            column: 0,
                            content: line.to_string(),
                            match_type: "content".into(),
                        });
                        if results.len() >= max_results {
                            return Ok(());
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub fn index_directory(path: String) -> Result<IndexProgress, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let mut total = 0usize;
    let mut indexed = 0usize;
    let mut current = String::new();

    if let Ok(entries) = count_files(&root, 0, 5000) {
        total = entries;
    }

    if let Ok(mut walk) = walk_dir(&root, 0, 5000) {
        walk.sort();
        for file in &walk {
            current = file.to_string_lossy().to_string();
            if let Ok(content) = std::fs::read_to_string(file) {
                let rel = file
                    .strip_prefix(&root)
                    .unwrap_or(file)
                    .to_string_lossy()
                    .to_string();
                let idx_entry = serde_json::json!({
                    "path": rel,
                    "size": content.len(),
                    "lines": content.lines().count(),
                    "indexed_at": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                });
                let idx_dir = dirs::home_dir()
                    .map(|h| h.join(".IDEOCODE").join("rag-index"))
                    .unwrap_or_else(|| PathBuf::from(".IDEOCODE/rag-index"));
                let _ = std::fs::create_dir_all(&idx_dir);
                let safe_name = rel.replace('/', "__").replace('\\', "__");
                let idx_path = idx_dir.join(format!("{}.json", &safe_name));
                if let Ok(json) = serde_json::to_string_pretty(&idx_entry) {
                    let _ = std::fs::write(&idx_path, json);
                }
                indexed += 1;
            }
        }
    }

    Ok(IndexProgress {
        files_indexed: indexed,
        total_files: total,
        current_file: current,
    })
}

fn count_files(dir: &PathBuf, depth: usize, max: usize) -> Result<usize, String> {
    if depth > 10 {
        return Ok(0);
    }
    let mut count = 0usize;
    if let Ok(read) = std::fs::read_dir(dir) {
        for entry in read.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
                continue;
            }
            let meta = entry.metadata().ok();
            if meta.as_ref().map(|m| m.is_dir()).unwrap_or(false) {
                count += count_files(&entry.path(), depth + 1, max - count)?;
            } else if meta.map(|m| m.len() < 500_000).unwrap_or(false) {
                count += 1;
            }
            if count >= max {
                break;
            }
        }
    }
    Ok(count)
}

fn walk_dir(dir: &PathBuf, depth: usize, max: usize) -> Result<Vec<PathBuf>, String> {
    if depth > 10 {
        return Ok(Vec::new());
    }
    let mut files = Vec::new();
    if let Ok(read) = std::fs::read_dir(dir) {
        for entry in read.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git" {
                continue;
            }
            let meta = entry.metadata().ok();
            if meta.as_ref().map(|m| m.is_dir()).unwrap_or(false) {
                files.extend(walk_dir(&entry.path(), depth + 1, max - files.len())?);
            } else if meta.map(|m| m.len() < 500_000).unwrap_or(false) {
                files.push(entry.path());
            }
            if files.len() >= max {
                break;
            }
        }
    }
    Ok(files)
}
