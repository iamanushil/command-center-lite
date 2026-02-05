import { useEffect, useCallback } from 'react'

interface UseKeyboardShortcutOptions {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  callback: () => void
  enabled?: boolean
}

export function useKeyboardShortcut({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  altKey = false,
  callback,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      const keyMatches = event.key.toLowerCase() === key.toLowerCase()
      const metaMatches = metaKey ? event.metaKey : !event.metaKey
      const ctrlMatches = ctrlKey ? event.ctrlKey : !event.ctrlKey
      const shiftMatches = shiftKey ? event.shiftKey : !event.shiftKey
      const altMatches = altKey ? event.altKey : !event.altKey

      if (keyMatches && metaMatches && ctrlMatches && shiftMatches && altMatches) {
        event.preventDefault()
        callback()
      }
    },
    [key, metaKey, ctrlKey, shiftKey, altKey, callback, enabled]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
