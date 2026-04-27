'use client'

export function VinylDisc({ isPlaying, logoUrl }: {
  isPlaying: boolean
  logoUrl?: string
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1',
      animation: isPlaying ? 'spin 3s linear infinite' : 'none',
      willChange: 'transform',
    }}>
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"
           width="100%" height="100%">
        <defs>
          <radialGradient id="discGrad" cx="42%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="35%" stopColor="#f0eeea"/>
            <stop offset="70%" stopColor="#e8e5df"/>
            <stop offset="100%" stopColor="#d4d0c8"/>
          </radialGradient>
          <radialGradient id="labelGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#f5f3ef"/>
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="188" fill="url(#discGrad)"/>

        {[182,176,170,164,158,152,146,140,134,128,122,116,110,104].map((r,i) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none"
            stroke={i%2===0 ? "#ccc9c0" : "#bbb7ad"}
            strokeWidth={i%3===0 ? "0.5" : "0.3"} opacity="0.6"/>
        ))}

        <path d="M 72 130 A 140 140 0 0 1 200 60" fill="none"
          stroke="#ffffff" strokeWidth="4" opacity="0.35" strokeLinecap="round"/>
        <path d="M 80 145 A 128 128 0 0 1 200 74" fill="none"
          stroke="#ffffff" strokeWidth="2" opacity="0.2" strokeLinecap="round"/>

        <circle cx="200" cy="200" r="76" fill="url(#labelGrad)"
                stroke="#dbd8d0" strokeWidth="0.8"/>
        <circle cx="200" cy="200" r="74" fill="none"
                stroke="#E8522A" strokeWidth="1.5" opacity="0.25"/>
        <circle cx="200" cy="200" r="70" fill="none"
                stroke="#e0ddd5" strokeWidth="0.6"/>

        {logoUrl ? (
          <image href={logoUrl} x="132" y="158" width="136" height="84"
                 preserveAspectRatio="xMidYMid meet"/>
        ) : (
          <>
            <text x="200" y="188" textAnchor="middle"
              fontFamily="'Arial Black', Impact, sans-serif" fontWeight="900"
              fontSize="22" fill="#E8522A" letterSpacing="-0.5">UNDER</text>
            <line x1="148" y1="196" x2="252" y2="196"
                  stroke="#E8522A" strokeWidth="1" opacity="0.4"/>
            <text x="200" y="214" textAnchor="middle"
              fontFamily="'Arial Black', Impact, sans-serif" fontWeight="900"
              fontSize="15" fill="#1a1a1a" letterSpacing="4">HITS</text>
            <text x="200" y="227" textAnchor="middle"
              fontFamily="sans-serif" fontSize="7.5" fill="#888"
              letterSpacing="2">RADIO</text>
            <text x="157" y="216" textAnchor="middle"
                  fontSize="11" fill="#E8522A" opacity="0.8">⚡</text>
            <text x="244" y="216" textAnchor="middle"
                  fontSize="11" fill="#E8522A" opacity="0.8">⚡</text>
          </>
        )}

        <circle cx="200" cy="200" r="5.5" fill="#0a0a0a"
                stroke="#e0ddd5" strokeWidth="0.5"/>
        <circle cx="200" cy="200" r="187" fill="none"
                stroke="#ffffff" strokeWidth="1" opacity="0.2"/>
        <circle cx="200" cy="200" r="186" fill="none"
                stroke="#b0ab9e" strokeWidth="0.5" opacity="0.4"/>
      </svg>
    </div>
  )
}
