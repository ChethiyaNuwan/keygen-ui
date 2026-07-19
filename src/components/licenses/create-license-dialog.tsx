'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Plus, HelpCircle, RefreshCcw, X } from 'lucide-react'
import { getKeygenApi } from '@/lib/api'
import { Entitlement, Group, Policy, User } from '@/lib/types/keygen'
import { handleFormError, handleLoadError } from '@/lib/utils/error-handling'
import { toast } from 'sonner'

function isValidNonNegativeIntOrEmpty(value: string): boolean {
  if (!value.trim()) return true
  return /^\d+$/.test(value.trim())
}

const licenseSchema = z.object({
  name: z.string(),
  policyId: z.string().min(1, 'Please select a policy'),
  userId: z.string(),
  groupId: z.string(),
  key: z.string(),
  protected: z.boolean(),
  permissions: z.string(),
  expiry: z.date().optional(),
  maxMachines: z.string().refine(isValidNonNegativeIntOrEmpty, 'Must be a whole number'),
  metadata: z.array(z.object({ key: z.string(), value: z.string() })),
  selectedUsers: z.array(z.string()),
  selectedEntitlements: z.array(z.string()),
})

type LicenseFormValues = z.infer<typeof licenseSchema>

const defaultValues: LicenseFormValues = {
  name: '',
  policyId: '',
  userId: '',
  groupId: '',
  key: '',
  protected: true,
  permissions: '',
  expiry: undefined,
  maxMachines: '',
  metadata: [],
  selectedUsers: [],
  selectedEntitlements: [],
}

interface CreateLicenseDialogProps {
  onLicenseCreated?: () => void
}

export function CreateLicenseDialog({ onLicenseCreated }: CreateLicenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [entitlementSearch, setEntitlementSearch] = useState('')

  const api = getKeygenApi()

  const form = useForm<LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues,
  })

  const { fields: metadataFields, append: appendMetadata, remove: removeMetadata } = useFieldArray({
    control: form.control,
    name: 'metadata',
  })

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingData(true)
      const [policiesResponse, usersResponse, groupsResponse, entitlementsResponse] = await Promise.all([
        api.policies.list({ limit: 100 }),
        api.users.list({ limit: 100 }),
        api.groups.list({ limit: 100 }),
        api.entitlements.list({ limit: 100 }),
      ])
      setPolicies(policiesResponse.data || [])
      setUsers(usersResponse.data || [])
      setGroups(groupsResponse.data || [])
      setEntitlements(entitlementsResponse.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'initial data')
    } finally {
      setLoadingData(false)
    }
  }, [api.policies, api.users, api.groups, api.entitlements])

  useEffect(() => {
    if (open) {
      loadInitialData()
    }
  }, [open, loadInitialData])

  const onSubmit = async (values: LicenseFormValues) => {
    try {
      const createRes = await api.licenses.create({
        policyId: values.policyId,
        userId: values.userId === 'none' ? undefined : values.userId || undefined,
        groupId: values.groupId === 'none' ? undefined : values.groupId || undefined,
        name: values.name || undefined,
        key: values.key || undefined,
        protected: values.protected,
        maxMachines: values.maxMachines ? parseInt(values.maxMachines, 10) : undefined,
        permissions: values.permissions
          ? values.permissions.split(',').map((p) => p.trim()).filter(Boolean)
          : undefined,
        expiry: values.expiry ? values.expiry.toISOString() : undefined,
        metadata: values.metadata.reduce((acc, kv) => {
          if (kv.key) acc[kv.key] = kv.value
          return acc
        }, {} as Record<string, string>),
      })

      const createdId = createRes.data?.id

      if (createdId && values.selectedEntitlements.length > 0) {
        await api.licenses.attachEntitlements(createdId, values.selectedEntitlements)
      }

      if (createdId && values.selectedUsers.length > 0) {
        // Best-effort: attach users if supported
        try {
          await api.licenses.attachUsers(createdId, values.selectedUsers)
        } catch (err) {
          console.warn('Attaching users failed or unsupported:', err)
        }
      }

      toast.success('License created successfully')
      setOpen(false)
      form.reset(defaultValues)
      setUserSearch('')
      setEntitlementSearch('')
      onLicenseCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'License', {
        customMessage: 'Failed to create license'
      })
    }
  }

  const randomKey = () => {
    // Simple aesthetically pleasing key generator: 5x5 uppercase blocks
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const block = () => Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    return [block(), block(), block(), block(), block()].join('-')
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {/* Icon-only on phones: the label pushes the header out of shape. */}
        <Button className="max-sm:size-9 max-sm:px-0" aria-label="Create License">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Create License</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>New License</DialogTitle>
          <DialogDescription>
            Create a license with attributes, metadata, and relationships.
          </DialogDescription>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading policies and users...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Attributes */}
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attributes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Name</FormLabel>
                          <span className="text-xs text-muted-foreground">Optional</span>
                        </div>
                        <FormControl>
                          <Input placeholder="Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Key</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Manually defining a key is optional</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="Key" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => form.setValue('key', randomKey())}
                            aria-label="Generate key"
                          >
                            <RefreshCcw className="size-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiry"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Expiry</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Leave blank for no expiry</TooltipContent>
                          </Tooltip>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP') : 'Never expires'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxMachines"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Max Machines (seats)</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Leave blank for unlimited, or to inherit the policy&apos;s limit</TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input type="number" min="0" placeholder="Leave empty for unlimited" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="protected"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex items-center gap-2 mt-6">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="flex items-center gap-1">
                            <Label className="font-normal">Protected</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="size-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Write-protect this license</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <div className="flex items-center gap-1">
                          <FormLabel>Permissions</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Comma-separated (e.g., *, machines:read)</TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input placeholder="Enter permissions…" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</div>
                <div className="space-y-2">
                  {metadataFields.length === 0 && (
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => appendMetadata({ key: '', value: '' })}
                    >
                      + New Key/Value Pair
                    </button>
                  )}
                  {metadataFields.length > 0 && (
                    <div className="space-y-2">
                      {metadataFields.map((field, idx) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                          <Input
                            className="col-span-5"
                            placeholder="Key"
                            {...form.register(`metadata.${idx}.key`)}
                          />
                          <Input
                            className="col-span-6"
                            placeholder="Value"
                            {...form.register(`metadata.${idx}.value`)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMetadata(idx)}
                            aria-label="Remove"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button type="button" variant="outline" onClick={() => appendMetadata({ key: '', value: '' })}>
                          Add Pair
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Relationships</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="policyId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Policy</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Required</TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a policy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {policies.map((policy) => (
                              <SelectItem key={policy.id} value={policy.id}>
                                {policy.attributes.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Group</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Choosing a group is optional</TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No group</SelectItem>
                            {groups.map((g) => (
                              <SelectItem key={g.id} value={g.id}>{String(g.attributes.name)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Owner</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Choosing an owner is optional</TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No owner</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.attributes.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Users multi-select */}
                  <FormField
                    control={form.control}
                    name="selectedUsers"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Users</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>Search for users by ID or email…</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="rounded-md border">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search users…"
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                            />
                          </div>
                          <ScrollArea className="h-40">
                            <div className="p-2 space-y-2">
                              {users
                                .filter((u) => {
                                  const q = userSearch.toLowerCase();
                                  const email = String(u.attributes.email || '').toLowerCase();
                                  return !q || email.includes(q) || u.id.includes(q);
                                })
                                .map((u) => (
                                  <label key={u.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={field.value.includes(u.id)}
                                      onCheckedChange={(v) =>
                                        field.onChange(
                                          v ? [...field.value, u.id] : field.value.filter((id) => id !== u.id)
                                        )
                                      }
                                    />
                                    <span>{u.attributes.email}</span>
                                  </label>
                                ))}
                              {users.length === 0 && (
                                <div className="text-xs text-muted-foreground">No users found</div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </FormItem>
                    )}
                  />

                  {/* Entitlements multi-select */}
                  <FormField
                    control={form.control}
                    name="selectedEntitlements"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <div className="flex items-center gap-1">
                          <FormLabel>Entitlements</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Entitlements will automatically be inherited from the policy (if any)
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="rounded-md border">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search entitlements…"
                              value={entitlementSearch}
                              onChange={(e) => setEntitlementSearch(e.target.value)}
                            />
                          </div>
                          <ScrollArea className="h-40">
                            <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {entitlements
                                .filter((ent) => {
                                  const q = entitlementSearch.toLowerCase();
                                  const name = String(ent.attributes.name || '').toLowerCase();
                                  const code = String(ent.attributes.code || '').toLowerCase();
                                  return !q || name.includes(q) || code.includes(q) || ent.id.includes(q);
                                })
                                .map((ent) => (
                                  <label key={ent.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={field.value.includes(ent.id)}
                                      onCheckedChange={(v) =>
                                        field.onChange(
                                          v ? [...field.value, ent.id] : field.value.filter((id) => id !== ent.id)
                                        )
                                      }
                                    />
                                    <span>
                                      {ent.attributes.name}
                                      <span className="text-muted-foreground"> · {ent.attributes.code}</span>
                                    </span>
                                  </label>
                                ))}
                              {entitlements.length === 0 && (
                                <div className="text-xs text-muted-foreground">No entitlements found</div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating…' : 'Create License'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
