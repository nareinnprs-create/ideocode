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

#[tauri::command]
pub fn send_message(content: String, state: State<'_, ChatState>) -> Message {
    let user_msg = Message {
        id: new_id(),
        role: "user".into(),
        content,
        tool_calls: None,
        timestamp: Some(now_ms()),
    };

    state.messages.lock().unwrap_or_else(|e| e.into_inner()).push(user_msg.clone());

    let assistant_msg = Message {
        id: new_id(),
        role: "assistant".into(),
        content: format!(
            "Echo: {}\n\n*This is a placeholder response. The IDEOCODE backend will be connected in a later phase.*",
            user_msg.content
        ),
        tool_calls: None,
        timestamp: Some(now_ms()),
    };

    state.messages.lock().unwrap_or_else(|e| e.into_inner()).push(assistant_msg.clone());
    save_session(&state);
    assistant_msg
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
