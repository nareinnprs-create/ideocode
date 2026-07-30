// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use super::{Tool, ToolContext, ToolOutput};
use anyhow::Result;
use async_trait::async_trait;
use serde::Deserialize;
use serde_json::{Value, json};

pub struct NotifyTool;

impl NotifyTool {
    pub fn new() -> Self {
        Self
    }
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct NotifyInput {
    title: String,
    message: String,
    #[serde(default)]
    urgency: Option<String>,
}

#[async_trait]
impl Tool for NotifyTool {
    fn name(&self) -> &str {
        "notify"
    }

    fn description(&self) -> &str {
        "Send desktop notifications. Supports Windows (PowerShell), macOS (osascript), and Linux (notify-send)."
    }

    fn parameters_schema(&self) -> Value {
        json!({
            "type": "object",
            "required": ["title", "message"],
            "properties": {
                "intent": super::intent_schema_property(),
                "title": {
                    "type": "string",
                    "description": "Notification title."
                },
                "message": {
                    "type": "string",
                    "description": "Notification body text."
                },
                "urgency": {
                    "type": "string",
                    "enum": ["low", "normal", "critical"],
                    "description": "Urgency level (Linux only)."
                }
            }
        })
    }

    async fn execute(&self, input: Value, _ctx: ToolContext) -> Result<ToolOutput> {
        let params: NotifyInput = serde_json::from_value(input)?;

        #[cfg(windows)]
        {
            let ps_script = format!(
                "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null; \
                 $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
                 $textNodes = $template.GetElementsByTagName('text'); \
                 $textNodes.Item(0).AppendChild($template.CreateTextNode('{}')) > $null; \
                 $textNodes.Item(1).AppendChild($template.CreateTextNode('{}')) > $null; \
                 $toast = [Windows.UI.Notifications.ToastNotification]::new($template); \
                 [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier().Show($toast)",
                params.title.replace('\'', "''"),
                params.message.replace('\'', "''")
            );
            tokio::process::Command::new("powershell")
                .args(["-Command", &ps_script])
                .output()
                .await?;
        }

        #[cfg(target_os = "macos")]
        {
            let script = format!(
                "display notification \"{}\" with title \"{}\"",
                params.message.replace('"', "\\\""),
                params.title.replace('"', "\\\"")
            );
            tokio::process::Command::new("osascript")
                .args(["-e", &script])
                .output()
                .await?;
        }

        #[cfg(target_os = "linux")]
        {
            let mut cmd = tokio::process::Command::new("notify-send");
            cmd.arg(&params.title);
            cmd.arg(&params.message);
            if let Some(urgency) = &params.urgency {
                cmd.arg(format!("--urgency={}", urgency));
            }
            cmd.output().await?;
        }

        Ok(ToolOutput::new(format!(
            "Notification sent: {} — {}",
            params.title, params.message
        )))
    }
}
