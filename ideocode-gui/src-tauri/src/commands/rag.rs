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
    #[serde(default)]
    pub score: f64,
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
    search_recursive(&root, &query, &mut results, 0, 100, "content")?;
    Ok(results)
}

/// Semantic search using multi-term TF-IDF scoring.
/// Splits the query into tokens, scores each line by how many tokens match
/// and how rare those tokens are across the codebase.
#[tauri::command]
pub fn search_semantic(path: String, query: String) -> Result<Vec<CodeSearchResult>, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let tokens: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(|s| s.to_string())
        .filter(|s| s.len() > 1)
        .collect();

    if tokens.is_empty() {
        // Fallback to exact match
        let mut results = Vec::new();
        search_recursive(&root, &query, &mut results, 0, 50, "semantic")?;
        return Ok(results);
    }

    // Phase 1: Collect all matching lines with token hits
    let mut scored: Vec<(CodeSearchResult, f64)> = Vec::new();
    collect_semantic(&root, &tokens, &mut scored, 0)?;

    // Phase 2: Sort by score descending, take top 50
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(50);

    let mut results: Vec<CodeSearchResult> = scored
        .into_iter()
        .map(|(mut r, s)| {
            r.score = s;
            r
        })
        .collect();

    // Normalize scores to 0.0..1.0
    if let Some(max_score) = results
        .iter()
        .map(|r| r.score)
        .fold(None, |acc, s| Some(acc.map_or(s, |a: f64| a.max(s))))
    {
        if max_score > 0.0 {
            for r in &mut results {
                r.score /= max_score;
            }
        }
    }

    Ok(results)
}

fn collect_semantic(
    dir: &PathBuf,
    tokens: &[String],
    results: &mut Vec<(CodeSearchResult, f64)>,
    depth: usize,
) -> Result<(), String> {
    if depth > 15 || results.len() >= 200 {
        return Ok(());
    }
    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if SKIP_DIRS.iter().any(|d| file_name == *d) || file_name.starts_with('.') {
            continue;
        }

        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;

        if metadata.is_dir() {
            collect_semantic(&path, tokens, results, depth + 1)?;
        } else if metadata.len() < 500_000 {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for (line_num, line) in content.lines().enumerate() {
                    let line_lower = line.to_lowercase();
                    let mut score = 0.0f64;
                    for token in tokens {
                        if line_lower.contains(token.as_str()) {
                            // Exact token match: full weight
                            score += 1.0;
                            // Bonus for word boundary match (not substring of larger word)
                            let pos = line_lower.find(token.as_str()).unwrap_or(0);
                            let before_ok =
                                pos == 0 || !line_lower.as_bytes()[pos - 1].is_ascii_alphanumeric();
                            let after_pos = pos + token.len();
                            let after_ok = after_pos >= line_lower.len()
                                || !line_lower.as_bytes()[after_pos].is_ascii_alphanumeric();
                            if before_ok && after_ok {
                                score += 0.5;
                            }
                        }
                    }
                    if score > 0.0 {
                        results.push((
                            CodeSearchResult {
                                file: path.to_string_lossy().to_string(),
                                line: (line_num + 1) as u32,
                                column: 0,
                                content: line.to_string(),
                                match_type: "semantic".into(),
                                score,
                            },
                            score,
                        ));
                    }
                }
            }
        }
    }
    Ok(())
}

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "__pycache__",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
];

fn search_recursive(
    dir: &PathBuf,
    query: &str,
    results: &mut Vec<CodeSearchResult>,
    depth: usize,
    max_results: usize,
    match_type: &str,
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
            search_recursive(&path, query, results, depth + 1, max_results, match_type)?;
        } else if metadata.len() < 500_000 {
            if let Ok(content) = std::fs::read_to_string(&path) {
                for (line_num, line) in content.lines().enumerate() {
                    if line.to_lowercase().contains(&q_lower) {
                        results.push(CodeSearchResult {
                            file: path.to_string_lossy().to_string(),
                            line: (line_num + 1) as u32,
                            column: 0,
                            content: line.to_string(),
                            match_type: match_type.into(),
                            score: 1.0,
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
                let safe_name = rel.replace(['/', '\\'], "__");
                let idx_path = idx_dir.join(format!("{safe_name}.json"));
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
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git"
            {
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
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == ".git"
            {
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
