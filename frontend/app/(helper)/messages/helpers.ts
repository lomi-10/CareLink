// app/(helper)/messages/helpers.ts
import { Message } from '@/hooks/shared';
import { createHelperMessagesStyles } from './messages.styles';

export function timeLabel(dateStr: string) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60)        return 'Just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)     return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 86400 * 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function fullTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dateDivider(dateStr: string) {
  const d   = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function shouldShowDivider(prev: Message | undefined, curr: Message) {
  if (!prev) return true;
  return new Date(prev.sent_at).toDateString() !== new Date(curr.sent_at).toDateString();
}

export function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtLongDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function interviewPillStyle(s: ReturnType<typeof createHelperMessagesStyles>, status?: string | null) {
  switch (status) {
    case 'Confirmed':   return s.statusPillGreen;
    case 'Completed':   return s.statusPillGray;
    case 'Cancelled':   return s.statusPillRed;
    case 'Rescheduled': return s.statusPillAmber;
    case 'Scheduled':
    default:            return s.statusPillBlue;
  }
}

export type ResolvedApplication = {
  application_id: number;
  job_title: string;
  status: string;
  job_post_id: number;
  employer_signed_at?: string | null;
  helper_signed_at?: string | null;
  helper_decline_reason?: string | null;
  helper_decline_at?: string | null;
  contract_generated_at?: string | null;
  confirmed_salary?: number | null;
  work_hours?: string | null;
  rest_days?: string[];
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  contract_duration?: string | null;
  payment_schedule?: string | null;
  other_benefits?: string | null;
  pdf_file_path?: string | null;
  interview_id?: number | null;
  interview_date?: string | null;
  interview_type?: 'In-person' | 'Video Call' | 'Phone' | null;
  location_or_link?: string | null;
  interview_status?: string | null;
  parent_confirmed?: boolean;
  helper_confirmed?: boolean;
};
