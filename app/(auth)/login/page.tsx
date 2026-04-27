"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.push("/radio");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-8">
        <Image src="/icons/icon-192.png" alt="UNDER Hits" width={80} height={80} className="rounded-2xl" />
      </div>

      <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#fff" }}>
        Iniciar sesión
      </h1>
      <p className="text-center text-sm mb-8" style={{ color: "#888" }}>
        UNDER Hits Radio
      </p>

      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-4 rounded-2xl text-sm outline-none"
          style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #333" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-4 rounded-2xl text-sm outline-none"
          style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #333" }}
        />

        {error && (
          <p className="text-sm text-center" style={{ color: "#E8522A" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-semibold text-sm mt-2"
          style={{ background: "#E8522A", color: "#fff", opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Cargando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
        ¿No tienes cuenta?{" "}
        <button
          onClick={() => router.push("/registro")}
          className="font-semibold"
          style={{ color: "#E8522A" }}
        >
          Registrarse
        </button>
      </p>
      <p className="text-center text-sm mt-3">
        <button
          onClick={() => router.push("/radio")}
          className="font-semibold"
          style={{ color: "#888" }}
        >
          Continuar sin cuenta
        </button>
      </p>
    </div>
  );
}
