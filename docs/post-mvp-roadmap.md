# Post-MVP Roadmap

Status: Issue drafts only until the current MVP is complete

LC numbering continues after the existing LC-124 item.

## Entry gate

Do not start Phase 2 until the current Playwright-based single-URL MVP has met its existing acceptance criteria and its test suite is green.

Each phase must be independently deployable, testable, and reversible. Completing one phase must not require starting the next.

## Phase 2 - Report and Launch Priority

Goal: Turn one completed scan into a dedicated, useful Report without changing the scanner contract.

### LC-125 Define the versioned Report model

- Define Report, ReportFinding, source location, cause, recommendation, priority, and policy-version fields.
- Add an adapter from the current scan result.
- Keep new fields additive and scanner fixtures deterministic.

Acceptance:

- Existing scan tests pass unchanged.
- A fixed scan fixture produces the same Report model on repeated runs.

### LC-126 Add a dedicated Report page

- Add a route such as `/reports/[reportId]`.
- Display target URL, scan time, Launch Score, and findings.
- Keep the current scan screen functional.

Acceptance:

- A completed scan can be viewed as a dedicated Report.
- Direct navigation and refresh render the same Report.

### LC-127 Add actionable finding details

- Show occurrence location, cause, recommended fix, and technical evidence.
- Define a safe fallback when a scanner cannot provide one of those fields.

Acceptance:

- Missing optional evidence does not break the Report.
- The UI distinguishes observed evidence from recommended action.

### LC-128 Introduce configurable Launch Priority

- Map findings to Critical, High, Medium, or Low.
- Keep Launch Priority separate from raw severity.
- Record the priority-policy version on the Report.

Acceptance:

- Fixed inputs have deterministic priority outputs.
- Updating the mapping does not mutate scanner findings.

### LC-129 Add Priority filtering and sorting

- Filter Report findings by one or more priorities.
- Sort findings in launch-blocking order.
- Preserve a useful empty state.

Acceptance:

- Filters and ordering work without a new scan.
- Critical findings appear first by default.

### LC-130 Phase 2 regression and acceptance review

- Run format, lint, unit, build, and focused Report tests.
- Verify the existing single-URL scan flow.
- Document the accepted Report schema and policy version.

## Phase 3 - Sharing and Issue Status

Goal: Make a Report usable as a shared remediation worklist.

### LC-131 Persist Reports with opaque share identifiers

- Persist Report snapshots independently from transient browser state.
- Generate non-sequential, opaque identifiers.
- Do not expose credentials or sensitive request data.

### LC-132 Add shareable Report URLs

- Allow read access from a stable Report URL.
- Keep authentication and visibility settings out of the initial implementation.
- Leave an authorization boundary where access control can be added later.

### LC-133 Add Open, Fixed, and Ignored status

- Give every Report finding a workflow status.
- Default new findings to Open.
- Keep status separate from immutable scan evidence.

### LC-134 Persist status updates and basic audit metadata

- Store status, updated time, and a future-compatible actor field.
- Prevent an update from rewriting the original finding.

### LC-135 Phase 3 security and regression review

- Verify unguessable identifiers and data-minimization rules.
- Verify sharing and status changes independently.
- Re-run the MVP and Phase 2 test gates.

## Phase 4 - Rescan, Comparison, and Launch Decision

Goal: Verify whether fixes improved launch readiness.

### LC-136 Link rescans into a Report lineage

- Link a current Report to a previous Report for the same target.
- Do not assume URL alone is sufficient for authorization or ownership.

### LC-137 Add deterministic finding fingerprints

- Build fingerprints from stable rule and location properties.
- Version the fingerprint algorithm.
- Avoid matching only on human-readable message text.

### LC-138 Classify Fixed, New, and Remaining findings

- Compare two Report snapshots.
- Keep comparison output derived and reproducible.

### LC-139 Show Launch Priority deltas

- Show previous and current counts for every priority.
- Show total Fixed, New, and Remaining counts.

### LC-140 Add a versioned Launch Decision policy

- Return READY TO LAUNCH or NOT READY.
- Default to NOT READY when Critical findings exist.
- Record the policy version and inputs used.

### LC-141 Add the comparison and decision UI

- Present the previous/current summary and finding-level changes.
- Make blocking findings immediately visible.

### LC-142 Phase 4 regression and acceptance review

- Test comparison and decision policies with fixed fixtures.
- Verify historical Reports remain unchanged when a newer policy is introduced.
- Re-run all earlier phase gates.

## Phase 5 - Team, History, and AI Assistance

Goal: Add collaboration and assistance after the core QA workflow is stable.

### LC-143 Add team and access-control foundations

- Define workspace membership and Report access boundaries.
- Add authentication only with an explicit security design.

### LC-144 Add organization history management

- Search and manage Report history within the authorized workspace.
- Preserve Report lineage and audit metadata.

### LC-145 Add optional AI remediation suggestions

- Keep AI output advisory and visibly separate from observed evidence.
- Make AI failure non-blocking.
- Use fixed mocks in tests; do not call live models in deterministic suites.

### LC-146 Phase 5 privacy, security, and regression review

- Review stored data, retention, access, and AI data boundaries.
- Verify the complete workflow without AI enabled.

## Issue creation rule

These entries are drafts, not active implementation authorization.

After MVP completion:

1. Confirm the MVP acceptance evidence.
2. Create only the Phase 2 parent Sprint Issue and LC-125 through LC-130 tasks.
3. Implement and verify Phase 2 as one independent unit.
4. Create the next phase only after the prior phase is accepted.
5. Keep the GitHub Issue body, checklist, rendered state, and closed status synchronized.
