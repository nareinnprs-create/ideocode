//! Tool Call Expand/Collapse
//!
//! Tracks which tool calls are collapsed in the chat viewport.
//! Users can toggle collapse with Enter/Space on a tool call line.

use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};

static COLLAPSED_TOOLS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

fn collapsed() -> std::sync::MutexGuard<'static, HashSet<String>> {
    COLLAPSED_TOOLS
        .get_or_init(|| Mutex::new(HashSet::new()))
        .lock()
        .unwrap_or_else(|p| p.into_inner())
}

/// Check if a tool call is collapsed.
pub fn is_collapsed(tool_id: &str) -> bool {
    collapsed().contains(tool_id)
}

/// Toggle collapse state for a tool call.
pub fn toggle_collapse(tool_id: &str) {
    let mut set = collapsed();
    if set.contains(tool_id) {
        set.remove(tool_id);
    } else {
        set.insert(tool_id.to_string());
    }
}

/// Collapse all tool calls.
pub fn collapse_all() {
    collapsed().clear();
}

/// Expand all tool calls.
pub fn expand_all() {
    collapsed().clear();
}

/// Count collapsed tools.
pub fn collapsed_count() -> usize {
    collapsed().len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn toggle_collapse_works() {
        let id = "test-tool-1";
        assert!(!is_collapsed(id));
        toggle_collapse(id);
        assert!(is_collapsed(id));
        toggle_collapse(id);
        assert!(!is_collapsed(id));
    }
}
