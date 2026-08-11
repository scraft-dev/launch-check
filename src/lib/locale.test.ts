import test from "node:test";
import assert from "node:assert/strict";
import { getStoredLocale, localizeIssue } from "./locale";

test("uses English when browser storage is unavailable", () => {
  assert.equal(getStoredLocale(), "en");
});

test("localizes known issue titles and recommendations", () => {
  const issue = localizeIssue("ja", {
    title: "Page title is missing",
    detail: "The page has no title.",
    recommendation: "Add a title.",
  });

  assert.equal(issue.title, "ページタイトルがありません");
  assert.match(issue.recommendation ?? "", /タイトル/);
});
