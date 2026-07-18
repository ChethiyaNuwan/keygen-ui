'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getKeygenApi } from '@/lib/api'
import { Webhook } from '@/lib/types/keygen'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, X } from 'lucide-react'
import { handleCrudError } from '@/lib/utils/error-handling'

const webhookSchema = z.object({
  url: z.string().trim().min(1, 'Webhook URL is required').url('Please enter a valid URL'),
  subscriptions: z.array(z.string()).min(1, 'At least one event must be selected'),
  enabled: z.boolean(),
})

type WebhookFormValues = z.infer<typeof webhookSchema>

function webhookToFormValues(webhook: Webhook): WebhookFormValues {
  return {
    url: webhook.attributes.url,
    subscriptions: [...webhook.attributes.subscriptions],
    enabled: webhook.attributes.enabled,
  }
}

interface EditWebhookDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
  onWebhookUpdated: () => void
}

export function EditWebhookDialog({
  webhook,
  open,
  onOpenChange,
  onWebhookUpdated
}: EditWebhookDialogProps) {
  const [customEvent, setCustomEvent] = useState('')

  const api = getKeygenApi()

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: webhookToFormValues(webhook),
  })

  // Group events by resource for better organization
  const eventGroups = api.webhooks.getEventsByCategory()
  const knownEvents = new Set(api.webhooks.getAvailableEvents())
  const subscriptions = form.watch('subscriptions')
  const customSubscriptions = subscriptions.filter((event) => !knownEvents.has(event))

  // Initialize form data when webhook changes
  useEffect(() => {
    if (webhook) {
      form.reset(webhookToFormValues(webhook))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhook])

  const onSubmit = async (values: WebhookFormValues) => {
    try {
      await api.webhooks.update(webhook.id, {
        url: values.url,
        subscriptions: values.subscriptions,
        enabled: values.enabled
      })

      onWebhookUpdated()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'Webhook', {
        onNotFound: () => onWebhookUpdated()
      })
    }
  }

  const handleEventToggle = (event: string, checked: boolean) => {
    form.setValue('subscriptions', checked
      ? [...subscriptions, event]
      : subscriptions.filter(e => e !== event))
  }

  const handleSelectAllInGroup = (groupEvents: string[], checked: boolean) => {
    form.setValue('subscriptions', checked
      ? [...new Set([...subscriptions, ...groupEvents])]
      : subscriptions.filter(e => !groupEvents.includes(e)))
  }

  const isGroupFullySelected = (groupEvents: string[]) => {
    return groupEvents.every(event => subscriptions.includes(event))
  }

  const isGroupPartiallySelected = (groupEvents: string[]) => {
    return groupEvents.some(event => subscriptions.includes(event)) &&
           !isGroupFullySelected(groupEvents)
  }

  const handleAddCustomEvent = () => {
    const event = customEvent.trim()
    if (!event || subscriptions.includes(event)) return
    form.setValue('subscriptions', [...subscriptions, event])
    setCustomEvent('')
  }

  const handleRemoveCustomEvent = (event: string) => {
    form.setValue('subscriptions', subscriptions.filter(e => e !== event))
  }

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Webhook</DialogTitle>
              <DialogDescription>
                Update webhook endpoint configuration and event subscriptions.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Basic Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL *</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://your-app.com/webhooks/keygen"
                            disabled={loading}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          The URL where webhook events will be sent via HTTP POST.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={loading}
                          />
                        </FormControl>
                        <Label className="font-normal">Enable webhook</Label>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Event Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Subscriptions</CardTitle>
                  <CardDescription>
                    Select which events should trigger this webhook ({subscriptions.length} selected)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* No inner scroller: the dialog body scrolls, and nesting a
                      second one made the list fight the dialog for the wheel. */}
                  <div className="space-y-4">
                      {Object.entries(eventGroups).map(([resource, events]) => (
                        <div key={resource} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource}-all`}
                              checked={isGroupFullySelected(events)}
                              onCheckedChange={(checked) => handleSelectAllInGroup(events, checked as boolean)}
                              ref={(el: HTMLButtonElement | null) => {
                                if (el) {
                                  const input = el.querySelector('input')
                                  if (input) {
                                    input.indeterminate = isGroupPartiallySelected(events)
                                  }
                                }
                              }}
                            />
                            <Label htmlFor={`${resource}-all`} className="text-sm font-medium capitalize">
                              {resource} Events
                              <Badge variant="outline" className="ml-2">
                                {events.length}
                              </Badge>
                            </Label>
                          </div>
                          <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {events.map(event => (
                              <div key={event} className="flex items-start space-x-2">
                                <Checkbox
                                  id={event}
                                  className="mt-0.5 shrink-0"
                                  checked={subscriptions.includes(event)}
                                  onCheckedChange={(checked) => handleEventToggle(event, checked as boolean)}
                                />
                                {/* Event names are long unbroken tokens; let them wrap
                                    instead of overflowing the column. */}
                                <Label
                                  htmlFor={event}
                                  className="min-w-0 text-sm font-mono leading-snug break-all"
                                >
                                  {event}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {resource !== Object.keys(eventGroups)[Object.keys(eventGroups).length - 1] && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))}
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Custom Event</Label>
                        <p className="text-xs text-muted-foreground">
                          Not seeing an event you need? Add it by name — useful for events added to
                          Keygen after this list was last updated.
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. license.custom-event"
                            value={customEvent}
                            onChange={(e) => setCustomEvent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCustomEvent()
                              }
                            }}
                            className="font-mono text-sm"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={handleAddCustomEvent}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {customSubscriptions.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {customSubscriptions.map((event) => (
                              <Badge key={event} variant="secondary" className="gap-1 font-mono text-xs">
                                {event}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomEvent(event)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                  </div>
                </CardContent>
              </Card>
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
              <Button type="submit" disabled={loading || subscriptions.length === 0}>
                {loading ? 'Updating...' : 'Update Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
