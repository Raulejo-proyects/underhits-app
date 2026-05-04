"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAudioPlayer, PlayerState } from '@/lib/audioPlayer'
import { supabase } from "@/lib/supabase";
import type { ChatMensaje } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ChatPage() {
  const router = useRouter();
  const [playerState, setPlayerState] = useState<PlayerState | null>(null)
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<ChatMensaje[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Usar ref para loadMessages para evitar re-renders en cascada
  const loadMessagesRef = useRef<(() => Promise<void>) | null>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_mensajes")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  }, []); // Sin dependencias — nunca cambia

  // Mantener ref actualizada
  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  useEffect(() => {
    const player = getAudioPlayer()
    const unsub = player.subscribe(setPlayerState)
    return unsub
  }, [])

  // Auth — solo al montar
  useEffect(() => {
    const getUser = async () => {
      try {
        const uid = localStorage.getItem('uh-uid')
        const email = localStorage.getItem('uh-email')
        const nombre = localStorage.getItem('uh-nombre')
        if (uid && email) {
          setUser({
            id: uid,
            email,
            user_metadata: { nombre: nombre || '' }
          } as any)
          setUserName(nombre || email.split('@')[0] || 'Oyente')
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
        if (u) {
          setUserName(
            u.user_metadata?.nombre ||
            u.email?.split('@')[0] ||
            'Usuario'
          )
        }
      } catch {}
    }
    getUser()
  }, [])

  // Config del chat — solo al montar
  useEffect(() => {
    let mounted = true;

    const fetchConfig = async () => {
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        try {
          const res = await fetch(
            'https://otpajfcjsehqdkzanbsu.supabase.co/rest/v1/app_config?select=value&key=eq.chat_enabled&limit=1',
            {
              headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              },
              signal: controller.signal,
              cache: 'no-store',
            }
          )
          clearTimeout(timer)
          const data = await res.json()
          if (mounted) {
            setChatEnabled(data?.[0]?.value === 'true')
            setCheckingConfig(false)
          }
          return
        } catch {
          clearTimeout(timer)
          if (i < 2) {
            await new Promise(r => setTimeout(r, 1500))
            continue
          }
          if (mounted) {
            setChatEnabled(false)
            setCheckingConfig(false)
          }
        }
      }
    }

    fetchConfig()

    const configChannel = supabase
      .channel("app-config-chat-v2")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_config",
          filter: "key=eq.chat_enabled",
        },
        (payload: any) => {
          if (mounted) setChatEnabled(payload.new.value === "true");
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(configChannel);
    };
  }, []); // Solo al montar — NUNCA re-ejecutar

  // Mensajes + Realtime — solo al montar
  useEffect(() => {
    let mounted = true;

    // Cargar mensajes iniciales
    setLoading(true);
    const loadMsgs = async () => {
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        try {
          const res = await fetch(
            'https://otpajfcjsehqdkzanbsu.supabase.co/rest/v1/chat_mensajes?select=*&order=created_at.asc&limit=100',
            {
              headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              },
              signal: controller.signal,
              cache: 'no-store',
            }
          )
          clearTimeout(timer)
          if (!mounted) return
          const data = await res.json()
          setMessages(data || [])
          setLoading(false)
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
            100
          )
          return
        } catch {
          clearTimeout(timer)
          if (i < 2) {
            await new Promise(r => setTimeout(r, 1500))
            continue
          }
          if (mounted) {
            setMessages([])
            setLoading(false)
          }
        }
      }
    }

    loadMsgs()

    // Realtime
    const channel = supabase
      .channel("chat-room-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensajes" },
        (payload: any) => {
          if (!mounted) return;
          const newMessage = payload.new as ChatMensaje;
          setMessages((prev) => {
            const exists = prev.some(
              (m) =>
                m.id === newMessage.id ||
                (m.id.startsWith("temp-") &&
                  m.usuario_id === newMessage.usuario_id &&
                  m.mensaje === newMessage.mensaje)
            );
            if (exists) {
              return prev.map((m) =>
                m.id.startsWith("temp-") &&
                m.usuario_id === newMessage.usuario_id &&
                m.mensaje === newMessage.mensaje
                  ? newMessage
                  : m
              );
            }
            return [...prev, newMessage];
          });
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            50
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_mensajes" },
        () => {
          if (mounted && loadMessagesRef.current) {
            loadMessagesRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []); // Solo al montar — NUNCA re-ejecutar

  const handleSend = async () => {
    if (!user) return;
    const msg = newMsg.trim();
    if (!msg || sending) return;

    setSending(true);
    setNewMsg("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMensaje = {
      id: tempId,
      usuario_id: user.id,
      email: user.email ?? "",
      nombre: userName || "Oyente",
      mensaje: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );

    const { error } = await supabase.from("chat_mensajes").insert({
      usuario_id: user.id,
      email: user.email ?? "",
      nombre: userName || "Oyente",
      mensaje: msg,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMsg(msg);
    } else {
      // Reemplazar optimista con mensaje confirmado
      // sin esperar el Realtime (puede estar lento en mobile)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: `confirmed-${Date.now()}`, // ya no es temp-
                created_at: new Date().toISOString(),
              }
            : m
        )
      );
    }

    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getAvatarColor = (userId: string) => {
    const colors = [
      "#E8522A","#2196F3","#4CAF50",
      "#9C27B0","#FF9800","#00BCD4",
    ];
    return colors[userId.charCodeAt(0) % colors.length];
  };

  const miniPlayerVisible = !!(
    playerState &&
    (playerState.isPlaying || playerState.currentUrl)
  )

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0a0a',
      position: 'relative',
    }}>

      {/* Contenido principal — ocupa todo el espacio */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Checking config */}
        {checkingConfig && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8522A', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
          </div>
        )}

        {/* Chat desactivado */}
        {!checkingConfig && !chatEnabled && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth={1.5} strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ color: '#f5f5f5', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Chat no disponible</h3>
              <p style={{ color: '#555', fontSize: 14, margin: 0, lineHeight: 1.6 }}>El chat se activa durante los programas en vivo.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(232,82,42,0.08)', borderRadius: 100, border: '1px solid rgba(232,82,42,0.2)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8522A', display: 'inline-block', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
              <span style={{ color: '#E8522A', fontSize: 13, fontWeight: 600 }}>Radio en vivo ahora</span>
            </div>
          </div>
        )}

        {/* Chat activo */}
        {!checkingConfig && chatEnabled && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E8522A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={18} height={18} fill="white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Chat en vivo</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8522A', display: 'inline-block', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                  <span style={{ color: '#888', fontSize: 11 }}>UNDER Hits Radio</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                <p style={{ color: '#555', textAlign: 'center', paddingTop: 32 }}>Cargando mensajes...</p>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 8 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p style={{ color: '#555', margin: 0 }}>Sin mensajes aún</p>
                  <p style={{ color: '#444', fontSize: 13, margin: 0 }}>¡Sé el primero en escribir!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.usuario_id === user?.id
                  const isTemp = msg.id.startsWith('temp-')
                  return (
                    <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                      {!isOwn && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(msg.usuario_id), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff' }}>
                          {getInitial(msg.nombre || 'U')}
                        </div>
                      )}
                      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                        {!isOwn && (
                          <span style={{ color: '#666', fontSize: 11, marginBottom: 2, paddingLeft: 4 }}>{msg.nombre || 'Usuario'}</span>
                        )}
                        <div style={{ background: isOwn ? '#E8522A' : '#1a1a1a', color: '#fff', padding: '8px 14px', borderRadius: 18, borderBottomRightRadius: isOwn ? 4 : 18, borderBottomLeftRadius: isOwn ? 18 : 4, fontSize: 14, lineHeight: 1.4, opacity: isTemp ? 0.7 : 1, wordBreak: 'break-word' }}>
                          {msg.mensaje}
                        </div>
                        <span style={{ color: '#444', fontSize: 10, marginTop: 2, paddingLeft: 4 }}>
                          {isTemp ? 'Enviando…' : formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>

      {/* Input — SIEMPRE visible, fuera del scroll y fuera del condicional */}
      {!checkingConfig && chatEnabled && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid #1e1e1e',
          background: '#0a0a0a',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 10,
          marginBottom: miniPlayerVisible ? 48 : 0,
        }}>
          <div style={{ padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={user ? "Escribe un mensaje..." : "Inicia sesión para chatear"}
              value={newMsg}
              onChange={(e) => user && setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              onClick={() => { if (!user) router.push('/registro') }}
              readOnly={!user}
              style={{
                flex: 1,
                background: '#1e1e1e',
                border: '1px solid #2a2a2a',
                borderRadius: 22,
                padding: '10px 16px',
                color: user ? '#f5f5f5' : '#555',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'inherit',
                cursor: user ? 'text' : 'pointer',
              }}
            />
            <button
              onClick={user ? handleSend : () => router.push('/registro')}
              disabled={user ? (sending || !newMsg.trim()) : false}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: user && newMsg.trim() ? '#E8522A' : '#1e1e1e',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
