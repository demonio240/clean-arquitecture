import { TodoId } from "../../../domain/value-objects/TodoId";
import type { CompleteTodoDTO } from "../../dto/CompleteTodoDTO";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoMapper } from "../../mappers/TodoMapper";

// Imports de Arquitectura y Dominio
import type { UseCase } from "../../UseCase";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";
import { BaseUseCase } from "../../../../../shared/application/BaseUseCase";
import { failure, success, type Result } from "../../../../../shared/core/Result";
import type { Todo } from "../../../domain/entities/Todo";
import type { TodoDependencies } from "../../TodoDependencies";

type CompleteTodoErrors = TodoNotFoundError | Error;

export type CompleteTodoResponse = 
  | { status: "completed"; todo: TodoDTO }        
  | { status: "already_completed"; todo: TodoDTO };

// Extendemos BaseUseCase<Evento, Entidad>
export class CompleteTodo extends BaseUseCase<DomainEventTodo, Todo> implements UseCase<CompleteTodoDTO, Result<CompleteTodoResponse, CompleteTodoErrors>> {
    
    private readonly todoRepo: TodoDependencies["todoRepo"];
    private readonly date: TodoDependencies["date"];
    
    // Constructor limpio: Dependencias agrupadas
    constructor(deps: TodoDependencies) {
        super(deps.eventBus);
        this.todoRepo = deps.todoRepo;
        this.date = deps.date;
    }

    async execute(input: CompleteTodoDTO): Promise<Result<CompleteTodoResponse, CompleteTodoErrors>> {
        // 1. Validar Permisos: ELIMINADO (Lo maneja el PermissionDecorator)
        
        // 2. BUSCAR AGREGADO (Usando getAggregate)
        const result = await this.getAggregate(
            input.id,
            this.todoRepo,
            (rawId) => new TodoId(rawId),
            // Pasamos el contexto específico ("complete") al error
            (missingId) => new TodoNotFoundError(missingId, "complete") 
        );

        if (!result.isSuccess) {
            return failure(result.error);
        }

        const todo = result.value;

        // 3. Lógica de Negocio
        const wasCompleted = todo.complete(this.date.now());
        const todoDto = TodoMapper.toDTO(todo);

        // 4. Idempotencia: Si ya estaba completado, retornamos éxito sin efectos secundarios
        if (!wasCompleted) {
           return success({ status: "already_completed", todo: todoDto });
        }

        // 5. Persistencia y Eventos
        await this.todoRepo.save(todo);
        await this.publishEvents(todo);

        return success({ status: "completed", todo: todoDto});
    }
}