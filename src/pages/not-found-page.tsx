import { useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        action={<Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>}
      />
    </div>
  )
}
