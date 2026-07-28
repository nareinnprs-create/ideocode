//! Small persisted UI preferences that survive restarts and session resumes.
//!
//! These are deliberately separate from the main config file: they capture
//! in-app toggles (like hiding inline images) that the user flips at runtime
//! and expects to stick, without editing `config.toml`.

use serde::{Deserialize, Serialize};

const UI_PREFS_FILE: &str = "ui_preferences.json";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub(crate) struct UiPreferences {
    #[serde(default)]
    pub version: u8,
    /// Whether inline transcript images render expanded. `None` means the
    /// user never toggled it; default to visible.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inline_images_visible: Option<bool>,
    /// Last active sidebar panel name (e.g. "Git", "Build", "FileExplorer").
    /// `None` means sidebar was never opened; default to FileExplorer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sidebar_panel: Option<String>,
    /// Whether compact mode was active when the session ended.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub compact_mode: Option<bool>,
    /// Whether big mode was active when the session ended.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub big_mode: Option<bool>,
}

fn prefs_path() -> Option<std::path::PathBuf> {
    crate::storage::app_config_dir()
        .ok()
        .map(|dir| dir.join(UI_PREFS_FILE))
}

pub(crate) fn load() -> UiPreferences {
    let Some(path) = prefs_path() else {
        return UiPreferences::default();
    };
    crate::storage::read_json::<UiPreferences>(&path).unwrap_or_default()
}

/// Persisted inline-image visibility, defaulting to visible.
pub(crate) fn inline_images_visible() -> bool {
    load().inline_images_visible.unwrap_or(true)
}

/// Persist the inline-image visibility toggle (load-modify-write so future
/// preference fields survive).
pub(crate) fn save_inline_images_visible(visible: bool) {
    let Some(path) = prefs_path() else {
        return;
    };
    let mut prefs = load();
    prefs.inline_images_visible = Some(visible);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Err(error) = crate::storage::write_json(&path, &prefs) {
        crate::logging::info(&format!(
            "Failed to persist UI preferences {}: {}",
            path.display(),
            error
        ));
    }
}

/// Last active sidebar panel name, defaulting to "FileExplorer".
pub(crate) fn sidebar_panel() -> String {
    load().sidebar_panel.unwrap_or_else(|| "FileExplorer".to_string())
}

/// Persist the sidebar panel preference.
pub(crate) fn save_sidebar_panel(panel: &str) {
    let Some(path) = prefs_path() else { return; };
    let mut prefs = load();
    prefs.sidebar_panel = Some(panel.to_string());
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = crate::storage::write_json(&path, &prefs);
}

/// Persisted compact mode state, defaulting to off.
pub(crate) fn compact_mode() -> bool {
    load().compact_mode.unwrap_or(false)
}

/// Persist the compact mode toggle.
pub(crate) fn save_compact_mode(enabled: bool) {
    let Some(path) = prefs_path() else { return; };
    let mut prefs = load();
    prefs.compact_mode = Some(enabled);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = crate::storage::write_json(&path, &prefs);
}

/// Persisted big mode state, defaulting to off.
pub(crate) fn big_mode() -> bool {
    load().big_mode.unwrap_or(false)
}

/// Persist the big mode toggle.
pub(crate) fn save_big_mode(enabled: bool) {
    let Some(path) = prefs_path() else { return; };
    let mut prefs = load();
    prefs.big_mode = Some(enabled);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = crate::storage::write_json(&path, &prefs);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inline_images_visibility_round_trips_through_disk() {
        let _guard = crate::storage::lock_test_env();
        let temp = tempfile::tempdir().expect("tempdir");
        let prev_home = std::env::var_os("IDEOCODE_HOME");
        crate::env::set_var("IDEOCODE_HOME", temp.path());

        // Default before any toggle: visible.
        assert!(inline_images_visible());

        save_inline_images_visible(false);
        assert!(!inline_images_visible(), "hidden state should persist");

        save_inline_images_visible(true);
        assert!(inline_images_visible(), "visible state should persist");

        if let Some(prev_home) = prev_home {
            crate::env::set_var("IDEOCODE_HOME", prev_home);
        } else {
            crate::env::remove_var("IDEOCODE_HOME");
        }
    }

    #[test]
    fn save_preserves_unknown_future_fields_via_load_modify_write() {
        let _guard = crate::storage::lock_test_env();
        let temp = tempfile::tempdir().expect("tempdir");
        let prev_home = std::env::var_os("IDEOCODE_HOME");
        crate::env::set_var("IDEOCODE_HOME", temp.path());

        save_inline_images_visible(false);
        let prefs = load();
        assert_eq!(prefs.inline_images_visible, Some(false));

        if let Some(prev_home) = prev_home {
            crate::env::set_var("IDEOCODE_HOME", prev_home);
        } else {
            crate::env::remove_var("IDEOCODE_HOME");
        }
    }
}
