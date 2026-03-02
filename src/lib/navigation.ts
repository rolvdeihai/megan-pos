import { PERMISSIONS, PermissionCode, hasPermission } from '@/lib/permissions';

export type DashboardNavItem = {
  label: string;
  href: string;
  permission: PermissionCode;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', permission: PERMISSIONS.VIEW_DASHBOARD },
  { label: 'Orders', href: '/dashboard/orders', permission: PERMISSIONS.MANAGE_ORDERS },
  { label: 'Menu', href: '/dashboard/menu', permission: PERMISSIONS.MANAGE_MENU },
  { label: 'Tables', href: '/dashboard/tables', permission: PERMISSIONS.MANAGE_ORDERS },
  { label: 'Inventory', href: '/dashboard/inventory', permission: PERMISSIONS.MANAGE_INVENTORY },
  { label: 'Transactions', href: '/dashboard/transactions', permission: PERMISSIONS.VIEW_REPORTS },
  { label: 'Employees', href: '/dashboard/employees', permission: PERMISSIONS.MANAGE_STAFF },
  { label: 'Roles', href: '/dashboard/roles', permission: PERMISSIONS.MANAGE_STAFF },
  { label: 'Settings', href: '/dashboard/settings', permission: PERMISSIONS.MANAGE_SETTINGS },
  { label: 'Billing', href: '/dashboard/billing', permission: PERMISSIONS.MANAGE_BILLING },
];

export function getVisibleDashboardNavItems(permissions: string[] | undefined) {
  const safePermissions = permissions ?? [];
  return DASHBOARD_NAV_ITEMS.filter((item) => hasPermission(safePermissions, item.permission));
}

// Mapping role ke bahasa Indonesia
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  cashier: 'Kasir',
  kitchen: 'Dapur',
  waiter: 'Pelayan',
  manager: 'Manager',
  owner: 'Owner',
  staff: 'Staff',
};

export function getRoleLabelInIndonesian(role?: string | null): string {
  if (!role) return 'Staff';
  return ROLE_LABELS[role.toLowerCase()] || role;
}

export function getUserRoleLabel(user?: {
  user_type?: 'owner' | 'staff';
  role_name?: string | null;
  role?: string | null;
}) {
  if (!user) return 'Guest';
  if (user.user_type === 'staff') {
    // Prioritaskan role_name (dari tabel roles) lalu role (dari tabel employees)
    const roleValue = user.role_name || user.role;
    return getRoleLabelInIndonesian(roleValue);
  }
  return 'Owner';
}
