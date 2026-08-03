// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
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
pub struct Session {
    pub id: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub message_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub save_label: Option<String>,
}

pub struct ChatState {
    pub messages: Mutex<Vec<Message>>,
    pub current_session_id: Mutex<String>,
}

impl ChatState {
    pub fn new() -> Self {
        Self {
            messages: Mutex::new(Vec::new()),
            current_session_id: Mutex::new(new_id()),
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
    let session_id = state.current_session_id.lock().unwrap_or_else(|e| e.into_inner()).clone();
    let messages = state.messages.lock().unwrap_or_else(|e| e.into_inner()).clone();
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
        return Err(format!("Engine returned HTTP {status}: {}", truncate(&text)));
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
            let url = format!("{}/chat/completions", crate::gateway::OMNIROUTE_BASE_URL);
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
            let key = std::env::var("OPENAI_API_KEY")
                .map_err(|_| "OPENAI_API_KEY is not set. Set it in your environment to use OpenAI.".to_string())?;
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
            let key = std::env::var("ANTHROPIC_API_KEY")
                .map_err(|_| "ANTHROPIC_API_KEY is not set. Set it in your environment to use Anthropic.".to_string())?;
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
                return Err(format!("Anthropic returned HTTP {status}: {}", truncate(&text)));
            }
            let v: serde_json::Value =
                serde_json::from_str(&text).map_err(|e| format!("Invalid Anthropic response: {e}"))?;
            let content = v
                .pointer("/content/0/text")
                .and_then(|c| c.as_str())
                .ok_or_else(|| "Empty response from Anthropic".to_string())?;
            Ok(content.to_string())
        }
        "gemini" => {
            let key = std::env::var("GOOGLE_API_KEY")
                .map_err(|_| "GOOGLE_API_KEY is not set. Set it in your environment to use Gemini.".to_string())?;
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
                return Err(format!("Gemini returned HTTP {status}: {}", truncate(&text)));
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
            let key = std::env::var("OPENROUTER_API_KEY")
                .map_err(|_| "OPENROUTER_API_KEY is not set. Set it in your environment to use OpenRouter.".to_string())?;
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

#[tauri::command]
pub async fn send_message(content: String, state: State<'_, ChatState>) -> Result<Message, String> {
    let user_msg = Message {
        id: new_id(),
        role: "user".into(),
        content,
        tool_calls: None,
        timestamp: Some(now_ms()),
    };

    state.messages.lock().unwrap_or_else(|e| e.into_inner()).push(user_msg.clone());

    let history: Vec<Message> = state
        .messages
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();

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

    let mut req_messages: Vec<serde_json::Value> = Vec::with_capacity(history.len() + 1);
    req_messages.push(serde_json::json!({ "role": "system", "content": SYSTEM_PROMPT }));
    for m in &history {
        req_messages.push(serde_json::json!({ "role": m.role, "content": m.content }));
    }

    let response_text = chat_completion(&provider, &model, &req_messages).await?;

    let assistant_msg = Message {
        id: new_id(),
        role: "assistant".into(),
        content: response_text,
        tool_calls: None,
        timestamp: Some(now_ms()),
    };
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
    state.messages.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
pub fn clear_messages(state: State<'_, ChatState>) {
    state.messages.lock().unwrap_or_else(|e| e.into_inner()).clear();
    // Reset session ID
    *state.current_session_id.lock().unwrap_or_else(|e| e.into_inner()) = new_id();
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
                .filter(|e| e.path().extension().map(|ext| ext == "json").unwrap_or(false))
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

    sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    sessions
}

#[tauri::command]
pub fn export_session(id: String, format: String) -> Result<String, String> {
    let path = sessions_dir().join(format!("{}.json", super::sanitize_id(&id)));
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read session: {}", e))?;
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
                    let text = msg
                        .get("content")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    md += &format!("## {}\n\n{}\n\n", role, text);
                }
            }
            Ok(md)
        }
        "json" => Ok(content),
        _ => Err(format!("Unsupported export format: {}", format)),
    }
}
