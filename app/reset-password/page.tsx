'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('Mínimo 6 caracteres')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', textAlign: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ color: '#fff', margin: 0 }}>
          Contraseña actualizada
        </h2>
        <button
          onClick={() => router.replace('/radio')}
          style={{
            background: '#E8522A', border: 'none', color: '#fff',
            padding: '14px 32px', borderRadius: 100,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Ir a la radio
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
        Nueva contraseña
      </h1>
      <p style={{ color: '#888', fontSize: 14, margin: '0 0 28px' }}>
        Ingresá tu nueva contraseña.
      </p>
      <form onSubmit={handleReset}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: '100%', padding: '16px',
            borderRadius: 16, fontSize: 14,
            background: '#1a1a1a', color: '#fff',
            border: '1px solid #333', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
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
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
