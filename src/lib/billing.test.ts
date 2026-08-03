import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBillingSummary,
  getBillingPlan,
  getPlanUsageStatus,
  type BillingPlanId,
} from "./billing";

test("returns the requested billing plan and its usage limits", () => {
  const plan = getBillingPlan("growth");

  assert.ok(plan);
  assert.equal(plan?.name, "Growth");
  assert.equal(plan?.limits.scansPerMonth, 1000);
  assert.equal(plan?.limits.pagesPerScan, 20);
});

test("reports when usage exceeds a plan limit", () => {
  const status = getPlanUsageStatus("starter", 250);

  assert.equal(status.canContinue, false);
  assert.equal(status.remaining, 0);
  assert.match(status.message, /limit/i);
});

test("builds a billing summary from a plan and current usage", () => {
  const summary = buildBillingSummary("growth", 120);

  assert.equal(summary.planId, "growth");
  assert.equal(summary.remaining, 880);
  assert.equal(summary.canContinue, true);
  assert.match(summary.message, /still available/i);
});

test("returns null for an unknown plan id", () => {
  const plan = getBillingPlan("unknown" as BillingPlanId);
  assert.equal(plan, null);
});
