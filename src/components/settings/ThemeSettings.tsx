'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { getOwnerId } from '@/lib/user-scope';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function ThemeSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'loading' | 'success'>('idle');
    const [settings, setSettings] = useState({
        primary_color: '#3B82F6', // Default Blue
        secondary_color: '#10B981', // Default Green
        logo_url: '',
    });

    const ownerId = getOwnerId(user);

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
        }
    }, [ownerId]);

    useEffect(() => {
        if (user && !ownerId) {
            setLoading(false);
        }
    }, [user, ownerId]);

    const normalizeHex = (v: string) => {
        const hex = v.replace(/^#/, '').trim();
        if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `#${hex}`;
        if (/^[0-9A-Fa-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
        return v.startsWith('#') ? v : v ? `#${v}` : v;
    };

    const fetchSettings = async () => {
        if (!ownerId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('restaurant_settings')
                .select('primary_color, secondary_color, logo_url')
                .eq('user_id', ownerId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching settings:', error);
            } else if (data) {
                setSettings({
                    primary_color: data.primary_color || '#3B82F6',
                    secondary_color: data.secondary_color || '#10B981',
                    logo_url: data.logo_url || '',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveState('loading');

        try {
            if (!ownerId) {
                toast.error('Data pemilik tidak ditemukan');
                return;
            }

            // Check if settings exist to update or insert
            const { data: existing } = await supabase
                .from('restaurant_settings')
                .select('id')
                .eq('user_id', ownerId)
                .single();

            let error;

            if (existing) {
                const { error: updateError } = await supabase
                    .from('restaurant_settings')
                    .update({
                        primary_color: settings.primary_color,
                        secondary_color: settings.secondary_color,
                        logo_url: settings.logo_url,
                    })
                    .eq('user_id', ownerId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('restaurant_settings')
                    .insert({
                        user_id: ownerId,
                        primary_color: settings.primary_color,
                        secondary_color: settings.secondary_color,
                        logo_url: settings.logo_url,
                        // Defaults for other fields if needed, or let DB handle defaults
                    });
                error = insertError;
            }

            if (error) throw error;

            // Immediate update for better UX
            const root = document.documentElement;
            root.style.setProperty('--primary', settings.primary_color);
            root.style.setProperty('--secondary', settings.secondary_color);

            toast.success('Tema berhasil disimpan');
            setSaveState('success');
            setTimeout(() => setSaveState('idle'), 1200);
        } catch (error) {
            console.error('Error saving theme:', error);
            toast.error('Gagal menyimpan tema');
            setSaveState('idle');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pengaturan Tema & Branding</h2>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Live Preview */}
                <div className="border rounded-lg p-4 bg-gray-50 mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Live Preview</h3>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            className="px-4 py-2 text-white rounded-lg font-medium"
                            style={{ backgroundColor: settings.primary_color }}
                        >
                            Primary Button
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 text-white rounded-lg font-medium"
                            style={{ backgroundColor: settings.secondary_color }}
                        >
                            Secondary Button
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Warna Utama (Primary Color)
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={settings.primary_color}
                                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                className="h-10 w-20 p-1 border rounded"
                            />
                            <div className="relative flex-1 pt-2">
                                <input
                                    type="text"
                                    value={settings.primary_color}
                                    onChange={(e) => setSettings({ ...settings, primary_color: normalizeHex(e.target.value) || e.target.value })}
                                    placeholder=" "
                                    className="peer w-full px-3 pt-5 pb-2.5 border rounded-lg transition-all duration-200 focus:ring-4 focus:ring-primary/15 focus:border-primary"
                                />
                                {/* Edit floating label text/position here. */}
                                <label className="absolute left-3 top-5 text-sm text-gray-500 transition-all duration-200 pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs">
                                    Hex Primary
                                </label>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Digunakan untuk tombol utama, header, dan aksen penting.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Warna Sekunder (Secondary Color)
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={settings.secondary_color}
                                onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                className="h-10 w-20 p-1 border rounded"
                            />
                            <div className="relative flex-1 pt-2">
                                <input
                                    type="text"
                                    value={settings.secondary_color}
                                    onChange={(e) => setSettings({ ...settings, secondary_color: normalizeHex(e.target.value) || e.target.value })}
                                    placeholder=" "
                                    className="peer w-full px-3 pt-5 pb-2.5 border rounded-lg transition-all duration-200 focus:ring-4 focus:ring-primary/15 focus:border-primary"
                                />
                                <label className="absolute left-3 top-5 text-sm text-gray-500 transition-all duration-200 pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs">
                                    Hex Secondary
                                </label>
                            </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Digunakan untuk tombol sekunder, badge, dan variasi.</p>
                    </div>
                </div>

                <div>
                    <div className="relative pt-2">
                        <input
                            type="text"
                            value={settings.logo_url}
                            onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                            className="peer w-full px-3 pt-5 pb-2.5 border rounded-lg transition-all duration-200 focus:ring-4 focus:ring-primary/15 focus:border-primary"
                            placeholder=" "
                        />
                        <label className="absolute left-3 top-5 text-sm text-gray-500 transition-all duration-200 pointer-events-none peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs">
                            Logo URL
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <motion.button
                        type="submit"
                        disabled={saving}
                        // Customize save button animation states here.
                        className="min-w-[180px] px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center"
                        style={{ backgroundColor: settings.primary_color }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {saveState === 'loading' ? (
                                <motion.span
                                    key="saving"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="flex items-center"
                                >
                                    <span className="mr-2 h-4 w-4 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                                    Menyimpan...
                                </motion.span>
                            ) : saveState === 'success' ? (
                                <motion.span
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                                    className="flex items-center"
                                >
                                    <CheckIcon className="w-5 h-5 mr-2" />
                                    Berhasil
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="idle"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                >
                                    Simpan Perubahan
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </form>
        </div>
    );
}
