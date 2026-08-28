use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundTask {
    pub id: String,
    pub name: String,
    pub command: String,
    pub cwd: String,
    pub status: TaskStatus,
    pub progress: f64,
    pub output: String,
    pub created_at: u64,
    pub started_at: Option<u64>,
    pub finished_at: Option<u64>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

fn tasks_path() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".IDEOCODE").join("background-tasks.json"))
        .unwrap_or_default()
}

fn load_tasks() -> Vec<BackgroundTask> {
    let path = tasks_path();
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        Vec::new()
    }
}

fn save_tasks(tasks: &[BackgroundTask]) {
    let path = tasks_path();
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(tasks) {
        let _ = std::fs::write(&path, json);
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn rand_suffix() -> String {
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};
    let s = RandomState::new();
    let mut h = s.build_hasher();
    h.write_u64(now_secs());
    format!("{:08x}", h.finish())
}

#[tauri::command]
pub fn create_task(name: String, command: String, cwd: String) -> BackgroundTask {
    let task = BackgroundTask {
        id: format!("task-{}-{}", now_secs(), rand_suffix()),
        name,
        command,
        cwd,
        status: TaskStatus::Pending,
        progress: 0.0,
        output: String::new(),
        created_at: now_secs(),
        started_at: None,
        finished_at: None,
        exit_code: None,
    };
    let mut tasks = load_tasks();
    tasks.push(task.clone());
    save_tasks(&tasks);
    task
}

#[tauri::command]
pub fn start_task(id: String) -> Result<BackgroundTask, String> {
    let mut tasks = load_tasks();
    let idx = tasks
        .iter()
        .position(|t| t.id == id)
        .ok_or("Task not found")?;
    if tasks[idx].status != TaskStatus::Pending {
        return Err("Task is not pending".into());
    }
    let command = tasks[idx].command.clone();
    let cwd = tasks[idx].cwd.clone();
    tasks[idx].status = TaskStatus::Running;
    tasks[idx].started_at = Some(now_secs());
    save_tasks(&tasks);

    let task_id = id.clone();
    std::thread::spawn(move || {
        let child = spawn_command(&command, &cwd);
        match child {
            Ok(proc) => {
                let output = proc.wait_with_output();
                let mut tasks = load_tasks();
                if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
                    task.finished_at = Some(now_secs());
                    match output {
                        Ok(o) => {
                            task.output = format!(
                                "{}\n{}",
                                String::from_utf8_lossy(&o.stdout),
                                String::from_utf8_lossy(&o.stderr)
                            );
                            task.exit_code = o.status.code();
                            task.status = if o.status.success() {
                                TaskStatus::Completed
                            } else {
                                TaskStatus::Failed
                            };
                            task.progress = 100.0;
                        }
                        Err(e) => {
                            task.output = format!("Error: {e}");
                            task.status = TaskStatus::Failed;
                        }
                    }
                }
                save_tasks(&tasks);
            }
            Err(e) => {
                let mut tasks = load_tasks();
                if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
                    task.status = TaskStatus::Failed;
                    task.output = format!("Failed to spawn: {e}");
                    task.finished_at = Some(now_secs());
                }
                save_tasks(&tasks);
            }
        }
    });

    let tasks = load_tasks();
    tasks
        .into_iter()
        .find(|t| t.id == id)
        .ok_or_else(|| "Task not found after start".into())
}

#[tauri::command]
pub fn cancel_task(id: String) -> Result<BackgroundTask, String> {
    let mut tasks = load_tasks();
    let idx = tasks
        .iter()
        .position(|t| t.id == id)
        .ok_or("Task not found")?;
    tasks[idx].status = TaskStatus::Cancelled;
    tasks[idx].finished_at = Some(now_secs());
    let result = tasks[idx].clone();
    save_tasks(&tasks);
    Ok(result)
}

#[tauri::command]
pub fn update_task_progress(id: String, progress: f64) -> Result<BackgroundTask, String> {
    let mut tasks = load_tasks();
    let idx = tasks
        .iter()
        .position(|t| t.id == id)
        .ok_or("Task not found")?;
    tasks[idx].progress = progress.clamp(0.0, 100.0);
    let result = tasks[idx].clone();
    save_tasks(&tasks);
    Ok(result)
}

#[tauri::command]
pub fn list_tasks() -> Vec<BackgroundTask> {
    load_tasks()
}

#[tauri::command]
pub fn delete_task(id: String) -> Result<(), String> {
    let mut tasks = load_tasks();
    let before = tasks.len();
    tasks.retain(|t| t.id != id);
    if tasks.len() == before {
        return Err("Task not found".into());
    }
    save_tasks(&tasks);
    Ok(())
}

#[tauri::command]
pub fn clear_finished_tasks() {
    let mut tasks = load_tasks();
    tasks.retain(|t| t.status == TaskStatus::Pending || t.status == TaskStatus::Running);
    save_tasks(&tasks);
}

fn spawn_command(command: &str, cwd: &str) -> Result<std::process::Child, std::io::Error> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", command])
            .current_dir(cwd)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("sh")
            .arg("-c")
            .arg(command)
            .current_dir(cwd)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
    }
}

/// Runs an automation script/command as a background task.
#[tauri::command]
pub fn run_automation(
    name: String,
    command: String,
    cwd: String,
) -> Result<BackgroundTask, String> {
    // Create and start the task immediately
    let task = create_task(name, command.clone(), cwd.clone());
    start_task(task.id.clone())
}
