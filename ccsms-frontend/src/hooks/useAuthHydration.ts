import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';

export function useAuthHydration() {
  const { hydrated, setHydrated } = useAuthStore();

  useEffect(() => {
    // Force hydration after a short delay if it hasn't happened
    const timer = setTimeout(() => {
      if (!hydrated) {
        setHydrated();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hydrated, setHydrated]);

  return hydrated;
}