import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadRelease, installRelease } from "./release.ts";

const repository = process.env.PORTFOLIO_DATA_REPOSITORY;
if (!repository) throw new Error("PORTFOLIO_DATA_REPOSITORY is required");
const workspace = await mkdtemp(join(tmpdir(), "portfolio-snapshot-"));
try {
  const snapshot = join(workspace, "release");
  const sha = await downloadRelease({
    repository,
    ref: process.env.PORTFOLIO_DATA_REF || "main",
    destination: snapshot,
    token: process.env.GITHUB_TOKEN,
  });
  await installRelease(snapshot, "public");
  console.log(`Validated public data snapshot ${sha}`);
} catch {
  console.error(
    "Public data snapshot failed validation or could not be fetched. Existing deployment remains unchanged.",
  );
  process.exitCode = 1;
} finally {
  await rm(workspace, { recursive: true, force: true });
}
