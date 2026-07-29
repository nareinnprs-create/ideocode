#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::ChatState;

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ChatState::new())
        .invoke_handler(tauri::generate_handler![
            // General
            get_version,
            // Chat
            commands::send_message,
            commands::get_messages,
            commands::clear_messages,
            commands::list_sessions,
            commands::delete_session,
            commands::export_session,
            // Files
            commands::get_file_tree,
            commands::read_file,
            commands::write_file,
            commands::file_exists,
            commands::search_files,
            // Git
            commands::git_status,
            commands::git_diff,
            commands::git_commit,
            // Tools
            commands::run_build,
            commands::run_cargo_check,
            // Providers
            commands::list_providers,
            commands::get_provider_status,
            // Settings
            commands::get_settings,
            commands::update_settings,
            commands::is_first_launch,
        ])
        .run(tauri::generate_context!())
        .expect("error while running IDEOCODE GUI");
}
