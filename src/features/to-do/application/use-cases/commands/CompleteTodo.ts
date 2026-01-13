import { TodoId } from "../../../domain/value-objects/TodoId";
import type { ActorContext } from "../../../../../shared/authz/ActorContext";
import { requirePermission } from "../../../../../shared/authz/guards";
import { PERMISSIONS } from "../../../../../shared/authz/permissions";
import type { CompleteTodoDTO } from "../../dto/CompleteTodoDTO";
import type { Clock } from "../../../../../shared/time/SystemClock";
import { TodoNotFoundError } from "../../errors/TodoNotFound";
import type { TodoDTO } from "../../dto/TodoDTO";
import { TodoMapper } from "../../mappers/TodoMapper";

// Nuevos Imports de Arquitectura
import type { UseCase } from "../../UseCase";
import type { TodoRepository } from "../../../domain/repositories/TodoRepository";
import type { DomainEventBus } from "../../../../../shared/events/DomainEventBus";
import type { DomainEventTodo } from "../../../domain/events/DomainEvent";


export type CompleteTodoResult = 
  | { status: "completed"; todo: TodoDTO }        
  | { status: "already_completed"; todo: TodoDTO };

export class CompleteTodo implements UseCase<CompleteTodoDTO, CompleteTodoResult> {
    private readonly todoRepo: TodoRepository
    private readonly eventBus: DomainEventBus<DomainEventTodo>
    private readonly date: Clock
    
    // Constructor limpio: Solo dependencias de dominio
    constructor(
        todoRepo: TodoRepository,
        eventBus: DomainEventBus<DomainEventTodo>,
        date: Clock
    ) {
        this.todoRepo = todoRepo;
        this.eventBus = eventBus;
        this.date = date;
    }

    async execute(input: CompleteTodoDTO, ctx: ActorContext): Promise<CompleteTodoResult> {
        // 1. Validar Permisos
        requirePermission(ctx, PERMISSIONS.TODO_UPDATE);
        
        // 2. Lógica de Negocio (Sin UnitOfWork, sin logs, sin try/catch)
        const todoId = new TodoId(input.id);
        const todo = await this.todoRepo.getById(todoId);

        if (!todo) {
          throw new TodoNotFoundError(input.id, "complete");
        }

        const wasCompleted = todo.complete(this.date.now());
        const todoDto = TodoMapper.toDTO(todo);

        // Idempotencia: Si ya estaba completado, retornamos sin guardar ni publicar eventos
        if (!wasCompleted) {
           // No necesitamos loguear "no-op" aquí, el decorador de observabilidad registrará el éxito.
           return { status: "already_completed", todo: todoDto };
        }

        // 3. Persistencia
        await this.todoRepo.save(todo);

        // 4. Publicar Eventos
        const events = todo.pullDomainEvents();    
        await this.eventBus.publish(events);

        return { status: "completed", todo: todoDto };
    }
}