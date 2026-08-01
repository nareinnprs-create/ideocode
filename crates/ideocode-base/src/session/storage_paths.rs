// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::Result;
use std::path::{Path, PathBuf};

use super::PersistVectorMode;
use crate::storage;

/// Replaces every character that is not a safe session-id character with `_`
/// so untrusted session ids cannot escape the sessions directory via path
/// separators or parent-directory components.
pub(crate) fn sanitize_session_id(session_id: &str) -> String {
    session_id
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

pub(crate) fn session_path_in_dir(base: &std::path::Path, session_id: &str) -> PathBuf {
    base.join("sessions")
        .join(format!("{}.json", sanitize_session_id(session_id)))
}

pub(super) use crate::process_memory::estimate_json_bytes;

pub(super) fn file_len_or_zero(path: &Path) -> u64 {
    std::fs::metadata(path).map(|meta| meta.len()).unwrap_or(0)
}

pub(super) fn persist_vector_mode_label(mode: PersistVectorMode) -> &'static str {
    match mode {
        PersistVectorMode::Clean => "clean",
        PersistVectorMode::Append => "append",
        PersistVectorMode::Full => "full",
    }
}

pub fn session_path(session_id: &str) -> Result<PathBuf> {
    let base = storage::ideocode_dir()?;
    Ok(session_path_in_dir(&base, session_id))
}

pub fn session_journal_path_from_snapshot(path: &Path) -> PathBuf {
    let mut name = path
        .file_stem()
        .map(|stem| stem.to_os_string())
        .unwrap_or_default();
    name.push(".journal.jsonl");
    path.with_file_name(name)
}

pub fn session_journal_path(session_id: &str) -> Result<PathBuf> {
    Ok(session_journal_path_from_snapshot(&session_path(
        session_id,
    )?))
}

pub fn session_exists(session_id: &str) -> bool {
    session_path(session_id)
        .map(|path| path.exists())
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_path_sanitizes_unsafe_ids() {
        let base = std::path::Path::new("/base");
        assert_eq!(
            session_path_in_dir(base, "abc-123_9"),
            PathBuf::from("/base/sessions/abc-123_9.json")
        );
        assert_eq!(
            session_path_in_dir(base, "../../../etc/passwd"),
            PathBuf::from("/base/sessions/___..___etc_passwd.json")
        );
        assert_eq!(
            session_path_in_dir(base, "a/b\\c"),
            PathBuf::from("/base/sessions/a_b_c.json")
        );
        assert_eq!(
            session_path_in_dir(base, ""),
            PathBuf::from("/base/sessions/.json")
        );
    }
}
