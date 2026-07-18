'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { handleCrudError, handleFormError } from '@/lib/utils/error-handling'
import { formatDateTime } from '@/lib/utils/format'

const detailsSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().trim().min(1, 'Email is required'),
})

type DetailsFormValues = z.infer<typeof detailsSchema>

const passwordSchema = z.object({
  current: z.string().min(1, 'Enter your current password'),
  next: z.string().min(8, 'Use at least 8 characters'),
  confirm: z.string(),
}).refine((data) => data.next === data.confirm, {
  message: 'The new passwords do not match',
  path: ['confirm'],
})

type PasswordFormValues = z.infer<typeof passwordSchema>

const emptyPasswordValues: PasswordFormValues = { current: '', next: '', confirm: '' }

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const api = getKeygenApi()

  const detailsForm = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: user?.attributes.firstName ?? '',
      lastName: user?.attributes.lastName ?? '',
      email: user?.attributes.email ?? '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: emptyPasswordValues,
  })

  // Re-sync once the authenticated user loads (it's null on first render).
  useEffect(() => {
    if (user) {
      detailsForm.reset({
        firstName: user.attributes.firstName ?? '',
        lastName: user.attributes.lastName ?? '',
        email: user.attributes.email ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return null

  const handleSaveDetails = async (values: DetailsFormValues) => {
    try {
      await api.users.update(user.id, {
        firstName: values.firstName.trim() || undefined,
        lastName: values.lastName.trim() || undefined,
        email: values.email.trim(),
      })
      toast.success('Profile updated')
      await refresh()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'profile')
    }
  }

  const handleChangePassword = async (values: PasswordFormValues) => {
    try {
      await api.users.updatePassword(user.id, values.current, values.next)
      toast.success('Password changed')
      passwordForm.reset(emptyPasswordValues)
    } catch (error: unknown) {
      handleFormError(error, 'password')
    }
  }

  const savingDetails = detailsForm.formState.isSubmitting
  const savingPassword = passwordForm.formState.isSubmitting

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
          <Form {...detailsForm}>
            <form onSubmit={detailsForm.handleSubmit(handleSaveDetails)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={detailsForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input disabled={savingDetails} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={detailsForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input disabled={savingDetails} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={detailsForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" disabled={savingDetails} {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      This is the address you sign in with.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={savingDetails}>
                  {savingDetails ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>

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
                  {user.attributes.status.toLowerCase()}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Last signed in</dt>
              <dd>{formatDateTime(user.attributes.lastSignedInAt)}</dd>
            </div>
            <div className="flex items-center justify-between md:justify-start md:gap-3">
              <dt className="text-muted-foreground">Member since</dt>
              <dd>{formatDateTime(user.attributes.created)}</dd>
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
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="current"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" disabled={savingPassword} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={passwordForm.control}
                  name="next"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" disabled={savingPassword} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" disabled={savingPassword} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Changing…' : 'Change password'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
