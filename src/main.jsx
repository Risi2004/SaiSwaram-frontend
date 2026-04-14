import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { initializeOfflineData, syncNow } from './data/offlineRepository'
import './index.css'
import App from './App.jsx'

// Boot the background Service Worker
registerSW({ immediate: true })
initializeOfflineData().then(() => {
  if (navigator.onLine) {
    syncNow()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
