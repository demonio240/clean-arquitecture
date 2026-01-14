import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import { success, type Result } from "../../../../../shared/core/Result";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import { TodoId } from "../../../domain/value-objects/TodoId";
import type { TodoNotFoundError } from "../../errors/TodoNotFound";

// Imports de Arquitectura
import type { UseCase } from "../../UseCase";
//import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
//import type { DomainEventTodo } from "../../../domain/events/DomainEvent";

type DeleteTodoErrors = TodoNotFoundError | Error;

// 1. Definimos el Input (necesario para el genérico UseCase)
export type DeleteTodoInput = { id: string };

export type DeleteTodoResponse = 
  | { status: "deleted" }
  | { status: "already_deleted" };

export class DeleteTodo  implements UseCase<DeleteTodoInput, Result<DeleteTodoResponse, DeleteTodoErrors>> {
    private readonly repo: TodoRepository
    // Inyectamos el bus por consistencia, aunque en este caso específico 
    // tu lógica original no publicaba eventos al borrar.
    //private readonly eventBus: DomainEventBus<DomainEventTodo> 

    constructor(
        repo: TodoRepository,
        // Inyectamos el bus por consistencia, aunque en este caso específico 
        // tu lógica original no publicaba eventos al borrar.
        //eventBus: DomainEventBus<DomainEventTodo> 
    ) {
        this.repo = repo;
        //this.eventBus = eventBus;
    }

    async execute (input: DeleteTodoInput, ctx: ActorContext): Promise<Result<DeleteTodoResponse, DeleteTodoErrors>> {
        // 1. Validar Permisos
        requirePermission(ctx, PERMISSIONS.TODO_DELETE);

        const todoId = new TodoId(input.id);

        // 2. Comprobar existencia (Idempotencia)
        // Nota: Algunos repositorios implementan deleteIdempotent directamente,
        // pero mantener esta lógica aquí es explícito y correcto.
        const todo = await this.repo.getById(todoId);

        if (!todo) {
            // El decorador de observabilidad registrará esto como éxito
            return success({ status: "already_deleted", success: undefined });
        }

        // 3. Eliminar
        await this.repo.delete(todoId);

        // Si tuvieras un evento "TodoDeleted", aquí harías:
        // this.eventBus.publish([new TodoDeletedEvent(todoId)]);
        
        return success({ status: "deleted", success: undefined });
    }
}