export type ScopedUser = {
  id: string;
  user_type?: 'owner' | 'staff';
  user_id?: string | null;
  subscription_tier?: string | null;
};

export function getOwnerId(user?: ScopedUser | null): string | null {
  if (!user) return null;
  if (user.user_type === 'staff') {
    return user.user_id ?? null;
  }
  return user.id;
}

/**
 * Check if user has Enterprise subscription (for gramasi feature)
 */
export function isEnterprise(user?: ScopedUser | null): boolean {
  return user?.subscription_tier === 'enterprise';
}
