import { Flame } from 'lucide-react'

// Calm full-screen hold while the session/households resolve. Quiet, not a
// spinner-in-the-void: the brand mark with a soft breathing primary ring
// (degrades to static under reduced-motion via the shared pulse rule).
export function Splash({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-svh place-items-center bg-bg px-6">
      <div className="flex flex-col items-center gap-4">
        <span className="relative grid size-12 place-items-center rounded-md bg-primary text-primary-fg">
          <span
            className="hestia-pulse-warn absolute inset-0 rounded-md opacity-70"
            aria-hidden="true"
          />
          <Flame className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm text-ink-muted" role="status">
          {label}
        </p>
      </div>
    </div>
  )
}
