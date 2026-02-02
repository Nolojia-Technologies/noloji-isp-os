import { cn } from "@/lib/utils";

export function LayoutSkeleton() {
    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar skeleton */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r hidden md:block">
                <div className="p-4 border-b">
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="p-4 space-y-3">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            </div>
            {/* Main content skeleton */}
            <div className="md:ml-64">
                {/* Header skeleton */}
                <div className="h-16 border-b bg-card flex items-center px-6">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                </div>
                {/* Content skeleton */}
                <div className="p-6 space-y-6">
                    <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                    <div className="h-64 bg-muted animate-pulse rounded-lg mt-6" />
                </div>
            </div>
        </div>
    );
}
