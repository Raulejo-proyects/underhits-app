'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RecuperarPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/reset-password` }
    )
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center', gap: 16,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(232,82,42,0.1)',
          border: '1px solid rgba(232,82,42,0.3)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 32,
        }}>
          📧
        </div>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>
          Revisá tu email
        </h2>
        <p style={{ color: '#888', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Te enviamos un link para restablecer tu contraseña a{' '}
          <strong style={{ color: '#fff' }}>{email}</strong>
        </p>
        <button
          onClick={() => router.push('/login')}
          style={{
            background: '#E8522A', border: 'none', color: '#fff',
            padding: '14px 32px', borderRadius: 100,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Volver a iniciar sesión
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => router.back()}
        style={{
          background: 'none', border: 'none',
          color: '#888', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          gap: 6, fontSize: 13, marginBottom: 24, padding: 0,
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Volver
      </button>

      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
        Recuperar contraseña
      </h1>
      <p style={{ color: '#888', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>
        Ingresá tu email y te enviamos un link para restablecer tu contraseña.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            width: '100%', padding: '16px',
            borderRadius: 16, fontSize: 14,
            background: '#1a1a1a', color: '#fff',
            border: '1px solid #333', outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {error && (
          <p style={{ color: '#E8522A', fontSize: 13, margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#E8522A', border: 'none', color: '#fff',
            padding: '16px', borderRadius: 100,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: 4,
          }}
        >
          {loading ? 'Enviando...' : 'Enviar link de recuperación'}
        </button>
      </form>
    </div>
  )
}
