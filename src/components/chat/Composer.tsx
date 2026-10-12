import { useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../common/Icon';

export function Composer({ busy, onSend, onStop }: { busy: boolean; onSend: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (busy || !text.trim()) return;
    onSend(text);
    setText('');
    ref.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: don't send while a Thai/CJK IME is still composing.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="composer-input" className="sr-only">
        พิมพ์ข้อความ
      </label>
      <textarea
        id="composer-input"
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
        maxLength={16000}
      />
      {busy ? (
        <button type="button" className="send-btn send-btn-stop" onClick={onStop} aria-label="หยุดการตอบ" title="หยุดการตอบ">
          <Icon name="stop" />
        </button>
      ) : (
        <button type="submit" className="send-btn" disabled={!text.trim()} aria-label="ส่งข้อความ" title="ส่ง">
          <Icon name="send" />
        </button>
      )}
    </form>
  );
}
