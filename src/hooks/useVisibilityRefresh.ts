'use client'

import { useEffect, useRef } from 'react'

/**
 * Calls `onVisible` whenever the page becomes visible or regains focus.
 *
 * Critical for PWA/mobile: when the OS backgrounds the app, the Supabase
 * realtime WebSocket may drop and miss events. On return to foreground we
 * refetch the data to catch anything missed.
 *
 * A small debounce prevents duplicate calls (visibilitychange + focus fire
 * close together on some browsers).
 */
export function useVisibilityRefresh(onVisible: () => void, debounceMs: number = 400) {
  const lastRunRef = useRef<number>(0)
  const cbRef = useRef(onVisible)
  cbRef.current = onVisible

  useEffect(() => {
    const run = () => {
      const now = Date.now()
      if (now - lastRunRef.current < debounceMs) return
      lastRunRef.current = now
      cbRef.current()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    const onFocus = () => run()
    const onOnline = () => run()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [debounceMs])
}

export default useVisibilityRefresh
