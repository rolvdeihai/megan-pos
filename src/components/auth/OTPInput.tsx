'use client';

import { useState, useRef, useEffect } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OTPInput({ 
  length = 6, 
  value, 
  onChange, 
  disabled = false,
  error = false 
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus first input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(val)) return;
    
    // Take only the last character if multiple entered
    const digit = val.slice(-1);
    
    // Update the value at current index
    const newValue = value.split('');
    newValue[index] = digit;
    const newValueString = newValue.join('');
    
    onChange(newValueString);

    // Move to next input if digit entered and not last input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        // Clear current value
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      onChange(pastedData);
      // Focus the next empty input or last input
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          disabled={disabled}
          className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg 
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${error 
              ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500' 
              : focusedIndex === index 
                ? 'border-blue-500 bg-white text-gray-900 focus:ring-blue-500' 
                : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      ))}
    </div>
  );
}
