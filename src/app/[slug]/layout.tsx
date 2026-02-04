'use client';

import { ReactNode } from 'react';

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  // StaffProvider sudah di layout root, jadi tidak perlu di sini lagi
  return <>{children}</>;
}