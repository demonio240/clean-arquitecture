import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { Clock } from "../../../../../shared/time/SystemClock";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import { TodoMapper } from "../../mappers/TodoMapper";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository"; // Nuevo import
import type { UseCase } from "../../UseCase";
import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";

type ReopenTodoErrors = TodoNotFoundError | Error; // esto puede ser posiblemente exportado a un archivo para tipos en comun

export type ReopenTodoResponse =
  | { status: "reopened"; todo: TodoDTO }
  | { status: "already_open"; todo: TodoDTO };

export type ReopenTodoInput = { id: string };

// Aplique un cambio acerca del manejo de errores
export class ReopenTodo extends BaseUseCase<DomainEventTodo> implements UseCase<ReopenTodoInput, Result<ReopenTodoResponse, ReopenTodoErrors>> {
  
  private readonly todoRepo: TodoRepository
  private readonly date: Clock
  readonly eventBus: DomainEventBus<DomainEventTodo>

  // AHORA DEPENDE DE LOS REPOS, NO DEL UOW
  constructor(
    todoRepo: TodoRepository,
    eventBus: DomainEventBus<DomainEventTodo>,
    date: Clock
  ) {
    super(eventBus)
    this.todoRepo = todoRepo;
    this.eventBus = eventBus;
    this.date = date;
  }

  async execute(input: ReopenTodoInput, ctx: ActorContext): Promise<Result<ReopenTodoResponse, ReopenTodoErrors>> {
    const { id } = input;

    requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

    // Lógica plana y directa gracias al decorador transaccional
    const todoId = new TodoId(id);
    const todo = await this.todoRepo.getById(todoId);

    if (!todo) {
      return failure(new TodoNotFoundError(id, "reopen"));
    }

    const wasReopened = todo.reopen(this.date.now());

    if (!wasReopened) {
       return success({ status: "already_open", todo: TodoMapper.toDTO(todo) });
    }
    
    await this.todoRepo.save(todo);

    await this.publishEvents(todo); // Cambio de publicar eventos

    return success({ status: "reopened", todo: TodoMapper.toDTO(todo) });
  }
}