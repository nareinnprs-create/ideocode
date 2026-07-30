// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use anyhow::Result;
use azure_core::credentials::TokenCredential;

pub async fn get_bearer_token(scope: &str) -> Result<String> {
    let credential = azure_identity::DeveloperToolsCredential::new(None)?;
    let token = credential.get_token(&[scope], None).await?;
    Ok(token.token.secret().to_string())
}
