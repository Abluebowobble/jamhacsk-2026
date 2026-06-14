import { Hero } from '../components/sections/Hero'
import { Stakes } from '../components/sections/Stakes'
import { How } from '../components/sections/How'
import { Features } from '../components/sections/Features'
import { Trust } from '../components/sections/Trust'
import { Showcase } from '../components/sections/Showcase'
import { Faq } from '../components/sections/Faq'
import { GetStarted } from '../components/sections/GetStarted'

export function Landing() {
  return (
    <>
      <Hero />
      <Stakes />
      <How />
      <Features />
      <Trust />
      <Showcase />
      <Faq />
      <GetStarted />
    </>
  )
}
