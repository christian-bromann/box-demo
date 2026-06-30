export interface Citation {
  name: string;
  url: string;
}

const BOX_LINK_RE = /\[([^\]]+)\]\((https:\/\/app\.box\.com\/file\/\d+)\)/g;
const SOURCES_HEADING_RE = /\n#{1,6}\s*Sources\s*\n/i;

/** Pull `[Name](https://app.box.com/file/ID)` links out of an answer, de-duped by URL. */
export function extractCitations(text: string): Citation[] {
  const seen = new Map<string, Citation>();
  for (const match of text.matchAll(BOX_LINK_RE)) {
    const name = match[1]?.trim();
    const url = match[2];
    if (url && name && !seen.has(url)) seen.set(url, { name, url });
  }
  return [...seen.values()];
}

/** Split off a trailing "## Sources" section so it can be rendered as chips instead. */
export function stripSources(text: string): string {
  const idx = text.search(SOURCES_HEADING_RE);
  return idx === -1 ? text : text.slice(0, idx).trimEnd();
}
