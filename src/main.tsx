import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/patrick-hand/latin-400.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/orbitron/latin-900.css'
import App from './App'
import './index.css'

// Invite links look like /?session=CODE; turn them into a hash route.
const invite = new URLSearchParams(location.search).get('session')
if (invite && /^[A-Za-z0-9]{4,10}$/.test(invite)) {
  history.replaceState(null, '', `${location.pathname}#/join/${invite.toUpperCase()}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
