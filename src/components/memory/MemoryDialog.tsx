import { useState } from 'react';
import type { MemoryItem } from '../../types';
import { ConfirmDialog, Dialog } from '../common/Dialog';
import { Icon } from '../common/Icon';

export function MemoryDialog({
  open,
  onClose,
  memories,
  enabled,
  draft,
  onSave,
  onDelete,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  enabled: boolean;
  /** Text proposed from a chat message; the user reviews/edits it before saving. */
  draft: string;
  onSave: (text: string, id?: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  return (
    <Dialog open={open} title="ความจำ" onClose={onClose} wide>
      {/* key resets the editor when a new draft arrives */}
      <MemoryBody key={draft} {...{ memories, enabled, draft, onSave, onDelete, onClear }} />
    </Dialog>
  );
}

function MemoryBody({
  memories,
  enabled,
  draft,
  onSave,
  onDelete,
  onClear,
}: {
  memories: MemoryItem[];
  enabled: boolean;
  draft: string;
  onSave: (text: string, id?: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [text, setText] = useState(draft.slice(0, 2000));
  const [editingId, setEditingId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const submit = async () => {
    const err = await onSave(text, editingId);
    setError(err);
    if (!err) {
      setText('');
      setEditingId(undefined);
    }
  };

  return (
    <div className="stack">
      <p className="muted">
        ความจำคือข้อมูลที่คุณอนุญาตให้ Haerin ใช้ข้ามบทสนทนา ระบบไม่บันทึกอะไรเองอัตโนมัติ และจะไม่บันทึกสิ่งที่ดูเหมือนรหัสผ่านหรือ Key
        {!enabled && <strong> — ตอนนี้ปิดการใช้ความจำอยู่ (เปิดได้ที่ ตั้งค่า → ความเป็นส่วนตัว)</strong>}
      </p>
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="field">
          <span>{editingId ? 'แก้ไขความจำ' : 'เพิ่มความจำใหม่'}</span>
          <textarea rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={Boolean(error)} aria-describedby="memory-error" placeholder="เช่น ฉันชอบคำตอบสั้น ๆ และกำลังเรียนออกแบบกราฟิก" />
          {error && <small id="memory-error" className="text-danger">{error}</small>}
        </label>
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>{editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}</button>
          {(editingId || text) && (
            <button type="button" className="btn" onClick={() => { setText(''); setEditingId(undefined); setError(null); }}>ยกเลิก</button>
          )}
        </div>
      </form>
      <h3>สิ่งที่จำอยู่ ({memories.length})</h3>
      {memories.length === 0 ? (
        <p className="muted">ยังไม่มีความจำ — Haerin จะไม่อ้างว่าจำอะไรได้นอกบทสนทนาปัจจุบัน</p>
      ) : (
        <ul className="memory-list">
          {memories.map((m) => (
            <li key={m.id}>
              <p>{m.text}</p>
              <span className="conv-actions">
                <button type="button" className="icon-btn icon-btn-sm" aria-label="แก้ไขความจำนี้" title="แก้ไข" onClick={() => { setEditingId(m.id); setText(m.text); setError(null); }}>
                  <Icon name="edit" size={16} />
                </button>
                <button type="button" className="icon-btn icon-btn-sm" aria-label="ลบความจำนี้" title="ลบ" onClick={() => void onDelete(m.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {memories.length > 0 && (
        <div>
          <button type="button" className="btn btn-danger" onClick={() => setConfirmClear(true)}>ลบความจำทั้งหมด</button>
        </div>
      )}
      <ConfirmDialog
        open={confirmClear}
        title="ลบความจำทั้งหมด?"
        message="ความจำทั้งหมดจะถูกลบออกจากเครื่องนี้ถาวร"
        confirmLabel="ลบทั้งหมด"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void onClear();
        }}
      />
    </div>
  );
}
