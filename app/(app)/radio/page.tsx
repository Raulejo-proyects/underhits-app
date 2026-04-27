"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VinylDisc } from "@/components/VinylPlayer/VinylDisc";
import { getAudioPlayer } from "@/lib/audioPlayer";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function RadioPage() {
  const router = useRouter();
  const player = getAudioPlayer();
  const [state, setState] = useState(player.getState());
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = player.subscribe(setState);
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return unsub;
  }, []);

  const handleToggle = () => {
    if (state.mode === "offline" || !state.isPlaying) {
      player.playRadio();
    } else {
      player.pauseRadio();
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    player.setVolume(parseFloat(e.target.value));
  };

  const isRadioPlaying = state.isPlaying && state.mode === "radio";

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <img src="/icons/icon-192.png" alt="UNDER Hits" className="w-10 h-10 rounded-xl" />
        <div className="flex items-center gap-2">
          <span className="pulse-live inline-block w-2 h-2 rounded-full" style={{ background: "#E8522A" }} />
          <span className="text-sm font-semibold" style={{ color: "#E8522A" }}>
            En vivo
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Vinyl */}
        <div className="vinyl-size">
          <VinylDisc isPlaying={isRadioPlaying} logoUrl="/logo.png" />
        </div>

        {/* Track info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">UNDER Hits Radio</h2>
          <p className="text-sm mt-1" style={{ color: "#888" }}>
            Presiona play para comenzar
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-full">
          {/* Volume icon */}
          <button
            onClick={() => player.setVolume(state.volume === 0 ? 0.5 : 0)}
            className="p-2"
          >
            {state.volume === 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="23" y1="9" x2="17" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                <line x1="17" y1="9" x2="23" y2="15" stroke="#888" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19.07 4.93a10 10 0 010 14.14" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                <path d="M15.54 8.46a5 5 0 010 7.07" stroke="#888" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>

          {/* Volume slider */}
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={handleVolume}
              className="w-full h-1 rounded-full appearance-none outline-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #E8522A ${state.volume * 100}%, #333 ${state.volume * 100}%)`,
                accentColor: "#E8522A",
              }}
            />
          </div>

          <span className="text-sm w-10 text-right" style={{ color: "#888" }}>
            {Math.round(state.volume * 100)}%
          </span>
        </div>

        {/* Play button */}
        <button
          onClick={handleToggle}
          className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
          style={{ background: "#E8522A" }}
        >
          {isRadioPlaying ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 4 }}>
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          )}
        </button>

        {/* Social links */}
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#888" }}>
            Síguenos en nuestras redes
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#1877F2" }}
            >
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
            >
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
              </svg>
            </a>
            <a
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#25D366" }}
            >
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 pb-4">
          <button
            onClick={() => router.push("/offline")}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3"
            style={{ background: "#E8522A", color: "#fff" }}
          >
            <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
              <path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z" />
            </svg>
            Contenido Offline
          </button>

          {!user && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("show-install-banner"))}
              className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3"
              style={{ background: "transparent", color: "#E8522A", border: "2px solid #E8522A" }}
            >
              <span style={{ fontSize: 20 }}>📱</span>
              Instalar App
            </button>
          )}

          {!user && (
            <button
              onClick={() => router.push("/registro")}
              className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-3"
              style={{ background: "transparent", color: "#888", border: "1px solid #333" }}
            >
              Registrarse / Iniciar sesión
            </button>
          )}

          {user && (
            <p className="text-center text-sm" style={{ color: "#555" }}>
              Sesión iniciada como{" "}
              <span style={{ color: "#E8522A" }}>
                {user.user_metadata?.nombre || user.email}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
