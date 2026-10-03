// Stockage des photos des compteurs : IndexedDB.
// (localStorage est limité à ~5 Mo, insuffisant pour des images.)
const DB_NAME = "releve-index-photos";
const STORE = "photos";
const VERSION = 1;

export interface StoredPhoto {
  id: string;
  blob: Blob;
  date: string; // date du relevé associé (YYYY-MM-DD)
}

const hasIDB = () => typeof indexedDB !== "undefined";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function savePhoto(
  id: string,
  blob: Blob,
  date: string,
): Promise<void> {
  if (!hasIDB()) return;
  await withStore("readwrite", (s) => s.put({ id, blob, date }));
}

export async function getPhoto(id: string): Promise<StoredPhoto | undefined> {
  if (!hasIDB()) return undefined;
  return withStore<StoredPhoto | undefined>("readonly", (s) => s.get(id));
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (!hasIDB() || ids.length === 0) return;
  await withStore("readwrite", (s) => {
    ids.forEach((id) => s.delete(id));
    return s.count();
  });
}

export async function countPhotos(): Promise<number> {
  if (!hasIDB()) return 0;
  return withStore<number>("readonly", (s) => s.count());
}