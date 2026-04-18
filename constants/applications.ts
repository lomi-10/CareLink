import API_URL from '@/constants/api';

/** POST JSON: application_id, user_id, user_type parent|helper */
export const applicationSignContractUrl = () => `${API_URL}/v1/applications/sign_contract.php`;

/** GET: streams PDF when application_id, user_id, user_type are valid for the application */
export const applicationContractPdfUrl = (
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) =>
  `${API_URL}/v1/applications/contract.php?application_id=${applicationId}&user_id=${userId}&user_type=${userType}`;

export const pesoSignedContractsUrl = () => `${API_URL}/peso/list_signed_contracts.php`;
