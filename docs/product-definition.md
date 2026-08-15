# Launch Check Product Definition

Status: Approved post-MVP direction

Decision date: 2026-08-15

## Product statement

Launch Check is a QA workflow for bringing a website to a launchable state.

It is not defined only as a website scanner. The product workflow is:

`Scan -> Find -> Prioritize -> Share -> Fix -> Verify -> Launch`

## Current MVP boundary

The current MVP remains a Playwright-based scan of a single URL.

The post-MVP roadmap must not:

- replace or destabilize the existing scanner;
- expand the MVP before its current acceptance criteria are complete;
- make scan results dependent on authentication, AI, or external integrations;
- reduce the determinism of existing tests;
- require all future phases to ship together.

The scanner output is the input to the future workflow. New workflow features must be added around that boundary through versioned adapters or additive fields wherever possible.

## Report

Every completed scan will eventually produce a dedicated Report resource and page.

A Report must be able to show:

- target URL;
- scan timestamp;
- Launch Score;
- detected issues;
- issue source or location;
- cause;
- recommended fix;
- Launch Priority;
- issue status.

The first Report implementation may use the existing scan result as its source. It must not require a scanner rewrite.

## Launch Priority

Launch Priority describes what should be fixed before release. It is separate from raw technical severity.

| Priority | Meaning                                                |
| -------- | ------------------------------------------------------ |
| Critical | The issue should block launch                          |
| High     | Fixing the issue before launch is strongly recommended |
| Medium   | Fixing the issue is recommended for quality            |
| Low      | A non-blocking improvement                             |

Reports must support filtering and sorting by Launch Priority.

Priority mapping must be implemented as a replaceable policy. Scanner findings must remain stable when the policy changes.

## Shared Report URL

Each persisted Report will have an opaque unique identifier and a shareable URL.

Initial use cases:

- agency to client;
- director to engineer;
- engineer to person responsible for the fix.

Authentication and visibility controls are intentionally deferred. The initial design must avoid embedding the target URL, credentials, or predictable sequence values in the share identifier so that access controls can be added later without changing Report URLs.

## Issue status

Each finding in a Report will have one of these workflow states:

- `Open`
- `Fixed`
- `Ignored`

Status is workflow data and must not mutate the original scanner finding. Status changes must be persisted independently so a scan remains reproducible.

## Rescan and comparison

A new scan of the same target may be linked to an earlier Report. Comparison classifies findings as:

- `Fixed`
- `New`
- `Remaining`

The comparison must also show the change in the number of Critical, High, Medium, and Low findings.

Finding matching requires a deterministic fingerprint derived from stable finding properties. Message wording alone must not be the identifier.

## Launch decision

A Report comparison will display one of these results:

- `READY TO LAUNCH`
- `NOT READY`

The initial default policy is `NOT READY` when at least one Critical finding exists.

The decision and Launch Score calculations must be versioned, replaceable policies. Reports should record the policy version used so later tuning does not silently alter historical results.

## Compatibility and testing rules

- Add new fields as optional or through versioned models until all consumers migrate.
- Preserve the existing scan endpoint contract whenever possible.
- Keep scan fixtures deterministic and free from live AI or network dependencies.
- Test policy functions with fixed inputs and expected outputs.
- Test persistence through an interface so local and production stores can be verified independently.
- Add a phase-specific acceptance test before advancing to the next phase.
- Do not close a phase until current MVP regression tests still pass.

## Deferred work

The following are not part of the current MVP or the first Report phase:

- Report authentication and visibility settings;
- team membership and permissions;
- organization-wide history management;
- AI-generated remediation advice;
- changes to the current single-URL Playwright scan model.
