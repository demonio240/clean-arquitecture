// Clase base para identificar que el error vino de TU lógica de negocio
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name
    Object.setPrototypeOf(this, new.target.prototype);
  }
}