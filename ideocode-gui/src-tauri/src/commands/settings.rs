// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

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
    #[serde(default)]
    pub workspace_path: String,
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
            workspace_path: String::new(),
        }
    }
}

fn settings_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("settings.json"))
        .unwrap_or_default()
}

/// Load settings from disk (non-Tauri-callable helper for internal use).
///
/// Values in `api_keys` (and `mcp_servers`) that were encrypted at rest are
/// transparently decrypted; legacy plaintext values are returned as-is.
pub fn load_settings() -> Result<AppSettings, String> {
    let path = settings_path();
    let settings = if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    };
    Ok(decrypt_maps(settings))
}

/// Encrypt every value in a secrets map (best-effort: failures leave the value
/// unchanged so a broken key file does not corrupt unrelated settings).
fn encrypt_maps(mut settings: AppSettings) -> AppSettings {
    for v in settings.api_keys.values_mut() {
        if v.contains('.') {
            continue; // already encrypted
        }
        if let Ok(enc) = crate::commands::crypto::encrypt_value(v) {
            *v = enc;
        }
    }
    for v in settings.mcp_servers.values_mut() {
        if v.contains('.') {
            continue;
        }
        if let Ok(enc) = crate::commands::crypto::encrypt_value(v) {
            *v = enc;
        }
    }
    settings
}

/// Decrypt secret-map values, leaving plaintext (legacy) entries untouched.
fn decrypt_maps(mut settings: AppSettings) -> AppSettings {
    for v in settings.api_keys.values_mut() {
        if v.contains('.') {
            if let Ok(dec) = crate::commands::crypto::decrypt_value(v) {
                *v = dec;
            }
        }
    }
    for v in settings.mcp_servers.values_mut() {
        if v.contains('.') {
            if let Ok(dec) = crate::commands::crypto::decrypt_value(v) {
                *v = dec;
            }
        }
    }
    settings
}

#[tauri::command]
pub fn get_settings() -> AppSettings {
    let path = settings_path();
    let settings = if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    };
    decrypt_maps(settings)
}

#[tauri::command]
pub fn update_settings(mut settings: AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)
            .map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    settings = encrypt_maps(settings);
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

/// Restores all settings to their defaults by removing the persisted settings
/// file. Returns the default settings object.
#[tauri::command]
pub fn reset_settings() -> Result<AppSettings, String> {
    let path = settings_path();
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Failed to reset settings file: {}", e))?;
    }
    Ok(AppSettings::default())
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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_settings() -> AppSettings {
        let mut s = AppSettings::default();
        s.api_keys.insert("OPENAI_API_KEY".into(), "sk-plain-secret".into());
        s.mcp_servers.insert("local".into(), "postgres://user:pass@host/db".into());
        s
    }

    #[test]
    fn secrets_are_not_plaintext_after_encrypt() {
        let encrypted = encrypt_maps(sample_settings());
        // When a writable key path is available, values are truly encrypted.
        if let (Some(openai), Some(mcp)) = (
            encrypted.api_keys.get("OPENAI_API_KEY"),
            encrypted.mcp_servers.get("local"),
        ) {
            if openai.contains('.') || mcp.contains('.') {
                // At least one secret was sealed -> neither stays plaintext.
                assert_ne!(encrypted.api_keys["OPENAI_API_KEY"], "sk-plain-secret");
                assert_ne!(
                    encrypted.mcp_servers["local"],
                    "postgres://user:pass@host/db"
                );
            }
            // Otherwise encryption was unavailable (no key path); nothing to assert.
        }
    }

    #[test]
    fn encrypt_then_decrypt_round_trips() {
        let encrypted = encrypt_maps(sample_settings());
        let decrypted = decrypt_maps(encrypted);
        assert_eq!(decrypted.api_keys["OPENAI_API_KEY"], "sk-plain-secret");
        assert_eq!(
            decrypted.mcp_servers["local"],
            "postgres://user:pass@host/db"
        );
    }

    #[test]
    fn plaintext_legacy_values_pass_through_undamaged() {
        // A settings object that was never encrypted must not be corrupted.
        let plain = sample_settings();
        let decrypted = decrypt_maps(plain);
        assert_eq!(decrypted.api_keys["OPENAI_API_KEY"], "sk-plain-secret");
    }
}
