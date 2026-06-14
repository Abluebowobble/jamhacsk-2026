import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useInView, useMotionValue, animate, useTransform } from 'motion/react'

// Premium ease — exponential ease-out. No bounce.
export const EASE = [0.22, 1, 0.36, 1]

/**
 * Becomes true when the element scrolls into view (once), OR after a safety
 * timeout — so content is NEVER permanently gated on a reveal that might not
 * fire (headless renders, crawlers, background tabs). Reduced motion: instant.
 */
function useRevealShown(ref, amount, reduce) {
  const inView = useInView(ref, { once: true, amount })
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => setFallback(true), 2600)
    return () => clearTimeout(t)
  }, [reduce])
  return reduce || inView || fallback
}

/** Reveal — fade + rise on scroll into view, once. */
export function Reveal({ children, as = 'div', delay = 0, y = 18, className, amount = 0.3, ...rest }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const shown = useRevealShown(ref, amount, reduce)
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return <Tag ref={ref} className={className} {...rest}>{children}</Tag>
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Stagger — a container whose <StaggerItem> children animate in sequence.
 */
export function Stagger({ children, className, amount = 0.25, gap = 0.08, as = 'div', ...rest }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const shown = useRevealShown(ref, amount, reduce)
  const MotionTag = motion[as] || motion.div

  if (reduce) {
    const Tag = as
    return <Tag ref={ref} className={className} {...rest}>{children}</Tag>
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial="hidden"
      animate={shown ? 'show' : 'hidden'}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function StaggerItem({ children, className, as = 'div', y = 20, ...rest }) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as] || motion.div
  if (reduce) {
    const Tag = as
    return <Tag className={className} {...rest}>{children}</Tag>
  }
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/**
 * CountUp — animates a number from 0 → value when scrolled into view.
 * Reduced motion: shows the final value immediately.
 */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 1.6, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(
    reduce ? fmt(value, decimals, prefix, suffix) : fmt(0, decimals, prefix, suffix),
  )

  useEffect(() => {
    if (reduce) return
    const unsub = mv.on('change', (v) => setDisplay(fmt(v, decimals, prefix, suffix)))
    return unsub
  }, [mv, decimals, prefix, suffix, reduce])

  useEffect(() => {
    if (reduce || !inView) return
    const controls = animate(mv, value, { duration, ease: EASE })
    return controls.stop
  }, [inView, value, duration, mv, reduce])

  return <span ref={ref} className={className}>{display}</span>
}

function fmt(v, decimals, prefix, suffix) {
  return (
    prefix +
    v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
    suffix
  )
}

export { motion, useReducedMotion, useInView, useTransform }
