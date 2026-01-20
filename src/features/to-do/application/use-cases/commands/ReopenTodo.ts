import type { Clock } from "../../../../../shared/time/SystemClock";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import { TodoMapper } from "../../mappers/TodoMapper";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";
// Importamos la Entidad (Valor)
import type { Todo } from "../../../domain/entities/Todo";
import type { TodoDependencies } from "../../TodoDependencies";

type ReopenTodoErrors = TodoNotFoundError | Error;

export type ReopenTodoResponse =
  | { status: "reopened"; todo: TodoDTO }
  | { status: "already_open"; todo: TodoDTO };

export type ReopenTodoInput = { id: string };

// IMPORTANTE: El orden de genéricos es <Evento, Entidad>
export class ReopenTodo extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<ReopenTodoInput, Result<ReopenTodoResponse, ReopenTodoErrors>> {
  
  private readonly todoRepo: TodoRepository;
  private readonly date: Clock;

  // 2. CONSTRUCTOR LIMPIO: Recibe un solo objeto 'deps'
  constructor(deps: TodoDependencies) {
    super(deps.eventBus); // Extraemos lo que necesita el padre
    this.todoRepo = deps.todoRepo;
    this.date = deps.date;
  }

  async execute(input: ReopenTodoInput): Promise<Result<ReopenTodoResponse, ReopenTodoErrors>> {
    const { id } = input;

    // 1. BUSCAR AGREGADO (Usando el método genérico limpio)
    // TypeScript infiere que usamos TodoId y obtenemos un Todo
    const result = await this.getAggregate(
        id,
        this.todoRepo,
        (rawId) => new TodoId(rawId),
        // AQUÍ EL CAMBIO: Creamos el error nosotros mismos con la razón correcta
        (missingId) => new TodoNotFoundError(missingId, "reopen") 
    );

    // 2. VERIFICAR RESULTADO
    if (!result.isSuccess) {
        return failure(result.error);
    }

    // 3. OBTENER LA ENTIDAD
    // Aquí está la clave: usamos el valor devuelto por getAggregate
    const todo = result.value; 

    // --- LÓGICA DE NEGOCIO ---
    const wasReopened = todo.reopen(this.date.now());

    if (!wasReopened) {
       return success({ status: "already_open", todo: TodoMapper.toDTO(todo) });
    }
    
    // 4. PERSISTENCIA
    await this.todoRepo.save(todo);

    // Publicacon de eventos 
    await this.publishEvents(todo); 

    return success({ status: "reopened", todo: TodoMapper.toDTO(todo) });
  }
}