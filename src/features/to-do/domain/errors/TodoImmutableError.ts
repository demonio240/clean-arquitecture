import { DomainError } from './DomainError';

export class TodoImmutableError extends DomainError {
  constructor(reason: string) {
    super(`No se puede modificar el Todo porque ya está completado. Intento: ${reason}`);
    
  }
}