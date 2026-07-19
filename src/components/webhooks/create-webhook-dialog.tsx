'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, X } from 'lucide-react'
import { handleFormError } from '@/lib/utils/error-handling'

const webhookSchema = z.object({
  url: z.string().trim().min(1, 'Webhook endpoint URL is required').url('Please enter a valid URL'),
  subscriptions: z.array(z.string()).min(1, 'At least one event must be selected'),
})

type WebhookFormValues = z.infer<typeof webhookSchema>

const defaultValues: WebhookFormValues = {
  url: '',
  subscriptions: [],
}

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWebhookCreated: () => void
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  onWebhookCreated
}: CreateWebhookDialogProps) {
  const [customEvent, setCustomEvent] = useState('')

  const api = getKeygenApi()

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues,
  })

  // Group events by resource for better organization
  const eventGroups = api.webhooks.getEventsByCategory()
  const knownEvents = new Set(api.webhooks.getAvailableEvents())
  const subscriptions = form.watch('subscriptions')
  const customSubscriptions = subscriptions.filter((event) => !knownEvents.has(event))

  const onSubmit = async (values: WebhookFormValues) => {
    try {
      await api.webhooks.create({
        url: values.url,
        subscriptions: values.subscriptions,
      })

      form.reset(defaultValues)
      setCustomEvent('')

      onWebhookCreated()
    } catch (error: unknown) {
      handleFormError(error, 'Webhook')
    }
  }

  const handleEventToggle = (event: string, checked: boolean) => {
    form.setValue('subscriptions', checked
      ? [...subscriptions, event]
      : subscriptions.filter(e => e !== event))
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

  const loading = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Height/scroll come from DialogContent itself, so the footer stays pinned. */}
      <DialogContent className="max-w-4xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive real-time event notifications.
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
                {loading ? 'Creating...' : 'Create Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
