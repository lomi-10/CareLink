import API_URL from '@/constants/api';

/** POST JSON: application_id, user_id, user_type parent|helper */
export const applicationSignContractUrl = () => `${API_URL}/v1/applications/sign_contract.php`;

/** POST JSON: user_id, password — verifies account password as e-signature confirmation (RA 8792) */
export const verifyPasswordUrl = () => `${API_URL}/v1/auth/verify_password.php`;

/** GET: streams PDF when application_id, user_id, user_type are valid for the application */
export const applicationContractPdfUrl = (
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) =>
  `${API_URL}/v1/applications/contract.php?application_id=${applicationId}&user_id=${userId}&user_type=${userType}`;

export const pesoSignedContractsUrl = () => `${API_URL}/peso/list_signed_contracts.php`;

/** GET: PESO hire placements (parent, helper, timestamps); includes pending signatures */
export const pesoHireReportsUrl = () => `${API_URL}/peso/list_hire_reports.php`;

export const pesoTerminatedPlacementsUrl = () => `${API_URL}/peso/list_terminated_placements.php`;

/** POST JSON: application_id, user_id, user_type, reason, note?, is_mutual_agreement */
export const applicationTerminationInitiateUrl = () =>
  `${API_URL}/v1/applications/termination_initiate.php`;

/** GET: termination fields + pay estimate */
export const applicationTerminationDetailsUrl = (
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) =>
  `${API_URL}/v1/applications/termination_details.php?application_id=${applicationId}&user_id=${userId}&user_type=${userType}`;

/** GET: printable HTML termination record */
export const applicationTerminationRecordUrl = (
  applicationId: number,
  userId: number,
  userType: 'parent' | 'helper',
) =>
  `${API_URL}/v1/applications/termination_record.php?application_id=${applicationId}&user_id=${userId}&user_type=${userType}`;

/** GET ?application_id=&parent_id= — persisted contract terms, for pre-filling "Edit contract" */
export const getContractTermsUrl = () => `${API_URL}/parent/get_contract_terms.php`;

/** POST JSON: application_id, job_post_id, parent_id, helper_id + contract term fields — regenerates the pending contract */
export const editContractUrl = () => `${API_URL}/parent/edit_contract.php`;

/** POST JSON: application_id, helper_id, reason — helper "Disagree" with pending contract */
export const requestContractChangesUrl = () =>
  `${API_URL}/v1/applications/request_contract_changes.php`;
