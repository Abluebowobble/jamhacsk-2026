// Smooth-scroll to an in-page section, accounting for the sticky nav height.
// Uses Lenis when present (smooth-scroll engine), else native scroll.
export function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return false
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const offset = -(64 + 12)
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset, immediate: reduce })
    return true
  }
  const top = el.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  return true
}
