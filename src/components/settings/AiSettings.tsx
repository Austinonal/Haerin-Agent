import { useState } from 'react';
import type { HealthResult } from '../../services/ai/types';
import { normalizeLocalUrl } from '../../services/ai/ollama';
import type { ProviderId, Settings } from '../../types';

type Check = { state: 'idle' | 'checking' } | { state: 'done'; result: HealthResult };

export function AiSettings({
  settings,
  setSettings,
  checkHealth,
}: {
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  checkHealth: (id: ProviderId) => Promise<HealthResult>;
}) {
  const [local, setLocal] = useState<Check>({ state: 'idle' });
  const [cloud, setCloud] = useState<Check>({ state: 'idle' });
  const [keywords, setKeywords] = useState(settings.privateKeywords.join(', '));
  const localModels = local.state === 'done' ? local.result.models : [];
  const urlInvalid = !normalizeLocalUrl(settings.ollamaUrl);

  const run = async (id: ProviderId, set: (c: Check) => void) => {
    set({ state: 'checking' });
    set({ state: 'done', result: await checkHealth(id) });
  };

  return (
    <div className="stack">
      <fieldset>
        <legend>โหมดประมวลผล</legend>
        {(
          [
            ['local', 'Local Only', 'ใช้ Ollama บนเครื่องนี้เท่านั้น ไม่ส่งข้อมูลไป Cloud เลย แม้ Local จะใช้ไม่ได้'],
            ['cloud', 'Cloud', 'ส่งไป Gemini ผ่าน Backend ของคุณ ต้องใช้อินเทอร์เน็ต และอาจมีโควตา/ค่าใช้จ่าย'],
            ['hybrid', 'Hybrid', 'เลือกตามกฎด้านล่าง ข้อความที่มีคำส่วนตัวจะใช้ Local เสมอ'],
          ] as const
        ).map(([value, label, hint]) => (
          <label key={value} className="radio">
            <input type="radio" name="mode" value={value} checked={settings.mode === value} disabled={value === 'cloud' && !settings.cloudEnabled} onChange={() => setSettings({ mode: value })} />
            <span>
              <strong>{label}</strong>
              <small>{hint}</small>
            </span>
          </label>
        ))}
        <label className="check">
          <input
            type="checkbox"
            checked={settings.cloudEnabled}
            onChange={(e) => setSettings({ cloudEnabled: e.target.checked, ...(e.target.checked || settings.mode !== 'cloud' ? {} : { mode: 'local' }) })}
          />
          เปิดใช้ Cloud AI (ปิดเพื่อไม่ให้มีการส่งไป Cloud เลย)
        </label>
      </fieldset>

      <fieldset>
        <legend>Local AI (Ollama)</legend>
        <label className="field">
          <span>Ollama URL</span>
          <input value={settings.ollamaUrl} onChange={(e) => setSettings({ ollamaUrl: e.target.value })} aria-invalid={urlInvalid} aria-describedby="ollama-url-hint" />
          <small id="ollama-url-hint" className={urlInvalid ? 'text-danger' : ''}>
            {urlInvalid ? 'ต้องเป็น localhost หรือ IP ในเครือข่ายภายใน (เช่น 192.168.x.x) เท่านั้น' : 'ค่าเริ่มต้น http://localhost:11434'}
          </small>
        </label>
        <div className="row">
          <button type="button" className="btn" onClick={() => run('ollama', setLocal)} disabled={local.state === 'checking'}>
            {local.state === 'checking' ? 'กำลังตรวจ…' : 'ทดสอบการเชื่อมต่อ / โหลดรายชื่อโมเดล'}
          </button>
        </div>
        {local.state === 'done' && <Status result={local.result} />}
        <label className="field">
          <span>โมเดล Local</span>
          {localModels.length ? (
            <select value={settings.ollamaModel} onChange={(e) => setSettings({ ollamaModel: e.target.value })}>
              <option value="">— เลือกโมเดล —</option>
              {[...new Set([settings.ollamaModel, ...localModels])].filter(Boolean).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input value={settings.ollamaModel} placeholder="กดทดสอบด้านบนเพื่อโหลดรายชื่อ หรือพิมพ์ชื่อโมเดล" onChange={(e) => setSettings({ ollamaModel: e.target.value.trim() })} />
          )}
          <small>
            RAM 16 GB: โมเดลประมาณ 3–4B รันบน CPU ได้ลื่นกว่า ส่วน 7–8B (ไฟล์ราว 5 GB) ใช้ได้แต่ช้าลงถ้าไม่มี GPU — ความเร็วจริงขึ้นกับ CPU/GPU ของเครื่อง
          </small>
        </label>
      </fieldset>

      <fieldset>
        <legend>Cloud AI (Gemini ผ่าน Backend)</legend>
        <label className="field">
          <span>Backend URL</span>
          <input value={settings.apiBaseUrl} placeholder="ว่าง = ใช้ /api ของเว็บนี้ (โหมดพัฒนา)" onChange={(e) => setSettings({ apiBaseUrl: e.target.value.trim() })} />
          <small>ใส่ URL ของ Cloudflare Worker เช่น https://haerin-agent-api.&lt;ชื่อคุณ&gt;.workers.dev — ไม่ใช่ API Key (Key เก็บที่ Backend เท่านั้น)</small>
        </label>
        <div className="row">
          <button type="button" className="btn" onClick={() => run('gemini', setCloud)} disabled={cloud.state === 'checking' || !settings.cloudEnabled}>
            {cloud.state === 'checking' ? 'กำลังตรวจ…' : 'ทดสอบ Backend'}
          </button>
        </div>
        {cloud.state === 'done' && <Status result={cloud.result} />}
      </fieldset>

      <fieldset>
        <legend>กฎของโหมด Hybrid</legend>
        <label className="field">
          <span>ใช้เป็นหลัก</span>
          <select value={settings.hybridPrefer} onChange={(e) => setSettings({ hybridPrefer: e.target.value as Settings['hybridPrefer'] })}>
            <option value="local">Local (เป็นส่วนตัวกว่า)</option>
            <option value="cloud">Cloud (ฉลาดกว่า ต้องใช้เน็ต)</option>
          </select>
        </label>
        <label className="field">
          <span>คำที่บังคับให้ใช้ Local (คั่นด้วย ,)</span>
          <textarea
            rows={2}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onBlur={() => setSettings({ privateKeywords: keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 100) })}
          />
          <small>ถ้า Provider ที่เลือกใช้ไม่ได้ ระบบจะแจ้ง Error และให้คุณกดเลือกส่งผ่านอีกทางเอง — ไม่สลับให้อัตโนมัติ</small>
        </label>
      </fieldset>
    </div>
  );
}

function Status({ result }: { result: HealthResult }) {
  return (
    <p className={`status ${result.ok ? 'status-ok' : 'status-bad'}`} role="status">
      {result.ok ? '● ' : '○ '}
      {result.detail}
      {result.ok && result.models.length > 0 && result.models[0] ? ` — ${result.models.slice(0, 1).join('')}${result.models.length > 1 ? ` และอีก ${result.models.length - 1}` : ''}` : ''}
    </p>
  );
}
