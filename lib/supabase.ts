import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://otpajfcjsehqdkzanbsu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Singleton global para evitar múltiples instancias
// que compiten por el lock de autenticación
declare global {
  interface Window {
    __supabaseClient?: ReturnType<typeof createClient>
  }
}

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server side: crear instancia temporal
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  }

  // Client side: reusar instancia global
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
        }
      }
    })
  }
  return window.__supabaseClient
}

export const supabase = getSupabaseClient()

// Mantener los tipos exportados
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
