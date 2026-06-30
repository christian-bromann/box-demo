export interface AppConfig {
  model: { provider: string; model: string } | null;
  modelError: string | null;
  folderId: string;
  boxConfigured: boolean;
  assistantId: string;
  suggestions: string[];
}

export interface BoxFile {
  id: string;
  name: string;
  url: string;
  extension?: string;
}

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`Failed to load config (${res.status})`);
  return res.json();
}

export async function fetchFiles(): Promise<{ files: BoxFile[]; error?: string }> {
  const res = await fetch("/api/files");
  if (!res.ok) throw new Error(`Failed to load files (${res.status})`);
  return res.json();
}
