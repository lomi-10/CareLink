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
      { icon: 'pricetags', label: 'Categories & Skills', path: '/(peso)/reference' },
      { icon: 'calendar', label: 'Interviews', path: '/(peso)/interviews' },
      { icon: 'document-text', label: 'Contracts', path: '/(peso)/contracts' },
      { icon: 'home', label: 'Placements', path: '/(peso)/placements' },
    ],
  },
  {
    label: 'COMMUNICATION & SUPPORT',
    items: [
      { icon: 'alert-circle', label: 'Complaints', path: '/(peso)/complaints', badgeKey: 'complaints' },
      { icon: 'bar-chart', label: 'Reports & Analytics', path: '/(peso)/reports' },
    ],
  },
];

/** Flat list — used by the mobile drawer, which doesn't render group headers as separately. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
