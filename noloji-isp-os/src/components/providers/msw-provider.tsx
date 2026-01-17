"use client";

import * as React from "react";

interface MSWProviderProps {
  children: React.ReactNode;
}

export function MSWProvider({ children }: MSWProviderProps) {
  const [mswReady, setMSWReady] = React.useState(false);

  React.useEffect(() => {
    async function initializeMSW() {
      if (
        typeof window !== 'undefined' &&
        process.env.NODE_ENV === 'development' &&
        process.env.NEXT_PUBLIC_MSW_ENABLED === 'true'
      ) {
        try {
          const { worker } = await import('@/mocks/browser');

          await worker.start({
            onUnhandledRequest: 'warn',
          });

          console.log('🔶 MSW worker started successfully');
          setMSWReady(true);
        } catch (error) {
          console.error('Failed to start MSW worker:', error);
          setMSWReady(true); // Continue anyway
        }
      } else {
        setMSWReady(true);
      }
    }

    initializeMSW();
  }, []);

  // In development with MSW enabled, wait for MSW to be ready
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_MSW_ENABLED === 'true' &&
    !mswReady
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing mock API...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}