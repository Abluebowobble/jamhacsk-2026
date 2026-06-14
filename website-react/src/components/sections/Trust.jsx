import { Container, Section, Eyebrow, Pill, MicroLabel } from '../ui'
import { Reveal, Stagger, StaggerItem } from '../../lib/motion'
import { Check, ShieldCheck, Cpu, Cloud } from '../../lib/icons'

const POINTS = [
  { label: 'Works if the internet drops.', text: 'The stove still shuts off. Connectivity changes what you can see, never whether you’re safe.' },
  { label: 'No kitchen cameras.', text: 'Presence is sensed locally; nothing streams your kitchen to a server.' },
  { label: 'Your home, your data.', text: 'Status and history stay with your household.' },
]

export function Trust() {
  return (
    <Section id="trust" ruled>
      <Container className="grid items-center gap-[clamp(40px,5vw,80px)] lg:grid-cols-2">
        {/* Copy */}
        <div>
          <Reveal><Eyebrow>Local-first by design</Eyebrow></Reveal>
          <Reveal delay={0.05} as="h2" className="text-4xl tracking-[-0.02em]">
            The decision that matters never waits on Wi-Fi.
          </Reveal>
          <Reveal delay={0.12} as="p" className="mt-[18px] text-lg leading-[1.6] text-ink-muted max-w-[52ch]">
            The safety loop — detect, warn, shut off — runs entirely on the device in your kitchen.
            The app is the window onto it, not the brain behind it.
          </Reveal>

          <Stagger as="ul" className="mt-8 flex flex-col gap-4">
            {POINTS.map((p) => (
              <StaggerItem as="li" key={p.label} className="flex gap-3">
                <span className="mt-0.5 inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-success-subtle text-success-fg border border-success-border [&_svg]:w-[14px] [&_svg]:h-[14px]">
                  <Check />
                </span>
                <p className="text-base text-ink-body leading-[1.55]">
                  <strong className="font-semibold text-ink">{p.label}</strong> {p.text}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Diagram */}
        <Reveal delay={0.1} className="lg:justify-self-end w-full max-w-[440px]">
          <div className="rounded-2xl border border-border bg-surface shadow-card-hover p-6 sm:p-7" role="group" aria-label="Where the safety decision is made: on the device, locally">
            {/* Device — where the decision lives */}
            <div className="flex items-center gap-4 rounded-xl border border-primary-border bg-primary-subtle/50 p-4">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-surface text-primary border border-primary-border [&_svg]:w-[24px] [&_svg]:h-[24px]">
                <Cpu />
              </span>
              <div className="flex-1">
                <MicroLabel>Hestia device</MicroLabel>
                <p className="text-base font-semibold text-ink">In your kitchen</p>
              </div>
              <Pill variant="success"><ShieldCheck />Decision: local</Pill>
            </div>

            {/* Connector */}
            <div className="relative my-3 ml-6 h-12" aria-hidden>
              <svg className="absolute left-0 top-0 h-full w-px overflow-visible" viewBox="0 0 2 48" preserveAspectRatio="none">
                <line x1="1" y1="0" x2="1" y2="48" stroke="var(--color-border-strong)" strokeWidth="2" strokeDasharray="4 5" className="flow-dash" />
              </svg>
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs text-ink-faint">optional · for remote viewing only</span>
            </div>

            {/* Cloud — de-emphasized */}
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-surface-sunken p-4 opacity-80">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-surface text-ink-faint border border-border [&_svg]:w-[24px] [&_svg]:h-[24px]">
                <Cloud />
              </span>
              <div>
                <p className="text-base font-semibold text-ink-muted">Cloud</p>
                <p className="text-sm text-ink-faint">Optional · not in the safety loop</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-muted leading-[1.5]">
            The safety decision is made on the device. The cloud only lets you watch from afar — it is never in the loop that keeps you safe.
          </p>
        </Reveal>
      </Container>
    </Section>
  )
}
