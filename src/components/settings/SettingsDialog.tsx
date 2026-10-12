import { useState } from 'react';
import type { AppApi } from '../../app/useApp';
import { STYLE_LABELS } from '../../features/personality/prompt';
import { STYLE_KEYS, type Settings } from '../../types';
import { Dialog } from '../common/Dialog';
import { AiSettings } from './AiSettings';
import { DataSettings } from './DataSettings';

const TABS = [
  ['ai', 'AI และการเชื่อมต่อ'],
  ['persona', 'บุคลิกและภาษา'],
  ['privacy', 'ความเป็นส่วนตัว'],
  ['data', 'ข้อมูล'],
  ['look', 'การแสดงผล'],
  ['help', 'ช่วยเหลือ'],
] as const;
type Tab = (typeof TABS)[number][0];

export function SettingsDialog({ open, onClose, app }: { open: boolean; onClose: () => void; app: AppApi }) {
  const [tab, setTab] = useState<Tab>('ai');
  const { settings, setSettings } = app;

  return (
    <Dialog open={open} title="ตั้งค่า" onClose={onClose} wide>
      <div className="tabs" role="tablist" aria-label="หมวดการตั้งค่า">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} className="tab" onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
        {tab === 'ai' && <AiSettings settings={settings} setSettings={setSettings} checkHealth={app.checkHealth} />}
        {tab === 'persona' && <PersonaSettings settings={settings} setSettings={setSettings} />}
        {tab === 'privacy' && <PrivacySettings settings={settings} setSettings={setSettings} />}
        {tab === 'data' && <DataSettings exportJson={app.exportJson} importJson={app.importJson} deleteEverything={app.deleteEverything} />}
        {tab === 'look' && (
          <label className="field">
            <span>ธีม</span>
            <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value as Settings['theme'] })}>
              <option value="system">ตามระบบ</option>
              <option value="light">สว่าง</option>
              <option value="dark">มืด</option>
            </select>
          </label>
        )}
        {tab === 'help' && <Help />}
      </section>
    </Dialog>
  );
}

type Props = { settings: Settings; setSettings: (p: Partial<Settings>) => void };

function PersonaSettings({ settings, setSettings }: Props) {
  const [custom, setCustom] = useState(settings.customInstructions);
  return (
    <div className="stack">
      <p className="muted">Haerin เป็นตัวละคร AI ที่สร้างขึ้นใหม่ ไม่ใช่บุคคลจริง การตั้งค่าเหล่านี้ถูกใส่ลงในคำสั่งระบบที่ส่งให้โมเดลทุกครั้ง แต่ละโมเดลอาจทำตามได้ไม่เท่ากัน</p>
      <label className="field">
        <span>ความชัดของบุคลิก</span>
        <select value={settings.personaIntensity} onChange={(e) => setSettings({ personaIntensity: e.target.value as Settings['personaIntensity'] })}>
          <option value="subtle">เบา — เน้นช่วยงาน</option>
          <option value="balanced">พอดี</option>
          <option value="strong">ชัด</option>
        </select>
      </label>
      <fieldset>
        <legend>ปรับลักษณะการตอบ</legend>
        <div className="grid-2">
          {STYLE_KEYS.map((k) => (
            <label key={k} className="check">
              <input type="checkbox" checked={settings.style[k]} onChange={(e) => setSettings({ style: { ...settings.style, [k]: e.target.checked } })} />
              {STYLE_LABELS[k].th}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>ภาษา</span>
        <select value={settings.language} onChange={(e) => setSettings({ language: e.target.value as Settings['language'] })}>
          <option value="auto">ตามภาษาที่ผู้ใช้พิมพ์</option>
          <option value="th">ไทย</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="field">
        <span>คำสั่งเพิ่มเติม (ไม่บังคับ)</span>
        <textarea rows={3} maxLength={2000} value={custom} onChange={(e) => setCustom(e.target.value)} onBlur={() => setSettings({ customInstructions: custom })} placeholder="เช่น เรียกฉันว่า 'คุณ' และอธิบายศัพท์เทคนิคเสมอ" />
      </label>
    </div>
  );
}

function PrivacySettings({ settings, setSettings }: Props) {
  return (
    <div className="stack">
      <label className="check">
        <input type="checkbox" checked={settings.memoryEnabled} onChange={(e) => setSettings({ memoryEnabled: e.target.checked })} />
        ใช้ความจำที่บันทึกไว้ในการตอบ
      </label>
      <label className="check">
        <input type="checkbox" checked={settings.memoryToCloud} disabled={!settings.memoryEnabled} onChange={(e) => setSettings({ memoryToCloud: e.target.checked })} />
        อนุญาตให้ส่งความจำไปยัง Cloud AI ด้วย (ปิดไว้เป็นค่าเริ่มต้น)
      </label>
      <div className="note">
        <h3>ข้อมูลอะไรถูกส่งไปไหน</h3>
        <ul>
          <li><strong>Local Only:</strong> ข้อความไปที่ Ollama บนเครื่องคุณเท่านั้น</li>
          <li><strong>Cloud:</strong> ข้อความล่าสุด + ประวัติบางส่วนของบทสนทนานี้ + คำสั่งบุคลิก ถูกส่งผ่าน Backend ของคุณไปยัง Google Gemini ระบบถามยืนยันก่อนส่งครั้งแรกของแต่ละบทสนทนา</li>
          <li>Backend ไม่บันทึกเนื้อหาข้อความลง Log แต่ข้อมูลที่ส่งถึง Google อยู่ภายใต้ข้อกำหนดของ Google — ตรวจสอบเงื่อนไข Free Tier/การใช้ข้อมูลที่ ai.google.dev</li>
          <li>ไม่มีการเก็บ API Key ในแอปนี้ และไม่มีการซิงก์ข้อมูลออนไลน์</li>
        </ul>
      </div>
    </div>
  );
}

function Help() {
  return (
    <div className="stack help">
      <h3>เริ่มต้นเร็ว</h3>
      <ol>
        <li><strong>Local AI:</strong> ติดตั้ง Ollama จาก ollama.com → รัน <code>ollama pull &lt;ชื่อโมเดล&gt;</code> → แท็บ AI → ทดสอบการเชื่อมต่อ → เลือกโมเดล</li>
        <li><strong>Cloud AI:</strong> ขอ API Key จาก Google AI Studio → ใส่ใน <code>.dev.vars</code> (เครื่อง) หรือ <code>npx wrangler secret put GEMINI_API_KEY</code> (ออนไลน์) → รัน <code>npm run dev:worker</code></li>
      </ol>
      <h3>ปัญหาที่พบบ่อย</h3>
      <ul>
        <li><strong>เชื่อมต่อ Ollama ไม่ได้:</strong> เปิดโปรแกรม Ollama หรือยัง? ถ้าเปิดแอปจากโดเมนอื่นที่ไม่ใช่ localhost ต้องตั้ง <code>OLLAMA_ORIGINS</code></li>
        <li><strong>ไม่พบโมเดล:</strong> รัน <code>ollama list</code> เพื่อดูชื่อ แล้ว <code>ollama pull</code> ถ้ายังไม่มี</li>
        <li><strong>Backend ยังไม่ได้ตั้งค่า Key:</strong> ตั้ง <code>GEMINI_API_KEY</code> ตามด้านบน แล้วรีสตาร์ต worker</li>
        <li><strong>ถึงขีดจำกัด/โควตา:</strong> Free Tier มีข้อจำกัดและอาจเปลี่ยนได้ — รอหรือสลับไป Local เอง</li>
      </ul>
      <p className="muted">คู่มือเต็มอยู่ในไฟล์ README.md ของโปรเจกต์</p>
    </div>
  );
}
