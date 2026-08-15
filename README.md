# Launch Check v1.0

Launch Check scans websites before launch and turns technical findings into actionable reports. It includes browser-error collection, Lighthouse audits, screenshots, PDF reports, scan history, billing models, workspaces, GitHub workflows, Slack and Discord notifications, and enterprise controls.

## Requirements

- Node.js 22.19 or later
- npm
- Chromium dependencies required by Playwright and Lighthouse

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Start the app with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

The core scanner works without optional integrations. Configure external services in the server environment; never place secrets in client-side variables or commit `.env.local`.

## Quality commands

- `npm test` runs the service and security test suite.
- `npm run lint` checks source quality.
- `npm run format:check` verifies formatting.
- `npm run build` creates a production build.
- `npm run release:check` runs the complete release gate.
- `npm run test:e2e` checks critical routes against a running server.
- `npm run test:load` checks the health endpoint under bounded concurrency.

For E2E and load tests, set `BASE_URL` when the server is not running at `http://127.0.0.1:3000`.

## Health and readiness

- `GET /api/health` confirms the application process is healthy.
- `GET /api/readiness` verifies required production configuration.

Production readiness requires an HTTPS `APP_URL`. GitHub, Slack, and Discord are optional and reported separately.

## Deployment

A production Dockerfile and GitHub Actions quality workflow are included. Before deployment:

1. Configure `APP_URL` and required server secrets in the hosting platform.
2. Run `npm run release:check`.
3. Deploy the container and verify `/api/health` and `/api/readiness`.
4. Run E2E and load tests against the production URL.
5. Configure uptime monitoring for `/api/health`.

See [Production Runbook](docs/production-runbook.md), [Security Review](docs/security-review.md), [Product Definition](docs/product-definition.md), and [Post-MVP Roadmap](docs/post-mvp-roadmap.md).

## Project structure

- `src/app` contains application pages and APIs.
- `src/lib` contains scanning, integration, workspace, and enterprise services.
- `scripts` contains release smoke and load checks.
- `docs` contains production and security documentation.

## Release

Current version: **1.0.0**. See [CHANGELOG.md](CHANGELOG.md) and [v1.0 release notes](docs/release-notes-v1.0.md).
