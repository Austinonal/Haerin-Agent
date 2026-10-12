import { useEffect, useRef } from 'react';
import type { Conversation, Mode, ProviderId } from '../../types';
import { Mark } from '../common/Icon';
import { Composer } from './Composer';
import { MessageItem } from './MessageItem';

const MODE_HINT: Record<Mode, string> = {
  local: 'โหมด Local Only: ข้อความจะประมวลผลด้วย Ollama บนเครื่องนี้เท่านั้น',
  cloud: 'โหมด Cloud: ข้อความจะถูกส่งไป Gemini ผ่าน Backend (ต้องใช้อินเทอร์เน็ต)',
  hybrid: 'โหมด Hybrid: เลือก Local หรือ Cloud ตามกฎใน Settings และถามก่อนส่งไป Cloud ครั้งแรก',
};

export function ChatView({
  conversation,
  mode,
  busy,
  retryOptions,
  onSend,
  onStop,
  onRetry,
  onRemember,
  onOpenSettings,
}: {
  conversation: Conversation | null;
  mode: Mode;
  busy: boolean;
  retryOptions: ProviderId[];
  onSend: (text: string) => void;
  onStop: () => void;
  onRetry: (messageId: string, override?: ProviderId) => void;
  onRemember: (text: string) => void;
  onOpenSettings: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const messages = conversation?.messages ?? [];
  const lastLen = messages.at(-1)?.content.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, lastLen]);

  return (
    <main className="chat" aria-label="บทสนทนา">
      <div className="chat-scroll">
        {messages.length === 0 ? (
          <div className="empty">
            <Mark size={44} />
            <h1>สวัสดี ฉันชื่อ Haerin</h1>
            <p>ผู้ช่วย AI ตัวละครที่สร้างขึ้นใหม่ ไม่ใช่บุคคลจริง</p>
            <p className="empty-hint">{MODE_HINT[mode]}</p>
            <button type="button" className="btn" onClick={onOpenSettings}>
              ตั้งค่า AI และตรวจการเชื่อมต่อ
            </button>
          </div>
        ) : (
          <div className="messages" aria-live="polite">
            {messages.map((m) => (
              <MessageItem key={m.id} message={m} retryOptions={retryOptions} onRetry={(o) => onRetry(m.id, o)} onRemember={onRemember} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <Composer busy={busy} onSend={onSend} onStop={onStop} />
    </main>
  );
}
