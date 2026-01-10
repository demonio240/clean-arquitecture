import { DomainError } from "./DomainError"; // Asumo que tienes una clase base

export class TodoTitleAlreadyExistsError extends DomainError {
  constructor(title: string) {
    super(`A todo with title "${title}" already exists.`);
  }
}