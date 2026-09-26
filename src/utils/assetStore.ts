import type { ImageAsset } from '../types'

// Keeps the image library in this browser (IndexedDB) so stamps and signatures
// survive reloads. Every call degrades to a no-op when storage is unavailable
// (private mode, blocked site data), so the app still works for the session.

const DB_NAME = 'pdf-stamp-signer'
const STORE = 'assets'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = run(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

function isImageAsset(value: unknown): value is ImageAsset {
  const asset = value as ImageAsset
  return (
    typeof asset?.id === 'string' &&
    (asset.kind === 'stamp' || asset.kind === 'signature' || asset.kind === 'image') &&
    typeof asset.dataUrl === 'string' &&
    asset.dataUrl.startsWith('data:image/png;base64,') &&
    Number.isFinite(asset.aspectRatio) &&
    asset.aspectRatio > 0
  )
}

export async function loadStoredAssets(): Promise<ImageAsset[]> {
  try {
    const all = await withStore('readonly', (store) => store.getAll())
    return (all as unknown[]).filter(isImageAsset).sort((a, b) => a.addedAt - b.addedAt)
  } catch {
    return []
  }
}

export async function saveStoredAsset(asset: ImageAsset): Promise<boolean> {
  try {
    await withStore('readwrite', (store) => store.put(asset))
    return true
  } catch {
    return false
  }
}

export async function deleteStoredAsset(id: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id))
  } catch {
    // Storage unavailable: nothing persisted, nothing to remove.
  }
}
