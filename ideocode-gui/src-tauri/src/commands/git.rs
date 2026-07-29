use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: i32,
    pub behind: i32,
    pub staged: Vec<GitFile>,
    pub modified: Vec<GitFile>,
    pub untracked: Vec<GitFile>,
    pub conflicted: Vec<GitFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFile {
    pub path: String,
    pub status: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiff {
    pub file: String,
    pub hunks: Vec<GitHunk>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub content: String,
}

fn run_git(args: &[&str], cwd: &str) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if !stderr.is_empty() {
            return Err(stderr.to_string());
        }
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatus, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let cwd = root.to_string_lossy().to_string();

    // Get branch name
    let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], &cwd)
        .unwrap_or_else(|_| "main".into())
        .trim()
        .to_string();

    // Get ahead/behind
    let (ahead, behind) = run_git(&["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], &cwd)
        .ok()
        .and_then(|s| {
            let parts: Vec<&str> = s.trim().split_whitespace().collect();
            if parts.len() == 2 {
                Some((parts[0].parse().unwrap_or(0), parts[1].parse().unwrap_or(0)))
            } else {
                None
            }
        })
        .unwrap_or((0, 0));

    // Get status --porcelain
    let status_output = run_git(&["status", "--porcelain"], &cwd).unwrap_or_default();

    let mut staged = Vec::new();
    let mut modified = Vec::new();
    let mut untracked = Vec::new();
    let mut conflicted = Vec::new();

    for line in status_output.lines() {
        if line.len() < 3 {
            continue;
        }
        let index_status = line.chars().nth(0).unwrap_or(' ');
        let worktree_status = line.chars().nth(1).unwrap_or(' ');
        let file_path = line[3..].trim().to_string();

        let git_file = GitFile {
            path: file_path,
            status: format!("{}{}", index_status, worktree_status),
        };

        match index_status {
            '?' => untracked.push(git_file),
            '!' => untracked.push(git_file),
            'U' => conflicted.push(git_file),
            _ => {
                if index_status != ' ' && index_status != '?' {
                    staged.push(git_file);
                } else if worktree_status != ' ' {
                    modified.push(git_file);
                }
            }
        }
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        conflicted,
    })
}

#[tauri::command]
pub fn git_diff(path: String, file: Option<String>) -> Result<String, String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();

    let args: Vec<String> = if let Some(f) = file {
        vec!["diff".into(), f]
    } else {
        vec!["diff".into()]
    };

    run_git(
        &args.iter().map(|s| s.as_str()).collect::<Vec<&str>>(),
        &cwd,
    )
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<(), String> {
    let cwd = PathBuf::from(&path).to_string_lossy().to_string();
    run_git(&["add", "-A"], &cwd)?;
    run_git(&["commit", "-m", &message], &cwd)?;
    Ok(())
}
