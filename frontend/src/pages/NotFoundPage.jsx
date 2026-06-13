import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="That page or device doesn't exist, or you no longer have access to it."
      action={
        <Button as={Link} to="/">
          Back to devices
        </Button>
      }
      className="mt-10"
    />
  )
}
