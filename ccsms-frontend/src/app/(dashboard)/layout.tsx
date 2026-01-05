'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import NotificationToast from '@/components/NotificationToast';
import Sidebar from '@/components/Sidebar';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const hydrated = useAuthStore((s) => (s as any).hydrated);

  useEffect(() => {
    setMounted(true);

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = savedTheme === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    // wait for persisted auth to hydrate before redirecting
    if (!hydrated) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    // Role-based dashboard redirection ONLY for root path
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      if (user?.role === 'ADMIN') {
        router.replace('/dashboard');
      } else if (user?.role === 'AGENT') {
        router.replace('/agent');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [hydrated, isAuthenticated, user, router]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // useWebSocket removed to use FCM notifications
  // useWebSocket();

  if (!mounted) {
    return null;
  }

  if (!hydrated || !isAuthenticated) {
    return null;
  }



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      {/* Navbar - Simplified */}
      <nav className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 lg:ml-64">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Empty left space for mobile menu button */}
            <div className="w-12 lg:hidden" />

            {/* Right side - Theme toggle only */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 py-4 sm:py-6 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <NotificationToast />
    </div>
  );
}