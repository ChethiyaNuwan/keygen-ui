import { AppSidebar } from "@/components/app-sidebar"
import { PageTransition } from "@/components/page-transition"
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      {/* The card is pinned to the viewport (minus the inset variant's m-2) and
          scrolls its own content, so the sidebar and the card's edges stay put
          instead of the whole page moving. */}
      <SidebarInset className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]">
        {/* No header: the collapse control sits beside the brand in the sidebar,
            and each page renders its own title. */}
        <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <PageTransition>{children}</PageTransition>
            </div>
          </div>
        </div>
      </SidebarInset>
      <MobileSidebarTrigger />
    </SidebarProvider>
  )
}
