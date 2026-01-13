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

export type ReopenTodoResult =
  | { status: "reopened"; todo: TodoDTO }
  | { status: "already_open"; todo: TodoDTO };

export type ReopenTodoInput = { id: string };

export class ReopenTodo implements UseCase<ReopenTodoInput, ReopenTodoResult> {
  
  private readonly todoRepo: TodoRepository
  private readonly eventBus: DomainEventBus<DomainEventTodo>
  private readonly date: Clock

  // AHORA DEPENDE DE LOS REPOS, NO DEL UOW
  constructor(
    todoRepo: TodoRepository,
    eventBus: DomainEventBus<DomainEventTodo>,
    date: Clock
  ) {
    this.todoRepo = todoRepo;
    this.eventBus = eventBus;
    this.date = date;
  }

  async execute(input: ReopenTodoInput, ctx: ActorContext): Promise<ReopenTodoResult> {
    const { id } = input;

    requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

    // Lógica plana y directa gracias al decorador transaccional
    const todoId = new TodoId(id);
    const todo = await this.todoRepo.getById(todoId);

    if (!todo) {
      throw new TodoNotFoundError(id, "reopen");
    }

    const wasReopened = todo.reopen(this.date.now());

    if (!wasReopened) {
       return { status: "already_open", todo: TodoMapper.toDTO(todo) };
    }
    
    await this.todoRepo.save(todo);

    const events = todo.pullDomainEvents();
    await this.eventBus.publish(events);

    return { status: "reopened", todo: TodoMapper.toDTO(todo) };
  }
}