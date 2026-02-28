import { supabase } from '@/lib/supabase';
import { getLegacyRolePermissions, normalizePermissions } from '@/lib/permissions';

export async function getRolePermissionCodes(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(code)')
    .eq('role_id', roleId);

  if (error || !data) return [];

  const codes = data
    .flatMap((row: { permissions?: { code?: string } | { code?: string }[] | null }) => {
      const perms = row.permissions;
      if (!perms) return [];
      if (Array.isArray(perms)) {
        return perms.map((perm) => perm.code).filter(Boolean);
      }
      return perms.code ? [perms.code] : [];
    })
    .filter(Boolean) as string[];

  return normalizePermissions(codes);
}

export async function getEmployeePermissionsForAuth(employee: {
  role_id: string | null;
  role?: string | null;
}): Promise<string[]> {
  if (employee.role_id) {
    return getRolePermissionCodes(employee.role_id);
  }

  return getLegacyRolePermissions(employee.role);
}
