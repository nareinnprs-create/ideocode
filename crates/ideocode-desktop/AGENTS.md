# IDEOCODE Desktop Agent Context

- This directory is the IDEOCODE desktop application crate. When a desktop-launched agent opens here, assume self-development work is focused on the desktop application unless the user says otherwise.
- Prefer targeted desktop checks while iterating: `cargo check -p IDEOCODE-desktop` and relevant `IDEOCODE-desktop` tests.
- Keep changes scoped to desktop UI/session-launch code when possible, but update shared crates when the desktop implementation requires it.
- Desktop sessions launched by the app default to this directory so local `AGENTS.md` context primes agents for desktop self-dev work.
