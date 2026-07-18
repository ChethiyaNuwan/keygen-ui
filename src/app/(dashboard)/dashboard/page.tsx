import { ProtectedRoute } from "@/components/auth/protected-route"
import { SectionCards } from "@/components/section-cards"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <SectionCards />
    </ProtectedRoute>
  )
}