import { useState } from 'react';
import type { Message, ProviderId } from '../../types';
import { Icon } from '../common/Icon';

/** Splits ``` fenced blocks from prose. Everything renders as text: no HTML from the model is executed. */
export function splitFences(text: string): { code: boolean; lang: string; body: string }[] {
  const parts: { code: boolean; lang: string; body: string }[] = [];
  const re = /```([^\n`]*)\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ code: false, lang: '', body: text.slice(last, m.index) });
    parts.push({ code: true, lang: m[1].trim(), body: m[2].replace(/\n$/, '') });
    last = re.lastIndex;
    if (m[0].length === 0) break;
  }
  if (last < text.length) parts.push({ code: false, lang: '', body: text.slice(last) });
  // Blank lines around code blocks are layout, not content.
  return parts.map((p) => (p.code ? p : { ...p, body: p.body.replace(/^\n+|\s+$/g, '') })).filter((p) => p.code || p.body);
}

export const PROVIDER_LABEL: Record<ProviderId, string> = { ollama: 'Local · Ollama', gemini: 'Cloud · Gemini' };

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function MessageItem({
  message,
  retryOptions,
  onRetry,
  onRemember,
}: {
  message: Message;
  /** Providers the user may explicitly retry with (already filtered by the current mode). */
  retryOptions: ProviderId[];
  onRetry: (override?: ProviderId) => void;
  onRemember: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: button simply doesn't confirm */
    }
  };

  return (
    <article className={`msg ${isUser ? 'msg-user' : 'msg-ai'}`} aria-label={isUser ? 'ข้อความของคุณ' : 'คำตอบของ Haerin'}>
      <div className="msg-bubble">
        {message.content ? (
          splitFences(message.content).map((p, i) =>
            p.code ? (
              <pre key={i} className="code" data-lang={p.lang || undefined}>
                <code>{p.body}</code>
              </pre>
            ) : (
              <p key={i} className="prose">{p.body}</p>
            ),
          )
        ) : streaming ? (
          <p className="thinking" role="status">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span className="sr-only">กำลังคิด…</span>
          </p>
        ) : null}
        {message.status === 'cancelled' && <p className="msg-note">หยุดการตอบแล้ว</p>}
        {message.status === 'error' && message.error && (
          <div className="msg-error" role="alert">
            <p>{message.error.message}</p>
            <div className="msg-error-actions">
              <button type="button" className="btn btn-sm" onClick={() => onRetry()}>
                <Icon name="retry" size={16} /> ลองอีกครั้ง
              </button>
              {retryOptions
                .filter((p) => p !== message.provider)
                .map((p) => (
                  <button key={p} type="button" className="btn btn-sm" onClick={() => onRetry(p)}>
                    ส่งผ่าน {PROVIDER_LABEL[p]}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
      <div className="msg-meta">
        <time dateTime={new Date(message.createdAt).toISOString()}>{time(message.createdAt)}</time>
        {!isUser && message.provider && (
          <span className={`chip chip-${message.provider}`}>
            {PROVIDER_LABEL[message.provider]}
            {message.model ? ` · ${message.model}` : ''}
          </span>
        )}
        {message.content && !streaming && (
          <span className="msg-actions">
            <button type="button" className="icon-btn icon-btn-sm" onClick={copy} aria-label={copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'} title="คัดลอก">
              <Icon name={copied ? 'check' : 'copy'} size={16} />
            </button>
            <button type="button" className="icon-btn icon-btn-sm" onClick={() => onRemember(message.content)} aria-label="บันทึกลงความจำ" title="บันทึกลงความจำ (ตรวจและแก้ก่อนบันทึก)">
              <Icon name="bookmarkAdd" size={16} />
            </button>
          </span>
        )}
      </div>
    </article>
  );
}
