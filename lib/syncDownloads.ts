'use client'

import { supabase } from '@/lib/supabase'
import { getAllOfflineMeta, type OfflineMeta } from '@/lib/indexeddb'

export type CloudDownload = {
  id: string
  usuario_id: string
  item_id: string
  item_type: 'podcast' | 'track'
  titulo: string
  artista?: string
  imagen_url?: string
  audio_url: string
  duracion: number
  playlist_id?: string
  playlist_titulo?: string
  created_at: string
}

type DownloadMeta = Omit<OfflineMeta, 'downloadedAt' | 'size'> & { audio_url: string }

export async function registerDownloadInCloud(
  userId: string,
  meta: DownloadMeta
): Promise<void> {
  await supabase.from('user_downloads').upsert({
    usuario_id: userId,
    item_id: meta.id,
    item_type: meta.type,
    titulo: meta.titulo,
    artista: meta.artista ?? null,
    imagen_url: meta.imagen_url ?? null,
    audio_url: meta.audio_url,
    duracion: meta.duracion ?? 0,
    playlist_id: meta.playlistId ?? null,
    playlist_titulo: meta.playlistTitulo ?? null,
  }, { onConflict: 'usuario_id,item_id' })
}

export async function removeDownloadFromCloud(
  userId: string,
  itemId: string
): Promise<void> {
  await supabase
    .from('user_downloads')
    .delete()
    .eq('usuario_id', userId)
    .eq('item_id', itemId)
}

export async function getCloudDownloads(
  userId: string
): Promise<CloudDownload[]> {
  const { data, error } = await supabase
    .from('user_downloads')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function getSyncStatus(userId: string): Promise<{
  localOnly: OfflineMeta[]
  cloudOnly: CloudDownload[]
  synced: string[]
}> {
  const [localItems, cloudItems] = await Promise.all([
    getAllOfflineMeta(),
    getCloudDownloads(userId),
  ])

  const localIds = new Set(localItems.map(i => i.id))
  const cloudIds = new Set(cloudItems.map(i => i.item_id))

  return {
    localOnly: localItems.filter(i => !cloudIds.has(i.id)),
    cloudOnly: cloudItems.filter(i => !localIds.has(i.item_id)),
    synced: localItems.filter(i => cloudIds.has(i.id)).map(i => i.id),
  }
}

export async function syncLocalToCloud(userId: string): Promise<void> {
  const { localOnly } = await getSyncStatus(userId)
  for (const item of localOnly) {
    if ((item as OfflineMeta & { audio_url?: string }).audio_url) {
      await registerDownloadInCloud(userId, item as DownloadMeta)
    }
  }
}
