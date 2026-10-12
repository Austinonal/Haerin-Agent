import { isObject } from '../../../shared/protocol';
import type { Conversation, MemoryItem, Message } from '../../types';
import { detectSecret } from '../../features/memory/secrets';

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export interface Backup {
  app: 'haerin-agent';
  version: 1;
  exportedAt: string;
  conversations: Conversation[];
  memories: MemoryItem[];
}
// Settings are deliberately not in backups: importing must never switch the AI mode silently.

export function createBackup(conversations: Conversation[], memories: MemoryItem[]): Backup {
  return { app: 'haerin-agent', version: 1, exportedAt: new Date().toISOString(), conversations, memories };
}

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ID = 100;

function parseMessage(v: unknown): Message | null {
  if (!isObject(v) || !isStr(v.id, ID) || (v.role !== 'user' && v.role !== 'assistant') || !isStr(v.content, 200_000) || !isNum(v.createdAt)) return null;
  const m: Message = { id: v.id, role: v.role, content: v.content, createdAt: v.createdAt };
  if (v.provider === 'ollama' || v.provider === 'gemini') m.provider = v.provider;
  if (isStr(v.model, 200)) m.model = v.model;
  // In-flight states are not restorable.
  m.status = v.status === 'error' || v.status === 'cancelled' ? v.status : 'done';
  if (m.status === 'error' && isObject(v.error) && isStr(v.error.message, 2000)) {
    m.error = { kind: 'unknown', message: v.error.message };
  }
  return m;
}

function parseConversation(v: unknown): Conversation | null {
  if (!isObject(v) || !isStr(v.id, ID) || !isStr(v.title, 500) || !isNum(v.createdAt) || !isNum(v.updatedAt) || !Array.isArray(v.messages)) return null;
  const messages = v.messages.map(parseMessage);
  if (messages.some((m) => m === null)) return null;
  // Consent is not imported: the user re-confirms cloud use on this device.
  return { id: v.id, title: v.title, createdAt: v.createdAt, updatedAt: v.updatedAt, messages: messages as Message[], cloudConsent: false };
}

function parseMemory(v: unknown): MemoryItem | null {
  if (!isObject(v) || !isStr(v.id, ID) || !isStr(v.text, 2000) || !isNum(v.createdAt) || !isNum(v.updatedAt)) return null;
  if (detectSecret(v.text)) return null;
  return { id: v.id, text: v.text, createdAt: v.createdAt, updatedAt: v.updatedAt };
}

/** Parses an exported file. All-or-nothing: any invalid record rejects the whole file. */
export function parseBackup(text: string): Backup | string {
  if (text.length > MAX_IMPORT_BYTES) return 'ไฟล์ใหญ่เกินไป';
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return 'ไฟล์ไม่ใช่ JSON ที่ถูกต้อง';
  }
  if (!isObject(raw) || raw.app !== 'haerin-agent') return 'ไม่ใช่ไฟล์ส่งออกของ Haerin Agent';
  if (raw.version !== 1) return `ไม่รองรับไฟล์เวอร์ชัน ${String(raw.version)}`;
  if (!Array.isArray(raw.conversations) || !Array.isArray(raw.memories)) return 'โครงสร้างไฟล์ไม่ถูกต้อง';
  const conversations = raw.conversations.map(parseConversation);
  if (conversations.some((c) => c === null)) return 'มีบทสนทนาที่ข้อมูลไม่ถูกต้องในไฟล์';
  const memories = raw.memories.map(parseMemory);
  if (memories.some((m) => m === null)) return 'มีรายการความจำที่ไม่ถูกต้องหรือดูเหมือนข้อมูลลับในไฟล์';
  return {
    app: 'haerin-agent',
    version: 1,
    exportedAt: isStr(raw.exportedAt, 100) ? raw.exportedAt : '',
    conversations: conversations as Conversation[],
    memories: memories as MemoryItem[],
  };
}
