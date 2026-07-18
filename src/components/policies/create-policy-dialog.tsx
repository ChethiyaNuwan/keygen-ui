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
import { Product } from '@/lib/types/keygen'
import { PolicyMutableAttributes } from '@/lib/api/resources/policies'
import { handleFormError, handleLoadError } from '@/lib/utils/error-handling'

// Canonical enum values per https://keygen.sh/docs/api/policies/ — the
// subset this create form actually surfaces (edit-policy-dialog covers the
// full set for existing policies).
const HEARTBEAT_CULL_STRATEGIES = ['DEACTIVATE_DEAD', 'KEEP_DEAD'] as const
const HEARTBEAT_BASES = ['FROM_CREATION', 'FROM_FIRST_PING'] as const
const EXPIRATION_STRATEGIES = ['RESTRICT_ACCESS', 'REVOKE_ACCESS', 'MAINTAIN_ACCESS'] as const
const AUTHENTICATION_STRATEGIES = ['TOKEN', 'LICENSE', 'MIXED', 'NONE'] as const
const OVERAGE_STRATEGIES = [
  'NO_OVERAGE', 'ALWAYS_ALLOW_OVERAGE', 'ALLOW_1_25X_OVERAGE', 'ALLOW_1_5X_OVERAGE', 'ALLOW_2X_OVERAGE',
] as const

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
  strict: z.boolean(),
  floating: z.boolean(),
  protected: z.boolean(),
  requireHeartbeat: z.boolean(),
  heartbeatDuration: z.string().refine(isValidPositiveIntOrEmpty, 'Must be a whole number of seconds'),
  heartbeatCullStrategy: z.enum(HEARTBEAT_CULL_STRATEGIES),
  heartbeatBasis: z.enum(HEARTBEAT_BASES),
  expirationStrategy: z.enum(EXPIRATION_STRATEGIES),
  authenticationStrategy: z.enum(AUTHENTICATION_STRATEGIES),
  overageStrategy: z.enum(OVERAGE_STRATEGIES),
  metadata: z.string().refine(isValidJsonOrEmpty, 'Must be valid JSON or empty'),
})

type PolicyFormValues = z.infer<typeof policySchema>

const defaultValues: PolicyFormValues = {
  name: '',
  productId: '',
  duration: '',
  strict: false,
  floating: false,
  protected: false,
  requireHeartbeat: false,
  heartbeatDuration: '3600',
  heartbeatCullStrategy: 'DEACTIVATE_DEAD',
  heartbeatBasis: 'FROM_CREATION',
  expirationStrategy: 'RESTRICT_ACCESS',
  authenticationStrategy: 'TOKEN',
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

      if (values.strict) policyData.strict = true
      if (values.floating) policyData.floating = true
      if (values.protected) policyData.protected = true

      if (values.requireHeartbeat) {
        policyData.requireHeartbeat = true
        if (values.heartbeatDuration) {
          policyData.heartbeatDuration = parseInt(values.heartbeatDuration, 10)
        }
        policyData.heartbeatCullStrategy = values.heartbeatCullStrategy
        policyData.heartbeatBasis = values.heartbeatBasis
      }

      // These strategy fields are always sent — they're permitted params
      // (verified against PoliciesController's typed_params) and the form
      // always has a value for them, unlike the optional fields above.
      policyData.authenticationStrategy = values.authenticationStrategy
      policyData.expirationStrategy = values.expirationStrategy
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
