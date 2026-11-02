import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { downloadRelease, type Request } from "./release.ts";

const sha = "a".repeat(40);
async function fixtures(): Promise<Record<string, Buffer>> {
  const profile = JSON.parse(
    await readFile(
      new URL("../tests/fixtures/profile.json", import.meta.url),
      "utf8",
    ),
  );
  profile.resume_draft = false;
  const projects = JSON.parse(
    await readFile(
      new URL("../tests/fixtures/projects.json", import.meta.url),
      "utf8",
    ),
  );
  delete projects.preview;
  return {
    "data/projects.json": Buffer.from(JSON.stringify(projects)),
    "data/profile.json": Buffer.from(JSON.stringify(profile)),
    "resume/resume.pdf": Buffer.from("%PDF-fixture"),
  };
}
function mocked(
  files: Record<string, Buffer>,
  mutate?: (manifest: {
    schema_version: number;
    files: Record<string, string>;
  }) => void,
): { request: Request; calls: { url: string; options?: RequestInit }[] } {
  const calls: { url: string; options?: RequestInit }[] = [];
  const manifest = {
    schema_version: 1,
    files: Object.fromEntries(
      Object.entries(files).map(([name, raw]) => [
        name,
        createHash("sha256").update(raw).digest("hex"),
      ]),
    ),
  };
  mutate?.(manifest);
  const request: Request = async (url, options) => {
    calls.push({ url, options });
    if (url === "https://api.github.com/repos/owner/data")
      return Response.json({ private: false, visibility: "public" });
    if (url.endsWith("/git/ref/heads/main"))
      return Response.json({ object: { sha } });
    const prefix = `https://raw.githubusercontent.com/owner/data/${sha}/`;
    if (url === prefix + "manifest.json") return Response.json(manifest);
    const raw = files[url.slice(prefix.length)];
    return raw
      ? new Response(new Uint8Array(raw))
      : new Response("", { status: 404 });
  };
  return { request, calls };
}
async function run(
  request: Request,
  verify?: (destination: string) => Promise<void>,
): Promise<void> {
  const workspace = await mkdtemp(join(tmpdir(), "release-test-"));
  try {
    const destination = join(workspace, "bundle");
    assert.equal(
      await downloadRelease({
        repository: "owner/data",
        destination,
        request,
        token: "test-token",
      }),
      sha,
    );
    await verify?.(destination);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

test("fetches one immutable public snapshot, validates all hashes, and never sends credentials to raw downloads", async () => {
  const files = await fixtures(),
    mock = mocked(files);
  await run(mock.request, async (destination) => {
    assert.deepEqual(
      await readFile(join(destination, "data/projects.json")),
      files["data/projects.json"],
    );
  });
  assert(
    mock.calls
      .filter((c) => c.url.startsWith("https://raw."))
      .every(
        (c) => !(c.options?.headers as Record<string, string>).Authorization,
      ),
  );
  assert(mock.calls.every((c) => c.options?.redirect === "error"));
});

test("rejects traversal and unapproved files before downloading them", async () => {
  const files = await fixtures();
  files["../secret.txt"] = Buffer.from("hidden");
  const mock = mocked(files);
  await assert.rejects(run(mock.request), /allowlist/);
  assert(!mock.calls.some((c) => c.url.includes("secret.txt")));
});

test("rejects corruption without creating an output directory", async () => {
  const mock = mocked(await fixtures(), (manifest) => {
    manifest.files["data/projects.json"] = "0".repeat(64);
  });
  const workspace = await mkdtemp(join(tmpdir(), "corrupt-test-")),
    destination = join(workspace, "bundle");
  try {
    await assert.rejects(
      downloadRelease({
        repository: "owner/data",
        destination,
        request: mock.request,
      }),
      /integrity/,
    );
    await assert.rejects(access(destination));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("rejects draft resumes", async () => {
  const files = await fixtures();
  const profile = JSON.parse(files["data/profile.json"].toString());
  profile.resume_draft = true;
  files["data/profile.json"] = Buffer.from(JSON.stringify(profile));
  await assert.rejects(run(mocked(files).request), /Draft/);
});

test("rejects private fields added to public data", async () => {
  const files = await fixtures();
  const projects = JSON.parse(files["data/projects.json"].toString());
  projects.private_repository = "secret";
  files["data/projects.json"] = Buffer.from(JSON.stringify(projects));
  await assert.rejects(run(mocked(files).request));
});

test("rejects private data repositories before requesting files", async () => {
  const calls: string[] = [];
  await assert.rejects(
    run(async (url) => {
      calls.push(url);
      return Response.json({ private: true, visibility: "private" });
    }),
    /must be public/,
  );
  assert.equal(calls.length, 1);
});

test("rejects missing release files and API failures", async () => {
  const files = await fixtures();
  delete files["resume/resume.pdf"];
  await assert.rejects(run(mocked(files).request), /allowlist/);
  await assert.rejects(
    run(async () => new Response("", { status: 503 })),
    /request failed/,
  );
});

if (process.env.COLLECTION_BUNDLE && process.env.IMPORTED_COLLECTION_BUNDLE) {
  test("imports the real Python collector output for browser integration", async () => {
    const source = process.env.COLLECTION_BUNDLE!;
    const manifest = JSON.parse(
      await readFile(join(source, "manifest.json"), "utf8"),
    );
    const files: Record<string, Buffer> = {};
    for (const name of Object.keys(manifest.files))
      files[name] = await readFile(join(source, name));
    await downloadRelease({
      repository: "owner/data",
      destination: process.env.IMPORTED_COLLECTION_BUNDLE!,
      request: mocked(files).request,
    });
  });
}
