import API_URL from '@/constants/api';

export type ApplicationTaskStatus = 'pending' | 'done' | 'skipped';

export type ApplicationTask = {
  id: number;
  application_id: number;
  created_by: number;
  title: string;
  description: string | null;
  due_date: string | null;
  requires_photo: boolean;
  is_recurring: boolean;
  recur_days: string[] | null;
  status: ApplicationTaskStatus;
  completed_at: string | null;
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** scope=today: actionable + completed today (helper daily). scope=all: full list (parent). */
export async function fetchApplicationTasks(
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
  scope: 'today' | 'all' = userType === 'helper' ? 'today' : 'all',
) {
  const qs = new URLSearchParams({
    application_id: String(applicationId),
    user_id: String(userId),
    user_type: userType,
    scope,
  });
  const r = await fetch(`${API_URL}/v1/applications/tasks.php?${qs}`);
  return r.json() as Promise<{ success: boolean; data?: ApplicationTask[]; message?: string }>;
}

export async function createApplicationTask(
  applicationId: number,
  parentUserId: number,
  body: {
    title: string;
    description?: string;
    due_date?: string | null;
    requires_photo?: boolean;
    is_recurring?: boolean;
    recur_days?: string[] | null;
  },
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
      requires_photo: !!body.requires_photo,
      is_recurring: !!body.is_recurring,
      recur_days: body.recur_days ?? null,
    }),
  });
  return r.json() as Promise<{ success: boolean; data?: { id: number }; message?: string }>;
}

export async function updateApplicationTask(
  taskId: number,
  parentUserId: number,
  body: { title: string; description?: string | null; due_date?: string | null },
) {
  const r = await fetch(`${API_URL}/v1/tasks/update.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      user_id: parentUserId,
      user_type: 'parent',
      title: body.title,
      description: body.description ?? '',
      due_date: body.due_date ?? '',
    }),
  });
  return r.json() as Promise<{ success: boolean; data?: { id: number }; message?: string }>;
}

/** Helper completes task; photo_url required when task.requires_photo */
export async function completeApplicationTask(
  taskId: number,
  helperUserId: number,
  photoUrl?: string | null,
) {
  const r = await fetch(`${API_URL}/v1/tasks/complete.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      user_id: helperUserId,
      user_type: 'helper',
      photo_url: photoUrl ?? '',
    }),
  });
  return r.json() as Promise<{
    success: boolean;
    data?: { id: number; status: string; photo_url?: string | null };
    message?: string;
    code?: string;
  }>;
}

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
