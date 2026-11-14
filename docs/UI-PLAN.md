# EcoHanoi native UI integration plan

> Implement inline in this fresh clone. Use executing-plans; fresh code review after integration.

**Goal:** Port the approved UI onto the existing Expo app and preserve backend/state behavior.
**Architecture:** Shared semantic tokens/components; existing data services; presentation helpers for guide/review; five tab entries with floating middle scan action.
**Tech Stack:** Expo 58 / React Native / TypeScript / SVG / Jest.
**Spec:** `docs/UI-INTEGRATION.md`.

## Global constraints
- Existing API, saved keys, sample isolation, XP thresholds and real camera remain compatible.
- No fake AI or seeded user progress. Three legal groups from the rule source.
- At least48dp main action targets, readable Vietnamese, safe areas and scrollable content.

## Review focus
- Native camera readiness/permission/errors remain functional under redesigned frame.
- Unknown/hazardous/corrected items and double-save do not break review integrity.
- Home/garden refresh from saved state, with error retry instead of false zero progress.
- Long Vietnamese labels and large font scale fit 375px; bottom tab action not hidden.
- Guide source data stays synchronized and cannot inject executable content.

## Tasks
- [x] Runtime/dependencies; baseline Jest and final typecheck.
- [x] RED tests for guide search, review unknown/hazardous validation, tree progress; implement helpers.
- [x] Theme/shared components, floating tab bar, Home and Garden with potted SVG tree.
- [x] Guide from rule source, result cards/group picker, scan framing and statistics styling.
- [x] Full tests/typecheck/rules, Android/web export, screenshots of native components on web.
- [x] Review, fix material findings, docs/run instructions and final verification.

Evidence: `evidence/ui-integration.md`. User confirmed local checks first; deployed provider/device testing remains outside this integration run.
