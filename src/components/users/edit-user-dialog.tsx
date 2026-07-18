'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Shield, User as UserIcon } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { User } from '@/lib/types/keygen'
import { handleCrudError } from '@/lib/utils/error-handling'

const ROLES = ['user', 'admin', 'developer', 'sales-agent', 'support-agent', 'read-only'] as const

const userSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().trim().min(1, 'Email is required').email('Must be a valid email'),
  role: z.enum(ROLES),
})

type UserFormValues = z.infer<typeof userSchema>

function userToFormValues(user: User): UserFormValues {
  return {
    firstName: user.attributes.firstName ?? '',
    lastName: user.attributes.lastName ?? '',
    email: user.attributes.email,
    role: user.attributes.role,
  }
}

interface EditUserDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const api = getKeygenApi()

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: userToFormValues(user),
  })

  useEffect(() => {
    if (open) {
      form.reset(userToFormValues(user))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  const onSubmit = async (values: UserFormValues) => {
    try {
      const original = userToFormValues(user)
      const updates: {
        firstName?: string
        lastName?: string
        email?: string
        role?: User['attributes']['role']
      } = {}

      if (values.firstName !== original.firstName) updates.firstName = values.firstName || undefined
      if (values.lastName !== original.lastName) updates.lastName = values.lastName || undefined
      if (values.email !== original.email) updates.email = values.email
      if (values.role !== original.role) updates.role = values.role

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        onOpenChange(false)
        return
      }

      await api.users.update(user.id, updates)
      toast.success('User updated successfully')
      onUserUpdated()
      onOpenChange(false)
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'User')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>Update this user&apos;s name, email, and role.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          User
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="developer">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Developer
                        </div>
                      </SelectItem>
                      <SelectItem value="sales-agent">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Sales Agent
                        </div>
                      </SelectItem>
                      <SelectItem value="support-agent">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Support Agent
                        </div>
                      </SelectItem>
                      <SelectItem value="read-only">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          Read Only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
