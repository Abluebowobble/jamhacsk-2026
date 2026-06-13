import { useEffect, useState } from 'react'
import { Check, LogOut, AlertCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { SettingsGroup } from '../SettingsPage'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'

export function AccountSection() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState(user?.email ?? '')
  const [savedName, setSavedName] = useState('') // last persisted value
  const [name, setName] = useState('')
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let active = true
    api
      .getProfile()
      .then((p) => {
        if (!active) return
        setEmail(p?.email ?? user?.email ?? '')
        setSavedName(p?.full_name ?? '')
        setName(p?.full_name ?? '')
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trimmed = name.trim()
  const nameErr = trimmed.length === 0 ? 'Name can’t be empty.' : null
  const dirty = trimmed !== savedName
  const initial = (savedName || email).charAt(0).toUpperCase() || '?'

  const onSubmit = async (e) => {
    e.preventDefault()
    if (nameErr || !dirty || status === 'saving') return
    setStatus('saving')
    setErrorMsg(null)
    try {
      const updated = await api.updateProfile(trimmed)
      setSavedName(updated?.full_name ?? trimmed)
      setName(updated?.full_name ?? trimmed)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err?.message || 'Couldn’t save your name. Try again.')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup title="Account" description="Your name as it appears to other household members.">
        <Card className="p-5">
          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-11 w-full max-w-sm rounded-md" />
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
              <div className="flex items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-subtle text-lg font-semibold text-primary"
                  aria-hidden="true"
                >
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-ink-muted">Signed in as</p>
                  <p className="truncate text-sm font-medium text-ink" title={email}>
                    {email}
                  </p>
                </div>
              </div>

              <div className="max-w-sm">
                <Field
                  label="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={status !== 'idle' || dirty ? nameErr : null}
                  autoComplete="name"
                  maxLength={100}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={status === 'saving'} disabled={!!nameErr || !dirty}>
                  Save changes
                </Button>
                {status === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-success-fg">
                    <Check className="size-4" aria-hidden="true" />
                    Saved
                  </span>
                )}
                {status === 'error' && errorMsg && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-danger-fg" role="alert">
                    <AlertCircle className="size-4" aria-hidden="true" />
                    {errorMsg}
                  </span>
                )}
              </div>
            </form>
          )}
        </Card>
      </SettingsGroup>

      <SettingsGroup title="Session" description="Sign out of Hestia on this device.">
        <div>
          <Button variant="secondary" onClick={() => signOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </SettingsGroup>
    </div>
  )
}
