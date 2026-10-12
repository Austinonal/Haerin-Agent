// Wire format shared by the browser and the Cloudflare Worker. No secrets here.

export type Role = 'user' | 'assistant';

export interface WireMessage {
  role: Role;
  content: string;
}

export interface ChatRequestBody {
  system: string;
  messages: WireMessage[];
}

export type ErrorKind =
  | 'not_configured'
  | 'unavailable'
  | 'model_missing'
  | 'timeout'
  | 'auth'
  | 'rate_limit'
  | 'bad_request'
  | 'blocked'
  | 'malformed_response'
  | 'cancelled'
  | 'refused'
  | 'unknown';

/** Provider-neutral stream events. The Worker emits these as NDJSON. */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; model: string }
  | { type: 'error'; kind: ErrorKind; message: string };

export const LIMITS = {
  maxMessages: 40,
  maxMessageChars: 16_000,
  maxSystemChars: 8_000,
  maxTotalChars: 80_000,
  maxBodyBytes: 512_000,
} as const;

/** Returns the parsed body, or an error string. Rejects instead of coercing. */
export function parseChatRequest(value: unknown): ChatRequestBody | string {
  if (!isObject(value)) return 'body must be an object';
  const { system, messages } = value;
  if (typeof system !== 'string' || system.length > LIMITS.maxSystemChars) return 'invalid system';
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > LIMITS.maxMessages) {
    return 'invalid messages';
  }
  let total = system.length;
  const out: WireMessage[] = [];
  for (const m of messages) {
    if (!isObject(m)) return 'invalid message';
    if (m.role !== 'user' && m.role !== 'assistant') return 'invalid role';
    if (typeof m.content !== 'string' || m.content.length === 0 || m.content.length > LIMITS.maxMessageChars) {
      return 'invalid content';
    }
    total += m.content.length;
    out.push({ role: m.role, content: m.content });
  }
  if (total > LIMITS.maxTotalChars) return 'request too large';
  if (out[out.length - 1].role !== 'user') return 'last message must be from user';
  return { system, messages: out };
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Splits a byte stream into lines, handling chunks that end mid-line. */
export async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        yield buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer) yield buffer;
  } finally {
    reader.releaseLock();
  }
}
