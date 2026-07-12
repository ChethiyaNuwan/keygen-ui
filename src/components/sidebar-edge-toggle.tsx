"use client"

import { IconChevronLeft } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

/**
 * Arrow pinned to the sidebar's outer edge (desktop). Visible in both states —
 * it collapses the sidebar, and points the other way to reopen it — so there is
 * a single, always-present control instead of one that moves around.
 *
 * Must be rendered inside <Sidebar>, whose wrapper carries the `group` class
 * that the rotation below keys off.
 */
export function SidebarEdgeToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label="Toggle sidebar"
      title="Toggle sidebar"
      className={cn(
        // A tab straddling the sidebar panel's edge: tall, narrow, rounded on
        // the outer side. Anchored to the panel (sidebar-inner is relative), so
        // it sits on the sidebar's edge rather than the container's.
        // The collapsed container is a touch wider than the icon rail it holds,
        // so the panel edge lands slightly further out — nudge to match.
        "bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-sidebar-border absolute top-1/2 -right-2 z-30 hidden h-12 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-md border shadow-sm transition-colors group-data-[collapsible=icon]:-right-3.5 md:flex",
        className
      )}
    >
      <IconChevronLeft className="size-4 transition-transform duration-200 group-data-[collapsible=icon]:rotate-180" />
    </button>
  )
}
