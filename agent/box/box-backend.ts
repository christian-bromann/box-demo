/**
 * Box Backend for Deep Agents Virtual Filesystem
 *
 * This backend stores files in Box, mapping filesystem-style operations
 * (ls, read, write, edit, grep, glob, delete) to Box API calls. It plugs into
 * `createDeepAgent({ backend })` so the built-in `ls`/`read_file`/`write_file`/
 * `edit_file`/`glob`/`grep` tools operate directly against a Box folder.
 *
 * Adapted from box-community/deepagents-filesystem-example to reuse this
 * project's shared, already-authenticated Box client (developer token or CCG)
 * via `getBoxClient()` instead of requiring a developer token of its own.
 */
import type { BoxClient } from "box-node-sdk";
import { readByteStream, stringToByteStream } from "box-node-sdk/internal";
import type {
  FileData,
  FileInfo,
  GrepMatch,
  WriteResult,
  EditResult,
} from "deepagents";
import { minimatch } from "minimatch";

export interface BoxBackendOptions {
  /** An authenticated Box SDK client (shared with the rest of the app). */
  client: BoxClient;
  /** The Box folder ID that acts as the root for this backend (defaults to "0", the user's root). */
  rootFolderId?: string;
}

interface CacheEntry {
  id: string;
  type: "file" | "folder";
}

// Implements the deepagents V1 backend shape (lsInfo/readRaw/grepRaw/globInfo).
// deepagents accepts and auto-adapts this via `AnyBackendProtocol`; structural
// conformance is enforced where `boxBackend` is passed to `createDeepAgent`.
export class BoxBackend {
  private client: BoxClient;
  private rootFolderId: string;
  /** Maps virtual paths to Box IDs for fast repeated lookups */
  private pathCache: Map<string, CacheEntry>;
  /** Caches downloaded file content by Box file ID to avoid redundant downloads */
  private contentCache: Map<string, string>;

  constructor(options: BoxBackendOptions) {
    this.client = options.client;
    this.rootFolderId = options.rootFolderId || "0";
    this.pathCache = new Map();
    this.contentCache = new Map();
  }

  /** Returns the current root folder ID. */
  getRootFolderId(): string {
    return this.rootFolderId;
  }

  /**
   * Recursively list the entire folder tree under rootFolderId and populate
   * the path cache. Call once so that every subsequent resolvePath() is an
   * instant cache hit with zero API calls.
   */
  async warmCache(): Promise<void> {
    this.pathCache.clear();

    const walk = async (folderId: string, prefix: string) => {
      let marker: string | undefined;

      do {
        const items = await this.client.folders.getFolderItems(folderId, {
          queryParams: {
            usemarker: true,
            marker,
            limit: 1000,
            fields: ["id", "name", "type"],
          },
        });

        if (items.entries) {
          const subfolderPromises: Promise<void>[] = [];

          for (const item of items.entries) {
            const name = (item as { name?: string }).name || "";
            const itemPath = prefix === "/" ? "/" + name : prefix + "/" + name;
            const itemType: "file" | "folder" =
              item.type === "folder" ? "folder" : "file";

            this.pathCache.set(itemPath, { id: item.id, type: itemType });

            if (item.type === "folder") {
              subfolderPromises.push(walk(item.id, itemPath));
            }
          }

          await Promise.all(subfolderPromises);
        }

        marker = items.nextMarker ?? undefined;
      } while (marker);
    };

    await walk(this.rootFolderId, "/");
  }

  // ---------------------------------------------------------------------------
  // Path ↔ Box ID resolution
  // ---------------------------------------------------------------------------

  /** Normalize a virtual path: ensure leading slash, remove trailing slash (unless root). */
  private normalizePath(path: string): string {
    let p = path.startsWith("/") ? path : "/" + path;
    if (p.length > 1 && p.endsWith("/")) {
      p = p.slice(0, -1);
    }
    return p;
  }

  /**
   * Resolve a virtual path to a Box item (file or folder).
   * Walks the folder hierarchy from the root, caching results along the way.
   */
  private async resolvePath(path: string): Promise<CacheEntry | null> {
    const normalized = this.normalizePath(path);

    if (normalized === "/") {
      return { id: this.rootFolderId, type: "folder" };
    }

    const cached = this.pathCache.get(normalized);
    if (cached) return cached;

    const segments = normalized.split("/").filter(Boolean);
    let currentFolderId = this.rootFolderId;
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += "/" + segment;
      const isLast = i === segments.length - 1;

      const cachedIntermediate = this.pathCache.get(currentPath);
      if (cachedIntermediate) {
        if (isLast) return cachedIntermediate;
        if (cachedIntermediate.type === "folder") {
          currentFolderId = cachedIntermediate.id;
          continue;
        }
        return null; // Tried to traverse through a file
      }

      let found = false;
      let marker: string | undefined;

      do {
        const items = await this.client.folders.getFolderItems(currentFolderId, {
          queryParams: {
            usemarker: true,
            marker,
            limit: 1000,
            fields: ["id", "name", "type"],
          },
        });

        if (items.entries) {
          for (const item of items.entries) {
            const itemType = item.type === "folder" ? "folder" : "file";
            const itemName = (item as { name?: string }).name;
            const itemId = item.id;

            if (itemName) {
              const fullItemPath =
                currentPath.slice(0, currentPath.length - segment.length) +
                itemName;
              this.pathCache.set(fullItemPath, { id: itemId, type: itemType });
            }

            if (itemName === segment) {
              if (isLast) {
                const entry: CacheEntry = { id: itemId, type: itemType };
                this.pathCache.set(currentPath, entry);
                return entry;
              }
              if (itemType === "folder") {
                currentFolderId = itemId;
                found = true;
                break;
              }
              return null; // Trying to traverse through a file
            }
          }
        }

        marker = items.nextMarker ?? undefined;
      } while (!found && marker);

      if (!found) return null;
    }

    return null;
  }

  /**
   * Resolve the parent folder of a path, returning [parentFolderId, fileName].
   * Auto-creates intermediate folders (like mkdir -p) if they don't exist.
   */
  private async resolveParent(path: string): Promise<[string, string] | null> {
    const normalized = this.normalizePath(path);
    const lastSlash = normalized.lastIndexOf("/");
    const parentPath = lastSlash === 0 ? "/" : normalized.slice(0, lastSlash);
    const fileName = normalized.slice(lastSlash + 1);

    if (!fileName) return null;

    const parent = await this.resolvePath(parentPath);
    if (parent && parent.type === "folder") {
      return [parent.id, fileName];
    }

    const segments = parentPath.split("/").filter(Boolean);
    let currentFolderId = this.rootFolderId;
    let currentPath = "";

    for (const segment of segments) {
      currentPath += "/" + segment;

      const existing = await this.resolvePath(currentPath);
      if (existing && existing.type === "folder") {
        currentFolderId = existing.id;
        continue;
      }

      try {
        const created = await this.client.folders.createFolder({
          name: segment,
          parent: { id: currentFolderId },
        });
        currentFolderId = created.id;
        this.pathCache.set(currentPath, { id: created.id, type: "folder" });
      } catch (error) {
        // 409 = folder already exists (race condition or cache miss)
        if (this.statusCode(error) === 409) {
          this.invalidateCache(currentPath);
          const retried = await this.resolvePath(currentPath);
          if (retried && retried.type === "folder") {
            currentFolderId = retried.id;
            continue;
          }
        }
        return null;
      }
    }

    return [currentFolderId, fileName];
  }

  /** Invalidate cache entries that start with a given path prefix. */
  private invalidateCache(pathPrefix: string): void {
    const normalized = this.normalizePath(pathPrefix);
    for (const [key, entry] of this.pathCache.entries()) {
      if (key === normalized || key.startsWith(normalized + "/")) {
        if (entry.type === "file") {
          this.contentCache.delete(entry.id);
        }
        this.pathCache.delete(key);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helper: download file content as string
  // ---------------------------------------------------------------------------

  private async downloadFileContent(fileId: string): Promise<string | null> {
    const cached = this.contentCache.get(fileId);
    if (cached !== undefined) return cached;

    const stream = await this.client.downloads.downloadFile(fileId);
    if (!stream) return null;
    const buffer = await readByteStream(stream);
    const content = Buffer.from(buffer).toString("utf-8");
    this.contentCache.set(fileId, content);
    return content;
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: lsInfo
  // ---------------------------------------------------------------------------

  async lsInfo(path: string): Promise<FileInfo[]> {
    try {
      const resolved = await this.resolvePath(path);
      if (!resolved || resolved.type !== "folder") return [];

      const results: FileInfo[] = [];
      let marker: string | undefined;

      do {
        const items = await this.client.folders.getFolderItems(resolved.id, {
          queryParams: {
            usemarker: true,
            marker,
            limit: 1000,
            fields: ["id", "name", "type", "size", "modified_at"],
          },
        });

        if (items.entries) {
          for (const item of items.entries) {
            const isDir = item.type === "folder";
            const name = (item as { name?: string }).name || "";
            const normalized = this.normalizePath(path);
            const itemPath =
              normalized === "/" ? "/" + name : normalized + "/" + name;

            results.push({
              path: itemPath,
              is_dir: isDir,
              size: isDir ? 0 : (item as { size?: number }).size || 0,
              modified_at: this.safeISODate((item as { modifiedAt?: unknown }).modifiedAt),
            });

            this.pathCache.set(this.normalizePath(itemPath), {
              id: item.id,
              type: isDir ? "folder" : "file",
            });
          }
        }

        marker = items.nextMarker ?? undefined;
      } while (marker);

      return results.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      console.error("Box ls error:", this.errorMessage(error));
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: read
  // ---------------------------------------------------------------------------

  async read(
    filePath: string,
    offset: number = 0,
    limit: number = 2000,
  ): Promise<string> {
    const resolved = await this.resolvePath(filePath);
    if (!resolved || resolved.type !== "file") {
      return `Error: File '${filePath}' not found`;
    }

    try {
      const content = await this.downloadFileContent(resolved.id);
      if (!content) {
        return `Error: File '${filePath}' is empty or unreadable`;
      }

      const lines = content.split("\n");
      const selectedLines = lines.slice(offset, offset + limit);

      return selectedLines
        .map((line, idx) => `${String(offset + idx + 1).padStart(6)}|${line}`)
        .join("\n");
    } catch (error) {
      return `Error reading file: ${this.errorMessage(error)}`;
    }
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: readRaw
  // ---------------------------------------------------------------------------

  async readRaw(filePath: string): Promise<FileData> {
    const now = new Date().toISOString();
    const resolved = await this.resolvePath(filePath);

    if (!resolved || resolved.type !== "file") {
      return {
        content: [`Error: File '${filePath}' not found`],
        created_at: now,
        modified_at: now,
      };
    }

    try {
      const [fileInfo, content] = await Promise.all([
        this.client.files.getFileById(resolved.id),
        this.downloadFileContent(resolved.id),
      ]);

      const createdAt = this.safeISODate(fileInfo.createdAt) ?? now;
      const modifiedAt = this.safeISODate(fileInfo.modifiedAt) ?? now;

      if (!content) {
        return {
          content: [`Error: File '${filePath}' is empty or unreadable`],
          created_at: createdAt,
          modified_at: modifiedAt,
        };
      }

      return {
        content: content.split("\n"),
        created_at: createdAt,
        modified_at: modifiedAt,
      };
    } catch (error) {
      return {
        content: [`Error reading file: ${this.errorMessage(error)}`],
        created_at: now,
        modified_at: now,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: write
  // ---------------------------------------------------------------------------

  async write(filePath: string, content: string): Promise<WriteResult> {
    const existing = await this.resolvePath(filePath);
    if (existing && existing.type === "file") {
      return {
        error: `Error: File '${filePath}' already exists. Use edit to modify existing files.`,
        path: filePath,
        filesUpdate: null,
      };
    }

    return this.uploadFile(filePath, content);
  }

  /**
   * Upload or overwrite a file in Box. If the file already exists, upload a
   * new version. If it doesn't, create it (including any intermediate folders).
   */
  async upsertFile(filePath: string, content: string): Promise<WriteResult> {
    const existing = await this.resolvePath(filePath);

    if (existing && existing.type === "file") {
      try {
        const stream = stringToByteStream(content);
        await this.client.uploads.uploadFileVersion(existing.id, {
          attributes: { name: filePath.split("/").pop()! },
          file: stream,
          fileFileName: filePath.split("/").pop()!,
          fileContentType: this.getContentType(filePath),
        });
        this.invalidateCache(filePath);
        return { error: undefined, path: filePath, filesUpdate: null };
      } catch (error) {
        return {
          error: `Error updating file: ${this.errorMessage(error)}`,
          path: filePath,
          filesUpdate: null,
        };
      }
    }

    return this.uploadFile(filePath, content);
  }

  /** Internal: create a new file in Box (resolves/creates parent folders). */
  private async uploadFile(
    filePath: string,
    content: string,
  ): Promise<WriteResult> {
    const parentInfo = await this.resolveParent(filePath);
    if (!parentInfo) {
      return {
        error: `Error: Parent folder for '${filePath}' not found`,
        path: filePath,
        filesUpdate: null,
      };
    }

    const [parentFolderId, fileName] = parentInfo;

    try {
      const stream = stringToByteStream(content);
      await this.client.uploads.uploadFile({
        attributes: {
          name: fileName,
          parent: { id: parentFolderId },
        },
        file: stream,
        fileFileName: fileName,
        fileContentType: this.getContentType(filePath),
      });

      this.invalidateCache(filePath);

      return { error: undefined, path: filePath, filesUpdate: null };
    } catch (error) {
      return {
        error: `Error writing file: ${this.errorMessage(error)}`,
        path: filePath,
        filesUpdate: null,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: edit
  // ---------------------------------------------------------------------------

  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll: boolean = false,
  ): Promise<EditResult> {
    const resolved = await this.resolvePath(filePath);
    if (!resolved || resolved.type !== "file") {
      return {
        error: `Error: File '${filePath}' not found`,
        path: filePath,
        filesUpdate: null,
        occurrences: 0,
      };
    }

    let content: string;
    try {
      const downloaded = await this.downloadFileContent(resolved.id);
      if (!downloaded) {
        return {
          error: `Error: File '${filePath}' is empty or unreadable`,
          path: filePath,
          filesUpdate: null,
          occurrences: 0,
        };
      }
      content = downloaded;
    } catch (error) {
      return {
        error: `Error reading file: ${this.errorMessage(error)}`,
        path: filePath,
        filesUpdate: null,
        occurrences: 0,
      };
    }

    const occurrences = content.split(oldString).length - 1;

    if (occurrences === 0) {
      return {
        error: `Error: '${oldString}' not found in file`,
        path: filePath,
        filesUpdate: null,
        occurrences: 0,
      };
    }

    if (!replaceAll && occurrences > 1) {
      return {
        error: `Error: '${oldString}' found ${occurrences} times. Use replaceAll=true to replace all occurrences, or provide more context for a unique match.`,
        path: filePath,
        filesUpdate: null,
        occurrences,
      };
    }

    const newContent = replaceAll
      ? content.split(oldString).join(newString)
      : content.replace(oldString, newString);

    try {
      const stream = stringToByteStream(newContent);
      await this.client.uploads.uploadFileVersion(resolved.id, {
        attributes: { name: filePath.split("/").pop()! },
        file: stream,
        fileFileName: filePath.split("/").pop()!,
        fileContentType: this.getContentType(filePath),
      });
      this.invalidateCache(filePath);

      return {
        error: undefined,
        path: filePath,
        filesUpdate: null,
        occurrences: replaceAll ? occurrences : 1,
      };
    } catch (error) {
      return {
        error: `Error writing file: ${this.errorMessage(error)}`,
        path: filePath,
        filesUpdate: null,
        occurrences: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: grepRaw
  // ---------------------------------------------------------------------------

  async grepRaw(
    pattern: string,
    path?: string | null,
    glob?: string | null,
  ): Promise<GrepMatch[] | string> {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return `Invalid regex pattern: ${pattern}`;
    }

    const allFiles = await this.listAllFilesRecursive(path || "/");
    const matches: GrepMatch[] = [];

    // Limit to prevent timeout
    const filesToProcess = allFiles.slice(0, 100);

    const filtered = glob
      ? filesToProcess.filter((f) => minimatch(f.path, glob))
      : filesToProcess;

    await Promise.all(
      filtered.map(async (file) => {
        try {
          const content = await this.downloadFileContent(file.id);
          if (content) {
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i])) {
                matches.push({ path: file.path, line: i + 1, text: lines[i] });
              }
            }
          }
        } catch {
          // Skip files that can't be read
        }
      }),
    );

    return matches;
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: globInfo
  // ---------------------------------------------------------------------------

  async globInfo(pattern: string, path: string = "/"): Promise<FileInfo[]> {
    const allFiles = await this.listAllFilesRecursive(path);
    const results: FileInfo[] = [];

    for (const file of allFiles) {
      if (minimatch(file.path, pattern)) {
        results.push({
          path: file.path,
          is_dir: false,
          size: file.size,
          modified_at: file.modifiedAt,
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // BackendProtocol: delete
  // ---------------------------------------------------------------------------

  async delete(filePath: string): Promise<boolean> {
    const resolved = await this.resolvePath(filePath);
    if (!resolved || resolved.type !== "file") return false;

    try {
      await this.client.files.deleteFileById(resolved.id);
      this.invalidateCache(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Recursively list all files under a virtual path. Returns a flat list with
   * virtual paths and Box file IDs. When the path cache has been warmed, this
   * is answered entirely from cache with zero API calls.
   */
  private async listAllFilesRecursive(
    path: string,
  ): Promise<Array<{ path: string; id: string; size: number; modifiedAt?: string }>> {
    const normalized = this.normalizePath(path);
    const prefix = normalized === "/" ? "/" : normalized + "/";

    const results: Array<{
      path: string;
      id: string;
      size: number;
      modifiedAt?: string;
    }> = [];

    for (const [cachedPath, entry] of this.pathCache.entries()) {
      if (
        entry.type === "file" &&
        (cachedPath.startsWith(prefix) ||
          (normalized === "/" && cachedPath.startsWith("/")))
      ) {
        results.push({
          path: cachedPath,
          id: entry.id,
          size: 0,
          modifiedAt: undefined,
        });
      }
    }

    if (results.length > 0) return results;

    const resolved = await this.resolvePath(path);
    if (!resolved || resolved.type !== "folder") return [];

    const walk = async (folderId: string, walkPrefix: string) => {
      let marker: string | undefined;

      do {
        const items = await this.client.folders.getFolderItems(folderId, {
          queryParams: {
            usemarker: true,
            marker,
            limit: 1000,
            fields: ["id", "name", "type", "size", "modified_at"],
          },
        });

        if (items.entries) {
          for (const item of items.entries) {
            const name = (item as { name?: string }).name || "";
            const itemPath =
              walkPrefix === "/" ? "/" + name : walkPrefix + "/" + name;

            if (item.type === "folder") {
              await walk(item.id, itemPath);
            } else {
              results.push({
                path: itemPath,
                id: item.id,
                size: (item as { size?: number }).size || 0,
                modifiedAt: this.safeISODate((item as { modifiedAt?: unknown }).modifiedAt),
              });
            }
          }
        }

        marker = items.nextMarker ?? undefined;
      } while (marker);
    };

    await walk(resolved.id, normalized);
    return results;
  }

  /**
   * Safely convert a value to an ISO-8601 date string. The Box SDK may return
   * Date objects, strings, or undefined.
   */
  private safeISODate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    return undefined;
  }

  /** Get content type based on file extension. */
  private getContentType(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      js: "application/javascript",
      ts: "application/typescript",
      html: "text/html",
      css: "text/css",
      yaml: "text/yaml",
      yml: "text/yaml",
      xml: "application/xml",
    };
    return contentTypes[ext || ""] || "text/plain";
  }

  private statusCode(error: unknown): number | undefined {
    if (typeof error === "object" && error !== null) {
      const e = error as {
        statusCode?: number;
        responseInfo?: { statusCode?: number };
      };
      return e.statusCode ?? e.responseInfo?.statusCode;
    }
    return undefined;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null && "message" in error) {
      return String((error as { message?: unknown }).message);
    }
    return "Unknown error";
  }
}
