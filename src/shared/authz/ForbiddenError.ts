import { AppError } from "../errors/AppError";
import type { Permission } from "./permissions";

export class ForbiddenError extends AppError {
  constructor(permission?: Permission, meta?: Record<string, unknown>) {
    super("FORBIDDEN", "No tienes permisos para realizar esta acción.", {
      permission,
      ...meta,
    });
    this.name = "ForbiddenError";
  }
}
