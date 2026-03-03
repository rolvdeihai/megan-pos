import { supabase } from '@/lib/supabase';
import { getLegacyRolePermissions, normalizePermissions } from '@/lib/permissions';

export async function getRolePermissionCodes(roleId: string): Promise<string[]> {
  console.log('[RBAC] getRolePermissionCodes for roleId:', roleId);
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(code)')
    .eq('role_id', roleId);

  console.log('[RBAC] role_permissions query result:', { data, error });
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
  console.log('[RBAC] getEmployeePermissionsForAuth called with:', { role_id: employee.role_id, role: employee.role });
  if (employee.role_id) {
    const codes = await getRolePermissionCodes(employee.role_id);
    console.log('[RBAC] Got codes from role_id:', codes);
    return codes;
  }

  const legacy = getLegacyRolePermissions(employee.role);
  console.log('[RBAC] Got legacy permissions:', legacy);
  return legacy;
}
