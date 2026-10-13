// app/(parent)/feedback/index.tsx
// Opens the employer system-evaluation Google Form.
import { EvaluationFormScreen } from '@/components/shared';

const EMPLOYER_EVALUATION_FORM = 'https://forms.gle/GmnqBWrfSMYtcmb37';

export default function ParentFeedbackScreen() {
  return <EvaluationFormScreen audience="employer" formUrl={EMPLOYER_EVALUATION_FORM} accent="#8B5A2B" />;
}
