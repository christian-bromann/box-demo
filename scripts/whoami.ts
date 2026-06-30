#!/usr/bin/env bun
/**
 * Verifies your Box credentials by printing the authenticated user, and (if
 * BOX_ROOT_FOLDER_ID is set) lists the files in the knowledge-base folder.
 *
 *   bun run whoami
 */
import { getBoxService } from "../agent/box/client.ts";

async function main() {
  const box = getBoxService();

  const me = await box.getCurrentUser();
  console.log("Box authentication OK ✓");
  console.log(`  User:  ${me.name} <${me.login}>`);
  console.log(`  Id:    ${me.id}`);

  const folderId = process.env.BOX_ROOT_FOLDER_ID?.trim();
  if (!folderId) {
    console.log("\nBOX_ROOT_FOLDER_ID is not set — run `bun run seed` to create the knowledge base.");
    return;
  }

  const items = await box.listFolderItems(folderId);
  const files = items.filter((i) => i.type === "file");
  console.log(`\nKnowledge base (folder ${folderId}) — ${files.length} file(s):`);
  for (const f of files) console.log(`  - ${f.name}  (fileId ${f.id})`);
}

main().catch((err) => {
  console.error("Box check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
