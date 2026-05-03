'use client'

const DB_NAME = 'underhits-offline'
const DB_VERSION = 1
const STORE_AUDIO = 'audio-blobs'
const STORE_META = 'audio-meta'

export type OfflineItemType = 'podcast' | 'track'

export type OfflineMeta = {
  id: string
  type: OfflineItemType
  titulo: string
  artista?: string
  duracion: number
  imagen_url: string
  playlistId?: string
  playlistTitulo?: string
  downloadedAt: number
  size: number
  audio_url?: string
}

function assertBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB only available in browser')
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO)
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db: IDBDatabase, store: string, value: unknown, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.onerror = () => reject(tx.error)
  })
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function downloadAndSave(
  id: string,
  url: string,
  meta: Omit<OfflineMeta, 'downloadedAt' | 'size'>,
  onProgress?: (pct: number) => void
): Promise<void> {
  assertBrowser()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength) : 0

  // Leer con progreso usando chunks
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      // Copiar el valor para evitar problemas con SharedArrayBuffer en Safari
      const copy = new Uint8Array(value.byteLength)
      copy.set(value)
      chunks.push(copy)
      received += value.byteLength
      if (total > 0) onProgress?.(Math.round((received / total) * 100))
    }
  }

  // Crear ArrayBuffer limpio concatenando todos los chunks
  const totalBytes = chunks.reduce((acc, c) => acc + c.byteLength, 0)
  const buffer = new ArrayBuffer(totalBytes)
  const view = new Uint8Array(buffer)
  let offset = 0
  for (const chunk of chunks) {
    view.set(chunk, offset)
    offset += chunk.byteLength
  }

  // Crear Blob desde ArrayBuffer limpio — compatible con Safari
  const blob = new Blob([buffer], { type: 'audio/mpeg' })

  const db = await openDB()

  // Guardar blob
  await idbPut(db, STORE_AUDIO, blob, id)

  // Guardar meta
  await idbPut(db, STORE_META, {
    ...meta,
    downloadedAt: Date.now(),
    size: blob.size,
    audio_url: url,
  }, id)

  onProgress?.(100)
  db.close()
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  assertBrowser()
  const db = await openDB()
  const result = await idbGet<Blob>(db, STORE_AUDIO, id)
  db.close()
  return result
}

export async function getAudioURL(id: string): Promise<string | null> {
  const blob = await getAudioBlob(id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function getOfflineMeta(id: string): Promise<OfflineMeta | undefined> {
  assertBrowser()
  const db = await openDB()
  const result = await idbGet<OfflineMeta>(db, STORE_META, id)
  db.close()
  return result
}

export async function getAllOfflineMeta(): Promise<OfflineMeta[]> {
  assertBrowser()
  const db = await openDB()
  const result = await idbGetAll<OfflineMeta>(db, STORE_META)
  db.close()
  return result
}

export async function isDownloaded(id: string): Promise<boolean> {
  const meta = await getOfflineMeta(id)
  return !!meta
}

export async function deleteOfflineItem(id: string): Promise<void> {
  assertBrowser()
  const db = await openDB()
  await idbDelete(db, STORE_AUDIO, id)
  await idbDelete(db, STORE_META, id)
  db.close()
}

export async function getTotalStorageUsed(): Promise<number> {
  const items = await getAllOfflineMeta()
  return items.reduce((acc, item) => acc + item.size, 0)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
