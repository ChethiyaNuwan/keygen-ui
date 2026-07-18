import { ProtectedRoute } from "@/components/auth/protected-route"
import { LogManagement } from '@/components/logs/log-management'

export default function LogsPage() {
  return (
    <ProtectedRoute>
      <LogManagement />
    </ProtectedRoute>
  )
}
