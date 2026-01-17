import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start the worker if in development and MSW is enabled
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const mswEnabled = process.env.NEXT_PUBLIC_MSW_ENABLED === 'true';

  if (mswEnabled) {
    worker.start({
      onUnhandledRequest: 'warn',
    }).then(() => {
      console.log('🔶 MSW worker started for API mocking');
    }).catch((error) => {
      console.error('Failed to start MSW worker:', error);
    });
  }
}