import { LIMITS, parseChatRequest, type ErrorKind, type StreamEvent } from '../../shared/protocol';
import { UpstreamError, geminiEvents, startGeminiStream } from './gemini';

export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  ALLOWED_ORIGINS: string;
}

const UPSTREAM_TIMEOUT_MS = 60_000;

export default {
  fetch: handle,
} satisfies ExportedHandler<Env>;

export async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  // No Origin = same-origin or non-browser client. A foreign browser origin is refused outright.
  if (origin && !allowed.includes(origin)) return json({ error: { kind: 'refused', message: 'origin not allowed' } }, 403);
  const cors: Record<string, string> = origin
    ? { 'access-control-allow-origin': origin, vary: 'origin' }
    : {};

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '600',
      },
    });
  }

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return json({ ok: true, provider: 'gemini', configured: Boolean(env.GEMINI_API_KEY), model: env.GEMINI_MODEL }, 200, cors);
  }

  if (url.pathname === '/api/chat' && req.method === 'POST') {
    return chat(req, env, cors);
  }

  return json({ error: { kind: 'bad_request', message: 'not found' } }, 404, cors);
}

async function chat(req: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const fail = (kind: ErrorKind, message: string, status: number) => json({ error: { kind, message } }, status, cors);

  if (!req.headers.get('content-type')?.includes('application/json')) return fail('bad_request', 'content-type must be application/json', 415);
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > LIMITS.maxBodyBytes) return fail('bad_request', 'request too large', 413);
  const text = await req.text();
  if (new TextEncoder().encode(text).length > LIMITS.maxBodyBytes) return fail('bad_request', 'request too large', 413);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('bad_request', 'invalid JSON', 400);
  }
  const body = parseChatRequest(raw);
  if (typeof body === 'string') return fail('bad_request', body, 400);

  if (!env.GEMINI_API_KEY) {
    return fail('not_configured', 'Backend ยังไม่ได้ตั้งค่า GEMINI_API_KEY — ดูหัวข้อ "ตั้งค่า Cloud AI" ใน README', 503);
  }

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]);
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await startGeminiStream(body, env.GEMINI_API_KEY, env.GEMINI_MODEL, signal);
  } catch (e) {
    if (e instanceof UpstreamError) {
      console.warn('gemini upstream error', { kind: e.kind, status: e.status }); // never log message content
      return fail(e.kind, e.message, e.status);
    }
    return fail(...abortKind(e), 504);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(ev) + '\n'));
      try {
        for await (const ev of geminiEvents(upstream, env.GEMINI_MODEL)) send(ev);
      } catch (e) {
        const [kind, message] = abortKind(e);
        send({ type: 'error', kind, message });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...cors, 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function abortKind(e: unknown): [ErrorKind, string] {
  if (e instanceof DOMException && e.name === 'TimeoutError') return ['timeout', 'Gemini ตอบช้าเกินกำหนด (timeout)'];
  if (e instanceof DOMException && e.name === 'AbortError') return ['cancelled', 'ยกเลิกแล้ว'];
  return ['unavailable', 'เชื่อมต่อ Gemini ไม่สำเร็จ'];
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
