// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub font_size: u32,
    pub font_family: String,
    pub active_provider: String,
    pub active_model: String,
    pub tab_size: u32,
    pub word_wrap: bool,
    pub minimap: bool,
    pub auto_save: bool,
    pub language: String,
    #[serde(default)]
    pub mode: String,
    #[serde(default = "default_accent")]
    pub accent_color: String,
    #[serde(default)]
    pub ui_font_size: u32,
    #[serde(default = "default_reasoning_effort")]
    pub reasoning_effort: String,
    #[serde(default)]
    pub dev_mode: bool,
    #[serde(default)]
    pub custom_instructions: String,
    #[serde(default)]
    pub api_keys: HashMap<String, String>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, String>,
}

fn default_accent() -> String {
    "#7C3AED".to_string()
}

fn default_reasoning_effort() -> String {
    "medium".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "midnight".into(),
            font_size: 13,
            font_family: "JetBrains Mono".into(),
            active_provider: "baanzon-verso".into(),
            active_model: "auto".into(),
            tab_size: 2,
            word_wrap: false,
            minimap: false,
            auto_save: true,
            language: "en".into(),
            mode: "normal".into(),
            accent_color: default_accent(),
            ui_font_size: 13,
            reasoning_effort: default_reasoning_effort(),
            dev_mode: false,
            custom_instructions: String::new(),
            api_keys: HashMap::new(),
            mcp_servers: HashMap::new(),
        }
    }
}

fn settings_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("settings.json"))
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

#[tauri::command]
pub fn update_settings(settings: AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn is_first_launch() -> bool {
    let path = settings_path();
    let sessions_dir = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("sessions"))
        .unwrap_or_default();
    // First launch if neither settings nor any session files exist
    if path.exists() {
        return false;
    }
    if sessions_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&sessions_dir) {
            if entries.filter_map(|e| e.ok()).any(|e| {
                e.path()
                    .extension()
                    .map(|ext| ext == "json")
                    .unwrap_or(false)
            }) {
                return false;
            }
        }
    }
    true
}
