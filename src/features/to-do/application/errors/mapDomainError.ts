// mapDomainError.ts

// Domain errors
import { LabelAlreadyExistsError } from "../../domain/errors/LabelAlreadyExistsError";
import { InvalidTodoTitleError } from "../../domain/errors/InvalidTodoTitleError";
import { InvalidIdTodo } from "../../domain/errors/InvalidIdTodo";
import { TodoImmutableError } from "../../domain/errors/TodoImmutableError";

// Shared App errors (cross-cutting)
import { AppError, ConflictError, NotFoundError, UnexpectedError, ValidationError } from "../../../../shared/errors/AppError";
import { InvalidTodoLabel } from "../../domain/errors/InvalidTodoLabel";
import { TodoNotFoundError } from "./TodoNotFound";

export function mapDomainError(err: unknown): AppError {
  // ✅ 1) Si ya es AppError (Forbidden incluido), pásalo tal cual
  if (err instanceof AppError) return err;

  // ✅ 2) Mapeos de dominio -> AppError
  if (err instanceof InvalidTodoTitleError) {
    return new ValidationError(
      "TODO_TITLE_INVALID", 
      err.message,
      { outcome: "validation" },
      {
        err: err
      }
    );
  }

  if (err instanceof InvalidIdTodo) {
    return new ValidationError(
      "TODO_ID_INVALID", 
      err.message,
      { outcome: "validation" },
      {
        err: err
      }
    );
  }

  if (err instanceof InvalidTodoLabel) {
    return new ValidationError(
      "TODO_LABEL_INVALID", 
      err.message,
      { outcome: "validation" },
      {
        err: err
      }
    );
  }

  if (err instanceof LabelAlreadyExistsError) {
    return new ConflictError(
      "LABEL_ALREADY_EXISTS",
      err.message,
      { outcome: "duplicate", swallow: true },
      {
        err: err
      }
    );
  }

  if (err instanceof TodoImmutableError) {
    return new ConflictError(
      "TODO_IMMUTABLE", 
      err.message,
      { outcome: "failure" },
      {
        err: err
      }
    );
  }

  if (err instanceof TodoNotFoundError) {
    return new NotFoundError(
      "TODO_NOT_FOUND",
      err.message,
      { outcome: "not_found" },
      {
        err: err
      }
    );
  }

  // ✅ 3) Fallback (sin perder info útil)
  const message = err instanceof Error ? err.message : String(err);
  return new UnexpectedError("UNKNOWN", "Ocurrió un error inesperado.",
    {outcome: "failure" },
    {
      originalMessage: message,
      originalName: err instanceof Error ? err.name : typeof err,
    }
  );
}
 