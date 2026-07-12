"use client"

import { usePathname } from "next/navigation"

/**
 * Fades page content in on navigation.
 *
 * Re-keying on the pathname remounts the subtree, which restarts the enter
 * animation — without it React would reuse the DOM and nothing would animate.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    // Carries the layout's own column/gap: pages (the dashboard especially) rely
    // on their sections being spaced children of a flex column, and wrapping
    // them in a plain div would swallow that spacing.
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-1 flex flex-1 flex-col gap-4 duration-300 ease-out motion-reduce:animate-none md:gap-6"
    >
      {children}
    </div>
  )
}
