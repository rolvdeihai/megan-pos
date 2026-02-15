export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_MENU: 'manage_menu',
  MANAGE_INVENTORY: 'manage_inventory',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_REPORTS: 'view_reports',
  MANAGE_BILLING: 'manage_billing',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DEFINITIONS = [
  {
    code: PERMISSIONS.VIEW_DASHBOARD,
    label: 'Lihat Dashboard',
    description: 'Akses ringkasan dan statistik utama.',
  },
  {
    code: PERMISSIONS.MANAGE_ORDERS,
    label: 'Kelola Order',
    description: 'Buat, proses, dan ubah status order (termasuk meja).',
  },
  {
    code: PERMISSIONS.MANAGE_MENU,
    label: 'Kelola Menu',
    description: 'Tambah dan ubah menu serta kategori.',
  },
  {
    code: PERMISSIONS.MANAGE_INVENTORY,
    label: 'Kelola Inventori',
    description: 'Atur stok bahan atau barang.',
  },
  {
    code: PERMISSIONS.MANAGE_STAFF,
    label: 'Kelola Karyawan',
    description: 'Tambah, edit, dan atur akses karyawan.',
  },
  {
    code: PERMISSIONS.MANAGE_SETTINGS,
    label: 'Kelola Pengaturan',
    description: 'Ubah pengaturan restoran dan tampilan.',
  },
  {
    code: PERMISSIONS.VIEW_REPORTS,
    label: 'Lihat Laporan',
    description: 'Akses laporan dan data transaksi.',
  },
  {
    code: PERMISSIONS.MANAGE_BILLING,
    label: 'Kelola Billing',
    description: 'Kelola paket dan tagihan.',
  },
] as const;

export const DEFAULT_PERMISSION_CODES: PermissionCode[] = PERMISSION_DEFINITIONS.map(
  (permission) => permission.code
);

const LEGACY_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  admin: DEFAULT_PERMISSION_CODES,
  manager: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.MANAGE_MENU,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.VIEW_REPORTS,
  ],
  cashier: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.VIEW_REPORTS,
  ],
  waiter: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_ORDERS],
  kitchen: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.MANAGE_ORDERS],
};

export function getLegacyRolePermissions(role?: string | null): PermissionCode[] {
  if (!role) return [];
  return LEGACY_ROLE_PERMISSIONS[role] ?? [];
}

export function normalizePermissions(
  permissions: Array<string | null | undefined> | undefined
): string[] {
  const set = new Set<string>();
  (permissions || []).forEach((permission) => {
    if (permission) set.add(permission);
  });
  return Array.from(set);
}

export function mergePermissions(
  ...permissionLists: Array<Array<string | null | undefined> | undefined>
): string[] {
  const set = new Set<string>();
  permissionLists.forEach((list) => {
    (list || []).forEach((permission) => {
      if (permission) set.add(permission);
    });
  });
  return Array.from(set);
}

export function hasPermission(userPermissions: string[] | undefined, required: PermissionCode): boolean {
  if (!required) return true;
  if (!userPermissions) return false;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

export const DASHBOARD_ROUTE_PERMISSIONS: Array<{ prefix: string; permission: PermissionCode }> = [
  { prefix: '/dashboard/settings', permission: PERMISSIONS.MANAGE_SETTINGS },
  { prefix: '/dashboard/employees', permission: PERMISSIONS.MANAGE_STAFF },
  { prefix: '/dashboard/inventory', permission: PERMISSIONS.MANAGE_INVENTORY },
  { prefix: '/dashboard/menu', permission: PERMISSIONS.MANAGE_MENU },
  { prefix: '/dashboard/public-orders', permission: PERMISSIONS.MANAGE_ORDERS },
  { prefix: '/dashboard/orders', permission: PERMISSIONS.MANAGE_ORDERS },
  { prefix: '/dashboard/tables', permission: PERMISSIONS.MANAGE_ORDERS },
  { prefix: '/dashboard/transactions', permission: PERMISSIONS.VIEW_REPORTS },
  { prefix: '/dashboard/billing', permission: PERMISSIONS.MANAGE_BILLING },
  { prefix: '/dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
];

export function getRequiredPermissionForPath(pathname: string): PermissionCode | null {
  const match = DASHBOARD_ROUTE_PERMISSIONS.find((entry) => pathname.startsWith(entry.prefix));
  return match?.permission ?? null;
}
