'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { Entitlement } from '@/lib/types/keygen'
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

const entitlementSchema = z.object({
  name: z.string().trim().min(1, 'Entitlement name is required'),
  code: z.string().trim().min(1, 'Entitlement code is required'),
})

type EntitlementFormValues = z.infer<typeof entitlementSchema>

function entitlementToFormValues(entitlement: Entitlement): EntitlementFormValues {
  return {
    name: entitlement.attributes.name,
    code: entitlement.attributes.code,
  }
}

interface EditEntitlementDialogProps {
  entitlement: Entitlement
  open: boolean
  onOpenChange: (open: boolean) => void
  onEntitlementUpdated: () => void
}

export function EditEntitlementDialog({
  entitlement,
  open,
  onOpenChange,
  onEntitlementUpdated
}: EditEntitlementDialogProps) {
  const api = getKeygenApi()

  const form = useForm<EntitlementFormValues>({
    resolver: zodResolver(entitlementSchema),
    defaultValues: entitlementToFormValues(entitlement),
  })

  // Initialize form data when entitlement changes
  useEffect(() => {
    if (entitlement) {
      form.reset(entitlementToFormValues(entitlement))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlement])

  const onSubmit = async (values: EntitlementFormValues) => {
    try {
      await api.entitlements.update(entitlement.id, {
        name: values.name,
        code: values.code
      })

      onEntitlementUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Entitlement', {
        onNotFound: () => onEntitlementUpdated()
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
              <DialogTitle>Edit Entitlement</DialogTitle>
              <DialogDescription>
                Update the entitlement name and code.
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
                      <Input placeholder="Enter entitlement name" disabled={loading} {...field} />
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
                      <Input placeholder="Enter code" disabled={loading} className="font-mono text-sm" {...field} />
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
                {loading ? 'Updating...' : 'Update Entitlement'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
