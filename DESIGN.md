# Design

Visual system for Hestia. Aesthetic lane: **Clinical Precision** — cool steel-blue on a near-white surface, hairline structure, near-flat surfaces, generous whitespace. Medical-device-grade restraint. Calm at rest, decisive in a safety event. Light theme only.

> Core rule: **the resting world is blue/green; amber and red are earned.** Alarm color appears only for genuine warning (buzzer / absence countdown) and danger (auto-shutoff / offline / destructive). When you reach for red on a non-danger element, stop and rewrite.

---

## Theme & Mood

- **Scene:** a non-technical person glancing at a phone — "is the stove fine right now?" — and acting in half a second when it isn't. Quiet light, no clutter, the answer obvious.
- **Mood phrase:** *clinical instrument panel — cool daylight, hairline precision, nothing shouting until it must.*
- **Strategy:** Restrained. Tinted-neutral surfaces + one steel-blue primary; green/amber/red carry semantic state only. No decorative color.
- **Single theme:** light. No dark mode.

---

## Color

All values OKLCH. The surface carries a faint cool tint (chroma ≤ 0.006 toward 240°) — justified: the brand IS a clinical instrument, and the cool tint reads as such without becoming "blue paper." Brand feeling lives in the steel-blue primary and the type, not the background.

### Surfaces

| Token | OKLCH | Role |
|---|---|---|
| `--color-bg` | `oklch(0.990 0.004 240)` | App canvas |
| `--color-surface` | `oklch(1 0 0)` | Cards, panels (sit above bg) |
| `--color-surface-sunken` | `oklch(0.974 0.005 240)` | Inset wells, table headers, code |
| `--color-panel` | `oklch(0.982 0.006 245)` | Side nav / toolbar (cooler 2nd layer) |

### Ink

| Token | OKLCH | Role | Contrast on white |
|---|---|---|---|
| `--color-ink` | `oklch(0.20 0.012 250)` | Headings, primary text | ~15:1 |
| `--color-ink-body` | `oklch(0.32 0.012 250)` | Body text | ~9:1 |
| `--color-ink-muted` | `oklch(0.50 0.015 250)` | Secondary text, labels, **placeholders** | ~4.6:1 |
| `--color-ink-faint` | `oklch(0.62 0.013 250)` | Disabled, decorative only — **not body text** | ~3:1 |

### Borders

| Token | OKLCH | Role |
|---|---|---|
| `--color-border` | `oklch(0.918 0.005 245)` | Hairline default (1px) |
| `--color-border-strong` | `oklch(0.860 0.006 245)` | Emphasized dividers, input borders |

### Primary — steel-blue (brand + primary actions, selection, focus)

| Token | OKLCH | Role |
|---|---|---|
| `--color-primary` | `oklch(0.50 0.12 245)` | Primary buttons, links, focus ring, current selection |
| `--color-primary-hover` | `oklch(0.45 0.13 245)` | Hover |
| `--color-primary-active` | `oklch(0.40 0.13 245)` | Active / pressed |
| `--color-primary-fg` | `oklch(0.99 0.005 245)` | Text/icon on primary |
| `--color-primary-subtle` | `oklch(0.960 0.022 245)` | Selected-row tint, info chips |
| `--color-primary-border` | `oklch(0.850 0.040 245)` | Border on subtle fills |

### Semantic state — the safety vocabulary

These are not decoration. Each state = **color + icon + text label**, never color alone.

**Safe / online / presence-detected — green** (reassuring "all clear")

| Token | OKLCH |
|---|---|
| `--color-success` | `oklch(0.60 0.13 155)` |
| `--color-success-subtle` | `oklch(0.950 0.040 155)` |
| `--color-success-fg` | `oklch(0.40 0.11 155)` |

**Warning / buzzer active / absence countdown — amber**

| Token | OKLCH |
|---|---|
| `--color-warn` | `oklch(0.72 0.15 70)` |
| `--color-warn-subtle` | `oklch(0.955 0.050 75)` |
| `--color-warn-fg` | `oklch(0.45 0.10 60)` |

**Danger / auto-shutoff / offline / destructive — red**

| Token | OKLCH |
|---|---|
| `--color-danger` | `oklch(0.55 0.21 25)` |
| `--color-danger-hover` | `oklch(0.50 0.21 25)` |
| `--color-danger-subtle` | `oklch(0.950 0.040 25)` |
| `--color-danger-fg` | `oklch(0.45 0.16 25)` |

**Neutral / stove-off / inactive — gray** (no alarm; "nothing happening" is calm, not red)

| Token | OKLCH |
|---|---|
| `--color-neutral` | `oklch(0.70 0.010 250)` |
| `--color-neutral-subtle` | `oklch(0.962 0.004 245)` |

State-to-color map (memorize this):

```
online / presence detected / safe      → green   ●
stove ON, attended                       → primary (blue)  status, not alarm
stove OFF / device offline-secondary     → neutral gray  ○
absence countdown / buzzer active        → amber   △  (the warning window)
auto-shutoff fired / device OFFLINE      → red     ✕  (genuine danger / loss)
```

---

## Typography

One family. No display/body pairing — a product instrument carries everything in one well-tuned sans, with a mono for machine readouts.

- **Sans:** `Inter` → `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Headings, labels, body, buttons. Use `"cv11", "ss01"` and `tabular-nums` where numerals align.
- **Mono:** `JetBrains Mono` → `ui-monospace, 'SF Mono', Consolas, monospace`. **Reserved for machine values:** the live countdown timer, sensor/threshold values (`300s`), device pairing codes, event timestamps. `font-variant-numeric: tabular-nums` so countdowns don't jitter.

### Scale — fixed rem, not fluid (product UI views at consistent DPI)

Base `15px`. Ratio ~1.2.

| Token | Size | Use |
|---|---|---|
| `--text-xs` | 12px / 1.4 | Micro-labels, metadata, badge text |
| `--text-sm` | 13px / 1.45 | Secondary, table cells, captions |
| `--text-base` | 15px / 1.55 | Body default |
| `--text-lg` | 17px / 1.4 | Lead paragraph, card title |
| `--text-xl` | 20px / 1.3 | Section heading |
| `--text-2xl` | 24px / 1.25 | Page heading |
| `--text-3xl` | 30px / 1.2 | Top-level / dashboard title (ceiling for product UI) |

- Headings: weight 600, `letter-spacing: -0.011em` (never below `-0.02em`). `text-wrap: balance` on h1–h2.
- Body: weight 400, `--color-ink-body`. Prose capped 65–75ch; data/tables may run denser.
- Labels/eyebrows: sentence case. **No tracked uppercase eyebrow on every section.** Uppercase only for tiny status micro-labels (`ONLINE`), tracked `+0.04em`.

---

## Spacing & Layout

- **4px base scale:** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- **Phone-first PWA.** Single column on phone; the app shell adds a persistent side/bottom nav at ≥768px. Responsive behavior is structural (collapse nav, stack rows) — never fluid type.
- Touch targets ≥44px. Primary safety actions reachable one-handed (lower third on phone).
- Vary spacing for rhythm; don't pad everything to 16. Status block gets air; dense data (event log, thresholds) runs tighter.
- Grid for 2D dashboards (`repeat(auto-fit, minmax(280px, 1fr))` for device cards); flex for rows and toolbars.

---

## Shape & Elevation

- **Radius (clinical = restrained):** `--radius-sm 4px` (inputs, chips, badges), `--radius-md 6px` (buttons, cards — the default), `--radius-lg 8px` (modals, sheets), `--radius-full 9999px` (status dots, toggles, avatars).
- **Structure via hairlines, not shadows.** Cards = 1px `--color-border` on `--color-surface`, no shadow at rest. This is the clinical signature.
- **Shadow only for things that float** over content:
  - `--shadow-pop`: dropdowns/popovers — `0 4px 12px -2px oklch(0.20 0.02 250 / 0.10)`
  - `--shadow-modal`: dialogs/sheets — `0 16px 40px -8px oklch(0.20 0.02 250 / 0.18)`
- No nested cards. No side-stripe borders. No glassmorphism. No gradient text.

---

## Iconography

- **Lucide** (1.5px stroke, 20–24px). One consistent set across the whole app.
- Every status pairs an icon with its color + label. Suggested mapping: online `wifi` / offline `wifi-off`, stove on `flame` / off `power`, presence `user-check` / absent `user-x`, timer `timer`, warning `alert-triangle`, danger/shutoff `shield-alert`, safe `shield-check`.

---

## Components

Every interactive component ships all states: **default, hover, focus-visible, active, disabled, loading, error.** Don't ship half.

- **Buttons:** Primary (steel-blue solid), Secondary (surface + `--color-border-strong`), Ghost (transparent → subtle tint on hover), Danger (red solid, for destructive admin actions only). Focus = 2px `--color-primary` ring, 2px offset.
- **Status badge / pill:** dot + label, drawn from the state map. Subtle fill + matching `-fg` text. The core repeated element of the app.
- **Device card:** the dashboard primitive. Name + household, a prominent status block (the half-second answer), then secondary stats, then actions. Hairline border, no shadow.
- **Live readouts:** countdown timer and threshold values in mono + tabular-nums. The absence countdown is the one element allowed to draw the eye during a warning.
- **Forms:** 44px min height inputs, 1px `--color-border-strong`, focus ring = primary. Validation uses `--color-danger` + icon + message, never color alone. Placeholder = `--color-ink-muted` (meets 4.5:1).
- **Loading:** skeletons for content (not center spinners); inline spinner only inside buttons.
- **Empty states** teach the next action (pair a device, create a household) — never "nothing here."
- **Modal is the last resort.** Prefer inline / progressive disclosure / sheets. A destructive admin confirm (delete household, remove member, auto-shutoff override) is a legitimate modal.

### Z-index scale (semantic — never `9999`)

```
--z-dropdown: 1000;  --z-sticky: 1100;  --z-backdrop: 1200;
--z-modal:    1300;  --z-toast:  1400;  --z-tooltip:  1500;
```

---

## Motion

State feedback, not choreography. No page-load sequences — the app loads into a task.

- **Durations:** `--dur-fast 120ms` (hover, press), `--dur 180ms` (default — toggles, tints, dropdowns), `--dur-slow 240ms` (sheets, modals).
- **Easing:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). No bounce, no elastic.
- **The one signature motion:** when a warning is active (buzzer / absence countdown), the warning banner + countdown breathe with a slow 1.6s amber pulse — the only thing on screen that moves at rest, and only when something is genuinely wrong. Escalates to red, no pulse (steady = serious), on auto-shutoff.
- Animate `opacity` / `transform` / `background-color`, not layout.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` → pulse becomes a static amber border, transitions become instant/crossfade. No information lives only in motion.

---

## Accessibility checklist (build-time)

- Body ≥4.5:1, large/secondary/UI ≥3:1 — verified against `--color-bg` / `--color-surface`.
- Every safety state = color **+ icon + text**. Never color alone.
- Visible focus ring on all interactive elements (2px primary, 2px offset).
- Touch targets ≥44px; one-handed reach for safety actions.
- Reduced-motion alternative for every animation, including the warning pulse.
