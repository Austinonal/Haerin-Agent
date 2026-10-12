import { isObject } from '../../../shared/protocol';
import { STYLE_KEYS, type Settings } from '../../types';

// Small, non-secret preferences only. Never put keys or tokens here.
const KEY = 'haerin-agent:settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  mode: 'local',
  cloudEnabled: true,
  apiBaseUrl: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  hybridPrefer: 'local',
  privateKeywords: ['รหัสผ่าน', 'password', 'บัญชีธนาคาร', 'เลขบัตร', 'สุขภาพ', 'ส่วนตัว'],
  language: 'auto',
  personaIntensity: 'balanced',
  style: Object.fromEntries(STYLE_KEYS.map((k) => [k, false])) as Settings['style'],
  customInstructions: '',
  memoryEnabled: true,
  memoryToCloud: false,
};

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback: string, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : fallback);

/** Validates unknown input field by field; anything invalid falls back to the default. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!isObject(raw)) return { ...d, style: { ...d.style } };
  const style = isObject(raw.style) ? raw.style : {};
  return {
    theme: pick(raw.theme, ['system', 'light', 'dark'], d.theme),
    mode: pick(raw.mode, ['local', 'cloud', 'hybrid'], d.mode),
    cloudEnabled: bool(raw.cloudEnabled, d.cloudEnabled),
    apiBaseUrl: str(raw.apiBaseUrl, d.apiBaseUrl, 300),
    ollamaUrl: str(raw.ollamaUrl, d.ollamaUrl, 300),
    ollamaModel: str(raw.ollamaModel, d.ollamaModel, 200),
    hybridPrefer: pick(raw.hybridPrefer, ['local', 'cloud'], d.hybridPrefer),
    privateKeywords: Array.isArray(raw.privateKeywords)
      ? raw.privateKeywords.filter((k): k is string => typeof k === 'string').map((k) => k.slice(0, 100)).slice(0, 100)
      : d.privateKeywords,
    language: pick(raw.language, ['auto', 'th', 'en'], d.language),
    personaIntensity: pick(raw.personaIntensity, ['subtle', 'balanced', 'strong'], d.personaIntensity),
    style: Object.fromEntries(STYLE_KEYS.map((k) => [k, bool(style[k], false)])) as Settings['style'],
    customInstructions: str(raw.customInstructions, d.customInstructions),
    memoryEnabled: bool(raw.memoryEnabled, d.memoryEnabled),
    memoryToCloud: bool(raw.memoryToCloud, d.memoryToCloud),
  };
}

export function loadSettings(): Settings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked (private mode): settings simply won't persist.
  }
}

export const clearSettings = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
