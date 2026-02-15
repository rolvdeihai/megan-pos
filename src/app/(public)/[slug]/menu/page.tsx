// src/app/(public)/menu/page.tsx
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import MenuItemCard from '@/components/menu/MenuItemCard';
import RestaurantHeader from '@/components/menu/RestaurantHeader';

interface Props {
  params: {
    slug: string;
  };
}

export default async function PublicMenuPage({ params }: Props) {
  // Fetch restaurant data
  const { data: restaurant, error: restaurantError } = await supabase
    .from('users')
    .select('*')
    .eq('restaurant_slug', params.slug)
    .single();

  if (restaurantError || !restaurant) {
    notFound();
  }

  const userId = restaurant.id;

  // Fetch restaurant settings
  const { data: settings, error: settingsError } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Jika tidak ada settings, gunakan default
  const finalSettings = settings || {
    enable_online_orders: true,
    enable_table_selection: true,
    enable_delivery: true,
    tax_percentage: 10,
    service_charge_percentage: 0,
    delivery_fee: 0,
  };

  if (!finalSettings?.enable_online_orders) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RestaurantHeader restaurant={restaurant} settings={finalSettings} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pemesanan Online Sedang Tidak Tersedia
          </h2>
          <p className="text-gray-600">
            Silakan kunjungi restoran kami untuk memesan.
          </p>
        </div>
      </div>
    );
  }

  // Fetch menu categories - PERBAIKI QUERY
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order');

  // Fetch menu items - PERBAIKI QUERY
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_available', true)
    .order('name');

  // Group items by category
  const itemsByCategory: Record<string, any[]> = {};
  
  categories?.forEach(category => {
    itemsByCategory[category.id] = menuItems?.filter(item => 
      item.category_id === category.id
    ) || [];
  });

  // Get uncategorized items
  const uncategorizedItems = menuItems?.filter(item => !item.category_id) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <RestaurantHeader restaurant={restaurant} settings={finalSettings} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Type Selection */}
        {settings?.enable_delivery && (
          <div className="mb-8 bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pilih Tipe Order</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings?.enable_table_selection && (
                <button className="p-4 border-2 border-primary rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                  <div className="text-2xl mb-2">🍽️</div>
                  <h3 className="font-semibold text-gray-900">Dine In</h3>
                  <p className="text-sm text-gray-600 mt-1">Makan di tempat</p>
                </button>
              )}
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                <div className="text-2xl mb-2">🥡</div>
                <h3 className="font-semibold text-gray-900">Takeaway</h3>
                <p className="text-sm text-gray-600 mt-1">Ambil di tempat</p>
              </button>
              {settings?.enable_delivery && (
                <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                  <div className="text-2xl mb-2">🚚</div>
                  <h3 className="font-semibold text-gray-900">Delivery</h3>
                  <p className="text-sm text-gray-600 mt-1">Antar ke alamat</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Menu by Category */}
        <div className="space-y-12">
          {categories?.map(category => {
            const items = itemsByCategory[category.id] || [];
            if (items.length === 0) return null;

            return (
              <section key={category.id} id={`category-${category.id}`}>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
                  {category.description && (
                    <p className="text-gray-600 mt-2">{category.description}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {items.map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      restaurantSlug={params.slug}
                      settings={settings}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Uncategorized Items */}
          {uncategorizedItems.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu Lainnya</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {uncategorizedItems.map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    restaurantSlug={params.slug}
                    settings={settings}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Cart Summary (Fixed at bottom) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg transform translate-y-full transition-transform duration-300">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">Keranjang (3 items)</div>
                <div className="text-sm text-gray-600">Rp 150,000</div>
              </div>
              <button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">
                Lanjut ke Pembayaran
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
