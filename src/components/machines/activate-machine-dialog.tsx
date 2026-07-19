'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Plus } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { License } from '@/lib/types/keygen'
import { handleFormError, handleLoadError } from '@/lib/utils/error-handling'
import { toast } from 'sonner'
import { PLATFORM_OPTIONS } from '@/lib/constants'

function isValidPositiveIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const machineSchema = z.object({
  fingerprint: z.string().trim().min(1, 'Machine fingerprint is required'),
  licenseId: z.string().min(1, 'Please select a license'),
  name: z.string(),
  platform: z.string(),
  hostname: z.string(),
  cores: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  ip: z.string(),
})

type MachineFormValues = z.infer<typeof machineSchema>

const defaultValues: MachineFormValues = {
  fingerprint: '',
  licenseId: '',
  name: '',
  platform: '',
  hostname: '',
  cores: '',
  ip: '',
}

interface ActivateMachineDialogProps {
  onMachineActivated?: () => void
}

export function ActivateMachineDialog({ onMachineActivated }: ActivateMachineDialogProps) {
  const [open, setOpen] = useState(false)
  const [licenses, setLicenses] = useState<License[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const api = getKeygenApi()

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues,
  })

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingData(true)
      // Deliberately not filtered to status === 'ACTIVE': a freshly created
      // license is commonly INACTIVE until its first validation, and
      // EXPIRING is still a fully valid, activatable license — a client-side
      // status allowlist here previously hid every real license except ones
      // in the exact ACTIVE state, leaving this picker empty in the common
      // case. Keygen's own activate endpoint is the actual authority on
      // whether a given license can accept a new machine (e.g. SUSPENDED/
      // BANNED/EXPIRED get rejected there with a clear error).
      const licensesResponse = await api.licenses.list({ limit: 100 })
      setLicenses(licensesResponse.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'licenses')
    } finally {
      setLoadingData(false)
    }
  }, [api.licenses])

  useEffect(() => {
    if (open) {
      loadInitialData()
    }
  }, [open, loadInitialData])

  const onSubmit = async (values: MachineFormValues) => {
    try {
      await api.machines.activate({
        fingerprint: values.fingerprint,
        licenseId: values.licenseId,
        name: values.name.trim() || undefined,
        platform: values.platform && values.platform !== 'none' ? values.platform : undefined,
        hostname: values.hostname.trim() || undefined,
        cores: values.cores ? parseInt(values.cores, 10) : undefined,
        ip: values.ip.trim() || undefined
      })

      toast.success('Machine activated successfully')
      setOpen(false)
      form.reset(defaultValues)
      onMachineActivated?.()
    } catch (error: unknown) {
      handleFormError(error, 'Machine')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Activate Machine">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Activate Machine</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Activate New Machine</DialogTitle>
          <DialogDescription>
            Activate a new machine by assigning it to a license. The machine fingerprint uniquely identifies the device.
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading licenses...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fingerprint"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Machine Fingerprint *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1A2B3C4D5E6F7G8H9I0J" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Unique identifier for this machine (hardware-based fingerprint)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>License *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a license" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {licenses.map((license) => (
                            <SelectItem key={license.id} value={license.id}>
                              {license.attributes.name || license.attributes.key}
                              <span className="text-muted-foreground ml-2">
                                ({license.attributes.status.toLowerCase()}
                                {license.attributes.maxUses
                                  ? `, ${license.attributes.uses}/${license.attributes.maxUses} uses`
                                  : ''}
                                )
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John's Workstation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unspecified</SelectItem>
                          {PLATFORM_OPTIONS.map((platform) => (
                            <SelectItem key={platform} value={platform}>
                              {platform}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="hostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hostname</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., DESKTOP-ABC123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cores"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPU Cores</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Activating...' : 'Activate Machine'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
