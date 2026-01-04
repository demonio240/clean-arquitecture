import { DomainError } from './DomainError';

export class InvalidIdTodo extends DomainError {
  constructor(invalidValue: string, reason: string) {
    // Creamos un mensaje útil para el desarrollador/log
    super(`El ID '${invalidValue}' no es válida. Razón: ${reason}`);
    
  }
}