import { useEffect, useState } from 'react';
import { useApp } from './app/useApp';
import { ChatView } from './components/chat/ChatView';
import { Dialog } from './components/common/Dialog';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MemoryDialog } from './components/memory/MemoryDialog';
import { SettingsDialog } from './components/settings/SettingsDialog';
import type { ProviderId } from './types';

export function App() {
  const app = useApp();
  const { settings } = app;
  const [drawer, setDrawer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState('');

  useEffect(() => {
    if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Providers the user may explicitly pick when retrying. Local Only never offers Cloud.
  const retryOptions: ProviderId[] =
    settings.mode === 'local' ? ['ollama'] : settings.cloudEnabled ? ['ollama', 'gemini'] : ['ollama'];

  const closeDrawerThen = (fn: () => void) => () => {
    setDrawer(false);
    fn();
  };

  const consent = app.pendingConsent;

  return (
    <div className="app">
      <Sidebar
        open={drawer}
        conversations={app.conversations}
        activeId={app.activeId}
        onSelect={(id) => {
          app.setActiveId(id);
          setDrawer(false);
        }}
        onNew={closeDrawerThen(app.newChat)}
        onRename={app.renameChat}
        onDelete={(id) => void app.deleteChat(id)}
        onOpenMemory={closeDrawerThen(() => {
          setMemoryDraft('');
          setMemoryOpen(true);
        })}
        onOpenSettings={closeDrawerThen(() => setSettingsOpen(true))}
        onClose={() => setDrawer(false)}
      />
      <div className="main">
        <Header settings={settings} onModeChange={(mode) => app.setSettings({ mode })} onMenu={() => setDrawer(true)} />
        {app.loadError && (
          <p className="banner" role="alert">
            {app.loadError}
          </p>
        )}
        <ChatView
          conversation={app.active}
          mode={settings.mode}
          busy={app.busyId !== null}
          retryOptions={retryOptions}
          onSend={(t) => void app.send(t)}
          onStop={app.stop}
          onRetry={(id, o) => void app.retry(id, o)}
          onRemember={(text) => {
            setMemoryDraft(text);
            setMemoryOpen(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} app={app} />
      <MemoryDialog
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        memories={app.memories}
        enabled={settings.memoryEnabled}
        draft={memoryDraft}
        onSave={app.saveMemory}
        onDelete={app.deleteMemory}
        onClear={app.clearMemories}
      />
      <Dialog
        open={consent !== null}
        title="ส่งบทสนทนานี้ไป Cloud AI?"
        onClose={() => void app.answerConsent(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => void app.answerConsent(false)} autoFocus>
              ไม่ส่ง
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void app.answerConsent(true)}>
              ส่งไป Gemini
            </button>
          </>
        }
      >
        {consent && (
          <div className="stack-sm">
            <p>ข้อมูลต่อไปนี้จะถูกส่งผ่าน Backend ของคุณไปยัง Google Gemini เพื่อประมวลผล:</p>
            <ul>
              <li>ข้อความล่าสุดของคุณ</li>
              {consent.historyCount > 0 && <li>ประวัติก่อนหน้าในบทสนทนานี้ (สูงสุด {consent.historyCount} ข้อความ)</li>}
              <li>คำสั่งบุคลิกของ Haerin</li>
              {consent.memoryCount > 0 && <li>ความจำที่บันทึกไว้ {consent.memoryCount} รายการ</li>}
            </ul>
            <p className="muted">ระบบจะไม่ถามซ้ำสำหรับบทสนทนานี้ ข้อมูลที่ส่งถึง Google อยู่ภายใต้ข้อกำหนดของ Google</p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
