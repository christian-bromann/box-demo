import { getBoxClient } from "../box/client.js";
import { BoxBackend } from "../box/box-backend.js";

function rootFolderId(): string {
  const id = process.env.BOX_ROOT_FOLDER_ID?.trim();
  if (!id) {
    throw new Error("BOX_ROOT_FOLDER_ID is not set. Run `bun run seed` and copy the folder id.");
  }
  return id;
}

/**
 * Deepagents backend factory that scopes the virtual filesystem to the company
 * knowledge-base folder in Box. Created lazily (per run) so the Box credentials
 * and BOX_ROOT_FOLDER_ID are read from the environment at request time, not at
 * import time.
 */
export const backend = new BoxBackend({
  client: getBoxClient(),
  rootFolderId: rootFolderId()
});
