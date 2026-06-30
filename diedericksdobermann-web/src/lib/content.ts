import { promises as fs } from "fs";
import path from "path";

type ContentFile =
  | "about-us"
  | "terms-and-conditions"
  | "privacy-policy"
  | "app-terms-and-conditions";

/** Reads a markdown file shipped under src/content. */
export async function readContent(file: ContentFile): Promise<string> {
  const filePath = path.join(process.cwd(), "src", "content", `${file}.md`);
  return fs.readFile(filePath, "utf8");
}

/**
 * Extracts the body paragraphs that follow a "### HEADING" marker, stopping at
 * the next horizontal rule or heading. Returns an array of paragraph strings.
 */
export function extractSection(markdown: string, heading: string): string[] {
  const lines = markdown.split("\n");
  const startIdx = lines.findIndex(
    (l) => l.trim().toUpperCase() === `### ${heading.toUpperCase()}`,
  );
  if (startIdx === -1) return [];

  const collected: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("###") || line === "---") break;
    if (line) collected.push(line);
  }
  return collected;
}
