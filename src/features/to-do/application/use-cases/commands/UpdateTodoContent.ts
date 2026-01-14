import type { TodoRepository } from "../../../domain/repositories/TodoRepository"
import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { TodoDTO } from "../../dto/TodoDTO";
import type { UpdateTodoContentInput } from "../../dto/UpdateTodoContentDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";
import { TodoMapper } from "../../mappers/TodoMapper";

// Imports de Arquitectura
import type { UseCase } from "../../UseCase";
import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";

type UpdateTodoErrors = TodoNotFoundError | Error;

export type UpdateTodoResponse =
  | { status: "updated"; todo: TodoDTO }
  | { status: "no_update"; todo: TodoDTO };

export class UpdateTodoContent extends BaseUseCase<DomainEventTodo> implements UseCase<UpdateTodoContentInput, Result<UpdateTodoResponse, UpdateTodoErrors>> {
  
  private readonly repo: TodoRepository
  private readonly uniquenessChecker: TodoUniquenessChecker
  readonly eventBus: DomainEventBus<DomainEventTodo>

  constructor(
    repo: TodoRepository,
    uniquenessChecker: TodoUniquenessChecker,
    eventBus: DomainEventBus<DomainEventTodo>
  ) {
    super(eventBus)
    this.repo = repo;
    this.uniquenessChecker = uniquenessChecker;
    this.eventBus = eventBus;
  }

  async execute(input: UpdateTodoContentInput, ctx: ActorContext): Promise<Result<UpdateTodoResponse, UpdateTodoErrors>> {
    // 1. Validar Permisos
    requirePermission(ctx, PERMISSIONS.TODO_UPDATE);

    const id = new TodoId(input.id);
    const todo = await this.repo.getById(id);

    if (!todo) {
        return failure(new TodoNotFoundError(input.id, "update_content"));
    }

    let changed = false;

    // 2. Aplicar Cambios (Lógica de Dominio)
    
    // A. Cambio de Título (Validación asíncrona de unicidad)
    // Nota: Usamos todo.title (el string actual) si no viene uno nuevo
    const nextTitle = new TodoTitle(input.title ?? todo.title); 
    const titleChanged = await todo.changeTitle(nextTitle, this.uniquenessChecker);
    changed = changed || titleChanged;

    // B. Cambio de Descripción
    if (input.description !== undefined) {
       changed = todo.changeDescription(input.description) || changed;
    }
    
    const todoDto = TodoMapper.toDTO(todo);

    // 3. Idempotencia / No-Op
    if (!changed) {
      // El decorador registrará éxito, pero nosotros indicamos que no hubo cambios
      return success({ status: "no_update", todo: todoDto });
    }

    // 4. Persistencia
    await this.repo.save(todo);

    // 5. Publicar Eventos
    // (Importante: changeTitle o changeDescription podrían haber agregado eventos a la entidad)
    const events = todo.pullDomainEvents();
    if (events.length > 0) {
        await this.eventBus.publish(events);
    }
    
    return success({ status: "updated", todo: todoDto });
  }
}


