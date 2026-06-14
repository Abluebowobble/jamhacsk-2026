import { Container, Section, Button, Eyebrow } from '../ui'
import { Reveal } from '../../lib/motion'
import { scrollToId } from '../../lib/scroll'
import { ArrowRight } from '../../lib/icons'

export function GetStarted() {
  return (
    <Section id="get-started">
      <Container>
        <Reveal y={28} className="relative overflow-hidden rounded-2xl border border-primary-border bg-primary-subtle/40 grid-bg px-6 py-[clamp(48px,7vw,88px)] text-center">
          <span className="aurora opacity-80" aria-hidden />
          <div className="relative mx-auto max-w-[60ch]">
            <Eyebrow className="justify-center">Get started</Eyebrow>
            <h2 className="text-[length:var(--text-5xl)] font-semibold tracking-[-0.025em]">Bring Hestia home.</h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-lg leading-[1.6] text-ink-muted">
              Set up your first device in minutes. Pair it, add your household, and let the kitchen watch itself.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button to="/download" size="lg">
                Get started
                <ArrowRight className="!w-[18px] !h-[18px] transition-transform duration-200 group-hover:translate-x-[3px]" />
              </Button>
              <Button href="/#how" size="lg" variant="secondary" onClick={(e) => { e.preventDefault(); scrollToId('how') }}>
                See how it works
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
