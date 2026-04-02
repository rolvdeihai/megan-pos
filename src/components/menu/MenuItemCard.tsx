'use client';

import { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface MenuItemCardProps {
  item: any;
  restaurantSlug: string;
  settings: any;
}

export default function MenuItemCard({ item, restaurantSlug, settings }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const isSoldOut = item.effective_is_available === false;

  const addToCart = () => {
    if (isSoldOut) {
      alert(item.sold_out_reason || 'Menu ini sedang habis');
      return;
    }

    const cart = JSON.parse(localStorage.getItem(`cart_${restaurantSlug}`) || '[]');
    const existingItem = cart.find((i: any) => i.id === item.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }
    
    localStorage.setItem(`cart_${restaurantSlug}`, JSON.stringify(cart));
    setQuantity(prev => prev + 1);
    
    // Show success message
    alert(`${item.name} ditambahkan ke keranjang!`);
  };

  const removeFromCart = () => {
    if (quantity === 0) return;
    
    const cart = JSON.parse(localStorage.getItem(`cart_${restaurantSlug}`) || '[]');
    const newCart = cart.map((i: any) => 
      i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
    ).filter((i: any) => i.quantity > 0);
    
    localStorage.setItem(`cart_${restaurantSlug}`, JSON.stringify(newCart));
    setQuantity(prev => Math.max(0, prev - 1));
  };

  return (
    <motion.div
      // Customize premium animation timing/easing here.
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className={`group relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
        isSoldOut
          ? 'border-red-200/80 bg-white/80'
          : 'border-white/40 bg-white/70 hover:border-primary/30'
      }`}
    >
      {/* Customize gradient colors for premium border glow here. */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-primary/10" />

      {item.image_url ? (
        <div className="h-48 overflow-hidden relative z-10">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-48 bg-slate-100/90 flex items-center justify-center relative z-10">
          <PhotoIcon className="w-12 h-12 text-gray-400" />
        </div>
      )}
      
      <div className="relative z-10 p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d={showDetails ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t">
            {item.preparation_time && (
              <div className="text-sm text-gray-600 mb-2">
                ⏱️ Waktu persiapan: {item.preparation_time} menit
              </div>
            )}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {item.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div>
            <div className="text-lg font-bold text-primary">
              Rp {item.price.toLocaleString()}
            </div>
            <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${isSoldOut ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {isSoldOut ? 'Habis' : 'Tersedia'}
            </div>
            {isSoldOut && (
              <div className="mt-2 text-xs text-red-600 max-w-40">
                {item.sold_out_reason || 'Menu ini sedang habis'}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {quantity > 0 && (
              <>
                <button
                  onClick={removeFromCart}
                  className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <span className="font-medium">{quantity}</span>
              </>
            )}
            <button
              onClick={addToCart}
              disabled={isSoldOut}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${isSoldOut
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
                }`}
            >
              {isSoldOut ? 'Stok Habis' : quantity > 0 ? 'Tambah' : 'Tambah ke Keranjang'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}