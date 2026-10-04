/**
 * Structured JSON logger with redaction (docs/SECURITY.md §10). Never pass secrets, tokens,
 * passwords, signed URLs or full provider payloads — the redactor is a safety net, not a licence.
 */
type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE = /pass(word)?|token|secret|authorization|cookie|signature|otp|code_hash|card|cvv|api[_-]?key/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
  return out;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  const min = (process.env.LOG_LEVEL as Level | undefined) ?? "info";
  if (order[level] < order[min]) return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(redact(fields ?? {}) as object) });
  if (level === "error" || level === "warn") console.error(line);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};

export { redact as redactForLogs };
