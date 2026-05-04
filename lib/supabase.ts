import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://otpajfcjsehqdkzanbsu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

declare global {
  interface Window {
    __supabaseClient?: ReturnType<typeof createClient>
    __supabaseVisibilityHandler?: () => void
  }
}

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  }

  if (!window.__supabaseClient) {
    window.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-underhits-pwa',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        // Reconexión automática más agresiva
        reconnectAfterMs: (tries: number) => {
          return Math.min(tries * 1000, 10000)
        },
      }
    })

    // Manejar visibilitychange — cuando el dispositivo
    // se desbloquea, reconectar Realtime sin re-renders
    if (!window.__supabaseVisibilityHandler) {
      window.__supabaseVisibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          // Pequeño delay para que el navegador termine de reactivarse
          setTimeout(() => {
            window.__supabaseClient?.realtime.connect()
          }, 500)
        }
      }
      document.addEventListener(
        'visibilitychange',
        window.__supabaseVisibilityHandler
      )
    }
  }

  return window.__supabaseClient
}

export const supabase = getSupabaseClient()

export type Podcast = {
  id: string
  titulo: string
  descripcion: string
  duracion: number
  url_audio: string
  imagen_url: string
  numero_episodio: number
  publicado: boolean
  fecha: string
}

export type Playlist = {
  id: string
  titulo: string
  descripcion: string
  genero: string
  imagen_url: string
  activo: boolean
}

export type PlaylistTrack = {
  id: string
  playlist_id: string
  titulo: string
  artista: string
  duracion: number
  audio_url: string
  orden: number
}

export type ChatMensaje = {
  id: string
  usuario_id: string
  email: string
  nombre: string
  mensaje: string
  created_at: string
}

export type PwaUsuario = {
  id: string
  email: string
  nombre: string
  avatar_url: string
  created_at: string
}
