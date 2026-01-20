import { TodoId } from "../../../domain/value-objects/TodoId";
import { TodoTitle } from "../../../domain/value-objects/TodoTitle";
import type { TodoDTO } from "../../dto/TodoDTO";
import type { UpdateTodoContentInput } from "../../dto/UpdateTodoContentDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { TodoUniquenessChecker } from "../../../domain/services/TodoUniquenessChecker";
import { TodoMapper } from "../../mappers/TodoMapper";

// Imports de Arquitectura
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";
import type { Todo } from "../../../domain/entities/Todo";
import type { TodoDependencies } from "../../TodoDependencies";

type UpdateTodoErrors = TodoNotFoundError | Error;

export type UpdateTodoResponse =
  | { status: "updated"; todo: TodoDTO }
  | { status: "no_update"; todo: TodoDTO };

// Extendemos correctamente BaseUseCase<Evento, Entidad>
export class UpdateTodoContent extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<UpdateTodoContentInput, Result<UpdateTodoResponse, UpdateTodoErrors>> {
  
  private readonly repo: TodoDependencies["todoRepo"];
  // Definimos explícitamente el tipo para asegurar que no es undefined en la clase
  private readonly uniquenessChecker: TodoUniquenessChecker;

  constructor(deps: TodoDependencies) {
    super(deps.eventBus);
    this.repo = deps.todoRepo;

    // Validación de Seguridad: Este caso de uso REQUIERE el checker
    if (!deps.uniquenessChecker) {
        throw new Error("Dependency 'uniquenessChecker' is required for UpdateTodoContent use case.");
    }
    this.uniquenessChecker = deps.uniquenessChecker;
  }

  async execute(input: UpdateTodoContentInput): Promise<Result<UpdateTodoResponse, UpdateTodoErrors>> {
    // 1. Validar Permisos: ELIMINADO (Lo maneja el Decorador)

    // 2. BUSCAR AGREGADO (Usando getAggregate)
    const result = await this.getAggregate(
        input.id,
        this.repo,
        (rawId) => new TodoId(rawId),
        (missingId) => new TodoNotFoundError(missingId, "update_content")
    );

    if (!result.isSuccess) {
        return failure(result.error);
    }

    const todo = result.value;

    let changed = false;

    // 3. Aplicar Cambios (Lógica de Dominio)
    
    // A. Cambio de Título
    // Nota: Si input.title es undefined, usamos el actual, creando un nuevo VO (o reutilizando lógica interna)
    const nextTitle = new TodoTitle(input.title ?? todo.title); 
    
    // Es seguro usar this.uniquenessChecker porque el constructor garantizó que existe
    const titleChanged = await todo.changeTitle(nextTitle, this.uniquenessChecker);
    changed = changed || titleChanged;

    // B. Cambio de Descripción
    if (input.description !== undefined) {
       changed = todo.changeDescription(input.description) || changed;
    }
    
    const todoDto = TodoMapper.toDTO(todo);

    // 4. Idempotencia / No-Op
    if (!changed) {
       return success({ status: "no_update", todo: todoDto });
    }

    // 5. Persistencia
    await this.repo.save(todo);

    // 6. Publicar Eventos
    await this.publishEvents(todo);
    
    return success({ status: "updated", todo: todoDto });
  }
}

