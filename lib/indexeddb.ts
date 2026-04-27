import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "underhits-offline";
const DB_VERSION = 1;
const STORE_AUDIO = "audio-blobs";
const STORE_META = "audio-meta";

export type OfflineItemType = "podcast" | "track";

export type OfflineMeta = {
  id: string;
  type: OfflineItemType;
  titulo: string;
  artista?: string;
  duracion: number;
  imagen_url: string;
  playlistId?: string;
  playlistTitulo?: string;
  downloadedAt: number;
  size: number;
};

function assertBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB only available in browser')
  }
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  assertBrowser()
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    },
  });
  return dbInstance;
}

export async function saveAudioBlob(
  id: string,
  blob: Blob,
  meta: OfflineMeta,
  onProgress?: (pct: number) => void
): Promise<void> {
  const db = await getDB();
  await db.put(STORE_AUDIO, blob, id);
  await db.put(STORE_META, { ...meta, size: blob.size }, id);
  onProgress?.(100);
}

export async function downloadAndSave(
  id: string,
  url: string,
  meta: Omit<OfflineMeta, "downloadedAt" | "size">,
  onProgress?: (pct: number) => void
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Error al descargar el audio");

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength) : 0;
  const reader = response.body!.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress?.(Math.round((received / total) * 100));
  }

  const blob = new Blob(chunks, { type: "audio/mpeg" });
  const db = await getDB();
  await db.put(STORE_AUDIO, blob, id);
  await db.put(STORE_META, { ...meta, downloadedAt: Date.now(), size: blob.size }, id);
  onProgress?.(100);
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get(STORE_AUDIO, id);
}

export async function getAudioURL(id: string): Promise<string | null> {
  const blob = await getAudioBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function getOfflineMeta(id: string): Promise<OfflineMeta | undefined> {
  const db = await getDB();
  return db.get(STORE_META, id);
}

export async function getAllOfflineMeta(): Promise<OfflineMeta[]> {
  const db = await getDB();
  return db.getAll(STORE_META);
}

export async function isDownloaded(id: string): Promise<boolean> {
  const meta = await getOfflineMeta(id);
  return !!meta;
}

export async function deleteOfflineItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_AUDIO, id);
  await db.delete(STORE_META, id);
}

export async function getTotalStorageUsed(): Promise<number> {
  const items = await getAllOfflineMeta();
  return items.reduce((acc, item) => acc + item.size, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
