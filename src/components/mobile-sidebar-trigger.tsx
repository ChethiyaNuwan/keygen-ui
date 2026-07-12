"use client"

import { IconMenu2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

/**
 * Floating button that opens the sidebar on mobile.
 *
 * On mobile the sidebar is a sheet with no persistent rail, so without this
 * there would be no way to reopen it once dismissed (the desktop header that
 * used to hold the trigger is gone).
 */
export function MobileSidebarTrigger() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar()

  if (!isMobile || openMobile) return null

  return (
    <Button
      size="icon"
      onClick={() => setOpenMobile(true)}
      className="fixed right-5 bottom-5 z-40 size-11 rounded-full shadow-lg md:hidden"
      aria-label="Open navigation"
    >
      <IconMenu2 className="size-5" />
    </Button>
  )
}
