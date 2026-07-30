// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserTab {
    pub url: String,
    pub title: String,
    pub last_active: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    pub active_tab: Option<BrowserTab>,
    pub recent_tabs: Vec<BrowserTab>,
    pub updated_at: u64,
}

fn browser_context_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("browser-context.json"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/browser-context.json"))
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load_context() -> BrowserContext {
    let path = browser_context_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(ctx) = serde_json::from_str::<BrowserContext>(&content) {
                return ctx;
            }
        }
    }
    BrowserContext {
        active_tab: None,
        recent_tabs: Vec::new(),
        updated_at: now_secs(),
    }
}

fn save_context(ctx: &BrowserContext) {
    let path = browser_context_path();
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(ctx) {
        let _ = std::fs::write(&path, json);
    }
}

#[tauri::command]
pub fn get_browser_context() -> BrowserContext {
    load_context()
}

#[tauri::command]
pub fn set_browser_tab(url: String, title: String) -> BrowserContext {
    let mut ctx = load_context();
    let now = now_secs();
    let tab = BrowserTab {
        url: url.clone(),
        title,
        last_active: now,
    };

    // Remove existing entry for this URL
    ctx.recent_tabs.retain(|t| t.url != url);

    ctx.active_tab = Some(tab.clone());
    ctx.recent_tabs.insert(0, tab);
    // Keep max 20 recent tabs
    ctx.recent_tabs.truncate(20);
    ctx.updated_at = now;

    save_context(&ctx);
    ctx
}

#[tauri::command]
pub fn clear_browser_context() {
    let ctx = BrowserContext {
        active_tab: None,
        recent_tabs: Vec::new(),
        updated_at: now_secs(),
    };
    save_context(&ctx);
}

#[tauri::command]
pub fn get_browser_context_text() -> String {
    let ctx = load_context();
    let mut parts = Vec::new();

    if let Some(ref tab) = ctx.active_tab {
        parts.push(format!("Currently viewing: {} ({})", tab.title, tab.url));
    }

    if !ctx.recent_tabs.is_empty() {
        parts.push(String::from("\nRecent tabs:"));
        for tab in &ctx.recent_tabs {
            parts.push(format!("  - {} ({})", tab.title, tab.url));
        }
    }

    if parts.is_empty() {
        String::from("No browser context available.")
    } else {
        parts.join("\n")
    }
}
