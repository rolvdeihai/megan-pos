// src/contexts/StaffContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type StaffMember = {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  role_id?: string | null;
  role_name?: string | null;
  user_id: string;
  restaurant_slug: string;
  is_staff: boolean;
  user_type: 'staff' | 'owner';
  permissions?: string[];
};

interface StaffContextType {
  staff: StaffMember | null;
  loading: boolean;
  login: (slug: string, pin: string) => Promise<boolean>;
  logout: () => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Cek sesi saat mount
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/current');
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.is_staff) {
            setStaff(data.user);
          }
        }
      } catch (error) {
        console.error('Failed to check user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentUser();
  }, []);

  const login = async (slug: string, pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Setelah login berhasil, langsung redirect ke dashboard
        window.location.href = '/dashboard';
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    // Hapus staff cookie
    await fetch('/api/staff/logout', { method: 'POST' });
    setStaff(null);
    
    // Redirect ke halaman utama restaurant
    if (staff?.restaurant_slug) {
      window.location.href = `/${staff.restaurant_slug}`;
    } else {
      window.location.href = '/';
    }
  };

  return (
    <StaffContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </StaffContext.Provider>
  );
}

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
};