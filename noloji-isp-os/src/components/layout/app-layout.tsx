"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

// ... existing imports

export function AppLayout({ children, className }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  // Close mobile sidebar on path change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[240px]">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleDesktopSidebar} />

      {/* Main Content Area */}
      <div
        className={cn(
          "sidebar-transition",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleMobileSidebar}
        />

        {/* Page Content */}
        <main className={cn("min-h-[calc(100vh-4rem)]", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}