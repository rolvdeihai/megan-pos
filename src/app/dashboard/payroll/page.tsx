'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

type Employee = {
    id: string;
    full_name: string;
    employee_code: string;
    role: string;
    daily_rate: number | null;
    monthly_salary: number | null;
};

type Payroll = {
    id: string;
    employee_id: string;
    period_start: string;
    period_end: string;
    basic_salary: number;
    deductions: number;
    net_salary: number;
    status: 'draft' | 'paid';
    payment_date: string | null;
    employee: {
        full_name: string;
        employee_code: string;
        role: string;
    };
};

export default function PayrollPage() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);

    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [periodStart, setPeriodStart] = useState<string>('');
    const [periodEnd, setPeriodEnd] = useState<string>('');
    const [draftCalculations, setDraftCalculations] = useState<any>(null);

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
                .select('id, full_name, employee_code, role, daily_rate, monthly_salary')
                .eq('user_id', user.id)
                .order('full_name');

            if (empData) setEmployees(empData);

            // Get payrolls via API (bypass schema cache issue)
            const response = await fetch('/api/payrolls', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setPayrolls(data.payrolls || []);
            }
        } catch (error) {
            console.error('Error fetching payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculateDraft = async () => {
        if (!selectedEmployeeId || !periodStart || !periodEnd) {
            alert('Harap isi Karyawan dan Periode tanggal.');
            return;
        }

        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) return;

        try {
            // Get attendance logs for this period
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select('status')
                .eq('employee_id', selectedEmployeeId)
                .gte('clock_in', `${periodStart}T00:00:00.000Z`)
                .lte('clock_in', `${periodEnd}T23:59:59.999Z`);

            const totalPresent = logs ? logs.filter(l => l.status === 'present' || l.status === 'late').length : 0;
            const totalAbsent = logs ? logs.filter(l => l.status === 'absent').length : 0;

            let basicSalaryForPeriod = 0;
            let totalDeductions = 0;

            if (employee.monthly_salary && employee.monthly_salary > 0) {
                // Fixed monthly salary logic (Can be proportioned based on days, simplistic approach here: full month assuming typical 1 month period)
                basicSalaryForPeriod = employee.monthly_salary;
                // Example deduction: subtract daily rate equivalent for each absent day
                const dailyEquivalent = basicSalaryForPeriod / 30;
                totalDeductions = totalAbsent * dailyEquivalent;
            } else if (employee.daily_rate && employee.daily_rate > 0) {
                // Daily wage logic
                basicSalaryForPeriod = totalPresent * employee.daily_rate;
                totalDeductions = 0; // No deductions if paid daily
            }

            setDraftCalculations({
                totalPresent,
                totalAbsent,
                basicSalary: basicSalaryForPeriod,
                deductions: totalDeductions,
                netSalary: basicSalaryForPeriod - totalDeductions
            });

        } catch (error) {
            console.error('Error calculating draft:', error);
            alert('Gagal mengkalkulasi draft gaji.');
        }
    };

    const handleSavePayroll = async () => {
        if (!user?.id || !selectedEmployeeId || !draftCalculations) return;

        try {
            const response = await fetch('/api/payrolls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    employee_id: selectedEmployeeId,
                    period_start: periodStart,
                    period_end: periodEnd,
                    basic_salary: draftCalculations.basicSalary,
                    deductions: draftCalculations.deductions,
                    net_salary: draftCalculations.netSalary
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save');
            }

            alert('Draft slip gaji berhasil disimpan.');
            setShowGenerateModal(false);
            setDraftCalculations(null);
            fetchData();
        } catch (error) {
            console.error('Error saving payroll:', error);
            alert('Gagal menyimpan draft gaji.');
        }
    };

    const markAsPaid = async (payrollId: string) => {
        if (!confirm('Tandai gaji ini sebagai sudah dibayar?')) return;

        try {
            const { error } = await supabase
                .from('payrolls')
                .update({
                    status: 'paid',
                    payment_date: new Date().toISOString()
                })
                .eq('id', payrollId);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error updating payroll status:', error);
            alert('Gagal mengubah status slip gaji.');
        }
    };

    const deletePayroll = async (payrollId: string) => {
        if (!confirm('Hapus log gaji ini secara permanen?')) return;

        try {
            const { error } = await supabase
                .from('payrolls')
                .delete()
                .eq('id', payrollId);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting payroll:', error);
            alert('Gagal menghapus log slip gaji.');
        }
    };


    if (loading) {
        return (
            <div className="max-w-7xl mx-auto py-8 text-center pt-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Memuat data penggajian...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manajemen Penggajian (Payroll)</h1>
                    <p className="mt-2 text-gray-600">Kelola slip gaji dan histori pembayaran karyawan</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedEmployeeId('');
                        setPeriodStart('');
                        setPeriodEnd('');
                        setDraftCalculations(null);
                        setShowGenerateModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                    + Buat Slip Gaji Baru
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karyawan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaji Nett</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {payrolls.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Belum ada data slip gaji.
                                </td>
                            </tr>
                        ) : payrolls.map((payroll) => (
                            <tr key={payroll.id}>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{payroll.employee.full_name}</div>
                                    <div className="text-sm text-gray-500">{payroll.employee.employee_code} - {payroll.employee.role}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(payroll.period_start).toLocaleDateString()} - {new Date(payroll.period_end).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900">Rp {payroll.net_salary.toLocaleString()}</div>
                                    <div className="text-xs text-red-500">Potongan: Rp {payroll.deductions.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payroll.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {payroll.status === 'paid' ? 'Dibayar' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    {payroll.status === 'draft' && (
                                        <button
                                            onClick={() => markAsPaid(payroll.id)}
                                            className="text-primary hover:text-primary/70"
                                        >
                                            Bayar
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deletePayroll(payroll.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Hapus
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Buat Slip Gaji */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                        <h2 className="text-2xl font-bold mb-4">Buat Slip Gaji (Draft)</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Karyawan</label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-primary focus:border-primary"
                                >
                                    <option value="">-- Pilih --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode Mulai</label>
                                    <input
                                        type="date"
                                        value={periodStart}
                                        onChange={(e) => setPeriodStart(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode Akhir</label>
                                    <input
                                        type="date"
                                        value={periodEnd}
                                        onChange={(e) => setPeriodEnd(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCalculateDraft}
                                className="w-full py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 font-medium"
                            >
                                Kalkulasi Gaji
                            </button>

                            {draftCalculations && (
                                <div className="mt-4 p-4 border rounded-lg bg-gray-50 border-gray-200">
                                    <h3 className="font-semibold text-gray-800 mb-2">Estimasi Gaji</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Kehadiran:</span>
                                            <span>{draftCalculations.totalPresent}x Hadir, {draftCalculations.totalAbsent}x Absen</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Gaji Pokok / Total Rate:</span>
                                            <span>Rp {draftCalculations.basicSalary.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-red-500 border-b pb-2">
                                            <span>Potongan:</span>
                                            <span>- Rp {draftCalculations.deductions.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-1">
                                            <span>Gaji Bersih (Nett):</span>
                                            <span>Rp {draftCalculations.netSalary.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="flex space-x-3 mt-8">
                            <button
                                onClick={() => setShowGenerateModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSavePayroll}
                                disabled={!draftCalculations}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                            >
                                Simpan Draft
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
