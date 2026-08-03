import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { captureAuthErrorFromUrl } from '@/lib/auth-error-capture'
import App from './App.tsx'

// Must run before React Router mounts — see auth-error-capture.ts for why.
captureAuthErrorFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
