//! IDEOCODE Achievement System (D4)
//!
//! Unlock badges for milestones. Toast notification on unlock.
//! Tracks: messages, sessions, lines generated, streaks, tools used, etc.

use crate::tui::color_support::rgb;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Achievement definition.
#[derive(Debug, Clone, PartialEq)]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: AchievementCategory,
    pub unlocked: bool,
    pub unlocked_at: Option<u64>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum AchievementCategory {
    Messages,
    Sessions,
    Code,
    Streak,
    Tools,
    Social,
    Special,
}

impl AchievementCategory {
    pub fn color(&self) -> Color {
        match self {
            AchievementCategory::Messages => neon_cyan(),
            AchievementCategory::Sessions => neon_purple(),
            AchievementCategory::Code => neon_green(),
            AchievementCategory::Streak => neon_orange(),
            AchievementCategory::Tools => neon_magenta(),
            AchievementCategory::Social => neon_blue(),
            AchievementCategory::Special => neon_yellow(),
        }
    }

    pub fn label(&self) -> &str {
        match self {
            AchievementCategory::Messages => "Messages",
            AchievementCategory::Sessions => "Sessions",
            AchievementCategory::Code => "Code",
            AchievementCategory::Streak => "Streak",
            AchievementCategory::Tools => "Tools",
            AchievementCategory::Social => "Social",
            AchievementCategory::Special => "Special",
        }
    }
}

/// Pre-defined achievements.
pub fn default_achievements() -> Vec<Achievement> {
    vec![
        // Messages
        Achievement {
            id: "first_message".to_string(),
            name: "First Contact".to_string(),
            description: "Send your first message".to_string(),
            icon: "🚀".to_string(),
            category: AchievementCategory::Messages,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "message_10".to_string(),
            name: "Getting Started".to_string(),
            description: "Send 10 messages".to_string(),
            icon: "💬".to_string(),
            category: AchievementCategory::Messages,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "message_100".to_string(),
            name: "Century Club".to_string(),
            description: "Send 100 messages".to_string(),
            icon: "🏆".to_string(),
            category: AchievementCategory::Messages,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "message_1000".to_string(),
            name: "Millennium".to_string(),
            description: "Send 1,000 messages".to_string(),
            icon: "👑".to_string(),
            category: AchievementCategory::Messages,
            unlocked: false,
            unlocked_at: None,
        },
        // Sessions
        Achievement {
            id: "session_1".to_string(),
            name: "Hello World".to_string(),
            description: "Complete your first session".to_string(),
            icon: "🌟".to_string(),
            category: AchievementCategory::Sessions,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "session_10".to_string(),
            name: "Regular".to_string(),
            description: "Complete 10 sessions".to_string(),
            icon: "🔄".to_string(),
            category: AchievementCategory::Sessions,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "session_100".to_string(),
            name: "Veteran".to_string(),
            description: "Complete 100 sessions".to_string(),
            icon: "🎖️".to_string(),
            category: AchievementCategory::Sessions,
            unlocked: false,
            unlocked_at: None,
        },
        // Code
        Achievement {
            id: "lines_100".to_string(),
            name: "Code Generator".to_string(),
            description: "Generate 100 lines of code".to_string(),
            icon: "📝".to_string(),
            category: AchievementCategory::Code,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "lines_1000".to_string(),
            name: "Code Master".to_string(),
            description: "Generate 1,000 lines of code".to_string(),
            icon: "⚡".to_string(),
            category: AchievementCategory::Code,
            unlocked: false,
            unlocked_at: None,
        },
        // Streak
        Achievement {
            id: "streak_3".to_string(),
            name: "On Fire".to_string(),
            description: "3-day streak".to_string(),
            icon: "🔥".to_string(),
            category: AchievementCategory::Streak,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "streak_7".to_string(),
            name: "Week Warrior".to_string(),
            description: "7-day streak".to_string(),
            icon: "🔥🔥".to_string(),
            category: AchievementCategory::Streak,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "streak_30".to_string(),
            name: "Monthly Master".to_string(),
            description: "30-day streak".to_string(),
            icon: "🔥🔥🔥".to_string(),
            category: AchievementCategory::Streak,
            unlocked: false,
            unlocked_at: None,
        },
        // Tools
        Achievement {
            id: "tool_first".to_string(),
            name: "Tool User".to_string(),
            description: "Use your first tool".to_string(),
            icon: "🔧".to_string(),
            category: AchievementCategory::Tools,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "tool_10".to_string(),
            name: "Tool Master".to_string(),
            description: "Use 10 different tools".to_string(),
            icon: "⚙️".to_string(),
            category: AchievementCategory::Tools,
            unlocked: false,
            unlocked_at: None,
        },
        // Special
        Achievement {
            id: "easter_egg".to_string(),
            name: "Easter Hunter".to_string(),
            description: "Discover an easter egg".to_string(),
            icon: "🥚".to_string(),
            category: AchievementCategory::Special,
            unlocked: false,
            unlocked_at: None,
        },
        Achievement {
            id: "theme_change".to_string(),
            name: "Fashionista".to_string(),
            description: "Change your theme".to_string(),
            icon: "🎨".to_string(),
            category: AchievementCategory::Special,
            unlocked: false,
            unlocked_at: None,
        },
    ]
}

/// Achievement tracker that manages unlocks.
#[derive(Debug)]
pub struct AchievementTracker {
    achievements: Vec<Achievement>,
    stats: HashMap<String, u64>,
}

impl AchievementTracker {
    pub fn new() -> Self {
        Self {
            achievements: default_achievements(),
            stats: HashMap::new(),
        }
    }

    pub fn increment_stat(&mut self, stat: &str, amount: u64) -> Vec<String> {
        let entry = self.stats.entry(stat.to_string()).or_insert(0);
        *entry += amount;

        // Check for newly unlocked achievements
        let mut newly_unlocked = Vec::new();
        // Snapshot which achievements should unlock before mutating
        let to_unlock: Vec<usize> = self.achievements
            .iter()
            .enumerate()
            .filter(|(_, a)| !a.unlocked && self.check_achievement(a))
            .map(|(i, _)| i)
            .collect();
        for idx in to_unlock {
            self.achievements[idx].unlocked = true;
            self.achievements[idx].unlocked_at = Some(current_timestamp());
            newly_unlocked.push(self.achievements[idx].id.clone());
        }
        newly_unlocked
    }

    fn check_achievement(&self, achievement: &Achievement) -> bool {
        match achievement.id.as_str() {
            "first_message" => *self.stats.get("messages").unwrap_or(&0) >= 1,
            "message_10" => *self.stats.get("messages").unwrap_or(&0) >= 10,
            "message_100" => *self.stats.get("messages").unwrap_or(&0) >= 100,
            "message_1000" => *self.stats.get("messages").unwrap_or(&0) >= 1000,
            "session_1" => *self.stats.get("sessions").unwrap_or(&0) >= 1,
            "session_10" => *self.stats.get("sessions").unwrap_or(&0) >= 10,
            "session_100" => *self.stats.get("sessions").unwrap_or(&0) >= 100,
            "lines_100" => *self.stats.get("lines_generated").unwrap_or(&0) >= 100,
            "lines_1000" => *self.stats.get("lines_generated").unwrap_or(&0) >= 1000,
            "streak_3" => *self.stats.get("streak").unwrap_or(&0) >= 3,
            "streak_7" => *self.stats.get("streak").unwrap_or(&0) >= 7,
            "streak_30" => *self.stats.get("streak").unwrap_or(&0) >= 30,
            "tool_first" => *self.stats.get("tools_used").unwrap_or(&0) >= 1,
            "tool_10" => *self.stats.get("unique_tools").unwrap_or(&0) >= 10,
            "easter_egg" => *self.stats.get("easter_eggs").unwrap_or(&0) >= 1,
            "theme_change" => *self.stats.get("themes_changed").unwrap_or(&0) >= 1,
            _ => false,
        }
    }

    pub fn get_unlocked(&self) -> Vec<&Achievement> {
        self.achievements.iter().filter(|a| a.unlocked).collect()
    }

    pub fn get_locked(&self) -> Vec<&Achievement> {
        self.achievements.iter().filter(|a| !a.unlocked).collect()
    }

    pub fn progress(&self) -> (usize, usize) {
        let unlocked = self.achievements.iter().filter(|a| a.unlocked).count();
        (unlocked, self.achievements.len())
    }
}

/// Render an achievement notification.
pub fn render_achievement_notification(achievement: &Achievement) -> Vec<Line<'static>> {
    let color = achievement.category.color();
    
    vec![
        Line::from("🏆" .repeat(10)),
        Line::from(Span::styled(
            format!("  {} Achievement Unlocked!", achievement.icon),
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  {}", achievement.name),
            Style::default()
                .fg(color)
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("  {}", achievement.description),
            Style::default().fg(dim_color()),
        )),
        Line::from("🏆" .repeat(10)),
    ]
}

/// Render achievement progress bar.
pub fn render_achievement_progress(unlocked: usize, total: usize) -> Line<'static> {
    let progress = if total > 0 {
        unlocked as f32 / total as f32
    } else {
        0.0
    };
    let width = 20;
    let filled = (progress * width as f32) as usize;
    let empty = width - filled;

    let bar: String = "█".repeat(filled) + &"░".repeat(empty);

    Line::from(vec![
        Span::styled(
            format!("{} ", emoji::TROPHY),
            Style::default().fg(neon_yellow()),
        ),
        Span::styled(
            bar,
            Style::default().fg(neon_cyan()),
        ),
        Span::styled(
            format!(" {}/{}", unlocked, total),
            Style::default()
                .fg(dim_color())
                .add_modifier(Modifier::BOLD),
        ),
    ])
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn achievement_tracker_creation() {
        let tracker = AchievementTracker::new();
        let (unlocked, total) = tracker.progress();
        assert_eq!(unlocked, 0);
        assert_eq!(total, 16);
    }

    #[test]
    fn first_message_unlock() {
        let mut tracker = AchievementTracker::new();
        let new = tracker.increment_stat("messages", 1);
        assert!(!new.is_empty());
        assert_eq!(new[0], "first_message");
    }

    #[test]
    fn ten_messages_unlock() {
        let mut tracker = AchievementTracker::new();
        tracker.increment_stat("messages", 9);
        let new = tracker.increment_stat("messages", 1);
        assert!(new.iter().any(|id| id == "message_10"));
    }
}
