import { DomainError } from './DomainError';

export class InvalidTodoLabel extends DomainError {
    constructor(invalidValue: string, reason: string) {
        super(`La etiqueta '${invalidValue}' no es válida. Razón: ${reason}`);
        
    }
}