// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
mod chat;
mod files;
mod git;
mod providers;
mod settings;
mod tools;
mod memory;
mod rag;
mod issues;
mod browser;

pub use chat::*;
pub use files::*;
pub use git::*;
pub use providers::*;
pub use settings::*;
pub use tools::*;
pub use memory::*;
pub use rag::*;
pub use issues::*;
pub use browser::*;

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
