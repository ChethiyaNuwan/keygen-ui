'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { handleFormError } from '@/lib/utils/error-handling'

function isValidNonNegativeIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const groupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required'),
  maxLicenses: z.string().refine(isValidNonNegativeIntOrEmpty, 'Must be a whole number'),
  maxMachines: z.string().refine(isValidNonNegativeIntOrEmpty, 'Must be a whole number'),
  maxUsers: z.string().refine(isValidNonNegativeIntOrEmpty, 'Must be a whole number'),
})

type GroupFormValues = z.infer<typeof groupSchema>

const defaultValues: GroupFormValues = {
  name: '',
  maxLicenses: '',
  maxMachines: '',
  maxUsers: '',
}

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupCreated: () => void
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onGroupCreated
}: CreateGroupDialogProps) {
  const api = getKeygenApi()

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues,
  })

  const onSubmit = async (values: GroupFormValues) => {
    try {
      const groupData: {
        name: string;
        maxLicenses?: number;
        maxMachines?: number;
        maxUsers?: number;
      } = {
        name: values.name
      }

      // Add optional limits if specified
      if (values.maxLicenses && parseInt(values.maxLicenses, 10) > 0) {
        groupData.maxLicenses = parseInt(values.maxLicenses, 10)
      }
      if (values.maxMachines && parseInt(values.maxMachines, 10) > 0) {
        groupData.maxMachines = parseInt(values.maxMachines, 10)
      }
      if (values.maxUsers && parseInt(values.maxUsers, 10) > 0) {
        groupData.maxUsers = parseInt(values.maxUsers, 10)
      }

      await api.groups.create(groupData)

      form.reset(defaultValues)
      onGroupCreated()
    } catch (error: unknown) {
      handleFormError(error, 'Group')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize users and licenses.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxLicenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Licenses</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Leave empty for unlimited" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxMachines"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Machines</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Leave empty for unlimited" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Users</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="Leave empty for unlimited" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
