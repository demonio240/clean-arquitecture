// application/errors/AppError.ts
export class AppError extends Error {

    public readonly code: string
    public readonly meta?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    meta?: Record<string, unknown>
  ) {

    super(message);
    this.name = "AppError";
    this.code = code;
    this.meta = meta;
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(code, message, meta);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(code, message, meta);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, meta?: Record<string, unknown>) {
    super(code, message, meta);
    this.name = "NotFoundError";
  }
}




