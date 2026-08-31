// hooks/shared/useFeedback.ts
// Data layer for the persistent "Send Feedback" screen — fetches whichever
// questions this account hasn't answered yet, and submits them. Backend is
// role-agnostic (helper | parent | peso), so this hook is too.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export type FeedbackQuestion = {
  question_id: number;
  code: string;
  question_text: string;
  question_type: 'rating' | 'text' | 'choice';
  /** Present only on 'choice' (Part I demographics). */
  options?: string[] | null;
};

export type FeedbackAnswerDraft = { question_id: number; rating_value?: number; text_value?: string };

export function useFeedback(role: 'helper' | 'parent' | 'peso') {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [autofilled, setAutofilled] = useState<Record<string,string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const id = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
      if (!id) throw new Error('Please sign in again.');
      const res = await fetch(
        `${API_URL}/shared/get_feedback_status.php?user_id=${id}&requester_id=${id}&user_type=${role}`,
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load feedback questions.');
      setQuestions(data.questions ?? []);
      setAnsweredCount(data.answered_count ?? 0);
      setTotalCount(data.total_count ?? 0);
      setAutofilled(data.autofilled ?? {});
    } catch (e: any) {
      setError(e?.message || 'Could not load feedback questions.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async (answers: FeedbackAnswerDraft[]) => {
    setSubmitting(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const id = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
      if (!id) throw new Error('Please sign in again.');
      const res = await fetch(`${API_URL}/shared/submit_feedback_answers.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: id, requester_id: id, user_type: role, answers }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not save your feedback.');
      return true;
    } catch (e: any) {
      setError(e?.message || 'Could not save your feedback.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [role]);

  return { loading, questions, answeredCount, totalCount, autofilled, submitting, error, submit, refresh: load };
}
