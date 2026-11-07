import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/inter'
import '@fontsource/bebas-neue'
import './index.css'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// снимаем стартовый спиннер
requestAnimationFrame(() => {
  const boot = document.getElementById('boot')
  if (boot) {
    boot.classList.add('gone')
    setTimeout(() => boot.remove(), 450)
  }
})
