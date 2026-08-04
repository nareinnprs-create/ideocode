// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! IDEOCODE Personality Quiz (P6)
//!
//! First-run quiz to determine optimal personality mode.
//! 5 questions about coding style and preferences.

use crate::tui::ui_personality_modes::PersonalityMode;
use ideocode_tui_style::theme::*;
use ratatui::prelude::*;
use ratatui::text::Line;

#[derive(Debug, Clone)]
pub struct QuizQuestion {
    pub question: String,
    pub options: Vec<QuizOption>,
}

#[derive(Debug, Clone)]
pub struct QuizOption {
    pub text: String,
    pub scores: PersonalityScores,
}

#[derive(Debug, Clone, Default)]
pub struct PersonalityScores {
    pub professional: u32,
    pub casual: u32,
    pub genz: u32,
    pub academic: u32,
    pub witty: u32,
    pub zen: u32,
}

impl PersonalityScores {
    pub fn determine_mode(&self) -> PersonalityMode {
        let scores = vec![
            (self.professional, PersonalityMode::Professional),
            (self.casual, PersonalityMode::Casual),
            (self.genz, PersonalityMode::GenZ),
            (self.academic, PersonalityMode::Academic),
            (self.witty, PersonalityMode::Witty),
            (self.zen, PersonalityMode::Zen),
        ];

        scores
            .into_iter()
            .max_by_key(|(score, _)| *score)
            .map(|(_, mode)| mode)
            .unwrap_or(PersonalityMode::Professional)
    }
}

/// Get the quiz questions.
pub fn quiz_questions() -> Vec<QuizQuestion> {
    vec![
        QuizQuestion {
            question: "How do you prefer your code to be explained?".to_string(),
            options: vec![
                QuizOption {
                    text: "Clearly and professionally".to_string(),
                    scores: PersonalityScores {
                        professional: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "In a relaxed, friendly way".to_string(),
                    scores: PersonalityScores {
                        casual: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "With real talk and slang".to_string(),
                    scores: PersonalityScores {
                        genz: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "With academic rigor".to_string(),
                    scores: PersonalityScores {
                        academic: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "With humor and wit".to_string(),
                    scores: PersonalityScores {
                        witty: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "With calm wisdom".to_string(),
                    scores: PersonalityScores {
                        zen: 3,
                        ..Default::default()
                    },
                },
            ],
        },
        QuizQuestion {
            question: "What's your ideal coding atmosphere?".to_string(),
            options: vec![
                QuizOption {
                    text: "Office with classical music".to_string(),
                    scores: PersonalityScores {
                        professional: 2,
                        academic: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Coffee shop with lo-fi beats".to_string(),
                    scores: PersonalityScores {
                        casual: 2,
                        zen: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Late night with energy drinks".to_string(),
                    scores: PersonalityScores {
                        genz: 2,
                        witty: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Library with complete silence".to_string(),
                    scores: PersonalityScores {
                        academic: 2,
                        zen: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Comedy club while debugging".to_string(),
                    scores: PersonalityScores {
                        witty: 2,
                        casual: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Mountain temple at dawn".to_string(),
                    scores: PersonalityScores {
                        zen: 3,
                        ..Default::default()
                    },
                },
            ],
        },
        QuizQuestion {
            question: "When you encounter an error, you...".to_string(),
            options: vec![
                QuizOption {
                    text: "Read the docs methodically".to_string(),
                    scores: PersonalityScores {
                        professional: 1,
                        academic: 2,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Google it casually".to_string(),
                    scores: PersonalityScores {
                        casual: 2,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Ask ChatGPT fr fr".to_string(),
                    scores: PersonalityScores {
                        genz: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Analyze the stack trace deeply".to_string(),
                    scores: PersonalityScores {
                        academic: 2,
                        professional: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Make a joke about it".to_string(),
                    scores: PersonalityScores {
                        witty: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Take a deep breath and reflect".to_string(),
                    scores: PersonalityScores {
                        zen: 3,
                        ..Default::default()
                    },
                },
            ],
        },
        QuizQuestion {
            question: "What do you value most in an AI assistant?".to_string(),
            options: vec![
                QuizOption {
                    text: "Accuracy and reliability".to_string(),
                    scores: PersonalityScores {
                        professional: 2,
                        academic: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Ease of use".to_string(),
                    scores: PersonalityScores {
                        casual: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Being relatable".to_string(),
                    scores: PersonalityScores {
                        genz: 2,
                        casual: 1,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Deep knowledge".to_string(),
                    scores: PersonalityScores {
                        academic: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Entertainment value".to_string(),
                    scores: PersonalityScores {
                        witty: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "Patience and mindfulness".to_string(),
                    scores: PersonalityScores {
                        zen: 3,
                        ..Default::default()
                    },
                },
            ],
        },
        QuizQuestion {
            question: "Choose an emoji that resonates with you:".to_string(),
            options: vec![
                QuizOption {
                    text: "💼".to_string(),
                    scores: PersonalityScores {
                        professional: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "😎".to_string(),
                    scores: PersonalityScores {
                        casual: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "🔥".to_string(),
                    scores: PersonalityScores {
                        genz: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "📚".to_string(),
                    scores: PersonalityScores {
                        academic: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "😄".to_string(),
                    scores: PersonalityScores {
                        witty: 3,
                        ..Default::default()
                    },
                },
                QuizOption {
                    text: "🧘".to_string(),
                    scores: PersonalityScores {
                        zen: 3,
                        ..Default::default()
                    },
                },
            ],
        },
    ]
}

/// Render quiz question.
pub fn render_quiz_question(
    question: &QuizQuestion,
    selected: usize,
    question_num: usize,
    total: usize,
) -> Vec<Line<'static>> {
    let mut lines = Vec::new();

    // Header
    lines.push(Line::from(Span::styled(
        "🎭 Personality Quiz",
        Style::default()
            .fg(neon_cyan())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(format!("Question {}/{}", question_num, total)));
    lines.push(Line::from(""));

    // Question
    lines.push(Line::from(Span::styled(
        question.question.clone(),
        Style::default()
            .fg(neon_green())
            .add_modifier(Modifier::BOLD),
    )));
    lines.push(Line::from(""));

    // Options
    for (i, option) in question.options.iter().enumerate() {
        let is_selected = i == selected;
        lines.push(Line::from(vec![
            Span::styled(
                if is_selected { "▸ " } else { "  " },
                Style::default().fg(if is_selected {
                    neon_green()
                } else {
                    dim_color()
                }),
            ),
            Span::styled(
                option.text.clone(),
                Style::default()
                    .fg(if is_selected {
                        neon_cyan()
                    } else {
                        dim_color()
                    })
                    .add_modifier(if is_selected {
                        Modifier::BOLD
                    } else {
                        Modifier::empty()
                    }),
            ),
        ]));
    }

    lines
}

/// Render quiz result.
pub fn render_quiz_result(mode: &PersonalityMode) -> Vec<Line<'static>> {
    vec![
        Line::from(Span::styled(
            "🎉 Quiz Complete!",
            Style::default()
                .fg(neon_yellow())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from(Span::styled(
            format!("Your personality mode: {}", mode.display_name()),
            Style::default()
                .fg(mode.color())
                .add_modifier(Modifier::BOLD),
        )),
        Line::from(Span::styled(
            format!("{} {}", mode.icon(), mode.display_name()),
            Style::default().fg(mode.color()),
        )),
        Line::from(""),
        Line::from(Span::styled(
            "You can change this anytime with /mode",
            Style::default().fg(dim_color()),
        )),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quiz_has_questions() {
        let questions = quiz_questions();
        assert_eq!(questions.len(), 5);
    }

    #[test]
    fn scores_determine_mode() {
        let scores = PersonalityScores {
            genz: 15,
            ..Default::default()
        };
        assert_eq!(scores.determine_mode(), PersonalityMode::GenZ);
    }
}
