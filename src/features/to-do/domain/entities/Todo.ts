import { TodoId } from '../value-objects/TodoId';
import { TodoTitle } from '../value-objects/TodoTitle';
import  { TodoCompletionStatus } from '../enums/TodoStatus';
import { Label } from '../value-objects/Label';
import type { DomainEventTodo } from '../events/DomainEvent';
// Importamos eventos
import { TodoCompletedEvent } from '../events/TodoCompletedEvent';
// Importamos errores
import { TodoImmutableError } from '../errors/TodoImmutableError';
import { LabelAlreadyExistsError } from '../errors/LabelAlreadyExistsError';
//import { TodoAlreadyPendingError } from '../errors/TodoAlreadyPendingError';
import { TodoReopenEvent } from '../events/TodoReopenEvent';
import type { TodoUniquenessChecker } from '../services/TodoUniquenessChecker';
import { TodoDeletedEvent } from '../events/TodoDeletedEvent';

export type TodoProps = {
    id: TodoId,
    title: TodoTitle,
    description: string,
    status: TodoCompletionStatus, 
    labels: Label[],
}

export class Todo {
  private _id: TodoId;
  private _title: TodoTitle;
  private _description: string; // Dejamos string simple si no tiene reglas complejas
  private _status: TodoCompletionStatus;
  private _labels: Label[];
  // 1. LA MOCHILA DE EVENTOS (Privada y no se persiste en la BD del Todo)
  private _domainEvents: DomainEventTodo[] = [];

  private constructor(
    id: TodoId,
    title: TodoTitle,
    description: string,
    status: TodoCompletionStatus = TodoCompletionStatus.PENDING,
    labels: Label[] = [],
  ) {

    // ✅ validar duplicados desde el inicio
    const labelsCopy = [...labels];
    const seen = new Set<string>();

    for (const label of labelsCopy) {
      if (seen.has(label.value)) {
        throw new LabelAlreadyExistsError(label.value); // te dice cuál se repite
      }
      seen.add(label.value);
    }
    //********************************** */
    
    this._id = id;
    this._title = title;
    this._description = description;
    this._status = status;
    this._labels = labelsCopy;
  }

  static create(id: TodoId, title: TodoTitle, description: string): Todo {
    return new Todo(id, title, description, TodoCompletionStatus.PENDING, []);
  }

  // hidratar desde persistencia (repositorio)
  static fromPersistence(props: TodoProps): Todo {
    
    const todo = new Todo(props.id, props.title, props.description, props.status, props.labels);
    return todo;
  }

  // --- COMPORTAMIENTOS (Lógica de Negocio) ---

  // 1. Completar la tarea
  public complete(date: Date): boolean {
    if (this._status === TodoCompletionStatus.DONE) {
        return false;
    }
    this._status = TodoCompletionStatus.DONE;

    this.addDomainEvent(new TodoCompletedEvent(this.id, date));

    return true;
  }

  // 2. Reabrir la tarea
  public reopen(date: Date): boolean {
    if (this._status === TodoCompletionStatus.PENDING) {
      
       return false; 
      //throw new TodoAlreadyPendingError(this.id); // Buscar que hacer con TodoAlreadyPendingError o eliminarlo
    }

    this._status = TodoCompletionStatus.PENDING;

    this.addDomainEvent(new TodoReopenEvent(this.id, date));

    return true;
  }

  // 3. Cambiar el título (Usando el Value Object)
  public async changeTitle(newTitle: TodoTitle, checker: TodoUniquenessChecker): Promise<boolean> {
    
    // 1. Comparación rápida en memoria (Value Object)
    if (this._title.equals(newTitle)) return false;

    // 2. Validación de Estado (Regla: No editar si está terminada)
    if (this._status === TodoCompletionStatus.DONE) {
      throw new TodoImmutableError("Intentó cambiar el título");
    }

    // 3. Validación de Dominio Externa (Regla: Título Único)
    // ⚠️ Aquí ocurre la magia: La entidad delega la validación al servicio
    await checker.ensureUnique(newTitle);

    // 4. Mutación del Estado
    this._title = newTitle;
    return true;
  }

  // 5. Cambiar la descripción
  public changeDescription(newDescription: string): boolean {

     const current = this._description ?? "";
    if (current === newDescription) return false;
 
    
    if (this._status === TodoCompletionStatus.DONE) {
      throw new TodoImmutableError("Intentó cambiar la descripción");
    }

    this._description = newDescription;
  
    return true;
  
  }


  // 6. Agregar etiqueta (Regla: No duplicados)
  public addLabel(newLabel: Label): boolean {

    if (this._status === TodoCompletionStatus.DONE) {
      throw new TodoImmutableError("Intentó agregar una etiqueta a una tarea completada");
    }

    const exists = this._labels.some(label => label.equals(newLabel));
    if (exists) {
       return false;
       
    }

    this._labels.push(newLabel);
    return true;
  }

  public delete(date: Date): void {
    // Registramos el evento de que fuimos eliminados
    this.addDomainEvent(new TodoDeletedEvent(this.id, date));
  }

  // 3. MECANISMO PARA SACAR LOS EVENTOS
  // El repositorio o el caso de uso llamarán a esto después de guardar.
  public pullDomainEvents(): DomainEventTodo[] {
    const events = [...this._domainEvents];
    this._domainEvents = []; // Vaciamos la mochila
    return events;
  }

  private addDomainEvent(event: DomainEventTodo): void {
    this._domainEvents.push(event);
  }

  // --- GETTERS (Para leer datos, pero no escribirlos) ---
  get id(): TodoId { return this._id; }
  get title(): string { return this._title.getValue(); }
  get description(): string { return this._description; }
  get status(): TodoCompletionStatus { return this._status; }
  get labels(): ReadonlyArray<Label> { return [...this._labels]; } // Devolvemos copia para proteger el array original
}