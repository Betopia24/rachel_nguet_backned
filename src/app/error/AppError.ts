export class AppError extends Error {
  public statusCode: number;
  /** Stable machine-readable code the app can switch on (e.g. "AI_QUOTA_EXCEEDED"). */
  public errorCode?: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, errorCode?: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
