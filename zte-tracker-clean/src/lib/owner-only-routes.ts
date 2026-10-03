/**
 * Pages that belong to the private owner workspace only. Shared users are
 * redirected to /dashboard and never see these in navigation.
 */
export const OWNER_ONLY_HREFS = ["/clientsync", "/architecture"] as const;

export function isOwnerOnlyPath(pathname: string): boolean {
  return OWNER_ONLY_HREFS.some((h) => pathname === h || pathname.startsWith(h + "/"));
}
