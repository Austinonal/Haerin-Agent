import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorKind } from '../../shared/protocol';
import { detectSecret } from '../features/memory/secrets';
import { buildRequest, memoriesFor } from '../features/personality/prompt';
import { createCloudProvider } from '../services/ai/cloud';
import { createOllamaProvider } from '../services/ai/ollama';
import { route } from '../services/ai/router';
import type { ChatProvider, HealthResult } from '../services/ai/types';
import { createBackup, parseBackup } from '../services/storage/backup';
import { db } from '../services/storage/db';
import { clearSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/storage/settings';
import { newId, type Conversation, type MemoryItem, type Message, type ProviderId, type Settings } from '../types';

export function providerFor(id: ProviderId, s: Settings): ChatProvider {
  return id === 'ollama' ? createOllamaProvider(s.ollamaUrl, s.ollamaModel) : createCloudProvider(s.apiBaseUrl);
}

export interface PendingConsent {
  conversationId: string;
  override?: ProviderId;
  historyCount: number;
  memoryCount: number;
}

const blankConversation = (): Conversation => {
  const now = Date.now();
  return { id: newId(), title: 'บทสนทนาใหม่', createdAt: now, updatedAt: now, messages: [], cloudConsent: false };
};

export function useApp() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const convRef = useRef<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    Promise.all([db.listConversations(), db.listMemories()])
      .then(([c, m]) => {
        convRef.current = c;
        setConversations(c);
        setMemories(m);
        setActiveId(c[0]?.id ?? null);
      })
      .catch(() => setLoadError('เปิดฐานข้อมูลในเครื่องไม่ได้ — เบราว์เซอร์อาจปิด IndexedDB (เช่นโหมดส่วนตัว) ข้อมูลจะไม่ถูกบันทึก'));
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // --- conversations ---------------------------------------------------------
  const commit = (list: Conversation[]) => {
    convRef.current = list;
    setConversations(list);
  };

  const mutate = useCallback((id: string, fn: (c: Conversation) => Conversation, persist = true) => {
    let updated: Conversation | undefined;
    commit(convRef.current.map((c) => (c.id === id ? (updated = fn(c)) : c)));
    if (persist && updated) db.putConversation(updated).catch(() => setLoadError('บันทึกบทสนทนาไม่สำเร็จ'));
  }, []);

  const newChat = useCallback(() => {
    const c = blankConversation();
    commit([c, ...convRef.current]);
    setActiveId(c.id);
    return c;
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    const t = title.trim().slice(0, 200);
    if (t) mutate(id, (c) => ({ ...c, title: t }));
  }, [mutate]);

  const deleteChat = useCallback(async (id: string) => {
    if (busyId === id) abortRef.current?.abort();
    await db.deleteConversation(id);
    commit(convRef.current.filter((c) => c.id !== id));
    setActiveId((cur) => (cur === id ? (convRef.current[0]?.id ?? null) : cur));
  }, [busyId]);

  // --- chat ------------------------------------------------------------------
  const generate = useCallback(async (conversationId: string, override?: ProviderId, consentGiven = false) => {
    const conv = convRef.current.find((c) => c.id === conversationId);
    const last = conv?.messages.at(-1);
    if (!conv || !last || last.role !== 'user') return;

    const decision = route(settings, last.content, override);
    const assistant: Message = { id: newId(), role: 'assistant', content: '', createdAt: Date.now(), status: 'streaming' };
    const fail = (kind: ErrorKind, message: string, provider?: ProviderId) =>
      mutate(conversationId, (c) => ({
        ...c,
        messages: [...c.messages.filter((m) => m.id !== assistant.id), { ...assistant, provider, status: 'error', error: { kind, message } }],
      }));

    if (!decision.ok) return fail('refused', decision.reason);
    const provider = decision.provider;

    if (provider === 'gemini' && !conv.cloudConsent && !consentGiven) {
      setPendingConsent({
        conversationId,
        override,
        historyCount: conv.messages.length - 1,
        memoryCount: memoriesFor('gemini', settings, memories)?.length ?? 0,
      });
      return;
    }
    if (provider === 'gemini' && !conv.cloudConsent) mutate(conversationId, (c) => ({ ...c, cloudConsent: true }));

    const request = buildRequest(provider, settings, { ...conv, messages: conv.messages.slice(0, -1) }, memories, last.content);
    const controller = new AbortController();
    abortRef.current = controller;
    setBusyId(conversationId);
    mutate(conversationId, (c) => ({ ...c, messages: [...c.messages, { ...assistant, provider, model: provider === 'ollama' ? settings.ollamaModel : undefined }] }), false);

    let text = '';
    let ended = false;
    try {
      for await (const ev of providerFor(provider, settings).stream(request, controller.signal)) {
        if (ev.type === 'delta') {
          text += ev.text;
          mutate(conversationId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === assistant.id ? { ...m, content: text } : m)) }), false);
        } else {
          ended = true;
          const status = ev.type === 'done' ? 'done' : ev.kind === 'cancelled' ? 'cancelled' : 'error';
          mutate(conversationId, (c) => ({
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistant.id
                ? {
                    ...m,
                    content: text,
                    status,
                    model: ev.type === 'done' ? ev.model : m.model,
                    error: ev.type === 'error' && status === 'error' ? { kind: ev.kind, message: ev.message } : undefined,
                  }
                : m,
            ),
          }));
          break;
        }
      }
      if (!ended) fail('malformed_response', 'การตอบสิ้นสุดโดยไม่สมบูรณ์', provider);
    } catch {
      fail('unknown', 'เกิดข้อผิดพลาดที่ไม่คาดคิด', provider);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusyId(null);
    }
  }, [settings, memories, mutate]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || busyId) return;
    const conv = convRef.current.find((c) => c.id === activeId) ?? newChat();
    const msg: Message = { id: newId(), role: 'user', content, createdAt: Date.now(), status: 'done' };
    mutate(conv.id, (c) => ({
      ...c,
      title: c.messages.length === 0 ? content.slice(0, 40) : c.title,
      updatedAt: Date.now(),
      messages: [...c.messages, msg],
    }));
    await generate(conv.id);
  }, [activeId, busyId, generate, mutate, newChat]);

  /** Removes a failed/cancelled reply and asks again, optionally with an explicitly chosen provider. */
  const retry = useCallback(async (messageId: string, override?: ProviderId) => {
    if (busyId || !activeId) return;
    mutate(activeId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== messageId) }));
    await generate(activeId, override);
  }, [activeId, busyId, generate, mutate]);

  const answerConsent = useCallback(async (accept: boolean) => {
    const p = pendingConsent;
    setPendingConsent(null);
    if (!p) return;
    if (accept) return generate(p.conversationId, p.override, true);
    const conv = convRef.current.find((c) => c.id === p.conversationId);
    if (conv) {
      mutate(p.conversationId, (c) => ({
        ...c,
        messages: [...c.messages, { id: newId(), role: 'assistant', content: '', createdAt: Date.now(), status: 'error', error: { kind: 'refused', message: 'ไม่ได้ส่งไป Cloud ตามที่คุณเลือก' } }],
      }));
    }
  }, [pendingConsent, generate, mutate]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // --- memory ----------------------------------------------------------------
  /** Returns an error message, or null on success. */
  const saveMemory = useCallback(async (text: string, id?: string): Promise<string | null> => {
    const t = text.trim();
    if (!t) return 'ข้อความว่าง';
    if (t.length > 2000) return 'ยาวเกิน 2000 ตัวอักษร';
    const secret = detectSecret(t);
    if (secret) return `ไม่บันทึก: ดูเหมือนมีข้อมูลลับ (${secret})`;
    const now = Date.now();
    const existing = memories.find((m) => m.id === id);
    const item: MemoryItem = existing ? { ...existing, text: t, updatedAt: now } : { id: newId(), text: t, createdAt: now, updatedAt: now };
    await db.putMemory(item);
    setMemories(await db.listMemories());
    return null;
  }, [memories]);

  const deleteMemory = useCallback(async (id: string) => {
    await db.deleteMemory(id);
    setMemories(await db.listMemories());
  }, []);

  const clearMemories = useCallback(async () => {
    await db.clearMemories();
    setMemories([]);
  }, []);

  // --- data ------------------------------------------------------------------
  const exportJson = useCallback(() => JSON.stringify(createBackup(convRef.current, memories), null, 2), [memories]);

  const importJson = useCallback(async (text: string): Promise<string> => {
    const backup = parseBackup(text);
    if (typeof backup === 'string') throw new Error(backup);
    await db.importAll(backup.conversations, backup.memories);
    const [c, m] = await Promise.all([db.listConversations(), db.listMemories()]);
    commit(c);
    setMemories(m);
    return `นำเข้า ${backup.conversations.length} บทสนทนา และ ${backup.memories.length} ความจำ`;
  }, []);

  const deleteEverything = useCallback(async () => {
    abortRef.current?.abort();
    await db.clearAll();
    clearSettings();
    commit([]);
    setMemories([]);
    setActiveId(null);
    setSettingsState({ ...DEFAULT_SETTINGS, style: { ...DEFAULT_SETTINGS.style } });
  }, []);

  const checkHealth = useCallback((id: ProviderId, signal?: AbortSignal): Promise<HealthResult> => providerFor(id, settings).health(signal), [settings]);

  return {
    settings, setSettings,
    conversations, activeId, setActiveId, active: conversations.find((c) => c.id === activeId) ?? null,
    newChat, renameChat, deleteChat,
    send, retry, stop, busyId,
    pendingConsent, answerConsent,
    memories, saveMemory, deleteMemory, clearMemories,
    exportJson, importJson, deleteEverything,
    checkHealth, loadError,
  };
}

export type AppApi = ReturnType<typeof useApp>;
