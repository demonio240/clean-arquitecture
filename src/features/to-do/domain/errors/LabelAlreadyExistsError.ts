import { DomainError } from './DomainError';

export class LabelAlreadyExistsError extends DomainError {
  constructor(labelName: string) {
    super(`La etiqueta '${labelName}' ya existe en esta tarea.`);
    
  }
}