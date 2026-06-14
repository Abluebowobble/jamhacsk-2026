import { useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { MicroLabel } from './ui'
import { scrollToId } from '../lib/scroll'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', id: 'how' },
      { label: 'Features', id: 'features' },
      { label: 'Local-first', id: 'trust' },
      { label: 'The app', id: 'showcase' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'FAQ', id: 'faq' },
      { label: 'Get started', to: '/download' },
      { label: 'Contact', id: 'get-started' },
    ],
  },
  {
    title: 'Safety',
    links: [
      { label: 'The safety loop', id: 'how' },
      { label: 'Privacy', id: 'trust' },
      { label: 'Reliability', id: 'faq' },
    ],
  },
]

export function Footer() {
  const location = useLocation()
  const navigate = useNavigate()
  const onLanding = location.pathname === '/'

  const go = useCallback(
    (id) => (e) => {
      e.preventDefault()
      if (onLanding && scrollToId(id)) history.replaceState(null, '', `/#${id}`)
      else navigate(`/#${id}`)
    },
    [onLanding, navigate],
  )

  return (
    <footer className="border-t border-border bg-surface-sunken">
      <div className="w-full mx-auto max-w-[1140px] px-[clamp(20px,5vw,40px)] py-[clamp(48px,6vw,72px)]">
        <div className="grid gap-x-8 gap-y-10 grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1 max-w-[34ch]">
            <BrandMark />
            <p className="mt-4 text-base text-ink-muted leading-[1.6]">
              A safety instrument for the kitchen. The stove watches itself — and the decision that matters runs on the device, not the cloud.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-ink-faint mb-4">{col.title}</p>
              <ul className="flex flex-col gap-[10px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-base text-ink-body hover:text-primary transition-colors">
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={`/#${l.id}`}
                        onClick={go(l.id)}
                        className="text-base text-ink-body hover:text-primary transition-colors"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">© 2026 Hestia.</span>
          <MicroLabel>Local-first stove safety</MicroLabel>
        </div>
      </div>
    </footer>
  )
}
