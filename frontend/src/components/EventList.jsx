import {
  Flame,
  Power,
  UserCheck,
  UserX,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Settings2,
  Wifi,
  WifiOff,
  Dot,
} from 'lucide-react'
import { EVENT_LABELS } from '../lib/mockData'
import { relativeTime, formatClock } from '../lib/format'
import { cx } from '../lib/cx'

// type → { icon, tone }. Tone follows the safety palette; most events are
// neutral, alarm color reserved for genuine warning/danger events.
const META = {
  STOVE_TURNED_ON: { icon: Flame, tone: 'primary' },
  STOVE_TURNED_OFF: { icon: Power, tone: 'neutral' },
  PRESENCE_DETECTED: { icon: UserCheck, tone: 'success' },
  NO_PRESENCE_DETECTED: { icon: UserX, tone: 'warn' },
  WARNING_BUZZER_STARTED: { icon: AlertTriangle, tone: 'warn' },
  WARNING_CANCELLED: { icon: ShieldCheck, tone: 'success' },
  AUTO_SHUTOFF_TRIGGERED: { icon: ShieldAlert, tone: 'danger' },
  TIMER_CREATED: { icon: Timer, tone: 'primary' },
  TIMER_CANCELLED: { icon: Timer, tone: 'neutral' },
  TIMER_COMPLETED: { icon: Timer, tone: 'success' },
  SAFETY_SETTINGS_UPDATED: { icon: Settings2, tone: 'neutral' },
  DEVICE_ONLINE: { icon: Wifi, tone: 'success' },
  DEVICE_OFFLINE: { icon: WifiOff, tone: 'danger' },
  DEVICE_PAIRED: { icon: ShieldCheck, tone: 'success' },
}

const TONE = {
  primary: 'text-primary',
  success: 'text-success',
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
  neutral: 'text-ink-faint',
}

export function EventList({ events }) {
  if (!events.length) {
    return <p className="py-6 text-center text-sm text-ink-muted">No events yet.</p>
  }
  return (
    <ul className="flex flex-col">
      {events.map((e) => {
        const meta = META[e.type] ?? { icon: Dot, tone: 'neutral' }
        const Icon = meta.icon
        return (
          <li
            key={e.id}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <Icon className={cx('size-4 shrink-0', TONE[meta.tone])} aria-hidden="true" />
            <span className="flex-1 text-sm text-ink-body">
              {EVENT_LABELS[e.type] ?? e.type}
            </span>
            <time
              dateTime={e.at}
              title={formatClock(e.at)}
              className="shrink-0 text-xs text-ink-muted"
            >
              {relativeTime(e.at)}
            </time>
          </li>
        )
      })}
    </ul>
  )
}
