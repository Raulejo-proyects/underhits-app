"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

type AuthContext = {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContext>({ user: null, loading: true, isGuest: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          try {
            localStorage.setItem('uh-uid', session.user.id)
            localStorage.setItem('uh-email', session.user.email ?? '')
            localStorage.setItem('uh-nombre',
              session.user.user_metadata?.nombre ||
              session.user.email?.split('@')[0] ||
              'Oyente'
            )
          } catch {}
        } else {
          try {
            localStorage.removeItem('uh-uid')
            localStorage.removeItem('uh-email')
            localStorage.removeItem('uh-nombre')
          } catch {}
        }

        if (_event === 'SIGNED_IN' && session?.user) {
          const u = session.user;
          const pendingNombre = localStorage.getItem('pending-nombre');
          await supabase.from('pwa_usuarios').upsert(
            {
              id: u.id,
              email: u.email ?? '',
              nombre:
                pendingNombre ||
                u.user_metadata?.nombre ||
                u.email?.split('@')[0] ||
                'Oyente',
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
          localStorage.removeItem('pending-nombre');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isGuest = !user && !loading;

  return <Ctx.Provider value={{ user, loading, isGuest, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
