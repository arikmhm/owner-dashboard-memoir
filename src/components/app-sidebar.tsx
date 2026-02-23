"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MonitorSmartphone,
  Layers,
  ReceiptText,
  Wallet,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { dummyOwner, dummySubscription, dummyPlans } from "@/lib/dummy-data";

function SidebarToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-950 hover:border-zinc-400 transition-colors z-20"
      aria-label={open ? "Tutup sidebar" : "Buka sidebar"}
    >
      {open ? (
        <ChevronLeft className="h-3 w-3" />
      ) : (
        <ChevronRight className="h-3 w-3" />
      )}
    </button>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kiosks", label: "Kiosk", icon: MonitorSmartphone },
  { href: "/templates", label: "Template", icon: Layers },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo + Toggle */}
      <SidebarHeader className="relative px-4 py-4 overflow-visible">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center pr-2">
          {/* Expanded: full logo + subtitle */}
          <span className="text-base font-semibold tracking-tight text-zinc-950 group-data-[collapsible=icon]:hidden">
            memoir<span className="text-zinc-400">.</span>
          </span>
          <span className="text-[11px] text-zinc-400 group-data-[collapsible=icon]:hidden whitespace-nowrap">
            | owner dashboard system
          </span>
          {/* Collapsed: single letter */}
          <span className="hidden text-base font-semibold text-zinc-950 group-data-[collapsible=icon]:block">
            m
          </span>
        </div>
        <SidebarToggle />
      </SidebarHeader>

      <Separator />

      {/* Navigation */}
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={
                        isActive
                          ? "bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white"
                          : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — Owner info */}
      <SidebarFooter className="px-3 py-3">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-zinc-200 text-zinc-700 text-xs font-medium">
              {dummyOwner._initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-zinc-900 truncate">
              {dummyOwner._display_name}
            </span>
            <span className="text-[10px] text-zinc-400 truncate">
              Plan {dummyPlans.find((p) => p.id === dummySubscription.plan_id)?.name}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
