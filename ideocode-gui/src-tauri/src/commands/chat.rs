// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub input: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub message_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub save_label: Option<String>,
}

#[derive(Clone)]
pub struct ChatState {
    pub messages: Arc<Mutex<Vec<Message>>>,
    pub current_session_id: Arc<Mutex<String>>,
    pub active_task: Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>,
}

impl ChatState {
    pub fn new() -> Self {
        Self {
            messages: Arc::new(Mutex::new(Vec::new())),
            current_session_id: Arc::new(Mutex::new(new_id())),
            active_task: Arc::new(Mutex::new(None)),
        }
    }
}

fn new_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}", t)
}

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn sessions_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("sessions"))
        .unwrap_or_default()
}

fn save_session(state: &ChatState) {
    let dir = sessions_dir();
    if dir.as_os_str().is_empty() {
        return;
    }
    let _ = std::fs::create_dir_all(&dir);
    let session_id = state
        .current_session_id
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let messages = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let now = now_ms() / 1000;
    let value = serde_json::json!({
        "id": session_id,
        "title": format!("Session {}", &session_id[..8]),
        "created_at": now,
        "updated_at": now,
        "messages": messages,
    });
    let path = dir.join(format!("{}.json", session_id));
    if let Ok(json) = serde_json::to_string_pretty(&value) {
        let _ = std::fs::write(&path, json);
    }
}

const SYSTEM_PROMPT: &str = "You are IDEOCODE, an expert software engineering assistant \
built into the IDEOCODE desktop IDE. You help users write, debug, review, and understand code. \
Be concise, practical, and precise. When relevant, include runnable code snippets.";

const AGENT_TOOLS: &str = r#"[
  {
    "type": "function",
    "function": {
      "name": "bash",
      "description": "Execute a shell command and return its output.",
      "parameters": {
        "type": "object",
        "properties": {
          "command": { "type": "string", "description": "The shell command to execute" }
        },
        "required": ["command"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "read_file",
      "description": "Read the contents of a file.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Absolute path to the file" }
        },
        "required": ["path"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "write_file",
      "description": "Write content to a file, creating it if it doesn't exist.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Absolute path to the file" },
          "content": { "type": "string", "description": "The content to write" }
        },
        "required": ["path", "content"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "edit_file",
      "description": "Edit a file by replacing exact text. The old_text must match exactly.",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "description": "Absolute path to the file" },
          "old_text": { "type": "string", "description": "Exact text to find and replace" },
          "new_text": { "type": "string", "description": "Replacement text" }
        },
        "required": ["path", "old_text", "new_text"]
      }
    }
  }
]"#;

fn http_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(180))
            .build()
            .unwrap_or_default()
    })
}

fn truncate(s: &str) -> String {
    let max = 400;
    if s.len() <= max {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(max).collect();
        out.push_str("...");
        out
    }
}

/// Parses an OpenAI-compatible `chat/completions` response.
async fn extract_openai_completion(resp: reqwest::Response) -> Result<String, String> {
    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!(
            "Engine returned HTTP {status}: {}",
            truncate(&text)
        ));
    }
    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Invalid response from engine: {e}"))?;
    let content = v
        .pointer("/choices/0/message/content")
        .and_then(|c| c.as_str())
        .ok_or_else(|| "Empty response from engine".to_string())?;
    Ok(content.to_string())
}

/// Sends a chat completion request to the active provider. `messages` already
/// includes the system prompt and the full conversation history.
async fn chat_completion(
    provider: &str,
    model: &str,
    messages: &[serde_json::Value],
) -> Result<String, String> {
    let client = http_client();
    match provider {
        // Built-in local engine (OpenAI-compatible endpoint).
        "baanzon-verso" | "omniroute" => {
            // The built-in engine cold-starts on first launch (install/setup/
            // spawn can take tens of seconds), so wait for it to be ready
            // instead of failing with a connection error on the first message.
            let (ready, disabled) = tokio::task::spawn_blocking(|| {
                let status = ideocode_provider_baanzon::bootstrap_engine();
                (status.online, status.disabled)
            })
            .await
            .unwrap_or((false, false));
            if disabled {
                return Err(
                    "The Baanzon Verso engine is disabled (IDEOCODE_DISABLE_BAANZON_GATEWAY is \
                     set). Remove that variable to use the built-in engine."
                        .to_string(),
                );
            }
            if !ready {
                return Err(
                    "The Baanzon Verso engine is still starting (first launch installs it). It \
                     keeps retrying in the background; check \
                     ~/.IDEOCODE/logs/baanzon-verso.log"
                        .to_string(),
                );
            }
            let url = format!(
                "{}/chat/completions",
                ideocode_provider_baanzon::OMNIROUTE_BASE_URL
            );
            let body = serde_json::json!({
                "model": if model.is_empty() || model == "auto" { "auto" } else { model },
                "messages": messages,
                "temperature": 0.7,
            });
            let resp = client.post(&url).json(&body).send().await.map_err(|e| {
                format!(
                    "The Baanzon Verso engine is not reachable ({e}). It installs itself on first \
                     launch when Node.js is available; check ~/.IDEOCODE/logs/baanzon-verso.log"
                )
            })?;
            extract_openai_completion(resp).await
        }
        "openai" => {
            let key = std::env::var("OPENAI_API_KEY").map_err(|_| {
                "OPENAI_API_KEY is not set. Set it in your environment to use OpenAI.".to_string()
            })?;
            let body = serde_json::json!({ "model": model, "messages": messages });
            let resp = client
                .post("https://api.openai.com/v1/chat/completions")
                .bearer_auth(&key)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("OpenAI request failed: {e}"))?;
            extract_openai_completion(resp).await
        }
        "anthropic" => {
            let key = std::env::var("ANTHROPIC_API_KEY").map_err(|_| {
                "ANTHROPIC_API_KEY is not set. Set it in your environment to use Anthropic."
                    .to_string()
            })?;
            let anthropic_messages: Vec<serde_json::Value> = messages
                .iter()
                .filter_map(|m| {
                    let role = m.get("role")?.as_str()?;
                    if role == "system" {
                        return None;
                    }
                    Some(serde_json::json!({
                        "role": role,
                        "content": m.get("content").cloned().unwrap_or_default()
                    }))
                })
                .collect();
            let body = serde_json::json!({
                "model": model,
                "max_tokens": 4096,
                "messages": anthropic_messages,
            });
            let resp = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &key)
                .header("anthropic-version", "2023-06-01")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Anthropic request failed: {e}"))?;
            let status = resp.status();
            let text = resp.text().await.map_err(|e| e.to_string())?;
            if !status.is_success() {
                return Err(format!(
                    "Anthropic returned HTTP {status}: {}",
                    truncate(&text)
                ));
            }
            let v: serde_json::Value = serde_json::from_str(&text)
                .map_err(|e| format!("Invalid Anthropic response: {e}"))?;
            let content = v
                .pointer("/content/0/text")
                .and_then(|c| c.as_str())
                .ok_or_else(|| "Empty response from Anthropic".to_string())?;
            Ok(content.to_string())
        }
        "gemini" => {
            let key = std::env::var("GOOGLE_API_KEY").map_err(|_| {
                "GOOGLE_API_KEY is not set. Set it in your environment to use Gemini.".to_string()
            })?;
            let contents: Vec<serde_json::Value> = messages
                .iter()
                .filter_map(|m| {
                    let role = match m.get("role")?.as_str()? {
                        "user" => "user",
                        _ => "model",
                    };
                    let text = m.get("content")?.as_str()?;
                    Some(serde_json::json!({ "role": role, "parts": [{ "text": text }] }))
                })
                .collect();
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
                model
            );
            let body = serde_json::json!({ "contents": contents });
            let resp = client
                .post(&url)
                .query(&[("key", key.as_str())])
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Gemini request failed: {e}"))?;
            let status = resp.status();
            let text = resp.text().await.map_err(|e| e.to_string())?;
            if !status.is_success() {
                return Err(format!(
                    "Gemini returned HTTP {status}: {}",
                    truncate(&text)
                ));
            }
            let v: serde_json::Value =
                serde_json::from_str(&text).map_err(|e| format!("Invalid Gemini response: {e}"))?;
            let content = v
                .pointer("/candidates/0/content/parts/0/text")
                .and_then(|c| c.as_str())
                .ok_or_else(|| "Empty response from Gemini".to_string())?;
            Ok(content.to_string())
        }
        "openrouter" => {
            let key = std::env::var("OPENROUTER_API_KEY").map_err(|_| {
                "OPENROUTER_API_KEY is not set. Set it in your environment to use OpenRouter."
                    .to_string()
            })?;
            let body = serde_json::json!({ "model": model, "messages": messages });
            let resp = client
                .post("https://openrouter.ai/api/v1/chat/completions")
                .bearer_auth(&key)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("OpenRouter request failed: {e}"))?;
            extract_openai_completion(resp).await
        }
        other => Err(format!("Unknown provider: {other}")),
    }
}

/// Agent tool call parsed from streaming response.
#[derive(Debug, Clone)]
struct ParsedToolCall {
    id: String,
    name: String,
    arguments: String,
}

/// Result of a streamed completion.
struct StreamResult {
    content: String,
    usage: Option<Usage>,
    tool_calls: Vec<ParsedToolCall>,
}

/// Streams an OpenAI-compatible chat completion, emitting `chat://delta`
/// events as chunks arrive. Gracefully handles engines that ignore `stream`
/// and return a plain JSON body.
async fn stream_openai_completion(
    provider: &str,
    model: &str,
    messages: &[serde_json::Value],
    reasoning_effort: Option<&str>,
    tools: Option<&serde_json::Value>,
    app: &tauri::AppHandle,
    assistant_id: &str,
) -> Result<StreamResult, String> {
    let client = http_client();

    if provider == "baanzon-verso" || provider == "omniroute" {
        let (ready, disabled) = tokio::task::spawn_blocking(|| {
            let status = ideocode_provider_baanzon::bootstrap_engine();
            (status.online, status.disabled)
        })
        .await
        .unwrap_or((false, false));
        if disabled {
            return Err(
                "The Baanzon Verso engine is disabled (IDEOCODE_DISABLE_BAANZON_GATEWAY is \
                 set). Remove that variable to use the built-in engine."
                    .to_string(),
            );
        }
        if !ready {
            return Err(
                "The Baanzon Verso engine is still starting (first launch installs it). It \
                 keeps retrying in the background; check \
                 ~/.IDEOCODE/logs/baanzon-verso.log"
                    .to_string(),
            );
        }
    }

    let url = match provider {
        "baanzon-verso" | "omniroute" => format!(
            "{}/chat/completions",
            ideocode_provider_baanzon::OMNIROUTE_BASE_URL
        ),
        "openai" => "https://api.openai.com/v1/chat/completions".to_string(),
        "openrouter" => "https://openrouter.ai/api/v1/chat/completions".to_string(),
        other => return Err(format!("Provider {other} does not support streaming")),
    };

    let mut body_obj = serde_json::json!({
        "model": if model.is_empty() || model == "auto" { "auto" } else { model },
        "messages": messages,
        "stream": true,
        "temperature": 0.7,
    });
    if matches!(provider, "openai" | "openrouter") {
        body_obj["stream_options"] = serde_json::json!({ "include_usage": true });
        if provider == "openai" {
            if let Some(effort) = reasoning_effort.filter(|e| !e.is_empty()) {
                body_obj["reasoning_effort"] = serde_json::json!(effort);
            }
        }
    }
    if let Some(t) = tools {
        body_obj["tools"] = t.clone();
    }
    let body = body_obj;

    let mut req = client.post(&url).json(&body);
    if provider == "openai" {
        let key = std::env::var("OPENAI_API_KEY").map_err(|_| {
            "OPENAI_API_KEY is not set. Set it in your environment to use OpenAI.".to_string()
        })?;
        req = req.bearer_auth(&key);
    } else if provider == "openrouter" {
        let key = std::env::var("OPENROUTER_API_KEY").map_err(|_| {
            "OPENROUTER_API_KEY is not set. Set it in your environment to use OpenRouter."
                .to_string()
        })?;
        req = req.bearer_auth(&key);
    }

    let mut resp = req
        .send()
        .await
        .map_err(|e| format!("Stream request failed: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.map_err(|e| e.to_string())?;
        return Err(format!(
            "Engine returned HTTP {status}: {}",
            truncate(&text)
        ));
    }

    let mut buf = String::new();
    let mut full = String::new();
    let mut usage: Option<Usage> = None;
    // Tool call accumulator: index -> (id, name, arguments)
    let mut tool_calls: std::collections::HashMap<u32, (String, String, String)> =
        std::collections::HashMap::new();

    loop {
        match resp.chunk().await {
            Ok(Some(chunk)) => {
                buf.push_str(&String::from_utf8_lossy(&chunk));
                while let Some(idx) = buf.find("\n\n") {
                    let event = buf[..idx].to_string();
                    buf = buf[idx + 2..].to_string();
                    emit_sse_event_with_tools(
                        &event,
                        &mut full,
                        &mut usage,
                        &mut tool_calls,
                        app,
                        assistant_id,
                    );
                }
            }
            Ok(None) => break,
            Err(e) => return Err(format!("Stream read failed: {e}")),
        }
    }
    if !buf.is_empty() {
        emit_sse_event_with_tools(
            &buf,
            &mut full,
            &mut usage,
            &mut tool_calls,
            app,
            assistant_id,
        );
    }

    // Graceful fallback: the engine may have returned a plain OpenAI JSON body.
    if full.is_empty() && tool_calls.is_empty() {
        let v: serde_json::Value =
            serde_json::from_str(&buf).map_err(|e| format!("Invalid stream response: {e}"))?;
        full = v
            .pointer("/choices/0/message/content")
            .and_then(|c| c.as_str())
            .unwrap_or_default()
            .to_string();
        if !full.is_empty() {
            let _ = app.emit(
                "chat://delta",
                serde_json::json!({ "id": assistant_id, "content": full }),
            );
        }
    }

    let parsed_tool_calls: Vec<ParsedToolCall> = tool_calls
        .into_iter()
        .filter_map(|(_, (id, name, args))| {
            if name.is_empty() {
                return None;
            }
            Some(ParsedToolCall {
                id,
                name,
                arguments: args,
            })
        })
        .collect();

    Ok(StreamResult {
        content: full,
        usage,
        tool_calls: parsed_tool_calls,
    })
}

/// Parses a single SSE event and emits any content delta found in it. Also
/// captures tool calls and the `usage` block included in the final chunk.
fn emit_sse_event_with_tools(
    event: &str,
    full: &mut String,
    usage: &mut Option<Usage>,
    tool_calls: &mut std::collections::HashMap<u32, (String, String, String)>,
    app: &tauri::AppHandle,
    assistant_id: &str,
) {
    for line in event.lines() {
        let line = line.trim();
        let Some(payload) = line.strip_prefix("data:") else {
            continue;
        };
        let payload = payload.trim();
        if payload.is_empty() || payload == "[DONE]" {
            continue;
        }
        let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) else {
            continue;
        };
        if usage.is_none() {
            if let Some(u) = v.get("usage") {
                *usage = serde_json::from_value(u.clone()).ok();
            }
        }
        let delta = v
            .pointer("/choices/0/delta/content")
            .and_then(|c| c.as_str())
            .or_else(|| {
                v.pointer("/choices/0/message/content")
                    .and_then(|c| c.as_str())
            });
        if let Some(d) = delta {
            full.push_str(d);
            let _ = app.emit(
                "chat://delta",
                serde_json::json!({ "id": assistant_id, "content": d }),
            );
        }
        // Parse tool calls from streaming delta
        if let Some(arr) = v.pointer("/choices/0/delta/tool_calls").and_then(|a| a.as_array()) {
            for tc in arr {
                let idx = tc.get("index").and_then(|i| i.as_u64()).unwrap_or(0) as u32;
                let entry = tool_calls.entry(idx).or_insert_with(|| {
                    (
                        tc.pointer("/id")
                            .and_then(|s| s.as_str())
                            .unwrap_or("")
                            .to_string(),
                        String::new(),
                        String::new(),
                    )
                });
                // Update id if present
                if let Some(id) = tc.pointer("/id").and_then(|s| s.as_str()) {
                    if !id.is_empty() {
                        entry.0 = id.to_string();
                    }
                }
                // Update function name if present
                if let Some(name) = tc
                    .pointer("/function/name")
                    .and_then(|s| s.as_str())
                {
                    if !name.is_empty() {
                        entry.1 = name.to_string();
                    }
                }
                // Append arguments delta
                if let Some(args) = tc
                    .pointer("/function/arguments")
                    .and_then(|s| s.as_str())
                {
                    entry.2.push_str(args);
                }
            }
        }
        // Also handle non-streaming tool_calls in message response
        if let Some(arr) = v
            .pointer("/choices/0/message/tool_calls")
            .and_then(|a| a.as_array())
        {
            for (i, tc) in arr.iter().enumerate() {
                let idx = i as u32;
                let id = tc
                    .pointer("/id")
                    .and_then(|s| s.as_str())
                    .unwrap_or("")
                    .to_string();
                let name = tc
                    .pointer("/function/name")
                    .and_then(|s| s.as_str())
                    .unwrap_or("")
                    .to_string();
                let args = tc
                    .pointer("/function/arguments")
                    .and_then(|s| s.as_str())
                    .unwrap_or("")
                    .to_string();
                tool_calls.insert(idx, (id, name, args));
            }
        }
    }
}

/// Builds the request message list (system prompt + conversation history) for a
/// completion call. `mode` may inject Plan/Agent behaviour into the system prompt.
fn build_completion_request(history: &[Message], mode: Option<&str>) -> Vec<serde_json::Value> {
    let mut system_prompt = SYSTEM_PROMPT.to_string();
    match mode {
        Some("plan") => {
            system_prompt.push_str(
                "\nYou are in PLAN MODE: analyze the request, propose a clear step-by-step plan, \
                 and explain your reasoning. Do not write or modify code yet.",
            );
        }
        Some("agent") => {
            system_prompt.push_str(
                "\nYou are in AGENT MODE: act as an autonomous coding agent. You have access to \
                 tools: bash (execute shell commands), read_file, write_file, edit_file. \
                 Use tool_calls to perform actions. When the task is complete and no more \
                 tools are needed, respond with a summary of what you did.",
            );
        }
        _ => {}
    }

    let mut req_messages: Vec<serde_json::Value> = Vec::with_capacity(history.len() + 1);
    req_messages.push(serde_json::json!({ "role": "system", "content": system_prompt }));
    for m in history {
        let mut msg = serde_json::json!({ "role": m.role, "content": m.content });
        if let Some(ref tc) = m.tool_calls {
            if !tc.is_empty() {
                let calls: Vec<serde_json::Value> = tc
                    .iter()
                    .map(|c| {
                        serde_json::json!({
                            "id": c.id,
                            "type": "function",
                            "function": {
                                "name": c.name,
                                "arguments": c.input,
                            }
                        })
                    })
                    .collect();
                msg["tool_calls"] = serde_json::json!(calls);
            }
        }
        req_messages.push(msg);
    }
    req_messages
}

/// Returns tools JSON array when in agent mode, or None for normal/plan modes.
fn tools_for_mode(mode: Option<&str>) -> Option<serde_json::Value> {
    if mode == Some("agent") {
        serde_json::from_str(AGENT_TOOLS).ok()
    } else {
        None
    }
}

/// Executes a single agent tool call and returns the output string.
fn execute_tool(name: &str, args: &str) -> String {
    let parsed: serde_json::Value = match serde_json::from_str(args) {
        Ok(v) => v,
        Err(e) => return format!("Error parsing tool arguments: {e}"),
    };

    match name {
        "bash" => {
            let cmd = parsed["command"].as_str().unwrap_or("");
            if cmd.is_empty() {
                return "Error: empty command".to_string();
            }
            let output = if cfg!(target_os = "windows") {
                std::process::Command::new("cmd")
                    .args(["/C", cmd])
                    .output()
            } else {
                std::process::Command::new("sh")
                    .arg("-c")
                    .arg(cmd)
                    .output()
            };
            match output {
                Ok(output) => {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let mut result = String::new();
                    if !stdout.is_empty() {
                        result.push_str(&stdout);
                    }
                    if !stderr.is_empty() {
                        if !result.is_empty() {
                            result.push_str("\n--- stderr ---\n");
                        }
                        result.push_str(&stderr);
                    }
                    if result.len() > 8000 {
                        result.truncate(8000);
                        result.push_str("\n... (truncated)");
                    }
                    if result.is_empty() {
                        format!("Command exited with status: {}", output.status)
                    } else {
                        result
                    }
                }
                Err(e) => format!("Failed to execute command: {e}"),
            }
        }
        "read_file" => {
            let path = parsed["path"].as_str().unwrap_or("");
            match std::fs::read_to_string(path) {
                Ok(content) => {
                    if content.len() > 16000 {
                        let mut truncated = content[..16000].to_string();
                        truncated.push_str("\n... (truncated at 16KB)");
                        truncated
                    } else {
                        content
                    }
                }
                Err(e) => format!("Error reading file: {e}"),
            }
        }
        "write_file" => {
            let path = parsed["path"].as_str().unwrap_or("");
            let content = parsed["content"].as_str().unwrap_or("");
            if path.is_empty() {
                return "Error: empty path".to_string();
            }
            match std::fs::write(path, content) {
                Ok(()) => format!("File written: {path}"),
                Err(e) => format!("Error writing file: {e}"),
            }
        }
        "edit_file" => {
            let path = parsed["path"].as_str().unwrap_or("");
            let old_text = parsed["old_text"].as_str().unwrap_or("");
            let new_text = parsed["new_text"].as_str().unwrap_or("");
            if path.is_empty() {
                return "Error: empty path".to_string();
            }
            if old_text.is_empty() {
                return "Error: old_text is empty".to_string();
            }
            match std::fs::read_to_string(path) {
                Ok(content) => {
                    if !content.contains(old_text) {
                        format!("Error: old_text not found in {path}")
                    } else {
                        let updated = content.replacen(old_text, new_text, 1);
                        match std::fs::write(path, updated) {
                            Ok(()) => format!("File edited: {path}"),
                            Err(e) => format!("Error writing edited file: {e}"),
                        }
                    }
                }
                Err(e) => format!("Error reading file for edit: {e}"),
            }
        }
        other => format!("Unknown tool: {other}"),
    }
}

/// Runs a completion against the active provider for the given history and
/// returns the produced assistant message.
async fn run_completion(
    history: &[Message],
    model_override: Option<String>,
    mode: Option<&str>,
) -> Result<Message, String> {
    let settings = super::settings::get_settings();
    let provider = if settings.active_provider.is_empty() {
        "baanzon-verso".to_string()
    } else {
        settings.active_provider
    };
    let model = if let Some(model) = model_override.filter(|m| !m.is_empty()) {
        model
    } else if settings.active_model.is_empty() {
        "auto".to_string()
    } else {
        settings.active_model
    };

    let req_messages = build_completion_request(history, mode);
    let response_text = chat_completion(&provider, &model, &req_messages).await?;
    Ok(Message {
        id: new_id(),
        role: "assistant".into(),
        content: response_text,
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage: None,
    })
}

/// Runs a completion, streaming `chat://delta` events to the frontend as text
/// arrives, and returns the produced assistant message. In agent mode, executes
/// tool calls in a loop until the model produces a final text response.
async fn run_streaming_completion(
    history: &[Message],
    model_override: Option<String>,
    mode: Option<&str>,
    reasoning_effort: Option<&str>,
    app: &tauri::AppHandle,
    assistant_id: &str,
) -> Result<Message, String> {
    let settings = super::settings::get_settings();
    let provider = if settings.active_provider.is_empty() {
        "baanzon-verso".to_string()
    } else {
        settings.active_provider
    };
    let model = if let Some(model) = model_override.filter(|m| !m.is_empty()) {
        model
    } else if settings.active_model.is_empty() {
        "auto".to_string()
    } else {
        settings.active_model
    };

    let is_agent = mode == Some("agent");
    let tools = tools_for_mode(mode);
    let mut conversation: Vec<serde_json::Value> = build_completion_request(history, mode);

    let max_tool_rounds = 20;
    let mut round = 0;

    loop {
        let req_messages = conversation.clone();
        let stream_result = match provider.as_str() {
            "baanzon-verso" | "omniroute" | "openai" | "openrouter" => {
                stream_openai_completion(
                    &provider,
                    &model,
                    &req_messages,
                    reasoning_effort,
                    tools.as_ref(),
                    app,
                    assistant_id,
                )
                .await?
            }
            _ => {
                let text = chat_completion(&provider, &model, &req_messages).await?;
                let _ = app.emit(
                    "chat://delta",
                    serde_json::json!({ "id": assistant_id, "content": text }),
                );
                StreamResult {
                    content: text,
                    usage: None,
                    tool_calls: Vec::new(),
                }
            }
        };

        // No tool calls — we have a final text response.
        if stream_result.tool_calls.is_empty() || !is_agent {
            return Ok(Message {
                id: assistant_id.to_string(),
                role: "assistant".into(),
                content: stream_result.content,
                tool_calls: None,
                timestamp: Some(now_ms()),
                usage: stream_result.usage,
            });
        }

        // Emit tool call info to frontend
        let tool_names: Vec<String> = stream_result
            .tool_calls
            .iter()
            .map(|tc| tc.name.clone())
            .collect();
        let _ = app.emit(
            "chat://tool",
            serde_json::json!({
                "assistant_id": assistant_id,
                "tools": tool_names,
            }),
        );

        // Build assistant message with tool_calls and push to conversation
        let tc_json: Vec<serde_json::Value> = stream_result
            .tool_calls
            .iter()
            .map(|tc| {
                serde_json::json!({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": tc.arguments,
                    }
                })
            })
            .collect();
        conversation.push(serde_json::json!({
            "role": "assistant",
            "content": stream_result.content,
            "tool_calls": tc_json,
        }));

        // Execute each tool and add results to conversation
        for tc in &stream_result.tool_calls {
            let output = execute_tool(&tc.name, &tc.arguments);

            let _ = app.emit(
                "chat://tool_result",
                serde_json::json!({
                    "assistant_id": assistant_id,
                    "tool_id": tc.id,
                    "tool_name": tc.name,
                    "output": truncate(&output),
                }),
            );

            conversation.push(serde_json::json!({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": output,
            }));
        }

        round += 1;
        if round >= max_tool_rounds {
            return Ok(Message {
                id: assistant_id.to_string(),
                role: "assistant".into(),
                content: format!(
                    "[Agent reached maximum tool rounds ({max_tool_rounds}). \
                     Summarizing progress so far.]"
                ),
                tool_calls: None,
                timestamp: Some(now_ms()),
                usage: None,
            });
        }
    }
}

#[tauri::command]
pub async fn send_message(
    content: String,
    state: State<'_, ChatState>,
    model: Option<String>,
    mode: Option<String>,
) -> Result<Message, String> {
    let user_msg = Message {
        id: new_id(),
        role: "user".into(),
        content,
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage: None,
    };

    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(user_msg.clone());

    let history: Vec<Message> = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();

    let assistant_msg = run_completion(&history, model, mode.as_deref()).await?;

    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(assistant_msg.clone());
    save_session(&state);
    Ok(assistant_msg)
}

/// Starts a streaming chat completion. Pushes the user message immediately and
/// returns it; the assistant response is streamed back via `chat://delta`,
/// `chat://done`, and `chat://error` events.
#[tauri::command]
pub async fn stream_chat(
    content: String,
    state: State<'_, ChatState>,
    app: tauri::AppHandle,
    model: Option<String>,
    mode: Option<String>,
    reasoning_effort: Option<String>,
) -> Result<Message, String> {
    let user_msg = Message {
        id: new_id(),
        role: "user".into(),
        content,
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage: None,
    };
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(user_msg.clone());

    let history: Vec<Message> = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let task_state = state.inner().clone();
    let assistant_id = new_id();
    let task_app = app.clone();
    let handle = tauri::async_runtime::spawn(async move {
        match run_streaming_completion(
            &history,
            model,
            mode.as_deref(),
            reasoning_effort.as_deref(),
            &task_app,
            &assistant_id,
        )
        .await
        {
            Ok(assistant_msg) => {
                task_state
                    .messages
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .push(assistant_msg.clone());
                save_session(&task_state);
                let _ = task_app.emit(
                    "chat://done",
                    serde_json::json!({ "message": assistant_msg }),
                );
            }
            Err(e) => {
                let _ = task_app.emit("chat://error", serde_json::json!({ "error": e }));
            }
        }
    });
    *state.active_task.lock().unwrap_or_else(|e| e.into_inner()) = Some(handle);
    Ok(user_msg)
}

/// Aborts the in-flight streaming generation, if any. Returns `true` when a
/// task was stopped.
#[tauri::command]
pub fn interrupt_stream(state: State<'_, ChatState>) -> bool {
    let mut guard = state.active_task.lock().unwrap_or_else(|e| e.into_inner());
    match guard.take() {
        Some(handle) => {
            handle.abort();
            true
        }
        None => false,
    }
}

/// Persists the partial assistant response captured by the frontend when the
/// user stops a stream. Uses the same message id the deltas were emitted under,
/// so a racing `chat://done` event replaces it instead of duplicating it.
#[tauri::command]
pub fn save_partial_message(
    id: String,
    content: String,
    state: State<'_, ChatState>,
) -> Result<Message, String> {
    let content = content.trim().to_string();
    if content.is_empty() {
        return Err("Nothing to save".to_string());
    }
    let msg = Message {
        id,
        role: "assistant".into(),
        content,
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage: None,
    };
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(msg.clone());
    save_session(&state);
    Ok(msg)
}

/// Re-runs the last exchange: drops the trailing assistant response(s) and
/// produces a fresh completion from the remaining history.
#[tauri::command]
pub async fn regenerate_last_message(state: State<'_, ChatState>) -> Result<Message, String> {
    {
        let mut msgs = state.messages.lock().unwrap_or_else(|e| e.into_inner());
        while matches!(msgs.last(), Some(m) if m.role == "assistant") {
            msgs.pop();
        }
    }

    let history: Vec<Message> = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    if !history.iter().any(|m| m.role == "user") {
        return Err("Nothing to regenerate".to_string());
    }

    let assistant_msg = run_completion(&history, None, None).await?;
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(assistant_msg.clone());
    save_session(&state);
    Ok(assistant_msg)
}

/// Edits the last user message in place, drops the trailing assistant
/// response(s), and produces a fresh completion.
#[tauri::command]
pub async fn edit_last_message(
    content: String,
    state: State<'_, ChatState>,
) -> Result<Message, String> {
    let content = content.trim().to_string();
    if content.is_empty() {
        return Err("Message cannot be empty".to_string());
    }

    {
        let mut msgs = state.messages.lock().unwrap_or_else(|e| e.into_inner());
        while matches!(msgs.last(), Some(m) if m.role == "assistant") {
            msgs.pop();
        }
        match msgs.iter_mut().rev().find(|m| m.role == "user") {
            Some(m) => m.content = content,
            None => msgs.push(Message {
                id: new_id(),
                role: "user".into(),
                content,
                tool_calls: None,
                timestamp: Some(now_ms()),
                usage: None,
            }),
        }
    }

    let history: Vec<Message> = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();

    let assistant_msg = run_completion(&history, None, None).await?;
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .push(assistant_msg.clone());
    save_session(&state);
    Ok(assistant_msg)
}

#[tauri::command]
pub fn get_messages(state: State<'_, ChatState>) -> Vec<Message> {
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone()
}

#[tauri::command]
pub fn clear_messages(state: State<'_, ChatState>) {
    state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clear();
    // Reset session ID
    *state
        .current_session_id
        .lock()
        .unwrap_or_else(|e| e.into_inner()) = new_id();
}

/// Collapses the active conversation into a short summary plus the most recent
/// turns, keeping long sessions usable without losing all context.
#[tauri::command]
pub async fn compact_session(state: State<'_, ChatState>) -> Result<Vec<Message>, String> {
    let settings = super::settings::get_settings();
    let provider = if settings.active_provider.is_empty() {
        "baanzon-verso".to_string()
    } else {
        settings.active_provider
    };
    let model = if settings.active_model.is_empty() {
        "auto".to_string()
    } else {
        settings.active_model
    };

    let messages = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    if messages.len() <= 6 {
        return Err("Conversation is already short".to_string());
    }

    let keep = 4;
    let split = messages.len() - keep;
    let (older, recent) = messages.split_at(split);

    let mut req_messages: Vec<serde_json::Value> = Vec::with_capacity(older.len() + 2);
    req_messages.push(serde_json::json!({
        "role": "system",
        "content": "You are a conversation summarizer. Condense the following conversation \
                    into a concise but complete summary that preserves all decisions, code \
                    changes, error messages, and open questions."
    }));
    for m in older {
        req_messages.push(serde_json::json!({ "role": m.role, "content": m.content }));
    }
    req_messages.push(serde_json::json!({
        "role": "user",
        "content": "Produce a concise summary of the conversation above. No preamble."
    }));

    let summary = chat_completion(&provider, &model, &req_messages).await?;
    let mut compacted = vec![Message {
        id: new_id(),
        role: "system".into(),
        content: format!("[Conversation summary]\n{}", summary),
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage: None,
    }];
    compacted.extend_from_slice(recent);

    *state.messages.lock().unwrap_or_else(|e| e.into_inner()) = compacted.clone();
    save_session(&state);
    Ok(compacted)
}

/// Loads a saved session into the active chat so the user can resume it.
#[tauri::command]
pub fn load_session(id: String, state: State<'_, ChatState>) -> Result<Vec<Message>, String> {
    let path = sessions_dir().join(format!("{}.json", super::sanitize_id(&id)));
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read session: {}", e))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid session JSON: {}", e))?;

    let messages: Vec<Message> = parsed
        .get("messages")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| serde_json::from_value(m.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    let session_id = parsed
        .get("id")
        .and_then(|v| v.as_str())
        .unwrap_or(&id)
        .to_string();

    *state.messages.lock().unwrap_or_else(|e| e.into_inner()) = messages.clone();
    *state
        .current_session_id
        .lock()
        .unwrap_or_else(|e| e.into_inner()) = session_id;
    Ok(messages)
}

/// Renames a saved session (title + optional save_label).
#[tauri::command]
pub fn rename_session(id: String, title: String) -> Result<(), String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("Session title cannot be empty".to_string());
    }
    let path = sessions_dir().join(format!("{}.json", super::sanitize_id(&id)));
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read session: {}", e))?;
    let mut parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid session JSON: {}", e))?;
    parsed["title"] = serde_json::json!(title);
    parsed["save_label"] = serde_json::json!(title);
    let now = now_ms() / 1000;
    parsed["updated_at"] = serde_json::json!(now);
    let json = serde_json::to_string_pretty(&parsed)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write session: {}", e))
}

#[tauri::command]
pub fn delete_session(id: String) -> Result<(), String> {
    let path = sessions_dir().join(format!("{}.json", super::sanitize_id(&id)));
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to delete session: {}", e))
    } else {
        Err(format!("Session {} not found", id))
    }
}

#[tauri::command]
pub fn list_sessions() -> Vec<Session> {
    let dir = sessions_dir();
    if !dir.exists() {
        return Vec::new();
    }

    let mut sessions: Vec<Session> = std::fs::read_dir(&dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "json")
                        .unwrap_or(false)
                })
                .filter_map(|e| {
                    let content = std::fs::read_to_string(e.path()).ok()?;
                    let parsed: serde_json::Value = serde_json::from_str(&content).ok()?;
                    let id = parsed.get("id")?.as_str()?.to_string();
                    let title = parsed
                        .get("title")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Untitled")
                        .to_string();
                    let save_label = parsed
                        .get("save_label")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    let created = parsed
                        .get("created_at")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let updated = parsed
                        .get("updated_at")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let message_count = parsed
                        .get("messages")
                        .and_then(|v| v.as_array())
                        .map(|a| a.len())
                        .unwrap_or(0);
                    Some(Session {
                        id,
                        title,
                        created_at: created,
                        updated_at: updated,
                        message_count,
                        save_label,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    sessions.sort_by_key(|s| std::cmp::Reverse(s.updated_at));
    sessions
}

#[tauri::command]
pub fn export_session(id: String, format: String) -> Result<String, String> {
    let path = sessions_dir().join(format!("{}.json", super::sanitize_id(&id)));
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read session: {}", e))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid session JSON: {}", e))?;

    match format.as_str() {
        "markdown" => {
            let title = parsed
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("Untitled");
            let messages = parsed.get("messages").and_then(|v| v.as_array());
            let mut md = format!("# {}\n\n", title);
            if let Some(msgs) = messages {
                for msg in msgs {
                    let role = msg
                        .get("role")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    let text = msg.get("content").and_then(|v| v.as_str()).unwrap_or("");
                    md += &format!("## {}\n\n{}\n\n", role, text);
                }
            }
            Ok(md)
        }
        "json" => Ok(content),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}

#[tauri::command]
pub async fn inline_completion(
    prefix: String,
    _suffix: String,
) -> Result<String, String> {
    // Audit mockup: Ghost Text Autocomplete (Codex Parity)
    let last_line = prefix.lines().last().unwrap_or("").trim_start();
    if last_line.starts_with("func") || last_line.starts_with("fn ") {
        Ok(" hello() {\n  console.log('world');\n}".to_string())
    } else if last_line.starts_with("console.l") {
        Ok("og('Hello ghost text!');".to_string())
    } else if last_line.starts_with("impo") {
        Ok("rt { useState } from 'react';".to_string())
    } else {
        Ok(" // AI generated completion".to_string())
    }
}

#[tauri::command]
pub async fn stream_inline_edit(
    file_path: String,
    content: String,
    prompt: String,
    app: tauri::AppHandle,
) -> Result<Message, String> {
    let settings = super::settings::get_settings();
    let provider = if settings.active_provider.is_empty() {
        "baanzon-verso".to_string()
    } else {
        settings.active_provider
    };
    let model = if settings.active_model.is_empty() {
        "auto".to_string()
    } else {
        settings.active_model
    };

    let user_msg = format!("<file name=\"{}\">\n{}\n</file>\n\nInstruction: Rewrite the file to apply this change: {}\n\nReturn ONLY the modified file content without markdown code block backticks.", file_path, content, prompt);
    let req_messages = vec![serde_json::json!({"role": "user", "content": user_msg})];
    let assistant_id = format!("inline-{}", new_id());

    let StreamResult { content: full, usage, .. } = match provider.as_str() {
        "baanzon-verso" | "omniroute" | "openai" | "openrouter" => {
            stream_openai_completion(
                &provider,
                &model,
                &req_messages,
                None,
                None,
                &app,
                &assistant_id,
            )
            .await?
        }
        _ => {
            let text = chat_completion(&provider, &model, &req_messages).await?;
            let _ = app.emit(
                "chat://delta",
                serde_json::json!({ "id": assistant_id, "content": &text }),
            );
            StreamResult { content: text, usage: None, tool_calls: Vec::new() }
        }
    };

    let _ = app.emit("inline://done", serde_json::json!({ "id": assistant_id }));

    Ok(Message {
        id: assistant_id,
        role: "assistant".to_string(),
        content: full,
        tool_calls: None,
        timestamp: Some(now_ms()),
        usage,
    })
}
