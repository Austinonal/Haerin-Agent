import type { ProviderId, Settings } from '../../types';

export type RouteDecision =
  | { ok: true; provider: ProviderId; reason: string }
  | { ok: false; reason: string };

/**
 * Picks the provider for one message. Pure: no I/O, no fallback.
 * A failed provider is never swapped silently; the UI offers an explicit retry
 * by passing `override`, which is still checked against the mode here.
 */
export function route(
  settings: Pick<Settings, 'mode' | 'cloudEnabled' | 'hybridPrefer' | 'privateKeywords'>,
  text: string,
  override?: ProviderId,
): RouteDecision {
  const { mode, cloudEnabled } = settings;
  const cloudOff = { ok: false as const, reason: 'Cloud AI ถูกปิดอยู่ใน Settings' };

  if (mode === 'local') {
    if (override === 'gemini') return { ok: false, reason: 'โหมด Local Only ไม่ส่งข้อมูลไป Cloud — เปลี่ยนโหมดก่อนถ้าต้องการ' };
    return { ok: true, provider: 'ollama', reason: 'Local Only' };
  }
  if (mode === 'cloud') {
    if (!cloudEnabled) return cloudOff;
    if (override === 'ollama') return { ok: true, provider: 'ollama', reason: 'ผู้ใช้เลือก Local สำหรับข้อความนี้' };
    return { ok: true, provider: 'gemini', reason: 'Cloud Only' };
  }

  // hybrid
  const lower = text.toLowerCase();
  const hit = settings.privateKeywords.find((k) => k.trim() && lower.includes(k.trim().toLowerCase()));
  if (hit) return { ok: true, provider: 'ollama', reason: `มีคำว่า "${hit}" — ใช้ Local ตามกฎความเป็นส่วนตัว` };
  if (override) {
    if (override === 'gemini' && !cloudEnabled) return cloudOff;
    return { ok: true, provider: override, reason: 'ผู้ใช้เลือกเองสำหรับข้อความนี้' };
  }
  if (settings.hybridPrefer === 'cloud') {
    return cloudEnabled ? { ok: true, provider: 'gemini', reason: 'Hybrid: ใช้ Cloud เป็นหลัก' } : { ok: true, provider: 'ollama', reason: 'Hybrid: Cloud ถูกปิด จึงใช้ Local' };
  }
  return { ok: true, provider: 'ollama', reason: 'Hybrid: ใช้ Local เป็นหลัก' };
}
