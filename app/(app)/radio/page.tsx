"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const unsub = player.subscribe(setState);
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    const currentState = player.getState();
    if (!currentState.isPlaying) {
      setConnecting(true);
      const timer = setTimeout(async () => {
        await player.playRadio();
        setConnecting(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = useCallback(async () => {
    if (!state?.isPlaying) {
      setConnecting(true);
      await player.playRadio();
      setTimeout(() => setConnecting(false), 2000);
    } else {
      player.pauseRadio();
      setConnecting(false);
    }
  }, [player, state]);

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
        <div style={{ position: 'relative', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center' }}>

          {isRadioPlaying && !connecting && (
            <div style={{
              position: 'absolute',
              width: 80, height: 80,
              borderRadius: '50%',
              border: '2px solid rgba(232, 82, 42, 0.3)',
              animation: 'pulse-ring 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}

          {isRadioPlaying && !connecting && (
            <div style={{
              position: 'absolute',
              width: 96, height: 96,
              borderRadius: '50%',
              border: '1.5px solid rgba(232, 82, 42, 0.15)',
              animation: 'pulse-ring 2s ease-in-out infinite 0.4s',
              pointerEvents: 'none',
            }} />
          )}

          {connecting && (
            <div style={{
              position: 'absolute',
              width: 76, height: 76,
              borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: '#E8522A',
              borderRightColor: 'rgba(232,82,42,0.3)',
              animation: 'spin-ring 0.8s linear infinite',
              pointerEvents: 'none',
            }} />
          )}

          <button
            onClick={handleToggle}
            disabled={connecting}
            style={{
              width: 60, height: 60,
              borderRadius: '50%',
              background: connecting ? 'rgba(232,82,42,0.7)' : '#E8522A',
              border: 'none',
              cursor: connecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isRadioPlaying
                ? '0 4px 20px rgba(232,82,42,0.5)'
                : '0 4px 16px rgba(232,82,42,0.3)',
              transition: 'all 0.3s ease',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {connecting ? (
              <svg width={22} height={22} viewBox="0 0 24 24"
                   fill="none" stroke="#fff" strokeWidth={2}
                   strokeLinecap="round">
                <circle cx="12" cy="12" r="2"/>
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/>
                <path d="M7.76 7.76a6 6 0 0 0 0 8.49"/>
              </svg>
            ) : isRadioPlaying ? (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="#fff">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>
        </div>

        {/* Social links */}
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#888" }}>
            Síguenos en nuestras redes
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Facebook */}
            <a
              href="https://www.facebook.com/UnderHitsRadio"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                background: '#1877F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/underhitsradio/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                   stroke="#fff" strokeWidth={2} strokeLinecap="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://api.whatsapp.com/send/?phone=593995981326&text&type=phone_number&app_absent=0"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                background: '#25D366',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width={22} height={22} viewBox="0 0 32 32" fill="#fff">
                <path d="M16 1C7.716 1 1 7.716 1 16c0 2.628.672 5.1 1.85 7.254L1 31l7.95-1.832A14.94 14.94 0 0 0 16 31c8.284 0 15-6.716 15-15S24.284 1 16 1zm0 27.5a12.44 12.44 0 0 1-6.349-1.739l-.455-.27-4.716 1.087 1.117-4.594-.297-.471A12.5 12.5 0 1 1 16 28.5zm6.862-9.362c-.376-.188-2.224-1.097-2.568-1.222-.345-.125-.596-.188-.847.188-.251.376-.97 1.222-1.19 1.473-.219.251-.438.282-.814.094-.376-.188-1.587-.585-3.022-1.865-1.117-.997-1.871-2.228-2.09-2.604-.219-.376-.023-.579.165-.766.169-.168.376-.438.564-.657.188-.219.251-.376.376-.627.125-.251.063-.47-.031-.658-.094-.188-.847-2.04-1.16-2.793-.305-.733-.615-.633-.847-.645l-.72-.012c-.251 0-.659.094-.1.47-.345.376-1.316 1.285-1.316 3.134s1.347 3.636 1.535 3.887c.188.251 2.651 4.047 6.423 5.676.898.388 1.598.619 2.144.792.9.287 1.72.246 2.368.149.722-.108 2.224-.909 2.538-1.787.313-.878.313-1.631.219-1.787-.091-.155-.341-.249-.717-.437z"/>
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/channel/UCdYtVJjATOMDiDXG2AnsKAg?view_as=subscriber"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                background: '#FF0000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#FF0000"/>
              </svg>
            </a>

            {/* X (Twitter) */}
            <a
              href="https://x.com/hits_under"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 46, height: 46, borderRadius: '50%',
                background: '#000',
                border: '1px solid #333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
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
