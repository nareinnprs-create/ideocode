//! OpenAI-compatible client for the local Baanzon Verso engine.

use anyhow::Result;
use reqwest::Client;
use serde_json::Value;

use crate::daemon::OMNIROUTE_PORT;

pub struct BaanzonClient {
    http_client: Client,
    base_url: String,
}

impl BaanzonClient {
    pub fn new() -> Self {
        Self::new_on_port(OMNIROUTE_PORT)
    }

    pub fn new_on_port(port: u16) -> Self {
        Self {
            http_client: Client::new(),
            base_url: format!("http://127.0.0.1:{port}"),
        }
    }

    /// Sends a prompt to the local daemon. Any returned errors are re-branded
    /// as "Baanzon Verso" so the underlying engine name never leaks to users.
    pub async fn chat(&self, prompt: &str) -> Result<String> {
        let url = format!("{}/v1/chat/completions", self.base_url);
        let payload = serde_json::json!({
            "model": "baanzon-verso-auto",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        });

        let response = self.http_client.post(&url).json(&payload).send().await?;
        if response.status().is_success() {
            let body: Value = response.json().await?;
            let content = body["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("")
                .to_string();
            Ok(content)
        } else {
            let err_text = response.text().await.unwrap_or_default();
            let scrubbed = err_text.replace("OmniRoute", "Baanzon Verso");
            Err(anyhow::anyhow!("Baanzon Verso API Error: {scrubbed}"))
        }
    }
}

impl Default for BaanzonClient {
    fn default() -> Self {
        Self::new()
    }
}
