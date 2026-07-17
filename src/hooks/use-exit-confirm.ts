import { useEffect, useRef } from 'react'
import { App } from '@capacitor/app'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'

const EXIT_WINDOW_MS = 2000

/** Android's standard "press back again to exit" pattern on the root tab.
 * No-ops harmlessly in a plain browser tab — there's no native back-button
 * event to hook into until a native platform is installed. */
export function useExitConfirm() {
  const location = useLocation()
  const lastPressRef = useRef(0)

  useEffect(() => {
    const listenerPromise = App.addListener('backButton', () => {
      if (location.pathname !== '/dashboard') {
        window.history.back()
        return
      }

      const now = Date.now()
      if (now - lastPressRef.current < EXIT_WINDOW_MS) {
        void App.exitApp()
      } else {
        lastPressRef.current = now
        toast('Press back again to exit')
      }
    })

    return () => {
      void listenerPromise.then((listener) => listener.remove())
    }
  }, [location.pathname])
}
