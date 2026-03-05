export type TagMode = 'dynamic_cmac' | 'one_time_tokens';

export interface VerifyRequest {
  tag_uid: string;
  counter: number;
  cmac: string;
}

export interface EnrollRequest {
  tag_uid: string;
  product_code: string;
  size: string;
  color: string;
  mode: TagMode;
}

export interface NextMessagesRequest {
  count: number;
  starting_counter?: number;
}

export interface GenerateScanTokensRequest {
  count: number;
  ttl_seconds: number;
}

export interface ReconfigureDynamicCmacRequest {
  reset_counter: boolean;
  rotate_key: boolean;
}

export interface ReconfigureOneTimeTokensRequest {
  revoke_existing_batch: boolean;
  token_count: number;
  ttl_seconds: number;
}

export type ReconfigureTagRequest =
  | ReconfigureDynamicCmacRequest
  | ReconfigureOneTimeTokensRequest;

export interface ApiCallResult<T> {
  ok: boolean;
  status: number;
  latencyMs: number;
  body: T | null;
  errorMessage?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
}

export interface AppNotification {
  id: string;
  level: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}
