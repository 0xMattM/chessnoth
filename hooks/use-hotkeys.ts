import { useEffect, useCallback } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void

interface HotkeyConfig {
  key: string
  handler: HotkeyHandler
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  preventDefault?: boolean
}

/**
 * Custom hook for handling keyboard shortcuts
 * @param hotkeys Array of hotkey configurations
 * @param enabled Whether hotkeys are enabled (default: true)
 */
export function useHotkeys(
  hotkeys: HotkeyConfig[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger hotkeys when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const hotkey of hotkeys) {
        const keyMatches = event.key.toLowerCase() === hotkey.key.toLowerCase()
        const ctrlMatches = hotkey.ctrl === undefined || event.ctrlKey === hotkey.ctrl
        const shiftMatches = hotkey.shift === undefined || event.shiftKey === hotkey.shift
        const altMatches = hotkey.alt === undefined || event.altKey === hotkey.alt

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          if (hotkey.preventDefault !== false) {
            event.preventDefault()
          }
          hotkey.handler(event)
          break
        }
      }
    },
    [hotkeys, enabled]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

