import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, parseBackup } from '../src/services/storage/backup';
import { db } from '../src/services/storage/db';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/services/storage/settings';
import type { Conversation, MemoryItem } from '../src/types';

const conv = (id: string, updatedAt: number): Conversation => ({
  id,
  title: `t-${id}`,
  createdAt: 1,
  updatedAt,
  cloudConsent: true,
  messages: [
    { id: `${id}-u`, role: 'user', content: 'สวัสดี', createdAt: 1, status: 'done' },
    { id: `${id}-a`, role: 'assistant', content: 'ครับ', createdAt: 2, status: 'done', provider: 'ollama', model: 'm' },
  ],
});
const mem: MemoryItem = { id: 'm1', text: 'ชอบชาเขียว', createdAt: 1, updatedAt: 1 };

beforeEach(() => db.clearAll());

describe('IndexedDB storage', () => {
  it('persists, orders by recency and deletes conversations', async () => {
    await db.putConversation(conv('a', 1));
    await db.putConversation(conv('b', 2));
    expect((await db.listConversations()).map((c) => c.id)).toEqual(['b', 'a']);
    await db.deleteConversation('b');
    expect((await db.listConversations()).map((c) => c.id)).toEqual(['a']);
  });

  it('memory delete really removes the record', async () => {
    await db.putMemory(mem);
    await db.deleteMemory('m1');
    expect(await db.listMemories()).toEqual([]);
  });

  it('clearAll wipes everything', async () => {
    await db.putConversation(conv('a', 1));
    await db.putMemory(mem);
    await db.clearAll();
    expect(await db.listConversations()).toEqual([]);
    expect(await db.listMemories()).toEqual([]);
  });
});

describe('backup export/import', () => {
  it('round-trips conversations and memories, resetting cloud consent', async () => {
    const parsed = parseBackup(JSON.stringify(createBackup([conv('a', 5)], [mem])));
    if (typeof parsed === 'string') throw new Error(parsed);
    expect(parsed.memories).toEqual([mem]);
    expect(parsed.conversations[0]).toEqual({ ...conv('a', 5), cloudConsent: false });
    await db.importAll(parsed.conversations, parsed.memories);
    expect(await db.listConversations()).toHaveLength(1);
  });

  it.each([
    ['not JSON', '{oops'],
    ['wrong app', JSON.stringify({ app: 'other', version: 1, conversations: [], memories: [] })],
    ['future version', JSON.stringify({ app: 'haerin-agent', version: 2, conversations: [], memories: [] })],
    ['bad message role', JSON.stringify({ app: 'haerin-agent', version: 1, conversations: [{ ...conv('a', 1), messages: [{ id: 'x', role: 'system', content: 'x', createdAt: 1 }] }], memories: [] })],
    ['secret in memory', JSON.stringify({ app: 'haerin-agent', version: 1, conversations: [], memories: [{ ...mem, text: 'password=hunter22' }] })],
  ])('rejects %s', (_, text) => expect(typeof parseBackup(text)).toBe('string'));

  it('ignores prototype-pollution keys', () => {
    const text = '{"app":"haerin-agent","version":1,"conversations":[],"memories":[],"__proto__":{"polluted":true}}';
    expect(typeof parseBackup(text)).toBe('object');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('a rejected import leaves existing data untouched', async () => {
    await db.putConversation(conv('keep', 1));
    expect(typeof parseBackup('{"app":"haerin-agent","version":1,"conversations":[{"id":1}],"memories":[]}')).toBe('string');
    expect((await db.listConversations()).map((c) => c.id)).toEqual(['keep']);
  });
});

describe('settings', () => {
  it('falls back to defaults for invalid values', () => {
    const s = sanitizeSettings({ mode: 'cloud-everything', theme: 'dark', privateKeywords: [1, 'ok'], style: { concise: 'yes', humor: true } });
    expect(s.mode).toBe(DEFAULT_SETTINGS.mode);
    expect(s.theme).toBe('dark');
    expect(s.privateKeywords).toEqual(['ok']);
    expect(s.style.concise).toBe(false);
    expect(s.style.humor).toBe(true);
  });
});
