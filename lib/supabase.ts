import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type Podcast = {
  id: string;
  titulo: string;
  descripcion: string;
  duracion: number;
  url_audio: string;
  imagen_url: string;
  numero_episodio: number;
  publicado: boolean;
  fecha: string;
};

export type Playlist = {
  id: string;
  titulo: string;
  descripcion: string;
  genero: string;
  imagen_url: string;
  activo: boolean;
};

export type PlaylistTrack = {
  id: string;
  playlist_id: string;
  titulo: string;
  artista: string;
  duracion: number;
  audio_url: string;
  orden: number;
};

export type PwaUsuario = {
  id: string;
  email: string;
  nombre: string;
  avatar_url: string;
  created_at: string;
};

export type ChatMensaje = {
  id: string;
  usuario_id: string;
  email: string;
  nombre: string;
  mensaje: string;
  created_at: string;
};
