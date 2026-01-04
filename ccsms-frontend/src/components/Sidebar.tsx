'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useTranslation } from '@/lib/hooks/useTranslation';
import {
  Home, FileText, CheckSquare, Users, BarChart3, Settings, LogOut,
  Bell, User, Zap, Shield, TrendingUp, Receipt, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { t } = useTranslation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['main']);

  const handleLogout = async () => {
    try {
      // Call backend logout if needed
      // await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navSections = [
    {
      id: 'main',
      label: 'Main',
      items: [
        {
          label: t('home'),
          href: user?.role === 'AGENT' ? '/agent' : '/dashboard',
          icon: Home,
          show: true,
        },
        {
          label: t('complaints'),
          href: '/complaints',
          icon: FileText,
          show: true,
        },
        {
          label: 'Invoices',
          href: '/invoices',
          icon: Receipt,
          show: true,
        },
        {
          label: t('notifications'),
          href: '/notifications',
          icon: Bell,
          show: true,
        },
      ]
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        {
          label: t('assignmentRequests'),
          href: '/assignment-requests',
          icon: CheckSquare,
          show: user?.role === 'ADMIN',
        },
        {
          label: t('agents'),
          href: '/agents',
          icon: Users,
          show: user?.role === 'ADMIN',
        },
        {
          label: t('triage'),
          href: '/triage',
          icon: Zap,
          show: user?.role === 'ADMIN',
        },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      items: [
        {
          label: t('analytics'),
          href: '/analytics',
          icon: BarChart3,
          show: user?.role === 'ADMIN',
        },
        {
          label: t('performance'),
          href: '/performance',
          icon: TrendingUp,
          show: user?.role === 'ADMIN' || user?.role === 'AGENT',
        },
        {
          label: t('audit'),
          href: '/audit',
          icon: Shield,
          show: user?.role === 'ADMIN',
        },
      ]
    },
    {
      id: 'account',
      label: 'Account',
      items: [
        {
          label: t('profile'),
          href: '/profile',
          icon: User,
          show: true,
        },
        {
          label: t('settings'),
          href: '/settings',
          icon: Settings,
          show: true,
        },
      ]
    },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 z-40 lg:translate-x-0 flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#1da9c3] w-10 h-10 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <span className="text-lg font-bold text-[#1da9c3]">{t('resolveFast')}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('complaintManagement')}</p>
            </div>
          </div>
        </div>

        {/* Navigation Items - Scrollable */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item => item.show);
            if (visibleItems.length === 0) return null;
            
            const isExpanded = expandedSections.includes(section.id);
            
            return (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-[#1da9c3] transition-colors"
                >
                  <span>{section.label}</span>
                  <ChevronDown 
                    size={14} 
                    className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {isExpanded && (
                  <div className="space-y-1 mt-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <Icon size={18} className="group-hover:text-[#1da9c3]" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-9 h-9 bg-[#1da9c3] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            <LogOut size={18} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
