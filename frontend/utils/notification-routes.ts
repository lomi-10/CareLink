// utils/notification-routes.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import type { Notification } from '@/hooks/shared';

export type NotificationDestination =
  | string
  | { pathname: string; params: Record<string, string> };

type Role = 'helper' | 'parent';

// Notification types whose `ref_id` points at a `job_applications.application_id`
// row that we can resolve to the other party's conversation.
const APPLICATION_REF_TYPES = new Set(['application', 'job_application']);

/**
 * Resolves an application_id to the other party's conversation details
 * (partner_id / partner_name / job_post_id) using the existing applications
 * list endpoints — no dedicated backend endpoint needed.
 */
async function findApplicationPartner(
  role: Role,
  applicationId: number,
): Promise<{ partner_id: string; partner_name?: string; job_post_id?: string } | null> {
  try {
    const raw = await AsyncStorage.getItem('user_data');
    if (!raw) return null;
    const user = JSON.parse(raw);

    const url = role === 'helper'
      ? `${API_URL}/helper/my_applications.php?helper_id=${user.user_id}&requester_id=${user.user_id}`
      : `${API_URL}/parent/get_job_applications.php?parent_id=${user.user_id}&requester_id=${user.user_id}`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data?.success) return null;

    const apps: any[] = data.applications ?? [];
    const match = apps.find((a) => String(a.application_id) === String(applicationId));
    if (!match) return null;

    const partnerId   = role === 'helper' ? match.parent_id   : match.helper_id;
    const partnerName = role === 'helper' ? match.parent_name : match.helper_name;
    if (!partnerId) return null;

    return {
      partner_id:   String(partnerId),
      partner_name: partnerName ? encodeURIComponent(String(partnerName)) : undefined,
      job_post_id:  match.job_post_id ? String(match.job_post_id) : undefined,
    };
  } catch {
    return null;
  }
}

function messagesRoute(role: Role, params?: Record<string, string | undefined>): NotificationDestination {
  const pathname = role === 'helper' ? '/(helper)/messages' : '/(parent)/messages';
  const clean: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) clean[key] = value;
    }
  }
  return Object.keys(clean).length ? { pathname, params: clean } : pathname;
}

/** A rejected DOCUMENT notification's ref_id is the specific document_id —
 *  carry it through so the Documents screen can outline that exact card. */
function documentsRoute(role: Role, highlightDocId?: number | null): NotificationDestination {
  const pathname = role === 'helper' ? '/(helper)/profile/documents' : '/(parent)/profile/documents';
  return highlightDocId ? { pathname, params: { highlight_doc_id: String(highlightDocId) } } : pathname;
}

/** Visual tone for the notification detail modal, derived from the type name. */
export function kindForNotificationType(type: string): 'success' | 'error' | 'warning' | 'info' {
  if (/rejected|terminated|declined/.test(type)) return 'error';
  if (/verified|confirmed|completed|checkin/.test(type)) return 'success';
  if (/request/.test(type)) return 'warning';
  return 'info';
}

/**
 * Human label for the "go there" button on the notification detail modal.
 * Derived from the resolved destination's path rather than the notification
 * type, so it stays correct even as routes above change or new types appear.
 */
export function labelForNotificationDestination(dest: NotificationDestination): string {
  const path = typeof dest === 'string' ? dest : dest.pathname;
  if (path.includes('/messages')) return 'Open Chat';
  if (path.includes('/documents')) return 'View Documents';
  if (path.includes('/profile')) return 'View Profile';
  if (path.includes('/browse')) return 'Browse Jobs';
  if (path.includes('/jobs')) return 'View Job Post';
  if (path.includes('/applications')) return 'View Application';
  if (path.includes('/complaints')) return 'View Complaint';
  if (path.includes('/users')) return 'View Account';
  if (path.includes('/interviews')) return 'View Interview';
  if (path.includes('/contracts')) return 'View Contract';
  if (path.includes('/work') || path.includes('/hire') || path.includes('/placements')) return 'Go to Work Mode';
  return 'View Details';
}

// HELPER
export async function resolveHelperNotificationRoute(n: Notification): Promise<NotificationDestination | null> {
  const id = n.ref_id;

  switch (n.type) {
    case 'job_invite':
      return '/(helper)/browse';

    case 'new_message':
    case 'message_received':
    case 'interview_request':
      return id ? messagesRoute('helper', { partner_id: String(id) }) : '/(helper)/messages';

    case 'status_changed':
    case 'application_received':
    case 'interview_scheduled':
    case 'interview_confirmed':
    case 'interview_declined': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('helper', id);
        if (partner) return messagesRoute('helper', partner);
      }
      return '/(helper)/applications';
    }

    case 'placement_renewal': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('helper', id);
        if (partner) return messagesRoute('helper', partner);
      }
      return '/(helper)/messages';
    }

    case 'termination_requested':
    case 'contract_terminated': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('helper', id);
        if (partner) return messagesRoute('helper', partner);
      }
      return '/(helper)/work';
    }

    case 'document_rejected':
      // ref_type is 'document' and ref_id is the specific document_id — take
      // them straight to that document so the rejected one is obvious, not
      // just the general profile screen.
      return documentsRoute('helper', n.ref_type === 'document' ? id : undefined);

    case 'account_rejected':
      // Message explicitly says "review your documents and resubmit" —
      // go straight there instead of the general profile screen.
      return documentsRoute('helper');

    case 'account_verified':
    case 'document_verified':
    case 'profile_update':
      return '/(helper)/profile';

    case 'job_verified':
    case 'job_rejected':
      return '/(helper)/browse';

    case 'task_completed':
    case 'attendance_checkin':
    case 'leave_request_submitted':
    case 'leave_request_responded':
      return '/(helper)/work';

    default:
      return null;
  }
}

// PARENT
export async function resolveParentNotificationRoute(n: Notification): Promise<NotificationDestination | null> {
  const id = n.ref_id;

  switch (n.type) {
    case 'new_message':
    case 'message_received':
    case 'interview_request':
      return id ? messagesRoute('parent', { partner_id: String(id) }) : '/(parent)/messages';

    case 'application_received':
    case 'status_changed':
    case 'interview_scheduled':
    case 'interview_confirmed':
    case 'interview_declined': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('parent', id);
        if (partner) return messagesRoute('parent', partner);
      }
      return '/(parent)/messages';
    }

    case 'placement_renewal': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('parent', id);
        if (partner) return messagesRoute('parent', partner);
      }
      return '/(parent)/messages';
    }

    case 'contract_terminated': {
      if (id && n.ref_type && APPLICATION_REF_TYPES.has(n.ref_type)) {
        const partner = await findApplicationPartner('parent', id);
        if (partner) return messagesRoute('parent', partner);
      }
      return '/(parent)/hire';
    }

    case 'document_rejected':
      return documentsRoute('parent', n.ref_type === 'document' ? id : undefined);

    case 'account_rejected':
      return documentsRoute('parent');

    case 'account_verified':
    case 'document_verified':
    case 'profile_update':
      return '/(parent)/profile';

    case 'job_verified':
    case 'job_rejected':
      return id ? { pathname: '/(parent)/jobs', params: { job_id: String(id) } } : '/(parent)/jobs';

    case 'task_completed':
    case 'attendance_checkin':
    case 'leave_request_submitted':
      return '/(parent)/hire';

    default:
      return null;
  }
}

// PESO
export function getPesoNotificationRoute(n: Notification): string | null {
  const id = n.ref_id;

  switch(n.type) {
    case 'peso_queue_user':
      return id
        ? `/(peso)/users/view_profile?user_id=${id}`
        : '/(peso)/users';

    case 'peso_queue_job':
      return '/(peso)/jobs';

    case 'contract_signed':
    case 'contract_terminated':
      return '/(peso)/contracts';

    case 'account_verified':
    case 'account_rejected':
      return '/(peso)/users';

    // PESO has its own Messages screen now, so a message notification has
    // somewhere to go instead of being a dead tap.
    case 'new_message':
      return '/(peso)/messages';

    case 'complaint_filed':
    case 'complaint_forwarded':
    case 'complaint_resolved':
      return '/(peso)/complaints';

    case 'interview_scheduled':
    case 'interview_cancelled':
      return '/(peso)/interviews';

    case 'placement_started':
    case 'placement_ended':
      return '/(peso)/placements';

    case 'application_received':
    case 'status_changed':
      return '/(peso)/applications';

    // Falling through to the notifications list is still better than a tap that
    // does nothing — the user at least lands somewhere related.
    default:
      return null;
  }
}

/**
 * Super admin. Their notifications are mostly system-level: complaints raised
 * to them, staff messages, and account events they need to action.
 */
export function getAdminNotificationRoute(n: Notification): string | null {
  switch (n.type) {
    case 'complaint_filed':
    case 'complaint_forwarded':
    case 'complaint_resolved':
      return '/admin/complaints';

    case 'new_message':
      return '/admin/messages';

    case 'peso_queue_user':
    case 'account_verified':
    case 'account_rejected':
      return '/admin/user_management';

    case 'peso_account_created':
      return '/admin/create_admin_user';

    case 'system_feedback':
      return '/admin/feedback';

    default:
      return null;
  }
}
