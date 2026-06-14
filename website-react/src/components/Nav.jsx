import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cx } from '../lib/cx'
import { scrollToId } from '../lib/scroll'
import { BrandMark } from './BrandMark'
import { Button } from './ui'
import { Menu, X, ArrowRight } from '../lib/icons'

const LINKS = [
  { id: 'how', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'trust', label: 'Local-first' },
  { id: 'faq', label: 'FAQ' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const onLanding = location.pathname === '/'

  // Sticky-nav shadow once scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scrollspy — highlight the section currently in view (landing only).
  useEffect(() => {
    if (!onLanding) return
    const targets = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
    if (!targets.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    targets.forEach((t) => obs.observe(t))
    return () => obs.disconnect()
  }, [onLanding])

  // Close drawer on Escape / wide resize.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onResize = () => window.innerWidth > 860 && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const go = useCallback(
    (id) => (e) => {
      e.preventDefault()
      setOpen(false)
      if (onLanding && scrollToId(id)) {
        history.replaceState(null, '', `/#${id}`)
      } else {
        navigate(`/#${id}`)
      }
    },
    [onLanding, navigate],
  )

  return (
    <>
      <header
        className={cx(
          'fixed top-0 inset-x-0 z-[1250] h-[64px] transition-[background-color,box-shadow,border-color] duration-300',
          scrolled
            ? 'bg-bg/80 backdrop-blur-md border-b border-border shadow-[0_1px_0_oklch(0.9_0.01_65)]'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <div className="w-full mx-auto max-w-[1140px] h-full px-[clamp(20px,5vw,40px)] flex items-center justify-between">
          <BrandMark />

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {LINKS.map((l) => (
              <a
                key={l.id}
                href={`/#${l.id}`}
                onClick={go(l.id)}
                aria-current={active === l.id ? 'true' : undefined}
                className={cx(
                  'px-3 py-2 rounded-md text-[0.9375rem] font-medium transition-colors duration-150',
                  active === l.id
                    ? 'text-primary'
                    : 'text-ink-body hover:text-ink hover:bg-primary-subtle/60',
                )}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/#get-started"
              onClick={go('get-started')}
              className="hidden sm:inline-flex"
            >
              <Button variant="primary">
                Get started
                <ArrowRight className="!w-[16px] !h-[16px] transition-transform duration-200 group-hover:translate-x-[3px]" />
              </Button>
            </a>
            <button
              className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-md text-ink hover:bg-primary-subtle [&_svg]:w-6 [&_svg]:h-6"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cx(
          'fixed inset-0 z-[1200] md:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
        <nav
          className={cx(
            'absolute top-[64px] inset-x-3 rounded-xl border border-border bg-surface shadow-modal p-3',
            'flex flex-col gap-1 origin-top transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
            open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
          )}
          aria-label="Mobile"
        >
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`/#${l.id}`}
              onClick={go(l.id)}
              className="px-4 py-3 rounded-md text-base font-medium text-ink-body hover:bg-primary-subtle hover:text-primary"
            >
              {l.label}
            </a>
          ))}
          <a href="/#get-started" onClick={go('get-started')} className="mt-1">
            <Button variant="primary" block>Get started</Button>
          </a>
        </nav>
      </div>
    </>
  )
}
