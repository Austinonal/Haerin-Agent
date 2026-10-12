import { isObject, readLines, type ChatRequestBody, type StreamEvent } from '../../../shared/protocol';
import { isAbort, type ChatProvider, type HealthResult } from './types';

// Ollama REST API: https://github.com/ollama/ollama/blob/main/docs/api.md

/**
 * Local Only must stay local: accept only loopback or private-network hosts.
 * Returns the normalized base URL or null.
 */
export function normalizeLocalUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password || u.search || u.hash) return null;
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const isLocal =
    h === 'localhost' ||
    h === '::1' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  if (!isLocal) return null;
  return u.origin;
}

const NOT_RUNNING =
  'เชื่อมต่อ Ollama ไม่ได้ — ตรวจว่าเปิดโปรแกรม Ollama แล้ว และตั้งค่า OLLAMA_ORIGINS ถ้าเปิดแอปจากโดเมนอื่น (ดู README)';

export function createOllamaProvider(baseUrl: string, model: string): ChatProvider {
  const base = normalizeLocalUrl(baseUrl);
  return {
    id: 'ollama',
    label: 'Ollama (Local)',

    async health(signal) {
      if (!base) return { ok: false, detail: 'URL ของ Ollama ต้องเป็นเครื่องนี้หรือเครือข่ายภายในเท่านั้น', models: [] };
      try {
        const res = await fetch(`${base}/api/tags`, { signal });
        if (!res.ok) return { ok: false, detail: `Ollama ตอบกลับ ${res.status}`, models: [] };
        const data: unknown = await res.json();
        const list = isObject(data) && Array.isArray(data.models) ? data.models : [];
        const models = list.flatMap((m) => (isObject(m) && typeof m.name === 'string' ? [m.name] : []));
        return models.length
          ? { ok: true, detail: `พบ ${models.length} โมเดล`, models }
          : { ok: false, detail: 'Ollama ทำงานอยู่ แต่ยังไม่มีโมเดล — รัน "ollama pull <ชื่อโมเดล>"', models };
      } catch (e) {
        if (isAbort(e)) throw e;
        return { ok: false, detail: NOT_RUNNING, models: [] } satisfies HealthResult;
      }
    },

    async *stream(req: ChatRequestBody, signal): AsyncGenerator<StreamEvent> {
      if (!base) {
        yield { type: 'error', kind: 'bad_request', message: 'URL ของ Ollama ไม่ถูกต้องหรือไม่ใช่เครือข่ายภายใน' };
        return;
      }
      if (!model) {
        yield { type: 'error', kind: 'model_missing', message: 'ยังไม่ได้เลือกโมเดล Local — เลือกได้ที่ Settings → AI' };
        return;
      }
      let res: Response;
      try {
        res = await fetch(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [{ role: 'system', content: req.system }, ...req.messages],
          }),
          signal,
        });
      } catch (e) {
        yield isAbort(e)
          ? { type: 'error', kind: 'cancelled', message: 'ยกเลิกแล้ว' }
          : { type: 'error', kind: 'unavailable', message: NOT_RUNNING };
        return;
      }
      if (res.status === 404) {
        yield { type: 'error', kind: 'model_missing', message: `ไม่พบโมเดล "${model}" — รัน "ollama pull ${model}" หรือเลือกโมเดลอื่น` };
        return;
      }
      if (!res.ok || !res.body) {
        yield { type: 'error', kind: 'unavailable', message: `Ollama ตอบกลับ ${res.status}` };
        return;
      }
      try {
        for await (const line of readLines(res.body)) {
          if (!line.trim()) continue;
          let chunk: unknown;
          try {
            chunk = JSON.parse(line);
          } catch {
            yield { type: 'error', kind: 'malformed_response', message: 'ได้รับข้อมูลจาก Ollama ที่อ่านไม่ได้' };
            return;
          }
          if (!isObject(chunk)) continue;
          if (typeof chunk.error === 'string') {
            yield { type: 'error', kind: 'unavailable', message: `Ollama: ${chunk.error}` };
            return;
          }
          const text = isObject(chunk.message) && typeof chunk.message.content === 'string' ? chunk.message.content : '';
          if (text) yield { type: 'delta', text };
          if (chunk.done === true) {
            yield { type: 'done', model: typeof chunk.model === 'string' ? chunk.model : model };
            return;
          }
        }
        yield { type: 'error', kind: 'malformed_response', message: 'การเชื่อมต่อกับ Ollama ถูกตัดก่อนตอบเสร็จ' };
      } catch (e) {
        yield isAbort(e)
          ? { type: 'error', kind: 'cancelled', message: 'ยกเลิกแล้ว' }
          : { type: 'error', kind: 'unavailable', message: 'การเชื่อมต่อกับ Ollama ขาดระหว่างตอบ' };
      }
    },
  };
}
