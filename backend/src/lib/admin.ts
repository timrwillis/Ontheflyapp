export const ADMIN_EMAILS = ['timrwillis@gmail.com'];

export interface AdminCheckUser {
  email?: string | null;
  is_admin?: boolean;
  isAdmin?: boolean;
}

/**
 * Returns true if the user is an admin.
 * - email in ADMIN_EMAILS, OR
 * - user.is_admin === true (DB flag)
 */
export function isAdminUser(user: AdminCheckUser | null | undefined): boolean {
  if (!user) return false;
  const result =
    (typeof user.email === 'string' && ADMIN_EMAILS.includes(user.email)) ||
    user.is_admin === true ||
    user.isAdmin === true;
  console.log('[Admin] isAdminUser check: email=' + (user.email ?? 'none') + ', result=' + result);
  return result;
}
