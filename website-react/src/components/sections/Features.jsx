import { Container, Section, IconTile } from '../ui'
import { SectionHead } from '../SectionHead'
import { Stagger, StaggerItem } from '../../lib/motion'
import { ShieldCheck, Maximize, Users, Timer, Sliders, Clock } from '../../lib/icons'

const FEATURES = [
  { icon: <ShieldCheck />, title: 'Live status at a glance', body: 'The current state of every stove — readable in half a second, from anywhere.' },
  { icon: <Maximize />, title: 'Tap to pair', body: 'Tap your phone to the device to pair it over NFC — no codes to copy.' },
  { icon: <Users />, title: 'Households & roles', body: 'Admins manage devices and members; everyone else can see status and act. Roles are legible at a glance.' },
  { icon: <Timer />, title: 'Timers & reminders', body: 'Set a cook timer and Hestia keeps watch alongside you — a reminder before the countdown starts.' },
  { icon: <Sliders />, title: 'Safety thresholds', body: 'Tune how long “unattended” is allowed before the countdown starts. Long, low-heat cooking won’t trigger a countdown.' },
  { icon: <Clock />, title: 'Event history', body: 'Every warning, return, and auto-shutoff, logged with timestamps — so you always know what happened.' },
]

export function Features() {
  return (
    <Section id="features">
      <Container>
        <SectionHead
          eyebrow="Built for the whole household"
          title="Everything you need to trust the stove."
          lead="One clear status, shared with the people who matter — and the controls to act on it."
        />

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.07}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <article className="group relative h-full overflow-hidden rounded-lg border border-border bg-surface p-6 transition-[border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-primary-border hover:shadow-card-hover">
                {/* hover sheen */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(420px circle at 30% 0%, oklch(0.72 0.15 52 / 0.08), transparent 60%)' }}
                />
                <IconTile className="relative transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  {f.icon}
                </IconTile>
                <h3 className="relative mt-5 text-lg font-semibold text-ink">{f.title}</h3>
                <p className="relative mt-2 text-base text-ink-muted leading-[1.55]">{f.body}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
