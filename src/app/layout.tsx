import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/lib/auth/context'
import { ToastProvider } from '@/components/ui/Toast'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { InstallPrompt } from '@/components/InstallPrompt'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoSpace - Espace de Coworking Premium',
  description: 'Un espace conçu pour les entrepreneurs, freelances et équipes qui veulent accomplir plus — chaque jour.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CoSpace',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192x192.svg',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#080808',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
        <InstallPrompt />
      </body>
    </html>
  )
}
