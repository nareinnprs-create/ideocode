// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::ChatState;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn log_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("logs"))
        .unwrap_or_else(|| {
            std::env::current_dir()
                .unwrap_or_default()
                .join(".IDEOCODE")
                .join("logs")
        })
}

fn log_to_file(filename: &str, msg: &str) {
    let dir = log_dir();
    let _ = fs::create_dir_all(&dir);
    let path = dir.join(filename);
    let _ = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .and_then(|mut f| f.write_all(msg.as_bytes()));
}

fn init_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let msg = format!("[{ts}] PANIC: {info}\n");
        log_to_file("gui-panic.log", &msg);
    }));
}

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn log_error(msg: String) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    log_to_file("gui-js-errors.log", &format!("[{ts}] {msg}\n"));
}

fn main() {
    init_panic_hook();

    if let Err(e) = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            use tauri::Emitter;
            let app_handle_status = app.handle().clone();
            ideocode_provider_baanzon::set_status_callback(move |status| {
                let _ = app_handle_status.emit("baanzon://status_changed", status);
            });

            let app_handle_log = app.handle().clone();
            ideocode_provider_baanzon::set_log_callback(move |log_line| {
                let _ = app_handle_log.emit("baanzon://log_line", log_line);
            });

            tauri::async_runtime::spawn(async move {
                let workspace = dirs::home_dir().unwrap_or_default().join(".IDEOCODE");
                let config = ideocode_provider_baanzon::BaanzonConfig::new(workspace);
                let _ = config.generate_env();
                // Ensures the engine is installed/provisioned and hands ongoing
                // recovery to the detached self-heal supervisor.
                let _ = ideocode_provider_baanzon::bootstrap_engine();
            });
            Ok(())
        })
        .manage(ChatState::new())
        .invoke_handler(tauri::generate_handler![
            get_version,
            log_error,
            commands::send_message,
            commands::stream_chat,
            commands::stream_inline_edit,
            commands::interrupt_stream,
            commands::approve_tools,
            commands::deny_tools,
            commands::undo_file_snapshots,
            commands::save_partial_message,
            commands::compact_session,
            commands::get_messages,
            commands::clear_messages,
            commands::regenerate_last_message,
            commands::edit_last_message,
            commands::load_session,
            commands::rename_session,
            commands::list_sessions,
            commands::delete_session,
            commands::export_session,
            commands::inline_completion,
            commands::get_file_tree,
            commands::read_file,
            commands::write_file,
            commands::file_exists,
            commands::search_files,
            commands::create_file,
            commands::create_directory,
            commands::delete_path,
            commands::rename_path,
            commands::open_workspace,
            commands::save_workspace_path,
            commands::load_workspace_path,
            commands::git_status,
            commands::git_diff,
            commands::git_commit,
            commands::git_add,
            commands::git_unstage,
            commands::git_branches,
            commands::git_checkout,
            commands::git_stash,
            commands::git_pull,
            commands::git_push,
            commands::run_build,
            commands::run_cargo_check,
            commands::run_command,
            commands::run_npm,
            commands::list_providers,
            commands::get_provider_status,
            commands::gateway_status,
            commands::get_settings,
            commands::update_settings,
            commands::reset_settings,
            commands::is_first_launch,
            // Memory
            commands::list_memories,
            commands::store_memory,
            commands::search_memories,
            commands::delete_memory,
            // RAG / Code Search
            commands::search_contents,
            commands::search_semantic,
            commands::index_directory,
            // Background Tasks
            commands::create_task,
            commands::start_task,
            commands::cancel_task,
            commands::update_task_progress,
            commands::list_tasks,
            commands::delete_task,
            commands::clear_finished_tasks,
            // Issues
            commands::list_issues,
            commands::search_issues,
            commands::fetch_github_issues,
            // Browser
            commands::get_browser_context,
            commands::set_browser_tab,
            commands::clear_browser_context,
            commands::get_browser_context_text,
            // Git Graph
            commands::git_graph,
            commands::git_log_graph,
            // Browser Automation
            commands::browser_navigate,
            commands::browser_screenshot,
            commands::browser_click,
            commands::browser_type,
            commands::browser_stop,
            // Goals
            commands::get_goal,
            commands::set_goal,
            commands::pause_goal,
            commands::resume_goal,
            commands::clear_goal,
            // Wiki
            commands::generate_wiki,
            // SSH/Remote
            commands::ssh_connect,
            commands::ssh_disconnect,
            commands::ssh_exec,
            // Automation
            commands::run_automation,
        ])
        .run(tauri::generate_context!())
    {
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let msg = format!("[{ts}] Tauri runtime error: {e}\n");
        log_to_file("gui-error.log", &msg);
    }
}
