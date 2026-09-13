/**
 * #28 — Offline-first capture queue.
 *
 * When `navigator.onLine` is false, quick_captures writes go here instead
 * of straight to Supabase. On the next `online` event, useOfflineSync
 * flushes this store to Supabase and clears it.
 *
 * Uses the raw IndexedDB API (no wrapper library) — zero additional
 * dependencies, works in all evergreen browsers. Stored in a named DB
 * (`zte-offline-queue`) so it survives page reloads and browser restarts
 * until the device reconnects.
 *
 * Scope: quick_captures only. Daily-log writes go through the existing
 * RPC (`log_study_session_hours`) which is user-initiated and modal, so
 * the user sees the failure immediately and can retry — the "fire and
 * forget during a distracted capture" pattern that makes offline queuing
 * worth adding doesn't apply there.
 */

const DB_NAME = "zte-offline-queue";
const DB_VERSION = 1;
const STORE = "quick_captures";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        // autoIncrement so we never need to supply a key manually
        db.createObjectStore(STORE, { keyPath: "localId", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedCapture {
  localId?: number; // set by IDB, absent before insert
  userId: string;
  body: string;
  kind: "idea" | "blocker";
  source: "text" | "voice";
  contextEntityType?: string | null;
  contextEntityId?: string | null;
  contextLabel?: string | null;
  queuedAt: string; // ISO — for debugging / future "queued for X min" UI
}

/** Adds one capture to the local queue. Resolves immediately; never throws
 * to the caller — if IDB itself fails (private-browsing restriction etc.)
 * the caller falls back to showing an error toast and the user retries. */
export async function enqueueCapture(capture: Omit<QueuedCapture, "localId">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add(capture);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Returns all queued captures and atomically clears the store in a single
 * transaction, so a concurrent flush never double-submits. */
export async function dequeueAllCaptures(): Promise<QueuedCapture[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const records = getAllReq.result as QueuedCapture[];
      store.clear(); // clear in same tx — atomic
      resolve(records);
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}

/** How many items are currently in the queue. Used by the offline indicator
 * to show "N items pending sync" without reading all the data. */
export async function pendingCaptureCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
