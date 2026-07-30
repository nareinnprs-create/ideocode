// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use std::sync::Arc;

use anyhow::Result;
use async_trait::async_trait;

use crate::message::{Message, ToolDefinition};
use crate::provider::{EventStream, Provider};

pub struct LocalProvider;

#[async_trait]
impl Provider for LocalProvider {
    async fn complete(
        &self,
        _messages: &[Message],
        _tools: &[ToolDefinition],
        _system: &str,
        _resume_session_id: Option<&str>,
    ) -> Result<EventStream> {
        Err(anyhow::anyhow!(
            "No AI provider configured. Use --provider to select an AI provider, or use `ideocode tool run` directly."
        ))
    }

    fn name(&self) -> &str {
        "local"
    }

    fn fork(&self) -> Arc<dyn Provider> {
        Arc::new(LocalProvider)
    }
}
