import type { TodoId } from "../value-objects/TodoId";
import { DomainError } from "./DomainError";

export class TodoAlreadyPendingError extends DomainError {
  constructor(id: TodoId) {
    super(`El Todo '${id.value}' ya está pendiente.`);
    
  }
}
