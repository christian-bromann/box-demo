#!/usr/bin/env bun
/**
 * Uploads the Acme Corp fixture documents into Box and prints the folder id to
 * set as BOX_ROOT_FOLDER_ID.
 *
 *   bun run seed
 *
 * Env:
 *   BOX_SEED_PARENT_ID    parent folder to create the KB in (default "0" = All Files)
 *   BOX_SEED_FOLDER_NAME  name of the knowledge-base folder (default "Acme Corp Knowledge Base")
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getBoxService } from "../agent/box/client.ts";

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");
const PARENT_ID = process.env.BOX_SEED_PARENT_ID?.trim() || "0";
const FOLDER_NAME = process.env.BOX_SEED_FOLDER_NAME?.trim() || "Acme Corp Knowledge Base";

async function main() {
  const box = getBoxService();

  const me = await box.getCurrentUser();
  console.log(`Authenticated as ${me.name} <${me.login}> (id ${me.id})\n`);

  const folder = await box.createFolder(FOLDER_NAME, PARENT_ID);
  console.log(`Knowledge-base folder: "${folder.name}"  (id ${folder.id})`);
  console.log(`  ${folder.url}\n`);

  const names = (await readdir(FIXTURES_DIR))
    .filter((n) => !n.startsWith(".") && (n.endsWith(".md") || n.endsWith(".txt")))
    .sort();

  if (names.length === 0) {
    console.error(`No fixture files found in ${FIXTURES_DIR}`);
    process.exit(1);
  }

  console.log(`Uploading ${names.length} document(s)…`);
  for (const name of names) {
    const content = await Bun.file(join(FIXTURES_DIR, name)).text();
    const file = await box.uploadFile(folder.id, name, content);
    console.log(`  ✓ ${file.name}  (fileId ${file.id})`);
  }

  console.log("\n────────────────────────────────────────────────────────");
  console.log(`Done. Add this to your .env:\n\n  BOX_ROOT_FOLDER_ID=${folder.id}\n`);
  console.log("Then run:  bun run dev");
  console.log("────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
