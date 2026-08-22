'use client';

import { useEffect, useState } from 'react';

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
        // Need to require/import dynamically on the client
        const { startMocks } = await import('@/mocks/browser');
        await startMocks();
      }
      setMswReady(true);
    };

    if (!mswReady) {
      init();
    }
  }, [mswReady]);

  // Don't render the app until MSW is ready if mocks are enabled
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true' && !mswReady) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}
