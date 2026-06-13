import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SettingsNav } from '../components/SettingsNav'

// Settings shell: a sticky section rail beside the active section. Sits inside
// the AppShell (header + RoleContext for the active household), so sections can
// read the current role for admin-gated controls.
export function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All devices
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-body">
          Manage your account, notifications, and household.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[12rem_1fr] lg:gap-10">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <SettingsNav />
        </div>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

// Shared heading for a settings group. Title + optional description + actions,
// above its content. Kept here so every section reads identically.
export function SettingsGroup({ title, description, action, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 max-w-prose text-sm text-ink-body">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
