# Security Review - v1.0

Review date: 2026-08-03

## Controls verified

- Public scan URLs reject localhost and private-address targets.
- External service credentials are read only from server environment variables.
- Environment files, private keys, and local persisted data are excluded from Git.
- GitHub and Slack webhooks use HMAC signatures; Discord uses Ed25519 verification.
- GitHub signature comparison is timing-safe.
- Enterprise administration actions enforce role permissions and emit audit events.
- Discord messages disable automatic mentions.
- Security headers include frame denial, MIME sniffing prevention, referrer policy, permissions policy, and Content Security Policy.
- Health and readiness responses do not expose secret values.

## Production requirements

- Terminate TLS at the hosting platform and set an HTTPS `APP_URL`.
- Store integration keys in protected environment settings with least privilege.
- Rotate webhook secrets and provider credentials on a documented schedule.
- Restrict access to persistent `.data` storage or replace it with a managed database.
- Apply request rate limits at the edge for scan and integration endpoints.
- Monitor scan timeouts, failed deliveries, 5xx responses, and resource saturation.
- Back up persistent data and test restoration before enabling paid production use.

## Residual risks

- Scanning untrusted websites requires strong container isolation and resource limits.
- The initial JSON repository is not suitable for concurrent multi-instance writes.
- Report share identifiers are opaque and non-sequential, but initial shared Reports are accessible to anyone who has the URL. Do not store secrets or private page content in a Report.
- Report status updates do not yet have authenticated actor verification. Workspace role policy is defined, but it must not be enforced from client-asserted identity data.
- Vercel temporary storage does not provide durable Report sharing. Configure `REPORT_STORE_PATH` on persistent storage or replace the repository with a managed database before treating shared URLs as production durable.
- Live provider behavior cannot be certified until production credentials and callbacks are configured.
