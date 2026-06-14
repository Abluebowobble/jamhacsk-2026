import { cx } from '../../lib/cx'
import { Container, Section, Pill, MicroLabel } from '../ui'
import { SectionHead } from '../SectionHead'
import { Stagger, StaggerItem } from '../../lib/motion'
import { Flame, Wifi, UserCheck, UserX, ShieldCheck, ShieldAlert, AlertTriangle, Power } from '../../lib/icons'

const BADGE = {
  primary: 'bg-primary-subtle text-primary border-primary-border',
  success: 'bg-success-subtle text-success-fg border-success-border',
  neutral: 'bg-neutral-subtle text-ink-muted border-border',
}
const VALUE = { primary: 'text-primary', success: 'text-success-fg', muted: 'text-ink-muted' }

const CARDS = [
  {
    caption: 'Attended', warn: false,
    stove: { tint: 'primary', val: 'primary', icon: <Flame />, value: 'On' },
    presence: { tint: 'success', val: 'success', icon: <UserCheck />, value: 'Detected' },
    footer: <Pill variant="success"><ShieldCheck />Attended — all clear</Pill>,
  },
  {
    caption: 'Unattended', warn: false,
    stove: { tint: 'primary', val: 'primary', icon: <Flame />, value: 'On' },
    presence: { tint: 'neutral', val: 'muted', icon: <UserX />, value: 'Not detected' },
    footer: <Pill variant="primary"><UserX />Unattended — watching</Pill>,
  },
  {
    caption: 'Warning', warn: true,
    stove: { tint: 'primary', val: 'primary', icon: <Flame />, value: 'On' },
    presence: { tint: 'neutral', val: 'muted', icon: <UserX />, value: 'Not detected' },
    footer: <Pill variant="warn"><AlertTriangle />Warning · <span className="mono">18s</span></Pill>,
  },
  {
    caption: 'Auto-shutoff', warn: false,
    stove: { tint: 'neutral', val: 'muted', icon: <Power />, value: 'Off' },
    presence: { tint: 'neutral', val: 'muted', icon: <UserX />, value: 'Not detected' },
    footer: <Pill variant="danger"><ShieldAlert />Auto-shutoff</Pill>,
  },
]

export function Showcase() {
  return (
    <Section id="showcase" ruled>
      <Container>
        <SectionHead
          eyebrow="The app"
          title="One status. The whole household, on the same page."
          lead="The same calm card whether everything's fine or the stove just shut itself off. Color, icon, and words always agree — so there's no second-guessing under stress."
        />

        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
          {CARDS.map((c) => (
            <StaggerItem key={c.caption}>
              <MicroLabel className="block mb-2.5">{c.caption}</MicroLabel>
              <article
                className={cx(
                  'rounded-lg border bg-surface p-5 transition-transform duration-300 hover:-translate-y-1',
                  c.warn ? 'border-warn-border hestia-pulse-warn' : 'border-border',
                )}
                aria-label={`Kitchen Stove — ${c.caption}`}
              >
                <header className="flex items-center justify-between">
                  <span className="text-base font-semibold text-ink">Kitchen Stove</span>
                  <Pill variant="success"><Wifi />Online</Pill>
                </header>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[c.stove, c.presence].map((t, i) => (
                    <div key={i} className="rounded-md border border-border bg-surface-sunken p-3">
                      <MicroLabel>{i === 0 ? 'Stove' : 'Presence'}</MicroLabel>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cx('inline-flex items-center justify-center w-7 h-7 rounded border [&_svg]:w-[15px] [&_svg]:h-[15px]', BADGE[t.tint])}>
                          {t.icon}
                        </span>
                        <span className={cx('text-base font-semibold', VALUE[t.val])}>{t.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="mt-4">{c.footer}</footer>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
