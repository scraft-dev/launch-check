import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  buildFindingIssue,
  connectGitHubRepository,
  createFindingIssue,
  createGitHubAppJwt,
  handleGitHubWebhook,
  linkScanToCommit,
  parseRepositoryName,
  publishPullRequestCheck,
  readGitHubAppConfig,
  verifyGitHubWebhook,
  type GitHubRequest,
} from "./github";

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

test("reads GitHub App secrets only when configuration is complete", () => {
  assert.equal(readGitHubAppConfig({ GITHUB_APP_ID: "1" }), null);
  assert.deepEqual(
    readGitHubAppConfig({
      GITHUB_APP_ID: "1",
      GITHUB_APP_PRIVATE_KEY: "line1\\nline2",
      GITHUB_WEBHOOK_SECRET: "secret",
    }),
    { appId: "1", privateKey: "line1\nline2", webhookSecret: "secret" },
  );
});

test("creates a signed short-lived GitHub App JWT", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwt = createGitHubAppJwt(
    {
      appId: "42",
      privateKey: privateKey
        .export({ type: "pkcs8", format: "pem" })
        .toString(),
    },
    1_700_000_000,
  );
  const [header, payload, signature] = jwt.split(".");
  assert.equal(
    JSON.parse(Buffer.from(payload, "base64url").toString()).iss,
    "42",
  );
  assert.equal(
    crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`),
      publicKey,
      Buffer.from(signature, "base64url"),
    ),
    true,
  );
});

test("validates and connects an owner/repository", async () => {
  assert.deepEqual(parseRepositoryName("scraft-dev/launch-check"), {
    owner: "scraft-dev",
    repo: "launch-check",
  });
  assert.throws(() => parseRepositoryName("bad"));
  const request: GitHubRequest = async (path) => {
    assert.equal(path, "/repos/scraft-dev/launch-check");
    return ok({
      id: 7,
      full_name: "scraft-dev/launch-check",
      default_branch: "main",
      private: false,
      html_url: "https://github.com/scraft-dev/launch-check",
    });
  };
  const repository = await connectGitHubRepository(
    "scraft-dev/launch-check",
    request,
  );
  assert.equal(repository.defaultBranch, "main");
});

test("creates traceable finding issues", async () => {
  const finding = {
    title: "Missing title",
    detail: "Add a title element.",
    severity: "high" as const,
    scanId: "scan_1",
  };
  const draft = buildFindingIssue(
    finding,
    "https://launch.test/history/scan_1",
  );
  assert.match(draft.body, /scan_1/);
  assert.deepEqual(draft.labels, ["launch-check", "severity:high"]);
  const request: GitHubRequest = async (path, init) => {
    assert.equal(path, "/repos/scraft-dev/launch-check/issues");
    assert.match(String(init?.body), /scan_1/);
    return ok({
      number: 21,
      html_url: "https://github.com/scraft-dev/launch-check/issues/21",
    });
  };
  const issue = await createFindingIssue(
    "scraft-dev/launch-check",
    finding,
    "https://launch.test/history/scan_1",
    request,
  );
  assert.equal(issue.number, 21);
});

test("links scans to commits and publishes PR checks", async () => {
  const calls: Array<{ path: string; body: string }> = [];
  const request: GitHubRequest = async (path, init) => {
    calls.push({ path, body: String(init?.body) });
    return path.includes("check-runs")
      ? ok({ id: 2, html_url: "https://github.com/check/2" })
      : ok({ id: 1, url: "https://api.github.com/status/1" });
  };
  await linkScanToCommit(
    "scraft-dev/launch-check",
    "abcdef1",
    "scan_2",
    "https://launch.test/history/scan_2",
    request,
  );
  await publishPullRequestCheck(
    "scraft-dev/launch-check",
    "abcdef1",
    {
      scanId: "scan_2",
      scanUrl: "https://launch.test/history/scan_2",
      score: 65,
      summary: "Critical findings remain.",
    },
    request,
  );
  assert.match(calls[0].path, /statuses\/abcdef1/);
  assert.match(calls[1].body, /failure/);
});

test("securely verifies and handles GitHub webhooks", () => {
  const payload = JSON.stringify({ action: "opened" });
  const secret = "webhook-secret";
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  assert.equal(verifyGitHubWebhook(payload, signature, secret), true);
  assert.equal(verifyGitHubWebhook(payload, "sha256=bad", secret), false);
  assert.deepEqual(
    handleGitHubWebhook("pull_request", "delivery-1", JSON.parse(payload)),
    {
      accepted: true,
      event: "pull_request",
      deliveryId: "delivery-1",
      action: "opened",
    },
  );
});
