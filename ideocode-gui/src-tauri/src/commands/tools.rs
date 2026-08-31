// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

#[derive(Debug, Serialize)]
pub struct BuildOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SshConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub key_path: Option<String>,
}

#[tauri::command]
pub fn run_build(path: String) -> BuildOutput {
    run_cargo("build", &path)
}

#[tauri::command]
pub fn run_cargo_check(path: String) -> BuildOutput {
    run_cargo("check", &path)
}

/// Run an arbitrary shell command in a directory with a timeout.
#[tauri::command]
pub fn run_command(command: String, cwd: String) -> BuildOutput {
    let timeout_secs = 120;

    let mut child = {
        #[cfg(target_os = "windows")]
        let spawn_result = {
            let shell_args = ["C", &command];
            Command::new("cmd")
                .args(shell_args)
                .current_dir(&cwd)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
        };
        #[cfg(not(target_os = "windows"))]
        let spawn_result = Command::new("sh")
            .arg("-c")
            .arg(&command)
            .current_dir(&cwd)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn();

        match spawn_result {
            Ok(c) => c,
            Err(e) => {
                return BuildOutput {
                    success: false,
                    stdout: String::new(),
                    stderr: format!("Failed to spawn command: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    // Drain stdout/stderr on background threads so a chatty process can never
    // fill the OS pipe buffer and stall (which previously made large outputs
    // hit the timeout).
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let stdout_handle = stdout_pipe.map(|mut pipe| {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = String::new();
            let _ = pipe.read_to_string(&mut buf);
            buf
        })
    });
    let stderr_handle = stderr_pipe.map(|mut pipe| {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = String::new();
            let _ = pipe.read_to_string(&mut buf);
            buf
        })
    });

    let timeout = Duration::from_secs(timeout_secs);
    let start = std::time::Instant::now();
    let status = loop {
        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return BuildOutput {
                success: false,
                stdout: stdout_handle
                    .and_then(|h| h.join().ok())
                    .unwrap_or_default(),
                stderr: if let Some(stderr) = stderr_handle.and_then(|h| h.join().ok()) {
                    format!("Command timed out after {}s\n{}", timeout_secs, stderr)
                } else {
                    format!("Command timed out after {}s", timeout_secs)
                },
                exit_code: -1,
            };
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return BuildOutput {
                    success: false,
                    stdout: stdout_handle
                        .and_then(|h| h.join().ok())
                        .unwrap_or_default(),
                    stderr: format!("Process error: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    let stdout = stdout_handle.and_then(|h| h.join().ok()).unwrap_or_default();
    let stderr = stderr_handle.and_then(|h| h.join().ok()).unwrap_or_default();
    BuildOutput {
        success: status.success(),
        stdout,
        stderr,
        exit_code: status.code().unwrap_or(-1),
    }
}

/// Run npm/yarn/pnpm command. Auto-detects the package manager.
#[tauri::command]
pub fn run_npm(command: String, cwd: String) -> BuildOutput {
    let pm = detect_package_manager(&cwd);
    let full_cmd = format!("{} {}", pm, command);
    run_command(full_cmd, cwd)
}

fn detect_package_manager(cwd: &str) -> String {
    let pnpm_lock = std::path::Path::new(cwd).join("pnpm-lock.yaml");
    let yarn_lock = std::path::Path::new(cwd).join("yarn.lock");
    let bun_lock = std::path::Path::new(cwd).join("bun.lockb");

    if pnpm_lock.exists() {
        "pnpm".to_string()
    } else if yarn_lock.exists() {
        "yarn".to_string()
    } else if bun_lock.exists() {
        "bun".to_string()
    } else {
        "npm".to_string()
    }
}

fn run_cargo(subcommand: &str, cwd: &str) -> BuildOutput {
    let mut child = match Command::new("cargo")
        .args([subcommand])
        .current_dir(cwd)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return BuildOutput {
                success: false,
                stdout: String::new(),
                stderr: format!("Failed to spawn cargo: {}", e),
                exit_code: -1,
            }
        }
    };

    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let stdout_handle = stdout_pipe.map(|mut pipe| {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = String::new();
            let _ = pipe.read_to_string(&mut buf);
            buf
        })
    });
    let stderr_handle = stderr_pipe.map(|mut pipe| {
        std::thread::spawn(move || {
            use std::io::Read;
            let mut buf = String::new();
            let _ = pipe.read_to_string(&mut buf);
            buf
        })
    });

    let timeout = Duration::from_secs(300);
    let start = std::time::Instant::now();
    let status = loop {
        if start.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return BuildOutput {
                success: false,
                stdout: stdout_handle
                    .and_then(|h| h.join().ok())
                    .unwrap_or_default(),
                stderr: "Cargo build timed out after 300s".into(),
                exit_code: -1,
            };
        }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return BuildOutput {
                    success: false,
                    stdout: stdout_handle
                        .and_then(|h| h.join().ok())
                        .unwrap_or_default(),
                    stderr: format!("Cargo process error: {}", e),
                    exit_code: -1,
                }
            }
        }
    };

    let stdout = stdout_handle.and_then(|h| h.join().ok()).unwrap_or_default();
    let stderr = stderr_handle.and_then(|h| h.join().ok()).unwrap_or_default();
    BuildOutput {
        success: status.success(),
        stdout,
        stderr,
        exit_code: status.code().unwrap_or(-1),
    }
}

// ============================================
// Goals
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GoalState {
    pub goal: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub set_at: u64,
    #[serde(default)]
    pub updated_at: u64,
}

const GOAL_FILE: &str = "goal.json";

fn goal_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join(GOAL_FILE))
        .unwrap_or_default()
}

fn load_goal() -> GoalState {
    let path = goal_path();
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_goal(state: &GoalState) -> Result<(), String> {
    let path = goal_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("Failed to create goal dir: {}", e))?;
    }
    let json = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize goal: {}", e))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write goal: {}", e))
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Returns the current active goal (empty when none is set).
#[tauri::command]
pub fn get_goal() -> GoalState {
    load_goal()
}

#[tauri::command]
pub fn set_goal(goal: String) -> Result<(), String> {
    if goal.trim().is_empty() {
        return Err("Goal cannot be empty".to_string());
    }
    let mut state = load_goal();
    let now = now_secs();
    if state.goal.is_empty() {
        state.set_at = now;
    }
    state.goal = goal.trim().to_string();
    state.status = if state.status.is_empty() || state.status == "completed" {
        "in_progress".to_string()
    } else {
        state.status
    };
    state.updated_at = now;
    save_goal(&state)
}

#[tauri::command]
pub fn pause_goal() -> Result<(), String> {
    let mut state = load_goal();
    if state.goal.is_empty() {
        return Err("No active goal to pause".to_string());
    }
    state.status = "paused".to_string();
    state.updated_at = now_secs();
    save_goal(&state)
}

#[tauri::command]
pub fn resume_goal() -> Result<(), String> {
    let mut state = load_goal();
    if state.goal.is_empty() {
        return Err("No active goal to resume".to_string());
    }
    state.status = "in_progress".to_string();
    state.updated_at = now_secs();
    save_goal(&state)
}

#[tauri::command]
pub fn clear_goal() -> Result<(), String> {
    let state = GoalState::default();
    save_goal(&state)
}

// ============================================
// Wiki Generation
// ============================================

#[tauri::command]
pub fn generate_wiki(path: String, language: Option<String>) -> Result<String, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let ext_map = lang_extensions();
    let filter_lang = language.as_deref().filter(|l| !l.is_empty());

    let mut files: Vec<(String, String)> = Vec::new(); // (relative path, language)
    walk_wiki(&root, &root, &mut files, &ext_map);

    if let Some(lang) = filter_lang {
        files.retain(|(_, l)| l == lang);
    }

    files.sort();
    let total = files.len();
    let mut by_lang: HashMap<String, usize> = HashMap::new();
    for (_, l) in &files {
        *by_lang.entry(l.clone()).or_insert(0) += 1;
    }

    let project = root
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let mut out = String::new();
    out.push_str(&format!("# {} — Wiki\n\n", project));
    out.push_str(&format!(
        "> Auto-generated by IDEOCODE on {}.\n\n",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    ));
    out.push_str(&format!(
        "**{} source files** across **{} language(s)**.\n\n",
        total,
        by_lang.len()
    ));

    if !by_lang.is_empty() {
        out.push_str("## Languages\n\n");
        let mut langs: Vec<(String, usize)> = by_lang.into_iter().collect();
        langs.sort_by_key(|b| std::cmp::Reverse(b.1));
        for (lang, count) in langs {
            out.push_str(&format!("- **{}**: {} file(s)\n", lang, count));
        }
        out.push('\n');
    }

    if !files.is_empty() {
        out.push_str("## Files\n\n");
        let mut current_lang = String::new();
        for (rel, lang) in &files {
            if current_lang != *lang {
                current_lang.clone_from(lang);
                out.push_str(&format!("\n### {}\n\n", lang));
            }
            let display = rel.replace('\\', "/");
            out.push_str(&format!("- [`{}`]({})\n", display, display));
        }
        out.push('\n');
    }

    // Write the wiki to disk alongside the project.
    let wiki_path = root.join("WIKI.md");
    if let Err(e) = std::fs::write(&wiki_path, &out) {
        return Err(format!("Failed to write wiki: {}", e));
    }

    Ok(out)
}

fn walk_wiki(
    root: &Path,
    dir: &Path,
    files: &mut Vec<(String, String)>,
    ext_map: &HashMap<String, String>,
) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().map(|n| n.to_string_lossy().to_string());
            let name = match name {
                Some(n) => n,
                None => continue,
            };
            if name == "target"
                || name == "node_modules"
                || name == ".git"
                || name == ".idea"
                || name == ".vscode"
                || name == "dist"
                || name == "build"
                || name.starts_with('.')
            {
                continue;
            }
            if path.is_dir() {
                walk_wiki(root, &path, files, ext_map);
            } else if let Some(lang) = ext_map.get(&name.to_lowercase()) {
                let rel = path
                    .strip_prefix(root)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .to_string();
                files.push((rel, lang.to_string()));
            }
        }
    }
}

fn lang_extensions() -> HashMap<String, String> {
    let mut m = HashMap::new();
    for (lang, exts) in [
        ("Rust", vec!["rs", "toml"]),
        ("TypeScript", vec!["ts", "tsx", "mts", "cts"]),
        ("JavaScript", vec!["js", "jsx", "mjs", "cjs"]),
        ("Python", vec!["py", "pyi"]),
        ("Go", vec!["go"]),
        ("Java", vec!["java"]),
        ("C", vec!["c", "h"]),
        ("C++", vec!["cpp", "hpp", "cc", "cxx", "hxx"]),
        ("C#", vec!["cs"]),
        ("Ruby", vec!["rb"]),
        ("PHP", vec!["php"]),
        ("Swift", vec!["swift"]),
        ("Kotlin", vec!["kt", "kts"]),
        ("Scala", vec!["scala"]),
        ("Shell", vec!["sh", "bash", "zsh", "ps1"]),
        ("SQL", vec!["sql"]),
        ("HTML", vec!["html", "htm", "vue", "svelte"]),
        ("CSS", vec!["css", "scss", "sass", "less"]),
        ("Markdown", vec!["md", "markdown"]),
        ("JSON", vec!["json", "jsonc"]),
        ("YAML", vec!["yaml", "yml"]),
    ] {
        for ext in exts {
            m.insert(ext.to_string(), lang.to_string());
        }
    }
    m
}

// ============================================
// SSH / Remote
// ============================================

/// Registry of active SSH connections keyed by `user@host:port`.
static SSH_CONNECTIONS: Mutex<Option<HashMap<String, String>>> = Mutex::new(None);

fn ssh_control_path(host: &str) -> PathBuf {
    let tmp = std::env::temp_dir();
    let safe = host.replace(['@', ':', '/', '\\'], "_");
    tmp.join(format!("idc-ssh-{}.sock", safe))
}

#[tauri::command]
pub fn ssh_connect(config: SshConfig) -> Result<bool, String> {
    if config.host.trim().is_empty() {
        return Err("Host cannot be empty".to_string());
    }
    let user = if config.user.is_empty() {
        "root".to_string()
    } else {
        config.user
    };
    let key = format!("{}@{}:{}", user, config.host, config.port);
    let sock = ssh_control_path(&key);

    let _ = std::fs::remove_file(&sock);

    let mut cmd = Command::new("ssh");
    cmd.args([
        "-o",
        "ControlMaster=auto",
        "-o",
        "ControlPersist=600",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=8",
        "-o",
        "StrictHostKeyChecking=accept-new",
    ])
    .args(["-S", sock.to_str().unwrap_or_default()])
    .args(["-p", &config.port.to_string()]);
    if let Some(kp) = &config.key_path {
        if !kp.is_empty() {
            cmd.args(["-i", kp]);
        }
    }
    cmd.arg(format!("{}@{}", user, config.host))
        .arg("echo connected")
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let mut reg = SSH_CONNECTIONS.lock().unwrap_or_else(|e| e.into_inner());
            let map = reg.get_or_insert_with(HashMap::new);
            map.insert(key, sock.to_string_lossy().to_string());
            Ok(true)
        }
        Ok(out) => {
            let _ = std::fs::remove_file(&sock);
            Err(format!(
                "SSH connection failed: {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ))
        }
        Err(e) => Err(format!("Failed to run ssh: {}", e)),
    }
}

#[tauri::command]
pub fn ssh_disconnect(host: String) -> Result<(), String> {
    let mut reg = SSH_CONNECTIONS.lock().unwrap();
    if let Some(map) = reg.as_mut() {
        if let Some(sock) = map.remove(&host) {
            let _ = Command::new("ssh")
                .args(["-O", "exit", "-S", &sock, &host])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
            let _ = std::fs::remove_file(&sock);
            return Ok(());
        }
    }
    Err(format!("No active SSH connection to '{}'", host))
}

#[tauri::command]
pub fn ssh_exec(host: String, command: String) -> Result<String, String> {
    let reg = SSH_CONNECTIONS.lock().unwrap();
    let sock = reg
        .as_ref()
        .and_then(|m| m.get(&host))
        .ok_or_else(|| format!("No active SSH connection to '{}'", host))?;

    let output = Command::new("ssh")
        .args(["-S", sock, "-o", "BatchMode=yes", &host, &command])
        .output()
        .map_err(|e| format!("Failed to run ssh: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if !output.status.success() {
        return Err(format!(
            "Command exited with {}:\n{}",
            output.status.code().unwrap_or(-1),
            if stderr.is_empty() { stdout } else { stderr }
        ));
    }
    Ok(stdout)
}
