import { Label } from "../../../domain/value-objects/Label";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { AddTodoLabelDTO } from "../../dto/AddTodoLabelDTO";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import { TodoMapper } from "../../mappers/TodoMapper";
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";
// Importamos Entidad y Dependencias
import type { Todo } from "../../../domain/entities/Todo";
import type { TodoDependencies } from "../../TodoDependencies";

type AddLabelTodoErrors = TodoNotFoundError | Error;

export type AddLabelTodoResponse =
  | { status: "added"; todo: TodoDTO }
  | { status: "already_exists"; todo: TodoDTO };

// Extendemos correctamente: <Evento, Entidad>
export class AddTodoLabel extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<AddTodoLabelDTO, Result<AddLabelTodoResponse, AddLabelTodoErrors>> {

    private readonly repo: TodoDependencies["todoRepo"];

    // Constructor limpio usando la interfaz de dependencias
    constructor(deps: TodoDependencies) {
        super(deps.eventBus);
        this.repo = deps.todoRepo;
    }

    async execute(input: AddTodoLabelDTO): Promise<Result<AddLabelTodoResponse, AddLabelTodoErrors>> {
        // 1. Validar permisos: ELIMINADO (Lo maneja el PermissionDecorator)

        // 2. Obtener Agregado (Clean way)
        const result = await this.getAggregate(
            input.id,
            this.repo,
            (rawId) => new TodoId(rawId),
            // Corregimos el motivo del error (antes decía "reopen")
            (missingId) => new TodoNotFoundError(missingId, "add_label") 
        );

        if (!result.isSuccess) {
            return failure(result.error);
        }

        const todo = result.value;

        // 3. Crear VO y Ejecutar Dominio
        // Asumiendo que Label.create devuelve un Label válido
        const label = Label.create(input.label, "default"); 
        
        const wasAdded = todo.addLabel(label);

        // 4. Idempotencia
        if (!wasAdded) {
            return success({ status: "already_exists", todo: TodoMapper.toDTO(todo) });
        }

        // 5. Persistencia y Eventos
        await this.repo.save(todo);
        await this.publishEvents(todo);

        return success({ status: "added", todo: TodoMapper.toDTO(todo) });
    }
}