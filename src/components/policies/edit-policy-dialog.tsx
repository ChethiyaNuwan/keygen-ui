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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Policy,
  PolicyHeartbeatCullStrategy,
  PolicyHeartbeatResurrectionStrategy,
  PolicyHeartbeatBasis,
  PolicyMachineUniquenessStrategy,
  PolicyMachineMatchingStrategy,
  PolicyExpirationStrategy,
  PolicyExpirationBasis,
  PolicyRenewalBasis,
  PolicyTransferStrategy,
  PolicyAuthenticationStrategy,
  PolicyMachineLeasingStrategy,
  PolicyProcessLeasingStrategy,
  PolicyOverageStrategy,
} from '@/lib/types/keygen'
import { PolicyMutableAttributes } from '@/lib/api/resources/policies'
import { handleCrudError } from '@/lib/utils/error-handling'

// Canonical enum values per https://keygen.sh/docs/api/policies/, kept as
// `satisfies` against the shared Policy* types in keygen.ts so this file
// fails to compile if the two ever drift apart again.
const HEARTBEAT_CULL_STRATEGIES = ['DEACTIVATE_DEAD', 'KEEP_DEAD'] as const satisfies readonly PolicyHeartbeatCullStrategy[]
const HEARTBEAT_RESURRECTION_STRATEGIES = [
  'NO_REVIVE', '1_MINUTE_REVIVE', '2_MINUTE_REVIVE', '5_MINUTE_REVIVE',
  '10_MINUTE_REVIVE', '15_MINUTE_REVIVE', 'ALWAYS_REVIVE',
] as const satisfies readonly PolicyHeartbeatResurrectionStrategy[]
const HEARTBEAT_BASES = ['FROM_CREATION', 'FROM_FIRST_PING'] as const satisfies readonly PolicyHeartbeatBasis[]
const MACHINE_UNIQUENESS_STRATEGIES = [
  'UNIQUE_PER_ACCOUNT', 'UNIQUE_PER_PRODUCT', 'UNIQUE_PER_POLICY', 'UNIQUE_PER_LICENSE',
] as const satisfies readonly PolicyMachineUniquenessStrategy[]
const MACHINE_MATCHING_STRATEGIES = ['MATCH_ANY', 'MATCH_TWO', 'MATCH_MOST', 'MATCH_ALL'] as const satisfies readonly PolicyMachineMatchingStrategy[]
const EXPIRATION_STRATEGIES = ['RESTRICT_ACCESS', 'REVOKE_ACCESS', 'MAINTAIN_ACCESS', 'ALLOW_ACCESS'] as const satisfies readonly PolicyExpirationStrategy[]
const EXPIRATION_BASES = [
  'FROM_CREATION', 'FROM_FIRST_VALIDATION', 'FROM_FIRST_ACTIVATION', 'FROM_FIRST_DOWNLOAD', 'FROM_FIRST_USE',
] as const satisfies readonly PolicyExpirationBasis[]
const RENEWAL_BASES = ['FROM_EXPIRY', 'FROM_NOW', 'FROM_NOW_IF_EXPIRED'] as const satisfies readonly PolicyRenewalBasis[]
const TRANSFER_STRATEGIES = ['RESET_EXPIRY', 'KEEP_EXPIRY'] as const satisfies readonly PolicyTransferStrategy[]
const AUTHENTICATION_STRATEGIES = ['TOKEN', 'LICENSE', 'MIXED', 'NONE'] as const satisfies readonly PolicyAuthenticationStrategy[]
const MACHINE_LEASING_STRATEGIES = ['PER_LICENSE', 'PER_USER'] as const satisfies readonly PolicyMachineLeasingStrategy[]
const PROCESS_LEASING_STRATEGIES = ['PER_MACHINE', 'PER_LICENSE', 'PER_USER'] as const satisfies readonly PolicyProcessLeasingStrategy[]
const OVERAGE_STRATEGIES = [
  'NO_OVERAGE', 'ALWAYS_ALLOW_OVERAGE', 'ALLOW_1_25X_OVERAGE', 'ALLOW_1_5X_OVERAGE', 'ALLOW_2X_OVERAGE',
] as const satisfies readonly PolicyOverageStrategy[]

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

const policySchema = z.object({
  name: z.string().trim().min(1, 'Policy name is required'),
  duration: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number of seconds'),
  maxMachines: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  maxProcesses: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  maxCores: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  maxUses: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number'),
  strict: z.boolean(),
  floating: z.boolean(),
  protected: z.boolean(),
  requireHeartbeat: z.boolean(),
  heartbeatDuration: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number of seconds'),
  heartbeatCullStrategy: z.enum(HEARTBEAT_CULL_STRATEGIES),
  heartbeatResurrectionStrategy: z.enum(HEARTBEAT_RESURRECTION_STRATEGIES),
  heartbeatBasis: z.enum(HEARTBEAT_BASES),
  machineUniquenessStrategy: z.enum(MACHINE_UNIQUENESS_STRATEGIES),
  machineMatchingStrategy: z.enum(MACHINE_MATCHING_STRATEGIES),
  expirationStrategy: z.enum(EXPIRATION_STRATEGIES),
  expirationBasis: z.enum(EXPIRATION_BASES),
  renewalBasis: z.enum(RENEWAL_BASES),
  transferStrategy: z.enum(TRANSFER_STRATEGIES),
  authenticationStrategy: z.enum(AUTHENTICATION_STRATEGIES),
  machineLeasingStrategy: z.enum(MACHINE_LEASING_STRATEGIES),
  processLeasingStrategy: z.enum(PROCESS_LEASING_STRATEGIES),
  overageStrategy: z.enum(OVERAGE_STRATEGIES),
  metadata: z.string().refine(isValidJsonOrEmpty, 'Must be valid JSON or empty'),
})

type PolicyFormValues = z.infer<typeof policySchema>

function policyToFormValues(policy: Policy): PolicyFormValues {
  const a = policy.attributes
  return {
    name: a.name,
    duration: a.duration?.toString() ?? '',
    maxMachines: a.maxMachines?.toString() ?? '',
    maxProcesses: a.maxProcesses?.toString() ?? '',
    maxCores: a.maxCores?.toString() ?? '',
    maxUses: a.maxUses?.toString() ?? '',
    strict: a.strict,
    floating: a.floating,
    protected: a.protected,
    requireHeartbeat: a.requireHeartbeat,
    heartbeatDuration: a.heartbeatDuration?.toString() ?? '',
    heartbeatCullStrategy: a.heartbeatCullStrategy,
    heartbeatResurrectionStrategy: a.heartbeatResurrectionStrategy,
    heartbeatBasis: a.heartbeatBasis,
    machineUniquenessStrategy: a.machineUniquenessStrategy,
    machineMatchingStrategy: a.machineMatchingStrategy,
    expirationStrategy: a.expirationStrategy,
    expirationBasis: a.expirationBasis,
    renewalBasis: a.renewalBasis,
    transferStrategy: a.transferStrategy,
    authenticationStrategy: a.authenticationStrategy,
    machineLeasingStrategy: a.machineLeasingStrategy,
    processLeasingStrategy: a.processLeasingStrategy,
    overageStrategy: a.overageStrategy,
    metadata: a.metadata && Object.keys(a.metadata).length > 0 ? JSON.stringify(a.metadata, null, 2) : '',
  }
}

/** Only the fields that actually changed, in the shape `policies.update` expects. */
function diffFormValues(values: PolicyFormValues, policy: Policy): Partial<PolicyMutableAttributes> {
  const original = policyToFormValues(policy)
  const updates: Partial<PolicyMutableAttributes> = {}

  if (values.name !== original.name) updates.name = values.name
  if (values.duration !== original.duration) {
    updates.duration = values.duration ? parseInt(values.duration, 10) : undefined
  }
  if (values.maxMachines !== original.maxMachines) {
    updates.maxMachines = values.maxMachines ? parseInt(values.maxMachines, 10) : undefined
  }
  if (values.maxProcesses !== original.maxProcesses) {
    updates.maxProcesses = values.maxProcesses ? parseInt(values.maxProcesses, 10) : undefined
  }
  if (values.maxCores !== original.maxCores) {
    updates.maxCores = values.maxCores ? parseInt(values.maxCores, 10) : undefined
  }
  if (values.maxUses !== original.maxUses) {
    updates.maxUses = values.maxUses ? parseInt(values.maxUses, 10) : undefined
  }
  if (values.strict !== original.strict) updates.strict = values.strict
  if (values.floating !== original.floating) updates.floating = values.floating
  if (values.protected !== original.protected) updates.protected = values.protected
  if (values.requireHeartbeat !== original.requireHeartbeat) updates.requireHeartbeat = values.requireHeartbeat
  if (values.heartbeatDuration !== original.heartbeatDuration) {
    updates.heartbeatDuration = values.heartbeatDuration ? parseInt(values.heartbeatDuration, 10) : undefined
  }
  if (values.heartbeatCullStrategy !== original.heartbeatCullStrategy) {
    updates.heartbeatCullStrategy = values.heartbeatCullStrategy
  }
  if (values.heartbeatResurrectionStrategy !== original.heartbeatResurrectionStrategy) {
    updates.heartbeatResurrectionStrategy = values.heartbeatResurrectionStrategy
  }
  if (values.heartbeatBasis !== original.heartbeatBasis) updates.heartbeatBasis = values.heartbeatBasis
  if (values.machineUniquenessStrategy !== original.machineUniquenessStrategy) {
    updates.machineUniquenessStrategy = values.machineUniquenessStrategy
  }
  if (values.machineMatchingStrategy !== original.machineMatchingStrategy) {
    updates.machineMatchingStrategy = values.machineMatchingStrategy
  }
  if (values.expirationStrategy !== original.expirationStrategy) updates.expirationStrategy = values.expirationStrategy
  if (values.expirationBasis !== original.expirationBasis) updates.expirationBasis = values.expirationBasis
  if (values.renewalBasis !== original.renewalBasis) updates.renewalBasis = values.renewalBasis
  if (values.transferStrategy !== original.transferStrategy) updates.transferStrategy = values.transferStrategy
  if (values.authenticationStrategy !== original.authenticationStrategy) {
    updates.authenticationStrategy = values.authenticationStrategy
  }
  if (values.machineLeasingStrategy !== original.machineLeasingStrategy) {
    updates.machineLeasingStrategy = values.machineLeasingStrategy
  }
  if (values.processLeasingStrategy !== original.processLeasingStrategy) {
    updates.processLeasingStrategy = values.processLeasingStrategy
  }
  if (values.overageStrategy !== original.overageStrategy) updates.overageStrategy = values.overageStrategy
  if (values.metadata !== original.metadata) {
    updates.metadata = values.metadata.trim() ? JSON.parse(values.metadata) : {}
  }

  return updates
}

interface EditPolicyDialogProps {
  policy: Policy
  open: boolean
  onOpenChange: (open: boolean) => void
  onPolicyUpdated: () => void
}

export function EditPolicyDialog({ policy, open, onOpenChange, onPolicyUpdated }: EditPolicyDialogProps) {
  const api = getKeygenApi()

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: policyToFormValues(policy),
  })

  // Re-sync when a different policy is opened (dialog instance is reused).
  useEffect(() => {
    if (open) {
      form.reset(policyToFormValues(policy))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy])

  const requireHeartbeat = form.watch('requireHeartbeat')

  const onSubmit = async (values: PolicyFormValues) => {
    try {
      const updates = diffFormValues(values, policy)

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        onOpenChange(false)
        return
      }

      await api.policies.update(policy.id, updates)
      toast.success('Policy updated successfully')
      onPolicyUpdated()
      onOpenChange(false)
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Policy')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Policy
          </DialogTitle>
          <DialogDescription>
            Update this policy&apos;s rules and constraints. The product it belongs to cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Standard License Policy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 86400 (1 day)" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Limits</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="maxMachines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Machines</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxProcesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Processes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxCores"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Cores</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Uses</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Default limits for licenses under this policy — a license can override Max Machines individually.
              </p>
            </div>

            {/* Policy Type */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Policy Type</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="strict"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label className="font-normal">Strict validation</Label>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="floating"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label className="font-normal">Floating license</Label>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="protected"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <Label className="font-normal">Write-protected</Label>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Heartbeat Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Heartbeat Settings</h4>
              <FormField
                control={form.control}
                name="requireHeartbeat"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <Label className="font-normal">Require heartbeat</Label>
                  </FormItem>
                )}
              />

              {requireHeartbeat && (
                <div className="grid grid-cols-3 gap-4 ml-6">
                  <FormField
                    control={form.control}
                    name="heartbeatDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heartbeat Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heartbeatCullStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cull Strategy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DEACTIVATE_DEAD">Deactivate Dead</SelectItem>
                            <SelectItem value="KEEP_DEAD">Keep Dead</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heartbeatResurrectionStrategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resurrection Strategy</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NO_REVIVE">No Revive</SelectItem>
                            <SelectItem value="1_MINUTE_REVIVE">1 Minute</SelectItem>
                            <SelectItem value="2_MINUTE_REVIVE">2 Minutes</SelectItem>
                            <SelectItem value="5_MINUTE_REVIVE">5 Minutes</SelectItem>
                            <SelectItem value="10_MINUTE_REVIVE">10 Minutes</SelectItem>
                            <SelectItem value="15_MINUTE_REVIVE">15 Minutes</SelectItem>
                            <SelectItem value="ALWAYS_REVIVE">Always Revive</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="heartbeatBasis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Heartbeat Basis</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FROM_CREATION">From Creation</SelectItem>
                            <SelectItem value="FROM_FIRST_PING">From First Ping</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Machine Matching */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Machine Matching</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="machineUniquenessStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uniqueness Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UNIQUE_PER_ACCOUNT">Unique Per Account</SelectItem>
                          <SelectItem value="UNIQUE_PER_PRODUCT">Unique Per Product</SelectItem>
                          <SelectItem value="UNIQUE_PER_POLICY">Unique Per Policy</SelectItem>
                          <SelectItem value="UNIQUE_PER_LICENSE">Unique Per License</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machineMatchingStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matching Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MATCH_ANY">Match Any</SelectItem>
                          <SelectItem value="MATCH_TWO">Match Two</SelectItem>
                          <SelectItem value="MATCH_MOST">Match Most</SelectItem>
                          <SelectItem value="MATCH_ALL">Match All</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Strategies */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expirationStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RESTRICT_ACCESS">Restrict Access</SelectItem>
                          <SelectItem value="REVOKE_ACCESS">Revoke Access</SelectItem>
                          <SelectItem value="MAINTAIN_ACCESS">Maintain Access</SelectItem>
                          <SelectItem value="ALLOW_ACCESS">Allow Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expirationBasis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Basis</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FROM_CREATION">From Creation</SelectItem>
                          <SelectItem value="FROM_FIRST_VALIDATION">From First Validation</SelectItem>
                          <SelectItem value="FROM_FIRST_ACTIVATION">From First Activation</SelectItem>
                          <SelectItem value="FROM_FIRST_DOWNLOAD">From First Download</SelectItem>
                          <SelectItem value="FROM_FIRST_USE">From First Use</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="renewalBasis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal Basis</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FROM_EXPIRY">From Expiry</SelectItem>
                          <SelectItem value="FROM_NOW">From Now</SelectItem>
                          <SelectItem value="FROM_NOW_IF_EXPIRED">From Now If Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transferStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transfer Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="RESET_EXPIRY">Reset Expiry</SelectItem>
                          <SelectItem value="KEEP_EXPIRY">Keep Expiry</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="authenticationStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TOKEN">Token</SelectItem>
                          <SelectItem value="LICENSE">License</SelectItem>
                          <SelectItem value="MIXED">Mixed</SelectItem>
                          <SelectItem value="NONE">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machineLeasingStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine Leasing Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PER_LICENSE">Per License</SelectItem>
                          <SelectItem value="PER_USER">Per User</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="processLeasingStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Process Leasing Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PER_MACHINE">Per Machine</SelectItem>
                          <SelectItem value="PER_LICENSE">Per License</SelectItem>
                          <SelectItem value="PER_USER">Per User</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overageStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overage Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NO_OVERAGE">No Overage</SelectItem>
                          <SelectItem value="ALLOW_1_25X_OVERAGE">Allow 1.25x Overage</SelectItem>
                          <SelectItem value="ALLOW_1_5X_OVERAGE">Allow 1.5x Overage</SelectItem>
                          <SelectItem value="ALLOW_2X_OVERAGE">Allow 2x Overage</SelectItem>
                          <SelectItem value="ALWAYS_ALLOW_OVERAGE">Always Allow Overage</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Metadata */}
            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metadata (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{&quot;description&quot;: &quot;Policy description&quot;}'
                      rows={3}
                      className="font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
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
