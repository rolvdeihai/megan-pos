'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUserRoleLabel, getVisibleDashboardNavItems } from '@/lib/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useStaff } from '@/contexts/StaffContext';

interface NavbarProps {
    mode: 'dashboard' | 'public';
    restaurant?: any; // For public mode
    settings?: any;   // For public mode
}

export default function Navbar({ mode, restaurant, settings }: NavbarProps) {
    const pathname = usePathname();
    const { user, logout: ownerLogout } = useAuth();
    const { staff, logout: staffLogout } = useStaff();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);

    // Determine current user (Owner or Staff)
    const currentUser = user || staff;
    const isStaff = currentUser?.user_type === 'staff' || !!staff;

    useEffect(() => {
        if (!currentUser) {
            setPermissions([]);
            return;
        }

        const currentPermissions = (currentUser as { permissions?: string[] }).permissions;
        if (Array.isArray(currentPermissions)) {
            setPermissions(currentPermissions);
            return;
        }

        if (!isStaff) {
            setPermissions(['*']);
            return;
        }

        setPermissions([]);
    }, [currentUser, isStaff]);

    const handleLogout = async () => {
        if (isStaff) {
            await staffLogout();
        } else {
            await ownerLogout();
        }
    };

    const filteredLinks = getVisibleDashboardNavItems(permissions);
    const roleLabel = getUserRoleLabel(currentUser as { user_type?: 'owner' | 'staff'; role_name?: string | null; role?: string | null });

    if (mode === 'public') {
        return (
            <nav
                className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur"
                style={{
                    borderTop: `4px solid ${settings?.primary_color || '#2563EB'}`
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            {settings?.logo_url ? (
                                <img
                                    src={settings.logo_url}
                                    alt={restaurant?.restaurant_name}
                                    className="h-10 w-10 rounded-lg object-cover shadow-sm"
                                />
                            ) : (
                                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                                    🍽️
                                </div>
                            )}
                            <div>
                                <Link href={`/${restaurant?.restaurant_slug}`} className="text-lg font-bold text-slate-900">
                                    {restaurant?.restaurant_name || 'Restaurant'}
                                </Link>
                                <div className="text-xs text-slate-500">
                                    {settings?.business_hours ? 'Buka hari ini' : 'Pemesanan online'}
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-3">
                            {currentUser ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-primary"
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="px-3 py-2 text-sm font-semibold text-red-600 hover:text-red-700"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    {restaurant?.restaurant_slug && (
                                        <Link
                                            href={`/${restaurant.restaurant_slug}/staff-login`}
                                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:text-primary"
                                        >
                                            Login Staff
                                        </Link>
                                    )}
                                    <Link
                                        href="/login"
                                        className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90"
                                    >
                                        Masuk Owner
                                    </Link>
                                </>
                            )}
                        </div>

                        <div className="md:hidden flex items-center">
                            <button
                                className="p-2 text-slate-600"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200/70 bg-white/95 px-4 py-3 space-y-2">
                        {currentUser ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-50"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                {restaurant?.restaurant_slug && (
                                    <Link
                                        href={`/${restaurant.restaurant_slug}/staff-login`}
                                        className="block px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-50"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Login Staff
                                    </Link>
                                )}
                                <Link
                                    href="/login"
                                    className="block px-3 py-2 text-sm font-semibold text-white bg-primary rounded-md text-center hover:bg-primary/90"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Masuk Owner
                                </Link>
                            </>
                        )}
                    </div>
                )}
            </nav>
        );
    }

    // Dashboard Mode
    return (
        <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/dashboard" className="text-xl font-bold text-slate-900 mr-6">
                            Megan POS
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-1">
                            {filteredLinks.map((link) => {
                                const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* User & Logout */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-sm font-semibold text-slate-900">
                                {currentUser?.full_name || 'User'}
                            </span>
                            <span className="text-xs text-slate-500">
                                {roleLabel}
                            </span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors"
                        >
                            Logout
                        </button>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200/70 py-2 px-4 space-y-1 bg-white/95">
                    {filteredLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`block px-3 py-2 text-base font-medium rounded-md ${pathname === link.href
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}
