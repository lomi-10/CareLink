// utils/notification-routes.ts
import type { Notification } from '@/hooks/shared';

// HELPER
export function getHelperNotificationRoute(n: Notification): string | null {
  const id = n.ref_id;
  
  switch(n.type) {
    case 'job_invite':
      return id
        ? `/(helper)/my_applications?openApplication=${id}&source=invite` 
        : '/(helper)/my_applications';

    case 'status_changed':
      return id
        ? `/(helper)/my_applications?openApplication=${id}`
        : '/(helper)/my_applications';

    case 'application_received':
      return id
        ? `/(helper)/my_applications?openApplication=${id}`
        : '/(helper)/my_applications';

    case 'account_verified':
    case 'account_rejected':
    case 'document_verified':
    case 'document_rejected':
    case 'profile_update':
      return '/(helper)/profile';

    case 'job_verified':
    case 'job_rejected':
      return '/(helper)/browse_jobs';

    case 'new_message':
    case 'message_received':
      return '/(helper)/messages';

    case 'interview_scheduled':
    case 'interview_confirmed':
    case 'interview_declined':
    case 'interview_request':
      return id
        ? `/(helper)/my_applications?openApplication=${id}`
        : '/(helper)/my_applications';

    case 'task_completed':
    case 'attendance_checkin':
    case 'leave_request_submitted':
    case 'leave_request_responded':
    case 'contract_terminated':
      return '/(helper)/work_schedule';

    default:
      return null;
  }
}

// PARENT
export function getParentNotificationRoute(n: Notification): string | null {
  const id = n.ref_id;

  switch(n.type) {
    case 'application_received':
      return id
        ? `/(parent)/applications?jobId=${id}`
        : '/(parent)/applications';

    case 'status_changed':
      return id
        ? `/(parent)/applications?jobId=${id}`
        : '/(parent)/applications';

    case 'account_verified':
    case 'account_rejected':
    case 'document_verified':
    case 'document_rejected':
    case 'profile_update':
      return '/(parent)/profile';

    case 'job_verified':
    case 'job_rejected':
      return '/(parent)/jobs';

    case 'new_message':
    case 'message_received':
      return '/(parent)/messages';

    case 'interview_scheduled':
    case 'interview_confirmed':
    case 'interview_declined':
    case 'interview_request':
      return id
        ? `/(parent)/applications?jobId=${id}`
        : '/(parent)/applications';

    case 'task_completed':
    case 'attendance_checkin':
    case 'leave_request_submitted':
    case 'leave_request_responded':
    case 'contract_terminated':
      return '/(parent)/active_helpers';

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
        ? `/(peso)/view_user_profile?user_id=${id}`
        : '/(peso)/user_verification';

    case 'peso_queue_job':
      return '/(peso)/job_verification';

    case 'contract_signed':
    case 'contract_terminated':
      return '/(peso)/signed_contracts';

    case 'account_verified':
    case 'account_rejected':
      return '/(peso)/user_verification';

    case 'new_message':
      return null;

    default:
      return null;
  }
}