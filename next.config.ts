import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: 'otpajfcjsehqdkzanbsu.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
        ],
      },
      {
        // Aplicar headers de seguridad a todas las rutas
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: solo propios + Next.js inline
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Estilos: propios + inline (Tailwind)
              "style-src 'self' 'unsafe-inline'",
              // Imágenes: propias + Supabase Storage
              "img-src 'self' data: blob: https://otpajfcjsehqdkzanbsu.supabase.co",
              // Audio: propio + Supabase Storage + Zeno.fm stream
              "media-src 'self' blob: https://otpajfcjsehqdkzanbsu.supabase.co https://*.zeno.fm",
              // Conexiones: Supabase API + Realtime + Zeno.fm
              "connect-src 'self' https://otpajfcjsehqdkzanbsu.supabase.co wss://realtime.supabase.co wss://*.supabase.co https://*.zeno.fm",
              // Fuentes
              "font-src 'self'",
              // Frames: ninguno (previene clickjacking)
              "frame-src 'none'",
              // Workers: propios + blob (Service Worker)
              "worker-src 'self' blob:",
              // Manifest PWA
              "manifest-src 'self'",
            ].join('; '),
          },
          // Prevenir clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevenir MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy — limitar acceso a APIs del navegador
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
            ].join(', '),
          },
          // HSTS — forzar HTTPS
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
