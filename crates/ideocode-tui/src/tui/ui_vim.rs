//! Basic vim modal input mode (Normal / Insert).
//!
//! Activated with Alt+V from the input area. In Normal mode, single-key
//! motions (h/j/k/l, w/b, 0/$) move the cursor; `i` returns to Insert mode;
//! `dd` deletes the line, `yy` yanks, `p` pastes.

use crossterm::event::{KeyCode, KeyModifiers};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VimMode {
    Insert,
    Normal,
}

impl Default for VimMode {
    fn default() -> Self {
        Self::Insert
    }
}

impl VimMode {
    pub fn label(self) -> &'static str {
        match self {
            Self::Insert => "INSERT",
            Self::Normal => "NORMAL",
        }
    }
}

/// Handle a key event in Vim Normal mode. Returns `true` if the key was
/// consumed; the caller should skip normal input handling.
pub fn handle_vim_normal(
    app: &mut crate::tui::app::App,
    code: KeyCode,
    modifiers: KeyModifiers,
) -> bool {
    if modifiers.contains(KeyModifiers::CONTROL) || modifiers.contains(KeyModifiers::ALT) {
        return false;
    }

    match code {
        KeyCode::Char('i') => {
            app.set_vim_mode(VimMode::Insert);
            true
        }
        KeyCode::Char('a') => {
            app.set_vim_mode(VimMode::Insert);
            app.move_cursor_forward_char();
            true
        }
        KeyCode::Char('A') => {
            app.set_vim_mode(VimMode::Insert);
            app.move_cursor_to_end();
            true
        }
        KeyCode::Char('I') => {
            app.set_vim_mode(VimMode::Insert);
            app.move_cursor_to_start();
            true
        }
        KeyCode::Char('o') => {
            app.set_vim_mode(VimMode::Insert);
            app.move_cursor_to_end();
            app.insert_char('\n');
            true
        }
        KeyCode::Char('h') | KeyCode::Left => {
            app.move_cursor_back_char();
            true
        }
        KeyCode::Char('l') | KeyCode::Right => {
            app.move_cursor_forward_char();
            true
        }
        KeyCode::Char('j') | KeyCode::Down => {
            app.move_cursor_down_line();
            true
        }
        KeyCode::Char('k') | KeyCode::Up => {
            app.move_cursor_up_line();
            true
        }
        KeyCode::Char('w') => {
            app.move_cursor_word_forward();
            true
        }
        KeyCode::Char('b') => {
            app.move_cursor_word_back();
            true
        }
        KeyCode::Char('0') => {
            app.move_cursor_to_start();
            true
        }
        KeyCode::Char('$') => {
            app.move_cursor_to_end();
            true
        }
        KeyCode::Char('x') => {
            app.delete_char_forward();
            true
        }
        KeyCode::Char('X') => {
            app.delete_char_back();
            true
        }
        KeyCode::Char('D') => {
            app.delete_to_end();
            true
        }
        KeyCode::Char('C') => {
            app.delete_to_end();
            app.set_vim_mode(VimMode::Insert);
            true
        }
        KeyCode::Char('S') => {
            app.select_line();
            app.set_vim_mode(VimMode::Insert);
            true
        }
        KeyCode::Char('p') => {
            app.paste_from_clipboard_after();
            true
        }
        KeyCode::Char('u') => {
            app.undo_input();
            true
        }
        KeyCode::Char('v') => {
            app.toggle_vim_mode();
            true
        }
        KeyCode::Esc => {
            app.set_vim_mode(VimMode::Insert);
            true
        }
        _ => false,
    }
}
