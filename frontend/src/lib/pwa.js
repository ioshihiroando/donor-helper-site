import { useEffect, useState } from 'react'

// Регистрация service worker. Только в собранной версии (npm run build),
// чтобы в режиме разработки кеш не мешал видеть изменения.
export function registerServiceWorker() {
  if (!import.meta.env?.PROD || !('serviceWorker' in navigator)) return
  const register = () => navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('[pwa] sw:', err))
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register)
}

const DISMISS_KEY = 'donor-pomoshnik:install-dismissed'

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function wasDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

// Состояние для баннера «Установить приложение».
// Chrome/Android: системный диалог через beforeinstallprompt.
// iPhone (Safari): такого события нет — показываем подсказку «Поделиться → На экран Домой».
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed())

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ничего */ }
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'accepted') setHidden(true)
  }

  if (hidden) return { mode: null }
  if (deferred) return { mode: 'prompt', install, dismiss }
  if (isIOS()) return { mode: 'ios', dismiss }
  return { mode: null }
}
