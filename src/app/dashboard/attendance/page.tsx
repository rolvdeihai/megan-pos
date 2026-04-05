'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { AnimatePresence, motion } from 'framer-motion';

type Employee = {
    id: string;
    full_name: string;
    employee_code: string;
    role: string;
};

type AttendanceLog = {
    id: string;
    employee_id: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    notes: string | null;
    employee: {
        full_name: string;
        employee_code: string;
    };
};

export default function AttendancePage() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Clock in/out states
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [actionType, setActionType] = useState<'in' | 'out'>('in');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            // Get employees
            const { data: empData } = await supabase
                .from('employees')
                .select('id, full_name, employee_code, role')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('full_name');

            if (empData) setEmployees(empData);

            // Get today's logs
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data: logData } = await supabase
                .from('attendance_logs')
                .select(`
          id,
          employee_id,
          clock_in,
          clock_out,
          status,
          notes,
          employee:employees(full_name, employee_code)
        `)
                .eq('user_id', user.id)
                .gte('clock_in', startOfDay.toISOString())
                .order('clock_in', { ascending: false });

            if (logData) {
                // Format the nested employee data
                const formattedLogs = logData.map((log: any) => ({
                    ...log,
                    employee: log.employee || { full_name: 'Unknown', employee_code: '-' }
                }));
                setLogs(formattedLogs);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClockAction = (employee: Employee, type: 'in' | 'out') => {
        submitClockAction(employee, type);
    };

    const submitClockAction = async (employee: Employee, type: 'in' | 'out') => {
        if (!user?.id || !employee) return;

        try {
            const now = new Date().toISOString();

            if (type === 'in') {
                // Check if already clocked in today without clock out
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const { data: existingLog } = await supabase
                    .from('attendance_logs')
                    .select('id')
                    .eq('employee_id', employee.id)
                    .gte('clock_in', startOfDay.toISOString())
                    .is('clock_out', null)
                    .single();

                if (existingLog) {
                    alert('Karyawan ini sudah clock-in dan belum clock-out.');
                    return;
                }

                // Clock In
                const { error } = await supabase
                    .from('attendance_logs')
                    .insert({
                        employee_id: employee.id,
                        user_id: user.id,
                        clock_in: now,
                        status: 'present'
                    });

                if (error) throw error;
                alert('Berhasil Clock-In!');

            } else {
                // Clock Out
                // Find the active clock-in log
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                const { data: existingLog } = await supabase
                    .from('attendance_logs')
                    .select('id')
                    .eq('employee_id', employee.id)
                    .gte('clock_in', startOfDay.toISOString())
                    .is('clock_out', null)
                    .order('clock_in', { ascending: false })
                    .limit(1)
                    .single();

                if (!existingLog) {
                    alert('Tidak ditemukan data Clock-In aktif untuk hari ini.');
                    return;
                }

                const { error } = await supabase
                    .from('attendance_logs')
                    .update({ clock_out: now })
                    .eq('id', existingLog.id);

                if (error) throw error;
                alert('Berhasil Clock-Out!');
            }

            fetchData();

        } catch (error) {
            console.error('Error clocking action:', error);
            alert('Terjadi kesalahan. Silakan coba lagi.');
        }
    };

    // Helper to check if employee is currently clocked in
    const isClockedIn = (employeeId: string) => {
        return logs.some(log => log.employee_id === employeeId && log.clock_in && !log.clock_out);
    };

    // Helper to check if employee has completed a shift today
    const hasCompletedShift = (employeeId: string) => {
        return logs.some(log => log.employee_id === employeeId && log.clock_in && log.clock_out);
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-8 text-center pt-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Memuat data absensi...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Sistem Absensi</h1>
                <p className="mt-2 text-gray-600">Catat waktu kedatangan dan kepulangan karyawan hari ini</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Terminal Absensi */}
                <div className="bg-white rounded-xl shadow p-6 border-t-4 border-primary">
                    <h2 className="text-xl font-semibold mb-6">Terminal Absensi</h2>

                    <div className="space-y-4">
                        {employees.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">Belum ada data karyawan aktif.</p>
                        ) : (
                            employees.map((employee, index) => {
                                const active = isClockedIn(employee.id);
                                const completed = hasCompletedShift(employee.id);

                                return (
                                    <motion.div
                                        key={employee.id}
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.28, delay: index * 0.04 }}
                                        // Edit hover card style here.
                                        whileHover={{ scale: 1.01 }}
                                        className="flex items-center justify-between p-4 border rounded-xl bg-white/80 backdrop-blur-sm hover:shadow-[0_14px_35px_-20px_rgba(37,99,235,0.45)]"
                                    >
                                        <div>
                                            <h3 className="font-medium text-gray-900">{employee.full_name}</h3>
                                            <p className="text-sm text-gray-500">{employee.role} • {employee.employee_code}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            {completed ? (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm cursor-not-allowed">
                                                    Selesai Shift
                                                </span>
                                            ) : active ? (
                                                <button
                                                    onClick={() => handleClockAction(employee, 'out')}
                                                    className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
                                                >
                                                    Clock Out
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleClockAction(employee, 'in')}
                                                    className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-sm font-medium transition-colors"
                                                >
                                                    Clock In
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Log Hari Ini */}
                <div className="bg-white rounded-xl shadow p-6 border-t-4 border-secondary">
                    <h2 className="text-xl font-semibold mb-6">Log Hari Ini</h2>

                    {logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Belum ada aktivitas absensi hari ini.
                        </div>
                    ) : (
                        <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                            {logs.map((log, index) => {
                                const expanded = expandedLogId === log.id;
                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.24, delay: index * 0.03 }}
                                        className="p-4 border border-gray-100 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium">{log.employee?.full_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${log.status === 'present' ? 'bg-green-100 text-green-800' :
                                                    log.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                                <button
                                                    onClick={() => setExpandedLogId(expanded ? null : log.id)}
                                                    className="text-xs px-2 py-1 rounded-md bg-white border hover:bg-slate-50"
                                                >
                                                    {expanded ? 'Tutup' : 'Detail'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                            <div className="bg-white p-2 rounded border">
                                                <p className="text-gray-500 text-xs mb-1">Clock In</p>
                                                <p className="font-medium">
                                                    {log.clock_in ? new Date(log.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-2 rounded border">
                                                <p className="text-gray-500 text-xs mb-1">Clock Out</p>
                                                <p className="font-medium">
                                                    {log.clock_out ? new Date(log.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {expanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.28, ease: 'easeOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-3 rounded-lg border bg-white p-3 text-xs text-slate-600 space-y-1">
                                                        <p>Kode Karyawan: {log.employee?.employee_code}</p>
                                                        <p>Catatan: {log.notes || '-'}</p>
                                                        <p>Tanggal: {log.clock_in ? new Date(log.clock_in).toLocaleDateString('id-ID') : '-'}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
