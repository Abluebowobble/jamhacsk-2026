# Product

## Register

product

## Users

People keeping a household's stove safe — and the people they're protecting.

- **Primary:** homeowners and families, especially those with children, elderly, or forgetful members. Often non-technical. They glance at the app to confirm "is the stove fine right now?" and act fast when it isn't.
- **Shared households:** multiple members on one device. Admins manage; members operate. Roles must be legible at a glance.
- **Secondary:** caregivers, landlords, renters in shared housing who want visibility, not control.

Context of use: a phone (PWA) checked in passing — in the kitchen, on the couch, or away from home. The high-stakes moments are interruptive (a buzzer fired, a stove auto-shut-off) and arrive as notifications. The app must be readable in a half-second and unambiguous under stress.

## Product Purpose

Hestia is a smart stove-safety system: a Raspberry Pi device watches the stove, and a PWA gives the household remote visibility and control. It detects when a lit stove is unattended, warns, and automatically shuts the stove off if no one returns. The app surfaces live status, lets users pair devices (NFC), manage households and roles, set timers, configure safety thresholds, and review an event history.

Success: a user completes signup → pairing → live monitoring without help, trusts the status they see, and acts correctly the instant a safety event arrives. The critical safety loop runs locally on the Pi; the app is the trustworthy window onto it.

## Brand Personality

Calm, precise, dependable. A safety instrument, not a gadget.

Three words: **vigilant, clear, reassuring.** Voice is plain and direct — it states facts and consequences ("Stove turned off automatically — no one was nearby"), never cute, never alarmist beyond what the situation warrants. Confidence comes from legibility, not decoration. The interface should feel like equipment you'd trust with your home.

## Anti-references

- **Consumer smart-home cute:** playful blobs, mascots, pastel gradients, bouncy motion. Safety is the job; whimsy undercuts trust.
- **Alarm-everything dashboards:** red/amber by default, flashing badges, urgency where none exists. Reserve alarm color for genuine danger or the readout that warns means nothing.
- **Generic SaaS-cream landing aesthetics:** warm beige/parchment body, hero-metric template, tracked uppercase eyebrows on every section. This is an instrument, not a marketing page.
- **Cloud-first theatrics:** anything implying the safety decision waits on the network. The product's promise is local-first reliability.

## Design Principles

1. **Status is the product.** The current safety state — and what the system will do next — is always the most legible thing on screen. Everything else is secondary.
2. **Alarm color is earned.** Blue/green is the resting world. Amber and red appear only for real warning and danger, so when they appear they mean something.
3. **Readable under stress in half a second.** Plain language, strong contrast, unambiguous state. The half-second test governs every safety surface.
4. **Calm by default, decisive in the moment.** Quiet and low-stimulation when all is well; sharp, focused, and action-forward when a safety event fires.
5. **Earned familiarity over novelty.** Standard, trustworthy affordances. The instrument disappears into the task.

## Accessibility & Inclusion

- Target **WCAG 2.1 AA.** Body text ≥4.5:1; large/secondary text and UI affordances ≥3:1. Verified against the light surface.
- **Never encode safety state by color alone.** Every status pairs color with an icon and a text label (online/offline, on/off, safe/warning/danger). Critical for colorblind users and the half-second glance.
- **Reduced motion respected.** The warning pulse and any transition degrade to instant/crossfade under `prefers-reduced-motion`. No information lives only in motion.
- Touch targets ≥44px (phone-first PWA). Buzzer/shutoff actions are reachable one-handed.
- Older primary users: generous type sizing, high contrast, no reliance on fine motor precision or subtle hover-only affordances.
