// src/app/[slug]/staff-login/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function StaffLoginPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePinChange = async (value: string) => {
    // Only allow numbers, max 4 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setPin(numericValue);
    setError('');

    // Auto-submit when 4 digits entered
    if (numericValue.length === 4) {
      await handleLogin(numericValue);
    }
  };

  const handleLogin = async (pinCode: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug, 
          pin: pinCode 
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'PIN salah');
        setPin('');
        setLoading(false);
        // Re-focus input after error
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      setError('Terjadi kesalahan');
      setPin('');
      setLoading(false);
    }
  };

  // Re-focus on click anywhere
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  // Get display value for each box
  const getBoxValue = (index: number) => {
    if (pin.length > index) {
      return '•'; // Bullet for filled digit
    }
    return '';
  };

  // Check if box is active (current position)
  const isBoxActive = (index: number) => {
    return pin.length === index && !loading;
  };

  return (
    <div 
      className="min-h-screen bg-white flex items-center justify-center p-4"
      onClick={handleContainerClick}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">👨‍🍳</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Staff Login</h1>
        <p className="text-slate-500 mb-8">Masukkan PIN Anda</p>

        {/* PIN Boxes */}
        <div className="flex justify-center space-x-3 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                isBoxActive(index)
                  ? 'border-indigo-600 ring-2 ring-indigo-100'
                  : pin.length > index
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-slate-200'
              }`}
            >
              <span className={pin.length > index ? 'text-slate-800' : 'text-transparent'}>
                {getBoxValue(index)}
              </span>
            </div>
          ))}
        </div>

        {/* Hidden Input */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          className="sr-only"
          disabled={loading}
          autoFocus
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm animate-pulse">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-indigo-600 text-sm">
            Memverifikasi...
          </p>
        )}
      </div>
    </div>
  );
}
