export type HireJobOptionRow = {
  application_id: number;
  job_post_id: number;
  job_title: string;
  status: string;
  applied_at: string;
  job_start_date?: string | null;
  salary_offered?: number | null;
  salary_period?: string | null;
  employment_type?: string | null;
  work_schedule?: string | null;
};
