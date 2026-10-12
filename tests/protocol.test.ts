import { describe, expect, it } from 'vitest';
import { LIMITS, parseChatRequest, readLines } from '../shared/protocol';
import { collect, streamOf } from './helpers';

describe('parseChatRequest', () => {
  const ok = { system: 's', messages: [{ role: 'user', content: 'สวัสดี' }] };

  it('accepts a valid body and strips unknown fields', () => {
    expect(parseChatRequest({ ...ok, url: 'http://evil', messages: [{ role: 'user', content: 'x', extra: 1 }] })).toEqual({
      system: 's',
      messages: [{ role: 'user', content: 'x' }],
    });
  });

  it.each([
    ['non-object', 'x'],
    ['no messages', { system: '' }],
    ['empty messages', { system: '', messages: [] }],
    ['bad role', { system: '', messages: [{ role: 'system', content: 'x' }] }],
    ['empty content', { system: '', messages: [{ role: 'user', content: '' }] }],
    ['last not user', { system: '', messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }],
    ['too many messages', { system: '', messages: Array.from({ length: LIMITS.maxMessages + 1 }, () => ({ role: 'user', content: 'a' })) }],
    ['message too long', { system: '', messages: [{ role: 'user', content: 'a'.repeat(LIMITS.maxMessageChars + 1) }] }],
    ['system too long', { system: 'a'.repeat(LIMITS.maxSystemChars + 1), messages: ok.messages }],
  ])('rejects %s', (_, body) => {
    expect(typeof parseChatRequest(body)).toBe('string');
  });
});

describe('readLines', () => {
  it('reassembles lines split across chunks, including multi-byte Thai characters', async () => {
    const text = 'สวัสดีครับ\r\nline two\n{"a":"ภาษาไทย"}';
    for (const size of [1, 2, 3, 5, 64]) {
      expect(await collect(readLines(streamOf(text, size)))).toEqual(['สวัสดีครับ', 'line two', '{"a":"ภาษาไทย"}']);
    }
  });
});
