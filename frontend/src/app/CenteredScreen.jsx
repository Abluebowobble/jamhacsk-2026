import { Flame } from 'lucide-react'
import { cx } from '../lib/cx'

// Shared frame for the pre-dashboard screens (login, onboarding, pairing):
// calm canvas, brand mark, single centered column. Phone-first; the column
// caps at ~26rem so it stays a focused instrument, not a stretched form.
export function CenteredScreen({ children, className }) {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className={cx('w-full max-w-[26rem]', className)}>
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-fg">
              <Flame className="size-6" aria-hidden="true" />
            </span>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
