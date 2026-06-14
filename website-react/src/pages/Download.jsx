import { useEffect, useMemo } from 'react'
import { Container, Section, Button, Eyebrow } from '../components/ui'
import { SectionHead } from '../components/SectionHead'
import { Reveal, Stagger, StaggerItem } from '../lib/motion'
import { Flame, ExternalLink, Check, Share, Info } from '../lib/icons'

const APP_BASE = 'https://app.hestia.my'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function Download() {
  // If a device was tapped (NFC carries ?device_id=…), send the visitor straight
  // into pairing. Otherwise open the app's home.
  const openUrl = useMemo(() => {
    if (typeof window === 'undefined') return APP_BASE
    const id = (new URLSearchParams(window.location.search).get('device_id') || '').trim()
    return UUID_RE.test(id) ? `${APP_BASE}/pair?device_id=${encodeURIComponent(id)}` : APP_BASE
  }, [])

  // If Hestia is already installed and reopened from the home screen, skip the
  // marketing page and go straight to the app.
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) window.location.replace(openUrl)
  }, [openUrl])

  return (
    <div className="text-[1.0625rem]">
      {/* Hero — one calm, obvious action */}
      <Section id="get" className="grid-bg text-center overflow-hidden pt-[calc(64px+clamp(32px,6vw,72px))]">
        <span className="aurora" aria-hidden />
        <Container className="max-w-[640px]">
          <Reveal className="mx-auto mb-7 grid place-items-center w-[76px] h-[76px] rounded-xl bg-primary-subtle text-primary border border-primary-border [&_svg]:w-[40px] [&_svg]:h-[40px]">
            <Flame />
          </Reveal>
          <Reveal delay={0.05} as="h1" className="text-[length:var(--text-5xl)] font-semibold tracking-[-0.025em]">
            Get the Hestia app
          </Reveal>
          <Reveal delay={0.12} as="p" className="mx-auto mt-[18px] max-w-[34ch] text-xl leading-[1.5] text-ink-body text-balance">
            Tap the button below to open Hestia. You'll always get the newest version.
          </Reveal>

          <Reveal delay={0.18}>
            <a href={openUrl}>
              <Button size="lg" className="mt-9 min-h-[64px] px-[38px] text-[1.25rem] rounded-lg shadow-card-hover [&_svg]:w-[22px] [&_svg]:h-[22px]">
                Open Hestia
                <ExternalLink />
              </Button>
            </a>
          </Reveal>

          <Reveal delay={0.24} as="p" className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-[18px] gap-y-2 text-base text-ink-muted">
            {['Free to start', 'No app store', 'Always up to date'].map((t) => (
              <span key={t} className="inline-flex items-center gap-[7px] [&_svg]:w-[17px] [&_svg]:h-[17px] [&_svg]:text-success">
                <Check />{t}
              </span>
            ))}
          </Reveal>
        </Container>
      </Section>

      {/* Install steps */}
      <Section id="install" ruled>
        <Container>
          <SectionHead
            title="Open Hestia, then add it to your home screen"
            lead="Add Hestia to your home screen and it opens just like any other app — three taps, on your phone or tablet."
          />

          <div className="mx-auto max-w-[600px]">
            <Stagger as="ol" className="grid gap-3.5" gap={0.1}>
              <Step n="1">
                Tap the orange <strong className="font-semibold text-ink">Open Hestia</strong> button above. It opens in your web browser.
              </Step>
              <Step n="2">
                Press the <strong className="font-semibold text-ink">Share</strong> button
                <Glyph><Share /></Glyph>.
              </Step>
              <Step n="3">
                Choose <strong className="font-semibold text-ink">Add to Home Screen</strong>. Hestia now sits on your home screen, like any other app.
              </Step>
            </Stagger>

            <p className="mt-6 flex items-start gap-3 text-base text-ink-muted [&_svg]:w-[19px] [&_svg]:h-[19px] [&_svg]:shrink-0 [&_svg]:mt-0.5">
              <Info />
              The Share button is the square with an arrow pointing up — at the bottom of the screen on an iPhone, or in the menu on Android.
            </p>
          </div>
        </Container>
      </Section>

      {/* Gentle close */}
      <Section id="help" ruled className="text-center">
        <Container narrow>
          <Reveal as="h2" className="text-2xl">Stuck, or not sure?</Reveal>
          <Reveal delay={0.06} as="p" className="mx-auto mt-3.5 max-w-[46ch] text-lg text-ink-body leading-[1.55]">
            Installing is optional — you can always just tap <strong className="font-semibold text-ink">Open Hestia</strong> and use it in your browser.
            If you'd like a hand, ask a family member, or read the common questions.
          </Reveal>
          <Reveal delay={0.12} className="mt-7 flex flex-wrap justify-center gap-3">
            <a href={openUrl}><Button size="lg">Open Hestia</Button></a>
            <Button to="/#faq" size="lg" variant="secondary">Read the FAQ</Button>
          </Reveal>
        </Container>
      </Section>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <StaggerItem as="li" className="flex items-start gap-[18px] rounded-lg border border-border bg-surface p-[22px_24px]">
      <span className="grid place-items-center shrink-0 w-11 h-11 rounded-full bg-primary text-primary-fg font-mono font-semibold text-lg leading-none">
        {n}
      </span>
      <p className="text-lg leading-[1.5] text-ink-body pt-[9px]">{children}</p>
    </StaggerItem>
  )
}

function Glyph({ children }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 align-middle mx-[3px] rounded-sm bg-surface-sunken border border-border text-ink [&_svg]:w-[15px] [&_svg]:h-[15px]">
      {children}
    </span>
  )
}
