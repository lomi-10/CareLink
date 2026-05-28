import AsyncStorage from '@react-native-async-storage/async-storage';

const prefix = '@carelink_salary_ok_';

/** Pay period label, e.g. 2026-04 for monthly tracking in the UI. */
export function currentPayPeriodYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function isSalaryMarkedForPeriod(
  applicationId: string,
  period: string,
): Promise<boolean> {
  const v = await AsyncStorage.getItem(`${prefix}${applicationId}_${period}`);
  return v === '1';
}

export async function markSalaryPaidForPeriod(
  applicationId: string,
  period: string,
): Promise<void> {
  await AsyncStorage.setItem(`${prefix}${applicationId}_${period}`, '1');
}
