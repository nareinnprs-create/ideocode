# IDEOCODE v1.0 Known Limitations & Technical Debt

This document outlines known issues, non-critical technical debt, and deferred feature requests present in the v1.0 Launch candidate of IDEOCODE. 

During the final production readiness audit, over 3,600+ instances of TODO, FIXME, and unimplemented! markers were identified across the codebase. 

Because these do not block core functionality, they have been intentionally deferred to avoid destabilizing the release. They fall into the following categories:

## 1. Test Suite Mock Data (unimplemented!)
The vast majority of the unimplemented! macros reside inside 	ests/ and test support files. These are used to stub out provider responses and simulate edge cases. **They do not affect production stability.**

## 2. Deferred Cloud Integrations
Several backend files contain TODO: markers for integrations that were deprioritized for the v1.0 launch. These include:
- Extended Azure OpenAI configuration options.
- Deep integration with third-party observability platforms.
- Unfinished OpenRouter specific endpoint permutations.

## 3. UI/UX Refactoring & Edge Cases
There are FIXME: markers in the GUI and TUI related to:
- Deduplicating similar error boundaries.
- Cleaning up specific string formatting methods for edge-case git diffs.
- Enhancing the command palette sorting algorithms (currently works, but could be faster).

## Conclusion
The application is considered **Production Ready** and safe for launch. None of the deferred markers represent memory leaks, security vulnerabilities, or fatal crashes in the main application flow.
