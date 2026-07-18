'use client'

import { RequestLog } from '@/lib/types/keygen'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface RequestLogDetailsSheetProps {
  log: RequestLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function statusVariant(status: number): 'default' | 'destructive' | 'secondary' {
  if (status >= 500) return 'destructive'
  if (status >= 400) return 'secondary'
  return 'default'
}

export function RequestLogDetailsSheet({ log, open, onOpenChange }: RequestLogDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {log && <Badge variant="outline">{log.attributes.method}</Badge>}
            <span className="truncate font-mono text-sm">{log?.attributes.url}</span>
          </SheetTitle>
          <SheetDescription>
            {log && (
              <>
                <Badge variant={statusVariant(log.attributes.status)} className="mr-2">
                  {log.attributes.status}
                </Badge>
                {formatDate(log.attributes.created)}
                {log.attributes.ip ? ` · ${log.attributes.ip}` : ''}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        {log && (
          <div className="space-y-4 px-4 pb-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Request Headers</h4>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(log.attributes.requestHeaders)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Request Body</h4>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(log.attributes.requestBody)}
              </pre>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Response Headers</h4>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(log.attributes.responseHeaders)}
              </pre>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Response Body</h4>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(log.attributes.responseBody)}
              </pre>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
