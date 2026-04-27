import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Route row in sidebar / drawer (shared). */
export type ParentNavItem = {
  baseIcon: string;
  label: string;
  path: string;
  useNotificationBadge?: boolean;
};

/** CareBot row — only used in mobile drawer + native sidebar (web has CareBot fab). */
export type ParentNavCarebotItem = { carebot: true; baseIcon: string; label: string };

export type ParentNavRow = ParentNavItem | ParentNavCarebotItem;

function routeSegments(path: string) {
  return path
    .split('?')[0]
    .split('/')
    .filter((p) => p && p !== '(parent)');
}

/**
 * True when the current URL is under the same parent section as `href`.
 * Handles jobs/post_job, active_helpers + placement_*, applications + applicant_profile, etc.
 */
export function isParentNavActive(pathname: string | null | undefined, href: string): boolean {
  const p = (pathname || '').trim();
  const pl = p.toLowerCase();

  const a = routeSegments(p);
  const b = routeSegments(href);
  if (b.length > 0 && a.length >= b.length) {
    let prefixOk = true;
    for (let i = 0; i < b.length; i += 1) {
      if (a[i] !== b[i]) {
        prefixOk = false;
        break;
      }
    }
    if (prefixOk) return true;
  }

  if (href.includes('browse_helpers')) {
    return pl.includes('browse_helpers');
  }
  if (href.includes('active_helpers')) {
    return pl.includes('active_helpers') || pl.includes('placement_');
  }
  if (href.includes('applications')) {
    return pl.includes('applications') || pl.includes('applicant_profile');
  }
  if (href.includes('/jobs') && !href.includes('browse')) {
    if (pl.includes('post_job')) return true;
    if (pl.includes('jobs') && !pl.includes('browse_helpers')) return true;
  }
  if (href.includes('notifications')) {
    return pl.includes('notifications') && !pl.includes('messages');
  }
  if (href.includes('messages') && !href.includes('notifications')) {
    return pl.includes('messages') && !pl.includes('notifications');
  }
  if (href.includes('/home')) {
    const onHome = pl.includes('/home') || pl.endsWith('home') || a[0] === 'home' || a.includes('home');
    if (!onHome) return false;
    if (pl.includes('browse_helpers')) return false;
    if (pl.includes('active_helpers') || pl.includes('placement_')) return false;
    return true;
  }
  if (href.includes('profile') && !href.includes('applicant')) {
    return pl.includes('profile') && !pl.includes('applicant_profile');
  }
  if (href.includes('settings')) {
    return pl.includes('settings');
  }

  return false;
}

export function parentNavIconName(
  base: string,
  active: boolean,
): ComponentProps<typeof Ionicons>['name'] {
  return (active ? base : `${base}-outline`) as ComponentProps<typeof Ionicons>['name'];
}

export const PARENT_PORTAL_NAV: ParentNavItem[] = [
  { baseIcon: 'home', label: 'Home', path: '/(parent)/home' },
  { baseIcon: 'search', label: 'Find Helpers', path: '/(parent)/browse_helpers' },
  { baseIcon: 'briefcase', label: 'My Job Posts', path: '/(parent)/jobs' },
  { baseIcon: 'people', label: 'Applications', path: '/(parent)/applications' },
  { baseIcon: 'heart', label: 'Active Helpers', path: '/(parent)/active_helpers' },
  { baseIcon: 'notifications', label: 'Notifications', path: '/(parent)/notifications', useNotificationBadge: true },
  { baseIcon: 'chatbubbles', label: 'Messages', path: '/(parent)/messages' },
  { baseIcon: 'person', label: 'Profile', path: '/(parent)/profile' },
  { baseIcon: 'settings', label: 'Settings', path: '/(parent)/settings' },
];

const CAREBOT_ROW: ParentNavCarebotItem = { carebot: true, baseIcon: 'sparkles', label: 'CareBot' };

/**
 * Full drawer/sidebar list: on native iOS/Android, insert CareBot after Messages (web uses CareBot fab).
 */
export function getParentNavRowsForShell(): ParentNavRow[] {
  if (Platform.OS === 'web') {
    return PARENT_PORTAL_NAV;
  }
  const idx = PARENT_PORTAL_NAV.findIndex((i) => i.path.includes('/messages'));
  if (idx < 0) return [...PARENT_PORTAL_NAV, CAREBOT_ROW];
  return [...PARENT_PORTAL_NAV.slice(0, idx + 1), CAREBOT_ROW, ...PARENT_PORTAL_NAV.slice(idx + 1)];
}

/** Mobile bottom bar — do not repeat these in the hamburger. */
export const PARENT_TAB_BAR_PATHS = new Set<string>([
  '/(parent)/home',
  '/(parent)/browse_helpers',
  '/(parent)/jobs',
  '/(parent)/applications',
  '/(parent)/messages',
  '/(parent)/profile',
]);

/**
 * Slips routes that are on the mobile tab bar from the drawer so the menu stays
 * for Messages, secondary sections, and CareBot.
 */
export function getParentMobileDrawerNavRows(): ParentNavRow[] {
  return getParentNavRowsForShell().filter((row) => {
    if ('carebot' in row && row.carebot) return true;
    if (!('path' in row)) return true;
    return !PARENT_TAB_BAR_PATHS.has((row as ParentNavItem).path);
  });
}
