import { Readable } from "node:stream";
import {
  BoxClient,
  BoxCcgAuth,
  BoxDeveloperTokenAuth,
  CcgConfig,
} from "box-node-sdk";

export interface BoxFileRef {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  size?: number;
  url: string;
}

export interface BoxCitation {
  id: string;
  name: string;
  url: string;
  snippet?: string;
}

export interface BoxAskResult {
  answer: string;
  citations: BoxCitation[];
}

export interface ExtractField {
  key: string;
  displayName?: string;
  description?: string;
  prompt?: string;
  type?: string;
}

const APP_FILE_BASE = "https://app.box.com/file";

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "responseInfo" in err &&
    (err as { responseInfo?: { statusCode?: number } }).responseInfo
      ?.statusCode === 409
  );
}

export function fileUrl(id: string): string {
  return `${APP_FILE_BASE}/${id}`;
}

function buildClient(): BoxClient {
  const devToken = process.env.BOX_DEVELOPER_TOKEN?.trim();
  if (devToken) {
    const auth = new BoxDeveloperTokenAuth({ token: devToken });
    return new BoxClient({ auth });
  }

  const clientId = process.env.BOX_CLIENT_ID?.trim();
  const clientSecret = process.env.BOX_CLIENT_SECRET?.trim();
  const userId = process.env.BOX_USER_ID?.trim();
  const enterpriseId = process.env.BOX_ENTERPRISE_ID?.trim();

  if (clientId && clientSecret && (userId || enterpriseId)) {
    const config = new CcgConfig({
      clientId,
      clientSecret,
      ...(userId ? { userId } : { enterpriseId }),
    });
    const auth = new BoxCcgAuth({ config });
    return new BoxClient({ auth });
  }

  throw new Error(
    "No Box credentials found. Set BOX_DEVELOPER_TOKEN, or BOX_CLIENT_ID + " +
      "BOX_CLIENT_SECRET + (BOX_USER_ID or BOX_ENTERPRISE_ID) in your .env file.",
  );
}

let cached: BoxService | null = null;

export function getBoxService(): BoxService {
  if (!cached) cached = new BoxService(buildClient());
  return cached;
}

export class BoxService {
  constructor(private readonly client: BoxClient) {}

  async getCurrentUser(): Promise<{ id: string; name: string; login: string }> {
    const me = await this.client.users.getUserMe();
    return { id: me.id ?? "", name: me.name ?? "", login: me.login ?? "" };
  }

  async listFolderItems(folderId: string): Promise<BoxFileRef[]> {
    const items = await this.client.folders.getFolderItems(folderId, {
      queryParams: {
        fields: ["id", "type", "name", "size", "extension"],
        limit: 1000,
      },
    });
    return (items.entries ?? []).map((entry) => {
      const e = entry as {
        id?: string;
        type?: string;
        name?: string;
        size?: number;
        extension?: string;
      };
      return {
        id: e.id ?? "",
        name: e.name ?? "",
        type: e.type === "folder" ? "folder" : "file",
        extension: e.extension,
        size: e.size,
        url: fileUrl(e.id ?? ""),
      };
    });
  }

  async search(query: string, folderId: string): Promise<BoxFileRef[]> {
    const results = await this.client.search.searchForContent({
      query,
      ancestorFolderIds: [folderId],
      type: "file",
      contentTypes: ["name", "description", "file_content", "tags"],
      limit: 20,
    });
    const entries = (results.entries ?? []) as Array<{
      id?: string;
      type?: string;
      name?: string;
      size?: number;
      extension?: string;
    }>;
    return entries
      .filter((e) => e.type === "file" && e.id)
      .map((e) => ({
        id: e.id!,
        name: e.name ?? "",
        type: "file" as const,
        extension: e.extension,
        size: e.size,
        url: fileUrl(e.id!),
      }));
  }

  async ask(
    fileIds: string[],
    prompt: string,
    fileNames: Record<string, string> = {},
  ): Promise<BoxAskResult> {
    if (fileIds.length === 0) {
      return { answer: "No files were provided to answer the question.", citations: [] };
    }

    const response = await this.client.ai.createAiAsk({
      mode: fileIds.length > 1 ? "multiple_item_qa" : "single_item_qa",
      prompt,
      items: fileIds.map((id) => ({ id, type: "file" as const })),
    });

    const answer = response?.answer ?? "";
    const apiCitations = (response?.citations ?? []).map((c) => ({
      id: c.id ?? "",
      name: c.name ?? fileNames[c.id ?? ""] ?? "Box file",
      url: fileUrl(c.id ?? ""),
      snippet: c.content,
    }));

    const citations =
      apiCitations.length > 0
        ? apiCitations
        : fileIds.map((id) => ({
            id,
            name: fileNames[id] ?? "Box file",
            url: fileUrl(id),
          }));

    return { answer, citations };
  }

  async extractStructured(
    fileIds: string[],
    fields: ExtractField[],
  ): Promise<Record<string, unknown>> {
    const response = await this.client.ai.createAiExtractStructured({
      items: fileIds.map((id) => ({ id, type: "file" as const })),
      fields: fields.map((f) => ({
        key: f.key,
        displayName: f.displayName ?? f.key,
        description: f.description,
        prompt: f.prompt,
        type: f.type ?? "string",
      })),
    });
    return (response?.answer as Record<string, unknown>) ?? {};
  }

  async createFolder(name: string, parentId: string): Promise<BoxFileRef> {
    try {
      const folder = await this.client.folders.createFolder({
        name,
        parent: { id: parentId },
      });
      return {
        id: folder.id ?? "",
        name: folder.name ?? name,
        type: "folder",
        url: fileUrl(folder.id ?? ""),
      };
    } catch (err) {
      if (isConflict(err)) {
        const items = await this.listFolderItems(parentId);
        const existing = items.find((i) => i.type === "folder" && i.name === name);
        if (existing) return existing;
      }
      throw err;
    }
  }

  async uploadFile(
    parentId: string,
    name: string,
    content: string | Uint8Array,
  ): Promise<BoxFileRef> {
    const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
    try {
      const files = await this.client.uploads.uploadFile({
        attributes: { name, parent: { id: parentId } },
        file: Readable.from(buffer),
      });
      const file = files.entries?.[0];
      return {
        id: file?.id ?? "",
        name: file?.name ?? name,
        type: "file",
        url: fileUrl(file?.id ?? ""),
      };
    } catch (err) {
      if (isConflict(err)) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const dot = name.lastIndexOf(".");
        const versioned =
          dot >= 0 ? `${name.slice(0, dot)}-${stamp}${name.slice(dot)}` : `${name}-${stamp}`;
        return this.uploadFile(parentId, versioned, content);
      }
      throw err;
    }
  }
}
