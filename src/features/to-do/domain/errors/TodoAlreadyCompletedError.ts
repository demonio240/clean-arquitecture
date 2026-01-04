import type { TodoId } from '../value-objects/TodoId';
import { DomainError } from './DomainError';

export class TodoAlreadyCompletedError extends DomainError {
  constructor(todoId: TodoId) {
    super(`El Todo con ID ${todoId.value} ya está completado y no puede completarse de nuevo.`);
    
  }
}