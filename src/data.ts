import { z } from "zod";

const httpsUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  });
const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(120),
  tagline: z.string().max(200),
  description: z.string().max(2000),
  category: z.string().max(60),
  technologies: z.array(z.string().max(40)).max(30),
  status: z.enum([
    "in_development",
    "maintained",
    "completed",
    "archived",
    "unspecified",
  ]),
  featured: z.boolean(),
  sort_order: z.number().int(),
  icon_url: z
    .string()
    .regex(/^data\/icons\/[a-f0-9]{64}\.png$/)
    .nullable(),
  demo_url: httpsUrl.nullable(),
  source_url: httpsUrl.nullable(),
  updated_at: z.string().datetime(),
});
export const datasetSchema = z.object({
  schema_version: z.literal(1),
  generated_at: z.string().datetime(),
  preview: z.boolean().optional(),
  projects: z.array(projectSchema).max(1000),
});
export const profileSchema = z.object({
  schema_version: z.literal(1),
  name: z.string(),
  title: z.string(),
  summary: z.string(),
  email: z.string().email(),
  location: z.string(),
  github: httpsUrl.nullable(),
  linkedin: httpsUrl.nullable(),
  skills: z.record(z.string(), z.array(z.string())),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      period: z.string(),
      highlights: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      qualification: z.string(),
      period: z.string(),
    }),
  ),
  resume_url: z.literal("resume/resume.pdf").nullable(),
  resume_draft: z.boolean(),
});
export type Project = z.infer<typeof projectSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Profile = z.infer<typeof profileSchema>;
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path}`;

export type Loaded<T> = { data: T; stale: boolean };
const pending = new Map<string, Promise<Loaded<unknown>>>();

export function loadData<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<Loaded<T>> {
  const url = asset(path);
  if (pending.has(url)) return pending.get(url) as Promise<Loaded<T>>;
  const request = (async () => {
    const key = `portfolio:v1:${url}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("Could not load data");
      const data = schema.parse(await response.json());
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* Storage can be unavailable. */
      }
      return { data, stale: false };
    } catch {
      try {
        const cached = localStorage.getItem(key);
        if (cached)
          return { data: schema.parse(JSON.parse(cached)), stale: true };
      } catch {
        /* Invalid cached data is never rendered. */
      }
      throw new Error("Data is unavailable");
    }
  })();
  pending.set(url, request);
  return request;
}
