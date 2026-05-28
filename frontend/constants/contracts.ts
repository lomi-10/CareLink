/**
 * Employment contract generation API (`carelink_api/contracts/generate_contract.php`).
 * Align with PHP JSON responses.
 */

export interface GenerateContractRequestBody {
  application_id: number;
  employer_id: number;
  helper_id: number;
}

export interface GenerateContractSuccessData {
  application_id: number;
  job_post_id: number;
  /** Absolute URL to the generated PDF */
  pdf_url: string;
  /** Path under carelink_api/uploads/ (e.g. contracts/contract_app1_20260101_120000.pdf) */
  pdf_file_path: string;
  template_version: string;
}

export interface GenerateContractSuccessResponse {
  success: true;
  message: string;
  data: GenerateContractSuccessData;
}

export interface GenerateContractErrorResponse {
  success: false;
  message: string;
}

export type GenerateContractResponse =
  | GenerateContractSuccessResponse
  | GenerateContractErrorResponse;
