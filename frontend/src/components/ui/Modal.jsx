import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cx } from '../../lib/cx'

// Native <dialog> — escapes stacking contexts, traps focus, Escape-closes for
// free. Reserved for destructive confirms; prefer inline UI elsewhere.
export function Modal({ open, onClose, title, description, children, className }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose?.()
      }}
      aria-labelledby="modal-title"
      className={cx(
        'm-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0',
        'shadow-modal backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 p-5 pb-0">
        <div>
          <h2 id="modal-title" className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-ink-body">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
