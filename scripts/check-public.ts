import { readFileSync } from "node:fs";
import { datasetSchema, profileSchema } from "../src/data.ts";
const data = datasetSchema.parse(
  JSON.parse(readFileSync("public/data/projects.json", "utf8")),
);
const profile = profileSchema.parse(
  JSON.parse(readFileSync("public/data/profile.json", "utf8")),
);
if (data.preview || profile.resume_draft)
  throw new Error(
    "Draft preview must be replaced by an approved publication before deployment.",
  );
if (
  !readFileSync("public/resume/resume.pdf")
    .subarray(0, 5)
    .equals(Buffer.from("%PDF-"))
)
  throw new Error("Resume is missing or invalid.");
console.log("Approved public artifacts validated.");
