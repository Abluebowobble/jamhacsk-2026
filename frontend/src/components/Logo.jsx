import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'

export function Logo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      aria-label="Hestia — home"
    >
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-fg">
        <Flame className="size-5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-[-0.01em] text-ink">Hestia</span>
    </Link>
  )
}
