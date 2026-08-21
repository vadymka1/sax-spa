export interface ImportMetaEnvLike {
  VITE_API_BASE_URL?: string;
  [key: string]: unknown;
}

export function resolveEnv(source: ImportMetaEnvLike = import.meta.env): {
  readonly apiBaseUrl: string;
} {
  const raw = source.VITE_API_BASE_URL;

  if (!raw || typeof raw !== "string" || raw.trim() === "") {
    throw new Error("VITE_API_BASE_URL environment variable is required");
  }

  const trimmed = raw.trim();
  const normalized = trimmed.replace(/\/+$/, "");

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`Invalid VITE_API_BASE_URL format: ${raw}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Invalid VITE_API_BASE_URL protocol: ${parsed.protocol}. Only http and https protocols are allowed.`,
    );
  }

  return {
    apiBaseUrl: normalized,
  } as const;
}

export const env = resolveEnv(import.meta.env);
