'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useAuthHydration } from '@/hooks/useAuthHydration';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useAuthHydration();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!hydrated || hasRedirected) return;
    
    // Only redirect once when first loading the home page
    if (window.location.pathname === '/') {
      if (isAuthenticated) {
        router.push('/dashboard/');
      } else {
        router.push('/login');
      }
      setHasRedirected(true);
    }
  }, [isAuthenticated, hydrated, router, hasRedirected]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  );
}