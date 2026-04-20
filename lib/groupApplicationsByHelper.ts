import type { JobApplication } from '@/hooks/parent/useJobApplications';

export type HelperApplicationGroup = {
  helperId: string;
  helper_name: string;
  helper_photo?: string;
  applications: JobApplication[];
};

export function groupApplicationsByHelper(apps: JobApplication[]): HelperApplicationGroup[] {
  const map = new Map<string, JobApplication[]>();
  for (const a of apps) {
    const id = String(a.helper_id);
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(a);
  }
  const groups: HelperApplicationGroup[] = [];
  for (const [helperId, list] of map) {
    const sorted = [...list].sort(
      (x, y) => new Date(y.applied_at).getTime() - new Date(x.applied_at).getTime()
    );
    groups.push({
      helperId,
      helper_name: sorted[0].helper_name,
      helper_photo: sorted[0].helper_photo,
      applications: sorted,
    });
  }
  return groups.sort((a, b) => {
    const ta = Math.max(...a.applications.map((x) => new Date(x.applied_at).getTime()));
    const tb = Math.max(...b.applications.map((x) => new Date(x.applied_at).getTime()));
    return tb - ta;
  });
}

const HIRE = new Set(['hired', 'Accepted']);

export function summarizeGroupStatus(apps: JobApplication[]): {
  label: string;
  color: string;
  bg: string;
} {
  if (apps.some((a) => HIRE.has(String(a.status)))) {
    return { label: 'Has hire', color: '#059669', bg: '#D1FAE5' };
  }
  if (apps.some((a) => a.status === 'Pending')) {
    return { label: 'Needs review', color: '#D97706', bg: '#FEF3C7' };
  }
  if (apps.some((a) => a.status === 'Shortlisted' || a.status === 'Interview Scheduled')) {
    return { label: 'In pipeline', color: '#7C3AED', bg: '#F3E8FF' };
  }
  if (apps.some((a) => a.status === 'Reviewed')) {
    return { label: 'Reviewed', color: '#2563EB', bg: '#DBEAFE' };
  }
  if (apps.every((a) => a.status === 'Rejected' || a.status === 'auto_rejected')) {
    return { label: 'All closed', color: '#6B7280', bg: '#F3F4F6' };
  }
  return { label: `${apps.length} roles`, color: '#4B5563', bg: '#F3F4F6' };
}
