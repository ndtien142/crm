/**
 * Single source of truth for API error codes and the success/error envelopes.
 * Shared by the server (throws `AppError` built from this catalog) and clients
 * (switch on `error.code`, never the human message).
 *
 * Add a code by adding ONE line to ERROR_CATALOG — status + default message.
 */

export const ERROR_CATALOG = {
  UNAUTHENTICATED: { status: 401, message: 'Chưa đăng nhập' },
  INVALID_CREDENTIALS: { status: 401, message: 'Email hoặc mật khẩu không đúng' },
  ROLE_NOT_ALLOWED: { status: 403, message: 'Không có quyền truy cập' },
  ACCOUNT_INACTIVE: { status: 403, message: 'Tài khoản đã bị khoá' },
  FORBIDDEN: { status: 403, message: 'Không được phép' },
  // Also used for branch/ownership mismatch — never reveal that a resource exists.
  RESOURCE_NOT_FOUND: { status: 404, message: 'Không tìm thấy' },
  VALIDATION_ERROR: { status: 400, message: 'Dữ liệu không hợp lệ' },
  DUPLICATE_RESOURCE: { status: 409, message: 'Đã tồn tại' },
  CONFLICT: { status: 409, message: 'Xung đột dữ liệu' },
  RATE_LIMITED: { status: 429, message: 'Quá nhiều yêu cầu' },
  INTERNAL: { status: 500, message: 'Lỗi hệ thống' },
  STORAGE_UNAVAILABLE: { status: 503, message: 'Chưa cấu hình lưu trữ tệp' },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;

/** Pagination metadata attached to a list `data` payload. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** The success envelope: payload under `data`, optional `meta` for lists. */
export interface ApiSuccess<T> {
  data: T;
  meta?: PageMeta;
}

/** The error envelope: a machine-readable `code` + human `message` (+ details). */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/** Narrowing helper for clients unwrapping a response. */
export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return (res as ApiError).error !== undefined;
}
