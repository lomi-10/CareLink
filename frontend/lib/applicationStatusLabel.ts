// lib/applicationStatusLabel.ts
// Friendly reason shown instead of "Apply" when the helper already has an
// application on file for a job post (see backend/helper/browse_jobs.php,
// which returns `application_status` / `can_apply` per job).
export function applicationStatusLabel(status: string): string {
  switch (status) {
    case 'Pending':
    case 'Reviewed': return 'Application Pending';
    case 'Shortlisted': return 'Shortlisted';
    case 'Interview Scheduled': return 'Interview Scheduled';
    case 'contract_pending': return 'Contract Pending';
    case 'hired':
    case 'Accepted': return 'You Were Hired For This Job';
    case 'termination_pending':
    case 'terminated': return 'Previously Employed Here';
    case 'Rejected':
    case 'auto_rejected': return 'Not Selected For This Job';
    default: return 'Already Applied';
  }
}
