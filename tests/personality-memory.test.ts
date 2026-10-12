import { describe, expect, it } from 'vitest';
import { detectSecret } from '../src/features/memory/secrets';
import { buildHistory, buildRequest, buildSystemPrompt } from '../src/features/personality/prompt';
import { DEFAULT_SETTINGS } from '../src/services/storage/settings';
import type { Conversation, MemoryItem, Settings } from '../src/types';

const memory: MemoryItem = { id: 'm1', text: 'ผู้ใช้ชื่อเล่นว่ามิน', createdAt: 1, updatedAt: 1 };
const conv = (messages: Conversation['messages']): Conversation => ({ id: 'c', title: 't', createdAt: 0, updatedAt: 0, messages, cloudConsent: false });
const msg = (role: 'user' | 'assistant', content: string, status: 'done' | 'error' = 'done') => ({ id: content, role, content, createdAt: 0, status });

describe('system prompt', () => {
  it('states the assistant is a fictional AI, not a real person', () => {
    expect(buildSystemPrompt(DEFAULT_SETTINGS, [])).toMatch(/original fictional AI/);
  });

  it('applies style toggles, intensity and custom instructions', () => {
    const s: Settings = { ...DEFAULT_SETTINGS, personaIntensity: 'subtle', style: { ...DEFAULT_SETTINGS.style, concise: true }, customInstructions: 'เรียกฉันว่าคุณ' };
    const p = buildSystemPrompt(s, []);
    expect(p).toContain('Keep answers short');
    expect(p).toContain('subtle');
    expect(p).toContain('เรียกฉันว่าคุณ');
    expect(buildSystemPrompt(DEFAULT_SETTINGS, [])).not.toContain('Keep answers short');
  });

  it('includes memories for local, excludes them for cloud unless allowed, and excludes when disabled', () => {
    const c = conv([]);
    expect(buildRequest('ollama', DEFAULT_SETTINGS, c, [memory], 'hi').system).toContain(memory.text);
    expect(buildRequest('gemini', DEFAULT_SETTINGS, c, [memory], 'hi').system).not.toContain(memory.text);
    expect(buildRequest('gemini', { ...DEFAULT_SETTINGS, memoryToCloud: true }, c, [memory], 'hi').system).toContain(memory.text);
    expect(buildRequest('ollama', { ...DEFAULT_SETTINGS, memoryEnabled: false }, c, [memory], 'hi').system).not.toContain(memory.text);
  });

  it('tells the model not to claim memories when none exist', () => {
    expect(buildSystemPrompt(DEFAULT_SETTINGS, [])).toMatch(/no saved memories/);
    expect(buildSystemPrompt(DEFAULT_SETTINGS, null)).toMatch(/Do not claim to remember/);
  });
});

describe('history', () => {
  it('skips failed replies, starts with a user turn and ends with the new message', () => {
    const h = buildHistory(conv([msg('assistant', 'orphan'), msg('user', 'q1'), msg('assistant', 'a1'), msg('assistant', 'oops', 'error')]), 'q2');
    expect(h).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
    ]);
  });
});

describe('detectSecret', () => {
  it.each([
    'my key is AIzaSyA1234567890abcdefghijklmnopqrstu',
    'sk-abcdefghijklmnop1234',
    'รหัสผ่าน: hunter22',
    'password=correcthorse',
    'บัตร 4111 1111 1111 1111',
    '-----BEGIN RSA PRIVATE KEY-----',
  ])('flags %s', (t) => expect(detectSecret(t)).not.toBeNull());

  it.each(['ฉันชอบกาแฟดำ', 'I prefer short answers', 'นัดหมอวันที่ 12'])('allows %s', (t) => expect(detectSecret(t)).toBeNull());
});
