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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Edit } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import { License } from '@/lib/types/keygen'
import { handleCrudError } from '@/lib/utils/error-handling'

function isValidJsonOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function isValidPositiveIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const licenseSchema = z.object({
  name: z.string(),
  expiry: z.string(),
  maxUses: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  maxMachines: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  metadata: z.string().refine(isValidJsonOrEmpty, 'Must be valid JSON or empty'),
})

type LicenseFormValues = z.infer<typeof licenseSchema>

function licenseToFormValues(license: License): LicenseFormValues {
  const a = license.attributes
  return {
    name: a.name || '',
    expiry: a.expiry ? a.expiry.split('T')[0] : '',
    maxUses: a.maxUses?.toString() || '',
    maxMachines: a.maxMachines?.toString() || '',
    metadata: a.metadata && Object.keys(a.metadata).length > 0 ? JSON.stringify(a.metadata, null, 2) : '',
  }
}

/** Only the fields that actually changed, in the shape `licenses.update` expects. */
function diffFormValues(values: LicenseFormValues, license: License): Partial<License['attributes']> {
  const original = licenseToFormValues(license)
  const updates: Partial<License['attributes']> = {}

  if (values.name.trim() !== original.name) updates.name = values.name.trim() || undefined
  if (values.expiry !== original.expiry) {
    updates.expiry = values.expiry ? new Date(values.expiry).toISOString() : undefined
  }
  if (values.maxUses !== original.maxUses) {
    updates.maxUses = values.maxUses ? parseInt(values.maxUses, 10) : undefined
  }
  if (values.maxMachines !== original.maxMachines) {
    updates.maxMachines = values.maxMachines ? parseInt(values.maxMachines, 10) : undefined
  }
  if (values.metadata !== original.metadata) {
    updates.metadata = values.metadata.trim() ? JSON.parse(values.metadata) : {}
  }

  return updates
}

interface EditLicenseDialogProps {
  license: License
  open: boolean
  onOpenChange: (open: boolean) => void
  onLicenseUpdated: () => void
}

export function EditLicenseDialog({
  license,
  open,
  onOpenChange,
  onLicenseUpdated
}: EditLicenseDialogProps) {
  const api = getKeygenApi()

  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: licenseToFormValues(license),
  })

  // Re-sync when a different license is opened (dialog instance is reused).
  useEffect(() => {
    if (open) {
      form.reset(licenseToFormValues(license))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, license])

  const onSubmit = async (values: LicenseFormValues) => {
    try {
      const updates = diffFormValues(values, license)

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        onOpenChange(false)
        return
      }

      await api.licenses.update(license.id, updates)
      toast.success('License updated successfully')
      onLicenseUpdated()
      onOpenChange(false)
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'License')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit License
          </DialogTitle>
          <DialogDescription>
            Update license details and settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* License Key (Read-only) */}
            <div className="space-y-2">
              <Label>License Key</Label>
              <div className="p-2 bg-muted rounded-md font-mono text-sm">
                {license.attributes.key}
              </div>
              <p className="text-xs text-muted-foreground">
                License keys cannot be changed after creation
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter license name (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiration
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxUses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Uses</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="Unlimited" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Maximum number of times this license can be used
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxMachines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Machines (seats)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="Unlimited" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Seats this license grants — leave empty for unlimited, or to inherit the policy&apos;s limit
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{&quot;key&quot;: &quot;value&quot;}'
                      rows={4}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optional JSON metadata for custom tracking
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Update License
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
