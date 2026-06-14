import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'
import { Container, Button, Pill, MicroLabel } from '../ui'
import { EASE } from '../../lib/motion'
import { scrollToId } from '../../lib/scroll'
import { Flame, Wifi, UserCheck, ShieldCheck, Check, ArrowRight } from '../../lib/icons'

const TRUST = ['Local-first safety', 'Works if the Wi-Fi drops', 'No kitchen cameras']

export function Hero() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const panelY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70])
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 40])

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  }
  const item = reduce
    ? {}
    : {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }

  return (
    <section id="hero" ref={ref} className="grid-bg relative pt-[calc(64px+clamp(40px,7vw,90px))] pb-[clamp(60px,9vw,120px)] overflow-hidden">
      <span className="aurora" aria-hidden />
      <Container className="grid items-center gap-[clamp(40px,5vw,72px)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <motion.div style={{ y: copyY }} variants={container} initial="hidden" animate="show">
          <motion.p variants={item} className="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-5 before:content-[''] before:w-[7px] before:h-[7px] before:rounded-full before:bg-primary">
            Smart stove safety
          </motion.p>

          <motion.h1 variants={item} className="text-[length:var(--text-6xl)] font-semibold leading-[1.04] tracking-[-0.03em] text-balance">
            The stove that{' '}
            <span className="relative whitespace-nowrap text-primary">
              watches itself
              <svg className="absolute -bottom-2 left-0 w-full h-[0.4em] text-primary/35" viewBox="0 0 300 18" fill="none" preserveAspectRatio="none" aria-hidden>
                <motion.path
                  d="M2 13C60 4 130 4 180 8C220 11 270 12 298 6"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={reduce ? false : { pathLength: 1 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
                />
              </svg>
            </span>
            .
          </motion.h1>

          <motion.p variants={item} className="mt-6 text-lg leading-[1.6] text-ink-muted max-w-[54ch]">
            Hestia keeps an eye on every burner. When a lit stove is left unattended it sounds a warning —
            and if no one comes back, it shuts the stove off automatically. The decision runs on the device,
            not the cloud.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <Button to="/download" size="lg">
              Get started
              <ArrowRight className="!w-[18px] !h-[18px] transition-transform duration-200 group-hover:translate-x-[3px]" />
            </Button>
            <Button href="/#how" size="lg" variant="secondary"
              onClick={(e) => { e.preventDefault(); scrollToId('how') }}>
              See how it works
            </Button>
          </motion.div>

          <motion.ul variants={item} className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2 text-sm font-medium text-ink-body [&_svg]:w-[16px] [&_svg]:h-[16px] [&_svg]:text-success">
                <Check />
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Instrument panel */}
        <motion.div
          style={{ y: panelY }}
          initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
          animate={reduce ? false : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="justify-self-center w-full max-w-[420px]"
        >
          <StatusPanel reduce={reduce} />
        </motion.div>
      </Container>
    </section>
  )
}

function StatusPanel({ reduce }) {
  return (
    <div
      role="img"
      aria-label="Live device status: Kitchen Stove is online, stove on, presence detected — attended, all clear."
      className="relative rounded-2xl border border-border bg-surface/90 backdrop-blur-sm shadow-float p-5 sm:p-6"
    >
      {/* floating accent */}
      <motion.div
        aria-hidden
        className="absolute -top-3 -right-3 w-16 h-16 rounded-2xl bg-primary-subtle border border-primary-border -z-10"
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="flex items-start justify-between">
        <div>
          <MicroLabel>Device</MicroLabel>
          <p className="mt-1 text-lg font-semibold text-ink">Kitchen Stove</p>
        </div>
        <Pill variant="success"><Wifi />Online</Pill>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Tile label="Stove" tint="primary" icon={<Flame />} value="On" />
        <Tile label="Presence" tint="success" icon={<UserCheck />} value="Detected" />
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Pill variant="success" className="w-full justify-center py-2"><ShieldCheck />Attended — all clear</Pill>
      </div>
    </div>
  )
}

function Tile({ label, icon, value, tint }) {
  const tintMap = {
    primary: 'bg-primary-subtle text-primary border-primary-border',
    success: 'bg-success-subtle text-success-fg border-success-border',
  }
  return (
    <div className="rounded-lg border border-border bg-surface-sunken p-3.5">
      <MicroLabel>{label}</MicroLabel>
      <div className="mt-2.5 flex items-center gap-2.5">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md border [&_svg]:w-[18px] [&_svg]:h-[18px] ${tintMap[tint]}`}>
          {icon}
        </span>
        <span className="text-xl font-semibold text-ink">{value}</span>
      </div>
    </div>
  )
}
