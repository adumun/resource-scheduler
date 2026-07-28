import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "resource-scheduler-db";
const DB_VERSION = 1;

export const STORES = {
  schedules: "schedules",
  users: "users",
  meta: "meta",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

export function getDb(): Promise<IDBPDatabase<unknown>> {
  if (dbPromise === null) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.schedules)) {
          db.createObjectStore(STORES.schedules, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.users)) {
          const store = db.createObjectStore(STORES.users, { keyPath: "id" });
          store.createIndex("byEmail", "email", { unique: true });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function resetDb(): Promise<void> {
  if (dbPromise !== null) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  const req = indexedDB.deleteDatabase(DB_NAME);
  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
