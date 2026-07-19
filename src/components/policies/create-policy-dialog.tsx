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
import { Plus } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  Product,
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
import { handleFormError, handleLoadError } from '@/lib/utils/error-handling'

// Canonical enum values per https://keygen.sh/docs/api/policies/, kept as
// `satisfies` against the shared Policy* types in keygen.ts so this file
// fails to compile if the two ever drift apart again. Same full set as
// edit-policy-dialog.tsx — verified live against policies_controller.rb's
// typed_params that every one of these is accepted on CREATE, not just
// update (an earlier, narrower version of this form assumed otherwise).
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
  productId: z.string().min(1, 'Please select a product'),
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

const defaultValues: PolicyFormValues = {
  name: '',
  productId: '',
  duration: '',
  maxMachines: '',
  maxProcesses: '',
  maxCores: '',
  maxUses: '',
  strict: false,
  floating: false,
  protected: false,
  requireHeartbeat: false,
  heartbeatDuration: '3600',
  heartbeatCullStrategy: 'DEACTIVATE_DEAD',
  heartbeatResurrectionStrategy: 'NO_REVIVE',
  heartbeatBasis: 'FROM_CREATION',
  machineUniquenessStrategy: 'UNIQUE_PER_LICENSE',
  machineMatchingStrategy: 'MATCH_ANY',
  expirationStrategy: 'RESTRICT_ACCESS',
  expirationBasis: 'FROM_CREATION',
  renewalBasis: 'FROM_EXPIRY',
  transferStrategy: 'RESET_EXPIRY',
  authenticationStrategy: 'TOKEN',
  machineLeasingStrategy: 'PER_LICENSE',
  processLeasingStrategy: 'PER_MACHINE',
  overageStrategy: 'NO_OVERAGE',
  metadata: '',
}

interface CreatePolicyDialogProps {
  onPolicyCreated?: () => void
}

export function CreatePolicyDialog({ onPolicyCreated }: CreatePolicyDialogProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const api = getKeygenApi()

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues,
  })

  // Load products when dialog opens
  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true)
      const response = await api.products.list({ limit: 50 })
      setProducts(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'products')
    } finally {
      setProductsLoading(false)
    }
  }, [api.products])

  useEffect(() => {
    if (open && products.length === 0) {
      loadProducts()
    }
  }, [open, products.length, loadProducts])

  const requireHeartbeat = form.watch('requireHeartbeat')

  const onSubmit = async (values: PolicyFormValues) => {
    try {
      // Build policy data with all user-selected options
      const policyData: Record<string, unknown> = {
        name: values.name,
        productId: values.productId,
      }

      if (values.duration.trim()) {
        policyData.duration = parseInt(values.duration, 10)
      }
      if (values.maxMachines.trim()) {
        policyData.maxMachines = parseInt(values.maxMachines, 10)
      }
      if (values.maxProcesses.trim()) {
        policyData.maxProcesses = parseInt(values.maxProcesses, 10)
      }
      if (values.maxCores.trim()) {
        policyData.maxCores = parseInt(values.maxCores, 10)
      }
      if (values.maxUses.trim()) {
        policyData.maxUses = parseInt(values.maxUses, 10)
      }

      if (values.strict) policyData.strict = true
      if (values.floating) policyData.floating = true
      if (values.protected) policyData.protected = true

      if (values.requireHeartbeat) {
        policyData.requireHeartbeat = true
        if (values.heartbeatDuration) {
          policyData.heartbeatDuration = parseInt(values.heartbeatDuration, 10)
        }
        policyData.heartbeatCullStrategy = values.heartbeatCullStrategy
        policyData.heartbeatResurrectionStrategy = values.heartbeatResurrectionStrategy
        policyData.heartbeatBasis = values.heartbeatBasis
      }

      // These strategy fields are always sent — they're permitted params
      // (verified against PoliciesController's typed_params, including on
      // CREATE) and the form always has a value for them, unlike the
      // optional fields above.
      policyData.machineUniquenessStrategy = values.machineUniquenessStrategy
      policyData.machineMatchingStrategy = values.machineMatchingStrategy
      policyData.authenticationStrategy = values.authenticationStrategy
      policyData.expirationStrategy = values.expirationStrategy
      policyData.expirationBasis = values.expirationBasis
      policyData.renewalBasis = values.renewalBasis
      policyData.transferStrategy = values.transferStrategy
      policyData.machineLeasingStrategy = values.machineLeasingStrategy
      policyData.processLeasingStrategy = values.processLeasingStrategy
      policyData.overageStrategy = values.overageStrategy

      if (values.metadata.trim()) {
        policyData.metadata = JSON.parse(values.metadata)
      }

      await api.policies.create(policyData as unknown as PolicyMutableAttributes & { productId: string })

      toast.success('Policy created successfully')
      setOpen(false)
      form.reset(defaultValues)
      onPolicyCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'Policy')
    }
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Create Policy">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Create Policy</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>
            Create a new licensing policy with specific rules and constraints for your products.
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
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={productsLoading ? 'Loading products...' : 'Select a product'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.attributes.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Choose which product this policy applies to</p>
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
              <div className="space-y-4">
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-6">
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                          <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                      placeholder='{&quot;description&quot;: &quot;Policy description&quot;, &quot;tags&quot;: [&quot;enterprise&quot;]}'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optional JSON metadata for the policy
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
