import { DomainError } from './DomainError';

export class InvalidTodoTitleError extends DomainError {
  constructor(invalidValue: string, reason: string) {
    // Creamos un mensaje útil para el desarrollador/log
    super(`El título '${invalidValue}' no es válido. Razón: ${reason}`);
    
  }
}