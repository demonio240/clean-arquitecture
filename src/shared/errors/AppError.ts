
export type ErrorOutcome = "duplicate" | "not_found" | "forbidden" | "validation" | "failure" | "no_update";

export type TelemetryHint = {
  outcome?: ErrorOutcome;
  swallow?: boolean; // true => el caso de uso lo trata como no-op (idempotente)
};

export class AppError extends Error {

    public readonly code: string;
    public readonly status: number;
    public readonly telemetry: TelemetryHint = {};
    public readonly meta?: Record<string, unknown>;
    

  constructor(
    code: string,
    message: string,
    status: number,
    telemetry: TelemetryHint,
    meta?: Record<string, unknown>,
    
  ) {

    super(message); // Llama al constructor de Error
    this.name = "AppError"; // vieme de Error
    this.code = code;
    this.meta = meta;
    this.status = status;
    this.telemetry = telemetry;
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, telemetry: TelemetryHint, meta?: Record<string, unknown>) {
    super(code, message, 409, telemetry, meta);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, telemetry: TelemetryHint, meta?: Record<string, unknown>) {
    super(code, message, 400, telemetry, meta);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, telemetry: TelemetryHint, meta?: Record<string, unknown>) {
    super(code, message, 404, telemetry, meta);
    this.name = "NotFoundError";
  }
}

export class UnexpectedError extends AppError {
  constructor(code: string, message: string, telemetry: TelemetryHint, meta?: Record<string, unknown>) {
    super(code, message, 500, telemetry, meta);
  }
}




