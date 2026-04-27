"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ChatMensaje } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ChatPage() {
  const router = useRouter();
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const nombre = u.user_metadata?.nombre || u.email?.split("@")[0] || "Usuario";
        setUserName(nombre);
      }
    });
  }, []);

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'chat_enabled')
          .single()
        setChatEnabled(data?.value === 'true')
      } catch {
        setChatEnabled(false)
      } finally {
        setCheckingConfig(false)
      }
    })()

    const configChannel = supabase
      .channel('app-config-chat')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_config',
        filter: 'key=eq.chat_enabled',
      }, (payload: any) => {
        setChatEnabled(payload.new.value === 'true')
      })
      .subscribe()

    return () => { supabase.removeChannel(configChannel) }
  }, [])

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("chat_mensajes")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadMessages().then(() => {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_mensajes" },
        (payload: any) => {
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
              // Reemplazar el optimista con el mensaje real de la DB
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
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    // Polling de respaldo cada 5 segundos
    const pollInterval = setInterval(loadMessages, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [loadMessages]);

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
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { error } = await supabase.from("chat_mensajes").insert({
      usuario_id: user.id,
      email: user.email ?? "",
      nombre: userName || "Oyente",
      mensaje: msg,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMsg(msg);
      console.error("Error al enviar:", error.message);
    }

    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const getAvatarColor = (userId: string) => {
    const colors = ["#E8522A", "#2196F3", "#4CAF50", "#9C27B0", "#FF9800", "#00BCD4"];
    const idx = userId.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  if (checkingConfig) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#E8522A',
          animation: 'pulse-dot 1.2s ease-in-out infinite',
        }} />
      </div>
    )
  }

  if (!chatEnabled) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        gap: 16,
        textAlign: 'center',
        background: '#0a0a0a',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#141414',
          border: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
               stroke="#444" strokeWidth={1.5} strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <h3 style={{ color: '#f5f5f5', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
            Chat no disponible
          </h3>
          <p style={{ color: '#555', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            El chat se activa durante los programas en vivo.
            Seguí escuchando la radio.
          </p>
        </div>
        <div style={{
          marginTop: 8,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px',
          background: 'rgba(232,82,42,0.08)',
          borderRadius: 100,
          border: '1px solid rgba(232,82,42,0.2)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#E8522A', display: 'inline-block',
            animation: 'pulse-dot 1.2s ease-in-out infinite',
          }} />
          <span style={{ color: '#E8522A', fontSize: 13, fontWeight: 600 }}>
            Radio en vivo ahora
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-12 pb-3"
        style={{ borderBottom: "1px solid #1a1a1a" }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "#E8522A" }}
        >
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-white text-sm">Chat en vivo</h1>
          <div className="flex items-center gap-1">
            <span className="pulse-live inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#E8522A" }} />
            <span className="text-xs" style={{ color: "#888" }}>UNDER Hits Radio</span>
          </div>
        </div>
        {!user && (
          <button
            onClick={() => router.push("/registro")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "#E8522A", color: "#fff" }}
          >
            Unirse
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-center py-8" style={{ color: "#555" }}>
            Cargando mensajes...
          </p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p style={{ color: "#555" }}>Sin mensajes aún</p>
            <p className="text-sm" style={{ color: "#444" }}>¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.usuario_id === user?.id;
            const isTemp = msg.id.startsWith("temp-");
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isOwn && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: getAvatarColor(msg.usuario_id) }}
                  >
                    {getInitial(msg.nombre || "U")}
                  </div>
                )}
                <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                  {!isOwn && (
                    <span className="text-xs mb-1 px-1" style={{ color: "#666" }}>
                      {msg.nombre || "Usuario"}
                    </span>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      background: isOwn ? "#E8522A" : "#1a1a1a",
                      color: "#fff",
                      opacity: isTemp ? 0.7 : 1,
                      borderBottomRightRadius: isOwn ? 4 : 16,
                      borderBottomLeftRadius: isOwn ? 16 : 4,
                    }}
                  >
                    {msg.mensaje}
                  </div>
                  <span className="text-xs mt-1 px-1" style={{ color: "#444" }}>
                    {isTemp ? "Enviando…" : formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input / Guest CTA */}
      {!user ? (
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid #1e1e1e",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}>
          <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
            Solo usuarios registrados pueden chatear
          </p>
          <button
            onClick={() => router.push("/registro")}
            style={{
              background: "#E8522A", border: "none", color: "#fff",
              padding: "8px 16px", borderRadius: 100, fontSize: 13,
              fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}
          >
            Ingresar
          </button>
        </div>
      ) : (
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid #1e1e1e",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#0a0a0a",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
          flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe un mensaje..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            style={{
              flex: 1,
              background: "#1e1e1e",
              border: "1px solid #2a2a2a",
              borderRadius: 22,
              padding: "10px 16px",
              color: "#f5f5f5",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMsg.trim()}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: newMsg.trim() ? "#E8522A" : "#1e1e1e",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
