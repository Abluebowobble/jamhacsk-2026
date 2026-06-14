import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Container, Section } from '../ui'
import { SectionHead } from '../SectionHead'
import { Reveal, EASE } from '../../lib/motion'
import { Plus } from '../../lib/icons'

const ITEMS = [
  { q: 'What happens if the internet goes down?', a: 'Nothing changes about your safety. Detection, the warning, and the auto-shutoff all run on the device in your kitchen. You may lose remote visibility until you reconnect, but the stove still turns itself off.' },
  { q: 'Does it work with my stove?', a: 'Hestia is designed for common gas and electric ranges. It watches the burner and controls power to the stove; setup walks you through your model.' },
  { q: 'Is there a camera in my kitchen?', a: 'No. Hestia senses whether someone is present without streaming video anywhere. Presence is detected locally and never leaves your home.' },
  { q: 'Who in my house can control it?', a: 'Households have admins and members. Admins manage devices, members, and thresholds; everyone can see live status and respond. Roles are clear at a glance.' },
  { q: "What if I'm cooking low and slow?", a: 'Set the thresholds and a timer. "Unattended" only starts the clock after the window you choose — a simmer that needs an hour is no problem.' },
  { q: 'How fast does it react?', a: "The moment a lit stove is left unattended, the countdown you've configured begins. If presence returns, it resets instantly. If it reaches zero, the stove shuts off." },
]

export function Faq() {
  const [open, setOpen] = useState(0)
  const reduce = useReducedMotion()

  return (
    <Section id="faq" ruled>
      <Container narrow>
        <SectionHead title="Frequently asked questions" />

        <Reveal className="flex flex-col gap-3">
          {ITEMS.map((item, i) => {
            const isOpen = open === i
            const panelId = `faq-panel-${i}`
            const btnId = `faq-trigger-${i}`
            return (
              <div key={i} className="rounded-xl border border-border bg-surface overflow-hidden">
                <h3>
                  <button
                    id={btnId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-lg font-semibold text-ink">{item.q}</span>
                    <span
                      aria-hidden
                      className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full border border-border text-primary transition-transform duration-300 [&_svg]:w-[18px] [&_svg]:h-[18px]"
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                    >
                      <Plus />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 pt-0 text-base text-ink-muted leading-[1.6]">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </Reveal>
      </Container>
    </Section>
  )
}
