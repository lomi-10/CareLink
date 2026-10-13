// app/(helper)/feedback/index.tsx
// Opens the helper system-evaluation Google Form.
import { EvaluationFormScreen } from '@/components/shared';

const HELPER_EVALUATION_FORM = 'https://forms.gle/YRmYCUxQbzmgruN79';

export default function HelperFeedbackScreen() {
  return <EvaluationFormScreen audience="helper" formUrl={HELPER_EVALUATION_FORM} accent="#E86019" />;
}
