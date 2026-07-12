'use client'

import { useState } from 'react'
import { getKeygenApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { handleCrudError, handleFormError } from '@/lib/utils/error-handling'

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const api = getKeygenApi()

  const [details, setDetails] = useState({
    firstName: user?.attributes.firstName ?? '',
    lastName: user?.attributes.lastName ?? '',
    email: user?.attributes.email ?? '',
  })
  const [savingDetails, setSavingDetails] = useState(false)

  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) return null

  const formatDate = (value?: string) => {
    if (!value) return '—'
    return new Date(value).toLocaleString()
  }

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!details.email.trim()) {
      toast.error('Email is required')
      return
    }

    try {
      setSavingDetails(true)
      await api.users.update(user.id, {
        firstName: details.firstName.trim() || undefined,
        lastName: details.lastName.trim() || undefined,
        email: details.email.trim(),
      })
      toast.success('Profile updated')
      await refresh()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'profile')
    } finally {
      setSavingDetails(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwords.current || !passwords.next) {
      toast.error('Enter your current and new password')
      return
    }
    if (passwords.next !== passwords.confirm) {
      toast.error('The new passwords do not match')
      return
    }
    if (passwords.next.length < 8) {
      toast.error('Use at least 8 characters')
      return
    }

    try {
      setSavingPassword(true)
      await api.users.updatePassword(user.id, passwords.current, passwords.next)
      toast.success('Password changed')
      setPasswords({ current: '', next: '', confirm: '' })
    } catch (error: unknown) {
      handleFormError(error, 'password')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">
          Your profile and sign-in details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in this dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={details.firstName}
                  onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
                  disabled={savingDetails}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={details.lastName}
                  onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
                  disabled={savingDetails}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={details.email}
                onChange={(e) => setDetails({ ...details, email: e.target.value })}
                disabled={savingDetails}
              />
              <p className="text-xs text-muted-foreground">
                This is the address you sign in with.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingDetails}>
                {savingDetails ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>

          <Separator className="my-6" />

          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Role</dt>
              <dd>
                <Badge variant="outline" className="capitalize">
                  {user.attributes.role}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant="outline" className="capitalize">
                  {user.attributes.status}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Last signed in</dt>
              <dd>{formatDate(user.attributes.lastSignedInAt)}</dd>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Member since</dt>
              <dd>{formatDate(user.attributes.created)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing this signs you out of other sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                disabled={savingPassword}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                  disabled={savingPassword}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  disabled={savingPassword}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
