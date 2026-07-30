// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};
use std::path::Path;

pub struct SqlTool;

impl SqlTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
enum SqlEngine {
    Sqlite,
    Postgres,
    Mysql,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct SqlInput {
    engine: SqlEngine,
    query: String,
    database: String,
    #[serde(default)]
    host: Option<String>,
    #[serde(default)]
    port: Option<u16>,
    #[serde(default)]
    user: Option<String>,
    #[serde(default)]
    password: Option<String>,
    #[serde(default)]
    path: Option<String>,
}

#[async_trait]
impl Tool for SqlTool {
    fn name(&self) -> &str {
        "sql"
    }

    fn description(&self) -> &str {
        "Execute SQL queries against databases. Supports SQLite, PostgreSQL, and MySQL via CLI tools (sqlite3, psql, mysql)."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["engine", "query", "database"],
            "properties": {
                "intent": super::intent_schema_property(),
                "engine": {
                    "type": "string",
                    "enum": ["sqlite", "postgres", "mysql"],
                    "description": "Database engine."
                },
                "query": {
                    "type": "string",
                    "description": "SQL query to execute."
                },
                "database": {
                    "type": "string",
                    "description": "Database name (for postgres/mysql) or file path (for sqlite)."
                },
                "host": {
                    "type": "string",
                    "description": "Database host (default: localhost)."
                },
                "port": {
                    "type": "integer",
                    "description": "Database port."
                },
                "user": {
                    "type": "string",
                    "description": "Database user."
                },
                "password": {
                    "type": "string",
                    "description": "Database password."
                },
                "path": {
                    "type": "string",
                    "description": "Working directory for sqlite .dump/.read commands."
                }
            }
        })
    }

    async fn execute(&self, input: Value, ctx: ToolContext) -> Result<ToolOutput> {
        let params: SqlInput = serde_json::from_value(input)?;

        match params.engine {
            SqlEngine::Sqlite => run_sqlite(&params, &ctx).await,
            SqlEngine::Postgres => run_postgres(&params).await,
            SqlEngine::Mysql => run_mysql(&params).await,
        }
    }
}

async fn run_sqlite(params: &SqlInput, ctx: &ToolContext) -> Result<ToolOutput> {
    let db_path = if params.database.starts_with('/') || params.database.starts_with('.') {
        params.database.clone()
    } else {
        ctx.resolve_path(Path::new(&params.database))
            .to_string_lossy()
            .to_string()
    };

    let mut cmd = tokio::process::Command::new("sqlite3");
    cmd.arg(&db_path);

    let clean_query = params.query.trim().trim_end_matches(';');
    if clean_query.eq_ignore_ascii_case(".tables")
        || clean_query.eq_ignore_ascii_case(".schema")
        || clean_query.starts_with('.')
    {
        cmd.arg(&params.query);
    } else {
        cmd.arg(format!("{};", &params.query));
    }

    cmd.arg("-header");
    cmd.arg("-column");

    let output = cmd.output().await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(&stderr);
    }
    if !output.status.success() && result.is_empty() {
        result = format!("SQLite error (exit code: {:?})", output.status.code());
    }

    Ok(ToolOutput::new(result))
}

async fn run_postgres(params: &SqlInput) -> Result<ToolOutput> {
    let host = params.host.as_deref().unwrap_or("localhost");
    let port = params.port.map(|p| p.to_string()).unwrap_or_else(|| "5432".to_string());

    let mut cmd = tokio::process::Command::new("psql");
    cmd.arg("-h").arg(host);
    cmd.arg("-p").arg(&port);
    cmd.arg("-d").arg(&params.database);
    cmd.arg("-c").arg(&params.query);
    cmd.arg("--no-align");
    cmd.arg("--tuples-only");

    if let Some(user) = &params.user {
        cmd.arg("-U").arg(user);
    }

    let mut envs = vec![];
    if let Some(password) = &params.password {
        envs.push(("PGPASSWORD", password.clone()));
    }

    let output = cmd
        .envs(envs.iter().map(|(k, v)| (k, v.as_str())))
        .output()
        .await?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(&stderr);
    }
    if !output.status.success() && result.is_empty() {
        result = format!("PostgreSQL error (exit code: {:?})", output.status.code());
    }

    Ok(ToolOutput::new(result))
}

async fn run_mysql(params: &SqlInput) -> Result<ToolOutput> {
    let host = params.host.as_deref().unwrap_or("localhost");
    let port = params.port.map(|p| p.to_string()).unwrap_or_else(|| "3306".to_string());

    let mut cmd = tokio::process::Command::new("mysql");
    cmd.arg("-h").arg(host);
    cmd.arg("-P").arg(&port);
    cmd.arg("-D").arg(&params.database);
    cmd.arg("-e").arg(&params.query);

    if let Some(user) = &params.user {
        cmd.arg("-u").arg(user);
    }
    if let Some(password) = &params.password {
        cmd.arg(format!("-p{}", password));
    }

    let output = cmd.output().await?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let mut result = String::new();
    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(&stderr);
    }
    if !output.status.success() && result.is_empty() {
        result = format!("MySQL error (exit code: {:?})", output.status.code());
    }

    Ok(ToolOutput::new(result))
}
