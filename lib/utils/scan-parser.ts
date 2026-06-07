export interface ParsedScanValue {
  raw: string;
  normalized: string;
  tokens: string[];
}

export function parseScanValue(rawValue: string): ParsedScanValue {
  const raw = rawValue.trim();
  if (!raw) {
    return { raw: "", normalized: "", tokens: [] };
  }

  const tokens = new Set<string>();
  const normalized = raw.toUpperCase();
  tokens.add(raw);
  tokens.add(normalized);

  // Prefix forms like STU:abc123, STAFF|uid123, ID-xyz
  const prefixMatch = raw.match(/^[A-Za-z]+[:|_-](.+)$/);
  if (prefixMatch?.[1]) {
    const suffix = prefixMatch[1].trim();
    tokens.add(suffix);
    tokens.add(suffix.toUpperCase());
  }

  // JSON forms: {"id":"..."}, {"uid":"..."}, {"studentId":"..."}
  if (raw.startsWith("{") && raw.endsWith("}")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const keys = ["id", "uid", "studentId", "staffId", "pen", "admissionNumber"];
      for (const key of keys) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) {
          tokens.add(value.trim());
          tokens.add(value.trim().toUpperCase());
        }
      }
    } catch {
      // Ignore malformed JSON payloads and continue with raw string tokens.
    }
  }

  return {
    raw,
    normalized,
    tokens: Array.from(tokens),
  };
}
