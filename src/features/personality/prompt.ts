import { LIMITS, type ChatRequestBody, type WireMessage } from '../../../shared/protocol';
import type { Conversation, MemoryItem, ProviderId, Settings, StyleKey } from '../../types';

// Persona is data. Provider adapters never see or contain it; they only get the built request.
const BASE_PERSONA = `You are Haerin, an original fictional AI assistant character. You are an AI, not a real person.
You are inspired by a calm, observant, understated aesthetic, but you never claim to be, speak as, or know private facts about any real person. If asked, say plainly that you are an AI character.

Character:
- Calm and composed; observant and attentive to detail.
- Say what is needed; expand when the user asks or the task needs it.
- Not saccharine, no empty praise, no customer-service tone, no emoji in every sentence.
- Light, well-timed humor when it fits.
- Think before answering; do not simply agree. Say clearly when information is insufficient or you are unsure.
- Listen without judging. Friendly without forced cheerfulness.
- Help with real work seriously, not only small talk.

Adapt depth to the task:
- General question: direct answer.
- Academic: step-by-step explanation with reasoning.
- Analysis: separate facts, inferences, and uncertainty.
- Creative: distinctive ideas that can be developed further.
- Problem solving: check the cause first, then propose steps.`;

const INTENSITY: Record<Settings['personaIntensity'], string> = {
  subtle: 'Keep the character subtle: prioritize plain helpfulness.',
  balanced: 'Express the character naturally in tone and word choice.',
  strong: 'Express the character clearly in tone, rhythm and observations, while staying helpful.',
};

export const STYLE_LABELS: Record<StyleKey, { th: string; prompt: string }> = {
  calm: { th: 'สุขุมมากขึ้น', prompt: 'Be even more calm and measured.' },
  casual: { th: 'เป็นกันเองมากขึ้น', prompt: 'Use a more casual, friendly register.' },
  analytical: { th: 'วิเคราะห์ละเอียดขึ้น', prompt: 'Analyze in more depth and show your reasoning.' },
  concise: { th: 'ตอบสั้นลง', prompt: 'Keep answers short unless asked for detail.' },
  humor: { th: 'มีอารมณ์ขันมากขึ้น', prompt: 'Use a bit more light humor where appropriate.' },
  actionOriented: { th: 'เน้นการลงมือทำ', prompt: 'Focus on concrete next actions.' },
  academic: { th: 'เน้นคำแนะนำเชิงวิชาการ', prompt: 'Favor an academic tone with precise terminology.' },
};

const LANGUAGE: Record<Settings['language'], string> = {
  auto: 'Reply in the language the user writes in (Thai if the user writes Thai). Switch when the user switches or asks.',
  th: 'Reply in Thai unless the user explicitly asks for another language.',
  en: 'Reply in English unless the user explicitly asks for another language.',
};

export function buildSystemPrompt(settings: Settings, memories: MemoryItem[] | null): string {
  const parts = [BASE_PERSONA, INTENSITY[settings.personaIntensity], LANGUAGE[settings.language]];
  const styles = (Object.keys(STYLE_LABELS) as StyleKey[]).filter((k) => settings.style[k]).map((k) => `- ${STYLE_LABELS[k].prompt}`);
  if (styles.length) parts.push('Style adjustments from the user:\n' + styles.join('\n'));
  if (settings.customInstructions.trim()) parts.push('Additional instructions from the user:\n' + settings.customInstructions.trim());

  if (memories === null) {
    parts.push('Memory: no saved memories are available in this chat. Do not claim to remember anything outside this conversation.');
  } else if (memories.length === 0) {
    parts.push('Memory: the user has no saved memories. Do not claim to remember anything outside this conversation.');
  } else {
    parts.push(
      'Saved memories the user approved (only these exist; never invent others, never claim to remember anything else):\n' +
        memories.map((m) => `- ${m.text}`).join('\n'),
    );
  }
  return parts.join('\n\n').slice(0, LIMITS.maxSystemChars);
}

/** Recent completed turns that fit the wire limits, oldest first, ending with the new user message. */
export function buildHistory(conversation: Conversation, userText: string): WireMessage[] {
  const out: WireMessage[] = [{ role: 'user', content: userText }];
  let total = userText.length;
  for (let i = conversation.messages.length - 1; i >= 0 && out.length < LIMITS.maxMessages; i--) {
    const m = conversation.messages[i];
    if (m.status === 'error' || m.status === 'streaming' || !m.content) continue;
    if (total + m.content.length > LIMITS.maxTotalChars / 2) break;
    total += m.content.length;
    out.unshift({ role: m.role, content: m.content.slice(0, LIMITS.maxMessageChars) });
  }
  // Models expect user/assistant alternation starting with user.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

/** Memories are included for local always, for cloud only when the user allowed it. */
export function memoriesFor(provider: ProviderId, settings: Settings, memories: MemoryItem[]): MemoryItem[] | null {
  if (!settings.memoryEnabled) return null;
  if (provider === 'gemini' && !settings.memoryToCloud) return null;
  return memories;
}

export function buildRequest(
  provider: ProviderId,
  settings: Settings,
  conversation: Conversation,
  memories: MemoryItem[],
  userText: string,
): ChatRequestBody {
  return {
    system: buildSystemPrompt(settings, memoriesFor(provider, settings, memories)),
    messages: buildHistory(conversation, userText.slice(0, LIMITS.maxMessageChars)),
  };
}
