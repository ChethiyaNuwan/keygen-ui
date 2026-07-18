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

const entitlementSchema = z.object({
  name: z.string().trim().min(1, 'Entitlement name is required'),
  code: z.string().trim().min(1, 'Entitlement code is required'),
})

type EntitlementFormValues = z.infer<typeof entitlementSchema>

const defaultValues: EntitlementFormValues = {
  name: '',
  code: '',
}

function generateCodeFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

interface CreateEntitlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntitlementCreated: () => void
}

export function CreateEntitlementDialog({
  open,
  onOpenChange,
  onEntitlementCreated
}: CreateEntitlementDialogProps) {
  const api = getKeygenApi()

  const form = useForm<EntitlementFormValues>({
    resolver: zodResolver(entitlementSchema),
    defaultValues,
  })

  const handleNameChange = (value: string) => {
    form.setValue('name', value)

    // Auto-generate code if code field is empty
    if (!form.getValues('code')) {
      form.setValue('code', generateCodeFromName(value))
    }
  }

  const onSubmit = async (values: EntitlementFormValues) => {
    try {
      await api.entitlements.create({
        name: values.name,
        code: values.code
      })

      form.reset(defaultValues)
      onEntitlementCreated()
    } catch (error: unknown) {
      handleFormError(error, 'Entitlement')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Entitlement</DialogTitle>
              <DialogDescription>
                Create a new entitlement to control feature access and permissions.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entitlement Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter entitlement name (e.g., Premium Features)"
                        disabled={loading}
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entitlement Code *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter code (e.g., premium_features)"
                        disabled={loading}
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for this entitlement. Use lowercase letters, numbers, and underscores only.
                    </p>
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
                {loading ? 'Creating...' : 'Create Entitlement'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
