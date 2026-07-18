import { ProtectedRoute } from "@/components/auth/protected-route"
import { TokenManagement } from "@/components/settings/token-management"

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <div className="space-y-6 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage account-wide API tokens.
          </p>
        </div>
        <TokenManagement />
      </div>
    </ProtectedRoute>
  )
}