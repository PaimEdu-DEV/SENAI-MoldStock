import { useEffect } from 'react'

export default function BrowserGuard() {
  useEffect(() => {
    if (!import.meta.env.PROD) return undefined

    const blockEvent = (event) => {
      event.preventDefault()
      event.stopPropagation()
      return false
    }

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      const isDevToolsShortcut =
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && key === 'u')

      if (isDevToolsShortcut) {
        blockEvent(event)
      }
    }

    const originalConsole = { ...console }
    console.log = () => {}
    console.info = () => {}
    console.debug = () => {}
    console.warn = () => {}

    window.addEventListener('contextmenu', blockEvent)
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      Object.assign(console, originalConsole)
      window.removeEventListener('contextmenu', blockEvent)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  return null
}
