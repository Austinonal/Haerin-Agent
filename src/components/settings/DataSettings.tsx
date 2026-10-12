import { useRef, useState } from 'react';
import { MAX_IMPORT_BYTES } from '../../services/storage/backup';
import { ConfirmDialog } from '../common/Dialog';

export function DataSettings({
  exportJson,
  importJson,
  deleteEverything,
}: {
  exportJson: () => string;
  importJson: (text: string) => Promise<string>;
  deleteEverything: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `haerin-agent-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ ok: true, text: 'ส่งออกไฟล์แล้ว — ไฟล์นี้มีบทสนทนาทั้งหมด เก็บไว้ในที่ปลอดภัย' });
  };

  const doImport = async (file: File) => {
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('ไฟล์ใหญ่เกินไป');
      setMessage({ ok: true, text: await importJson(await file.text()) });
    } catch (e) {
      setMessage({ ok: false, text: `นำเข้าไม่สำเร็จ: ${e instanceof Error ? e.message : 'ไม่ทราบสาเหตุ'} — ข้อมูลเดิมไม่ถูกแก้ไข` });
    }
  };

  return (
    <div className="stack">
      <p className="muted">ข้อมูลทั้งหมดเก็บใน IndexedDB ของเบราว์เซอร์นี้เท่านั้น ไม่มีการซิงก์ออนไลน์ ล้างข้อมูลเบราว์เซอร์ = ข้อมูลหาย ควรส่งออกไฟล์สำรองไว้</p>
      <div className="row">
        <button type="button" className="btn" onClick={download}>ส่งออกเป็น JSON</button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>นำเข้าจาก JSON…</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            setPending(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </div>
      {message && <p className={`status ${message.ok ? 'status-ok' : 'status-bad'}`} role="status">{message.text}</p>}
      <hr />
      <div>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmWipe(true)}>ลบข้อมูลทั้งหมดของแอป</button>
        <p className="muted">ลบบทสนทนา ความจำ และการตั้งค่าทั้งหมดในเครื่องนี้</p>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title="นำเข้าข้อมูล?"
        message={<>นำเข้า “{pending?.name}” — บทสนทนาหรือความจำที่มี ID ตรงกันจะถูกแทนที่ด้วยข้อมูลในไฟล์ การตั้งค่าจะไม่ถูกเปลี่ยน</>}
        confirmLabel="นำเข้า"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void doImport(pending);
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={confirmWipe}
        title="ลบข้อมูลทั้งหมด?"
        message="บทสนทนา ความจำ และการตั้งค่าทั้งหมดจะถูกลบถาวร กู้คืนไม่ได้ถ้าไม่ได้ส่งออกไฟล์ไว้"
        confirmLabel="ลบทั้งหมด"
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={() => {
          setConfirmWipe(false);
          deleteEverything()
            .then(() => setMessage({ ok: true, text: 'ลบข้อมูลทั้งหมดแล้ว' }))
            .catch(() => setMessage({ ok: false, text: 'ลบไม่สำเร็จ' }));
        }}
      />
    </div>
  );
}
