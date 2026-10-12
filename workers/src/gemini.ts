import { isObject, readLines, type ChatRequestBody, type ErrorKind, type StreamEvent } from '../../shared/protocol';

// Gemini REST API (v1beta streamGenerateContent with SSE).
// Reference: https://ai.google.dev/api/generate-content
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class UpstreamError extends Error {
  constructor(
    public kind: ErrorKind,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function startGeminiStream(
  body: ChatRequestBody,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: body.system ? { parts: [{ text: body.system }] } : undefined,
      contents: body.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    // The upstream body is inspected for a reason code but never forwarded: it may echo request details.
    const reason = await res.json().then(errorReason, () => '');
    throw new UpstreamError(...mapStatus(res.status, reason));
  }
  return res.body;
}

/** Gemini reports an invalid key as 400 with details[].reason = "API_KEY_INVALID". */
function errorReason(body: unknown): string {
  const details = isObject(body) && isObject(body.error) && Array.isArray(body.error.details) ? body.error.details : [];
  for (const d of details) if (isObject(d) && typeof d.reason === 'string') return d.reason;
  return '';
}

function mapStatus(status: number, reason: string): [ErrorKind, number, string] {
  if (reason === 'API_KEY_INVALID') return ['auth', 502, 'API Key ของ Gemini ไม่ถูกต้อง — ตรวจ Key ที่ตั้งไว้ใน Backend'];
  if (status === 400) return ['bad_request', 400, 'Gemini ปฏิเสธคำขอ (400) — ตรวจสอบชื่อโมเดลหรือข้อความ'];
  if (status === 401 || status === 403) return ['auth', 502, 'API Key ของ Gemini ไม่ถูกต้องหรือไม่มีสิทธิ์'];
  if (status === 404) return ['bad_request', 502, 'ไม่พบโมเดล Gemini ที่ตั้งไว้ใน GEMINI_MODEL'];
  if (status === 429) return ['rate_limit', 429, 'ถึงขีดจำกัดการใช้งาน/โควตาของ Gemini แล้ว ลองใหม่ภายหลัง'];
  return ['unavailable', 502, `บริการ Gemini ไม่พร้อมใช้งาน (${status})`];
}

/** Converts Gemini SSE chunks into neutral StreamEvents. */
export async function* geminiEvents(sse: ReadableStream<Uint8Array>, fallbackModel: string): AsyncGenerator<StreamEvent> {
  let model = fallbackModel;
  let gotText = false;
  for await (const line of readLines(sse)) {
    if (!line.startsWith('data:')) continue;
    let chunk: unknown;
    try {
      chunk = JSON.parse(line.slice(5));
    } catch {
      yield { type: 'error', kind: 'malformed_response', message: 'ได้รับข้อมูลจาก Gemini ที่อ่านไม่ได้' };
      return;
    }
    if (!isObject(chunk)) continue;
    if (typeof chunk.modelVersion === 'string') model = chunk.modelVersion;
    const feedback = chunk.promptFeedback;
    if (isObject(feedback) && feedback.blockReason) {
      yield { type: 'error', kind: 'blocked', message: 'Gemini ไม่ตอบคำถามนี้ (ถูกบล็อกโดยนโยบายความปลอดภัย)' };
      return;
    }
    const candidate = Array.isArray(chunk.candidates) ? chunk.candidates[0] : undefined;
    if (!isObject(candidate)) continue;
    const parts = isObject(candidate.content) && Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    for (const p of parts) {
      // Skip thought summaries; only the answer text is shown.
      if (isObject(p) && typeof p.text === 'string' && !p.thought && p.text) {
        gotText = true;
        yield { type: 'delta', text: p.text };
      }
    }
    const reason = candidate.finishReason;
    if (reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT' || reason === 'BLOCKLIST' || reason === 'SPII') {
      yield { type: 'error', kind: 'blocked', message: 'คำตอบถูกหยุดโดยนโยบายความปลอดภัยของ Gemini' };
      return;
    }
  }
  if (!gotText) {
    yield { type: 'error', kind: 'malformed_response', message: 'Gemini ไม่ได้ส่งคำตอบกลับมา' };
    return;
  }
  yield { type: 'done', model };
}
