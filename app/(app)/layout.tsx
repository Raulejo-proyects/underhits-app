"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/radio') {
      router.replace('/registro');
    }
  }, [loading, user, pathname, router]);

  return (
    <div className="flex flex-col h-full">
      {!user && !loading && pathname === '/radio' && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px 16px',
          background: '#111',
          borderBottom: '1px solid #1a1a1a',
        }}>
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
        </div>
      )}
      <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: "72px" }}>
        {children}
      </main>

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
