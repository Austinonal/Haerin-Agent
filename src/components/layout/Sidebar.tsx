import { useMemo, useState } from 'react';
import type { Conversation } from '../../types';
import { ConfirmDialog } from '../common/Dialog';
import { Icon, Mark } from '../common/Icon';

export function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onOpenMemory,
  onOpenSettings,
  onClose,
}: {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Conversation | null>(null);

  // shortcut: linear scan over all loaded chats; fine for personal-scale history, index it if it grows to thousands.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => m.content.toLowerCase().includes(q)));
  }, [conversations, query]);

  return (
    <>
      <div className={`scrim ${open ? 'scrim-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <nav className={`sidebar ${open ? 'sidebar-open' : ''}`} aria-label="รายการบทสนทนา">
        <div className="sidebar-top">
          <div className="brand">
            <Mark size={24} />
            <span>Haerin</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="ปิดเมนู">
            <Icon name="close" />
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={onNew}>
          <Icon name="plus" /> บทสนทนาใหม่
        </button>
        <div className="search">
          <Icon name="search" size={16} />
          <label htmlFor="chat-search" className="sr-only">ค้นหาบทสนทนา</label>
          <input id="chat-search" type="search" placeholder="ค้นหาในเครื่อง…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <ul className="conv-list">
          {filtered.length === 0 && <li className="conv-empty">{query ? 'ไม่พบบทสนทนาที่ตรงกัน' : 'ยังไม่มีบทสนทนา'}</li>}
          {filtered.map((c) => (
            <li key={c.id} className={`conv ${c.id === activeId ? 'conv-active' : ''}`}>
              {editing === c.id ? (
                <form
                  className="conv-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get('title');
                    if (typeof v === 'string') onRename(c.id, v);
                    setEditing(null);
                  }}
                >
                  <label htmlFor={`rename-${c.id}`} className="sr-only">ชื่อบทสนทนา</label>
                  <input id={`rename-${c.id}`} name="title" defaultValue={c.title} autoFocus maxLength={200} onBlur={(e) => e.currentTarget.form?.requestSubmit()} onKeyDown={(e) => e.key === 'Escape' && setEditing(null)} />
                </form>
              ) : (
                <>
                  <button type="button" className="conv-title" onClick={() => onSelect(c.id)} aria-current={c.id === activeId ? 'true' : undefined}>
                    {c.title}
                  </button>
                  <span className="conv-actions">
                    <button type="button" className="icon-btn icon-btn-sm" onClick={() => setEditing(c.id)} aria-label={`เปลี่ยนชื่อ ${c.title}`} title="เปลี่ยนชื่อ">
                      <Icon name="edit" size={16} />
                    </button>
                    <button type="button" className="icon-btn icon-btn-sm" onClick={() => setToDelete(c)} aria-label={`ลบ ${c.title}`} title="ลบ">
                      <Icon name="trash" size={16} />
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="sidebar-bottom">
          <button type="button" className="btn btn-ghost btn-block" onClick={onOpenMemory}>
            <Icon name="memory" /> ความจำ
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onOpenSettings}>
            <Icon name="settings" /> ตั้งค่า
          </button>
        </div>
      </nav>
      <ConfirmDialog
        open={toDelete !== null}
        title="ลบบทสนทนา?"
        message={<>ลบ “{toDelete?.title}” ออกจากเครื่องนี้ถาวร กู้คืนไม่ได้ (เว้นแต่คุณส่งออกไฟล์ไว้)</>}
        confirmLabel="ลบ"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) onDelete(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}
