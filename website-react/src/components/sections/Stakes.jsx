import { Container, Section, Eyebrow } from '../ui'
import { Reveal, Stagger, StaggerItem, CountUp } from '../../lib/motion'

const STATS = [
  {
    figure: <><CountUp value={49} suffix="%" /></>,
    sr: '49 percent. ',
    caption: 'Cooking equipment is involved in about half of all reported home fires.',
    source: 'NFPA, Home Cooking Fires report (data 2017–2021)',
  },
  {
    figure: '#1',
    caption: 'Cooking is the leading cause of home-fire injuries in the United States.',
    source: 'U.S. Fire Administration and NFPA (data 2017–2021)',
  },
  {
    figure: <><CountUp value={37} suffix="%" /></>,
    sr: '37 percent. ',
    caption: 'Unattended equipment is the leading factor contributing to ignition in nonconfined home cooking fires.',
    source: 'U.S. Fire Administration, citing NFPA (2021)',
  },
]

export function Stakes() {
  return (
    <Section id="stakes" ruled>
      <Container className="grid gap-[clamp(36px,5vw,72px)] lg:grid-cols-[0.85fr_1.15fr]">
        <div className="max-w-[42ch]">
          <Reveal><Eyebrow>Why it matters</Eyebrow></Reveal>
          <Reveal delay={0.05} as="h2" className="text-4xl tracking-[-0.02em]">
            Cooking is the leading cause of home fires.
          </Reveal>
          <Reveal delay={0.12} as="p" className="mt-[18px] text-lg leading-[1.6] text-ink-muted">
            Most start the same way — a burner left on while someone steps away "just for a minute."
            Hestia is built for that minute.
          </Reveal>
        </div>

        <Stagger as="dl" className="grid gap-px bg-border rounded-xl overflow-hidden border border-border">
          {STATS.map((s, i) => (
            <StaggerItem key={i} className="bg-surface p-6 sm:p-7 flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-7">
              <dt className="text-[clamp(2.6rem,1.5rem+3vw,3.6rem)] font-semibold leading-none tracking-[-0.03em] text-primary tabular-nums shrink-0 sm:w-[3.4em]">
                {s.sr && <span className="sr-only">{s.sr}</span>}
                {s.figure}
              </dt>
              <dd>
                <p className="text-base text-ink leading-[1.5]">{s.caption}</p>
                <p className="mt-2 text-sm text-ink-faint">{s.source}</p>
              </dd>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
