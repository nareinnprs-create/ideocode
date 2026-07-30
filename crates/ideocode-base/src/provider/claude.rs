// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Deprecated Claude CLI provider (compatibility shim).
//!
//! The Claude CLI provider *runtime* (`ClaudeProvider`, subprocess transport)
//! now lives in the downstream `IDEOCODE-provider-claude-cli-runtime` crate so
//! provider edits do not rebuild the base -> app-core -> tui spine. The
//! binary's composition root registers it via [`crate::provider::external`].
//! Nothing else remains here: the Claude CLI path is deprecated and only kept
//! for `IDEOCODE_USE_CLAUDE_CLI=1`.
