import { useEffect, useState } from 'react';
import type { Mode, Settings } from '../../types';
import { Icon } from '../common/Icon';

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Header({
  settings,
  onModeChange,
  onMenu,
}: {
  settings: Settings;
  onModeChange: (m: Mode) => void;
  onMenu: () => void;
}) {
  const online = useOnline();
  const target =
    settings.mode === 'local'
      ? `Ollama · ${settings.ollamaModel || 'ยังไม่เลือกโมเดล'}`
      : settings.mode === 'cloud'
        ? 'Gemini ผ่าน Backend'
        : `Hybrid · ${settings.hybridPrefer === 'cloud' ? 'Cloud' : 'Local'} เป็นหลัก`;

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="เปิดเมนู">
        <Icon name="menu" />
      </button>
      <div className="topbar-title">
        <strong>Haerin</strong>
        <span className="topbar-sub" title="ผู้ให้บริการที่จะใช้กับข้อความถัดไป">
          {target}
        </span>
      </div>
      {!online && (
        <span className="chip chip-warn" role="status" title="แอปยังเปิดได้ แต่ Cloud AI ใช้ไม่ได้">
          ออฟไลน์
        </span>
      )}
      <label htmlFor="mode-select" className="sr-only">โหมดประมวลผล</label>
      <select id="mode-select" className="mode-select" value={settings.mode} onChange={(e) => onModeChange(e.target.value as Mode)}>
        <option value="local">Local Only</option>
        <option value="cloud" disabled={!settings.cloudEnabled}>Cloud{settings.cloudEnabled ? '' : ' (ปิดอยู่)'}</option>
        <option value="hybrid">Hybrid</option>
      </select>
    </header>
  );
}
