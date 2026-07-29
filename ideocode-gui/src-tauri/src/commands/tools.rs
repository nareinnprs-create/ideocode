use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct BuildOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

#[tauri::command]
pub fn run_build(path: String) -> BuildOutput {
    run_cargo("build", &path)
}

#[tauri::command]
pub fn run_cargo_check(path: String) -> BuildOutput {
    run_cargo("check", &path)
}

fn run_cargo(subcommand: &str, cwd: &str) -> BuildOutput {
    let output = Command::new("cargo")
        .args([subcommand])
        .current_dir(cwd)
        .output();

    match output {
        Ok(out) => BuildOutput {
            success: out.status.success(),
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            exit_code: out.status.code().unwrap_or(-1),
        },
        Err(e) => BuildOutput {
            success: false,
            stdout: String::new(),
            stderr: format!("Failed to run cargo: {}", e),
            exit_code: -1,
        },
    }
}
