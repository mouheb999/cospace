'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { submitCheckin, type CheckinResult } from '@/app/actions/checkin'
import { Button } from '@/components/ui'
import { Camera, MapPin, Check, AlertTriangle, Loader2 } from 'lucide-react'

type Step = 'idle' | 'camera' | 'preview' | 'location' | 'review' | 'submitting' | 'success' | 'error'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
}

export function CheckinTab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('idle')
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [streak, setStreak] = useState<number>(0)
  const [cameraError, setCameraError] = useState<string>('')

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('')
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err: unknown) {
      const isDenied = err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setCameraError(
        isDenied
          ? 'Accès caméra refusé. Autorisez l\'accès dans les paramètres de votre navigateur.'
          : 'Caméra non disponible. Utilisez l\'option d\'upload de fichier ci-dessous.'
      )
    }
  }, [])

  // ── Capture photo from video ──────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const maxW = 800
    const scale = Math.min(1, maxW / video.videoWidth)
    canvas.width = video.videoWidth * scale
    canvas.height = video.videoHeight * scale

    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPhotoData(dataUrl)

    streamRef.current?.getTracks().forEach(t => t.stop())
    setStep('preview')
  }, [])

  // ── File upload fallback ──────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhotoData(ev.target?.result as string)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }, [])

  // ── Get GPS location ──────────────────────────────────────────────────────
  const getLocation = useCallback(() => {
    setStep('location')
    if (!navigator.geolocation) {
      setErrorMsg('La géolocalisation n\'est pas supportée par votre navigateur.')
      setStep('error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        })
        setStep('review')
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Accès à la localisation refusé. Autorisez l\'accès dans les paramètres.',
          2: 'Impossible de déterminer votre position. Vérifiez votre GPS.',
          3: 'Délai de localisation dépassé. Réessayez.',
        }
        setErrorMsg(messages[err.code] ?? 'Erreur de localisation inconnue.')
        setStep('error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  // ── Submit check-in ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!photoData || !location) return
    setStep('submitting')

    const result: CheckinResult = await submitCheckin({
      photoBase64: photoData,
      latitude: location.latitude,
      longitude: location.longitude,
    })

    if (result.success) {
      setStreak(result.streak)
      setStep('success')
    } else {
      setErrorMsg(result.error)
      setStep('error')
    }
  }, [photoData, location])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setPhotoData(null)
    setLocation(null)
    setErrorMsg('')
    setCameraError('')
    setStep('idle')
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 w-full animate-fade-up">

      {/* IDLE */}
      {step === 'idle' && (
        <div className="flex flex-col items-center gap-5 text-center w-full">
          <div className="w-24 h-24 rounded-full bg-teal/10 flex items-center justify-center">
            <Camera size={40} className="text-teal" />
          </div>
          <div>
            <h2 className="font-display text-[1.4rem] tracking-[0.04em] mb-2">Check-in Quotidien</h2>
            <p className="text-[0.8rem] text-muted">
              Prenez une photo et confirmez votre présence à CoSpace.
            </p>
          </div>
          <Button variant="teal" fullWidth onClick={startCamera}>
            <Camera size={18} />
            Commencer le Check-in
          </Button>
        </div>
      )}

      {/* CAMERA */}
      {step === 'camera' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="font-display text-[1.2rem] tracking-[0.04em]">Prenez une photo</h2>

          {cameraError ? (
            <div className="rounded-[14px] bg-danger/10 border border-danger/25 p-4 text-[0.82rem] text-danger text-center w-full">
              <p className="font-medium mb-3">Caméra indisponible</p>
              <p className="mb-4 text-[0.75rem]">{cameraError}</p>
              <label className="block w-full">
                <Button variant="outline" fullWidth onClick={() => fileInputRef.current?.click()}>
                  📁 Uploader une photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-[3/4] rounded-[20px] overflow-hidden bg-black border-2 border-teal/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-4 border-teal/20 rounded-[18px] pointer-events-none" />
              </div>
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-teal bg-teal/20 flex items-center justify-center hover:bg-teal/30 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-teal" />
              </button>
            </>
          )}

          <button onClick={reset} className="text-[0.75rem] text-muted hover:text-white transition-colors">
            Annuler
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && photoData && (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="font-display text-[1.2rem] tracking-[0.04em]">Ça vous va ?</h2>
          <div className="relative w-full aspect-[3/4] rounded-[20px] overflow-hidden border-2 border-teal/30">
            <Image
              src={photoData}
              alt="Aperçu de votre photo"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              fullWidth
              onClick={() => { setPhotoData(null); startCamera() }}
            >
              Reprendre
            </Button>
            <Button variant="teal" fullWidth onClick={getLocation}>
              Continuer
            </Button>
          </div>
        </div>
      )}

      {/* LOCATION – getting GPS */}
      {step === 'location' && (
        <div className="flex flex-col items-center gap-4 text-center py-8">
          <div className="w-16 h-16 rounded-full border-4 border-teal border-t-transparent animate-spin" />
          <p className="font-display text-[1.1rem]">Récupération de votre position…</p>
          <p className="text-[0.75rem] text-muted">Autorisez l'accès à la localisation si demandé.</p>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && photoData && location && (
        <div className="flex flex-col items-center gap-4 w-full">
          <h2 className="font-display text-[1.2rem] tracking-[0.04em]">Prêt à envoyer</h2>

          <div className="relative w-full h-48 rounded-[14px] overflow-hidden border border-border">
            <Image
              src={photoData}
              alt="Votre photo de check-in"
              fill
              className="object-cover"
            />
          </div>

          <div className="flex items-center gap-3 w-full rounded-[14px] bg-success/10 border border-success/25 px-4 py-3">
            <MapPin className="text-success" size={24} />
            <div>
              <p className="text-[0.85rem] font-medium text-success">Position confirmée</p>
              <p className="text-[0.7rem] text-success/70">
                Précision : ±{location.accuracy}m
              </p>
            </div>
          </div>

          <Button variant="teal" fullWidth onClick={handleSubmit}>
            <Check size={18} />
            Valider le Check-in
          </Button>
          <button onClick={reset} className="text-[0.75rem] text-muted hover:text-white transition-colors">
            Annuler
          </button>
        </div>
      )}

      {/* SUBMITTING */}
      {step === 'submitting' && (
        <div className="flex flex-col items-center gap-4 text-center py-8">
          <Loader2 className="w-12 h-12 text-teal animate-spin" />
          <p className="font-display text-[1.1rem]">Envoi du check-in…</p>
        </div>
      )}

      {/* SUCCESS */}
      {step === 'success' && (
        <div className="flex flex-col items-center gap-5 text-center w-full py-4">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
            <Check size={40} className="text-success" />
          </div>
          <h2 className="font-display text-[1.6rem] tracking-[0.04em]">Check-in réussi !</h2>
          <p className="text-muted text-[0.8rem]">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {streak > 1 && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-orange-500/10 border border-orange-500/25">
              <span className="text-2xl animate-flame">🔥</span>
              <p className="text-orange-400 font-bold">{streak} jours de streak !</p>
            </div>
          )}
          {photoData && (
            <div className="relative w-32 h-32 rounded-[14px] overflow-hidden border border-border mt-2">
              <Image src={photoData} alt="Photo du jour" fill className="object-cover" />
            </div>
          )}
          <Button variant="teal" fullWidth onClick={reset}>
            Terminé
          </Button>
        </div>
      )}

      {/* ERROR */}
      {step === 'error' && (
        <div className="flex flex-col items-center gap-5 text-center w-full py-4">
          <div className="w-20 h-20 rounded-full bg-danger/20 flex items-center justify-center">
            <AlertTriangle size={40} className="text-danger" />
          </div>
          <h2 className="font-display text-[1.4rem] tracking-[0.04em] text-danger">Check-in échoué</h2>
          <p className="text-[0.82rem] text-danger bg-danger/10 border border-danger/25 rounded-[14px] px-4 py-3 w-full">
            {errorMsg}
          </p>
          <Button variant="outline" fullWidth onClick={reset}>
            Réessayer
          </Button>
        </div>
      )}

    </div>
  )
}
