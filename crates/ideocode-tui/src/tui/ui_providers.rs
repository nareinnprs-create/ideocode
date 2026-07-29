use crossterm::event::{KeyCode, KeyModifiers};
use ratatui::prelude::*;
use ratatui::widgets::*;

fn rgb(r: u8, g: u8, b: u8) -> Color { Color::Rgb(r, g, b) }

const PANEL_BG: Color = Color::Rgb(12, 12, 28);
const PANEL_BORDER: Color = Color::Rgb(60, 60, 100);
const HEADER_FG: Color = Color::Rgb(0, 255, 200);
const ACTIVE_FG: Color = Color::Rgb(0, 255, 128);
const INACTIVE_FG: Color = Color::Rgb(120, 120, 160);
const KEY_FG: Color = Color::Rgb(255, 200, 0);
const ACCENT_FG: Color = Color::Rgb(0, 180, 255);
const DIM_FG: Color = Color::Rgb(80, 80, 110);
const SUCCESS_FG: Color = Color::Rgb(0, 255, 100);
const WARN_FG: Color = Color::Yellow;

const BUILTIN_PROVIDERS: &[(&str, &str, &str)] = &[
    ("claude", "Anthropic (Claude)", "claude-fable-5"),
    ("openai", "OpenAI (GPT)", "gpt-5.6-sol"),
    ("copilot", "GitHub Copilot", "claude-sonnet-4"),
    ("gemini", "Google Gemini", "gemini-2.5-pro"),
    ("cursor", "Cursor", "cursor-default"),
    ("bedrock", "AWS Bedrock", "claude-sonnet-4"),
    ("openrouter", "OpenRouter (200+)", "varies"),
    ("antigravity", "Antigravity", "default"),
];

const COMPATIBLE_PROVIDERS: &[(&str, &str, &str, &str)] = &[
    ("github-models", "GitHub Models", "gpt-4o", "GITHUB_TOKEN"),
    ("groq", "Groq", "llama-3.1-8b-instant", "GROQ_API_KEY"),
    ("togetherai", "Together AI", "meta-llama-3.1-8b-instruct", "TOGETHER_API_KEY"),
    ("fireworks", "Fireworks AI", "accounts/fireworks/models/default", "FIREWORKS_API_KEY"),
    ("deepseek", "DeepSeek", "deepseek-chat", "DEEPSEEK_API_KEY"),
    ("sambanova", "SambaNova", "Meta-Llama-3.1-8B-Instruct", "SAMBANOVA_API_KEY"),
    ("mistral", "Mistral", "mistral-large-latest", "MISTRAL_API_KEY"),
    ("perplexity", "Perplexity", "sonar-medium-online", "PERPLEXITY_API_KEY"),
    ("replicate", "Replicate", "meta/meta-llama-3.1-8b-instruct", "REPLICATE_API_TOKEN"),
    ("zhipu", "Zhipu AI", "glm-4-plus", "ZHIPU_DIRECT_API_KEY"),
    ("cerebras", "Cerebras", "llama3.1-8b", "CEREBRAS_API_KEY"),
    ("nvidia", "NVIDIA NIM", "deepseek-ai/deepseek-r1", "NVIDIA_API_KEY"),
    ("xai", "xAI (Grok)", "grok-2", "XAI_API_KEY"),
    ("minimax", "MiniMax", "MiniMax-M2.7", "MINIMAX_API_KEY"),
    ("huggingface", "Hugging Face", "zai-org/GLM-4.7", "HF_TOKEN"),
    ("moonshot", "Moonshot AI", "kimi-k2.5", "MOONSHOT_API_KEY"),
    ("nebius", "Nebius", "gpt-oss-120b", "NEBIUS_API_KEY"),
    ("scaleway", "Scaleway", "qwen3-coder", "SCALEWAY_API_KEY"),
    ("qwen", "Qwen (Alibaba)", "qwen-max", "DASHSCOPE_API_KEY"),
    ("lmstudio", "LM Studio (local)", "any", ""),
    ("ollama", "Ollama (local)", "any", ""),
];

#[derive(Clone, PartialEq)]
pub enum ProviderTab {
    Core,
    Compatible,
    Custom,
    Test,
}

pub struct ProviderPanelState {
    pub visible: bool,
    pub selected: usize,
    pub scroll: usize,
    pub tab: ProviderTab,
    pub test_provider: String,
    pub test_result: Option<String>,
    pub adding: bool,
    pub add_name: String,
    pub add_url: String,
    pub add_key_env: String,
    pub add_model: String,
    pub add_focus: usize,
}

impl Default for ProviderPanelState {
    fn default() -> Self {
        Self {
            visible: false,
            selected: 0,
            scroll: 0,
            tab: ProviderTab::Core,
            test_provider: String::new(),
            test_result: None,
            adding: false,
            add_name: String::new(),
            add_url: String::new(),
            add_key_env: String::new(),
            add_model: String::new(),
            add_focus: 0,
        }
    }
}

pub fn toggle_provider_panel(state: &mut ProviderPanelState) {
    state.visible = !state.visible;
    if state.visible {
        state.selected = 0;
        state.scroll = 0;
    }
}

pub fn handle_provider_keys(state: &mut ProviderPanelState, code: KeyCode, _modifiers: KeyModifiers) -> bool {
    if !state.visible {
        return false;
    }

    if state.adding {
        match code {
            KeyCode::Esc => {
                state.adding = false;
                return true;
            }
            KeyCode::Up => {
                if state.add_focus > 0 {
                    state.add_focus -= 1;
                }
                return true;
            }
            KeyCode::Down => {
                if state.add_focus < 3 {
                    state.add_focus += 1;
                }
                return true;
            }
            KeyCode::Tab => {
                state.add_focus = (state.add_focus + 1) % 4;
                return true;
            }
            KeyCode::BackTab => {
                state.add_focus = if state.add_focus == 0 { 3 } else { state.add_focus - 1 };
                return true;
            }
            KeyCode::Enter => {
                state.adding = false;
                state.test_result = Some(format!(
                    "Custom provider '{}' saved. Set {} env var with your API key.",
                    state.add_name, state.add_key_env
                ));
                return true;
            }
            _ => {}
        }
        return false;
    }

    match code {
        KeyCode::Esc | KeyCode::Char('q') => {
            state.visible = false;
            return true;
        }
        KeyCode::Char('1') => {
            state.tab = ProviderTab::Core;
            state.selected = 0;
            state.scroll = 0;
            return true;
        }
        KeyCode::Char('2') => {
            state.tab = ProviderTab::Compatible;
            state.selected = 0;
            state.scroll = 0;
            return true;
        }
        KeyCode::Char('3') => {
            state.tab = ProviderTab::Custom;
            state.selected = 0;
            state.scroll = 0;
            return true;
        }
        KeyCode::Char('4') => {
            state.tab = ProviderTab::Test;
            state.selected = 0;
            state.scroll = 0;
            return true;
        }
        KeyCode::Up | KeyCode::Char('k') => {
            if state.selected > 0 {
                state.selected -= 1;
            }
            return true;
        }
        KeyCode::Down | KeyCode::Char('j') => {
            let max = match state.tab {
                ProviderTab::Core => BUILTIN_PROVIDERS.len(),
                ProviderTab::Compatible => COMPATIBLE_PROVIDERS.len(),
                ProviderTab::Custom => 0,
                ProviderTab::Test => COMPATIBLE_PROVIDERS.len(),
            };
            if max > 0 && state.selected < max - 1 {
                state.selected += 1;
            }
            return true;
        }
        KeyCode::PageUp => {
            state.selected = state.selected.saturating_sub(10);
            return true;
        }
        KeyCode::PageDown => {
            let max = match state.tab {
                ProviderTab::Core => BUILTIN_PROVIDERS.len(),
                ProviderTab::Compatible => COMPATIBLE_PROVIDERS.len(),
                ProviderTab::Custom => 0,
                ProviderTab::Test => COMPATIBLE_PROVIDERS.len(),
            };
            if max > 0 {
                state.selected = (state.selected + 10).min(max - 1);
            }
            return true;
        }
        KeyCode::Home => {
            state.selected = 0;
            return true;
        }
        KeyCode::End => {
            let max = match state.tab {
                ProviderTab::Core => BUILTIN_PROVIDERS.len(),
                ProviderTab::Compatible => COMPATIBLE_PROVIDERS.len(),
                ProviderTab::Custom => 0,
                ProviderTab::Test => COMPATIBLE_PROVIDERS.len(),
            };
            if max > 0 {
                state.selected = max - 1;
            }
            return true;
        }
        KeyCode::Char('a') => {
            if state.tab == ProviderTab::Custom {
                state.adding = true;
                state.add_focus = 0;
                state.add_name.clear();
                state.add_url.clear();
                state.add_key_env.clear();
                state.add_model.clear();
            }
            return true;
        }
        KeyCode::Char('t') => {
            if state.tab == ProviderTab::Test
                && state.selected < COMPATIBLE_PROVIDERS.len() {
                    state.test_provider = COMPATIBLE_PROVIDERS[state.selected].0.to_string();
                    state.test_result = Some(format!(
                        "Testing {} API endpoint...",
                        COMPATIBLE_PROVIDERS[state.selected].1
                    ));
                }
            return true;
        }
        KeyCode::Char('?') | KeyCode::Char('/') => {
            state.test_result = Some(
                "Provider Manager Help:\n\
                 [1-4] Switch tabs | [↑/↓] Navigate | [a] Add custom\n\
                 [t] Test endpoint | [Esc/q] Close\n\n\
                 Tabs:\n\
                 [1] Core - 8 built-in providers (Claude, OpenAI, etc.)\n\
                 [2] Compatible - 21+ OpenAI-compatible (DeepSeek, Groq, etc.)\n\
                 [3] Custom - Your custom providers\n\
                 [4] Test - Test provider endpoints"
                    .to_string(),
            );
            return true;
        }
        _ => {}
    }
    false
}

pub fn draw_provider_panel(f: &mut Frame, area: Rect, state: &ProviderPanelState) {
    let block = Block::default()
        .title(" Provider Manager ")
        .title_style(Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(PANEL_BORDER))
        .style(Style::default().bg(PANEL_BG));

    let inner = block.inner(area);
    f.render_widget(block, area);

    if inner.width < 10 || inner.height < 5 {
        return;
    }

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(6),
            Constraint::Length(if state.test_result.is_some() { 6 } else { 3 }),
        ])
        .split(inner);

    draw_tab_bar(f, chunks[0], state);
    draw_provider_list(f, chunks[1], state);

    if let Some(ref result) = state.test_result {
        draw_test_result(f, chunks[2], result);
    } else if state.adding {
        draw_add_form(f, chunks[2], state);
    } else {
        draw_status_bar(f, chunks[2], state);
    }
}

fn draw_tab_bar(f: &mut Frame, area: Rect, state: &ProviderPanelState) {
    let tabs = [
        ("1:Core", &ProviderTab::Core),
        ("2:Compat", &ProviderTab::Compatible),
        ("3:Custom", &ProviderTab::Custom),
        ("4:Test", &ProviderTab::Test),
    ];

    let mut spans = Vec::new();
    for (label, tab) in &tabs {
        let style = if *tab == &state.tab {
            Style::default().fg(rgb(0, 0, 0)).bg(HEADER_FG).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(DIM_FG)
        };
        spans.push(Span::styled(format!(" {} ", label), style));
        spans.push(Span::raw(" "));
    }

    let help_spans = vec![
        Span::styled(" │ ", Style::default().fg(DIM_FG)),
        Span::styled("↑↓", Style::default().fg(KEY_FG)),
        Span::styled(" Nav ", Style::default().fg(DIM_FG)),
        Span::styled("a", Style::default().fg(KEY_FG)),
        Span::styled(" Add ", Style::default().fg(DIM_FG)),
        Span::styled("t", Style::default().fg(KEY_FG)),
        Span::styled(" Test ", Style::default().fg(DIM_FG)),
        Span::styled("Esc", Style::default().fg(KEY_FG)),
        Span::styled(" Close", Style::default().fg(DIM_FG)),
    ];

    let tab_line = Line::from(spans);
    f.render_widget(Paragraph::new(tab_line).alignment(Alignment::Left), area);

    if area.height > 1 {
        let help_line = Line::from(help_spans);
        let help_area = Rect { y: area.y + 1, height: 1, ..area };
        f.render_widget(Paragraph::new(help_line).alignment(Alignment::Left), help_area);
    }
}

fn draw_provider_list(f: &mut Frame, area: Rect, state: &ProviderPanelState) {
    let _visible_rows = area.height as usize;

    match state.tab {
        ProviderTab::Core => {
            let items: Vec<ListItem> = BUILTIN_PROVIDERS
                .iter()
                .enumerate()
                .map(|(i, (id, name, model))| {
                    let style = if i == state.selected {
                        Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(INACTIVE_FG)
                    };
                    let indicator = if i == state.selected { " ► " } else { "   " };
                    ListItem::new(Line::from(vec![
                        Span::styled(indicator, Style::default().fg(KEY_FG)),
                        Span::styled(format!("{:<18}", name), style),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("{:<20}", id), Style::default().fg(ACCENT_FG)),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("Default: {}", model), Style::default().fg(DIM_FG)),
                    ]))
                })
                .collect();

            let list = List::new(items)
                .block(Block::default().title(" Core Providers (8) ").title_style(
                    Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD),
                ))
                .highlight_style(Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD));

            let mut list_state = ListState::default();
            list_state.select(Some(state.selected));
            f.render_stateful_widget(list, area, &mut list_state);
        }
        ProviderTab::Compatible => {
            let items: Vec<ListItem> = COMPATIBLE_PROVIDERS
                .iter()
                .enumerate()
                .map(|(i, (id, name, model, env))| {
                    let style = if i == state.selected {
                        Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(INACTIVE_FG)
                    };
                    let indicator = if i == state.selected { " ► " } else { "   " };
                    let has_key = !env.is_empty() && std::env::var(env).is_ok();
                    let status = if has_key {
                        Span::styled(" ●", Style::default().fg(SUCCESS_FG))
                    } else if env.is_empty() {
                        Span::styled(" ○", Style::default().fg(DIM_FG))
                    } else {
                        Span::styled(" ○", Style::default().fg(WARN_FG))
                    };
                    ListItem::new(Line::from(vec![
                        Span::styled(indicator, Style::default().fg(KEY_FG)),
                        Span::styled(format!("{:<18}", name), style),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("{:<35}", id), Style::default().fg(ACCENT_FG)),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("{:<25}", model), Style::default().fg(DIM_FG)),
                        status,
                    ]))
                })
                .collect();

            let list = List::new(items)
                .block(Block::default().title(" OpenAI-Compatible (21+) ").title_style(
                    Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD),
                ))
                .highlight_style(Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD));

            let mut list_state = ListState::default();
            list_state.select(Some(state.selected));
            f.render_stateful_widget(list, area, &mut list_state);
        }
        ProviderTab::Custom => {
            let help = vec![
                Line::from(""),
                Line::from(vec![
                    Span::styled("  No custom providers configured.", Style::default().fg(DIM_FG)),
                ]),
                Line::from(""),
                Line::from(vec![
                    Span::styled("  Press ", Style::default().fg(DIM_FG)),
                    Span::styled("a", Style::default().fg(KEY_FG).add_modifier(Modifier::BOLD)),
                    Span::styled(" to add a custom OpenAI-compatible provider.", Style::default().fg(DIM_FG)),
                ]),
                Line::from(""),
                Line::from(vec![
                    Span::styled("  Or add to ", Style::default().fg(DIM_FG)),
                    Span::styled("~/.ideocode/config.toml", Style::default().fg(ACCENT_FG)),
                    Span::styled(":", Style::default().fg(DIM_FG)),
                ]),
                Line::from(""),
                Line::from(vec![
                    Span::styled("    [providers.my-api]", Style::default().fg(SUCCESS_FG)),
                ]),
                Line::from(vec![
                    Span::styled("    type = \"openai-compatible\"", Style::default().fg(INACTIVE_FG)),
                ]),
                Line::from(vec![
                    Span::styled("    base_url = \"https://api.example.com/v1\"", Style::default().fg(INACTIVE_FG)),
                ]),
                Line::from(vec![
                    Span::styled("    api_key_env = \"MY_API_KEY\"", Style::default().fg(INACTIVE_FG)),
                ]),
                Line::from(vec![
                    Span::styled("    default_model = \"my-model\"", Style::default().fg(INACTIVE_FG)),
                ]),
                Line::from(""),
                Line::from(vec![
                    Span::styled("  Then set the env var: ", Style::default().fg(DIM_FG)),
                    Span::styled("export MY_API_KEY=sk-...", Style::default().fg(KEY_FG)),
                ]),
                Line::from(""),
                Line::from(vec![
                    Span::styled("  Use ", Style::default().fg(DIM_FG)),
                    Span::styled("/model", Style::default().fg(ACCENT_FG)),
                    Span::styled(" to see and switch to your custom provider.", Style::default().fg(DIM_FG)),
                ]),
            ];

            let paragraph = Paragraph::new(help).block(
                Block::default()
                    .title(" Custom Providers ")
                    .title_style(Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD)),
            );
            f.render_widget(paragraph, area);
        }
        ProviderTab::Test => {
            let items: Vec<ListItem> = COMPATIBLE_PROVIDERS
                .iter()
                .enumerate()
                .map(|(i, (id, name, model, _env))| {
                    let style = if i == state.selected {
                        Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(INACTIVE_FG)
                    };
                    let indicator = if i == state.selected { " ► " } else { "   " };
                    let is_testing = state.test_provider == *id;
                    let status_span = if is_testing {
                        Span::styled(" TESTING...", Style::default().fg(WARN_FG).add_modifier(Modifier::BOLD))
                    } else {
                        Span::raw("")
                    };
                    ListItem::new(Line::from(vec![
                        Span::styled(indicator, Style::default().fg(KEY_FG)),
                        Span::styled(format!("{:<18}", name), style),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("{:<30}", id), Style::default().fg(ACCENT_FG)),
                        Span::styled(" │ ", Style::default().fg(DIM_FG)),
                        Span::styled(format!("{:<20}", model), Style::default().fg(DIM_FG)),
                        status_span,
                    ]))
                })
                .collect();

            let list = List::new(items)
                .block(Block::default().title(" Test Provider Endpoints ").title_style(
                    Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD),
                ))
                .highlight_style(Style::default().fg(ACTIVE_FG).add_modifier(Modifier::BOLD));

            let mut list_state = ListState::default();
            list_state.select(Some(state.selected));
            f.render_stateful_widget(list, area, &mut list_state);
        }
    }
}

fn draw_add_form(f: &mut Frame, area: Rect, state: &ProviderPanelState) {
    let fields = [
        ("Name", &state.add_name),
        ("Base URL", &state.add_url),
        ("API Key Env Var", &state.add_key_env),
        ("Default Model", &state.add_model),
    ];

    let mut lines = Vec::new();
    for (i, (label, value)) in fields.iter().enumerate() {
        let style = if i == state.add_focus {
            Style::default().fg(KEY_FG).add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(DIM_FG)
        };
        let indicator = if i == state.add_focus { "► " } else { "  " };
        let display_value = if value.is_empty() { "..." } else { value };
        lines.push(Line::from(vec![
            Span::styled(format!("{}{}: ", indicator, label), style),
            Span::styled(
                display_value.to_string(),
                if i == state.add_focus {
                    Style::default().fg(ACTIVE_FG)
                } else {
                    Style::default().fg(INACTIVE_FG)
                },
            ),
        ]));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(vec![
        Span::styled("  ", Style::default().fg(DIM_FG)),
        Span::styled("Enter", Style::default().fg(KEY_FG)),
        Span::styled(" Save  ", Style::default().fg(DIM_FG)),
        Span::styled("Esc", Style::default().fg(KEY_FG)),
        Span::styled(" Cancel", Style::default().fg(DIM_FG)),
    ]));

    let paragraph = Paragraph::new(lines).block(
        Block::default()
            .title(" Add Custom Provider ")
            .title_style(Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(PANEL_BORDER)),
    );
    f.render_widget(paragraph, area);
}

fn draw_test_result(f: &mut Frame, area: Rect, result: &str) {
    let block = Block::default()
        .title(" Test Result ")
        .title_style(Style::default().fg(HEADER_FG).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(PANEL_BORDER))
        .style(Style::default().bg(PANEL_BG));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let text: Vec<Line> = result.lines().map(|l| Line::from(
        Span::styled(l, Style::default().fg(SUCCESS_FG))
    )).collect();

    let paragraph = Paragraph::new(text)
        .wrap(Wrap { trim: false });
    f.render_widget(paragraph, inner);
}

fn draw_status_bar(f: &mut Frame, area: Rect, _state: &ProviderPanelState) {
    let info = vec![
        Line::from(vec![
            Span::styled("  Tip: ", Style::default().fg(DIM_FG)),
            Span::styled("Set env vars for providers, then use ", Style::default().fg(DIM_FG)),
            Span::styled("/model", Style::default().fg(ACCENT_FG)),
            Span::styled(" to switch. Custom providers: edit ", Style::default().fg(DIM_FG)),
            Span::styled("~/.ideocode/config.toml", Style::default().fg(ACCENT_FG)),
        ]),
    ];

    let paragraph = Paragraph::new(info).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(PANEL_BORDER))
            .style(Style::default().bg(PANEL_BG)),
    );
    f.render_widget(paragraph, area);
}
