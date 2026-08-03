# Launch Check v1.0 Release Notes

Launch Check v1.0 provides a complete pre-launch website quality workflow, from scanning and scoring through team collaboration and enterprise administration.

## Highlights

- Scan public websites and capture browser failures, failed resources, load time, and bounded crawl results.
- Review Lighthouse-style quality scores, screenshots, prioritized findings, AI-ready guidance, and downloadable reports.
- Connect scans to GitHub issues, commits, and pull-request checks.
- Notify teams through Slack and Discord with preferences and safe retries.
- Manage shared workspaces, enterprise roles, SSO metadata, audit events, and retention controls.

## Operations

Version 1.0 adds health and readiness endpoints, GitHub Actions verification, Docker packaging, security headers, smoke tests, and a bounded load test.

## External configuration

Live billing, GitHub App, Slack, Discord, SSO provider, monitoring, and hosting behavior depends on credentials and infrastructure configured outside the repository. Secret values must remain in the hosting platform's protected environment settings.

## Known limits

- Local JSON persistence is intended for a single application instance. Multi-instance production deployment should use a transactional database or shared durable storage.
- Browser scanning is resource-intensive; production concurrency and timeouts should be tuned for the selected infrastructure.
- Live external integrations require provider-side setup and production verification.
