// components/peso/layout/navConfig.ts
// Grouped nav structure for the PESO sidebar + mobile drawer.
import { Ionicons } from '@expo/vector-icons';

export type BadgeKey = 'notifications' | 'complaints';

export type NavItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  path: string;
  badgeKey?: BadgeKey;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'MAIN MENU',
    items: [
      { icon: 'grid', label: 'Dashboard', path: '/(peso)/home' },
      { icon: 'notifications', label: 'Notifications', path: '/(peso)/notifications', badgeKey: 'notifications' },
    ],
  },
  {
    label: 'VERIFICATION & MANAGEMENT',
    items: [
      { icon: 'people', label: 'User Verification', path: '/(peso)/users' },
      { icon: 'briefcase', label: 'Job Verification', path: '/(peso)/jobs' },
      { icon: 'reader', label: 'Applications', path: '/(peso)/applications' },
      { icon: 'pricetags', label: 'Categories & Skills', path: '/(peso)/reference' },
      { icon: 'calendar', label: 'Interviews', path: '/(peso)/interviews' },
      { icon: 'document-text', label: 'Contracts', path: '/(peso)/contracts' },
      // Placements removed on PESO's request (Aug 2026) — the screen duplicated
      // what Contracts and Reports already show and was never used. The route
      // file app/(peso)/placements/ still exists and is now unreachable; delete
      // it once you're sure nothing else wants it.
    ],
  },
  {
    label: 'COMMUNICATION & SUPPORT',
    items: [
      { icon: 'chatbubbles', label: 'Messages', path: '/(peso)/messages' },
      { icon: 'alert-circle', label: 'Complaints', path: '/(peso)/complaints', badgeKey: 'complaints' },
      // Peer reviews between helpers and households. Ratings are public on
      // profiles; the written text is readable only here and by super admin.
      { icon: 'star', label: 'Reviews', path: '/(peso)/reviews' },
      { icon: 'bar-chart', label: 'Reports & Analytics', path: '/(peso)/reports' },
    ],
  },
  {
    label: 'OFFICE ADMINISTRATION',
    items: [
      // The create screen existed but nothing linked to it, so a PESO officer
      // had no way to reach it — the account-creation feature was effectively
      // absent from the portal despite being fully built.
      { icon: 'person-add', label: 'Add PESO Staff', path: '/(peso)/users/create' },
    ],
  },
  {
    // Only useful while running user-test sessions. Remove this group (and
    // app/(peso)/demo/) once testing is finished.
    label: 'USER TESTING',
    items: [
      { icon: 'flask', label: 'Demo Control Panel', path: '/(peso)/demo' },
    ],
  },
];

/** Flat list — used by the mobile drawer, which doesn't render group headers as separately. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Whether a nav item matches the current route.
 *
 * `usePathname()` resolves route GROUPS away: on the Job Verification screen it
 * returns "/jobs", never "/(peso)/jobs". A plain `pathname === item.path`
 * therefore never matched anything, so the sidebar's active pill has never
 * appeared on any screen. Compare against the group-stripped path instead.
 */
export function isNavItemActive(itemPath: string, pathname: string): boolean {
  const target = itemPath.replace(/^\/\([^)]*\)/, '');
  return pathname === target || pathname === itemPath;
}
