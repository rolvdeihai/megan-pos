export function parseJsonCookie<T = unknown>(value?: string | null): T | null {
  if (!value) return null;

  const tryParse = (raw: string): T | null => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const direct = tryParse(value);
  if (direct !== null) return direct;

  try {
    const decoded = decodeURIComponent(value);
    return tryParse(decoded);
  } catch {
    return null;
  }
}
