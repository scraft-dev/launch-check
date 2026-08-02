import test from "node:test";
import assert from "node:assert/strict";
import { getUrlValidationError, getUserFriendlyScanError } from "./scan";

test("accepts valid public http URLs", () => {
  assert.equal(getUrlValidationError("https://example.com"), null);
  assert.equal(getUrlValidationError("http://example.com"), null);
});

test("rejects invalid URLs", () => {
  assert.equal(getUrlValidationError("not-a-url"), "Enter a valid website URL.");
  assert.equal(getUrlValidationError("file:///tmp/test"), "Enter a valid website URL.");
});

test("rejects private IP hosts", () => {
  assert.equal(getUrlValidationError("http://127.0.0.1"), "Enter a valid website URL.");
  assert.equal(getUrlValidationError("https://192.168.1.10"), "Enter a valid website URL.");
});

test("maps common scan errors to user-friendly messages", () => {
  assert.equal(
    getUserFriendlyScanError("net::ERR_NAME_NOT_RESOLVED"),
    "The website could not be reached. Check the URL and try again.",
  );
  assert.equal(
    getUserFriendlyScanError("SSL certificate problem"),
    "SSL verification failed. Try a different URL.",
  );
  assert.equal(
    getUserFriendlyScanError("browser launch failed"),
    "The browser could not be launched for scanning.",
  );
});
