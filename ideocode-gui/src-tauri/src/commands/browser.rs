// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserTab {
    pub url: String,
    pub title: String,
    pub last_active: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    pub active_tab: Option<BrowserTab>,
    pub recent_tabs: Vec<BrowserTab>,
    pub updated_at: u64,
}

fn browser_context_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("browser-context.json"))
        .unwrap_or_else(|| PathBuf::from(".IDEOCODE/browser-context.json"))
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn load_context() -> BrowserContext {
    let path = browser_context_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(ctx) = serde_json::from_str::<BrowserContext>(&content) {
                return ctx;
            }
        }
    }
    BrowserContext {
        active_tab: None,
        recent_tabs: Vec::new(),
        updated_at: now_secs(),
    }
}

fn save_context(ctx: &BrowserContext) {
    let path = browser_context_path();
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(ctx) {
        let _ = std::fs::write(&path, json);
    }
}

#[tauri::command]
pub fn get_browser_context() -> BrowserContext {
    load_context()
}

#[tauri::command]
pub fn set_browser_tab(url: String, title: String) -> BrowserContext {
    let mut ctx = load_context();
    let now = now_secs();
    let tab = BrowserTab {
        url: url.clone(),
        title,
        last_active: now,
    };

    // Remove existing entry for this URL
    ctx.recent_tabs.retain(|t| t.url != url);

    ctx.active_tab = Some(tab.clone());
    ctx.recent_tabs.insert(0, tab);
    // Keep max 20 recent tabs
    ctx.recent_tabs.truncate(20);
    ctx.updated_at = now;

    save_context(&ctx);
    ctx
}

#[tauri::command]
pub fn clear_browser_context() {
    let ctx = BrowserContext {
        active_tab: None,
        recent_tabs: Vec::new(),
        updated_at: now_secs(),
    };
    save_context(&ctx);
}

#[tauri::command]
pub fn get_browser_context_text() -> String {
    let ctx = load_context();
    let mut parts = Vec::new();

    if let Some(ref tab) = ctx.active_tab {
        parts.push(format!("Currently viewing: {} ({})", tab.title, tab.url));
    }

    if !ctx.recent_tabs.is_empty() {
        parts.push(String::from("\nRecent tabs:"));
        for tab in &ctx.recent_tabs {
            parts.push(format!("  - {} ({})", tab.title, tab.url));
        }
    }

    if parts.is_empty() {
        String::from("No browser context available.")
    } else {
        parts.join("\n")
    }
}

// ============================================================================
// Live browser automation via the Chrome DevTools Protocol (CDP).
//
// A managed Chrome/Edge instance is launched headless with a fixed remote
// debugging port. Commands talk to it over CDP (JSON over WebSocket) to
// navigate, click, type, and screenshot. This replaces the previous
// "intent recording only" behavior.
// ============================================================================

use std::process::{Command as ProcCommand, Child};
use std::sync::Mutex;
use std::sync::OnceLock;

const CDP_PORT: u16 = 9222;

struct CdpState {
    child: Mutex<Option<Child>>,
}

fn cdp_state() -> &'static CdpState {
    static STATE: OnceLock<CdpState> = OnceLock::new();
    STATE.get_or_init(|| CdpState {
        child: Mutex::new(None),
    })
}

fn find_chrome() -> Option<String> {
    let candidates: &[&str] = if cfg!(target_os = "windows") {
        &[
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ]
    } else if cfg!(target_os = "macos") {
        &[
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    } else {
        &["google-chrome", "chromium", "chromium-browser", "microsoft-edge"]
    };
    candidates
        .iter()
        .find(|p| std::path::Path::new(p).exists() || which(p))
        .copied()
        .map(|s| s.to_string())
}

fn which(name: &str) -> bool {
    // On non-Windows, check PATH via `command -v`.
    if cfg!(target_os = "windows") {
        return false;
    }
    ProcCommand::new("sh")
        .args(["-c", &format!("command -v {}", name)])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Launches a managed browser instance with remote debugging enabled. Safe to
/// call repeatedly — it returns true if already running.
fn ensure_browser() -> Result<bool, String> {
    if cdp_ping().is_ok() {
        return Ok(false);
    }
    let exe = find_chrome().ok_or_else(|| {
        "No supported browser (Chrome/Edge) found to drive for automation".to_string()
    })?;
    let user_dir = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("browser-profile"))
        .unwrap_or_default();
    let child = ProcCommand::new(&exe)
        .args([
            "--headless=new",
            &format!("--remote-debugging-port={}", CDP_PORT),
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-gpu",
            "--remote-allow-origins=*",
            &format!("--user-data-dir={}", user_dir.to_string_lossy()),
            "about:blank",
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to launch browser: {e}"))?;
    *cdp_state()
        .child
        .lock()
        .map_err(|_| "browser lock poisoned")? = Some(child);
    // Wait for the debugging endpoint to come up.
    for _ in 0..50 {
        if cdp_ping().is_ok() {
            return Ok(true);
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
    Err("Browser launched but debugging endpoint did not come up".to_string())
}

fn cdp_ping() -> Result<(), String> {
    let url = format!("http://127.0.0.1:{}/json/version", CDP_PORT);
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;
    if resp.status().is_success() {
        Ok(())
    } else {
        Err(format!("CDP not ready: HTTP {}", resp.status()))
    }
}

/// Returns the WebSocket debugger URL for the current page.
fn get_page_ws() -> Result<String, String> {
    let url = format!("http://127.0.0.1:{}/json", CDP_PORT);
    let resp = reqwest::blocking::get(&url).map_err(|e| e.to_string())?;
    let targets: Vec<serde_json::Value> = resp
        .json()
        .map_err(|e| format!("Invalid CDP targets: {e}"))?;
    let page = targets
        .iter()
        .find(|t| t.get("type").and_then(|v| v.as_str()) == Some("page"))
        .or_else(|| targets.first());
    page.and_then(|t| t.get("webSocketDebuggerUrl")?.as_str().map(|s| s.to_string()))
        .ok_or_else(|| "No debuggable page target available".to_string())
}

/// Sends one CDP command and returns the `result` object (or error).
async fn cdp_call(method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
    let ws_url = get_page_ws()?;
    let (mut ws, _) = tokio_tungstenite::connect_async(&ws_url)
        .await
        .map_err(|e| format!("CDP connect failed: {e}"))?;
    use futures_util::{SinkExt, StreamExt};
    let id = 1u64;
    let req = serde_json::json!({
        "id": id,
        "method": method,
        "params": params,
    });
    ws.send(tokio_tungstenite::tungstenite::Message::Text(
        req.to_string().into(),
    ))
    .await
    .map_err(|e| format!("CDP send failed: {e}"))?;
    let timeout = std::time::Duration::from_secs(15);
    let started = std::time::Instant::now();
    loop {
        if started.elapsed() > timeout {
            return Err("CDP command timed out".to_string());
        }
        match ws.next().await {
            Some(Ok(tokio_tungstenite::tungstenite::Message::Text(text))) => {
                let v: serde_json::Value = serde_json::from_str(&text).unwrap_or_default();
                if v.get("id").and_then(|x| x.as_u64()) == Some(id) {
                    if let Some(err) = v.get("error") {
                        return Err(format!("CDP error: {err}"));
                    }
                    return Ok(v.get("result").cloned().unwrap_or(serde_json::Value::Null));
                }
            }
            Some(Ok(_)) => continue,
            Some(Err(e)) => return Err(format!("CDP read error: {e}")),
            None => return Err("CDP connection closed".to_string()),
        }
    }
}

#[tauri::command]
pub async fn browser_navigate(url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    let launched = ensure_browser()?;
    let normalized = if url.contains("://") { url.clone() } else { format!("https://{}", url) };
    cdp_call(
        "Page.navigate",
        serde_json::json!({ "url": normalized }),
    )
    .await?;
    // Give the page a moment to load, then update recorded context.
    tokio::time::sleep(std::time::Duration::from_millis(800)).await;
    let title = normalized.split('/').nth(2).unwrap_or(&normalized).to_string();
    let _ = launched;
    set_browser_tab(normalized, title);
    Ok(())
}

#[tauri::command]
pub async fn browser_screenshot() -> Result<String, String> {
    ensure_browser()?;
    let result = cdp_call(
        "Page.captureScreenshot",
        serde_json::json!({ "format": "png" }),
    )
    .await?;
    let b64 = result
        .get("data")
        .and_then(|d| d.as_str())
        .ok_or_else(|| "No screenshot data returned".to_string())?
        .to_string();
    // Persist to disk and return the local path (data URL if that fails).
    let dir = dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("browser"))
        .unwrap_or_default();
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join(format!("shot-{}.png", now_secs()));
    if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &b64) {
        if std::fs::write(&path, bytes).is_ok() {
            return Ok(path.to_string_lossy().to_string());
        }
    }
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
pub async fn browser_click(selector: String) -> Result<(), String> {
    ensure_browser()?;
    let js = format!(
        r#"(function(){{ const el = document.querySelector({:?}); if(!el) return "not-found"; el.scrollIntoView(); const r=el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('click',{{bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}})); return "ok"; }})()"#,
        selector
    );
    cdp_call(
        "Runtime.evaluate",
        serde_json::json!({ "expression": js, "returnByValue": true }),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn browser_type(selector: String, text: String) -> Result<(), String> {
    ensure_browser()?;
    let js = format!(
        r#"(function(){{ const el = document.querySelector({:?}); if(!el) return "not-found"; el.focus(); const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; if (setter && el.tagName==='INPUT') setter.call(el, {:?}); el.dispatchEvent(new Event('input',{{bubbles:true}})); el.dispatchEvent(new Event('change',{{bubbles:true}})); return "ok"; }})()"#,
        selector,
        text
    );
    cdp_call(
        "Runtime.evaluate",
        serde_json::json!({ "expression": js, "returnByValue": true }),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub fn browser_stop() -> Result<(), String> {
    if let Ok(mut guard) = cdp_state().child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
    Ok(())
}
