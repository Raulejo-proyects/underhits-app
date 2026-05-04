"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { InstallBanner } from "@/components/InstallBanner";
import { MiniPlayer } from "@/components/MiniPlayer";
import { useAuth } from "@/lib/authContext";

const tabs = [
  {
    href: "/radio",
    label: "Radio",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={active ? "#E8522A" : "#888"} strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill={active ? "#E8522A" : "#888"} />
        <path d="M8 8l-4-4M16 8l4-4" stroke={active ? "#E8522A" : "#888"} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/offline",
    label: "Offline",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M9 19H6a3 3 0 01-3-3V8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3h-3" stroke={active ? "#E8522A" : "#888"} strokeWidth="2" strokeLinecap="round" />
        <path d="M12 15v6M9 18l3 3 3-3" stroke={active ? "#E8522A" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="7" y="7" width="3" height="4" rx="1" fill={active ? "#E8522A" : "#888"} />
        <rect x="11" y="7" width="3" height="3" rx="1" fill={active ? "#E8522A" : "#888"} />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke={active ? "#E8522A" : "#888"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const lastHiddenRef = useRef<number>(0)
  const [debugLog, setDebugLog] = useState<string[]>([])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenRef.current = Date.now()
      }

      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastHiddenRef.current
        const dur = Math.round(hiddenDuration / 1000)
        setDebugLog(prev => [
          `${new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit',second:'2-digit'})} DESBLOQUEADO (${dur}s oculto)`,
          ...prev
        ].slice(0, 8))

        if (hiddenDuration > 500) {
          // Usar función updater para obtener el valor actual
          setRefreshKey(prev => {
            const next = prev + 1
            setDebugLog(d => [
              `${new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit',second:'2-digit'})} → Forzando remount key=${next}`,
              ...d
            ].slice(0, 8))
            return next
          })
        }
      } else {
        setDebugLog(prev => [
          `${new Date().toLocaleTimeString('es', {hour:'2-digit',minute:'2-digit',second:'2-digit'})} BLOQUEADO`,
          ...prev
        ].slice(0, 8))
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, []) // Sin dependencias - el updater function resuelve el closure

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/radio') {
      router.replace('/registro');
    }
  }, [loading, user, pathname, router]);

  return (
    <div className="flex flex-col h-full">
      {!loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px 16px',
          background: '#111',
          borderBottom: '1px solid #1a1a1a',
        }}>
          {!user ? (
            <button
              onClick={() => router.push('/registro')}
              style={{
                background: 'rgba(232,82,42,0.15)',
                border: '1px solid rgba(232,82,42,0.3)',
                color: '#E8522A',
                padding: '4px 12px',
                borderRadius: 100,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Registrarse
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#E8522A',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24"
                     fill="none" stroke="#fff" strokeWidth={2}
                     strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  <div
                    onClick={() => setShowMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  />
                  <div style={{
                    position: 'absolute', top: 40, right: 0,
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 12, padding: '8px 0',
                    minWidth: 180, zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}>
                    <div style={{
                      padding: '8px 16px 12px',
                      borderBottom: '1px solid #2a2a2a',
                    }}>
                      <p style={{
                        color: '#f5f5f5', fontSize: 13,
                        fontWeight: 700, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', maxWidth: 148,
                      }}>
                        {user.user_metadata?.nombre ||
                         user.email?.split('@')[0] ||
                         'Usuario'}
                      </p>
                      <p style={{
                        color: '#555', fontSize: 11,
                        margin: '2px 0 0',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', maxWidth: 148,
                      }}>
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        setShowMenu(false)
                        await signOut()
                        router.replace('/registro')
                      }}
                      style={{
                        width: '100%', background: 'none',
                        border: 'none', cursor: 'pointer',
                        padding: '10px 16px',
                        display: 'flex', alignItems: 'center',
                        gap: 10, color: '#ef4444',
                        fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <svg width={15} height={15} viewBox="0 0 24 24"
                           fill="none" stroke="currentColor"
                           strokeWidth={2} strokeLinecap="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      <main
        key={refreshKey}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>

      {debugLog.length > 0 && (
        <div
          onClick={() => setDebugLog([])}
          style={{
            position: 'fixed',
            bottom: 120,
            left: 8,
            right: 8,
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid #E8522A',
            borderRadius: 8,
            padding: '8px 10px',
            zIndex: 99999,
            fontSize: 10,
            fontFamily: 'monospace',
            maxHeight: 160,
            overflow: 'auto',
          }}
        >
          <p style={{ color: '#E8522A', margin: '0 0 4px', fontSize: 10, fontWeight: 700 }}>
            DEBUG (toca para cerrar)
          </p>
          {debugLog.map((log, i) => (
            <p key={i} style={{ color: '#aaa', margin: '2px 0', fontSize: 10 }}>
              {log}
            </p>
          ))}
        </div>
      )}

      <InstallBanner />

      {/* Mini player persistente — visible al navegar entre tabs */}
      <MiniPlayer />

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full safe-bottom"
        style={{
          maxWidth: "430px",
          background: "#111",
          borderTop: "1px solid #222",
          zIndex: 50,
        }}
      >
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-1 px-6 py-1"
              >
                {tab.icon(active)}
                <span
                  className="text-xs font-medium"
                  style={{ color: active ? "#E8522A" : "#888" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
