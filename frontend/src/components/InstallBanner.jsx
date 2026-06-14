import { useEffect, useState } from 'react'
import { Smartphone, Share, X } from 'lucide-react'
import { Button } from './ui/Button'
import { isIos, isStandalone, getPushState } from '../lib/push'

// Dismissible, app-wide nudge to install Hestia as a PWA — the prerequisite for
// push notifications (on iOS, the only way to get them at all). Two paths:
//   • Android / desktop Chromium: capture `beforeinstallprompt` and offer a real
//     "Add" button that triggers the native install dialog.
//   • iOS: that event never fires, so spell out the Share → Add to Home Screen
//     steps instead (the same gate as the Notifications settings flow).
// Hidden once installed (standalone), already push-subscribed, or dismissed
// (remembered across sessions so it never nags twice).
const DISMISS_KEY = 'hestia.installBannerDismissed'

export function InstallBanner() {
  const [deferred, setDeferred] = useState(null) // saved beforeinstallprompt event
  const [installed, setInstalled] = useState(() => isStandalone())
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  // Capture the install prompt (Android/desktop). iOS never dispatches it.
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault() // keep our banner the entry point, not the browser's
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Don't nag a device that already receives alerts.
  useEffect(() => {
    let active = true
    getPushState().then((s) => active && setSubscribed(s.subscribed))
    return () => {
      active = false
    }
  }, [])

  const ios = isIos()
  // Show only when there's something to do: not installed, not already alerted,
  // not dismissed, and we either have a native prompt or are on iOS (manual A2HS).
  if (installed || subscribed || dismissed || !(deferred || ios)) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode — dismissal is in-memory only for this session */
    }
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    try {
      await deferred.userChoice
    } catch {
      /* user dismissed the native dialog — nothing to do */
    }
    setDeferred(null)
  }

  return (
    <div className="border-b border-border bg-primary/5">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Smartphone className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Install Hestia for safety alerts</p>
          <p className="text-xs text-ink-muted">
            {ios && !deferred ? (
              <>
                Tap Share{' '}
                <Share className="inline size-3.5 -translate-y-px text-primary" aria-hidden="true" /> →
                “Add to Home Screen” to enable push notifications.
              </>
            ) : (
              'Add it to your device to get push notifications, even when the app is closed.'
            )}
          </p>
        </div>
        {deferred && (
          <Button size="sm" onClick={install}>
            Add
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
