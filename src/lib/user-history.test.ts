import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteScanFromHistory,
  getScanHistory,
  loginUser,
  logoutUser,
  saveScanToHistory,
  searchScanHistory,
} from "./user-history";

test("stores and searches user scan history", () => {
  logoutUser();
  const user = loginUser("Ada", "ada@example.com");
  assert.equal(user.name, "Ada");

  saveScanToHistory({
    url: "https://example.com",
    finalUrl: "https://example.com",
    pageTitle: "Example",
    httpStatus: 200,
    loadTime: 1200,
    summary: "Healthy",
  });

  const history = searchScanHistory("example");
  assert.equal(history.length, 1);

  deleteScanFromHistory(history[0].id);
  assert.equal(getScanHistory().length, 0);
});
