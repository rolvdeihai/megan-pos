'use client';

interface PaymentMethod {
  id: string;
  name: string;
  category: 'va' | 'qris' | 'ewallet';
  icon: string;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'BCA',
    name: 'BCA Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari BCA',
  },
  {
    id: 'BNI',
    name: 'BNI Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari BNI',
  },
  {
    id: 'MANDIRI',
    name: 'Mandiri Virtual Account',
    category: 'va',
    icon: '🏦',
    description: 'Transfer dari Mandiri',
  },
  {
    id: 'QRIS',
    name: 'QRIS',
    category: 'qris',
    icon: '📱',
    description: 'Scan QR dengan aplikasi pembayaran',
  },
  {
    id: 'DANA',
    name: 'DANA',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan DANA',
  },
  {
    id: 'OVO',
    name: 'OVO',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan OVO',
  },
  {
    id: 'LINKAJA',
    name: 'LinkAja',
    category: 'ewallet',
    icon: '💳',
    description: 'Bayar dengan LinkAja',
  },
];

interface PaymentMethodSelectorProps {
  selected: string;
  onSelect: (method: string) => void;
}

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  const vaMethods = paymentMethods.filter((m) => m.category === 'va');
  const qrisMethod = paymentMethods.filter((m) => m.category === 'qris');
  const ewalletMethods = paymentMethods.filter((m) => m.category === 'ewallet');

  const MethodCard = ({ method }: { method: PaymentMethod }) => (
    <button
      onClick={() => onSelect(method.id)}
      className={`w-full flex items-center p-4 rounded-lg border-2 transition-all ${
        selected === method.id
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="text-2xl mr-4">{method.icon}</span>
      <div className="text-left flex-1">
        <p className={`font-medium ${selected === method.id ? 'text-primary' : 'text-gray-900'}`}>
          {method.name}
        </p>
        <p className="text-sm text-gray-500">{method.description}</p>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected === method.id ? 'border-primary' : 'border-gray-300'
        }`}
      >
        {selected === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Virtual Account */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Virtual Account</h3>
        <div className="space-y-2">
          {vaMethods.map((method) => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      </div>

      {/* QRIS */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">QRIS</h3>
        <div className="space-y-2">
          {qrisMethod.map((method) => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      </div>

      {/* E-Wallet */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">E-Wallet</h3>
        <div className="space-y-2">
          {ewalletMethods.map((method) => (
            <MethodCard key={method.id} method={method} />
          ))}
        </div>
      </div>
    </div>
  );
}
