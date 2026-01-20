import { TodoId } from "../../../domain/value-objects/TodoId";
import type { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { success, type Result } from "../../../../../shared/core/Result";
import type { Todo } from "../../../domain/entities/Todo";
import type { TodoDependencies } from "../../TodoDependencies";

// Definimos los posibles errores
type DeleteTodoErrors = TodoNotFoundError | Error;

export type DeleteTodoInput = { id: string };

// Respuesta limpia (sin undefined)
export type DeleteTodoResponse = 
  | { status: "deleted"; id: string }
  | { status: "already_deleted"; id: string };

// Extendemos de BaseUseCase<Evento, Entidad>
export class DeleteTodo extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<DeleteTodoInput, Result<DeleteTodoResponse, DeleteTodoErrors>> {
  
  // Como usamos TodoDependencies, extraemos lo que necesitamos en el constructor
  private readonly todoRepo: TodoDependencies["todoRepo"]; // O TodoRepository directo
  private readonly date: TodoDependencies["date"];

  constructor(deps: TodoDependencies) {
    super(deps.eventBus);
    this.todoRepo = deps.todoRepo;
    this.date = deps.date;
  }

  async execute(input: DeleteTodoInput): Promise<Result<DeleteTodoResponse, DeleteTodoErrors>> {
    const { id } = input;

    // 1. Validar Permisos: ELIMINADO (Lo maneja el PermissionDecorator)

    // 2. BUSCAR (Con getAggregate)
    // Usamos el helper. Si no existe, podemos decidir:
    // a) Fallar con Error 404 (Estricto)
    // b) Devolver éxito "already_deleted" (Idempotente)
    // Dado que tu código original devolvía "already_deleted", mantendremos ese comportamiento manual
    // PERO usando la búsqueda limpia primero.
    
    // Nota: Como queremos controlar el caso "no existe" como un éxito y no como un error,
    // usaremos getAggregate pero capturaremos el error nosotros o haremos la búsqueda directa
    // si preferimos la idempotencia total sin lanzar excepciones.
    
    // ESTRATEGIA IDEMPOTENTE CLEAN:
    const todoId = new TodoId(id);
    const todo = await this.todoRepo.getById(todoId);

    if (!todo) {
       // Si no existe, no es un error, es un estado "ya borrado"
       return success({ status: "already_deleted", id });
    }

    // 3. LÓGICA DE DOMINIO
    // La entidad registra su propio evento de muerte
    todo.delete(this.date.now());

    // 4. PERSISTENCIA
    // Eliminamos físicamente el registro
    await this.todoRepo.delete(todoId);

    // IMPORTANTE: Publicamos los eventos (TodoDeleted)
    // Aunque el registro se borre, el evento debe ir al Outbox para notificar a otros sistemas
    await this.publishEvents(todo);

    return success({ status: "deleted", id });
  }
}