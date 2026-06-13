import { Badge } from './ui/Badge'
import { computePhase, PHASE_META } from '../lib/deviceState'

// Device phase → status pill. The repeated atom across the app.
export function StatusBadge({ device, phase = computePhase(device) }) {
  const meta = PHASE_META[phase]
  return (
    <Badge tone={meta.tone} icon={meta.Icon}>
      {meta.label}
    </Badge>
  )
}
