'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { Group } from '@/lib/types/keygen'
import { handleCrudError } from '@/lib/utils/error-handling'
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

function groupToFormValues(group: Group): GroupFormValues {
  return {
    name: group.attributes.name,
    maxLicenses: group.attributes.maxLicenses?.toString() || '',
    maxMachines: group.attributes.maxMachines?.toString() || '',
    maxUsers: group.attributes.maxUsers?.toString() || '',
  }
}

interface EditGroupDialogProps {
  group: Group
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupUpdated: () => void
}

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onGroupUpdated
}: EditGroupDialogProps) {
  const api = getKeygenApi()

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: groupToFormValues(group),
  })

  // Initialize form data when group changes
  useEffect(() => {
    if (group) {
      form.reset(groupToFormValues(group))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group])

  const onSubmit = async (values: GroupFormValues) => {
    try {
      const updates: {
        name: string;
        maxLicenses?: number;
        maxMachines?: number;
        maxUsers?: number;
      } = {
        name: values.name
      }

      // Add optional limits - use undefined for unlimited (empty string)
      updates.maxLicenses = values.maxLicenses && parseInt(values.maxLicenses, 10) > 0
        ? parseInt(values.maxLicenses, 10)
        : undefined
      updates.maxMachines = values.maxMachines && parseInt(values.maxMachines, 10) > 0
        ? parseInt(values.maxMachines, 10)
        : undefined
      updates.maxUsers = values.maxUsers && parseInt(values.maxUsers, 10) > 0
        ? parseInt(values.maxUsers, 10)
        : undefined

      await api.groups.update(group.id, updates)
      onGroupUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Group', {
        onNotFound: () => onGroupUpdated()
      })
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update the group configuration and limits.
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
                {loading ? 'Updating...' : 'Update Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
