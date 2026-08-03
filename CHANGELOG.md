# Changelog

All notable changes to Launch Check are documented here.

## [1.0.0] - 2026-08-03

### Added

- Website scanning with browser errors, failed requests, bounded crawling, and user-friendly failures.
- Launch score, severity classification, Lighthouse metrics, screenshots, JSON export, and PDF reports.
- AI analysis helpers, scan history, dashboards, pricing, billing models, and public documentation pages.
- Persistent team workspaces with member roles and shared scan history.
- GitHub App integration for issues, commit statuses, PR checks, and signed webhooks.
- Slack and Discord completion notifications, critical alerts, preferences, retries, and delivery logs.
- Enterprise organizations, SSO metadata, audit trails, advanced roles, retention controls, and compliance review.
- Health and readiness endpoints, CI quality gates, Docker packaging, E2E smoke tests, and bounded load testing.

### Security

- Added webhook signature validation and timing-safe GitHub signature comparison.
- Kept external credentials server-side and excluded local data and environment files from Git.
- Added security headers and a restrictive baseline Content Security Policy.
