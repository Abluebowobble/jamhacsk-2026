  # Scroll-Hero Kickoff Prompt (reusable)

A copy-paste prompt to give Claude at the **start** of a project to build a
scroll-driven landing hero using an **image-sequence canvas** (the smoothest
possible scrub) with synced animated overlay text. It bakes in the lessons
learned building Winsight's hero: detect the real stack, confirm spend, render
with hold beats, **extract the clip to PNG frames at 30fps and scrub the frames
on a canvas**, and drive crisp DOM text from scroll progress.

> **Why frames instead of a `<video>`:** scrubbing a video element seeks to the
> nearest keyframe, which is sparse — so it looks choppy. Pre-extracting every
> frame to an image and drawing the exact frame per scroll position is
> frame-perfect and smooth, with no seeking or buffering.

**How to use:** fill in the `WEBSITE DETAILS` block, then paste the whole fenced
block below to Claude.

---

```text
Build a scroll-driven hero for my landing page using an IMAGE SEQUENCE on a
canvas (NOT a scrubbed <video> element).

============================================================
WEBSITE DETAILS  (fill this in — drives copy, palette, and tone)
------------------------------------------------------------
- Product name:
- One-line description:
- Who it's for / primary user:
- Core value / the "insight" the product delivers:
- Key features or outcomes (3–5 bullets):
- Brand tone (e.g. premium/calm, energetic, playful):
- Primary CTA text + where it links:
============================================================

FIRST — before writing code or generating anything:
- Match my existing design system (colors/tokens, fonts, spacing). Read my
  global CSS/theme first and reuse those tokens in everything you make.
- Any action that spends credits or money (video generation) is billable:
  preflight the cost, tell me the number and my balance, and get my go-ahead
  before spending.

STEP 1 — STORYBOARD
Create a storyboard for a continuous, scroll-controlled hero animation:
- ~8s, 5 beats: Hook -> Discovery -> Transformation (centerpiece) -> Impact ->
  Resolution/CTA. One seamless sequence, no hard cuts.
- IMPORTANT: each beat must SETTLE AND HOLD on its final composition (its
  "resolution") for a few moments before easing into the next beat. A move ->
  settle -> hold -> continue rhythm, not constant motion.
- For each beat give: visual composition, camera move, what the user learns, the
  hold/dwell at the end, and a reserved EMPTY text-safe zone for the overlay
  sentence (see DYNAMIC TEXT ANIMATION SYSTEM below).
- Offer me 2–3 distinct creative directions to choose from before rendering.
- From the chosen storyboard, produce the SCENE TIMELINE (see section below) —
  the single source of truth that frames, dwell, AND text all derive from.
- Every scene must preserve a consistent visual identity.
- Avoid introducing entirely new environments unless they directly support the narrative.
- Transitions should feel like transformations of the same world rather than hard scene changes.
- OPTIONAL — ESTABLISH, THEN SIMPLIFY: a strong pattern is to open in a relatable, contextual
  environment (where the product lives or the problem happens) for the first beat or two, then
  progressively strip the world back into a clean, minimalist, product-forward showcase where the
  product itself becomes the hero of the frame. If you use this, the later beats should get MORE
  minimalist (less background clutter, calmer/neutral light, product centered and clearly readable),
  while the early beats stay grounded and contextual. The shift MUST read as a single continuous
  transformation — the environment defocusing and dissolving into a simplified space — and the
  product must remain the visual through-line, so it never feels like a hard cut to a new location.

STEP 1b — FRAME SOURCES (video, code-rendered, or hybrid — decide before STEP 2)
The frames the canvas scrubs do NOT have to come from a generated video. Each beat's
frames can be produced by either source, and a single hero can MIX them:
- GENERATED VIDEO: best for photoreal / organic / cinematic looks you can't easily
  draw by hand (real environments, materials, lighting, a physical product hero).
- CODE-RENDERED (real-time Canvas/WebGL, e.g. a globe, particles, charts, geometric
  or data-viz scenes): often BETTER and CHEAPER than video for abstract/data/UI-like
  looks — it's pixel-crisp, free (no credits), infinitely tunable after the fact, and
  any on-screen numbers/labels are real text instead of mushy AI-rendered glyphs.
  Generated-video models are specifically bad at clean geometry, precise dots/lines,
  and legible text — so reach for code there.
- HYBRID: render some beats live in code and source others from a generated clip,
  composited on the SAME sticky canvas. At the seam, design the two sides to MEET
  (e.g. the code scene converges/pushes into a state that matches the clip's opening
  frame) and crossfade over a short slice of scroll (~0.3–0.5s) so the join reads as
  one continuous move, not a cut. The SCENE TIMELINE below is source-agnostic: a scene
  can map its localT to a preloaded frame range OR to a live render(progress) call —
  same dwell + text machinery either way.
Pick the source(s) per beat now; STEP 2 (video) applies only to the beats you choose
to source from a generated clip.

STEP 2 — VIDEO (only for beats sourced from a generated clip)
For any beats you're sourcing from video, generate ONE continuous clip from a single
prompt (the model can't make 5 separate controllable scenes — compress those beats
into one camera move). The video prompt must:
- End each beat on a HOLD verb (holds, pauses, lingers, settles, comes to a
  brief stillness, rests) and open with "the camera moves in deliberate stages,
  settling and holding on each composition before easing into the next."
- DESIGN THE COMPOSITION FOR NEGATIVE SPACE: steer each beat toward generous
  calm, low-detail areas where the UI text will overlay. Don't hard-forbid text
  (models ignore that anyway and it fights the safe-zone goal) — instead phrase
  it as "keep broad areas clean and uncluttered for overlaid UI, avoid prominent
  rendered words or logos." No people. 16:9.
- IF the storyboard establishes a real environment and then simplifies into a
  minimalist, product-forward showcase (see "ESTABLISH, THEN SIMPLIFY" above),
  render that shift as ONE continuous move: describe the background defocusing/
  dissolving and the light neutralizing so the world "simplifies" around the
  product, rather than cutting to a separate studio shot. Keep the product
  centered and clearly readable as it becomes the hero, and let it stay the
  through-line that ties the contextual and minimalist looks together.
Download it locally (e.g. public/hero.mp4) — it's only the source for frames,
not shipped to the browser.

STEP 2b — SPLIT INTO IMAGES AT 30FPS 
Extract the clip into an image sequence at 30fps so each scroll position maps to
a precise, pre-decoded frame.
- SIZE WARNING: full-res PNGs are heavy (hundreds of MB for 240 frames). For web
  delivery, downscale to roughly display size and strongly consider JPEG/WebP to
  cut total weight 5–10×

STEP 3 — SCROLL-HERO COMPONENT (canvas image-sequence player)
Create a ScrollHero component (in my components folder, my language/framework):
- Tall outer container for scroll distance; a sticky <canvas> filling the
  viewport. Draw frames with object-cover math and account for devicePixelRatio
  so it stays crisp; redraw on resize.
- PRELOAD all frames into Image objects up front; track load progress; draw
  frame 0 as soon as it's available; 200ms opacity fade-in. (Optionally show a
  lightweight loading state until enough frames are buffered.)
- Map scroll -> frame via the SCENE TIMELINE (see below), NOT a global
  easedProgress × frameCount. Use its mapping algorithm: find the active scene,
  compute localT within that scene, apply the scene's dwell easing, then index
  into THAT scene's frame range.
- SOURCE-AGNOSTIC DRAW: a scene's "draw at localT" can either blit a preloaded
  frame image OR call a live render(localT) for code-rendered beats (see STEP 1b).
  For a HYBRID hero, composite both on this one canvas and CROSSFADE across the seam
  scene(s): draw the outgoing source, then the incoming source at rising opacity over
  a short scroll slice, so the join reads as one continuous move. Design the two sides
  to match at the seam (the code scene resolves into the clip's opening frame).
- Run a requestAnimationFrame loop that LERPS the displayed index toward the
  target (smoothing ~0.22) so it glides; only redraw when the integer index
  changes. Clean up listeners + rAF on unmount.
- DWELL PLATEAUS live in the timeline (each scene's holdFrom + scroll-span
  width) — so frames, dwell, and text all read from one source and stay locked.
  Keep holdFrom and the per-scene scroll spans easy to tune.
- Render overlay text per the DYNAMIC TEXT ANIMATION SYSTEM below.
- Honor prefers-reduced-motion: draw a single representative frame, no scrubbing,
  collapse to one static screen.

STEP 4 — INTEGRATE
Add ScrollHero as the first section of my landing page (ask whether to replace
an existing hero or prepend it). Keep nav overlaid/usable.

STEP 5 — VERIFY
Run my build/type-check, then start the dev server and tell me the URL. Call out
the tuning dials: scroll length (container height), glide smoothing, and
dwell-plateau strength. Confirm all frames load and the scrub is smooth.

============================================================
SCENE TIMELINE (SINGLE SOURCE OF TRUTH — define this first)
------------------------------------------------------------
Frames, dwell, and text MUST be driven by ONE shared scene map so they can never
desync. Do NOT map scroll straight to a global frame index — that has no concept
of scenes and causes text desync, inconsistent pacing, and "where am I in the
story?" bugs.

Build a SCENES array. Each scene owns one contiguous slice of the 0->1 scroll
range AND an explicit frame range, plus its own dwell + text timing:

  scene = {
    id,                       // "hook" | "discovery" | "transform" | ...
    scrollStart, scrollEnd,   // normalized scroll span [0..1]; scenes tile [0,1]
                              //   contiguously, no gaps or overlaps
    frameStart, frameEnd,     // frame indices this scene owns
                              //   (= storyboard scene seconds × fps)
    holdFrom,                 // 0..1 within the scene where the resolution/hold begins
    text: { content, zone }   // ONLY what can't be derived: the sentence + placement
  }                           // (text timing is derived from localT, not stored)

- frameStart/frameEnd come straight from the storyboard's scene seconds × fps.
- scrollStart/scrollEnd allocate how much SCROLL each scene gets — widen a scene's
  span to give it more dwell WITHOUT changing its frames (same frames, more
  scroll = slower). They must tile [0,1] with no gaps/overlaps.

MAPPING ALGORITHM (run every animation frame):
  1. p = global scroll progress, clamped 0..1
  2. scene = the scene whose [scrollStart, scrollEnd) contains p
  3. localT = (p - scene.scrollStart) / (scene.scrollEnd - scene.scrollStart)
  4. eased = dwell(localT, scene.holdFrom)   // slows/plateaus from holdFrom -> 1
  5. targetIndex = scene.frameStart + round(eased * (scene.frameEnd - scene.frameStart))
  6. text: derive opacity/translateY from localT ALONE via a shared envelope
     (fade in -> hold across the middle -> fade out) — no per-scene marker numbers
Then LERP the displayed index toward targetIndex (~0.22) and redraw on integer
change. Frames AND text both read from the same (scene, localT) — so they stay
locked together by construction.

EXAMPLE (8s @ 30fps = 240 frames; secs come from the storyboard beats; equal
scroll spans shown — reweight to taste):

  Scene         secs       frames    scroll span    holdFrom
  1 Hook        0.0–1.5    0–45      0.00–0.20      0.55
  2 Discovery   1.5–3.0    45–90     0.20–0.40      0.55
  3 Transform   3.0–5.0    90–150    0.40–0.65      0.60
  4 Impact      5.0–6.5    150–195   0.65–0.82      0.55
  5 Resolution  6.5–8.0    195–239   0.82–1.00      0.40

- Text timing is NOT in this table — it's derived from each scene's localT (see
  the text envelope below), so it auto-fades in early, holds across the middle/
  dwell, and fades out before the scene ends. Nothing to hand-tune per scene.
- Exception: Scene 5's sentence + CTA persist to the end (no fade-out).
- This table IS the contract: change pacing by editing scroll spans, change dwell
  by editing holdFrom — frames and text always follow together.
============================================================

============================================================
DYNAMIC TEXT ANIMATION SYSTEM (IMPORTANT)
------------------------------------------------------------
Each scene must include animated UI text that enters and exits in sync with
scroll progress.

Requirements:
- Every scene contains exactly ONE primary sentence of UI text.
- This text must be:
  - Derived directly from the WEBSITE DETAILS content
  - Written as a short, impactful product narrative statement (max 10–14 words)
  - Not decorative or generic — it must explain value, function, or insight

Scroll-Based Text Behavior (for each scene's text):
- Fade + slight vertical motion on entry (y: +20px -> 0)
- Peak visibility at mid-scroll of the scene
- Fade + slight vertical motion on exit (y: 0 -> -20px)
- Should feel "attached" to the scroll progression, not separately triggered
- Timing must align with camera movement and scene transitions

TEXT GENERATION RULE (generate each scene's sentence using this logic):
- Scene 1: curiosity / hook statement about the core idea
- Scene 2: problem, context, or tension
- Scene 3: transformation or product activation
- Scene 4: benefit, outcome, or scale
- Scene 5: resolution + CTA-driven statement
Each sentence must be contextually consistent with WEBSITE DETAILS, not generic
marketing filler.

TEXT MOTION ZONE (every scene MUST reserve one). Specify:
- Exact placement (e.g. center-left, bottom-center, top-right)
- Minimum 25–35% of the frame must remain visually calm (no key focal motion)
- Background behind text must have: lower contrast OR blur OR simplified
  geometry, or intentional negative space
- The zone must support animating in/out without overlapping moving focal
  elements
- No important subject, object, or motion path may pass through this zone during
  the text's visibility window

IMPLEMENTATION (text is a separate animated layer, NOT baked into video/frames):
- Text is rendered as an HTML overlay synced to scroll progress.
- Do NOT hardcode per-scene textInStart/textPeak/textOutEnd — derive everything
  from the scene's LOCAL progress (localT, 0..1 within the scene):
    opacity    = envelope(localT)            // 0 at the scene edges, 1 across the middle
    translateY = (1 - opacity) * 20px        // +20px while entering, -20px while exiting
- Use ONE shared shaping constant — fadeFraction (e.g. 0.2 = first/last 20% of
  each scene fades in/out, full opacity between). That single knob applies to
  every scene; no per-scene magic numbers.
- Because opacity comes from the SAME localT that picks the frame index, text is
  locked to the frames — never separately triggered or globally timed.
- Exception: Scene 5 holds its sentence + CTA to the end (skip the fade-out).
============================================================
```

---

## Notes

- **Image sequence vs video** is the key change: extracting to frames removes the
  keyframe-seeking choppiness entirely, because every scroll position has its own
  pre-decoded image. The cost is download weight and a preload step — manage it by
  downscaling to display size and using JPEG/WebP unless you truly need PNG.
- **Frames don't have to come from video** (see STEP 1b). Abstract/data-viz/UI-like
  looks are usually better drawn live in code (Canvas/WebGL) — crisp, free, tunable,
  with real text — while photoreal/cinematic looks come from a generated clip. A
  **hybrid** mixes both on one canvas, meeting at a crossfaded seam, so a hero can be
  part code-rendered and part video without the join ever reading as a hard cut.
- **Frame count = fps × duration.** At 30fps an 8s clip = 240 frames; map scroll
  0→1 onto indices 0→239. More frames = smoother scrub but heavier preload.
- The "hold each section longer" goal is solved in **two layers**: the video
  prompt (hold verbs) and the code (**dwell plateaus** in the progress→index
  mapping). The code layer is the reliable one — it works on any clip, costs
  nothing, and is tunable after the fact.
- The **DYNAMIC TEXT ANIMATION SYSTEM** pairs with dwell plateaus automatically:
  text peaks across the middle/hold of each scene (derived from `localT` via the
  shared `fadeFraction`), which is exactly where the camera rests — nothing to
  align by hand.
- Keep overlay sentences to **10–14 words**, one per scene, generated from the
  `WEBSITE DETAILS` block.
