"use client";

import * as React from "react";
import { Bell, Moon, Sun, User, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

// Mock KPI data - this will be replaced with real data from API
const mockKPIs = [
  { label: "Active Sessions", value: "1,247", change: "+12%" },
  { label: "Revenue (30d)", value: formatCurrency(2450000), change: "+8.2%" },
  { label: "Bandwidth Usage", value: "78.5%", change: "-2.1%" },
];

// Mock notifications - this will be replaced with real-time data
const mockNotifications = [
  { id: 1, title: "Router offline", message: "Device RT001 in Westlands", time: "2m ago", type: "error" },
  { id: 2, title: "Payment received", message: "Customer CUST-0045", time: "5m ago", type: "success" },
  { id: 3, title: "New customer", message: "Registration completed", time: "12m ago", type: "info" },
];

export function Header({ sidebarCollapsed, onToggleSidebar, className }: HeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const [globalSearch, setGlobalSearch] = React.useState("");
  const [unreadNotifications, setUnreadNotifications] = React.useState(3);

  const handleNotificationClick = () => {
    setUnreadNotifications(0);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border",
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left side - Mobile menu + KPIs */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* KPI Strip - Desktop only */}
          <div className="hidden lg:flex items-center space-x-6">
            {mockKPIs.map((kpi, index) => (
              <div key={index} className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{kpi.value}</span>
                  <Badge
                    variant={kpi.change.startsWith('+') ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {kpi.change}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Global Search */}
        <div className="hidden md:flex items-center space-x-4 max-w-md w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
            <Input
              placeholder="Search customers, devices, or tickets..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationClick}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    variant="destructive"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mockNotifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3">
                  <div className="flex w-full items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{notification.time}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center">
                <span className="text-sm text-primary">View all notifications</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm text-primary-foreground font-medium">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.full_name || 'User'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}