'use client';

import { useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface MenuItemCardProps {
  item: any;
  restaurantSlug: string;
  settings: any;
}

export default function MenuItemCard({ item, restaurantSlug, settings }: MenuItemCardProps) {
  const [quantity, setQuantity] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const addToCart = () => {
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
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {item.image_url ? (
        <div className="h-48 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-48 bg-gray-100 flex items-center justify-center">
          <PhotoIcon className="w-12 h-12 text-gray-400" />
        </div>
      )}
      
      <div className="p-4">
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
          <div className="text-lg font-bold text-primary">
            Rp {item.price.toLocaleString()}
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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-sm"
            >
              {quantity > 0 ? 'Tambah' : 'Tambah ke Keranjang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}