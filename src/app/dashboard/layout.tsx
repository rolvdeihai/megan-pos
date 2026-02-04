// app/dashboard/layout.tsx

'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Akan redirect di useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <a href="/dashboard" className="text-xl font-bold text-gray-900 mr-4">
                Megan POS
              </a>
              <div className="hidden md:flex space-x-1">
                {/* Dashboard - Netral */}
                <a href="/dashboard" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Dashboard
                </a>
                {/* Orders - Biru */}
                <a href="/dashboard/orders" className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
                  Orders
                </a>
                {/* Menu - Hijau */}
                <a href="/dashboard/menu" className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors">
                  Menu
                </a>
                {/* Tables - Ungu */}
                <a href="/dashboard/tables" className="px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors">
                  Tables
                </a>
                {/* Inventory - Teal */}
                <a href="/dashboard/inventory" className="px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 rounded-lg font-medium transition-colors">
                  Inventory
                </a>
                {/* Settings - Slate */}
                <a href="/dashboard/settings" className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
                  Settings
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 hidden md:block">
                {user.full_name || 'User'}
              </span>
              <button
                onClick={() => {
                  fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                    window.location.href = '/login';
                  });
                }}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu (Simplified) */}
        <div className="md:hidden border-t border-gray-200 py-2 px-4 flex overflow-x-auto space-x-2">
            <a href="/dashboard" className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded">Dashboard</a>
            <a href="/dashboard/orders" className="px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded">Orders</a>
            <a href="/dashboard/menu" className="px-3 py-1 text-xs text-green-600 bg-green-50 rounded">Menu</a>
            <a href="/dashboard/settings" className="px-3 py-1 text-xs text-slate-600 bg-slate-100 rounded">Settings</a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}