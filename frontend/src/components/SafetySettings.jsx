import { useState } from 'react'
import { Check } from 'lucide-react'
import { Field } from './ui/Field'
import { Button } from './ui/Button'
import { actions } from '../lib/store'
import { useCan } from '../lib/roles'

// Absence timeout + warning delay, in seconds. Validation per PRD §15:
// both > 0, and warning delay must be shorter than the absence timeout.
export function SafetySettings({ device }) {
  const canEdit = useCan('editSafety')
  const [absence, setAbsence] = useState(String(device.absenceTimeout))
  const [warning, setWarning] = useState(String(device.warningDelay))
  const [saved, setSaved] = useState(false)

  const a = Number(absence)
  const w = Number(warning)
  const absenceErr =
    absence === '' || !Number.isFinite(a) || a <= 0 ? 'Must be greater than 0.' : null
  const warningErr =
    warning === '' || !Number.isFinite(w) || w <= 0
      ? 'Must be greater than 0.'
      : !absenceErr && w >= a
        ? 'Must be shorter than the absence timeout.'
        : null

  const dirty = a !== device.absenceTimeout || w !== device.warningDelay
  const valid = !absenceErr && !warningErr

  const onSubmit = (e) => {
    e.preventDefault()
    if (!valid || !dirty) return
    actions.updateSettings(device.id, { absenceTimeout: Math.round(a), warningDelay: Math.round(w) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Absence timeout"
          type="number"
          inputMode="numeric"
          min={1}
          suffix="sec"
          value={absence}
          disabled={!canEdit}
          onChange={(e) => setAbsence(e.target.value)}
          error={absenceErr}
          hint="Time with no one detected before the buzzer."
        />
        <Field
          label="Warning delay"
          type="number"
          inputMode="numeric"
          min={1}
          suffix="sec"
          value={warning}
          disabled={!canEdit}
          onChange={(e) => setWarning(e.target.value)}
          error={warningErr}
          hint="Buzzer time before the stove shuts off."
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!canEdit || !valid || !dirty}>
          Save settings
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success-fg">
            <Check className="size-4" aria-hidden="true" />
            Saved
          </span>
        )}
        {!canEdit && <span className="text-sm text-ink-muted">View only for your role.</span>}
      </div>
    </form>
  )
}
