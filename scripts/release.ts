import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { datasetSchema, profileSchema } from "../src/data.ts";

const required = [
  "data/projects.json",
  "data/profile.json",
  "resume/resume.pdf",
];
const allowed = (name: string): boolean =>
  required.includes(name) || /^data\/icons\/[a-f0-9]{64}\.png$/.test(name);
const manifestSchema = z.strictObject({
  schema_version: z.literal(1),
  files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
});
export type Request = (url: string, options?: RequestInit) => Promise<Response>;

async function get(
  url: string,
  request: Request,
  limit: number,
  token?: string,
): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await request(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers,
  });
  if (!response.ok || !response.body)
    throw new Error("Public snapshot request failed");
  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Public snapshot file exceeds limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

export async function downloadRelease(options: {
  repository: string;
  ref?: string;
  destination: string;
  request?: Request;
  token?: string;
}): Promise<string> {
  const { repository, destination, request = fetch, token } = options;
  const ref = options.ref ?? "main";
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
    !ref ||
    ref.length > 200
  )
    throw new Error("Invalid public data configuration");
  const api = `https://api.github.com/repos/${repository}`;
  const repositoryInfo = JSON.parse(
    (await get(api, request, 65536, token)).toString(),
  );
  if (
    repositoryInfo.private !== false ||
    repositoryInfo.visibility !== "public"
  )
    throw new Error("Data source must be public");
  const reference = JSON.parse(
    (
      await get(
        `${api}/git/ref/heads/${encodeURIComponent(ref)}`,
        request,
        65536,
        token,
      )
    ).toString(),
  );
  const sha: unknown = reference.object?.sha;
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha))
    throw new Error("Invalid public data revision");
  const base = `https://raw.githubusercontent.com/${repository}/${sha}/`;
  // Credentials are restricted to api.github.com; raw public downloads receive none.
  const manifestRaw = await get(`${base}manifest.json`, request, 262144);
  const manifest = manifestSchema.parse(JSON.parse(manifestRaw.toString()));
  const names = Object.keys(manifest.files);
  if (
    names.length > 1003 ||
    !names.every(allowed) ||
    !required.every((name) => names.includes(name))
  )
    throw new Error("Release path allowlist failed");
  const files = new Map<string, Buffer>();
  let total = 0;
  for (const name of names.sort()) {
    const raw = await get(`${base}${name}`, request, 10 * 1024 * 1024);
    total += raw.length;
    if (total > 32 * 1024 * 1024)
      throw new Error("Public release exceeds size budget");
    if (createHash("sha256").update(raw).digest("hex") !== manifest.files[name])
      throw new Error("Release integrity check failed");
    files.set(name, raw);
  }
  const projects = datasetSchema.parse(
    JSON.parse(files.get("data/projects.json")!.toString()),
  );
  const profile = profileSchema.parse(
    JSON.parse(files.get("data/profile.json")!.toString()),
  );
  if (projects.preview || profile.resume_draft)
    throw new Error("Draft data cannot be deployed");
  if (files.get("resume/resume.pdf")!.subarray(0, 5).toString() !== "%PDF-")
    throw new Error("Resume is not a PDF");
  const icons = new Set(
    projects.projects.flatMap((p) => (p.icon_url ? [p.icon_url] : [])),
  );
  if (
    names
      .filter((name) => name.startsWith("data/icons/"))
      .some((name) => !icons.delete(name)) ||
    icons.size
  )
    throw new Error("Release icons are inconsistent");
  // destination must be a new directory. A failed validation never edits the website.
  await mkdir(dirname(destination), { recursive: true });
  const temporary = await mkdtemp(
    join(dirname(destination), ".public-release-"),
  );
  try {
    for (const [name, raw] of files) {
      const path = join(temporary, name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, raw);
    }
    await writeFile(join(temporary, "manifest.json"), manifestRaw);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return sha;
}

export async function installRelease(
  source: string,
  publicDirectory: string,
): Promise<void> {
  // Called only after a full download/validation, before Vite builds a new atomic Pages artifact.
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(source, "manifest.json"), "utf8")),
  );
  for (const directory of ["data", "resume"]) {
    await rm(join(publicDirectory, directory), {
      recursive: true,
      force: true,
    });
    await cp(join(source, directory), join(publicDirectory, directory), {
      recursive: true,
    });
  }
  await writeFile(
    join(publicDirectory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
