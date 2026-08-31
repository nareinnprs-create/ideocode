// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language: String,
    pub code: String,
    pub tags: Vec<String>,
    pub created_at: u64,
}

fn snippets_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("snippets.json"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/snippets.json"))
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load() -> Vec<SnippetEntry> {
    let path = snippets_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(items) = serde_json::from_str::<Vec<SnippetEntry>>(&content) {
                return items;
            }
        }
    }
    Vec::new()
}

fn save(items: &[SnippetEntry]) -> Result<(), String> {
    let path = snippets_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create snippets dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(items)
        .map_err(|e| format!("Failed to serialize snippets: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write snippets: {}", e))
}

#[tauri::command]
pub fn list_snippets() -> Vec<SnippetEntry> {
    load()
}

#[tauri::command]
pub fn save_snippet(snippet: SnippetEntry) -> Result<(), String> {
    let mut items = load();
    let id = if snippet.id.is_empty() {
        format!("snip-{}-{:x}", now_secs(), SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos())
    } else {
        snippet.id.clone()
    };
    let entry = SnippetEntry {
        id,
        name: snippet.name,
        description: snippet.description,
        language: snippet.language,
        code: snippet.code,
        tags: snippet.tags,
        created_at: snippet.created_at.max(now_secs()),
    };
    // Upsert by id.
    if let Some(existing) = items.iter_mut().find(|i| i.id == entry.id) {
        *existing = entry;
    } else {
        items.push(entry);
    }
    items.sort_by_key(|i| std::cmp::Reverse(i.created_at));
    save(&items)
}

#[tauri::command]
pub fn delete_snippet(id: String) -> Result<(), String> {
    let before = load().len();
    let items: Vec<SnippetEntry> = load()
        .into_iter()
        .filter(|i| i.id != id)
        .collect();
    save(&items)?;
    if items.len() == before {
        return Err("Snippet not found".into());
    }
    Ok(())
}
