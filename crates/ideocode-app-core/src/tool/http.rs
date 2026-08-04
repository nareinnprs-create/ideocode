// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashMap;

pub struct HttpTool;

impl HttpTool {
    pub fn new() -> Self {
        Self
    }
}

fn default_method() -> HttpMethod {
    HttpMethod::Get
}

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
enum HttpMethod {
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
}

#[derive(Deserialize)]
struct HttpInput {
    url: String,
    #[serde(default = "default_method")]
    method: HttpMethod,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    body: Option<String>,
    #[serde(default)]
    params: HashMap<String, String>,
    #[serde(default)]
    timeout_secs: Option<u64>,
}

#[async_trait]
impl Tool for HttpTool {
    fn name(&self) -> &str {
        "http"
    }

    fn description(&self) -> &str {
        "Make HTTP requests with full control over method, headers, body, and query parameters. Returns status code, headers, and body."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["url"],
            "properties": {
                "intent": super::intent_schema_property(),
                "url": {
                    "type": "string",
                    "description": "Request URL."
                },
                "method": {
                    "type": "string",
                    "enum": ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
                    "description": "HTTP method (default: GET)."
                },
                "headers": {
                    "type": "object",
                    "additionalProperties": { "type": "string" },
                    "description": "Request headers as key-value pairs."
                },
                "body": {
                    "type": "string",
                    "description": "Request body (for POST/PUT/PATCH)."
                },
                "params": {
                    "type": "object",
                    "additionalProperties": { "type": "string" },
                    "description": "Query parameters as key-value pairs."
                },
                "timeout_secs": {
                    "type": "integer",
                    "description": "Request timeout in seconds (default: 30)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: HttpInput = serde_json::from_value(input)?;

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(
                params.timeout_secs.unwrap_or(30),
            ))
            .build()?;

        let method = match params.method {
            HttpMethod::Get => reqwest::Method::GET,
            HttpMethod::Post => reqwest::Method::POST,
            HttpMethod::Put => reqwest::Method::PUT,
            HttpMethod::Patch => reqwest::Method::PATCH,
            HttpMethod::Delete => reqwest::Method::DELETE,
            HttpMethod::Head => reqwest::Method::HEAD,
            HttpMethod::Options => reqwest::Method::OPTIONS,
        };

        let mut req = client.request(method, &params.url);

        for (key, value) in &params.headers {
            req = req.header(key, value);
        }

        if !params.params.is_empty() {
            req = req.query(&params.params);
        }

        if let Some(body) = &params.body {
            req = req.body(body.clone());
        }

        let response = req.send().await?;
        let status = response.status();
        let headers = response.headers().clone();
        let body = response.text().await?;

        let mut output = String::new();
        output.push_str(&format!(
            "HTTP {} {}\n",
            status.as_u16(),
            status.canonical_reason().unwrap_or("")
        ));

        let mut header_lines: Vec<String> = Vec::new();
        for (name, value) in headers.iter() {
            if let Ok(v) = value.to_str() {
                header_lines.push(format!("{}: {}", name, v));
            }
        }
        if !header_lines.is_empty() {
            output.push_str(&header_lines.join("\n"));
            output.push_str("\n\n");
        }

        if !body.is_empty() {
            // Try to pretty-print JSON
            if let Ok(parsed) = serde_json::from_str::<Value>(&body) {
                if let Ok(pretty) = serde_json::to_string_pretty(&parsed) {
                    output.push_str(&pretty);
                } else {
                    output.push_str(&body);
                }
            } else {
                output.push_str(&body);
            }
        }

        Ok(ToolOutput::new(output))
    }
}
