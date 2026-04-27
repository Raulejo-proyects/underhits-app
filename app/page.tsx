'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SplashPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false

    localStorage.removeItem('underhits-guest')

    const timer = setTimeout(() => {
      if (!cancelled) router.replace('/registro')
    }, 3000)

    supabase.auth.getSession()
      .then(({ data }) => {
        if (cancelled) return
        clearTimeout(timer)
        if (data.session) {
          router.replace('/radio')
        } else {
          router.replace('/registro')
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timer)
          router.replace('/registro')
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [router])

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      margin: '0 auto',
      height: '100vh',
      background: '#f5f5f4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 48,
    }}>
      <img
        src="/logo.png"
        alt="UNDER Hits Radio"
        style={{ width: 180, height: 'auto', objectFit: 'contain' }}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = `
              <div style="text-align:center">
                <span style="font-size:48px;font-weight:900;color:#E8522A;
                  font-family:Arial Black,sans-serif;letter-spacing:-2px">
                  UNDER
                </span>
                <div style="font-size:28px;font-weight:900;color:#1a1a1a;
                  font-family:Arial Black,sans-serif;letter-spacing:4px">
                  HITS
                </div>
              </div>
            `
          }
        }}
      />

      <div style={{ width: 200 }}>
        <div style={{
          height: 3,
          background: '#e0e0e0',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#E8522A',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <p style={{
          textAlign: 'center',
          marginTop: 12,
          color: '#888',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'sans-serif',
        }}>
          Cargando {progress}%
        </p>
      </div>
    </div>
  )
}
