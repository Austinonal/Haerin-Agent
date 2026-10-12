import { afterEach, describe, expect, it, vi } from 'vitest';
import { handle, type Env } from '../workers/src/index';
import { mockFetch, streamOf } from './helpers';

const KEY = 'AIzaTEST_SECRET_KEY_value_1234567890';
const env: Env = { GEMINI_API_KEY: KEY, GEMINI_MODEL: 'gemini-test', ALLOWED_ORIGINS: 'http://localhost:5173' };
const ORIGIN = 'http://localhost:5173';

const chatReq = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://api.test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const valid = { system: 'persona', messages: [{ role: 'user', content: 'สวัสดี' }] };

const sse = (...chunks: unknown[]) => chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join('');
const text = (t: string, extra: Record<string, unknown> = {}) => ({ candidates: [{ content: { parts: [{ text: t }] }, ...extra }], modelVersion: 'gemini-test-001' });

afterEach(() => vi.unstubAllGlobals());

describe('worker', () => {
  it('health reports configuration without exposing the key', async () => {
    const res = await handle(new Request('https://api.test/api/health', { headers: { origin: ORIGIN } }), env);
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(body)).toMatchObject({ ok: true, configured: true, model: 'gemini-test' });
    expect(body).not.toContain(KEY);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('refuses foreign browser origins and does not call upstream', async () => {
    const { fn } = mockFetch(() => new Response('should not be called'));
    const res = await handle(chatReq(valid, { origin: 'https://evil.example' }), env);
    expect(res.status).toBe(403);
    expect(fn).not.toHaveBeenCalled();
  });

  it('answers CORS preflight only for allowed origins', async () => {
    const ok = await handle(new Request('https://api.test/api/chat', { method: 'OPTIONS', headers: { origin: ORIGIN } }), env);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('validates input before touching upstream', async () => {
    const { fn } = mockFetch(() => new Response(''));
    expect((await handle(chatReq('{not json'), env)).status).toBe(400);
    expect((await handle(chatReq({ system: '', messages: [] }), env)).status).toBe(400);
    expect((await handle(chatReq(valid, { 'content-type': 'text/plain' }), env)).status).toBe(415);
    expect((await handle(chatReq({ ...valid, pad: 'x'.repeat(600_000) }), env)).status).toBe(413);
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns a clear not_configured error when the key is missing', async () => {
    const res = await handle(chatReq(valid), { ...env, GEMINI_API_KEY: undefined });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { kind: 'not_configured' } });
  });

  it('sends only to the fixed Gemini host with the key in a header, and streams neutral NDJSON', async () => {
    const { urls, fn } = mockFetch(() => new Response(streamOf(sse(text('สวัส'), text('ดี', { finishReason: 'STOP' })), 5)));
    const res = await handle(chatReq(valid), env);
    expect(res.status).toBe(200);
    expect(urls).toEqual(['https://generativelanguage.googleapis.com/v1beta/models/gemini-test:streamGenerateContent?alt=sse']);
    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const sent = JSON.parse(init.body as string);
    expect(sent.contents).toEqual([{ role: 'user', parts: [{ text: 'สวัสดี' }] }]);
    expect(sent.systemInstruction).toEqual({ parts: [{ text: 'persona' }] });

    const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l));
    expect(lines).toEqual([
      { type: 'delta', text: 'สวัส' },
      { type: 'delta', text: 'ดี' },
      { type: 'done', model: 'gemini-test-001' },
    ]);
  });

  it.each([
    [429, 'rate_limit', 429],
    [403, 'auth', 502],
    [500, 'unavailable', 502],
  ])('maps upstream %i to %s without leaking the upstream body', async (status, kind, outStatus) => {
    mockFetch(() => new Response(`upstream says ${KEY}`, { status }));
    const res = await handle(chatReq(valid), env);
    const body = await res.text();
    expect(res.status).toBe(outStatus);
    expect(JSON.parse(body)).toMatchObject({ error: { kind } });
    expect(body).not.toContain(KEY);
  });

  it('maps Gemini\'s real invalid-key response (400 + API_KEY_INVALID) to auth', async () => {
    // Shape recorded from generativelanguage.googleapis.com with a fake key on 2026-10-12.
    const body = { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID', domain: 'googleapis.com' }] } };
    mockFetch(() => Response.json(body, { status: 400 }));
    const res = await handle(chatReq(valid), env);
    expect(await res.json()).toMatchObject({ error: { kind: 'auth' } });
  });

  it('reports safety blocks and empty answers as errors, never as success', async () => {
    mockFetch(() => new Response(sse({ promptFeedback: { blockReason: 'SAFETY' } })));
    expect(await (await handle(chatReq(valid), env)).text()).toContain('"kind":"blocked"');
    mockFetch(() => new Response(sse({ candidates: [{ finishReason: 'STOP' }] })));
    expect(await (await handle(chatReq(valid), env)).text()).toContain('"kind":"malformed_response"');
    mockFetch(() => new Response('data: {broken\n\n'));
    expect(await (await handle(chatReq(valid), env)).text()).toContain('"kind":"malformed_response"');
  });

  it('does not log message content', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch(() => new Response('', { status: 500 }));
    await handle(chatReq({ system: '', messages: [{ role: 'user', content: 'ความลับของฉัน' }] }), env);
    expect(JSON.stringify(log.mock.calls)).not.toContain('ความลับ');
    log.mockRestore();
  });
});
