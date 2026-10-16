import API_URL from '@/constants/api';

export type PayslipDeduction = {
  label: string;
  amount: number;
};

export type HelperPayslip = {
  payslip_id: number;
  application_id: number;
  pay_period_start: string;
  pay_period_end: string;
  paid_at: string;
  gross_amount: number;
  deductions: PayslipDeduction[];
  deductions_total: number;
  net_amount: number;
  payment_method: string;
  employer_note: string | null;
  status: 'pending' | 'acknowledged' | 'disputed';
  helper_acknowledged_at: string | null;
  helper_disputed_at: string | null;
  helper_dispute_reason: string | null;
  created_at: string;
};

export async function fetchHelperPayslips(
  applicationId: number,
  helperId: number,
): Promise<{ success: boolean; payslips?: HelperPayslip[]; message?: string }> {
  try {
    const res = await fetch(
      `${API_URL}/v1/applications/payslips.php?application_id=${applicationId}&user_id=${helperId}&user_type=helper`,
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Could not load payslips.' };
    }
    return { success: true, payslips: data.payslips ?? [] };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error while loading payslips.',
    };
  }
}

export async function fetchParentPayslips(
  applicationId: number,
  parentId: number,
): Promise<{ success: boolean; payslips?: HelperPayslip[]; message?: string }> {
  try {
    const res = await fetch(
      `${API_URL}/v1/applications/payslips.php?application_id=${applicationId}&user_id=${parentId}&requester_id=${parentId}&user_type=parent`,
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.message || 'Could not load payment records.' };
    }
    return { success: true, payslips: data.payslips ?? [] };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error while loading payment records.',
    };
  }
}

export type ParentPayslipInput = {
  application_id: number;
  user_id: number;
  user_type: 'parent';
  pay_period_start: string;
  pay_period_end: string;
  paid_at: string;
  gross_amount: number;
  deductions: PayslipDeduction[];
  payment_method: 'Cash' | 'Bank transfer' | 'E-wallet' | 'Other';
  employer_note?: string;
};

export async function createParentPayslip(
  body: ParentPayslipInput,
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/v1/applications/payslip_issue.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      success: res.ok && !!data.success,
      message: data.message || (res.ok ? undefined : 'Could not record the payment.'),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error while recording the payment.',
    };
  }
}

export async function respondToPayslip(body: {
  application_id: number;
  payslip_id: number;
  user_id: number;
  user_type: 'helper';
  action: 'acknowledge' | 'dispute';
  reason?: string;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/v1/applications/payslip_response.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      success: res.ok && !!data.success,
      message: data.message || (res.ok ? undefined : 'Could not save your response.'),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error while saving your response.',
    };
  }
}
