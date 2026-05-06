import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlatformProvider } from "@/lib/platform-context";
import SwRegister from "@/components/SwRegister";
import { AuthProvider } from "@/lib/authContext";

export const metadata: Metadata = {
  title: "UNDER Hits Radio",
  description: "Escucha UNDER Hits Radio en vivo, podcasts y playlists",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UNDER Hits",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8522A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full app-shell" style={{ background: "#0a0a0a", color: "#fff" }}>
        <div
          className="relative mx-auto h-full app-container"
          style={{ maxWidth: "430px", background: "#0a0a0a" }}
        >
          <SwRegister />
          <AuthProvider>
            <PlatformProvider>
              {children}
            </PlatformProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
