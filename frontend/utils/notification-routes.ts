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

    case 'account_verified':
    case 'account_rejected':
    case 'document_verified':
    case 'document_rejected':
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

    case 'account_verified':
    case 'account_rejected':
    case 'document_verified':
    case 'document_rejected':
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

    case 'new_message':
      return null;

    default:
      return null;
  }
}
