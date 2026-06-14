import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { scrollToId } from './lib/scroll'

gsap.registerPlugin(ScrollTrigger)

export function App() {
  const location = useLocation()

  // Lenis smooth-scroll, wired into the GSAP ticker so ScrollTrigger stays in sync.
  // Skipped entirely under reduced-motion.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true })
    window.__lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const onRaf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(onRaf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(onRaf)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  // Scroll to hash target on navigation, or to top on a fresh page.
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1)
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(id)))
    } else {
      if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true })
      else window.scrollTo({ top: 0, behavior: 'auto' })
    }
    // Recalculate pinned triggers after layout settles.
    const t = setTimeout(() => ScrollTrigger.refresh(), 200)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  return (
    <>
      <Nav />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
