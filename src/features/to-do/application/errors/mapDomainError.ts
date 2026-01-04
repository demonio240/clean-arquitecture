// mapDomainError.ts

// Domain errors
import { LabelAlreadyExistsError } from "../../domain/errors/LabelAlreadyExistsError";
import { InvalidTodoTitleError } from "../../domain/errors/InvalidTodoTitleError";
import { InvalidIdTodo } from "../../domain/errors/InvalidIdTodo";
import { TodoImmutableError } from "../../domain/errors/TodoImmutableError";

// Shared App errors (cross-cutting)
import { AppError, ConflictError, ValidationError } from "../../../../shared/errors/AppError";
import { InvalidTodoLabel } from "../../domain/errors/InvalidTodoLabel";

export function mapDomainError(err: unknown): AppError {
  // ✅ 1) Si ya es AppError (Forbidden incluido), pásalo tal cual
  if (err instanceof AppError) return err;

  // ✅ 2) Mapeos de dominio -> AppError
  if (err instanceof InvalidTodoTitleError) {
    return new ValidationError("TODO_TITLE_INVALID", err.message);
  }

  if (err instanceof InvalidIdTodo) {
    return new ValidationError("TODO_ID_INVALID", err.message);
  }

  if (err instanceof InvalidTodoLabel) {
    return new ValidationError("TODO_LABEL_INVALID", err.message);
  }

  if (err instanceof LabelAlreadyExistsError) {
    return new ConflictError("LABEL_ALREADY_EXISTS", err.message);
  }

  if (err instanceof TodoImmutableError) {
    return new ConflictError("TODO_IMMUTABLE", err.message);
  }

  // ✅ 3) Fallback (sin perder info útil)
  const message = err instanceof Error ? err.message : String(err);
  return new AppError("UNKNOWN", "Ocurrió un error inesperado.", {
    originalMessage: message,
    originalName: err instanceof Error ? err.name : typeof err,
  });
}
