import { InvalidTodoTitleError } from "../errors/InvalidTodoTitleError";

// src/domain/value-objects/TodoTitle.ts
export class TodoTitle {
  private readonly value: string;

  constructor(title: string) {
    const trimmedTitle = title.trim();
    
    // Regla 1: No puede estar vacío
    if (trimmedTitle.length === 0) {
     throw new InvalidTodoTitleError(title, "El título no puede estar vacío.");
    }
    
    // Regla 2: No puede ser gigante (ej. max 100 caracteres)
    if (trimmedTitle.length > 100) {
      throw new InvalidTodoTitleError(title, "Excede los 100 caracteres permitidos.");
    }

    if (trimmedTitle.length < 5) {
      throw new InvalidTodoTitleError(title, "El título es muy corto. Describe mejor la tarea.");
    }

    // 5. Validación: Caracteres especiales (Nueva - Regex)
    // Ejemplo: Solo permitimos letras, números y espacios. No símbolos raros como < > { }
    const validCharactersRegex = /^[a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚ]+$/;
    if (!validCharactersRegex.test(trimmedTitle)) {
       throw new InvalidTodoTitleError(title, "Contiene caracteres especiales no permitidos.");
    }

    this.value = trimmedTitle;
  }

  equals(other: TodoTitle): boolean {
    return this.value === other.value;
  }


  public getValue(): string { return this.value; }
}