'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId } from '@/lib/user-scope';

const ThemeContext = createContext({});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [theme, setTheme] = useState({
        primary: '#3B82F6',
        secondary: '#10B981',
    });

    // Helper to apply theme to document
    const applyTheme = (primary: string, secondary: string) => {
        const root = document.documentElement;
        root.style.setProperty('--primary', primary);
        root.style.setProperty('--secondary', secondary);
    };

    const params = useParams(); // Import this from 'next/navigation' at the top if not present, but I need to check imports first.

    const ownerId = getOwnerId(user as { id: string; user_type?: 'owner' | 'staff'; user_id?: string | null } | null);

    useEffect(() => {
        let isActive = true;

        const setAndApply = (primary?: string | null, secondary?: string | null) => {
            if (!isActive) return;
            const newTheme = {
                primary: primary || '#3B82F6',
                secondary: secondary || '#10B981',
            };
            setTheme(newTheme);
            applyTheme(newTheme.primary, newTheme.secondary);
        };

        const resetTheme = () => {
            if (!isActive) return;
            const root = document.documentElement;
            root.style.removeProperty('--primary');
            root.style.removeProperty('--secondary');
            setTheme({ primary: '#3B82F6', secondary: '#10B981' });
        };

        const fetchThemeByOwner = async (id: string) => {
            const { data } = await supabase
                .from('restaurant_settings')
                .select('primary_color, secondary_color')
                .eq('user_id', id)
                .single();

            setAndApply(data?.primary_color, data?.secondary_color);
        };

        const fetchThemeBySlug = async (slugParam: string) => {
            const normalizedSlug = slugParam.trim().toLowerCase();
            const { data: restaurant } = await supabase
                .from('users')
                .select('id')
                .ilike('restaurant_slug', normalizedSlug)
                .maybeSingle();

            if (!restaurant?.id) {
                resetTheme();
                return;
            }

            const { data } = await supabase
                .from('restaurant_settings')
                .select('primary_color, secondary_color')
                .eq('user_id', restaurant.id)
                .single();

            setAndApply(data?.primary_color, data?.secondary_color);
        };

        if (ownerId) {
            fetchThemeByOwner(ownerId);
        } else if (params?.slug) {
            const slugParam = Array.isArray(params.slug) ? params.slug[0] : String(params.slug);
            fetchThemeBySlug(slugParam);
        } else {
            resetTheme();
        }

        return () => {
            isActive = false;
        };
    }, [ownerId, params]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
