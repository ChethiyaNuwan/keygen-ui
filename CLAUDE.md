# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keygen-UI is a comprehensive frontend interface for Keygen API licensing management. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4, it provides complete CRUD operations for licenses, machines, products, policies, and users.

**API Integration**: Connected to Keygen instance via `NEXT_PUBLIC_KEYGEN_API_URL`
**Authentication**: Fully implemented with protected routes

## Development Commands

**IMPORTANT: This project uses PNPM as the package manager. Always use pnpm commands.**

```bash
# Development server with Turbopack
pnpm dev

# Production build with Turbopack
pnpm build

# Start production server
pnpm start

# Run ESLint
pnpm lint

# TypeScript type checking
pnpm typecheck

# Install new dependencies
pnpm add <package-name>

# Install shadcn/ui components (REQUIRED for UI work)
npx shadcn@latest add <component-name>
```

## Architecture & Structure

### Tech Stack
- **Framework**: Next.js 15 with App Router and Turbopack
- **UI**: React 19 + Tailwind CSS v4 + shadcn/ui (New York style)
- **Language**: TypeScript with strict mode
- **Package Manager**: PNPM (REQUIRED - never use npm or yarn)
- **API Client**: Custom TypeScript client with full type safety
- **Authentication**: React Context + localStorage with protected routes
- **State Management**: React Context for auth; `usePaginatedList` (custom hook, not SWR/React
  Query) owns list-page fetch/pagination state
- **Icons**: Lucide React
- **Notifications**: Sonner toast notifications

### Key Configuration
- **Path Aliases**: `@/*` maps to `./src/*`
- **shadcn/ui**: Configured with components.json for New York style, CSS variables, and component installation
- **Tailwind CSS v4**: Using new PostCSS-based configuration
- **Utilities**: `cn()` function in `src/lib/utils.ts` for className merging

### Project Structure
```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (dashboard)/        # Dashboard layout group
│   │   ├── dashboard/      # Main dashboard page
│   │   ├── licenses/       # License management
│   │   ├── machines/       # Machine monitoring
│   │   ├── products/       # Product management
│   │   ├── policies/       # Policy management
│   │   ├── groups/         # Group management
│   │   ├── entitlements/   # Entitlement management
│   │   ├── webhooks/       # Webhook endpoint management
│   │   ├── releases/       # Release management
│   │   ├── users/          # User administration
│   │   ├── logs/           # Event log + request log viewer
│   │   ├── profile/        # Signed-in user's own profile/password
│   │   ├── settings/       # Account-wide API token management
│   │   └── layout.tsx      # Dashboard layout with sidebar
│   ├── login/              # Authentication pages
│   ├── api/                # Proxy routes (Keygen API + auth cookie handling)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── hooks/                  # use-paginated-list, use-debounce
├── lib/                    # Utility functions and shared code
│   ├── api/                # Keygen API client
│   │   ├── client.ts       # Main API client — throws real Error subclasses,
│   │   │                     see src/lib/types/errors.ts
│   │   ├── index.ts        # KeygenApi facade — one property per resource
│   │   └── resources/      # One class per resource: licenses, machines,
│   │                         users, policies, products, groups, entitlements,
│   │                         webhooks, releases, releaseMetadata, artifacts,
│   │                         requestLogs, eventLogs, search, passwords, tokens
│   ├── auth/               # Authentication context and utilities
│   ├── types/               # TypeScript type definitions (keygen.ts, errors.ts)
│   └── utils/               # formatDate/formatDateTime (format.ts),
│                              error-handling.ts (handleCrudError/
│                              handleFormError/handleLoadError — always go
│                              through these, never toast.error a caught error
│                              directly)
└── components/              # React components
    ├── ui/                  # shadcn/ui components
    ├── shared/               # PaginationControls, TableSkeleton, EmptyState,
    │                           ConfirmDialog, StatusBadge — see "List pages"
    │                           and "Dialogs" conventions below before adding
    │                           a new one
    ├── auth/                  # Authentication components
    └── licenses/, machines/, products/, policies/, groups/, entitlements/,
        webhooks/, releases/, users/, logs/, profile/, settings/
                                # One directory per resource: a
                                  *-management.tsx list page plus
                                  create-/edit-/*-details-dialog.tsx files
```

## Implementation Guidelines

### MANDATORY Requirements

1. **Package Manager**: ALWAYS use `pnpm` - never npm or yarn
2. **UI Components**: MUST use shadcn/ui for all UI components
3. **TypeScript**: All code must be fully typed
4. **API Integration**: Use existing Keygen API client (`src/lib/api/`)
5. **Authentication**: Use existing auth context (`src/lib/auth/context.tsx`)

### shadcn/ui Component Installation

**REQUIRED for all UI work:**
```bash
npx shadcn@latest add [component-name]
```

Components are installed to `@/components/ui/` with New York style and CSS variables.

### Coding Standards

1. **File Naming**: Use kebab-case for files (e.g., `license-management.tsx`)
2. **Component Naming**: Use PascalCase for components (e.g., `LicenseManagement`)
3. **Client Components**: Add `'use client'` directive when using hooks or browser APIs
4. **Error Handling**: Never catch-and-`toast.error` directly — always go through
   `handleLoadError`/`handleCrudError`/`handleFormError` from
   `@/lib/utils/error-handling` (see API Integration Pattern below). They know how to
   turn a 404/422/403/network error into the right message and, for `handleCrudError`,
   call an `onNotFound`/`onValidation` callback so the caller can react (close a dialog,
   refresh a list, etc.).
5. **Loading States**: Always show loading states during API calls
6. **Forms**: Every form uses `react-hook-form` + `zod` — no `useState`-per-field forms.
   See Component Structure below. The one deliberate exception is a widget with a single
   action input that isn't really "a form" (e.g. a search box, a relationship-edit
   dropdown) — those can stay plain `useState`.
7. **Lists**: Every resource list page uses `usePaginatedList` (from `@/hooks`) plus the
   shared `PaginationControls`/`TableSkeleton`/`EmptyState` components — never a
   hand-rolled `useState` page/loading/data trio. See Component Structure below.
   **Before adding a client-side filter dropdown, verify the equivalent Keygen scope
   actually exists** (check the resource's `*_controller.rb` for a matching `has_scope`,
   or the model for a `search_*` scope if it's filtering via `POST /search`) — several
   filters in this codebase silently returned nothing, or matched the wrong data, because
   the server had no matching scope, or the client sent a differently-cased value than the
   scope expected. When no scope exists, drop the filter rather than fake it client-side
   over a partial page of results.

### API Integration Pattern

```typescript
import { getKeygenApi } from '@/lib/api'
import { handleLoadError } from '@/lib/utils/error-handling'

const api = getKeygenApi()

try {
  const response = await api.licenses.list({ page: { size: 25, number: 1 } })
  setData(response.data || [])
} catch (error: unknown) {
  handleLoadError(error, 'licenses')
}
```

For mutations, use `handleCrudError` (update/delete — knows about 404/422/403) or
`handleFormError` (create — same, tuned for form submission):

```typescript
try {
  await api.licenses.delete(license.id)
  toast.success('License deleted successfully')
} catch (error: unknown) {
  handleCrudError(error, 'delete', 'License', {
    onNotFound: () => loadLicenses(), // it's already gone — just refresh
  })
}
```

### Component Structure

List pages fetch through `usePaginatedList`, which owns page/pageSize/totalCount/loading
and takes a `fetcher(page, pageSize)` closure — the fetcher must never throw; catch and
call `handleLoadError`, then resolve to `{ data: [], meta: { count: 0 } }`:

```typescript
'use client'

import { useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { KeygenListResponse, License } from '@/lib/types/keygen'
import { handleLoadError } from '@/lib/utils/error-handling'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { TableSkeleton } from '@/components/shared/table-skeleton'
import { EmptyState } from '@/components/shared/empty-state'

export function ExampleManagement() {
  const api = getKeygenApi()

  const fetchItems = useCallback(async (page: number, pageSize: number): Promise<KeygenListResponse<License>> => {
    try {
      return await api.licenses.list({ page: { size: pageSize, number: page } })
    } catch (error: unknown) {
      handleLoadError(error, 'licenses')
      return { data: [], meta: { count: 0 } }
    }
  }, [api.licenses])

  const { data, loading, page, setPage, pageSize, setPageSize, totalCount, totalPages } =
    usePaginatedList({ fetcher: fetchItems })

  // Render <TableSkeleton> while loading, <EmptyState> when data.length === 0,
  // <PaginationControls currentPage={page} onPageChange={setPage} ... /> below the table.
}
```

Dialogs use `react-hook-form` + `zod`, with the schema and a `defaultValues`/
`xToFormValues` mapper in the same file:

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { getKeygenApi } from '@/lib/api'
import { handleFormError } from '@/lib/utils/error-handling'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
})
type FormValues = z.infer<typeof schema>

export function CreateThingDialog({ onCreated }: { onCreated?: () => void }) {
  const api = getKeygenApi()
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } })

  const onSubmit = async (values: FormValues) => {
    try {
      await api.things.create(values)
      form.reset()
      onCreated?.()
    } catch (error: unknown) {
      handleFormError(error, 'Thing')
    }
  }

  const loading = form.formState.isSubmitting
  // <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}>
  //   <FormField control={form.control} name="name" render={({ field }) => (
  //     <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
  //   )} />
  // </form></Form>
}
```

## Environment Configuration

The application requires only Keygen API connection settings:

```env
NEXT_PUBLIC_KEYGEN_API_URL=https://your-keygen-host.com/v1
NEXT_PUBLIC_KEYGEN_SINGLEPLAYER=true  # For Keygen CE singleplayer mode
```

Authentication is handled client-side — the user enters their Keygen credentials on the login page, which are exchanged for an API token via the proxy route. No server-side auth secrets are needed.

## Docker Deployment

```bash
# Build and deploy (from source repo)
./deploy.sh  # Auto-bumps version, builds, pushes to registry, restarts container

# Manual build
docker build -t keygen-ui .
docker run -p 9010:3000 -e NEXT_PUBLIC_KEYGEN_API_URL=https://your-host/v1 keygen-ui
```

Production runs from `/opt/docker/keygen-ui/` (deploy-only dir with docker-compose.yml, .env, no source code).

## Implemented Features

### ✅ Complete Features
- **Authentication System** (`/login`) - Login/logout, forgot-password flow, protected routes
- **Dashboard** (`/dashboard`) - Real-time analytics with Keygen API data
- **License Management** (`/dashboard/licenses`) - CRUD, activation tokens, entitlement/user attachment,
  license-file checkout, server-side search + pagination
- **Machine Management** (`/dashboard/machines`) - Activate/deactivate, ping, server-side pagination + search
- **Product Management** (`/dashboard/products`) - Product lifecycle, product-scoped API tokens
- **Policy Management** (`/dashboard/policies`) - Full policy rule/constraint editing
- **Group Management** (`/dashboard/groups`) - Group CRUD, user/license assignment
- **Entitlement Management** (`/dashboard/entitlements`) - Feature toggle management and license association
- **Webhook Management** (`/dashboard/webhooks`) - Endpoint configuration, event subscriptions, test delivery
- **Release Management** (`/dashboard/releases`) - Draft/publish/yank releases, artifact upload
- **User Management** (`/dashboard/users`) - User administration with roles, server-side pagination + search
- **Logs** (`/dashboard/logs`) - Event log and request log viewers
- **Profile** (`/dashboard/profile`) - Signed-in user's own details and password change
- **Settings** (`/dashboard/settings`) - Account-wide API token management

### Available API Resources
`getKeygenApi()` returns one property per resource — see `src/lib/api/index.ts` for the
authoritative list: `licenses`, `machines`, `users`, `policies`, `products`, `groups`,
`entitlements`, `webhooks`, `releases`, `releaseMetadata`, `artifacts`, `requestLogs`,
`eventLogs`, `search` (the `POST /search` endpoint — see `SearchableType` in
`resources/search.ts` for which resources support it), `passwords`, `tokens`.

## Important Notes

- **Real API Integration**: Connected to a live Keygen instance
- **Type Safety**: Complete TypeScript coverage with strict mode
- **Performance**: Optimized with Turbopack bundling
- **Responsive Design**: Mobile-first approach with Tailwind CSS v4
- **Error Handling**: `client.ts` throws real `Error` subclasses (`KeygenApiError`,
  `NetworkError`, `AuthError`, `ParseError`, `AppError` — see `src/lib/types/errors.ts`);
  always go through `handleCrudError`/`handleFormError`/`handleLoadError`
  (`src/lib/utils/error-handling.ts`) rather than inspecting a caught error directly.
- **Wire-format traps**: several Keygen resource attributes serialize as uppercase Ruby
  symbols server-side (e.g. `status` on `License` and `User`) even though it's tempting to
  guess lowercase — check the actual serializer (`app/serializers/*.rb` in
  `keygen-sh/keygen-api`) before typing or comparing a new enum-like attribute.

## 🤖 Agentic Development Patterns & Troubleshooting

### Critical Implementation Lessons Learned

#### 1. **Keygen API Parameter Constraints**
**Issue**: Policy creation failed with "unpermitted parameter" errors
**Root Cause**: Sending advanced strategy parameters during creation
**Solution**: Use minimal approach - only send `name`, `duration` (optional), and product relationship
**Pattern**: Always start with minimal required fields, then add optional ones incrementally

```typescript
// ✅ CORRECT - Minimal policy creation
const policyData = {
  name: formData.name.trim()
}
// Add duration only if specified
if (formData.duration) {
  policyData.duration = parseInt(formData.duration)
}
```

#### 2. **Professional Dialog Patterns**
**Anti-Pattern**: Using browser `confirm()` and `alert()` popups, or a bespoke
`delete-*-dialog.tsx` per resource
**Best Practice**: Use the shared `ConfirmDialog` (`@/components/shared/confirm-dialog`) for
every delete confirmation — `description` accepts `React.ReactNode`, so resource-specific
warning copy (cascade behavior, etc.) still fits

```typescript
// ✅ CORRECT - shared ConfirmDialog, resource-specific copy
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [selectedItem, setSelectedItem] = useState<Item | null>(null)
const [deleting, setDeleting] = useState(false)

const confirmDeleteItem = async () => {
  if (!selectedItem) return
  try {
    setDeleting(true)
    await api.items.delete(selectedItem.id)
    toast.success('Item deleted successfully')
    setDeleteDialogOpen(false)
    await loadItems()
  } catch (error: unknown) {
    handleCrudError(error, 'delete', 'Item', {
      onNotFound: () => { setDeleteDialogOpen(false); loadItems() },
    })
  } finally {
    setDeleting(false)
  }
}

// <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
//   title="Delete Item" description={<>This will permanently remove <code>{selectedItem?.name}</code>...</>}
//   confirmLabel="Delete Item" destructive loading={deleting} onConfirm={confirmDeleteItem} />
```

#### 3. **API Error Handling Patterns**
**Critical**: Always route through `handleCrudError`/`handleFormError`/`handleLoadError`
(`@/lib/utils/error-handling`) instead of hand-checking `error.status` — they already know
the right message and `toast` behavior for 404/422/403/401/network errors, and
`handleCrudError`'s `onNotFound`/`onValidation`/`onForbidden` callbacks let the caller react
(close a dialog, refresh a list) without re-deriving the status check itself. See the API
Integration Pattern section above for the canonical shape. Only reach for `error-guards.ts`
(`isNotFoundError`, `getErrorStatus`, etc.) directly when you need a status check somewhere
that isn't a toast — everywhere else, the three `handle*Error` functions are the interface.

#### 4. **Empty Response Handling**
**Issue**: JSON parsing errors on DELETE requests (empty responses)
**Solution**: Handle empty responses gracefully in client

```typescript
// In client.ts - handle empty responses
try {
  data = await response.json()
} catch (jsonError) {
  if (response.ok && method === 'DELETE') {
    data = null // DELETE often returns empty body
  }
}
```

### Development Workflow Patterns

#### 1. **API-First Development**
1. Test API endpoint with minimal data using console/script
2. Implement API resource method
3. Build UI component with proper error handling
4. Add professional dialogs and loading states

#### 2. **Error-Driven Development**  
1. Implement basic functionality
2. Test with edge cases and invalid data
3. Handle all error scenarios with specific messages
4. Add loading states and success feedback

#### 3. **Progressive Enhancement**
1. Start with minimal required fields
2. Add optional fields incrementally
3. Test each addition separately
4. Maintain backwards compatibility

### Common Debugging Techniques

#### 1. **API Request Debugging**
```typescript
// Temporary logging for debugging
console.log('Sending data:', requestData)
console.log('API response:', response)
// Remove after debugging is complete
```

#### 2. **Authentication Debugging**
```typescript
// Check token presence and format
console.log('Token:', api.getToken()?.substring(0, 20) + '...')
// Verify token is being sent in requests
```

#### 3. **Form Data Debugging**
```typescript
// Log RHF's current values before API call
console.log('Form values before processing:', form.getValues())
console.log('Processed API payload:', processedData)
```

### Performance Optimization Patterns

#### 1. **Conditional Rendering**
```typescript
// Only render dialogs that need the selected item once it exists
{selectedItem && (
  <ConfirmDialog
    open={deleteDialogOpen}
    onOpenChange={setDeleteDialogOpen}
    title="Delete Item"
    description={<>This will permanently remove <code>{selectedItem.name}</code>.</>}
    confirmLabel="Delete Item"
    destructive
    onConfirm={confirmDeleteItem}
  />
)}
```

#### 2. **Efficient State Management**
```typescript
// Use single handler for multiple similar actions
const handleAction = (action: string, item: Item) => {
  switch (action) {
    case 'edit': handleEdit(item); break;
    case 'delete': handleDelete(item); break;
  }
}
```

### Testing Strategies

#### 1. **Console Testing Pattern**
Create isolated test scripts for complex API operations before implementing in UI:

```javascript
// Test in browser console first
async function testOperation() {
  const api = getKeygenApi()
  const result = await api.resource.operation(data)
  console.log('Result:', result)
}
```

#### 2. **Error Scenario Testing**
- Test with invalid data
- Test with missing required fields  
- Test with network failures
- Test with expired tokens