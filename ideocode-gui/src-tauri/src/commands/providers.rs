// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub models: Vec<Model>,
    pub api_key_env: String,
    pub is_configured: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub max_tokens: u32,
    pub supports_vision: bool,
    pub supports_tools: bool,
    pub cost_per_1k_input: Option<f64>,
    pub cost_per_1k_output: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub active_provider: String,
    pub active_model: String,
    pub api_key_configured: bool,
}

#[tauri::command]
pub fn list_providers() -> Vec<Provider> {
    vec![
        Provider {
            id: "baanzon-verso".into(),
            name: "Baanzon Verso".into(),
            api_key_env: "OMNIROUTE_API_KEY".into(),
            is_configured: true,
            models: vec![Model {
                id: "auto".into(),
                name: "Baanzon Verso (auto)".into(),
                max_tokens: 128000,
                supports_vision: true,
                supports_tools: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            }],
        },
        Provider {
            id: "openai".into(),
            name: "OpenAI".into(),
            api_key_env: "OPENAI_API_KEY".into(),
            is_configured: std::env::var("OPENAI_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
            models: vec![
                Model {
                    id: "gpt-4o".into(),
                    name: "GPT-4o".into(),
                    max_tokens: 128000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.0025),
                    cost_per_1k_output: Some(0.01),
                },
                Model {
                    id: "gpt-4o-mini".into(),
                    name: "GPT-4o Mini".into(),
                    max_tokens: 128000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.00015),
                    cost_per_1k_output: Some(0.0006),
                },
                Model {
                    id: "o1".into(),
                    name: "o1".into(),
                    max_tokens: 200000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.015),
                    cost_per_1k_output: Some(0.06),
                },
            ],
        },
        Provider {
            id: "anthropic".into(),
            name: "Anthropic".into(),
            api_key_env: "ANTHROPIC_API_KEY".into(),
            is_configured: std::env::var("ANTHROPIC_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
            models: vec![
                Model {
                    id: "claude-sonnet-4-20250514".into(),
                    name: "Claude Sonnet 4".into(),
                    max_tokens: 200000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.003),
                    cost_per_1k_output: Some(0.015),
                },
                Model {
                    id: "claude-3-5-haiku-20241022".into(),
                    name: "Claude 3.5 Haiku".into(),
                    max_tokens: 200000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.001),
                    cost_per_1k_output: Some(0.005),
                },
            ],
        },
        Provider {
            id: "gemini".into(),
            name: "Google Gemini".into(),
            api_key_env: "GOOGLE_API_KEY".into(),
            is_configured: std::env::var("GOOGLE_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
            models: vec![
                Model {
                    id: "gemini-2.5-pro".into(),
                    name: "Gemini 2.5 Pro".into(),
                    max_tokens: 1000000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.00125),
                    cost_per_1k_output: Some(0.01),
                },
                Model {
                    id: "gemini-2.5-flash".into(),
                    name: "Gemini 2.5 Flash".into(),
                    max_tokens: 1000000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: Some(0.000075),
                    cost_per_1k_output: Some(0.0003),
                },
            ],
        },
        Provider {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            api_key_env: "OPENROUTER_API_KEY".into(),
            is_configured: std::env::var("OPENROUTER_API_KEY").map(|k| !k.is_empty()).unwrap_or(false),
            models: vec![
                Model {
                    id: "anthropic/claude-sonnet-4".into(),
                    name: "Claude Sonnet 4 (via OpenRouter)".into(),
                    max_tokens: 200000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: None,
                    cost_per_1k_output: None,
                },
                Model {
                    id: "meta-llama/llama-4-maverick".into(),
                    name: "Llama 4 Maverick".into(),
                    max_tokens: 1000000,
                    supports_vision: true,
                    supports_tools: true,
                    cost_per_1k_input: None,
                    cost_per_1k_output: None,
                },
            ],
        },
    ]
}

#[tauri::command]
pub fn get_provider_status() -> ProviderStatus {
    let active_provider = std::env::var("IDEOCODE_PROVIDER")
        .unwrap_or_else(|_| "baanzon-verso".into());
    let active_provider = if active_provider == "omniroute" {
        "baanzon-verso".into()
    } else {
        active_provider
    };
    let api_key_configured = active_provider == "baanzon-verso"
        || std::env::var("OPENAI_API_KEY").map(|k| !k.is_empty()).unwrap_or(false)
        || std::env::var("ANTHROPIC_API_KEY").map(|k| !k.is_empty()).unwrap_or(false);
    ProviderStatus {
        active_provider,
        active_model: std::env::var("IDEOCODE_MODEL")
            .unwrap_or_else(|_| "auto".into()),
        api_key_configured,
    }
}
