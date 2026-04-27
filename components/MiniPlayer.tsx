'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAudioPlayer, PlayerState } from '@/lib/audioPlayer'

export function MiniPlayer() {
  const [state, setState] = useState<PlayerState | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const player = getAudioPlayer()
    const unsub = player.subscribe((s) => {
      setState(s)
      setHasNext(player.hasNext())
      setHasPrev(player.hasPrev())
    })
    return unsub
  }, [])

  if (!state || pathname === '/radio') return null
  if (!state.isPlaying && !state.currentUrl) return null

  const player = getAudioPlayer()

  return (
    <div style={{
      position: 'absolute',
      bottom: 57,
      left: 0, right: 0,
      background: '#1a1a1a',
      borderTop: '1px solid #2a2a2a',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      zIndex: 100,
    }}>
      {/* Info — toca para ir a radio */}
      <div
        onClick={() => router.push('/radio')}
        style={{
          flex: 1, minWidth: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#E8522A', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: state.isPlaying && state.isLive
            ? 'pulse-dot 2s ease-in-out infinite' : 'none',
        }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="#fff">
            {state.isLive
              ? <circle cx="12" cy="12" r="6"/>
              : <polygon points="5,3 19,12 5,21"/>
            }
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            color: '#f5f5f5', fontSize: 12, fontWeight: 600,
            margin: 0, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {state.currentTitle || 'UNDER Hits Radio'}
          </p>
          <p style={{ color: '#888', fontSize: 10, margin: 0 }}>
            {state.isLive ? '● En vivo' : state.currentArtist || ''}
          </p>
        </div>
      </div>

      {/* Prev — solo offline con cola */}
      {!state.isLive && (
        <button
          onClick={() => player.playPrev()}
          disabled={!hasPrev}
          style={{
            background: 'none', border: 'none',
            cursor: hasPrev ? 'pointer' : 'default',
            padding: 6, flexShrink: 0,
            opacity: hasPrev ? 1 : 0.25,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24"
               fill="none" stroke="#fff" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19,20 9,12 19,4"/>
            <line x1="5" y1="19" x2="5" y2="5"/>
          </svg>
        </button>
      )}

      {/* Play/Pause */}
      <button
        onClick={() => player.toggle()}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#E8522A', border: 'none',
          cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state.isPlaying ? (
          <svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}
      </button>

      {/* Next — solo offline con cola */}
      {!state.isLive && (
        <button
          onClick={() => player.playNext()}
          disabled={!hasNext}
          style={{
            background: 'none', border: 'none',
            cursor: hasNext ? 'pointer' : 'default',
            padding: 6, flexShrink: 0,
            opacity: hasNext ? 1 : 0.25,
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24"
               fill="none" stroke="#fff" strokeWidth={2}
               strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5,4 15,12 5,20"/>
            <line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      )}
    </div>
  )
}
