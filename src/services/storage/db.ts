import type { Conversation, MemoryItem } from '../../types';

// IndexedDB: conversations and memories live only in this browser.
const DB_NAME = 'haerin-agent';
const STORES = ['conversations', 'memories'] as const;
type Store = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

async function tx<T>(stores: Store[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = run(t);
    t.oncomplete = () => resolve(req ? req.result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const getAll = <T>(s: Store) => tx<T[]>([s], 'readonly', (t) => t.objectStore(s).getAll());

export const db = {
  listConversations: async () => (await getAll<Conversation>('conversations')).sort((a, b) => b.updatedAt - a.updatedAt),
  putConversation: (c: Conversation) => tx([ 'conversations'], 'readwrite', (t) => void t.objectStore('conversations').put(c)),
  deleteConversation: (id: string) => tx(['conversations'], 'readwrite', (t) => void t.objectStore('conversations').delete(id)),

  listMemories: async () => (await getAll<MemoryItem>('memories')).sort((a, b) => b.updatedAt - a.updatedAt),
  putMemory: (m: MemoryItem) => tx(['memories'], 'readwrite', (t) => void t.objectStore('memories').put(m)),
  deleteMemory: (id: string) => tx(['memories'], 'readwrite', (t) => void t.objectStore('memories').delete(id)),
  clearMemories: () => tx(['memories'], 'readwrite', (t) => void t.objectStore('memories').clear()),

  /** Writes everything in one transaction: all or nothing. */
  importAll: (conversations: Conversation[], memories: MemoryItem[]) =>
    tx([...STORES], 'readwrite', (t) => {
      for (const c of conversations) t.objectStore('conversations').put(c);
      for (const m of memories) t.objectStore('memories').put(m);
    }),

  clearAll: () =>
    tx([...STORES], 'readwrite', (t) => {
      for (const s of STORES) t.objectStore(s).clear();
    }),
};
