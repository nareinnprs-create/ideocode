// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: String,
    pub content: String,
    pub tags: Vec<String>,
    pub category: String,
    pub created_at: u64,
    pub updated_at: u64,
}

fn memories_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("memories"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/memories"))
}

fn new_id() -> String {
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", t)
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load_entries() -> Vec<MemoryEntry> {
    let dir = memories_dir();
    if !dir.exists() {
        return Vec::new();
    }
    let mut entries = Vec::new();
    if let Ok(read) = std::fs::read_dir(&dir) {
        for entry in read.flatten() {
            if entry
                .path()
                .extension()
                .map(|e| e == "json")
                .unwrap_or(false)
            {
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    if let Ok(parsed) = serde_json::from_str::<MemoryEntry>(&content) {
                        entries.push(parsed);
                    }
                }
            }
        }
    }
    entries.sort_by_key(|e| std::cmp::Reverse(e.created_at));
    entries
}

fn save_entry(entry: &MemoryEntry) -> Result<(), String> {
    let dir = memories_dir();
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create memories dir: {}", e))?;
    let path = dir.join(format!("{}.json", entry.id));
    let json = serde_json::to_string_pretty(entry)
        .map_err(|e| format!("Failed to serialize memory: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write memory: {}", e))
}

#[tauri::command]
pub fn list_memories() -> Vec<MemoryEntry> {
    load_entries()
}

#[tauri::command]
pub fn store_memory(content: String, tags: Vec<String>, category: String) -> Result<MemoryEntry, String> {
    let entry = MemoryEntry {
        id: new_id(),
        content,
        tags,
        category,
        created_at: now_secs(),
        updated_at: now_secs(),
    };
    save_entry(&entry)?;
    Ok(entry)
}

#[tauri::command]
pub fn search_memories(query: String) -> Vec<MemoryEntry> {
    let entries = load_entries();
    let q = query.to_lowercase();
    entries
        .into_iter()
        .filter(|e| {
            e.content.to_lowercase().contains(&q)
                || e.tags.iter().any(|t| t.to_lowercase().contains(&q))
                || e.category.to_lowercase().contains(&q)
        })
        .collect()
}

#[tauri::command]
pub fn delete_memory(id: String) -> Result<(), String> {
    let safe_id = super::sanitize_id(&id);
    if safe_id != id || safe_id.is_empty() {
        return Err("Invalid memory id".into());
    }
    let path = memories_dir().join(format!("{}.json", safe_id));
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to delete memory: {}", e))
    } else {
        Err("Memory not found".into())
    }
}
