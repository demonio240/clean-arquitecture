import { Todo } from "../../../domain/entities/Todo";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { CreateTodoDTO } from "../../dto/CreateTodoDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";
import { TodoMapper } from "../../mappers/TodoMapper";

// Imports de Arquitectura
import type { UseCase } from "../../UseCase";
import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import type { TodoNotFoundError } from "../../errors/TodoNotFound";
import { success, type Result } from "../../../../../shared/core/Result";

type CreateTodoErrors = TodoNotFoundError | Error

export type CreateTodoResponse =
  | { status: "created"; todo: TodoDTO }
  | { status: "todo_id_already_exists"; todo: TodoDTO };

export class CreateTodo extends BaseUseCase<DomainEventTodo> implements UseCase<CreateTodoDTO, Result<CreateTodoResponse, CreateTodoErrors>> {
  private readonly repo: TodoRepository
  private readonly uniquenessChecker: TodoUniquenessChecker
  // Agregamos el Bus para publicar eventos (ej: TodoCreated)
  readonly eventBus: DomainEventBus<DomainEventTodo> 
  
  constructor(
    repo: TodoRepository,
    uniquenessChecker: TodoUniquenessChecker,
    // Agregamos el Bus para publicar eventos (ej: TodoCreated)
    eventBus: DomainEventBus<DomainEventTodo> 
  ) {
    super(eventBus)
    this.repo = repo;
    this.uniquenessChecker = uniquenessChecker;
    this.eventBus = eventBus;
  }

  async execute(input: CreateTodoDTO, ctx: ActorContext): Promise<Result<CreateTodoResponse, CreateTodoErrors>> {
    // 1. Validar Permisos
    requirePermission(ctx, PERMISSIONS.TODO_CREATE);

    const id = new TodoId(input.id);

    // 2. Validación de Idempotencia (Regla de Negocio)
    const exists = await this.repo.getById(id);
    if (exists) {
      // El decorador de observabilidad marcará esto como éxito (no lanza error)
      return success({ status: "todo_id_already_exists", todo: TodoMapper.toDTO(exists) });
    }

    // 3. Validaciones de Dominio Complejas (Servicio de Dominio)
    const title = new TodoTitle(input.title);
    await this.uniquenessChecker.ensureUnique(title);

    // 4. Creación de la Entidad
    const todo = Todo.create(id, title, input.description ?? "");

    // 5. Lógica adicional (Labels)
    for (const raw of input.labels ?? []) {
      const label = Label.create(raw, "default");
      todo.addLabel(label);
    }

    // 6. Persistencia
    await this.repo.save(todo);

    // 7. Publicación de Eventos
    const events = todo.pullDomainEvents();
    if (events.length > 0) {
        await this.eventBus.publish(events);
    }

    return success({ status: "created", todo: TodoMapper.toDTO(todo) });
  }
}