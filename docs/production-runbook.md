# Production Runbook

## Release gate

1. Confirm the release commit is on `main`.
2. Run `npm ci` and `npm run release:check`.
3. Build the Docker image in the target environment.
4. Configure `APP_URL`, a durable private `REPORT_STORE_PATH`, and only the
   integrations required for launch.
5. Deploy without exposing `.env` files or the `.data` directory publicly.
6. Confirm the runtime can read and write the Report store and that the data
   survives a deployment or instance restart. Do not use Vercel `/tmp` for
   production Report retention.

## Verification

1. Confirm `GET /api/health` returns HTTP 200 and version 1.0.0.
2. Confirm `GET /api/readiness` returns HTTP 200.
3. Run `BASE_URL=https://your-domain npm run test:e2e`.
4. Run the bounded load test during an approved maintenance window.
5. Complete one public-site scan and verify the generated report.
6. Open the Report URL in a separate browser session, update one finding status,
   and confirm it persists after refresh.
7. Rescan the same target and verify Fixed, New, Remaining, priority deltas, and
   the Launch Decision.
8. Test only the external integrations enabled for the environment.

## Monitoring

- Probe `/api/health` every minute from outside the hosting provider.
- Alert after two consecutive failures or sustained 5xx responses.
- Track p95 health latency, scan duration, scan errors, memory, CPU, and failed notification deliveries.
- Keep a deployment marker with the Git commit and application version.

## Rollback

1. Stop new scan traffic if resource saturation is present.
2. Redeploy the previous known-good image by immutable tag.
3. Verify health, readiness, and critical routes.
4. Preserve audit and delivery logs for investigation.
5. Record the incident and corrective action before retrying deployment.

## Ownership

Assign named owners for deployment approval, incident response, security credentials, and data restoration before production launch.
