import {
  parseDurationString,
  toYmdInput,
  type DurationUnit,
} from '@/components/parent/hire/hireFlowDates';
import { parseWorkHoursString } from '@/components/parent/hire/hireFlowWorkHours';

export const CARELINK_MINIMUM_MONTHLY_SALARY = 6400;

export type HireJobOptionRow = {
  application_id: number;
  job_post_id: number;
  job_title: string;
  status: string;
  applied_at: string;
  job_start_date?: string | null;
  salary_offered?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  minimum_contract_salary?: number | null;
  salary_period?: string | null;
  employment_type?: string | null;
  work_schedule?: string | null;
  work_hours?: string | null;
  days_off?: string[] | string | null;
  contract_duration?: string | null;
  benefits?: string | null;
};

export type HireJobPrefill = {
  startDate: string;
  contractType: 'Fixed Term' | 'Indefinite';
  durationAmount: number;
  durationUnit: DurationUnit;
  salary: string;
  minimumSalary: number;
  salaryMin: number;
  salaryMax: number | null;
  paymentSchedule: string;
  workSchedule: 'Full-time' | 'Part-time' | 'Any';
  workHoursStart: string;
  workHoursEnd: string;
  flexibleHours: boolean;
  restDays: string[];
  otherBenefits: string;
};

const REST_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseRestDays(value: HireJobOptionRow['days_off']): string[] {
  let days: unknown = value;
  if (typeof days === 'string') {
    const rawDays = days;
    try {
      days = JSON.parse(rawDays);
    } catch {
      days = rawDays.split(',').map(day => day.trim());
    }
  }
  if (!Array.isArray(days)) return ['Sun'];
  const normalized = days.filter((day: unknown): day is string =>
    typeof day === 'string' && REST_DAYS.includes(day),
  );
  return normalized.length > 0 ? normalized : ['Sun'];
}

function paymentScheduleForPeriod(period: string | null | undefined): string {
  switch (period?.trim().toLowerCase()) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Every week';
    case 'semi-monthly':
    case 'semimonthly':
      return 'Every 15th and 30th';
    default:
      return 'Every end of month';
  }
}

export function getHireJobPrefill(row: HireJobOptionRow): HireJobPrefill {
  const duration = parseDurationString(row.contract_duration ?? '');
  const workHours = parseWorkHoursString(row.work_hours ?? '');
  const salaryMin =
    (Number(row.salary_min) > 0 ? Number(row.salary_min) : Number(row.salary_offered)) ||
    CARELINK_MINIMUM_MONTHLY_SALARY;
  const minimumSalary = Math.max(
    CARELINK_MINIMUM_MONTHLY_SALARY,
    salaryMin,
    Number(row.minimum_contract_salary) || salaryMin,
  );
  const workSchedule = row.work_schedule === 'Part-time' || row.work_schedule === 'Any'
    ? row.work_schedule
    : 'Full-time';

  return {
    startDate: toYmdInput(row.job_start_date),
    contractType: duration.contractType,
    durationAmount: duration.amount,
    durationUnit: duration.unit,
    salary: String(Math.max(salaryMin, minimumSalary)),
    minimumSalary,
    salaryMin,
    salaryMax: row.salary_max != null ? Number(row.salary_max) : null,
    paymentSchedule: paymentScheduleForPeriod(row.salary_period),
    workSchedule,
    workHoursStart: workHours.start,
    workHoursEnd: workHours.end,
    flexibleHours: workHours.flexible,
    restDays: parseRestDays(row.days_off),
    otherBenefits: row.benefits ?? '',
  };
}
