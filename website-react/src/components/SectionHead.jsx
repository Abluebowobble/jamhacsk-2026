import { cx } from '../lib/cx'
import { Eyebrow } from './ui'
import { Reveal } from '../lib/motion'

/** Eyebrow + title + lead, with staged reveal. Centered variant available. */
export function SectionHead({ eyebrow, title, lead, center = true, className }) {
  return (
    <div
      className={cx(
        'mb-[clamp(36px,5vw,56px)] max-w-[60ch]',
        center && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow className={center ? 'justify-center' : undefined}>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      {title && (
        <Reveal delay={0.05} as="h2" className="text-4xl tracking-[-0.02em] text-balance">
          {title}
        </Reveal>
      )}
      {lead && (
        <Reveal delay={0.12} as="p" className={cx('mt-[18px] text-lg leading-[1.6] text-ink-muted max-w-[60ch]', center && 'mx-auto')}>
          {lead}
        </Reveal>
      )}
    </div>
  )
}
