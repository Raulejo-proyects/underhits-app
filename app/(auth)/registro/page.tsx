"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });
      if (authError) throw authError;

      if (data.user) {
        await supabase.from("pwa_usuarios").upsert({
          id: data.user.id,
          email,
          nombre: nombre || email.split("@")[0],
        });
      }
      router.push("/radio");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const handleSaltar = () => router.replace("/radio");

  return (
    <div className="w-full max-w-sm">
      <div className="flex justify-center mb-8">
        <Image src="/icons/icon-192.png" alt="UNDER Hits" width={80} height={80} className="rounded-2xl" />
      </div>

      <h1 className="text-2xl font-bold text-center mb-1" style={{ color: "#fff" }}>
        Under Hits Radio
      </h1>
      <p className="text-center text-sm mb-8" style={{ color: "#888" }}>
        Crea tu cuenta para acceder a todas las funciones
      </p>

      <form onSubmit={handleRegistro} className="space-y-3">
        <input
          type="text"
          placeholder="Tu nombre (opcional)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full px-4 py-4 rounded-2xl text-sm outline-none"
          style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #333" }}
        />
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
          placeholder="Contraseña (mín. 6 caracteres)"
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaltar}
            className="flex-1 py-4 rounded-2xl font-semibold text-sm"
            style={{ background: "#2a2a2a", color: "#aaa" }}
          >
            Saltar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 rounded-2xl font-semibold text-sm"
            style={{ background: "#E8522A", color: "#fff", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Cargando..." : "Registrarse"}
          </button>
        </div>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: "#888" }}>
        ¿Ya tienes cuenta?{" "}
        <button
          onClick={() => router.push("/login")}
          className="font-semibold"
          style={{ color: "#E8522A" }}
        >
          Iniciar sesión
        </button>
      </p>
    </div>
  );
}
