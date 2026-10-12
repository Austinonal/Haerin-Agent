import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { providerFor } from '../src/app/useApp';
import { createCloudProvider } from '../src/services/ai/cloud';
import { createOllamaProvider, normalizeLocalUrl } from '../src/services/ai/ollama';
import { route } from '../src/services/ai/router';
import { DEFAULT_SETTINGS } from '../src/services/storage/settings';
import type { Settings } from '../src/types';
import { collect, mockFetch, streamOf } from './helpers';

const req = { system: 'p', messages: [{ role: 'user' as const, content: 'hi' }] };
const signal = () => new AbortController().signal;
const ndjson = (...xs: unknown[]) => xs.map((x) => JSON.stringify(x)).join('\n') + '\n';

beforeEach(() => vi.stubGlobal('navigator', { onLine: true }));
afterEach(() => vi.unstubAllGlobals());

describe('normalizeLocalUrl', () => {
  it.each([
    ['http://localhost:11434', 'http://localhost:11434'],
    ['http://127.0.0.1:11434/', 'http://127.0.0.1:11434'],
    ['http://192.168.1.20:11434', 'http://192.168.1.20:11434'],
    ['http://[::1]:11434', 'http://[::1]:11434'],
  ])('accepts local %s', (input, out) => expect(normalizeLocalUrl(input)).toBe(out));

  it.each(['https://example.com', 'http://8.8.8.8:11434', 'ftp://localhost', 'http://user:pw@localhost', 'http://localhost.evil.com', 'not a url'])(
    'rejects %s',
    (input) => expect(normalizeLocalUrl(input)).toBeNull(),
  );
});

describe('ollama provider', () => {
  it('streams deltas and reports the model Ollama actually used', async () => {
    mockFetch(() => new Response(streamOf(ndjson({ message: { content: 'สวัส' }, done: false }, { message: { content: 'ดี' }, done: false }, { model: 'llama3.2:3b', done: true }), 4)));
    const evs = await collect(createOllamaProvider('http://localhost:11434', 'llama3.2:3b').stream(req, signal()));
    expect(evs).toEqual([
      { type: 'delta', text: 'สวัส' },
      { type: 'delta', text: 'ดี' },
      { type: 'done', model: 'llama3.2:3b' },
    ]);
  });

  it('reports a missing model with the pull command', async () => {
    mockFetch(() => new Response('{"error":"model not found"}', { status: 404 }));
    const [ev] = await collect(createOllamaProvider('http://localhost:11434', 'nope').stream(req, signal()));
    expect(ev).toMatchObject({ type: 'error', kind: 'model_missing' });
    expect(ev.type === 'error' && ev.message).toContain('ollama pull nope');
  });

  it('reports Ollama not running', async () => {
    mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    expect(await collect(createOllamaProvider('http://localhost:11434', 'm').stream(req, signal()))).toEqual([
      expect.objectContaining({ type: 'error', kind: 'unavailable' }),
    ]);
  });

  it('treats a stream that ends without done as an error', async () => {
    mockFetch(() => new Response(ndjson({ message: { content: 'half' }, done: false })));
    const evs = await collect(createOllamaProvider('http://localhost:11434', 'm').stream(req, signal()));
    expect(evs.at(-1)).toMatchObject({ type: 'error', kind: 'malformed_response' });
  });

  it('maps an abort to cancelled', async () => {
    const ctrl = new AbortController();
    mockFetch(() => {
      ctrl.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });
    expect(await collect(createOllamaProvider('http://localhost:11434', 'm').stream(req, ctrl.signal))).toEqual([
      expect.objectContaining({ kind: 'cancelled' }),
    ]);
  });

  it('health lists installed models and flags an empty install', async () => {
    mockFetch(() => Response.json({ models: [{ name: 'a:3b' }, { name: 'b:8b' }] }));
    expect(await createOllamaProvider('http://localhost:11434', '').health()).toMatchObject({ ok: true, models: ['a:3b', 'b:8b'] });
    mockFetch(() => Response.json({ models: [] }));
    expect(await createOllamaProvider('http://localhost:11434', '').health()).toMatchObject({ ok: false, models: [] });
  });

  it('refuses a non-local URL without making any request', async () => {
    const { fn } = mockFetch(() => new Response(''));
    const evs = await collect(createOllamaProvider('https://ollama.example.com', 'm').stream(req, signal()));
    expect(evs[0]).toMatchObject({ type: 'error' });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('cloud provider', () => {
  it('surfaces backend errors with their kind', async () => {
    mockFetch(() => Response.json({ error: { kind: 'not_configured', message: 'ยังไม่ได้ตั้งค่า' } }, { status: 503 }));
    expect(await collect(createCloudProvider('').stream(req, signal()))).toEqual([{ type: 'error', kind: 'not_configured', message: 'ยังไม่ได้ตั้งค่า' }]);
  });

  it('treats a truncated stream as an error, not a success', async () => {
    mockFetch(() => new Response(ndjson({ type: 'delta', text: 'half' })));
    const evs = await collect(createCloudProvider('').stream(req, signal()));
    expect(evs.at(-1)).toMatchObject({ type: 'error', kind: 'malformed_response' });
  });

  it('does not call the network when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const { fn } = mockFetch(() => new Response(''));
    expect((await collect(createCloudProvider('').stream(req, signal())))[0]).toMatchObject({ type: 'error' });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('Local Only privacy', () => {
  it('only ever contacts the local Ollama host, even when Ollama fails', async () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, mode: 'local', ollamaModel: 'm', apiBaseUrl: 'https://api.example.com' };
    for (const fail of [false, true]) {
      const { urls } = mockFetch(() => (fail ? Promise.reject(new TypeError('down')) : new Response(ndjson({ message: { content: 'x' }, done: true }))));
      const decision = route(settings, 'hello');
      expect(decision).toMatchObject({ ok: true, provider: 'ollama' });
      if (!decision.ok) return;
      await collect(providerFor(decision.provider, settings).stream(req, signal()));
      expect(urls.length).toBe(1);
      expect(urls.every((u) => u.startsWith('http://localhost:11434/'))).toBe(true);
    }
  });
});
