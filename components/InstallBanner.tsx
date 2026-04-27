'use client'

import { useState, useEffect } from 'react'
import { usePlatform } from '@/lib/platform-context'

export function InstallBanner() {
  const { platform, isStandalone } = usePlatform()
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Escuchar el evento personalizado del botón "Instalar App"
    const handleShowBanner = () => setShow(true)
    window.addEventListener('show-install-banner', handleShowBanner)
    return () => window.removeEventListener('show-install-banner', handleShowBanner)
  }, [])

  useEffect(() => {
    if (isStandalone) return
    const dismissed = localStorage.getItem('install-banner-dismissed')
    if (dismissed) return

    // Android/Desktop: capturar el evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: mostrar instrucciones manuales
    if (platform === 'ios') {
      setTimeout(() => setShow(true), 2000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [platform, isStandalone])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') dismiss()
    }
    dismiss()
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('install-banner-dismissed', 'true')
  }

  if (!show || isStandalone) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: 400,
      background: '#1e1e1e',
      border: '1px solid #E8522A',
      borderRadius: 16,
      padding: '14px 16px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      animation: 'slide-up 0.3s ease-out',
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>📻</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#f5f5f5', fontWeight: 700, margin: '0 0 4px', fontSize: 14 }}>
          Instalar UNDER Hits Radio
        </p>
        {platform === 'ios' ? (
          <p style={{ color: '#888', fontSize: 12, margin: '0 0 10px', lineHeight: 1.4 }}>
            Toca <strong style={{ color: '#E8522A' }}>Compartir</strong> y luego{' '}
            <strong style={{ color: '#E8522A' }}>&quot;Agregar a inicio&quot;</strong> para instalar la app
          </p>
        ) : (
          <p style={{ color: '#888', fontSize: 12, margin: '0 0 10px', lineHeight: 1.4 }}>
            Instala la app para escuchar sin abrir el navegador
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {platform !== 'ios' && (
            <button onClick={handleInstall}
              style={{
                background: '#E8522A', border: 'none', color: '#fff',
                padding: '7px 14px', borderRadius: 100, fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
              }}>
              Instalar
            </button>
          )}
          <button onClick={dismiss}
            style={{
              background: 'none', border: '1px solid #333', color: '#666',
              padding: '7px 14px', borderRadius: 100, fontSize: 12,
              cursor: 'pointer',
            }}>
            Ahora no
          </button>
        </div>
      </div>
      <button onClick={dismiss}
        style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        ✕
      </button>
    </div>
  )
}
