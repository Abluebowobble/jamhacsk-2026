import { useSyncExternalStore } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'

// Inspection shell. On wide screens it renders the app inside a 390-wide
// <iframe> with a phone bezel — the iframe gets its own viewport, so the app's
// mobile breakpoints (sm:/lg:) fire correctly instead of reading the desktop
// width. Inside that iframe this same component sees a < md viewport and
// renders the app directly, so there's no nesting. On real phones it also
// renders the app directly, full-bleed.
//
// To ship edge-to-edge on desktop too, render <RouterProvider router={router}/>
// straight from main.jsx and drop this wrapper.
const QUERY = '(min-width: 768px)'

function useIsWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

export function PhoneFrame() {
  const wide = useIsWide()

  if (!wide) {
    return <RouterProvider router={router} />
  }

  const src = window.location.pathname + window.location.search + window.location.hash

  return (
    <div className="grid min-h-svh place-items-center bg-neutral-subtle p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-[844px] w-[390px] overflow-hidden rounded-[2.75rem] border-[11px] border-ink bg-bg shadow-modal ring-1 ring-ink/10">
          <iframe
            src={src}
            title="Hestia phone preview"
            className="size-full border-0"
          />
        </div>
        <p className="text-xs text-ink-muted">Phone preview · 390 × 844 — resize the window narrow for the real responsive app</p>
      </div>
    </div>
  )
}
