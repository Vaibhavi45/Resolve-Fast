import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';

export function useAuthHydration() {
  const { hydrated, setHydrated } = useAuthStore();

  useEffect(() => {
    // Hydrate immediately on mount
    if (!hydrated) {
      setHydrated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return hydrated;
}