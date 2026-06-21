import API_URL from '@/constants/api';

export type ChecklistItem = {
  item_id: number;
  item_text: string;
  is_done: boolean;
  sort_order: number;
};

export async function fetchChecklist(taskId: number, userId: number, userType: 'parent' | 'helper') {
  const qs = new URLSearchParams({ task_id: String(taskId), user_id: String(userId), user_type: userType });
  const r = await fetch(`${API_URL}/v1/tasks/checklist.php?${qs}`);
  return r.json() as Promise<{ success: boolean; data?: ChecklistItem[]; message?: string }>;
}

export async function addChecklistItem(taskId: number, userId: number, userType: 'parent' | 'helper', itemText: string) {
  const r = await fetch(`${API_URL}/v1/tasks/checklist.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, user_id: userId, user_type: userType, item_text: itemText }),
  });
  return r.json() as Promise<{ success: boolean; data?: ChecklistItem; message?: string }>;
}

export async function toggleChecklistItem(taskId: number, itemId: number, userId: number, userType: 'parent' | 'helper') {
  const r = await fetch(`${API_URL}/v1/tasks/checklist.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, item_id: itemId, user_id: userId, user_type: userType }),
  });
  return r.json() as Promise<{ success: boolean; message?: string }>;
}

export async function deleteChecklistItem(taskId: number, itemId: number, userId: number, userType: 'parent' | 'helper') {
  const r = await fetch(`${API_URL}/v1/tasks/checklist.php`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, item_id: itemId, user_id: userId, user_type: userType }),
  });
  return r.json() as Promise<{ success: boolean; message?: string }>;
}
