import { describe, expect, it } from 'vitest';
import { route } from '../src/services/ai/router';
import { DEFAULT_SETTINGS } from '../src/services/storage/settings';
import type { Settings } from '../src/types';

const s = (patch: Partial<Settings>) => ({ ...DEFAULT_SETTINGS, ...patch });

describe('route', () => {
  it('Local Only always uses Ollama and refuses an explicit cloud override', () => {
    expect(route(s({ mode: 'local' }), 'hi')).toMatchObject({ ok: true, provider: 'ollama' });
    expect(route(s({ mode: 'local' }), 'hi', 'gemini')).toMatchObject({ ok: false });
  });

  it('Cloud mode uses Gemini, and refuses when cloud is disabled', () => {
    expect(route(s({ mode: 'cloud' }), 'hi')).toMatchObject({ ok: true, provider: 'gemini' });
    expect(route(s({ mode: 'cloud', cloudEnabled: false }), 'hi')).toMatchObject({ ok: false });
  });

  it('Hybrid forces Local when a private keyword appears, even with a cloud override', () => {
    const settings = s({ mode: 'hybrid', hybridPrefer: 'cloud', privateKeywords: ['รหัสผ่าน'] });
    expect(route(settings, 'ช่วยจำรหัสผ่านหน่อย')).toMatchObject({ ok: true, provider: 'ollama' });
    expect(route(settings, 'ช่วยจำรหัสผ่านหน่อย', 'gemini')).toMatchObject({ ok: true, provider: 'ollama' });
    expect(route(settings, 'สรุปบทความนี้')).toMatchObject({ ok: true, provider: 'gemini' });
  });

  it('Hybrid keyword match is case-insensitive and ignores blank keywords', () => {
    const settings = s({ mode: 'hybrid', hybridPrefer: 'cloud', privateKeywords: ['  ', 'Password'] });
    expect(route(settings, 'my PASSWORD is')).toMatchObject({ provider: 'ollama' });
    expect(route(settings, 'hello')).toMatchObject({ provider: 'gemini' });
  });

  it('Hybrid never picks cloud when cloud is disabled', () => {
    const settings = s({ mode: 'hybrid', hybridPrefer: 'cloud', cloudEnabled: false });
    expect(route(settings, 'hi')).toMatchObject({ ok: true, provider: 'ollama' });
    expect(route(settings, 'hi', 'gemini')).toMatchObject({ ok: false });
  });
});
