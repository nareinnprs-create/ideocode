// Copyright (c) 2026 Opraiz Technology Pvt Ltd
// R&D by Opraiz Cognitive
// Developer: Narein Rao
// SPDX-License-Identifier: MIT
//! Mapping from parsed CLI arguments to an initial process title.
//!
//! This logic depends on the clap `Args`/`Command` types defined in `cli`, so
//! it lives in the CLI layer. The low-level title-setting primitives it uses
//! (`compact_process_title`, `session_name`, `set_title`) live in the
//! `process_title` core module.

use crate::cli::args::{AmbientCommand, Args, Command};
use crate::process_title::{compact_process_title, session_name, set_title};

pub(crate) fn initial_title(args: &Args) -> String {
    match &args.command {
        Some(Command::Serve { .. }) => "IDEOCODE:server".to_string(),
        Some(Command::Acp) => "IDEOCODE acp".to_string(),
        Some(Command::Server { .. }) => "IDEOCODE server".to_string(),
        Some(Command::Connect) => "IDEOCODE:client".to_string(),
        Some(Command::Run { .. }) => "IDEOCODE run".to_string(),
        Some(Command::Login { .. }) => "IDEOCODE login".to_string(),
        Some(Command::Account { .. }) => "IDEOCODE account".to_string(),
        Some(Command::Repl) => "IDEOCODE repl".to_string(),
        Some(Command::Update) => "IDEOCODE update".to_string(),
        Some(Command::Version { .. }) => "IDEOCODE version".to_string(),
        Some(Command::Usage { .. }) => "IDEOCODE usage".to_string(),
        Some(Command::SelfDev { .. }) => "IDEOCODE:selfdev".to_string(),
        Some(Command::Debug { .. }) => "IDEOCODE debug".to_string(),
        Some(Command::Auth(_)) => "IDEOCODE auth".to_string(),
        Some(Command::Provider(_)) => "IDEOCODE provider".to_string(),
        Some(Command::Memory(_)) => "IDEOCODE memory".to_string(),
        Some(Command::Session(_)) => "IDEOCODE session".to_string(),
        Some(Command::Ambient(subcommand)) => match subcommand {
            AmbientCommand::RunVisible => "IDEOCODE ambient visible".to_string(),
            _ => "IDEOCODE ambient".to_string(),
        },
        Some(Command::Cloud(_)) => "IDEOCODE cloud".to_string(),
        Some(Command::Pair { .. }) => "IDEOCODE pair".to_string(),
        Some(Command::Permissions) => "IDEOCODE permissions".to_string(),
        Some(Command::Transcript { .. }) => "IDEOCODE transcript".to_string(),
        Some(Command::Dictate { .. }) => "IDEOCODE dictate".to_string(),
        Some(Command::SetupHotkey {
            listen_macos_hotkey,
            notify_cli_launch,
            listen_windows_hotkey,
            uninstall,
        }) => {
            if *listen_macos_hotkey || *listen_windows_hotkey {
                "IDEOCODE hotkey listener".to_string()
            } else if notify_cli_launch.is_some() {
                "IDEOCODE shortcut reminder".to_string()
            } else if *uninstall {
                "IDEOCODE hotkey uninstall".to_string()
            } else {
                "IDEOCODE hotkey setup".to_string()
            }
        }
        Some(Command::Browser { .. }) => "IDEOCODE browser".to_string(),
        Some(Command::Replay { .. }) => "IDEOCODE replay".to_string(),
        Some(Command::Model(_)) => "IDEOCODE model".to_string(),
        Some(Command::ProviderTestCoverage { .. }) => "IDEOCODE provider-test-coverage".to_string(),
        Some(Command::ProviderDoctor { .. }) => "IDEOCODE provider-doctor".to_string(),
        Some(Command::AuthTest { .. }) => "IDEOCODE auth-test".to_string(),
        Some(Command::Restart { .. }) => "IDEOCODE restart".to_string(),
        Some(Command::Menubar { .. }) => "IDEOCODE menubar".to_string(),
        Some(Command::Shell) => "IDEOCODE shell".to_string(),
        Some(Command::Tool(_)) => "IDEOCODE tool".to_string(),
        Some(Command::SetupLauncher) => "IDEOCODE setup-launcher".to_string(),
        None => {
            if let Some(resume) = args.resume.as_deref().filter(|resume| !resume.is_empty()) {
                let prefix = if crate::cli::selfdev::client_selfdev_requested() {
                    "IDEOCODE:d:"
                } else {
                    "IDEOCODE:c:"
                };
                compact_process_title(prefix, Some(&session_name(resume)))
            } else if crate::cli::selfdev::client_selfdev_requested() {
                "IDEOCODE:selfdev".to_string()
            } else {
                "IDEOCODE:client".to_string()
            }
        }
    }
}

pub(crate) fn set_initial_title(args: &Args) {
    set_title(initial_title(args));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::lock_test_env;
    use clap::Parser;

    const SELFDEV_ENV: &str = ideocode_selfdev_types::CLIENT_SELFDEV_ENV;

    fn with_selfdev_env_removed<T>(f: impl FnOnce() -> T) -> T {
        let _guard = lock_test_env();
        let previous = std::env::var_os(SELFDEV_ENV);
        crate::env::remove_var(SELFDEV_ENV);
        let result = f();
        if let Some(value) = previous {
            crate::env::set_var(SELFDEV_ENV, value);
        }
        result
    }

    #[test]
    fn initial_title_labels_server() {
        with_selfdev_env_removed(|| {
            let args = Args::parse_from(["IDEOCODE", "serve"]);
            assert_eq!(initial_title(&args), "IDEOCODE:server");
        });
    }

    #[test]
    fn initial_title_labels_resume_client_with_short_name() {
        with_selfdev_env_removed(|| {
            let args = Args::parse_from(["IDEOCODE", "--resume", "session_fox_123"]);
            assert_eq!(initial_title(&args), "IDEOCODE:c:fox");
        });
    }

    #[test]
    fn initial_title_labels_selfdev_command() {
        with_selfdev_env_removed(|| {
            let args = Args::parse_from(["IDEOCODE", "self-dev"]);
            assert_eq!(initial_title(&args), "IDEOCODE:selfdev");
        });
    }

    #[test]
    fn initial_title_labels_windows_hotkey_listener() {
        let args = Args::parse_from(["IDEOCODE", "setup-hotkey", "--listen-windows-hotkey"]);
        assert_eq!(initial_title(&args), "IDEOCODE hotkey listener");
    }

    #[test]
    fn initial_title_labels_hotkey_uninstall() {
        let args = Args::parse_from(["IDEOCODE", "setup-hotkey", "--uninstall"]);
        assert_eq!(initial_title(&args), "IDEOCODE hotkey uninstall");
    }
}
