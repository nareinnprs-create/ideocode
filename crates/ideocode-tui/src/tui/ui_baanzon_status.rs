// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
use ideocode_tui_style::theme::*;
use lazy_static::lazy_static;
use ratatui::prelude::*;
use ratatui::widgets::{Block, Borders, Paragraph};
use std::cell::RefCell;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};

thread_local! {
    static BAANZON_HUD_VISIBLE: RefCell<bool> = const { RefCell::new(false) };
}

lazy_static! {
    static ref LATEST_STATUS: Arc<Mutex<Option<ideocode_provider_baanzon::GatewayStatus>>> =
        Arc::new(Mutex::new(None));
    static ref LAST_FETCH: Mutex<Option<Instant>> = Mutex::new(None);
}

pub fn toggle_baanzon_hud() {
    BAANZON_HUD_VISIBLE.with(|s| *s.borrow_mut() = !*s.borrow());
}

pub fn baanzon_hud_visible() -> bool {
    BAANZON_HUD_VISIBLE.with(|s| *s.borrow())
}

pub fn render_baanzon_hud_overlay(frame: &mut Frame, area: Rect) {
    if !BAANZON_HUD_VISIBLE.with(|s| *s.borrow()) {
        return;
    }

    // Non-blocking status fetch
    let mut last_fetch = match LAST_FETCH.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    let now = Instant::now();
    let should_fetch = match *last_fetch {
        Some(t) if now.duration_since(t) < Duration::from_secs(2) => false,
        _ => true,
    };

    if should_fetch {
        *last_fetch = Some(now);
        let status_ref = Arc::clone(&LATEST_STATUS);
        std::thread::spawn(move || {
            let st = ideocode_provider_baanzon::gateway_status_blocking();
            if let Ok(mut lock) = status_ref.lock() {
                *lock = Some(st);
            }
        });
    }

    let gateway = {
        let lock = match LATEST_STATUS.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        (*lock).clone()
    };

    let mut lines = vec![
        ratatui::text::Line::from(Span::styled(
            " Baanzon Verso Gateway ",
            Style::default()
                .fg(neon_cyan())
                .add_modifier(Modifier::BOLD),
        )),
        ratatui::text::Line::from(""),
    ];

    if let Some(gateway) = gateway {
        let status_color = if gateway.online {
            neon_green()
        } else if gateway.installing {
            neon_yellow()
        } else {
            neon_orange()
        };
        let status_text = if gateway.online {
            "ONLINE"
        } else if gateway.installing {
            "starting"
        } else if gateway.disabled {
            "disabled"
        } else {
            "offline"
        };

        lines.push(ratatui::text::Line::from(vec![
            Span::styled("Status: ", Style::default().fg(dim_color())),
            Span::styled(status_text, Style::default().fg(status_color)),
        ]));

        lines.push(ratatui::text::Line::from(vec![
            Span::styled("Engine: ", Style::default().fg(dim_color())),
            Span::styled(gateway.engine.clone(), Style::default()),
        ]));

        lines.push(ratatui::text::Line::from(vec![
            Span::styled("URL: ", Style::default().fg(dim_color())),
            Span::styled(gateway.base_url.clone(), Style::default()),
        ]));
    } else {
        lines.push(ratatui::text::Line::from(Span::styled(
            "Loading...",
            Style::default().fg(dim_color()),
        )));
    }

    let panel_height = (lines.len() as u16 + 2).min(area.height / 2);
    let panel_width = 45.min(area.width);
    let panel_area = Rect {
        x: area.x + (area.width.saturating_sub(panel_width)) / 2,
        y: area.y + 2,
        width: panel_width,
        height: panel_height,
    };

    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(crate::tui::ui_glass::glass_border_color()))
        .style(Style::default().bg(crate::tui::color_support::rgb(10, 10, 20)));

    frame.render_widget(Paragraph::new(lines).block(block), panel_area);
}
