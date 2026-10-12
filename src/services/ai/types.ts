import type { ChatRequestBody, StreamEvent } from '../../../shared/protocol';
import type { ProviderId } from '../../types';

export interface HealthResult {
  ok: boolean;
  detail: string;
  /** Models the provider reports as available (Ollama), or the configured model (Gemini). */
  models: string[];
}

/** Common interface for every AI provider. UI code depends only on this. */
export interface ChatProvider {
  id: ProviderId;
  label: string;
  health(signal?: AbortSignal): Promise<HealthResult>;
  /** Never throws for expected failures: yields an `error` event instead. */
  stream(req: ChatRequestBody, signal: AbortSignal): AsyncGenerator<StreamEvent>;
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
