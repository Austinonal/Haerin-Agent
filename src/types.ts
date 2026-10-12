import type { ErrorKind } from '../shared/protocol';

export type ProviderId = 'ollama' | 'gemini';
export type Mode = 'local' | 'cloud' | 'hybrid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** Set on assistant messages: which provider/model actually answered. */
  provider?: ProviderId;
  model?: string;
  status?: 'streaming' | 'done' | 'error' | 'cancelled';
  error?: { kind: ErrorKind; message: string };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  /** User agreed to send this conversation's content to the cloud provider. */
  cloudConsent: boolean;
}

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export const STYLE_KEYS = ['calm', 'casual', 'analytical', 'concise', 'humor', 'actionOriented', 'academic'] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  mode: Mode;
  cloudEnabled: boolean;
  /** Public URL of the backend Worker. Empty = same origin (/api). Not a secret. */
  apiBaseUrl: string;
  ollamaUrl: string;
  ollamaModel: string;
  hybridPrefer: 'local' | 'cloud';
  privateKeywords: string[];
  language: 'auto' | 'th' | 'en';
  personaIntensity: 'subtle' | 'balanced' | 'strong';
  style: Record<StyleKey, boolean>;
  customInstructions: string;
  memoryEnabled: boolean;
  memoryToCloud: boolean;
}

export const newId = () => crypto.randomUUID();
