"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Podcast, Playlist, PlaylistTrack } from "@/lib/supabase";
import {
  getAllOfflineMeta,
  deleteOfflineItem,
  formatBytes,
  getTotalStorageUsed,
  getAudioURL,
  downloadAndSave,
} from "@/lib/indexeddb";
import type { OfflineMeta } from "@/lib/indexeddb";
import { getAudioPlayer } from "@/lib/audioPlayer";
import type { User } from "@supabase/supabase-js";
import {
  registerDownloadInCloud,
  removeDownloadFromCloud,
  getCloudDownloads,
  type CloudDownload,
} from "@/lib/syncDownloads";

type Tab = "podcasts" | "playlists" | "descargas";

const SUPABASE_STORAGE = "https://otpajfcjsehqdkzanbsu.supabase.co/storage/v1/object/public/";

function getAudioUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${SUPABASE_STORAGE}${url}`;
}

const SUPABASE_URL = 'https://otpajfcjsehqdkzanbsu.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const fetchWithTimeout = async (url: string, ms = 6000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

export default function OfflinePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("podcasts");
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [downloads, setDownloads] = useState<OfflineMeta[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState(getAudioPlayer().getState());
  const [user, setUser] = useState<User | null>(null);
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const [cloudDownloads, setCloudDownloads] = useState<CloudDownload[]>([]);
  const [, setCloudLoading] = useState(false);
  const [redownloading, setRedownloading] = useState<Record<string, number>>({});

  const player = getAudioPlayer();
  const canDownload = !!(user?.id);

  useEffect(() => {
    const unsub = player.subscribe(setPlayerState)

    // Cargar estado de IndexedDB al montar
    getAllOfflineMeta().then((items) => {
      const map: Record<string, boolean> = {}
      items.forEach((item) => { map[item.id] = true })
      setDownloaded(map)
    })

    const getUser = async () => {
      try {
        const uid = localStorage.getItem('uh-uid')
        const email = localStorage.getItem('uh-email')
        if (uid && email) {
          const u = {
            id: uid,
            email,
            user_metadata: {
              nombre: localStorage.getItem('uh-nombre') || ''
            }
          } as any
          setUser(u)
          getCloudDownloads(uid).then(setCloudDownloads)
          return
        }
      } catch {}

      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
        ]) as any
        const u = result?.data?.session?.user ?? null
        setUser(u)
        if (u) getCloudDownloads(u.id).then(setCloudDownloads)
      } catch {}
    }
    getUser()

    // Escuchar cambios de auth SOLO para login/logout real
    // NO para TOKEN_REFRESHED ni reactivación de pantalla
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignorar eventos que no son cambios reales de sesión
        if (
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION'
        ) return

        const u = session?.user ?? null
        setUser(u)
        if (u && (event === 'SIGNED_IN')) {
          getCloudDownloads(u.id).then(setCloudDownloads)
        }
      }
    )

    return () => {
      unsub()
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (tab === "podcasts") await loadPodcasts();
      else if (tab === "playlists") await loadPlaylists();
      else if (tab === "descargas") await loadDownloads();
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const loadPodcasts = async () => {
    setLoading(true)
    for (let i = 0; i < 3; i++) {
      try {
        const data = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/podcasts?select=*&publicado=eq.true&order=numero_episodio.desc`
        )
        setPodcasts(data || [])
        setLoading(false)
        return
      } catch {
        if (i < 2) await new Promise(r => setTimeout(r, 1500))
      }
    }
    setPodcasts([])
    setLoading(false)
  }

  const loadPlaylists = async () => {
    setLoading(true)
    for (let i = 0; i < 3; i++) {
      try {
        const data = await fetchWithTimeout(
          `${SUPABASE_URL}/rest/v1/playlists?select=*&activo=eq.true&order=titulo.asc`
        )
        setPlaylists(data || [])
        setLoading(false)
        return
      } catch {
        if (i < 2) await new Promise(r => setTimeout(r, 1500))
      }
    }
    setPlaylists([])
    setLoading(false)
  }

  const loadTracks = async (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    const { data } = await supabase
      .from("playlist_tracks")
      .select("*")
      .eq("playlist_id", playlist.id)
      .order("orden");
    setTracks(data || []);
  };

  const loadDownloads = async () => {
    const items = await getAllOfflineMeta();
    setDownloads(items.sort((a, b) => b.downloadedAt - a.downloadedAt));
    const used = await getTotalStorageUsed();
    setStorageUsed(used);
  };

  const playOfflineItem = async (item: OfflineMeta | { id: string; titulo: string; artista?: string }) => {
    const blobUrl = await getAudioURL(item.id);
    if (!blobUrl) return;
    await player.playOffline(
      item.id,
      blobUrl,
      item.titulo,
      "artista" in item ? item.artista : undefined
    );
  };

  const handleDownloadPodcast = async (pod: Podcast) => {
    if (!canDownload || !pod.url_audio) return
    const key = pod.id

    // Obtener URL real — nunca usar blob://
    const audioUrl = getAudioUrl(pod.url_audio)

    // Validar que es una URL https válida, no blob://
    if (!audioUrl.startsWith('https://')) {
      console.error('URL inválida para descarga:', audioUrl)
      return
    }

    setDownloading(prev => ({ ...prev, [key]: 0 }))
    try {
      await downloadAndSave(
        key,
        audioUrl,
        {
          id: key,
          type: 'podcast',
          titulo: pod.titulo,
          duracion: pod.duracion ?? 0,
          imagen_url: pod.imagen_url ?? '',
          audio_url: audioUrl,
        },
        (progress) => setDownloading(prev => ({ ...prev, [key]: progress }))
      )
      setDownloaded(prev => ({ ...prev, [key]: true }))
      if (user) {
        await registerDownloadInCloud(user.id, {
          id: key,
          type: 'podcast',
          titulo: pod.titulo,
          duracion: pod.duracion ?? 0,
          imagen_url: pod.imagen_url ?? '',
          audio_url: audioUrl,
        })
        getCloudDownloads(user.id).then(setCloudDownloads)
      }
    } catch (e) {
      console.error('Download error:', e)
    } finally {
      setDownloading(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleDownloadTrack = async (track: PlaylistTrack) => {
    if (!canDownload || !track.audio_url) return
    const key = track.id

    const audioUrl = getAudioUrl(track.audio_url)

    if (!audioUrl.startsWith('https://')) {
      console.error('URL inválida para descarga:', audioUrl)
      return
    }

    setDownloading(prev => ({ ...prev, [key]: 0 }))
    try {
      await downloadAndSave(
        key,
        audioUrl,
        {
          id: key,
          type: 'track',
          titulo: track.titulo,
          artista: track.artista ?? '',
          duracion: track.duracion ?? 0,
          imagen_url: selectedPlaylist?.imagen_url ?? '',
          playlistId: track.playlist_id,
          playlistTitulo: selectedPlaylist?.titulo,
          audio_url: audioUrl,
        },
        (progress) => setDownloading(prev => ({ ...prev, [key]: progress }))
      )
      setDownloaded(prev => ({ ...prev, [key]: true }))
      if (user && selectedPlaylist) {
        await registerDownloadInCloud(user.id, {
          id: key,
          type: 'track',
          titulo: track.titulo,
          artista: track.artista,
          duracion: track.duracion ?? 0,
          imagen_url: selectedPlaylist.imagen_url ?? '',
          audio_url: audioUrl,
          playlistId: track.playlist_id,
          playlistTitulo: selectedPlaylist.titulo,
        })
        getCloudDownloads(user.id).then(setCloudDownloads)
      }
    } catch (e) {
      console.error('Download error:', e)
    } finally {
      setDownloading(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleDeleteDownload = async (id: string) => {
    await deleteOfflineItem(id);
    setDownloaded((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (user) {
      await removeDownloadFromCloud(user.id, id);
      getCloudDownloads(user.id).then(setCloudDownloads);
    }
    await loadDownloads();
  };

  const handleRedownload = async (cloudItem: CloudDownload) => {
    const id = cloudItem.item_id;
    setRedownloading((prev) => ({ ...prev, [id]: 0 }));
    try {
      await downloadAndSave(
        id,
        cloudItem.audio_url,
        {
          id,
          type: cloudItem.item_type,
          titulo: cloudItem.titulo,
          artista: cloudItem.artista,
          duracion: cloudItem.duracion ?? 0,
          imagen_url: cloudItem.imagen_url ?? "",
          playlistId: cloudItem.playlist_id,
          playlistTitulo: cloudItem.playlist_titulo,
        },
        (progress) => setRedownloading((prev) => ({ ...prev, [id]: progress }))
      );
      setDownloaded((prev) => ({ ...prev, [id]: true }));
      if (user) getCloudDownloads(user.id).then(setCloudDownloads);
    } catch (e) {
      console.error("Redownload error:", e);
    } finally {
      setRedownloading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => router.push("/radio")} className="p-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="pulse-live inline-block w-2 h-2 rounded-full" style={{ background: "#E8522A" }} />
          <h1 className="font-bold text-white text-lg">UNDER Hits</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "#222" }}>
        {(["podcasts", "playlists", "descargas"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setSelectedPlaylist(null);
              setTab(t);
            }}
            className="flex-1 py-3 text-sm font-semibold capitalize relative"
            style={{ color: tab === t ? "#E8522A" : "#888" }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {tab === t && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "#E8522A" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Podcasts Tab */}
        {tab === "podcasts" && (
          <div>
            {loading ? (
              <p className="text-center py-12" style={{ color: "#888" }}>Cargando podcasts...</p>
            ) : podcasts.length === 0 ? (
              <p className="text-center py-12" style={{ color: "#888" }}>No hay podcasts disponibles</p>
            ) : (
              <>
                {!user && (
                  <div style={{
                    margin: '12px 16px',
                    padding: '14px 16px',
                    background: 'rgba(232, 82, 42, 0.08)',
                    border: '1px solid rgba(232, 82, 42, 0.25)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: 13, margin: 0 }}>
                        Contenido exclusivo para miembros
                      </p>
                      <p style={{ color: '#888', fontSize: 12, margin: '2px 0 0' }}>
                        Registrate gratis para reproducir y descargar
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/registro')}
                      style={{
                        background: '#E8522A', border: 'none', color: '#fff',
                        padding: '8px 16px', borderRadius: 100,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Ingresar
                    </button>
                  </div>
                )}
                {podcasts.map((pod) => (
                <div
                  key={pod.id}
                  className="flex items-center gap-3 px-4 py-3 active:opacity-70"
                  style={{ borderBottom: "1px solid #1a1a1a" }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: "#1a1a1a" }}
                  >
                    {pod.imagen_url ? (
                      <img src={pod.imagen_url} alt={pod.titulo} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#E8522A">
                        <path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" />
                        <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="#E8522A" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <line x1="12" y1="19" x2="12" y2="23" stroke="#E8522A" strokeWidth="2" strokeLinecap="round" />
                        <line x1="8" y1="23" x2="16" y2="23" stroke="#E8522A" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{pod.titulo}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#888" }}>
                      Ep. {pod.numero_episodio} · {formatDuration(pod.duracion)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Play: offline si descargado, stream si no */}
                    {pod.url_audio ? (
                      user ? (
                        <button
                          onClick={async () => {
                            const podcastsConAudio = podcasts.filter(p => p.url_audio)
                            const queueItems = await Promise.all(
                              podcastsConAudio.map(async p => {
                                const isdl = downloaded[p.id]
                                const url = isdl
                                  ? (await getAudioURL(p.id) || getAudioUrl(p.url_audio))
                                  : getAudioUrl(p.url_audio)
                                return {
                                  id: p.id, url,
                                  titulo: p.titulo,
                                  artista: `Episodio ${p.numero_episodio}`,
                                  imageUrl: p.imagen_url,
                                }
                              })
                            )
                            const startIndex = queueItems.findIndex(q => q.id === pod.id)
                            player.setQueue(queueItems, startIndex >= 0 ? startIndex : 0)
                            const isDownloadedPod = downloaded[pod.id]
                            const audioUrl = isDownloadedPod
                              ? (await getAudioURL(pod.id) || getAudioUrl(pod.url_audio))
                              : getAudioUrl(pod.url_audio)
                            await player.playOffline(
                              pod.id, audioUrl, pod.titulo,
                              `Episodio ${pod.numero_episodio}`, pod.imagen_url
                            )
                          }}
                          style={{
                            background: 'none', border: 'none',
                            color: playerState.currentTrackId === pod.id && playerState.isPlaying
                              ? '#E8522A'
                              : downloaded[pod.id] ? '#E8522A' : '#888',
                            cursor: 'pointer', padding: 4,
                          }}
                        >
                          <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push('/registro')}
                          style={{
                            background: 'none', border: 'none',
                            color: '#444', cursor: 'pointer', padding: 4,
                          }}
                          title="Inicia sesión para reproducir"
                        >
                          <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                            <polygon points="5,3 19,12 5,21" />
                          </svg>
                        </button>
                      )
                    ) : (
                      <span style={{ color: '#333', padding: 4 }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" opacity={0.2}>
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </span>
                    )}

                    {/* Descarga en progreso */}
                    {downloading[pod.id] !== undefined && (
                      <span style={{ color: "#E8522A", fontSize: 11, width: 32, textAlign: "center" }}>
                        {downloading[pod.id]}%
                      </span>
                    )}

                    {/* Botón descargar */}
                    {pod.url_audio && canDownload && !downloaded[pod.id] && downloading[pod.id] === undefined && (
                      <button
                        onClick={() => {
                          console.log('⬇ DOWNLOAD', pod.id, getAudioUrl(pod.url_audio))
                          handleDownloadPodcast(pod)
                        }}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}
                        title="Descargar"
                      >
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    )}

                    {/* Botón eliminar descarga */}
                    {downloaded[pod.id] && (
                      <button
                        onClick={() => handleDeleteDownload(pod.id)}
                        style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 4 }}
                        title="Eliminar descarga"
                      >
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    )}

                    {/* Login para descargar */}
                    {pod.url_audio && !canDownload && !downloaded[pod.id] && (
                      <button
                        onClick={() => router.push('/registro')}
                        style={{
                          background: 'none', border: 'none',
                          color: '#555', cursor: 'pointer',
                          fontSize: 10, padding: 4, whiteSpace: 'nowrap',
                        }}
                      >
                        Login↗
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
            )}
          </div>
        )}

        {/* Playlists Tab */}
        {tab === "playlists" && !selectedPlaylist && (
          <div>
            {loading ? (
              <p className="text-center py-12" style={{ color: "#888" }}>Cargando playlists...</p>
            ) : playlists.length === 0 ? (
              <p className="text-center py-12" style={{ color: "#888" }}>No hay playlists disponibles</p>
            ) : (
              <>
                {!user && (
                  <div style={{
                    margin: '12px 16px',
                    padding: '14px 16px',
                    background: 'rgba(232, 82, 42, 0.08)',
                    border: '1px solid rgba(232, 82, 42, 0.25)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div>
                      <p style={{ color: '#f5f5f5', fontWeight: 700, fontSize: 13, margin: 0 }}>
                        Contenido exclusivo para miembros
                      </p>
                      <p style={{ color: '#888', fontSize: 12, margin: '2px 0 0' }}>
                        Registrate gratis para reproducir y descargar
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/registro')}
                      style={{
                        background: '#E8522A', border: 'none', color: '#fff',
                        padding: '8px 16px', borderRadius: 100,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Ingresar
                    </button>
                  </div>
                )}
                {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => loadTracks(pl)}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left active:opacity-70"
                  style={{ borderBottom: "1px solid #1a1a1a" }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: "#1a1a1a" }}
                  >
                    {pl.imagen_url ? (
                      <img src={pl.imagen_url} alt={pl.titulo} className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <svg width="24" height="24" fill="#E8522A" viewBox="0 0 24 24">
                        <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-2c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{pl.titulo}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>{pl.genero}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </>
            )}
          </div>
        )}

        {/* Playlist Tracks */}
        {tab === "playlists" && selectedPlaylist && (
          <div>
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="flex items-center gap-2 px-4 py-3 w-full"
              style={{ borderBottom: "1px solid #222" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-bold text-white">{selectedPlaylist.titulo}</span>
            </button>
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid #1a1a1a" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{track.titulo}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#888" }}>
                    {track.artista} · {formatDuration(track.duracion)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {/* Play track */}
                  {track.audio_url ? (
                    user ? (
                      <button
                        onClick={async () => {
                          const tracksConAudio = tracks.filter(t => t.audio_url)
                          const queueItems = await Promise.all(
                            tracksConAudio.map(async t => {
                              const isdl = downloaded[t.id]
                              const url = isdl
                                ? (await getAudioURL(t.id) || getAudioUrl(t.audio_url))
                                : getAudioUrl(t.audio_url)
                              return {
                                id: t.id, url,
                                titulo: t.titulo,
                                artista: t.artista,
                                imageUrl: selectedPlaylist?.imagen_url,
                              }
                            })
                          )
                          const startIndex = queueItems.findIndex(q => q.id === track.id)
                          player.setQueue(queueItems, startIndex >= 0 ? startIndex : 0)
                          const isDownloadedTrack = downloaded[track.id]
                          const audioUrl = isDownloadedTrack
                            ? (await getAudioURL(track.id) || getAudioUrl(track.audio_url))
                            : getAudioUrl(track.audio_url)
                          await player.playOffline(
                            track.id, audioUrl, track.titulo,
                            track.artista, selectedPlaylist?.imagen_url
                          )
                        }}
                        style={{
                          background: "none", border: "none",
                          color: playerState.currentTrackId === track.id && playerState.isPlaying
                            ? "#E8522A"
                            : downloaded[track.id] ? "#E8522A" : "#888",
                          cursor: "pointer", padding: 4,
                        }}
                        title="Reproducir"
                      >
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push('/registro')}
                        style={{
                          background: 'none', border: 'none',
                          color: '#444', cursor: 'pointer', padding: 4,
                        }}
                        title="Inicia sesión para reproducir"
                      >
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" opacity={0.3}>
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      </button>
                    )
                  ) : null}

                  {/* Descarga en progreso */}
                  {downloading[track.id] !== undefined && (
                    <span style={{ color: "#E8522A", fontSize: 11, width: 32, textAlign: "center" }}>
                      {downloading[track.id]}%
                    </span>
                  )}

                  {/* Botón descargar */}
                  {canDownload && track.audio_url && !downloaded[track.id] && downloading[track.id] === undefined && (
                    <button
                      onClick={() => handleDownloadTrack(track)}
                      style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: 4 }}
                    >
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  )}

                  {/* Botón eliminar descarga */}
                  {downloaded[track.id] && (
                    <button
                      onClick={() => handleDeleteDownload(track.id)}
                      style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 4 }}
                    >
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Downloads Tab */}
        {tab === "descargas" && (
          <div>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: "#888" }}>Espacio usado</span>
                <span className="text-xs font-semibold" style={{ color: "#E8522A" }}>
                  {formatBytes(storageUsed)}
                </span>
              </div>
              <div className="h-1 rounded-full" style={{ background: "#222" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: "#E8522A",
                    width: `${Math.min((storageUsed / (500 * 1024 * 1024)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {playerState.mode === 'offline' && playerState.currentTrackId && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: '#1a1a1a',
                borderBottom: '1px solid #222',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: '#f5f5f5', fontSize: 13, fontWeight: 600,
                    margin: 0, whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {playerState.currentTrackTitle}
                  </p>
                  <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
                    {playerState.currentTrackArtist}
                  </p>
                </div>
                <button
                  onClick={() => player.toggle()}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#E8522A', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {playerState.isPlaying ? (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => player.stopOffline()}
                  style={{
                    background: 'none', border: '1px solid #333',
                    color: '#666', cursor: 'pointer',
                    padding: '4px 10px', borderRadius: 100,
                    fontSize: 11, flexShrink: 0,
                  }}
                  title="Detener y volver a radio"
                >
                  Radio
                </button>
              </div>
            )}

            {downloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v13M8 11l4 4 4-4" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="#333" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p style={{ color: "#555" }}>No hay descargas</p>
                <p className="text-sm text-center" style={{ color: "#444" }}>
                  Descarga podcasts o tracks desde las secciones de arriba
                </p>
              </div>
            ) : (
              downloads.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid #1a1a1a" }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: "#1a1a1a" }}
                  >
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt={item.titulo} className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      <svg width="20" height="20" fill="#E8522A" viewBox="0 0 24 24">
                        <path d="M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{item.titulo}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888" }}>
                      {item.artista || (item.type === "podcast" ? "Podcast" : "Track")} · {formatBytes(item.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const queueItems = await Promise.all(
                          downloads.map(async d => ({
                            id: d.id,
                            url: (await getAudioURL(d.id)) || '',
                            titulo: d.titulo,
                            artista: d.artista,
                            imageUrl: d.imagen_url,
                          }))
                        )
                        const filtered = queueItems.filter(q => q.url !== '')
                        const startIndex = filtered.findIndex(q => q.id === item.id)
                        player.setQueue(filtered, startIndex >= 0 ? startIndex : 0)
                        if (playerState.mode === 'radio' && playerState.isPlaying) {
                          player.pauseRadio()
                        }
                        await playOfflineItem(item)
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 8, display: 'flex', alignItems: 'center',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        {playerState.currentTrackId === item.id && playerState.isPlaying ? (
                          <>
                            <rect x="6" y="4" width="4" height="16" rx="1" fill="#E8522A"/>
                            <rect x="14" y="4" width="4" height="16" rx="1" fill="#E8522A"/>
                          </>
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="10"
                              stroke={playerState.currentTrackId === item.id ? '#E8522A' : '#555'}
                              strokeWidth="1.5"/>
                            <path d="M10 8l6 4-6 4V8z"
                              fill={playerState.currentTrackId === item.id ? '#E8522A' : '#555'}/>
                          </>
                        )}
                      </svg>
                    </button>
                    <button onClick={() => handleDeleteDownload(item.id)} className="p-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Cloud downloads — available to re-download on this device */}
            {user && cloudDownloads.filter(c => !downloaded[c.item_id]).length > 0 && (
              <div>
                <div style={{
                  padding: "10px 16px 6px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width={14} height={14} viewBox="0 0 24 24"
                       fill="none" stroke="#888" strokeWidth={2}
                       strokeLinecap="round">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                  </svg>
                  <span style={{ color: "#666", fontSize: 12, fontWeight: 600 }}>
                    GUARDADOS EN TU CUENTA
                  </span>
                </div>
                <p style={{ color: "#555", fontSize: 11, padding: "0 16px 8px", margin: 0 }}>
                  Descargados en otros dispositivos — toca ↓ para tenerlos aquí
                </p>

                {cloudDownloads
                  .filter(c => !downloaded[c.item_id])
                  .map(cloudItem => {
                    const id = cloudItem.item_id;
                    const rdl = redownloading[id];
                    return (
                      <div key={id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 16px",
                        borderBottom: "1px solid #111",
                        opacity: 0.7,
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 8,
                          background: "#1a1a1a", flexShrink: 0,
                          display: "flex", alignItems: "center",
                          justifyContent: "center",
                        }}>
                          {cloudItem.imagen_url ? (
                            <img src={cloudItem.imagen_url} alt=""
                              style={{ width: "100%", height: "100%",
                                objectFit: "cover", borderRadius: 8 }}/>
                          ) : (
                            <span style={{ fontSize: 18 }}>
                              {cloudItem.item_type === "podcast" ? "🎙️" : "🎵"}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#888", fontWeight: 600,
                            margin: 0, fontSize: 13,
                            whiteSpace: "nowrap", overflow: "hidden",
                            textOverflow: "ellipsis" }}>
                            {cloudItem.titulo}
                          </p>
                          <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
                            {cloudItem.artista || cloudItem.item_type}
                            {rdl !== undefined && ` · ${rdl}%`}
                          </p>
                          {rdl !== undefined && (
                            <div style={{
                              marginTop: 4, height: 2,
                              background: "#222", borderRadius: 1,
                            }}>
                              <div style={{
                                height: "100%", width: `${rdl}%`,
                                background: "#E8522A", borderRadius: 1,
                                transition: "width 0.2s",
                              }} />
                            </div>
                          )}
                        </div>
                        {rdl === undefined ? (
                          <button
                            onClick={() => handleRedownload(cloudItem)}
                            style={{
                              background: "none", border: "1px solid #333",
                              color: "#E8522A", cursor: "pointer",
                              padding: "6px 12px", borderRadius: 100,
                              fontSize: 12, fontWeight: 700, flexShrink: 0,
                            }}
                          >
                            ↓ Descargar
                          </button>
                        ) : (
                          <span style={{ color: "#E8522A", fontSize: 12, flexShrink: 0 }}>
                            {rdl}%
                          </span>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mini player when offline content is playing */}
      {playerState.mode === "offline" && playerState.currentTrackId && (
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: "#1a1a1a", borderTop: "1px solid #222" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{playerState.currentTrackTitle}</p>
            <p className="text-xs" style={{ color: "#888" }}>{playerState.currentTrackArtist}</p>
          </div>
          <button onClick={() => player.stopOffline()} className="p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#E8522A">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
