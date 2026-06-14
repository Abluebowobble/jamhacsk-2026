import { useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Container, Section, Pill } from '../ui'
import { SectionHead } from '../SectionHead'
import { Reveal } from '../../lib/motion'
import { Maximize, Bell, Power, Play, RotateCcw } from '../../lib/icons'

const DURATION = 10
const R = 104
const CIRC = 2 * Math.PI * R

const STEPS = [
  { n: 1, title: 'Detect', icon: <Maximize />, text: 'Sensors watch the burner and the room — is the stove lit, and is anyone near it?' },
  { n: 2, title: 'Warn', icon: <Bell />, text: 'If a lit stove is left unattended, the buzzer sounds and an absence countdown begins.' },
  { n: 3, title: 'Shut off', icon: <Power />, text: 'If no one returns before the countdown ends, Hestia cuts power to the stove.' },
]

const STATE_STEP = { attended: 1, unattended: 1, warning: 2, shutoff: 3, safe: 3 }
const READOUT = { attended: 'At rest', unattended: 'Watching', warning: 'Time to act', shutoff: 'Shut off', safe: 'All clear' }
const STATUS_TEXT = {
  attended: 'Stove on. Someone is cooking.',
  unattended: 'Everyone stepped away. Hestia is watching.',
  warning: 'Unattended. The stove will shut off automatically if no one returns.',
  shutoff: 'The stove was turned off automatically.',
  safe: 'The stove is off. The kitchen is safe.',
}

function derive(p) {
  if (p < 0.16) return { state: 'attended', remaining: 1, count: `${DURATION}s` }
  if (p < 0.32) return { state: 'unattended', remaining: 1, count: `${DURATION}s` }
  if (p < 0.84) {
    const rem = 1 - (p - 0.32) / 0.52
    return { state: 'warning', remaining: rem, count: `${Math.max(0, Math.ceil(rem * DURATION))}s` }
  }
  if (p < 0.92) return { state: 'shutoff', remaining: 0, count: '0s' }
  return { state: 'safe', remaining: 0, count: 'off' }
}

const RING_COLOR = {
  attended: 'var(--color-primary)',
  unattended: 'var(--color-primary)',
  warning: 'var(--color-warn)',
  shutoff: 'var(--color-danger)',
  safe: 'var(--color-success)',
}

const PILL = {
  attended: { variant: 'success', icon: <Maximize />, label: 'Stove on · attended' },
  unattended: { variant: 'primary', icon: <Bell />, label: 'Everyone stepped away' },
  warning: { variant: 'warn', icon: <Bell />, label: 'Unattended — shutting off in' },
  shutoff: { variant: 'danger', icon: <Power />, label: 'Stove turned off automatically' },
  safe: { variant: 'success', icon: <Maximize />, label: 'Stove is off · kitchen is safe' },
}

export function How() {
  const reduce = useReducedMotion()
  const sectionRef = useRef(null)
  const pinRef = useRef(null)
  const playingRef = useRef(false)
  const [progress, setProgress] = useState(0)

  // Scroll-scrubbed pin (skipped under reduced motion).
  useLayoutEffect(() => {
    if (reduce) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: 'top 16%',
        end: '+=1500',
        pin: pinRef.current,
        pinSpacing: true,
        scrub: 0.6,
        onUpdate: (self) => {
          if (!playingRef.current) setProgress(self.progress)
        },
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [reduce])

  // Replay — run a self-contained timed pass through the loop.
  const replay = () => {
    if (playingRef.current) return
    playingRef.current = true
    if (reduce) {
      // Discrete step-through, no smooth motion.
      const marks = [0.05, 0.24, 0.5, 0.78, 0.88, 0.97]
      let i = 0
      const tick = () => {
        setProgress(marks[i])
        i += 1
        if (i < marks.length) setTimeout(tick, 900)
        else playingRef.current = false
      }
      tick()
      return
    }
    const dur = 6200
    let start = null
    const step = (ts) => {
      if (start === null) start = ts
      const t = Math.min(1, (ts - start) / dur)
      setProgress(t)
      if (t < 1) requestAnimationFrame(step)
      else playingRef.current = false
    }
    requestAnimationFrame(step)
  }

  const { state, remaining, count } = derive(progress)
  const activeStep = STATE_STEP[state]
  const pill = PILL[state]

  return (
    <Section id="how" className="grid-bg overflow-hidden" ref={sectionRef}>
      <Container>
        <SectionHead
          eyebrow="How it works"
          title="Detect. Warn. Shut off."
          lead="Three steps run continuously on the device in your kitchen. Watch the loop play out as you scroll."
        />

        <div ref={pinRef} className="grid items-center gap-[clamp(32px,5vw,64px)] lg:grid-cols-[0.9fr_1.1fr]">
          {/* Steps */}
          <ol className="flex flex-col gap-3" aria-label="The safety loop, in three steps">
            {STEPS.map((s) => {
              const active = s.n <= activeStep
              const current = s.n === activeStep
              return (
                <li
                  key={s.n}
                  className={
                    'relative flex gap-4 rounded-xl border p-4 sm:p-5 transition-all duration-300 ' +
                    (current
                      ? 'border-primary-border bg-primary-subtle/60 shadow-card-hover'
                      : active
                        ? 'border-border-strong bg-surface'
                        : 'border-border bg-surface/60 opacity-70')
                  }
                >
                  <span
                    className={
                      'inline-flex shrink-0 items-center justify-center w-11 h-11 rounded-lg border [&_svg]:w-[22px] [&_svg]:h-[22px] transition-colors duration-300 ' +
                      (active ? 'bg-primary text-primary-fg border-primary' : 'bg-surface-sunken text-ink-faint border-border')
                    }
                  >
                    {s.icon}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
                      <span className="font-mono text-sm text-ink-faint">{s.n}</span>
                      {s.title}
                    </h3>
                    <p className="mt-1 text-base text-ink-muted leading-[1.5]">{s.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>

          {/* Instrument */}
          <figure className="m-0">
            <div className="relative mx-auto max-w-[440px] rounded-2xl border border-border bg-surface/90 backdrop-blur-sm shadow-float p-6 sm:p-8">
              <span className="sr-only" aria-live="polite">{STATUS_TEXT[state]}</span>

              <div className="flex justify-center min-h-[34px]">
                <Pill variant={pill.variant}>
                  {pill.icon}
                  {pill.label}
                  {state === 'warning' && <span className="mono ml-1">{count}</span>}
                </Pill>
              </div>

              {/* Ring + readout */}
              <div className="relative mx-auto mt-6 w-[clamp(220px,60vw,280px)] aspect-square">
                <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90" role="img" aria-label="Safety-loop countdown ring">
                  <circle cx="120" cy="120" r={R} fill="none" strokeWidth="6" className="stroke-border" />
                  <circle
                    cx="120" cy="120" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
                    style={{
                      stroke: RING_COLOR[state],
                      strokeDasharray: CIRC,
                      strokeDashoffset: CIRC * (1 - remaining),
                      transition: reduce ? 'none' : 'stroke 0.4s var(--ease-out)',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold tracking-[0.06em] uppercase text-ink-muted">{READOUT[state]}</span>
                  <span className="mono tabular-nums text-[clamp(2.4rem,8vw,3.2rem)] font-semibold leading-none text-ink my-1">{count}</span>
                  <span className="text-sm text-ink-faint">on-device countdown</span>
                </div>
              </div>

              {/* Control */}
              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={replay}
                  className="group inline-flex items-center justify-center gap-2 min-h-[46px] px-[22px] rounded-md bg-primary text-primary-fg font-semibold transition-[background-color,box-shadow,transform] duration-200 hover:bg-primary-hover hover:shadow-card-hover active:translate-y-px [&_svg]:w-[18px] [&_svg]:h-[18px]"
                >
                  {progress > 0 && progress < 1 ? <RotateCcw /> : <Play />}
                  Replay the loop
                </button>
                <p className="text-sm text-ink-faint text-center max-w-[32ch]">
                  The countdown and the shutoff run on the device itself.
                </p>
              </div>
            </div>
            <Reveal as="figcaption" className="mt-4 text-center text-sm text-ink-muted">
              A live walkthrough — no stove required.
            </Reveal>
          </figure>
        </div>
      </Container>
    </Section>
  )
}
