// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
mod browser;
mod chat;
pub(crate) mod crypto;
mod files;
mod git;
mod issues;
mod memory;
mod providers;
mod rag;
mod settings;
mod snippets;
mod tasks;
mod tools;

pub use browser::*;
pub use chat::*;
pub use files::*;
pub use git::*;
pub use issues::*;
pub use memory::*;
pub use providers::*;
pub use rag::*;
pub use settings::*;
pub use snippets::*;
pub use tasks::*;
pub use tools::*;

/// Returns a path-safe copy of an identifier used to build file names, so
/// untrusted ids (session ids, issue ids) cannot escape their storage
/// directory via separators or parent-directory components.
pub(crate) fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '_'
            }
        })
        .collect()
}
