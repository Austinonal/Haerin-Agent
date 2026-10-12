import { isObject, readLines, type ChatRequestBody, type ErrorKind, type StreamEvent } from '../../../shared/protocol';
import { isAbort, type ChatProvider } from './types';

/** Resolves the backend base URL. Empty string = same origin. Returns null if invalid. */
export function resolveApiBase(configured: string): string | null {
  const value = configured.trim() || import.meta.env.VITE_API_BASE_URL?.trim() || '';
  if (!value) return '';
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null;
  } catch {
    return null;
  }
}

const OFFLINE = 'เชื่อมต่อ Backend ไม่ได้ — ตรวจอินเทอร์เน็ต หรือรัน "npm run dev:worker" ถ้าทดสอบในเครื่อง';

/** Gemini via our own Worker. The browser never sees the API key. */
export function createCloudProvider(apiBaseUrl: string): ChatProvider {
  const base = resolveApiBase(apiBaseUrl);
  return {
    id: 'gemini',
    label: 'Gemini (Cloud)',

    async health(signal) {
      if (base === null) return { ok: false, detail: 'Backend URL ไม่ถูกต้อง', models: [] };
      try {
        const res = await fetch(`${base}/api/health`, { signal });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok || !isObject(data)) return { ok: false, detail: `Backend ตอบกลับ ${res.status}`, models: [] };
        const model = typeof data.model === 'string' ? data.model : '';
        if (!data.configured) return { ok: false, detail: 'Backend ทำงาน แต่ยังไม่ได้ตั้งค่า GEMINI_API_KEY', models: [model] };
        // Health only proves the key is set, not that it is valid; the first message proves that.
        return { ok: true, detail: 'Backend พร้อม (ตั้งค่า Key แล้ว)', models: [model] };
      } catch (e) {
        if (isAbort(e)) throw e;
        return { ok: false, detail: OFFLINE, models: [] };
      }
    },

    async *stream(req: ChatRequestBody, signal): AsyncGenerator<StreamEvent> {
      if (base === null) {
        yield { type: 'error', kind: 'bad_request', message: 'Backend URL ไม่ถูกต้อง — แก้ได้ที่ Settings → AI' };
        return;
      }
      if (!navigator.onLine) {
        yield { type: 'error', kind: 'unavailable', message: 'ออฟไลน์อยู่ — Cloud AI ต้องใช้อินเทอร์เน็ต' };
        return;
      }
      let res: Response;
      try {
        res = await fetch(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req),
          signal,
        });
      } catch (e) {
        yield isAbort(e) ? { type: 'error', kind: 'cancelled', message: 'ยกเลิกแล้ว' } : { type: 'error', kind: 'unavailable', message: OFFLINE };
        return;
      }
      if (!res.ok || !res.body) {
        const data: unknown = await res.json().catch(() => null);
        const err = isObject(data) && isObject(data.error) ? data.error : {};
        yield {
          type: 'error',
          kind: (typeof err.kind === 'string' ? err.kind : 'unknown') as ErrorKind,
          message: typeof err.message === 'string' ? err.message : `Backend ตอบกลับ ${res.status}`,
        };
        return;
      }
      try {
        let ended = false;
        for await (const line of readLines(res.body)) {
          if (!line.trim()) continue;
          const ev = parseEvent(line);
          if (!ev) {
            yield { type: 'error', kind: 'malformed_response', message: 'ได้รับข้อมูลจาก Backend ที่อ่านไม่ได้' };
            return;
          }
          yield ev;
          if (ev.type !== 'delta') {
            ended = true;
            break;
          }
        }
        if (!ended) yield { type: 'error', kind: 'malformed_response', message: 'การเชื่อมต่อถูกตัดก่อนตอบเสร็จ' };
      } catch (e) {
        yield isAbort(e)
          ? { type: 'error', kind: 'cancelled', message: 'ยกเลิกแล้ว' }
          : { type: 'error', kind: 'unavailable', message: 'การเชื่อมต่อขาดระหว่างตอบ' };
      }
    },
  };
}

function parseEvent(line: string): StreamEvent | null {
  try {
    const v: unknown = JSON.parse(line);
    if (!isObject(v)) return null;
    if (v.type === 'delta' && typeof v.text === 'string') return { type: 'delta', text: v.text };
    if (v.type === 'done' && typeof v.model === 'string') return { type: 'done', model: v.model };
    if (v.type === 'error' && typeof v.kind === 'string' && typeof v.message === 'string') {
      return { type: 'error', kind: v.kind as ErrorKind, message: v.message };
    }
    return null;
  } catch {
    return null;
  }
}
