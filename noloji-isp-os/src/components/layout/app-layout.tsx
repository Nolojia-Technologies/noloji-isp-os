"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/'];

// Routes that have their own layouts (don't apply AppLayout sidebar/header)
const CUSTOM_LAYOUT_ROUTES = ['/admin', '/landlord'];

import { LayoutSkeleton } from "@/components/layout/layout-skeleton";

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Check if current route has its own custom layout (admin, landlord)
  const hasCustomLayout = CUSTOM_LAYOUT_ROUTES.some(route => pathname.startsWith(route));

  // Redirect to login if not authenticated and not on a public route
  React.useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isPublicRoute, pathname]);

  // Show skeleton layout while checking authentication (better perceived performance)
  if (loading) {
    return isPublicRoute || hasCustomLayout ? null : <LayoutSkeleton />;
  }

  // For public routes (login, register), show content without sidebar/header
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For authenticated routes, show full layout
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  // For routes with custom layouts (admin, landlord), just render children
  // These routes have their own layout files with sidebars/headers
  if (hasCustomLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <div
        className={cn(
          "sidebar-transition",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Page Content */}
        <main className={cn("min-h-[calc(100vh-4rem)]", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}