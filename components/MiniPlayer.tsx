'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAudioPlayer } from '@/lib/audioPlayer'
import type { PlayerState } from '@/lib/audioPlayer'

export function MiniPlayer() {
  const [state, setState] = useState<PlayerState | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const player = getAudioPlayer()
    const unsub = player.subscribe(setState)
    return unsub
  }, [])

  // No mostrar en /radio ni si no hay nada reproduciéndose o pendiente
  if (!state) return null
  if (pathname === '/radio') return null
  if (!state.isPlaying && !state.currentUrl) return null

  const player = getAudioPlayer()

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 57,
        left: 0,
        right: 0,
        background: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
        borderBottom: '1px solid #111',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 100,
        cursor: 'pointer',
      }}
      onClick={() => router.push('/radio')}
    >
      {/* Indicador animado */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: '#E8522A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        animation: state.isPlaying ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
          {state.isLive ? (
            <circle cx="12" cy="12" r="6" />
          ) : (
            <polygon points="5,3 19,12 5,21" />
          )}
        </svg>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#f5f5f5', fontSize: 13, fontWeight: 600,
          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {state.currentTitle || 'UNDER Hits Radio'}
        </p>
        <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
          {state.isLive ? '● En vivo' : state.currentArtist || ''}
        </p>
      </div>

      {/* Play/Pause */}
      <button
        onClick={(e) => { e.stopPropagation(); player.toggle(); }}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#E8522A', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {state.isPlaying ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="#fff">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>
    </div>
  )
}
