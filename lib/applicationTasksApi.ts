import API_URL from '@/constants/api';

export type ApplicationTaskStatus = 'pending' | 'done' | 'skipped';

export type ApplicationTask = {
  id: number;
  application_id: number;
  created_by: number;
  title: string;
  description: string | null;
  due_date: string | null;
  is_recurring: boolean;
  status: ApplicationTaskStatus;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** GET — list tasks for a hire */
export async function fetchApplicationTasks(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
  });
  const r = await fetch(`${API_URL}/v1/applications/tasks.php?${qs}`);
  return r.json() as Promise<{ success: boolean; data?: ApplicationTask[]; message?: string }>;
}

/** POST — employer creates task */
export async function createApplicationTask(
  applicationId: number,
  parentUserId: number,
  body: { title: string; description?: string; due_date?: string | null; is_recurring?: boolean },
) {
  const r = await fetch(`${API_URL}/v1/applications/tasks.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: applicationId,
      user_id: parentUserId,
      user_type: 'parent',
      title: body.title,
      description: body.description ?? '',
      due_date: body.due_date ?? '',
      is_recurring: !!body.is_recurring,
    }),
  });
  return r.json() as Promise<{ success: boolean; data?: { id: number }; message?: string }>;
}

/** POST — helper marks complete */
export async function completeApplicationTask(taskId: number, helperUserId: number) {
  const r = await fetch(`${API_URL}/v1/tasks/complete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      user_id: helperUserId,
      user_type: 'helper',
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: { id: number; status: string };
    message?: string;
  }>;
}

/** POST — employer deletes */
export async function deleteApplicationTask(taskId: number, parentUserId: number) {
  const r = await fetch(`${API_URL}/v1/tasks/delete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      user_id: parentUserId,
      user_type: 'parent',
    }),
  });
  return r.json() as Promise<{ success: boolean; message?: string }>;
}
