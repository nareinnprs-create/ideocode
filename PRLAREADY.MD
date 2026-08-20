# IDEOCODE Production & Launch Readiness Plan

**Current State:** Production Ready 85% | Launch Ready 78%
**Target State:** Production Ready 100% | Launch Ready 100%
**Last Updated:** 2026-08-19

---

## Executive Summary

IDEOCODE is a multi-model AI coding agent with 80+ Rust crates, a Tauri desktop GUI, and a comprehensive TUI. The codebase has strong foundations (exceptional performance, code quality, CI/CD) but needs polish in accessibility, form validation, error handling, test coverage, and documentation to reach production and launch readiness.

---

## Batch 1: GUI Accessibility (WCAG 2.1 AA)

**Target:** 100% WCAG 2.1 AA compliance | **Impact:** Launch Ready +8%

### 1.1 aria-live Regions (6 fixes)
- `ToastHost.tsx:8` — Add `role="status"` + `aria-live="polite"`
- `App.tsx:15` — Add `role="alert"` + `aria-live="assertive"` to AchievementToast
- `ChatMessageList.tsx:63` — Add `role="alert"` to error messages
- `ChatMessageList.tsx:70+` — Add `role="log"` + `aria-live="polite"` to streaming area
- `StatusBar.tsx:142` — Add `aria-live="polite"` to engine status
- `Sidebar.tsx:183` — Add `aria-live="polite"` to task count

### 1.2 Skip-to-Content Link
- `AppShell.tsx` — Add visually hidden skip link targeting `<main>`

### 1.3 Unlabeled Form Inputs (17 fixes)
- `Composer.tsx:571` — textarea needs `aria-label="Chat message"`
- `Composer.tsx:480` — model select needs `aria-label="Select AI model"`
- `Composer.tsx:434,521,529,616,606` — icon buttons need aria-labels
- `CommandPalette.tsx:115` — search needs `aria-label="Search commands"`
- `FileQuickOpen.tsx:108` — search needs `aria-label="Search files"`
- `CmdKOverlay.tsx:48,62` — input + button need aria-labels
- `SearchInput.tsx:65,76` — input + clear button need aria-labels
- `ComposerPane.tsx:42,48,74,79` — buttons need aria-labels

### 1.4 Focus Traps for Overlays
- `CommandPalette.tsx`, `FileQuickOpen.tsx`, `ComposerPane.tsx`, `OnboardingWizard.tsx`, `TabBar.tsx` — Add focus trap utility + Escape handling

### 1.5 Semantic HTML Landmarks
- `Sidebar.tsx:84` — Change `<section>` to `<nav aria-label="Main navigation">`
- `TabBar.tsx:45` — Add `role="tablist"` to container
- `ComposerPane.tsx:28` — Add `role="dialog"` + `aria-modal="true"`
- `OnboardingWizard.tsx:57` — Add `role="dialog"` + `aria-modal="true"`

### 1.6 Color Contrast Fixes
- `globals.css:210` — `#52525b` (3.3:1) to `#71717a` (4.5:1)
- `globals.css:184` — `oklch(0.56)` (3.8:1) to `oklch(0.50)` (4.5:1)
- `TopBar.tsx:75` — Remove `opacity-50` from muted text
- `Sidebar.tsx:266` — `text-text-muted/60` to `/80`
- `StatusBar.tsx:187` — `opacity-50` to `opacity-70`
- `Composer.tsx:640` — `text-text-muted/70` to `/90`

### 1.7 Missing aria-expanded (3 fixes)
- `Collapsible.tsx:58` — Add `aria-expanded={isOpen}`
- `Sidebar.tsx:131` — Add `aria-expanded={toolsExpanded}`
- `Sidebar.tsx:239` — Add `aria-expanded={completedExpanded}`

### 1.8 Modal aria-describedby
- `Modal.tsx:115` — Add `aria-describedby={descriptionId}` when description provided

### 1.9 Screen Reader Text for Visual Indicators
- `TabBar.tsx:81` — Add sr-only "Unsaved changes"
- `OnboardingWizard.tsx:120` — Add sr-only "Step X of Y"
- `Sidebar.tsx:149` — Add sr-only "Active: {panelName}"

---

## Batch 2: GUI Form Validation

**Target:** Comprehensive input validation | **Impact:** Launch Ready +5%

### 2.1 Install Validation Library
- Add `zod` + `react-hook-form` + `@hookform/resolvers` to `package.json`

### 2.2 Create Validation Schemas
- New `src/lib/validations.ts` with schemas for API keys, URLs, ports, required strings

### 2.3 Inline Error Messages
- `Input.tsx`, `Textarea.tsx`, `Select.tsx`, `SearchInput.tsx` — Add error/required/aria-required props

### 2.4 Required Field Indicators
- All 25+ panel files — Add visual asterisk, `aria-required="true"`, `required` attribute

### 2.5 Input Length Validation
- API keys: 200 chars | Custom instructions: 10000 | Composer: 100000 | URLs: 2000 | Goals: 5000

### 2.6 Format Validation
- OpenAI key: `^sk-[a-zA-Z0-9]{48}$` | Anthropic: `^sk-ant-[a-zA-Z0-9-]{93}$`
- Ports: 1-65535 | URLs: `new URL()` check

### 2.7 JSON Import Validation
- `WikiPanel.tsx`, `KeyboardShortcutsPanel.tsx`, `ThemeMarketplacePanel.tsx` — Schema validation on import

### 2.8 Onboarding Wizard Validation
- Require theme selection, provider config, workspace folder before advancing

---

## Batch 3: Error Handling

**Target:** Comprehensive error handling | **Impact:** Production Ready +5%

### 3.1 Error Context
- Add `.context()` to all critical `?` usages across Rust crates

### 3.2 Retry Logic
- Provider integrations — Exponential backoff + circuit breaker pattern

### 3.3 GUI Graceful Degradation
- Fallback UI for failed Tauri commands, retry buttons, toast notifications

### 3.4 Error Boundaries
- Wrap major GUI sections in ErrorBoundary with recovery options

---

## Batch 4: Test Coverage

**Target:** Critical path coverage | **Impact:** Production Ready +5%

### 4.1 Critical Crate Tests (32 untested crates)
Priority: `claude-cli-runtime` (1062 LOC), `terminal-launch` (1136), `tui-core` (2920), `tui-render` (4291), `provider-openai` (1830), `provider-openrouter` (2211), `provider-gemini` (749)

### 4.2 GUI Component Tests
Priority: `validations.ts`, `Button`, `Modal`, `Input`, `Composer`, `chatStore`, `appStore`, `providerStore`

### 4.3 Tauri Command Tests
Priority: `chat.rs` (16 cmds), `files.rs` (8), `git.rs` (10), `settings.rs` (3), `providers.rs` (3)

### 4.4 Snapshot Tests
- Install `insta` (Rust) + `@testing-library/jest-image-snapshot` (GUI)

---

## Batch 5: Documentation

**Target:** Comprehensive docs | **Impact:** Launch Ready +5%

### 5.1 User Tutorial — `docs/TUTORIAL.md`
### 5.2 CONTRIBUTING.md — Add dev setup, build/test/lint commands, code style, commit conventions
### 5.3 Crate-Level Doc Comments — 73+ `lib.rs` files need `//!` docs
### 5.4 Troubleshooting Guide — `docs/TROUBLESHOOTING.md`
### 5.5 Fix README.md — 6 typos, 2 HTML placeholders, orphan text

---

## Progress Tracking

| Batch | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1: GUI Accessibility | PENDING | - | - |
| 2: GUI Form Validation | PENDING | - | - |
| 3: Error Handling | PENDING | - | - |
| 4: Test Coverage | PENDING | - | - |
| 5: Documentation | PENDING | - | - |

## Readiness Metrics

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| GUI Accessibility | 60% | 100% | 40% |
| GUI Form Validation | 30% | 100% | 70% |
| Error Handling | 85% | 100% | 15% |
| Test Coverage | 60% | 90% | 30% |
| Documentation | 70% | 100% | 30% |
| **Overall Production** | **85%** | **100%** | **15%** |
| **Overall Launch** | **78%** | **100%** | **22%** |
