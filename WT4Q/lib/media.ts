import { API_BASE_URL } from "@/lib/api";

const apiOrigin = (() => {
  try {
    return new URL(API_BASE_URL);
  } catch {
    return null;
  }
})();

const UPLOADS_PREFIX = "/uploads/";

function normalizeAbsolute(input?: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (!apiOrigin) return trimmed;
  if (trimmed.startsWith("/")) {
    return `${apiOrigin.origin}${trimmed}`;
  }
  const normalized = trimmed.replace(/^\/+/, "");
  return `${apiOrigin.origin}/${normalized}`;
}

function buildRawEndpoint(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!apiOrigin) {
    return `${API_BASE_URL}/api/Media/raw?path=${encodeURIComponent(normalized)}`;
  }
  const target = new URL("/api/Media/raw", apiOrigin);
  target.searchParams.set("path", normalized);
  return target.toString();
}

export function absolutizeMediaUrl(input?: string): string | undefined {
  return normalizeAbsolute(input);
}

export function publicMediaUrl(input?: string): string | undefined {
  const absolute = normalizeAbsolute(input);
  if (!absolute) return undefined;
  if (absolute.startsWith("data:")) return absolute;
  if (!apiOrigin) return absolute;
  try {
    const parsed = new URL(absolute);
    if (parsed.host !== apiOrigin.host) {
      return absolute;
    }
    if (parsed.pathname.startsWith("/api/Media/raw")) {
      return parsed.toString();
    }
    if (parsed.pathname.startsWith(UPLOADS_PREFIX)) {
      return buildRawEndpoint(parsed.pathname);
    }
  } catch {
    return absolute;
  }
  return absolute;
}
