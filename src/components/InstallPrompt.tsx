'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    if (standalone) return

    // Check if previously dismissed (respect for 7 days)
    const dismissedAt = localStorage.getItem('pwa-dismissed')
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt)
      if (diff < 7 * 24 * 60 * 60 * 1000) return
    }

    // Detect iOS
    const ua = window.navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isiOS)

    if (isiOS) {
      // Show iOS instructions after a short delay
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // Android / Chrome: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', Date.now().toString())
  }

  if (isStandalone || !showBanner || dismissed) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[200] animate-fade-up">
      <div className="bg-surface border border-teal/30 rounded-2xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted hover:text-white transition-colors bg-transparent border-none cursor-pointer p-1"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-teal/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download size={20} className="text-teal" />
          </div>
          <div>
            <div className="font-bold text-[0.9rem]">Installer CoSpace</div>
            <div className="text-[0.7rem] text-muted">
              {isIOS
                ? "Ajoutez l'app sur votre écran d'accueil"
                : "Acc\u00e9dez plus vite depuis votre \u00e9cran d'accueil"
              }
            </div>
          </div>
        </div>

        {isIOS ? (
          <div className="bg-surface2 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[0.78rem]">
              <span className="text-muted">1.</span>
              <span>Appuyez sur <strong>&#8942;</strong> (3 points)</span>
            </div>
            <div className="flex items-center gap-2 text-[0.78rem]">
              <span className="text-muted">2.</span>
              <span>Appuyez sur</span>
              <Share size={14} className="text-teal" />
              <span><strong>Partager</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[0.78rem]">
              <span className="text-muted">3.</span>
              <span>Appuyez sur <strong>Voir plus</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[0.78rem]">
              <span className="text-muted">4.</span>
              <span><strong>Sur l&apos;&#233;cran d&apos;accueil</strong></span>
            </div>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-teal text-black py-2.5 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer hover:bg-teal/90 transition-colors"
          >
            Installer l&apos;application
          </button>
        )}
      </div>
    </div>
  )
}
