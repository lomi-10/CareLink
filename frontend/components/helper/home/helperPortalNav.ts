import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

function routeSegments(path: string) {
  return path
    .split('?')[0]
    .split('/')
    .filter((p) => p && p !== '(helper)');
}

export type HelperNavItem = {
  baseIcon: string;
  label: string;
  path: string;
  useNotificationBadge?: boolean;
  badgeFromStats?: 'applications';
};

/**
 * True when the current path matches a helper main route (incl. nested paths where relevant).
 */
export function isHelperNavActive(pathname: string | null | undefined, href: string): boolean {
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
  if (href.includes('browse_jobs')) {
    return pl.includes('browse_jobs');
  }
  if (href.includes('my_applications')) {
    return pl.includes('my_applications');
  }
  if (href.includes('saved_jobs')) {
    return pl.includes('saved_jobs');
  }
  if (href.includes('notifications')) {
    return pl.includes('notifications') && !pl.includes('messages');
  }
  if (href.includes('messages') && !href.includes('notifications')) {
    return pl.includes('messages') && !pl.includes('notifications');
  }
  if (href.includes('profile') && !href.includes('applicant')) {
    return pl.includes('profile') && !pl.includes('applicant');
  }
  if (href.includes('settings')) {
    return pl.includes('settings');
  }
  if (href.includes('work_tasks')) {
    return pl.includes('work_tasks');
  }
  if (href.includes('work_schedule')) {
    return pl.includes('work_schedule');
  }
  if (href.includes('work_history')) {
    return pl.includes('work_history');
  }
  if (href.includes('/home') && !href.includes('work')) {
    if (!pl.includes('home')) return false;
    if (pl.includes('browse_jobs')) return false;
    if (pl.includes('work_')) return false;
    return true;
  }
  return false;
}

export function helperNavIconName(
  base: string,
  active: boolean,
): ComponentProps<typeof Ionicons>['name'] {
  return (active ? base : `${base}-outline`) as ComponentProps<typeof Ionicons>['name'];
}

/** Only shown in the drawer (plus logout). */
const HELPER_NON_WORK_DRAWER_ONLY: HelperNavItem[] = [
  { baseIcon: 'bookmark', label: 'Saved jobs', path: '/(helper)/saved_jobs' },
  { baseIcon: 'notifications', label: 'Notifications', path: '/(helper)/notifications', useNotificationBadge: true },
  { baseIcon: 'settings', label: 'Appearance & settings', path: '/(helper)/settings' },
];

export function getHelperNonWorkMobileDrawerItems(): HelperNavItem[] {
  return HELPER_NON_WORK_DRAWER_ONLY;
}

/** Work-mode drawer — Profile is on the bottom bar. */
const HELPER_WORK_DRAWER_ITEMS: HelperNavItem[] = [
  { baseIcon: 'notifications', label: 'Notifications', path: '/(helper)/notifications', useNotificationBadge: true },
  { baseIcon: 'settings', label: 'Appearance & settings', path: '/(helper)/settings' },
];

export function getHelperWorkModeDrawerItems(): HelperNavItem[] {
  return HELPER_WORK_DRAWER_ITEMS;
}
