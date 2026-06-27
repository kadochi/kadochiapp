interface ZarinpalApiResponse<T> {
  data?: T | null
  errors?: Array<{ code?: number; message?: string | null }> | null
}

interface RequestResponseData {
  code?: number
  authority?: string
  fee_type?: string
  fee?: number
}

interface VerifyResponseData {
  code?: number
  ref_id?: number | string
  card_pan?: string
  fee_type?: string
  fee?: number
}

export interface RequestPaymentResult {
  authority: string
  url: string
  code: number
}

export interface VerifyPaymentResult {
  code: number
  paid: boolean
  ref_id?: number | string
  card_pan?: string
  raw: VerifyResponseData
}

export interface CallOptions {
  timeoutMs?: number
  retries?: number
  signal?: AbortSignal | null | undefined
}

export type { ZarinpalApiResponse, RequestResponseData, VerifyResponseData }
