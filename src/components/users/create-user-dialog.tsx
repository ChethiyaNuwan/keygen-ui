'use client'

import { useState } from 'react'
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
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Shield, User } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { handleFormError } from '@/lib/utils/error-handling'

const ROLES = ['user', 'admin', 'developer', 'sales-agent', 'support-agent', 'read-only'] as const

function isValidJsonOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

const userSchema = z.object({
  email: z.string().trim().min(1, 'Please enter an email address'),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(ROLES),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
  metadata: z.string().refine(isValidJsonOrEmpty, 'Invalid JSON format in metadata'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type UserFormValues = z.infer<typeof userSchema>

const defaultValues: UserFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'user',
  password: '',
  confirmPassword: '',
  metadata: '',
}

interface CreateUserDialogProps {
  onUserCreated?: () => void
}

export function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)

  const api = getKeygenApi()

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues,
  })

  const onSubmit = async (values: UserFormValues) => {
    try {
      const metadata = values.metadata.trim() ? JSON.parse(values.metadata) : undefined

      await api.users.create({
        email: values.email,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        role: values.role,
        password: values.password,
        metadata,
      })

      toast.success('User created successfully')
      setOpen(false)
      form.reset(defaultValues)
      onUserCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'User')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Create User">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Create User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account for your system. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          {/* SelectValue mirrors the chosen item, icon included — do not
                              render the icon here as well. */}
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
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
                            <User className="h-4 w-4" />
                            Developer
                          </div>
                        </SelectItem>
                        <SelectItem value="sales-agent">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Sales Agent
                          </div>
                        </SelectItem>
                        <SelectItem value="support-agent">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Support Agent
                          </div>
                        </SelectItem>
                        <SelectItem value="read-only">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Read Only
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{&quot;department&quot;: &quot;Engineering&quot;, &quot;location&quot;: &quot;Remote&quot;}'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optional JSON metadata for the user
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  form.reset(defaultValues)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
