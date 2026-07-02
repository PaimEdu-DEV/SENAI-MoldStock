import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button.jsx'

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandaloneMode)

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      if (!isStandaloneMode()) {
        setInstallPrompt(event)
      }
    }

    function handleInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstalled(true)
    }
    setInstallPrompt(null)
  }

  if (installed || !installPrompt) return null

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleInstall}>
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Instalar</span>
    </Button>
  )
}
