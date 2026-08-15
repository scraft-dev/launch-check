import test from "node:test";
import assert from "node:assert/strict";
import { canAccessWorkspaceReport } from "./report-access";

test("defines future-compatible workspace Report permissions", () => {
  assert.equal(canAccessWorkspaceReport("owner", "manage-access"), true);
  assert.equal(canAccessWorkspaceReport("admin", "delete"), true);
  assert.equal(canAccessWorkspaceReport("member", "update-status"), true);
  assert.equal(canAccessWorkspaceReport("viewer", "read"), true);
  assert.equal(canAccessWorkspaceReport("viewer", "update-status"), false);
});
