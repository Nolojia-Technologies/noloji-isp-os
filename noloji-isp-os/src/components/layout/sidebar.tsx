"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  Router,
  Map,
  UserCheck,
  CreditCard,
  Wifi,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  Search,
  MessageSquare,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    description: "Overview and analytics",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    description: "Manage customer accounts",
  },
  {
    title: "Devices",
    href: "/devices",
    icon: Router,
    description: "Network devices and provisioning",
  },
  {
    title: "GIS Map",
    href: "/gis",
    icon: Map,
    description: "Fiber network topology",
  },
  {
    title: "Technicians",
    href: "/technicians",
    icon: UserCheck,
    description: "Field technician management",
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
    description: "Invoices and payments",
  },
  {
    title: "Hotspot",
    href: "/hotspot",
    icon: Wifi,
    description: "WiFi hotspot management",
  },
  {
    title: "Packages",
    href: "/packages",
    icon: Layers,
    description: "Internet packages and pricing",
  },
  {
    title: "Routers",
    href: "/routers",
    icon: Router,
    description: "MikroTik routers management",
  },
  {
    title: "SMS",
    href: "/sms",
    icon: MessageSquare,
    description: "SMS messaging and credits",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    description: "Asset and inventory tracking",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Business intelligence",
  },
];

const secondaryItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System configuration",
  },
];

// ... imports

// ... navigationItems and secondaryItems definitions

interface SidebarContentProps {
  collapsed?: boolean;
}

export function SidebarContent({ collapsed = false }: SidebarContentProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return navigationItems;
    return navigationItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Noloji ISP</span>
          </div>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-4 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="ml-3 flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="h-px bg-border my-4" />

        {/* Secondary Navigation */}
        <nav className="space-y-1">
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <div className="ml-3 flex flex-col">
                    <span>{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile (collapsed state) */}
      {collapsed && (
        <div className="p-4 border-t border-border shrink-0">
          <Button variant="ghost" size="icon" className="w-full h-10">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-medium">
                A
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 z-40 h-full border-r border-border sidebar-transition",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Toggle Button (Desktop Only) */}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="absolute right-[-12px] top-6 h-6 w-6 rounded-full border bg-background shadow-md hidden lg:flex"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}

        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="absolute left-1/2 -translate-x-1/2 bottom-4 h-8 w-8 hidden lg:flex"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
      </div>
    </>
  );
}