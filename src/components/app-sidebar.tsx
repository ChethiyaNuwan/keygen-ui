"use client"

import * as React from "react"
import {
  IconKey,
  IconDeviceDesktop,
  IconUsers,
  IconPackage,
  IconShield,
  IconChartBar,
  IconSettings,
  IconUsersGroup,
  IconShieldCheck,
  IconWebhook,
  IconRocket,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SidebarEdgeToggle } from "@/components/sidebar-edge-toggle"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconChartBar,
    },
    {
      title: "Licenses",
      url: "/licenses",
      icon: IconKey,
    },
    {
      title: "Machines",
      url: "/machines", 
      icon: IconDeviceDesktop,
    },
    {
      title: "Products",
      url: "/products",
      icon: IconPackage,
    },
    {
      title: "Releases",
      url: "/releases",
      icon: IconRocket,
    },
    {
      title: "Policies",
      url: "/policies",
      icon: IconShield,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: IconUsersGroup,
    },
    {
      title: "Entitlements",
      url: "/entitlements",
      icon: IconShieldCheck,
    },
    {
      title: "Webhooks",
      url: "/webhooks",
      icon: IconWebhook,
    },
    {
      title: "Users",
      url: "/users",
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    // collapsible="icon": the trigger shrinks the sidebar to icons rather than
    // hiding it entirely, so navigation stays reachable when collapsed.
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconKey className="!size-7" />
                <span className="text-xl font-semibold tracking-tight">Keygen</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      {/* The single collapse/expand control on desktop. (No SidebarRail: it is
          positioned against the padded container, so it sits off the panel edge
          in the inset variant — and the toggle already covers the job.) */}
      <SidebarEdgeToggle />
    </Sidebar>
  )
}
